use std::{collections::HashMap, fs, io::Cursor, path::{Path, PathBuf}, sync::{Arc, Mutex}};

use base64::Engine;
use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use semver::Version;
use tauri::{utils::assets::AssetKey, AppHandle, Manager, Runtime};
use url::Url;

use crate::{models::*, Config, Error, Result};

#[derive(Clone)]
pub struct PendingUpdate {
  version: String,
  archive_path: PathBuf,
  manifest: UpdateManifest,
  manifest_bytes: Vec<u8>,
  manifest_metadata: ManifestMetadata,
}

#[derive(Clone, serde::Deserialize, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct ManifestMetadata {
  update_version: String,
  signature: String,
}

pub struct OtaCore<R: Runtime> {
  app: AppHandle<R>,
  config: Arc<tauri::async_runtime::Mutex<Config>>,
  pending_update: Arc<tauri::async_runtime::Mutex<Option<PendingUpdate>>>,
  manifest_metadata: Arc<tauri::async_runtime::Mutex<Option<ManifestMetadata>>>,
  manifest_operation_lock: Arc<tauri::async_runtime::Mutex<()>>,
  assets: Arc<Mutex<HashMap<AssetKey, Vec<u8>>>>,
}

impl<R: Runtime> OtaCore<R> {
  fn log_info(message: impl AsRef<str>) {
    eprintln!("[ota-self-update][info] {}", message.as_ref());
  }

  fn log_warn(message: impl AsRef<str>) {
    eprintln!("[ota-self-update][warn] {}", message.as_ref());
  }

  fn prerelease_for_channel(channel: &str) -> bool {
    channel == "beta"
  }

  fn semver_desc(left: &str, right: &str) -> std::cmp::Ordering {
    match (Version::parse(left), Version::parse(right)) {
      (Ok(l), Ok(r)) => r.cmp(&l),
      _ => right.cmp(left),
    }
  }

  fn channel(cfg: &Config) -> &str {
    cfg.channel.as_deref().unwrap_or("stable")
  }

  pub fn new(
    app: AppHandle<R>,
    config: Config,
    assets: Arc<Mutex<HashMap<AssetKey, Vec<u8>>>>,
  ) -> Self {
    let core = Self {
      app,
      config: Arc::new(tauri::async_runtime::Mutex::new(config)),
      pending_update: Arc::new(tauri::async_runtime::Mutex::new(None)),
      manifest_metadata: Arc::new(tauri::async_runtime::Mutex::new(None)),
      manifest_operation_lock: Arc::new(tauri::async_runtime::Mutex::new(())),
      assets,
    };
    core.load_cached_assets_on_startup();
    core
  }

  fn cache_root(&self) -> Result<PathBuf> {
    let path = self.app.path().app_cache_dir()?;
    fs::create_dir_all(&path)?;
    Ok(path.join("ota-self-update"))
  }

  fn manifest_url(cfg: &Config) -> String {
    let base = cfg.base_url.trim_end_matches('/');
    let channel = Self::channel(cfg);
    format!("{base}/manifest/{channel}.json")
  }

  fn github_repo_from_base_url(base_url: &str) -> Option<(String, String)> {
    let url = Url::parse(base_url).ok()?;
    if !url.host_str().is_some_and(|host| host.eq_ignore_ascii_case("github.com")) {
      return None;
    }
    let mut parts = url
      .path_segments()
      .map(|segments| segments.filter(|s| !s.is_empty()))
      .into_iter()
      .flatten();
    let owner = parts.next()?.to_string();
    let repo = parts.next()?.trim_end_matches(".git").to_string();
    if owner.is_empty() || repo.is_empty() {
      return None;
    }
    Some((owner, repo))
  }

  fn bitbucket_repo_from_base_url(base_url: &str) -> Option<(String, String)> {
    let url = Url::parse(base_url).ok()?;
    if !url.host_str().is_some_and(|host| host.eq_ignore_ascii_case("bitbucket.org")) {
      return None;
    }
    let mut parts = url
      .path_segments()
      .map(|segments| segments.filter(|s| !s.is_empty()))
      .into_iter()
      .flatten();
    let workspace = parts.next()?.to_string();
    let repo = parts.next()?.trim_end_matches(".git").to_string();
    if workspace.is_empty() || repo.is_empty() {
      return None;
    }
    Some((workspace, repo))
  }

  async fn fetch_manifest_from_github(
    client: &reqwest::Client,
    owner: &str,
    repo: &str,
    channel: &str,
  ) -> Result<Vec<u8>> {
    #[derive(serde::Deserialize)]
    struct GitHubAsset {
      name: String,
      browser_download_url: String,
    }

    #[derive(serde::Deserialize)]
    struct GitHubRelease {
      draft: bool,
      prerelease: bool,
      assets: Vec<GitHubAsset>,
    }

    let releases_url = format!("https://api.github.com/repos/{owner}/{repo}/releases?per_page=100");
    let releases: Vec<GitHubRelease> = client
      .get(releases_url)
      .header("Accept", "application/vnd.github+json")
      .header("User-Agent", "tauri-plugin-ota-self-update")
      .send()
      .await?
      .error_for_status()?
      .json()
      .await?;

    let want_prerelease = channel == "beta";
    let manifest_name = format!("{channel}.json");
    let selected_with_manifest = releases
      .iter()
      .filter(|release| !release.draft && release.prerelease == want_prerelease)
      .find_map(|release| {
        release
          .assets
          .iter()
          .find(|asset| asset.name == manifest_name)
          .map(|asset| (release, asset))
      })
      .ok_or_else(|| {
        Error::Message(format!(
          "no suitable GitHub release with '{manifest_name}' asset found for channel '{channel}' (repo: {owner}/{repo})"
        ))
      })?;
    let (_selected_release, manifest_asset) = selected_with_manifest;

    let bytes = client
      .get(&manifest_asset.browser_download_url)
      .send()
      .await?
      .error_for_status()?
      .bytes()
      .await?
      .to_vec();
    Ok(bytes)
  }

  async fn fetch_manifest_from_release_index(
    client: &reqwest::Client,
    cfg: &Config,
    channel: &str,
  ) -> Result<Option<Vec<u8>>> {
    #[derive(serde::Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct ReleaseIndexEntry {
      version: String,
      manifest_url: String,
      #[serde(default)]
      prerelease: bool,
      #[serde(default)]
      status: Option<String>,
      #[serde(default)]
      channel: Option<String>,
    }

    let index_url = format!("{}/releases.json", cfg.base_url.trim_end_matches('/'));
    let response = client.get(index_url).send().await?;
    if response.status() == reqwest::StatusCode::NOT_FOUND {
      return Ok(None);
    }
    let entries: Vec<ReleaseIndexEntry> = response.error_for_status()?.json().await?;
    let wanted_prerelease = Self::prerelease_for_channel(channel);
    let mut candidates: Vec<_> = entries
      .into_iter()
      .filter(|entry| {
        let channel_ok = entry.channel.as_deref().is_none_or(|value| value == channel);
        let status_ok = entry
          .status
          .as_deref()
          .is_none_or(|value| value.eq_ignore_ascii_case("released"));
        channel_ok && status_ok && entry.prerelease == wanted_prerelease
      })
      .collect();

    if candidates.is_empty() {
      return Ok(None);
    }
    candidates.sort_by(|a, b| Self::semver_desc(&a.version, &b.version));
    let latest = &candidates[0];
    let bytes = client
      .get(&latest.manifest_url)
      .send()
      .await?
      .error_for_status()?
      .bytes()
      .await?
      .to_vec();
    Ok(Some(bytes))
  }

  async fn fetch_manifest_from_bitbucket(
    client: &reqwest::Client,
    workspace: &str,
    repo: &str,
    channel: &str,
  ) -> Result<Vec<u8>> {
    let manifest_name = format!("{channel}.json");
    let url = format!("https://bitbucket.org/{workspace}/{repo}/downloads/{manifest_name}");
    let bytes = client
      .get(url)
      .send()
      .await?
      .error_for_status()?
      .bytes()
      .await?
      .to_vec();
    Ok(bytes)
  }

  async fn http_client(cfg: &Config) -> Result<reqwest::Client> {
    let mut headers = HeaderMap::new();
    for (k, v) in &cfg.request_headers {
      let name = HeaderName::from_bytes(k.as_bytes()).map_err(|_| Error::InvalidHeaderName)?;
      let value = HeaderValue::from_str(v).map_err(|_| Error::InvalidHeaderValue)?;
      headers.insert(name, value);
    }
    let mut builder = reqwest::Client::builder().default_headers(headers);
    if let Some(timeout) = cfg.timeout_secs {
      builder = builder.timeout(std::time::Duration::from_secs(timeout));
    }
    Ok(builder.build()?)
  }

  fn verify_signature(pubkey_base64: &str, payload: &[u8], signature_base64: &str) -> Result<()> {
    if pubkey_base64.trim().is_empty() || signature_base64.trim().is_empty() {
      return Ok(());
    }
    let pubkey_decoded = base64::engine::general_purpose::STANDARD.decode(pubkey_base64)?;
    let pubkey_decoded = std::str::from_utf8(&pubkey_decoded)?;
    let public_key =
      minisign_verify::PublicKey::decode(pubkey_decoded).map_err(Error::InvalidPublicKey)?;

    let sig_decoded = base64::engine::general_purpose::STANDARD.decode(signature_base64)?;
    let sig_decoded = std::str::from_utf8(&sig_decoded)?;
    let signature =
      minisign_verify::Signature::decode(sig_decoded).map_err(Error::InvalidSignature)?;
    public_key
      .verify(payload, &signature, false)
      .map_err(Error::InvalidSignature)?;
    Ok(())
  }

  fn download_path(cache_root: &Path, version: &str) -> PathBuf {
    cache_root.join(format!("update-{version}.tar.gz"))
  }

  fn latest_archive_path(cache_root: &Path) -> PathBuf {
    cache_root.join("latest-update.tar.gz")
  }

  fn latest_manifest_path(cache_root: &Path) -> PathBuf {
    cache_root.join("latest-manifest.json")
  }

  fn manifest_metadata_path(cache_root: &Path) -> PathBuf {
    cache_root.join("latest-manifest.meta.json")
  }

  fn rollback_cached_update(&self, cache_root: &Path, reason: &str) {
    Self::log_warn(format!(
      "rolling back cached OTA payload; reason: {reason}"
    ));

    for path in [
      Self::latest_manifest_path(cache_root),
      Self::manifest_metadata_path(cache_root),
      Self::latest_archive_path(cache_root),
    ] {
      if path.exists() {
        if let Err(err) = fs::remove_file(&path) {
          Self::log_warn(format!(
            "failed to remove rollback file '{}': {err}",
            path.display()
          ));
        }
      }
    }

    self.assets.lock().unwrap().clear();
    self.manifest_metadata.blocking_lock().take();
  }

  fn base64_to_string(base64_string: &str) -> Result<String> {
    let decoded = base64::engine::general_purpose::STANDARD.decode(base64_string)?;
    Ok(std::str::from_utf8(&decoded)?.to_string())
  }

  fn load_assets(
    archive_bytes: &[u8],
    manifest: &UpdateManifest,
    pubkey_base64: &str,
    cache_root: &Path,
  ) -> Result<HashMap<AssetKey, Vec<u8>>> {
    let public_key = if pubkey_base64.trim().is_empty() {
      None
    } else {
      let pubkey_decoded = Self::base64_to_string(pubkey_base64)?;
      Some(
        minisign_verify::PublicKey::decode(&pubkey_decoded).map_err(Error::InvalidPublicKey)?,
      )
    };

    let mut assets = HashMap::new();
    let mut archive = tar::Archive::new(Cursor::new(archive_bytes));
    let archive_out_dir = tempfile::tempdir_in(cache_root)?;
    archive.unpack(archive_out_dir.path())?;
    let dist_dir = archive_out_dir.path().join("dist");

    for entry in walkdir::WalkDir::new(&dist_dir) {
      let entry = entry.map_err(|err| Error::Message(err.to_string()))?;
      if !entry.file_type().is_file() {
        continue;
      }
      let path = entry.path();
      let relative_path = path
        .strip_prefix(&dist_dir)
        .map_err(|err| Error::Message(err.to_string()))?;
      let data = fs::read(path)?;

      if let Some(public_key) = &public_key {
        let manifest_file = manifest.files.get(relative_path).ok_or_else(|| {
          Error::Message(format!(
            "file '{}' not found in manifest",
            relative_path.display()
          ))
        })?;
        let signature_decoded = Self::base64_to_string(&manifest_file.signature)?;
        let signature =
          minisign_verify::Signature::decode(&signature_decoded).map_err(Error::InvalidSignature)?;
        public_key
          .verify(&data, &signature, false)
          .map_err(Error::InvalidSignature)?;
      }

      assets.insert(relative_path.into(), data);
    }

    Ok(assets)
  }

  fn load_cached_assets_on_startup(&self) {
    let cache_root = match self.cache_root() {
      Ok(path) => path,
      Err(err) => {
        Self::log_warn(format!("startup cache init failed: {err}"));
        return;
      }
    };
    let manifest_path = Self::latest_manifest_path(&cache_root);
    let metadata_path = Self::manifest_metadata_path(&cache_root);
    let archive_path = Self::latest_archive_path(&cache_root);
    if !manifest_path.exists() || !metadata_path.exists() || !archive_path.exists() {
      return;
    }

    let manifest_bytes = match fs::read(&manifest_path) {
      Ok(bytes) => bytes,
      Err(err) => {
        self.rollback_cached_update(&cache_root, &format!("failed reading cached manifest: {err}"));
        return;
      }
    };
    let manifest: UpdateManifest = match serde_json::from_slice(&manifest_bytes) {
      Ok(value) => value,
      Err(err) => {
        Self::log_warn(format!("failed parsing cached manifest: {err}"));
        return;
      }
    };
    let metadata: ManifestMetadata = match fs::read_to_string(&metadata_path)
      .ok()
      .and_then(|json| serde_json::from_str(&json).ok())
    {
      Some(value) => value,
      None => {
        self.rollback_cached_update(&cache_root, "failed reading cached manifest metadata");
        return;
      }
    };
    let pubkey = self.config.blocking_lock().pubkey.clone();
    if let Err(err) = Self::verify_signature(&pubkey, &manifest_bytes, &metadata.signature) {
      self.rollback_cached_update(
        &cache_root,
        &format!("cached manifest signature check failed: {err}"),
      );
      return;
    }

    let archive_bytes = match fs::read(&archive_path) {
      Ok(bytes) => bytes,
      Err(err) => {
        self.rollback_cached_update(&cache_root, &format!("failed reading cached archive: {err}"));
        return;
      }
    };
    match Self::load_assets(&archive_bytes, &manifest, &pubkey, &cache_root) {
      Ok(loaded) => {
        *self.assets.lock().unwrap() = loaded;
        self
          .manifest_metadata
          .blocking_lock()
          .replace(metadata);
        Self::log_info("cached OTA assets loaded on startup");
      }
      Err(err) => {
        self.rollback_cached_update(&cache_root, &format!("failed loading cached OTA assets: {err}"));
      }
    }
  }

  fn is_newer_version(current: &str, incoming: &str) -> bool {
    let cv = Version::parse(current);
    let iv = Version::parse(incoming);
    match (cv, iv) {
      (Ok(current), Ok(incoming)) => {
        // Keep update tracks isolated:
        // - release can update only to release
        // - pre-release can update only to pre-release
        let current_is_prerelease = !current.pre.is_empty();
        let incoming_is_prerelease = !incoming.pre.is_empty();
        if current_is_prerelease != incoming_is_prerelease {
          return false;
        }
        incoming > current
      }
      // If versions are not valid semver, reject update to avoid cross-track surprises.
      _ => false,
    }
  }

  pub async fn set_channel(&self, channel: Option<String>) -> Result<()> {
    self.config.lock().await.channel = channel.filter(|c| !c.trim().is_empty());
    Ok(())
  }

  pub async fn check_for_updates(&self) -> Result<CheckResult> {
    let _guard = self.manifest_operation_lock.lock().await;
    let cfg = self.config.lock().await.clone();
    let current_manifest_metadata = self.manifest_metadata.lock().await.clone();
    let client = Self::http_client(&cfg).await?;
    let channel = Self::channel(&cfg);
    let current_version = self.app.package_info().version.to_string();
    Self::log_info(format!(
      "check_for_updates start: base_url='{}', channel='{}', current_version='{}'",
      cfg.base_url, channel, current_version
    ));

    let manifest_bytes = if let Some((owner, repo)) = Self::github_repo_from_base_url(&cfg.base_url) {
      Self::log_info(format!("manifest source: github repo={owner}/{repo}"));
      Self::fetch_manifest_from_github(&client, &owner, &repo, channel).await?
    } else if let Some((workspace, repo)) = Self::bitbucket_repo_from_base_url(&cfg.base_url) {
      Self::log_info(format!("manifest source: bitbucket repo={workspace}/{repo}"));
      Self::fetch_manifest_from_bitbucket(&client, &workspace, &repo, channel).await?
    } else if let Some(index_manifest) = Self::fetch_manifest_from_release_index(&client, &cfg, channel).await? {
      Self::log_info("manifest source: releases.json index");
      index_manifest
    } else {
      let manifest_url = Self::manifest_url(&cfg);
      Self::log_info(format!("manifest source: direct fallback url={manifest_url}"));
      client
        .get(manifest_url)
        .send()
        .await?
        .error_for_status()?
        .bytes()
        .await?
        .to_vec()
    };
    let manifest: UpdateManifest = serde_json::from_slice(&manifest_bytes)?;
    Self::log_info(format!(
      "manifest loaded: version='{}', archive_url='{}'",
      manifest.version, manifest.archive_url
    ));
    Self::verify_signature(&cfg.pubkey, &manifest_bytes, &manifest.signature)?;
    let manifest_metadata = ManifestMetadata {
      update_version: manifest.version.clone(),
      signature: manifest.signature.clone(),
    };

    if current_manifest_metadata
      .as_ref()
      .is_some_and(|m| m.update_version == manifest.version)
    {
      Self::log_info("update not available: same version as cached manifest metadata");
      return Ok(CheckResult {
        available: false,
        update: None,
      });
    }

    if !Self::is_newer_version(&current_version, &manifest.version) {
      match (Version::parse(&current_version), Version::parse(&manifest.version)) {
        (Ok(current), Ok(incoming)) => {
          let current_is_prerelease = !current.pre.is_empty();
          let incoming_is_prerelease = !incoming.pre.is_empty();
          if current_is_prerelease != incoming_is_prerelease {
            Self::log_warn(format!(
              "update not available: track mismatch (current='{}', incoming='{}')",
              current_version, manifest.version
            ));
          } else {
            Self::log_info(format!(
              "update not available: incoming version is not newer (current='{}', incoming='{}')",
              current_version, manifest.version
            ));
          }
        }
        _ => {
          Self::log_warn(format!(
            "update not available: semver parse failed (current='{}', incoming='{}')",
            current_version, manifest.version
          ));
        }
      }
      return Ok(CheckResult {
        available: false,
        update: None,
      });
    }

    let archive_bytes = client
      .get(&manifest.archive_url)
      .send()
      .await?
      .error_for_status()?
      .bytes()
      .await?
      .to_vec();
    Self::verify_signature(&cfg.pubkey, &archive_bytes, &manifest.archive_signature)?;

    let cache_root = self.cache_root()?;
    fs::create_dir_all(&cache_root)?;
    let archive_path = Self::download_path(&cache_root, &manifest.version);
    fs::write(&archive_path, archive_bytes)?;
    Self::log_info(format!(
      "update available: version='{}', archive cached at '{}'",
      manifest.version,
      archive_path.display()
    ));

    let info = UpdateInfo {
      version: manifest.version.clone(),
      notes: manifest.notes.clone(),
      pub_date: manifest.pub_date.clone(),
    };
    self.pending_update.lock().await.replace(PendingUpdate {
      version: manifest.version.clone(),
      archive_path,
      manifest,
      manifest_bytes,
      manifest_metadata,
    });

    Ok(CheckResult {
      available: true,
      update: Some(info),
    })
  }

  pub async fn apply_update(&self) -> Result<ApplyResult> {
    let _guard = self.manifest_operation_lock.lock().await;
    let cfg = self.config.lock().await.clone();
    let pending = self.pending_update.lock().await.clone().ok_or(Error::NoPendingUpdate)?;
    Self::log_info(format!(
      "apply_update start: version='{}', activation_policy='{:?}'",
      pending.version, cfg.activation_policy
    ));

    let cache_root = self.cache_root()?;
    let archive_bytes = fs::read(&pending.archive_path)?;
    let loaded_assets = Self::load_assets(&archive_bytes, &pending.manifest, &cfg.pubkey, &cache_root)?;
    *self.assets.lock().unwrap() = loaded_assets;
    fs::write(Self::latest_archive_path(&cache_root), &archive_bytes)?;
    fs::write(
      Self::latest_manifest_path(&cache_root),
      &pending.manifest_bytes,
    )?;
    fs::write(
      Self::manifest_metadata_path(&cache_root),
      serde_json::to_vec(&pending.manifest_metadata)?,
    )?;
    self
      .manifest_metadata
      .lock()
      .await
      .replace(pending.manifest_metadata.clone());
    self.pending_update.lock().await.take();

    let status = match cfg.activation_policy {
      ActivationPolicy::NextLaunch => ActivationStatus::PendingRestart,
      ActivationPolicy::SoftReload => ActivationStatus::AppliedNow,
    };

    Ok(ApplyResult {
      status,
      version: pending.version,
      activation_policy: cfg.activation_policy,
    })
  }

  pub async fn current_version(&self) -> Result<CurrentVersion> {
    let native_version = self.app.package_info().version.to_string();
    let ota_version = self
      .manifest_metadata
      .lock()
      .await
      .as_ref()
      .map(|meta| meta.update_version.clone());

    let (effective_version, source) = if let Some(version) = &ota_version {
      (version.clone(), String::from("ota"))
    } else {
      (native_version.clone(), String::from("native"))
    };

    Ok(CurrentVersion {
      native_version,
      ota_version,
      effective_version,
      source,
    })
  }
}
