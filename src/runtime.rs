use std::{
  collections::HashMap,
  sync::{Arc, Mutex},
};
use tauri::{plugin::PluginApi, utils::assets::AssetKey, AppHandle, Assets, Runtime};

use crate::{core::OtaCore, models::*, Config, Result};

/// Access to the ota-self-update APIs.
pub struct OtaSelfUpdate<R: Runtime> {
  core: OtaCore<R>,
  pub(crate) embedded_assets: Arc<Mutex<Option<Box<dyn Assets<R>>>>>,
}

pub fn init<R: Runtime>(
  app: &AppHandle<R>,
  api: PluginApi<R, Config>,
  overlay_assets: Arc<Mutex<HashMap<AssetKey, Vec<u8>>>>,
  embedded_assets: Box<dyn Assets<R>>,
) -> Result<OtaSelfUpdate<R>> {
  let config = api.config().clone();
  Ok(OtaSelfUpdate {
    core: OtaCore::new(app.clone(), config, overlay_assets),
    embedded_assets: Arc::new(Mutex::new(Some(embedded_assets))),
  })
}

impl<R: Runtime> OtaSelfUpdate<R> {
  pub async fn set_channel(&self, channel: Option<String>) -> Result<()> {
    self.core.set_channel(channel).await
  }

  pub async fn check_for_updates(&self) -> Result<CheckResult> {
    self.core.check_for_updates().await
  }

  pub async fn apply_update(&self) -> Result<ApplyResult> {
    self.core.apply_update().await
  }

  pub async fn current_version(&self) -> Result<CurrentVersion> {
    self.core.current_version().await
  }

  pub async fn rollback_update(&self) -> Result<RollbackResult> {
    self.core.rollback_update().await
  }
}
