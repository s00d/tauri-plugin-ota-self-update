use std::{
  fs,
  path::{Path, PathBuf},
  sync::Arc,
};

use base64::Engine;
use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use semver::Version;
use tauri::{AppHandle, Manager, Runtime};
use url::Url;

use crate::{models::*, Config, Error, Result};

#[derive(Clone)]
pub struct PendingUpdate {
  pub version: String,
  pub archive_path: PathBuf,
}

pub struct OtaCore<R: Runtime> {
  app: AppHandle<R>,
  config: Arc<tauri::async_runtime::Mutex<Config>>,
  pending_update: Arc<tauri::async_runtime::Mutex<Option<PendingUpdate>>>,
}

impl<R: Runtime> OtaCore<R> {
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

  pub fn new(app: AppHandle<R>, config: Config) -> Self {
    Self {
      app,
      config: Arc::new(tauri::async_runtime::Mutex::new(config)),
      pending_update: Arc::new(tauri::async_runtime::Mutex::new(None)),
    }
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
    let selected = releases
      .iter()
      .find(|release| !release.draft && release.prerelease == want_prerelease)
      .ok_or_else(|| {
        Error::Message(format!(
          "no suitable GitHub release found for channel '{channel}' (repo: {owner}/{repo})"
        ))
      })?;

    let manifest_name = format!("{channel}.json");
    let manifest_asset = selected
      .assets
      .iter()
      .find(|asset| asset.name == manifest_name)
      .ok_or_else(|| {
        Error::Message(format!(
          "manifest asset '{manifest_name}' not found in selected GitHub release (repo: {owner}/{repo})"
        ))
      })?;

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
    let cfg = self.config.lock().await.clone();
    let client = Self::http_client(&cfg).await?;
    let channel = Self::channel(&cfg);
    let current_version = self.app.package_info().version.to_string();

    let manifest_bytes = if let Some((owner, repo)) = Self::github_repo_from_base_url(&cfg.base_url) {
      Self::fetch_manifest_from_github(&client, &owner, &repo, channel).await?
    } else {
      if let Some(index_manifest) = Self::fetch_manifest_from_release_index(&client, &cfg, channel).await? {
        index_manifest
      } else {
        let manifest_url = Self::manifest_url(&cfg);
        client
          .get(manifest_url)
          .send()
          .await?
          .error_for_status()?
          .bytes()
          .await?
          .to_vec()
      }
    };
    let manifest: UpdateManifest = serde_json::from_slice(&manifest_bytes)?;
    Self::verify_signature(&cfg.pubkey, &manifest_bytes, &manifest.signature)?;

    if !Self::is_newer_version(&current_version, &manifest.version) {
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

    let info = UpdateInfo {
      version: manifest.version.clone(),
      notes: manifest.notes,
      pub_date: manifest.pub_date,
    };
    self.pending_update.lock().await.replace(PendingUpdate {
      version: manifest.version,
      archive_path,
    });

    Ok(CheckResult {
      available: true,
      update: Some(info),
    })
  }

  pub async fn apply_update(&self) -> Result<ApplyResult> {
    let cfg = self.config.lock().await.clone();
    let pending = self.pending_update.lock().await.clone().ok_or(Error::NoPendingUpdate)?;

    let target_dir = self.cache_root()?.join("latest-dist");
    if target_dir.exists() {
      fs::remove_dir_all(&target_dir)?;
    }
    fs::create_dir_all(&target_dir)?;

    let archive_file = fs::File::open(&pending.archive_path)?;
    let decoder = flate2::read::GzDecoder::new(archive_file);
    let mut archive = tar::Archive::new(decoder);
    archive.unpack(&target_dir)?;

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
}
