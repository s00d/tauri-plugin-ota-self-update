[![npm version](https://img.shields.io/npm/v/tauri-plugin-ota-self-update-api/latest?style=for-the-badge)](https://www.npmjs.com/package/tauri-plugin-ota-self-update-api)
[![Crates.io](https://img.shields.io/crates/v/tauri-plugin-ota-self-update?style=for-the-badge)](https://crates.io/crates/tauri-plugin-ota-self-update)
[![Documentation](https://img.shields.io/badge/docs-docs.rs-blue?style=for-the-badge)](https://docs.rs/tauri-plugin-ota-self-update/)
[![GitHub issues](https://img.shields.io/github/issues/s00d/tauri-plugin-ota-self-update?style=for-the-badge)](https://github.com/s00d/tauri-plugin-ota-self-update/issues)
[![GitHub stars](https://img.shields.io/github/stars/s00d/tauri-plugin-ota-self-update?style=for-the-badge)](https://github.com/s00d/tauri-plugin-ota-self-update/stargazers)
[![Donate](https://img.shields.io/badge/Donate-Donationalerts-ff4081?style=for-the-badge)](https://www.donationalerts.com/r/s00d88)

# Tauri Plugin OTA Self Update

Self-hosted OTA updates for Tauri v2 web assets.  
This project provides:

- A Rust plugin for runtime update checks and apply flow.
- A guest JS API package for frontend usage.
- A universal GitHub Action (`action.yml`) for publishing OTA artifacts.

---

## Table of contents

1. [Features](#features)
2. [Platform support](#platform-support)
3. [Installation](#installation)
4. [Usage](#usage)
5. [Manifest contract](#manifest-contract)
6. [Rust-side access](#rust-side-access)
7. [Publishing](#publishing)
8. [GitHub Action](#github-action)
9. [Permissions](#permissions)
10. [Security](#security)
11. [Development](#development)
12. [License](#license)

---

## Features

- Self-hosted OTA model (no vendor cloud lock-in).
- Update channels (`stable`, `beta`, custom).
- JS API: `check()`, `checkWithMeta()`, `setChannel()`, `Update.apply()`.
- Rust-side access via `app.ota_self_update()`.
- Single Rust runtime is used on all targets (no separate Kotlin/Swift OTA bridge required).
- Multiple publish targets: GitHub Releases, S3-compatible, custom HTTP server.
- Marketplace-style reusable GitHub Action in repo root (`action.yml`).

---

## Platform support

| Platform | Status |
|----------|--------|
| macOS | Supported |
| Windows | Supported |
| Linux | Supported |
| Android | Supported |
| iOS | Supported |

---

## Installation

### Rust (`src-tauri/Cargo.toml`)

```toml
[dependencies]
tauri-plugin-ota-self-update = "0.1"
```

### JavaScript

```bash
pnpm add tauri-plugin-ota-self-update-api
```

---

## Usage

### Backend initialization

```rust
let context = tauri::generate_context!();
let (ota_plugin, context) = tauri_plugin_ota_self_update::init(context);

tauri::Builder::default()
  .plugin(ota_plugin)
  .run(context)
  .expect("error while running tauri application");
```

### Plugin config (`tauri.conf.json`)

```json
{
  "plugins": {
    "ota-self-update": {
      "baseUrl": "https://updates.example.com/ota",
      "pubkey": "",
      "channel": "stable",
      "timeoutSecs": 30,
      "activationPolicy": "nextLaunch",
      "requestHeaders": {
        "x-tenant": "acme"
      }
    }
  }
}
```

GitHub mode note:
- Set `baseUrl` to `https://github.com/<owner>/<repo>`.
- `stable` channel resolves the latest non-prerelease release asset `stable.json`.
- `beta` channel resolves the latest prerelease asset `beta.json`.

`activationPolicy` values:
- `nextLaunch`: apply assets and activate them on next app start.
- `softReload`: apply assets and mark as active immediately for runtime reload flows.

### Frontend flow

```ts
import { check, setChannel } from "tauri-plugin-ota-self-update-api";

await setChannel("stable");
const update = await check();
if (update) {
  const applyResult = await update.apply();
  if (applyResult.status === "appliedNow") {
    location.reload();
  }
}
```

---

## Manifest contract

Example `manifest/stable.json`:

```json
{
  "version": "1.2.3",
  "notes": "Bugfixes and UX improvements",
  "pubDate": "2026-05-28T10:00:00.000Z",
  "signature": "",
  "archiveSignature": "",
  "archiveUrl": "https://updates.example.com/ota/stable/ota-dist-1.2.3.tar.gz"
}
```

---

## Rust-side access

You can call plugin logic from Rust commands/plugins through the extension trait:

```rust
use tauri::Manager;
use tauri_plugin_ota_self_update::OtaSelfUpdateExt;

#[tauri::command]
async fn switch_channel(app: tauri::AppHandle, channel: String) -> Result<(), String> {
  app.ota_self_update()
    .set_channel(Some(channel))
    .await
    .map_err(|e| e.to_string())
}
```

---

## Publishing

Local publisher script:

```bash
OTA_PUBLISH_MODE=github \
OTA_CHANNEL=stable \
OTA_VERSION=1.2.3 \
OTA_BASE_URL=https://updates.example.com/ota \
OTA_TARGET_REPO=owner/repo \
pnpm run ota:publish
```

Modes:

- `github`: uses GitHub REST API via `@octokit/rest`.
- `s3`: uses AWS SDK v3 (`@aws-sdk/client-s3`).
- `server`: uses `axios` PUT to upload archive + manifest.

For `s3` and `server` modes, publisher also maintains `releases.json` index:
- `stable` resolves latest non-prerelease entry.
- `beta` resolves latest prerelease entry.
- Client falls back to `manifest/<channel>.json` when `releases.json` is unavailable.

---

## GitHub Action

This repository exposes a reusable action in `action.yml`.

```yaml
- name: Publish OTA
  uses: s00d/tauri-plugin-ota-self-update@v1
  with:
    mode: github
    channel: stable
    version: 1.2.3
    dist_dir: dist
    base_url: https://updates.example.com/ota
    target_repo: owner/repo
```

Primary inputs:

- `mode`: `github | s3 | server` (required)
- `version`: OTA version (required)
- `channel`, `dist_dir`, `out_dir`, `base_url`, `notes`
- `target_repo`, `release_tag`, `github_token` (github mode)
- `s3_bucket` (s3 mode)
- `server_token` (server mode)
- `manifest_signature`, `archive_signature`
- `dry_run` (`true|false`)

Validation workflow example is provided at `.github/workflows/ota-publish.yml`.

---

## Self-hosted OTA server (Docker)

This repository includes a ready-to-run OTA server in `server/`.

- Server source: `scripts-src/ota-server.ts`
- Dashboard UI source: `scripts-src/server-ui/index.html`, `scripts-src/server-ui/dashboard.js`
- Built server runtime: `server/ota-server.cjs`
- Built dashboard assets: `server/dist/*`
- Docker image spec: `server/Dockerfile`
- Docker Compose: `server/docker-compose.yml`
- Upload auth: `Authorization: Bearer <OTA_SERVER_TOKEN>`

Quick start:

```bash
pnpm run build:scripts
docker build -t ota-self-update-server -f server/Dockerfile server
docker run --rm -p 8080:8080 \
  -e OTA_SERVER_TOKEN=super-secret \
  -v "$(pwd)/.ota-server-data:/data/ota" \
  ota-self-update-server
```

Local run without Docker:

```bash
pnpm run build:scripts
OTA_SERVER_TOKEN=super-secret \
PORT=8080 \
OTA_DATA_DIR=.ota-server-data \
pnpm run server:start
```

Generate OpenAPI file on startup:

```bash
OTA_SERVER_TOKEN=super-secret \
OTA_OPENAPI_OUTPUT=.ota-server-data/openapi.json \
pnpm run server:start
```

OpenAPI endpoint is always available at:

```text
GET /openapi.json
```

Interactive online docs:

```text
GET /docs
```

Then set plugin config:

```json
{
  "plugins": {
    "ota-self-update": {
      "baseUrl": "https://your-server.example.com",
      "channel": "stable"
    }
  }
}
```

Use publisher action/script in `mode=server` with `server_token` equal to `OTA_SERVER_TOKEN`.
Server dashboard:
- `GET /` - web UI with token auth for release lifecycle operations.
- `GET /api/info` - release counters and runtime info (requires token).
- `GET /api/releases` - full release list (requires token).
- `POST /api/releases/:channel/:version/confirm` - publish draft.
- `POST /api/releases/:channel/:version/revoke` - revoke published version.
- `DELETE /api/releases/:channel/:version?purge=true` - remove entry and OTA files.

Publish to this server (manual example):

```bash
OTA_PUBLISH_MODE=server \
OTA_BASE_URL=http://127.0.0.1:8080 \
OTA_SERVER_TOKEN=super-secret \
OTA_CHANNEL=stable \
OTA_VERSION=0.1.1 \
OTA_RELEASE_STATUS=released \
OTA_DIST_DIR=examples/tauri-app/dist \
pnpm run ota:publish
```

Beta/pre-release example:

```bash
OTA_PUBLISH_MODE=server \
OTA_BASE_URL=http://127.0.0.1:8080 \
OTA_SERVER_TOKEN=super-secret \
OTA_CHANNEL=beta \
OTA_VERSION=0.1.2-beta.1 \
OTA_RELEASE_STATUS=draft \
OTA_DIST_DIR=examples/tauri-app/dist \
pnpm run ota:publish
```

The server stores:
- `manifest/stable.json` and `manifest/beta.json`
- `<channel>/ota-dist-<version>.tar.gz`
- `releases.json` index (used by client to resolve latest stable/beta)

---

## Permissions

Default permission set: `ota-self-update:default`.  
Granular permissions are generated under `permissions/` for:

- `check_for_updates`
- `apply_update`
- `set_channel`

---

## Security

- Always set `pubkey` and signatures in production.
- Empty `pubkey` or empty signatures skip verification (development-only behavior).
- Keep release keys in repository/org secrets and rotate periodically.

---

## Development

```bash
cargo check
pnpm install
pnpm run build
cargo check --manifest-path examples/tauri-app/src-tauri/Cargo.toml
```

---

## License

MIT OR Apache-2.0
