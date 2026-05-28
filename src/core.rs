use std::{
  fs,
  path::{Path, PathBuf},
  sync::Arc,
};

use base64::Engine;
use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use semver::Version;
use tauri::{AppHandle, Manager, Runtime};

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
    let channel = cfg.channel.as_deref().unwrap_or("stable");
    format!("{base}/manifest/{channel}.json")
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
      (Ok(current), Ok(incoming)) => incoming > current,
      _ => incoming != current,
    }
  }

  pub async fn set_channel(&self, channel: Option<String>) -> Result<()> {
    self.config.lock().await.channel = channel.filter(|c| !c.trim().is_empty());
    Ok(())
  }

  pub async fn check_for_updates(&self) -> Result<CheckResult> {
    let cfg = self.config.lock().await.clone();
    let client = Self::http_client(&cfg).await?;
    let manifest_url = Self::manifest_url(&cfg);
    let current_version = self.app.package_info().version.to_string();

    let manifest_bytes = client
      .get(manifest_url)
      .send()
      .await?
      .error_for_status()?
      .bytes()
      .await?
      .to_vec();
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
