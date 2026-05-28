#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'
import axios from 'axios'
import { Octokit } from '@octokit/rest'
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import * as tar from 'tar'

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

async function publishToGitHub(archivePath: string, manifestPath: string, version: string, notes: string): Promise<void> {
  const targetRepo = required('OTA_TARGET_REPO')
  const token = env('OTA_GITHUB_TOKEN', env('GITHUB_TOKEN', env('GH_TOKEN', ''))).trim()
  if (!token) {
    throw new Error('Missing OTA_GITHUB_TOKEN (or GITHUB_TOKEN/GH_TOKEN) for github mode')
  }

  const { owner, repo } = parseRepo(targetRepo)
  const tag = env('OTA_RELEASE_TAG', '').trim() || `ota-${version}`
  const octokit = new Octokit({ auth: token })

  let releaseId: number
  try {
    const existing = await octokit.repos.getReleaseByTag({ owner, repo, tag })
    releaseId = existing.data.id
  } catch {
    const created = await octokit.repos.createRelease({
      owner,
      repo,
      tag_name: tag,
      name: tag,
      body: notes
    })
    releaseId = created.data.id
  }

  const assets = (await octokit.repos.listReleaseAssets({ owner, repo, release_id: releaseId })).data
  const targets = [basename(archivePath), basename(manifestPath)]
  for (const asset of assets) {
    if (targets.includes(asset.name)) {
      await octokit.repos.deleteReleaseAsset({ owner, repo, asset_id: asset.id })
    }
  }

  const archiveData = await readFile(archivePath)
  await octokit.repos.uploadReleaseAsset({
    owner,
    repo,
    release_id: releaseId,
    name: basename(archivePath),
    data: archiveData as unknown as string
  })

  const manifestData = await readFile(manifestPath)
  await octokit.repos.uploadReleaseAsset({
    owner,
    repo,
    release_id: releaseId,
    name: basename(manifestPath),
    data: manifestData as unknown as string
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
}

async function publishToServer(archivePath: string, manifestPath: string, channel: string): Promise<void> {
  const token = required('OTA_SERVER_TOKEN')
  const normalizedBaseUrl = required('OTA_BASE_URL').replace(/\/$/, '')
  const manifestUrl = `${normalizedBaseUrl}/manifest/${channel}.json`
  const archiveUrl = `${normalizedBaseUrl}/${channel}/${basename(archivePath)}`

  const archiveBody = await readFile(archivePath)
  await axios.put(archiveUrl, archiveBody, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/gzip'
    },
    maxBodyLength: Infinity
  })

  const manifestBody = await readFile(manifestPath)
  await axios.put(manifestUrl, manifestBody, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    maxBodyLength: Infinity
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
  const manifest: Manifest = {
    version,
    notes: env('OTA_NOTES', `OTA build ${version}`),
    pubDate: new Date().toISOString(),
    signature: env('OTA_MANIFEST_SIGNATURE', ''),
    archiveSignature: env('OTA_ARCHIVE_SIGNATURE', ''),
    archiveSha256: archiveHash,
    archiveUrl: `${baseUrl.replace(/\/$/, '')}/${channel}/${archiveName}`
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
