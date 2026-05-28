use std::{
  borrow::Cow,
  cell::OnceCell,
  collections::HashMap,
  sync::{Arc, Mutex},
};

use serde::{Deserialize, Deserializer};
use tauri::{
  plugin::{Builder, TauriPlugin},
  utils::assets::{AssetKey, CspHash},
  App, Assets, Context, Manager, Runtime,
};

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

pub(crate) struct OtaAssets<R: Runtime> {
  overlay_assets: Arc<Mutex<HashMap<AssetKey, Vec<u8>>>>,
  embedded_assets: OnceCell<Box<dyn Assets<R>>>,
  csp_hashes: Vec<CspHash<'static>>,
}

unsafe impl<R: Runtime> Sync for OtaAssets<R> {}

impl<R: Runtime> Assets<R> for OtaAssets<R> {
  fn setup(&self, app: &App<R>) {
    let ota = app.state::<OtaSelfUpdate<R>>();
    self.embedded_assets.get_or_init(|| {
      let assets = ota.embedded_assets.lock().unwrap().take().unwrap();
      assets.setup(app);
      assets
    });
  }

  fn csp_hashes(&self, _html_path: &AssetKey) -> Box<dyn Iterator<Item = CspHash<'_>> + '_> {
    Box::new(self.csp_hashes.iter().copied())
  }

  fn get(&self, key: &AssetKey) -> Option<Cow<'_, [u8]>> {
    self
      .overlay_assets
      .lock()
      .unwrap()
      .get(key)
      .map(|bytes| Cow::Owned(bytes.clone()))
      .or_else(|| self.embedded_assets.get().unwrap().get(key))
  }

  fn iter(&self) -> Box<dyn Iterator<Item = (Cow<'_, str>, Cow<'_, [u8]>)> + '_> {
    Box::new(
      self
        .overlay_assets
        .lock()
        .unwrap()
        .clone()
        .into_iter()
        .map(|(k, v)| (Cow::Owned(k.as_ref().to_string()), Cow::Owned(v))),
    )
  }
}

pub fn init<R: Runtime>(context: Context<R>) -> (TauriPlugin<R, Config>, Context<R>) {
  let overlay_assets = Arc::new(Mutex::new(HashMap::<AssetKey, Vec<u8>>::new()));
  let mut context = context;
  let embedded_assets = context.set_assets(Box::new(OtaAssets {
    overlay_assets: overlay_assets.clone(),
    embedded_assets: Default::default(),
    csp_hashes: Default::default(),
  }));

  let plugin = Builder::<R, Config>::new("ota-self-update")
    .invoke_handler(tauri::generate_handler![
      commands::check_for_updates,
      commands::apply_update,
      commands::set_channel,
      commands::get_current_version,
      commands::rollback_update
    ])
    .setup(move |app, api| {
      let ota_self_update = runtime::init(app, api, overlay_assets.clone(), embedded_assets)?;
      app.manage(ota_self_update);
      Ok(())
    })
    .build();
  (plugin, context)
}
