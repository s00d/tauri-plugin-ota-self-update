#!/usr/bin/env node

// ota-server.ts
import { createServer } from "node:http";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { dirname, join, resolve } from "node:path";
var PORT = Number.parseInt(process.env.PORT || "8080", 10);
var DATA_DIR = resolve(process.env.OTA_DATA_DIR || "./.ota-server-data");
var TOKEN = (process.env.OTA_SERVER_TOKEN || "").trim();
var MAX_UPLOAD_MB = Number.parseInt(process.env.OTA_MAX_UPLOAD_MB || "200", 10);
var MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
if (!TOKEN) {
  console.error("Missing required env: OTA_SERVER_TOKEN");
  process.exit(1);
}
function json(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}
function cleanSegment(value) {
  return /^[A-Za-z0-9._-]+$/.test(value);
}
function parseRoute(pathname) {
  if (pathname === "/healthz") return { kind: "health" };
  if (pathname === "/releases.json") return { kind: "releases" };
  const manifest = pathname.match(/^\/manifest\/([A-Za-z0-9._-]+)\.json$/);
  if (manifest) return { kind: "manifest", channel: manifest[1] };
  const archive = pathname.match(/^\/([A-Za-z0-9._-]+)\/([A-Za-z0-9._-]+)$/);
  if (archive) return { kind: "archive", channel: archive[1], file: archive[2] };
  return null;
}
function storagePath(route) {
  if (route.kind === "releases") return join(DATA_DIR, "releases.json");
  if (route.kind === "manifest") return join(DATA_DIR, "manifest", `${route.channel}.json`);
  return join(DATA_DIR, route.channel, route.file);
}
async function ensureParent(path) {
  await mkdir(dirname(path), { recursive: true });
}
function isAuthorized(req) {
  const auth = req.headers.authorization || "";
  return auth === `Bearer ${TOKEN}`;
}
async function readBody(req) {
  return new Promise((resolveBody, rejectBody) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_UPLOAD_BYTES) {
        rejectBody(new Error(`Upload too large (>${MAX_UPLOAD_MB}MB)`));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      resolveBody(Buffer.concat(chunks));
    });
    req.on("error", rejectBody);
  });
}
async function handleGet(res, route) {
  if (route.kind === "health") {
    return json(res, 200, { ok: true });
  }
  const path = storagePath(route);
  try {
    const info = await stat(path);
    const contentType = route.kind === "archive" ? "application/gzip" : "application/json; charset=utf-8";
    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": String(info.size),
      "Cache-Control": "no-cache"
    });
    createReadStream(path).pipe(res);
  } catch {
    if (route.kind === "releases") {
      return json(res, 200, []);
    }
    return json(res, 404, { error: "not found" });
  }
}
async function handlePut(req, res, route) {
  if (!isAuthorized(req)) {
    return json(res, 401, { error: "unauthorized" });
  }
  if (route.kind === "health") {
    return json(res, 405, { error: "method not allowed" });
  }
  const path = storagePath(route);
  try {
    const body = await readBody(req);
    await ensureParent(path);
    await writeFile(path, body);
    return json(res, 200, { ok: true, path: route.kind });
  } catch (error) {
    return json(res, 400, {
      error: error instanceof Error ? error.message : "bad request"
    });
  }
}
var server = createServer(async (req, res) => {
  if (!req.url || !req.method) {
    return json(res, 400, { error: "bad request" });
  }
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const route = parseRoute(url.pathname);
  if (!route) {
    return json(res, 404, { error: "not found" });
  }
  if (route.kind === "manifest" && !cleanSegment(route.channel)) {
    return json(res, 400, { error: "invalid channel" });
  }
  if (route.kind === "archive" && (!cleanSegment(route.channel) || !cleanSegment(route.file))) {
    return json(res, 400, { error: "invalid path" });
  }
  if (req.method === "GET") {
    return handleGet(res, route);
  }
  if (req.method === "PUT") {
    return handlePut(req, res, route);
  }
  return json(res, 405, { error: "method not allowed" });
});
await mkdir(DATA_DIR, { recursive: true });
server.listen(PORT, "0.0.0.0", () => {
  console.log(`OTA server listening on :${PORT}`);
  console.log(`Data dir: ${DATA_DIR}`);
});
