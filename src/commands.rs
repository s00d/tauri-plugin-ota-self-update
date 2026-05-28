use tauri::{AppHandle, command, Runtime};

use crate::models::*;
use crate::Result;
use crate::OtaSelfUpdateExt;

#[command]
pub(crate) async fn set_channel<R: Runtime>(
  app: AppHandle<R>,
  channel: Option<String>,
) -> Result<()> {
  app.ota_self_update().set_channel(channel).await
}

#[command]
pub(crate) async fn check_for_updates<R: Runtime>(app: AppHandle<R>) -> Result<CheckResult> {
  app.ota_self_update().check_for_updates().await
}

#[command]
pub(crate) async fn apply_update<R: Runtime>(app: AppHandle<R>) -> Result<ApplyResult> {
  app.ota_self_update().apply_update().await
}

#[command]
pub(crate) async fn get_current_version<R: Runtime>(
  app: AppHandle<R>,
) -> Result<CurrentVersion> {
  app.ota_self_update().current_version().await
}

#[command]
pub(crate) async fn rollback_update<R: Runtime>(app: AppHandle<R>) -> Result<RollbackResult> {
  app.ota_self_update().rollback_update().await
}
