use serde::{ser::Serializer, Serialize};

pub type Result<T> = std::result::Result<T, Error>;

#[derive(Debug, thiserror::Error)]
pub enum Error {
  #[error(transparent)]
  Io(#[from] std::io::Error),
  #[error(transparent)]
  Tauri(#[from] tauri::Error),
  #[error(transparent)]
  Network(#[from] reqwest::Error),
  #[error(transparent)]
  Json(#[from] serde_json::Error),
  #[error(transparent)]
  Url(#[from] url::ParseError),
  #[error(transparent)]
  Base64(#[from] base64::DecodeError),
  #[error(transparent)]
  Utf8(#[from] std::str::Utf8Error),
  #[error("invalid public key: {0}")]
  InvalidPublicKey(minisign_verify::Error),
  #[error("invalid signature: {0}")]
  InvalidSignature(minisign_verify::Error),
  #[error("no pending update to apply")]
  NoPendingUpdate,
  #[error("invalid header name in requestHeaders")]
  InvalidHeaderName,
  #[error("invalid header value in requestHeaders")]
  InvalidHeaderValue,
  #[error("{0}")]
  Message(String),
  #[cfg(mobile)]
  #[error(transparent)]
  PluginInvoke(#[from] tauri::plugin::mobile::PluginInvokeError),
}

impl Serialize for Error {
  fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
  where
    S: Serializer,
  {
    serializer.serialize_str(self.to_string().as_ref())
  }
}
