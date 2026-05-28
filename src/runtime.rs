use tauri::{plugin::PluginApi, AppHandle, Runtime};

use crate::{core::OtaCore, models::*, Config, Result};

/// Access to the ota-self-update APIs.
pub struct OtaSelfUpdate<R: Runtime> {
  core: OtaCore<R>,
}

pub fn init<R: Runtime>(
  app: &AppHandle<R>,
  api: PluginApi<R, Config>,
) -> Result<OtaSelfUpdate<R>> {
  let config = api.config().clone();
  Ok(OtaSelfUpdate {
    core: OtaCore::new(app.clone(), config),
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
}
