use std::collections::HashMap;

use serde::{Deserialize, Deserializer};
use tauri::{plugin::{Builder, TauriPlugin}, Context, Manager, Runtime};

pub use models::*;

mod commands;
mod core;
mod error;
mod models;
mod runtime;

pub use error::{Error, Result};

use runtime::OtaSelfUpdate;

const DEFAULT_CHANNEL: &str = "stable";

#[derive(Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Config {
  pub base_url: String,
  pub pubkey: String,
  #[serde(default, deserialize_with = "channel_deserializer")]
  pub channel: Option<String>,
  #[serde(default)]
  pub request_headers: HashMap<String, String>,
  #[serde(default)]
  pub timeout_secs: Option<u64>,
  #[serde(default)]
  pub activation_policy: ActivationPolicy,
}

fn channel_deserializer<'de, D>(deserializer: D) -> std::result::Result<Option<String>, D::Error>
where
  D: Deserializer<'de>,
{
  let s = Option::<String>::deserialize(deserializer)?;
  Ok(match s {
    Some(channel) if channel == DEFAULT_CHANNEL => None,
    Some(channel) if channel.is_empty() => None,
    other => other,
  })
}

/// Extensions to [`tauri::App`], [`tauri::AppHandle`] and [`tauri::Window`] to access the ota-self-update APIs.
pub trait OtaSelfUpdateExt<R: Runtime> {
  fn ota_self_update(&self) -> &OtaSelfUpdate<R>;
}

impl<R: Runtime, T: Manager<R>> crate::OtaSelfUpdateExt<R> for T {
  fn ota_self_update(&self) -> &OtaSelfUpdate<R> {
    self.state::<OtaSelfUpdate<R>>().inner()
  }
}

pub fn init<R: Runtime>(context: Context<R>) -> (TauriPlugin<R, Config>, Context<R>) {
  let plugin = Builder::<R, Config>::new("ota-self-update")
    .invoke_handler(tauri::generate_handler![
      commands::check_for_updates,
      commands::apply_update,
      commands::set_channel
    ])
    .setup(|app, api| {
      let ota_self_update = runtime::init(app, api)?;
      app.manage(ota_self_update);
      Ok(())
    })
    .build();
  (plugin, context)
}
