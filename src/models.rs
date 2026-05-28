use std::{collections::HashMap, path::PathBuf};

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ActivationPolicy {
  NextLaunch,
  SoftReload,
}

impl Default for ActivationPolicy {
  fn default() -> Self {
    Self::NextLaunch
  }
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum ActivationStatus {
  PendingRestart,
  AppliedNow,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ManifestFile {
  pub signature: String,
  #[serde(default)]
  pub sha256: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateManifest {
  pub version: String,
  #[serde(default)]
  pub notes: String,
  #[serde(default)]
  pub pub_date: Option<String>,
  pub signature: String,
  pub archive_url: String,
  pub archive_signature: String,
  #[serde(default)]
  pub files: HashMap<PathBuf, ManifestFile>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
  pub version: String,
  pub notes: String,
  #[serde(default)]
  pub pub_date: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CheckResult {
  pub available: bool,
  #[serde(default)]
  pub update: Option<UpdateInfo>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApplyResult {
  pub status: ActivationStatus,
  pub version: String,
  pub activation_policy: ActivationPolicy,
}
