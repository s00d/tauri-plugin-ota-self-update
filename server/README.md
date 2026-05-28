# OTA Self-Hosted Server

Minimal OTA file server for `mode=server` publishing.
Implemented on Express with auth middleware.

## Endpoints

- `GET /` (dashboard UI)
- `GET /healthz`
- `GET /openapi.json`
- `GET /releases.json`
- `GET /manifest/:channel.json`
- `GET /:channel/:archive`
- `PUT /releases.json` (auth required)
- `PUT /manifest/:channel.json` (auth required)
- `PUT /:channel/:archive` (auth required)

Auth for uploads:

- Header: `Authorization: Bearer <OTA_SERVER_TOKEN>`
- Token is loaded from `OTA_SERVER_TOKEN` environment variable.

Dashboard actions (token required):

- Confirm draft release
- Revoke published release
- Delete release (optionally purge files)
- API reads/writes are locked until token is provided

## Run locally

```bash
OTA_SERVER_TOKEN=super-secret \
PORT=8080 \
OTA_DATA_DIR=.ota-server-data \
pnpm run build:scripts && node server/ota-server.cjs
```

## Run with Docker

```bash
docker build -t ota-self-update-server -f server/Dockerfile server

docker run --rm -p 8080:8080 \
  -e OTA_SERVER_TOKEN=super-secret \
  -e OTA_DATA_DIR=/data/ota \
  -v "$(pwd)/.ota-server-data:/data/ota" \
  ota-self-update-server
```

## Run with Docker Compose

```bash
cd server
OTA_SERVER_TOKEN=super-secret docker compose up -d --build
```

OpenAPI:
- Runtime endpoint: `GET /openapi.json`
- Optional generated file: set `OTA_OPENAPI_OUTPUT` (compose default writes `/data/ota/openapi.json`)

## Upload OTA payload (example)

```bash
OTA_PUBLISH_MODE=server \
OTA_BASE_URL=http://127.0.0.1:8080 \
OTA_SERVER_TOKEN=super-secret \
OTA_CHANNEL=stable \
OTA_VERSION=0.2.0 \
OTA_RELEASE_STATUS=released \
OTA_DIST_DIR=examples/tauri-app/dist \
pnpm run ota:publish
```
