#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { Readable } from 'node:stream'
import * as tar from 'tar'
import { prerelease, rcompare, valid as isValidSemver } from 'semver'

type PublishMode = 'github' | 's3' | 'server'

interface Manifest {
  version: string
  notes: string
  pubDate: string
  signature: string
  archiveSignature: string
  archiveSha256: string
  archiveUrl: string
}

interface ReleaseIndexEntry {
  version: string
  channel: string
  prerelease: boolean
  status: 'draft' | 'released' | 'revoked'
  pubDate: string
  manifestUrl: string
}

function env(name: string, fallback = ''): string {
  return process.env[name] ?? fallback
}

function required(name: string): string {
  const value = env(name, '').trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

async function sha256(path: string): Promise<string> {
  const data = await readFile(path)
  return createHash('sha256').update(data).digest('hex')
}

async function createArchive(distDir: string, outArchive: string): Promise<void> {
  await tar.create({ gzip: true, cwd: distDir, file: outArchive }, ['.'])
}

function parseRepo(repo: string): { owner: string; repo: string } {
  const [owner, name] = repo.split('/')
  if (!owner || !name) {
    throw new Error(`Invalid OTA_TARGET_REPO format "${repo}", expected owner/repo`)
  }
  return { owner, repo: name }
}

function githubReleaseAssetUrl(targetRepo: string, tag: string, assetName: string): string {
  const { owner, repo } = parseRepo(targetRepo)
  return `https://github.com/${owner}/${repo}/releases/download/${tag}/${assetName}`
}

async function fetchJson<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }
  return (await response.json()) as T
}

async function fetchVoid(url: string, init: RequestInit): Promise<void> {
  const response = await fetch(url, init)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }
}

async function publishToGitHub(archivePath: string, manifestPath: string, version: string, notes: string): Promise<void> {
  const targetRepo = required('OTA_TARGET_REPO')
  const token = env('OTA_GITHUB_TOKEN', env('GITHUB_TOKEN', env('GH_TOKEN', ''))).trim()
  if (!token) {
    throw new Error('Missing OTA_GITHUB_TOKEN (or GITHUB_TOKEN/GH_TOKEN) for github mode')
  }

  const { owner, repo } = parseRepo(targetRepo)
  const tag = env('OTA_RELEASE_TAG', '').trim() || `ota-${version}`
  const apiHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'tauri-plugin-ota-self-update'
  }

  type GitHubRelease = { id: number }
  type GitHubAsset = { id: number; name: string }
  let releaseId: number
  try {
    const existing = await fetchJson<GitHubRelease>(`https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`, {
      method: 'GET',
      headers: apiHeaders
    })
    releaseId = existing.id
  } catch {
    const created = await fetchJson<GitHubRelease>(`https://api.github.com/repos/${owner}/${repo}/releases`, {
      method: 'POST',
      headers: {
        ...apiHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tag_name: tag,
        name: tag,
        body: notes
      })
    })
    releaseId = created.id
  }

  const assets = await fetchJson<GitHubAsset[]>(`https://api.github.com/repos/${owner}/${repo}/releases/${releaseId}/assets`, {
    method: 'GET',
    headers: apiHeaders
  })
  const targets = [basename(archivePath), basename(manifestPath)]
  for (const asset of assets) {
    if (targets.includes(asset.name)) {
      await fetchVoid(`https://api.github.com/repos/${owner}/${repo}/releases/assets/${asset.id}`, {
        method: 'DELETE',
        headers: apiHeaders
      })
    }
  }

  const archiveData = await readFile(archivePath)
  await fetchVoid(`https://uploads.github.com/repos/${owner}/${repo}/releases/${releaseId}/assets?name=${encodeURIComponent(
    basename(archivePath)
  )}`, {
    method: 'POST',
    headers: {
      ...apiHeaders,
      'Content-Type': 'application/gzip'
    },
    body: archiveData
  })

  const manifestData = await readFile(manifestPath)
  await fetchVoid(`https://uploads.github.com/repos/${owner}/${repo}/releases/${releaseId}/assets?name=${encodeURIComponent(
    basename(manifestPath)
  )}`, {
    method: 'POST',
    headers: {
      ...apiHeaders,
      'Content-Type': 'application/json'
    },
    body: manifestData
  })
}

async function publishToS3(archivePath: string, manifestPath: string, channel: string): Promise<void> {
  const bucket = required('OTA_S3_BUCKET')
  const region = env('AWS_REGION', env('AWS_DEFAULT_REGION', 'us-east-1'))
  const client = new S3Client({ region })

  const archiveBody = await readFile(archivePath)
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: `${channel}/${basename(archivePath)}`,
      Body: archiveBody,
      ContentType: 'application/gzip'
    })
  )

  const manifestBody = await readFile(manifestPath)
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: `manifest/${channel}.json`,
      Body: manifestBody,
      ContentType: 'application/json'
    })
  )

  await updateS3ReleaseIndex(client, bucket, region, channel, manifestPath)
}

async function publishToServer(archivePath: string, manifestPath: string, channel: string): Promise<void> {
  const token = required('OTA_SERVER_TOKEN')
  const normalizedBaseUrl = required('OTA_BASE_URL').replace(/\/$/, '')
  const manifestUrl = `${normalizedBaseUrl}/manifest/${channel}.json`
  const archiveUrl = `${normalizedBaseUrl}/${channel}/${basename(archivePath)}`

  const archiveBody = await readFile(archivePath)
  await fetchVoid(archiveUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/gzip'
    },
    body: archiveBody
  })

  const manifestBody = await readFile(manifestPath)
  await fetchVoid(manifestUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: manifestBody
  })

  await updateServerReleaseIndex(normalizedBaseUrl, channel, token, manifestPath)
}

function isPrerelease(version: string): boolean {
  return Array.isArray(prerelease(version))
}

function sortDescByVersion(left: ReleaseIndexEntry, right: ReleaseIndexEntry): number {
  const lv = isValidSemver(left.version)
  const rv = isValidSemver(right.version)
  if (lv && rv) {
    return rcompare(lv, rv)
  }
  return right.version.localeCompare(left.version)
}

async function readJsonFile<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf8')) as T
}

function upsertReleaseEntry(entries: ReleaseIndexEntry[], incoming: ReleaseIndexEntry): ReleaseIndexEntry[] {
  const filtered = entries.filter((entry) => !(entry.channel === incoming.channel && entry.version === incoming.version))
  filtered.push(incoming)
  filtered.sort(sortDescByVersion)
  return filtered
}

async function s3BodyToString(body: unknown): Promise<string> {
  if (typeof body === 'string') return body
  if (body instanceof Readable) {
    const chunks: Buffer[] = []
    for await (const chunk of body) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
    }
    return Buffer.concat(chunks).toString('utf8')
  }
  if (body && typeof (body as { transformToString?: () => Promise<string> }).transformToString === 'function') {
    return (body as { transformToString: () => Promise<string> }).transformToString()
  }
  return '[]'
}

async function loadS3ReleaseIndex(client: S3Client, bucket: string): Promise<ReleaseIndexEntry[]> {
  try {
    const response = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: 'releases.json'
      })
    )
    const raw = await s3BodyToString(response.Body)
    return JSON.parse(raw) as ReleaseIndexEntry[]
  } catch {
    return []
  }
}

async function updateS3ReleaseIndex(
  client: S3Client,
  bucket: string,
  region: string,
  channel: string,
  manifestPath: string
): Promise<void> {
  const manifest = await readJsonFile<Manifest>(manifestPath)
  const releaseStatusRaw = env('OTA_RELEASE_STATUS', 'released').trim().toLowerCase()
  const releaseStatus: ReleaseIndexEntry['status'] =
    releaseStatusRaw === 'draft' || releaseStatusRaw === 'revoked' ? releaseStatusRaw : 'released'
  const current = await loadS3ReleaseIndex(client, bucket)
  const next = upsertReleaseEntry(current, {
    version: manifest.version,
    channel,
    prerelease: isPrerelease(manifest.version),
    status: releaseStatus,
    pubDate: manifest.pubDate,
    manifestUrl: `https://${bucket}.s3.${region}.amazonaws.com/manifest/${channel}.json`
  })
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: 'releases.json',
      Body: JSON.stringify(next, null, 2),
      ContentType: 'application/json'
    })
  )
}

async function loadServerReleaseIndex(baseUrl: string): Promise<ReleaseIndexEntry[]> {
  try {
    const data = await fetchJson<ReleaseIndexEntry[]>(`${baseUrl}/releases.json`, {
      method: 'GET'
    })
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

async function updateServerReleaseIndex(
  baseUrl: string,
  channel: string,
  token: string,
  manifestPath: string
): Promise<void> {
  const manifest = await readJsonFile<Manifest>(manifestPath)
  const releaseStatusRaw = env('OTA_RELEASE_STATUS', 'released').trim().toLowerCase()
  const releaseStatus: ReleaseIndexEntry['status'] =
    releaseStatusRaw === 'draft' || releaseStatusRaw === 'revoked' ? releaseStatusRaw : 'released'
  const current = await loadServerReleaseIndex(baseUrl)
  const next = upsertReleaseEntry(current, {
    version: manifest.version,
    channel,
    prerelease: isPrerelease(manifest.version),
    status: releaseStatus,
    pubDate: manifest.pubDate,
    manifestUrl: `${baseUrl}/manifest/${channel}.json`
  })
  await fetchVoid(`${baseUrl}/releases.json`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(next, null, 2)
  })
}

async function main(): Promise<void> {
  const mode = env('OTA_PUBLISH_MODE', 'github').trim().toLowerCase() as PublishMode
  const channel = env('OTA_CHANNEL', 'stable')
  const version = env('OTA_VERSION', env('GITHUB_REF_NAME', '0.0.0-dev'))
  const baseUrl = env('OTA_BASE_URL', '')
  const distDir = resolve(env('OTA_DIST_DIR', 'dist'))
  const outDir = resolve(env('OTA_OUT_DIR', '.ota-out'))

  await mkdir(outDir, { recursive: true })
  const archiveName = `ota-dist-${version}.tar.gz`
  const archivePath = join(outDir, archiveName)
  await createArchive(distDir, archivePath)

  const archiveHash = await sha256(archivePath)
  const githubTag = env('OTA_RELEASE_TAG', '').trim() || `ota-${version}`
  const archiveUrl =
    mode === 'github'
      ? githubReleaseAssetUrl(required('OTA_TARGET_REPO'), githubTag, archiveName)
      : `${baseUrl.replace(/\/$/, '')}/${channel}/${archiveName}`

  const manifest: Manifest = {
    version,
    notes: env('OTA_NOTES', `OTA build ${version}`),
    pubDate: new Date().toISOString(),
    signature: env('OTA_MANIFEST_SIGNATURE', ''),
    archiveSignature: env('OTA_ARCHIVE_SIGNATURE', ''),
    archiveSha256: archiveHash,
    archiveUrl
  }
  const manifestPath = join(outDir, `${channel}.json`)
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2))

  if (env('OTA_DRY_RUN', '').toLowerCase() === 'true') {
    console.log(`[dry-run] mode=${mode} channel=${channel} version=${version}`)
    console.log(`[dry-run] archive=${archivePath}`)
    console.log(`[dry-run] manifest=${manifestPath}`)
    return
  }

  if (mode === 'github') {
    await publishToGitHub(archivePath, manifestPath, version, manifest.notes)
  } else if (mode === 's3') {
    await publishToS3(archivePath, manifestPath, channel)
  } else if (mode === 'server') {
    await publishToServer(archivePath, manifestPath, channel)
  } else {
    throw new Error(`Unsupported OTA_PUBLISH_MODE: ${mode}`)
  }
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
