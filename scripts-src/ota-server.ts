#!/usr/bin/env node

import express, { type NextFunction, type Request, type Response } from "express";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const PORT = Number.parseInt(process.env.PORT || "8080", 10);
const DATA_DIR = resolve(process.env.OTA_DATA_DIR || "./.ota-server-data");
const TOKEN = (process.env.OTA_SERVER_TOKEN || "").trim();
const MAX_UPLOAD_MB = Number.parseInt(process.env.OTA_MAX_UPLOAD_MB || "200", 10);
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
const OPENAPI_OUTPUT_PATH = (process.env.OTA_OPENAPI_OUTPUT || "").trim();

if (!TOKEN) {
  console.error("Missing required env: OTA_SERVER_TOKEN");
  process.exit(1);
}

type ReleaseStatus = "draft" | "released" | "revoked";
type ReleaseIndexEntry = {
  version: string;
  channel: string;
  prerelease: boolean;
  status?: ReleaseStatus;
  pubDate: string;
  manifestUrl: string;
};

function cleanSegment(value: string): boolean {
  return /^[A-Za-z0-9._-]+$/.test(value);
}

function isAuthorizedHeader(authHeader?: string): boolean {
  const auth = authHeader || "";
  return auth === `Bearer ${TOKEN}`;
}

function releasesPath(): string {
  return join(DATA_DIR, "releases.json");
}

function manifestPath(channel: string): string {
  return join(DATA_DIR, "manifest", `${channel}.json`);
}

function archivePath(channel: string, file: string): string {
  return join(DATA_DIR, channel, file);
}

function one(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

async function ensureParent(path: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
}

async function readBody(req: Request): Promise<Buffer> {
  return new Promise((resolveBody, rejectBody) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_UPLOAD_BYTES) {
        rejectBody(new Error(`Upload too large (>${MAX_UPLOAD_MB}MB)`));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolveBody(Buffer.concat(chunks)));
    req.on("error", rejectBody);
  });
}

async function readReleases(): Promise<ReleaseIndexEntry[]> {
  try {
    const raw = await readFile(releasesPath(), "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeReleases(entries: ReleaseIndexEntry[]): Promise<void> {
  await ensureParent(releasesPath());
  await writeFile(releasesPath(), JSON.stringify(entries, null, 2), "utf8");
}

function openApiSpec(port: number) {
  return {
    openapi: "3.1.0",
    info: { title: "OTA Self-Hosted Server API", version: "1.1.0" },
    servers: [{ url: `http://127.0.0.1:${port}` }],
    paths: {
      "/api/info": { get: { summary: "Runtime and releases summary" } },
      "/api/releases": { get: { summary: "List releases" } },
      "/api/releases/{channel}/{version}/confirm": { post: { summary: "Mark release as released" } },
      "/api/releases/{channel}/{version}/revoke": { post: { summary: "Mark release as revoked" } },
      "/api/releases/{channel}/{version}/draft": { post: { summary: "Mark release as draft" } },
      "/api/releases/{channel}/{version}": { delete: { summary: "Delete release entry and optional files" } },
      "/healthz": { get: { summary: "Health check" } },
      "/releases.json": { get: { summary: "Public release index" }, put: { summary: "Overwrite index" } },
      "/manifest/{channel}.json": { get: { summary: "Get manifest" }, put: { summary: "Upload manifest" } },
      "/{channel}/{archive}": { get: { summary: "Download archive" }, put: { summary: "Upload archive" } },
    },
  };
}

function swaggerUiHtml(): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>OTA Server API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body style="margin:0;">
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: '/openapi.json',
      dom_id: '#swagger-ui',
      deepLinking: true,
      displayRequestDuration: true
    });
  </script>
</body>
</html>`;
}

async function handleFileGet(res: Response, path: string, contentType: string, fallback?: unknown) {
  try {
    const info = await stat(path);
    const data = await readFile(path);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Length", String(info.size));
    res.setHeader("Cache-Control", "no-cache");
    return res.status(200).send(data);
  } catch {
    if (fallback !== undefined) return res.status(200).json(fallback);
    return res.status(404).json({ error: "not found" });
  }
}

function requireToken(req: Request, res: Response, next: NextFunction): void {
  if (!isAuthorizedHeader(req.header("authorization") || "")) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
}

const app = express();
app.use(express.json({ limit: `${MAX_UPLOAD_MB}mb` }));
app.use(express.raw({ type: "application/gzip", limit: `${MAX_UPLOAD_MB}mb` }));
const uiDistDir = join(resolve("."), "server", "dist");
app.use(express.static(uiDistDir, { extensions: ["html"] }));
app.get("/", (_req, res) => res.sendFile(join(uiDistDir, "index.html")));

app.get("/healthz", (_req, res) => res.status(200).json({ ok: true }));
app.get("/openapi.json", (_req, res) => res.status(200).json(openApiSpec(PORT)));
app.get("/docs", (_req, res) => res.status(200).type("html").send(swaggerUiHtml()));

app.get("/api/info", requireToken, async (_req, res) => {
  const entries = await readReleases();
  const stats = {
    total: entries.length,
    released: entries.filter((x) => (x.status ?? "released") === "released").length,
    draft: entries.filter((x) => x.status === "draft").length,
    revoked: entries.filter((x) => x.status === "revoked").length,
    stable: entries.filter((x) => x.channel === "stable").length,
    beta: entries.filter((x) => x.channel === "beta").length,
  };
  return res.status(200).json({ ok: true, stats, dataDir: DATA_DIR });
});

app.get("/api/releases", requireToken, async (_req, res) => {
  return res.status(200).json(await readReleases());
});

app.post("/api/releases/:channel/:version/:action", requireToken, async (req, res) => {
  const channel = one(req.params.channel);
  const version = one(req.params.version);
  const action = one(req.params.action);
  if (action !== "confirm" && action !== "revoke" && action !== "draft") {
    return res.status(400).json({ error: "unsupported action" });
  }
  const entries = await readReleases();
  let found = false;
  const next = entries.map((entry) => {
    if (entry.channel === channel && entry.version === version) {
      found = true;
      return { ...entry, status: action === "confirm" ? "released" : (action as ReleaseStatus) };
    }
    return entry;
  });
  if (!found) {
    return res.status(404).json({ error: "release not found" });
  }
  await writeReleases(next);
  return res.status(200).json({ ok: true });
});

app.delete("/api/releases/:channel/:version", requireToken, async (req, res) => {
  const channel = one(req.params.channel);
  const version = one(req.params.version);
  const entries = await readReleases();
  const candidate = entries.find((x) => x.channel === channel && x.version === version);
  const next = entries.filter((x) => !(x.channel === channel && x.version === version));
  if (candidate && req.query.purge === "true") {
    const archiveName = `ota-dist-${version}.tar.gz`;
    await rm(archivePath(channel, archiveName), { force: true });
    await rm(manifestPath(channel), { force: true });
  }
  await writeReleases(next);
  return res.status(200).json({ ok: true, removed: entries.length - next.length });
});

app.get("/releases.json", async (_req, res) =>
  handleFileGet(res, releasesPath(), "application/json; charset=utf-8", [])
);

app.put("/releases.json", requireToken, async (req, res) => {
  const body = req.body instanceof Buffer ? req.body : Buffer.from(JSON.stringify(req.body ?? []));
  await ensureParent(releasesPath());
  await writeFile(releasesPath(), body);
  return res.status(200).json({ ok: true, path: "releases" });
});

app.get("/manifest/:channel.json", async (req, res) => {
  const channel = one(req.params.channel);
  if (!cleanSegment(channel)) return res.status(400).json({ error: "invalid channel" });
  return handleFileGet(res, manifestPath(channel), "application/json; charset=utf-8");
});

app.put("/manifest/:channel.json", requireToken, async (req, res) => {
  const channel = one(req.params.channel);
  if (!cleanSegment(channel)) return res.status(400).json({ error: "invalid channel" });
  const body = req.body instanceof Buffer ? req.body : Buffer.from(JSON.stringify(req.body ?? {}));
  const target = manifestPath(channel);
  await ensureParent(target);
  await writeFile(target, body);
  return res.status(200).json({ ok: true, path: "manifest" });
});

app.get("/:channel/:file", async (req, res, next) => {
  const channel = one(req.params.channel);
  const file = one(req.params.file);
  if (!cleanSegment(channel) || !cleanSegment(file)) return res.status(400).json({ error: "invalid path" });
  if (channel === "api" || channel === "manifest") return next();
  return handleFileGet(res, archivePath(channel, file), "application/gzip");
});

app.put("/:channel/:file", requireToken, async (req, res, next) => {
  const channel = one(req.params.channel);
  const file = one(req.params.file);
  if (!cleanSegment(channel) || !cleanSegment(file)) return res.status(400).json({ error: "invalid path" });
  if (channel === "api" || channel === "manifest") return next();
  const body = req.body instanceof Buffer ? req.body : Buffer.from(JSON.stringify(req.body ?? {}));
  const target = archivePath(channel, file);
  await ensureParent(target);
  await writeFile(target, body);
  return res.status(200).json({ ok: true, path: "archive" });
});

app.use((_req, res) => res.status(404).json({ error: "not found" }));

async function main(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  if (OPENAPI_OUTPUT_PATH) {
    await ensureParent(OPENAPI_OUTPUT_PATH);
    await writeFile(OPENAPI_OUTPUT_PATH, JSON.stringify(openApiSpec(PORT), null, 2), "utf8");
    console.log(`OpenAPI written to: ${OPENAPI_OUTPUT_PATH}`);
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`OTA server listening on :${PORT}`);
    console.log(`Data dir: ${DATA_DIR}`);
  });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
