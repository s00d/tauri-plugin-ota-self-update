import type { SiteContent } from './types'

export const siteEn: SiteContent = {
  brand: 'Tauri OTA Self Update',
  navHome: 'Home',
  navDocs: 'Docs',
  marketing: {
    badge: 'Self-hosted OTA for Tauri v2',
    title: 'Ship frontend updates fast without app-store submissions',
    subtitle:
      'Production-ready Rust plugin, JS API, publish action, and self-hosted server dashboard with release lifecycle controls.',
    primaryCta: 'Read full docs',
    secondaryCta: 'Open GitHub',
    highlights: [
      'Channels with strict stable/beta separation',
      'GitHub, S3, and custom server publish targets',
      'Release lifecycle: draft -> released -> revoked',
      'Dashboard + OpenAPI + Swagger for operations'
    ],
    features: [
      {
        title: 'Rust-first runtime',
        description: 'Single runtime for desktop and mobile with explicit check/apply APIs.'
      },
      {
        title: 'Flexible delivery',
        description: 'Use GitHub Releases, S3-compatible buckets, or your own token-protected server.'
      },
      {
        title: 'Operations visibility',
        description: 'Manage releases from dashboard and inspect API behavior through Swagger docs.'
      }
    ]
  },
  docs: {
    docsTitle: 'Documentation',
    docsIntro:
      'Tree-structured production documentation covering architecture, API usage, publishing, CI/CD, server operations, and troubleshooting.',
    groups: [
      {
        id: 'getting-started',
        title: 'Getting Started',
        pages: [
          {
            id: 'installation',
            title: 'Installation',
            summary: 'Automatic and manual installation flows for Rust + JavaScript packages.',
            sections: [
              {
                heading: 'Automatic installation (recommended)',
                body: [
                  'Run from your Tauri app root where package.json and tauri script are defined.'
                ],
                code: {
                  language: 'bash',
                  value: 'pnpm run tauri add ota-self-update'
                }
              },
              {
                heading: 'Manual installation',
                body: [
                  'Add Rust crate and JavaScript API package, then initialize plugin in builder setup.'
                ],
                bullets: [
                  'Cargo.toml: tauri-plugin-ota-self-update = "0.1"',
                  'Frontend package: tauri-plugin-ota-self-update-api',
                  'Use init(...) and register plugin before run(context)'
                ]
              },
              {
                heading: 'Toolchain baseline',
                body: ['Use pinned tool versions to keep local and CI behavior identical.'],
                table: {
                  headers: ['Component', 'Recommended'],
                  rows: [
                    ['Node.js', '20+'],
                    ['pnpm', '9.15.9+'],
                    ['Rust', 'stable'],
                    ['Tauri', 'v2']
                  ]
                }
              },
              {
                heading: 'Platform prerequisites',
                body: ['Install platform-native dependencies before validating OTA integration.'],
                bullets: [
                  'Linux: glib/gobject/pkg-config packages for CI',
                  'Windows: app runtime prerequisites',
                  'macOS: Xcode command line tools',
                  'Mobile targets: Android SDK / Xcode setup when app builds are part of validation'
                ]
              },
              {
                heading: 'Rust wiring snippet',
                body: ['Initialize plugin before app run(context).'],
                code: {
                  language: 'rust',
                  value:
                    'tauri::Builder::default()\n  .plugin(tauri_plugin_ota_self_update::init(config))\n  .run(tauri::generate_context!())\n  .expect("error while running tauri app");'
                }
              },
              {
                heading: 'Frontend wiring snippet',
                body: ['Call channel selection and check/apply in app startup or settings flow.'],
                code: {
                  language: 'ts',
                  value:
                    'import { check, setChannel } from "tauri-plugin-ota-self-update-api";\n\nawait setChannel("stable");\nconst update = await check();\nif (update) await update.apply();'
                }
              },
              {
                heading: 'Installation verification',
                body: ['Validate connectivity, keys, and initial update check contract.'],
                checklist: ['baseUrl returns manifest', 'pubkey matches signer keypair', 'client check runs without runtime error']
              },
              {
                heading: 'Common installation anti-patterns',
                body: ['Incomplete Rust/frontend wiring is the most common source of failure.'],
                bullets: [
                  'JS package installed but Rust plugin not initialized',
                  'HTTP baseUrl in production instead of HTTPS',
                  'Mixing prerelease artifacts with stable clients'
                ]
              }
            ]
          },
          {
            id: 'quick-start',
            title: 'Quick Start',
            summary: 'Minimal check/apply flow with channel selection and reload behavior.',
            sections: [
              {
                heading: 'Frontend check/apply flow',
                body: [
                  'Use stable channel by default and apply update when available.'
                ],
                code: {
                  language: 'ts',
                  value:
                    'import { check, setChannel } from "tauri-plugin-ota-self-update-api";\n\nawait setChannel("stable");\nconst update = await check();\nif (update) {\n  const result = await update.apply();\n  if (result.status === "appliedNow") location.reload();\n}'
                }
              },
              {
                heading: 'Periodic auto-check',
                body: ['Schedule checks at startup and interval in your app shell.'],
                bullets: ['Run once on app boot', 'Repeat every 15-30 minutes', 'Handle errors silently with logging']
              },
              {
                heading: 'Run local example',
                body: ['Use bundled example app for full flow validation.'],
                code: {
                  language: 'bash',
                  value: 'pnpm run example:dev'
                }
              },
              {
                heading: 'Start local OTA server',
                body: ['Run token-protected server for self-host rehearsal.'],
                code: {
                  language: 'bash',
                  value: 'OTA_SERVER_TOKEN=dev-token pnpm run server:start'
                }
              },
              {
                heading: 'First publish command',
                body: ['Publish first stable OTA bundle to selected provider.'],
                code: {
                  language: 'bash',
                  value:
                    'OTA_PUBLISH_MODE=server OTA_CHANNEL=stable OTA_VERSION=0.2.1 OTA_BASE_URL=http://localhost:9033 OTA_SERVER_TOKEN=dev-token pnpm run ota:publish'
                }
              },
              {
                heading: 'Update flow validation',
                body: ['Install older app build, run check, and observe discovered version + apply status.'],
                checklist: ['current version shown in UI', 'newer version discovered', 'apply() returns expected status']
              },
              {
                heading: 'Expected logs',
                body: ['Keep deterministic logs for local and CI smoke checks.'],
                code: {
                  language: 'text',
                  value: 'check: found update 0.2.1\napply: status=appliedNow\nactivation: softReload -> location.reload()'
                }
              },
              {
                heading: 'Silent startup recipe',
                body: ['Apply updates during app startup with graceful error handling.'],
                code: {
                  language: 'ts',
                  value:
                    'async function silentOtaBoot() {\n  try {\n    const update = await check();\n    if (!update) return;\n    const result = await update.apply();\n    if (result.status === "appliedNow") location.reload();\n  } catch (e) {\n    console.warn("OTA silent check failed", e);\n  }\n}'
                }
              }
            ]
          }
        ]
      },
      {
        id: 'core-concepts',
        title: 'Core Concepts',
        pages: [
          {
            id: 'channels-lifecycle',
            title: 'Channels and Release Lifecycle',
            summary: 'How stable/beta channels and release statuses influence update selection.',
            sections: [
              {
                heading: 'Channel rules',
                body: [
                  'stable clients consume released non-prerelease entries, beta clients consume released prerelease entries.'
                ],
                bullets: [
                  'release -> release only',
                  'pre-release -> pre-release only',
                  'cross-track upgrades are rejected by runtime'
                ]
              },
              {
                heading: 'Release statuses',
                body: ['releases.json supports draft/released/revoked status lifecycle.'],
                bullets: [
                  'draft: visible to operators, ignored by clients',
                  'released: eligible for client update checks',
                  'revoked: excluded from future checks'
                ]
              },
              {
                heading: 'Prerelease constraints',
                body: ['Runtime blocks cross-track transitions to avoid unstable channel bleed.'],
                bullets: ['release -> release only', 'pre-release -> pre-release only', 'track mismatch is rejected']
              },
              {
                heading: 'Promotion beta -> stable',
                body: ['Promote only validated version after beta soak and telemetry check.'],
                checklist: ['beta checks pass', 'no blocker regressions', 'stable manifest updated']
              },
              {
                heading: 'Rollback runbook',
                body: ['If incident happens, revoke broken release and publish fixed replacement in same track.'],
                code: {
                  language: 'bash',
                  value: 'POST /api/releases/:channel/:version/revoke'
                }
              },
              {
                heading: 'Lifecycle governance',
                body: ['Treat release status changes as controlled operational transitions.'],
                table: {
                  headers: ['Status', 'Client visibility', 'Operator intent'],
                  rows: [
                    ['draft', 'no', 'validate'],
                    ['released', 'yes', 'rollout'],
                    ['revoked', 'no', 'incident stop']
                  ]
                }
              }
            ]
          },
          {
            id: 'activation-policy',
            title: 'Activation Policy',
            summary: 'nextLaunch vs softReload behavior when apply() finishes.',
            sections: [
              {
                heading: 'nextLaunch',
                body: ['Assets are prepared and activated on next app start (pending restart status).']
              },
              {
                heading: 'softReload',
                body: ['Assets are applied immediately and app can reload to pick new bundle now.']
              }
            ]
          }
        ]
      },
      {
        id: 'api-config',
        title: 'Configuration and APIs',
        pages: [
          {
            id: 'plugin-config',
            title: 'Plugin Configuration Reference',
            summary: 'Field-level meaning for baseUrl, pubkey, channel, headers, timeout, activation policy.',
            sections: [
              {
                heading: 'Config fields',
                body: ['Use baseUrl to point to GitHub repo root, S3/CDN URL, or custom server endpoint.'],
                bullets: [
                  'pubkey: minisign public key (base64)',
                  'requestHeaders: optional custom headers',
                  'timeoutSecs: network timeout',
                  'activationPolicy: nextLaunch or softReload'
                ]
              }
            ]
          },
          {
            id: 'js-rust-api',
            title: 'JavaScript and Rust APIs',
            summary: 'Detailed usage of JS methods and Rust extension trait integration.',
            sections: [
              {
                heading: 'JavaScript API',
                body: ['Methods: setChannel, check, checkWithMeta, Update.apply.'],
                bullets: [
                  'check returns null when no update available',
                  'apply returns status and resolved version',
                  'checkWithMeta returns debug-friendly manifest info'
                ]
              },
              {
                heading: 'Rust-side extension',
                body: ['Call app.ota_self_update() from commands/plugins to orchestrate updates from Rust.']
              }
            ]
          }
        ]
      },
      {
        id: 'publishing-cicd',
        title: 'Publishing and CI/CD',
        pages: [
          {
            id: 'publisher-modes',
            title: 'Publisher Modes (GitHub / S3 / Server)',
            summary: 'Environment matrix and release_status semantics for each mode.',
            sections: [
              {
                heading: 'Publisher environment keys',
                body: ['Select mode and provide target-specific credentials/tokens.'],
                bullets: [
                  'OTA_PUBLISH_MODE, OTA_VERSION, OTA_CHANNEL',
                  'GitHub: OTA_TARGET_REPO + token',
                  'S3: OTA_S3_BUCKET + AWS credentials',
                  'Server: OTA_BASE_URL + OTA_SERVER_TOKEN'
                ]
              },
              {
                heading: 'release_status workflow',
                body: ['Publish as draft first, validate, then confirm from dashboard to go live.']
              },
              {
                heading: 'GitHub mode checklist',
                body: ['Publishes manifests and bundles as release assets in target repository.'],
                checklist: ['release exists', 'token has release permissions', 'stable.json or beta.json uploaded']
              },
              {
                heading: 'S3 mode checklist',
                body: ['Stores release files in bucket path with release index metadata.'],
                checklist: ['bucket write permissions', 'index file writable', 'public read path aligned with baseUrl']
              },
              {
                heading: 'Server mode checklist',
                body: ['Uploads to self-hosted OTA server with Bearer token protection.'],
                checklist: ['OTA_BASE_URL is correct', 'OTA_SERVER_TOKEN is valid', 'upload routes return 2xx']
              },
              {
                heading: 'Artifact layout',
                body: ['All publish modes rely on same core artifact set.'],
                table: {
                  headers: ['Artifact', 'Purpose'],
                  rows: [
                    ['stable.json / beta.json', 'channel manifest'],
                    ['bundle.tar.gz', 'web assets archive'],
                    ['bundle.tar.gz.minisig', 'signature verification']
                  ]
                }
              },
              {
                heading: 'Command template',
                body: ['Keep core env values stable and only switch target-specific keys.'],
                code: {
                  language: 'bash',
                  value:
                    'OTA_PUBLISH_MODE=github|s3|server\nOTA_VERSION=0.2.1\nOTA_CHANNEL=stable|beta\nOTA_RELEASE_STATUS=draft|released|revoked'
                }
              },
              {
                heading: 'Client-side validation after publish',
                body: ['Always verify from app client perspective after upload completes.'],
                checklist: ['manifest URL returns 200', 'signature file exists', 'client discovers published version']
              }
            ]
          },
          {
            id: 'github-action',
            title: 'GitHub Action Reference',
            summary: 'All action inputs, release flow patterns, and tag strategy.',
            sections: [
              {
                heading: 'Recommended pipeline',
                body: [
                  'Build app binaries with tauri-action and publish OTA assets with tauri-plugin-ota-self-update action in same workflow.'
                ],
                bullets: [
                  'Use workflow_dispatch for controlled releases',
                  'Use v* tags for versioned runs',
                  'Use dry_run for wiring validation'
                ]
              },
              {
                heading: 'Input reference',
                body: ['Treat inputs as immutable CI contract between build and publish stages.'],
                table: {
                  headers: ['Input', 'Role'],
                  rows: [
                    ['target', 'publish provider mode'],
                    ['version', 'OTA version'],
                    ['channel', 'stable or beta'],
                    ['release_status', 'draft/released/revoked']
                  ]
                }
              },
              {
                heading: 'Dry-run snippet',
                body: ['Use for wiring validation before first real release.'],
                code: {
                  language: 'yaml',
                  value: 'with:\n  dry_run: true\n  channel: stable\n  release_status: draft'
                }
              },
              {
                heading: 'Release snippet',
                body: ['Flip dry_run off only after smoke checks pass.'],
                code: {
                  language: 'yaml',
                  value: 'with:\n  dry_run: false\n  release_status: released'
                }
              },
              {
                heading: 'Tag strategy',
                body: ['Use semantic tags for deterministic versioned releases and traceable rollbacks.']
              },
              {
                heading: 'CI matrix pitfalls',
                body: ['Most failures come from missing system dependencies or version drift.'],
                bullets: [
                  'Linux: glib/pkg-config packages missing',
                  'Windows: runtime/signing environment mismatch',
                  'macOS: Xcode/notarization prerequisites missing'
                ]
              },
              {
                heading: 'CI security notes',
                body: ['Apply least privilege and avoid secret exposure in logs.'],
                checklist: ['scoped tokens', 'masked variables', 'no debug echo of auth headers']
              }
            ]
          }
        ]
      },
      {
        id: 'server-ops',
        title: 'Self-hosted Server and Ops',
        pages: [
          {
            id: 'server-dashboard',
            title: 'Server Dashboard and Auth',
            summary: 'Token middleware, dashboard operations, and release confirmations.',
            sections: [
              {
                heading: 'Ready server is already included',
                body: [
                  'You do not need to build a server from scratch: this repository already contains a production-ready self-host OTA server on Express.',
                  'Use server/ota-server.cjs (bundle), scripts-src/ota-server.ts (source), server/Dockerfile, and server/docker-compose.yml.'
                ],
                checklist: ['Serves manifests and archives', 'Has admin dashboard', 'Has OpenAPI and Swagger', 'Has token-based protection']
              },
              {
                heading: 'Quick local run',
                body: ['Minimal local startup from this repository:'],
                code: {
                  language: 'bash',
                  value:
                    'OTA_SERVER_TOKEN=super-secret \\\nPORT=8080 \\\nOTA_DATA_DIR=.ota-server-data \\\npnpm run build:scripts && node server/ota-server.cjs'
                }
              },
              {
                heading: 'Run ready server with docker compose',
                body: ['A ready compose file is already included under server/.'],
                code: {
                  language: 'bash',
                  value: 'cd server\nOTA_SERVER_TOKEN=super-secret docker compose up -d --build'
                }
              },
              {
                heading: 'Update fetch API (client flow)',
                body: [
                  'OTA client checks updates using public GET endpoints from the server.',
                  'No token is required for read endpoints; token is required for upload/admin endpoints.'
                ],
                table: {
                  headers: ['Route', 'Purpose'],
                  rows: [
                    ['GET /manifest/:channel.json', 'Fetch channel manifest (stable/beta)'],
                    ['GET /releases.json', 'Fetch release index with statuses'],
                    ['GET /:channel/:archive', 'Download update archive'],
                    ['GET /healthz', 'Server health check']
                  ]
                }
              },
              {
                heading: 'Manual API smoke check',
                body: ['Verify the server returns OTA payloads expected by client runtime:'],
                code: {
                  language: 'bash',
                  value:
                    'curl http://127.0.0.1:8080/healthz\ncurl http://127.0.0.1:8080/manifest/stable.json\ncurl http://127.0.0.1:8080/releases.json'
                }
              },
              {
                heading: 'Run with Docker',
                body: ['Use bundled Dockerfile for server deployment without custom build scripts.'],
                code: {
                  language: 'bash',
                  value:
                    'docker build -t ota-self-update-server -f server/Dockerfile server\n\ndocker run --rm -p 8080:8080 \\\n  -e OTA_SERVER_TOKEN=super-secret \\\n  -e OTA_DATA_DIR=/data/ota \\\n  -v \"$(pwd)/.ota-server-data:/data/ota\" \\\n  ota-self-update-server'
                }
              },
              {
                heading: 'Out-of-the-box capabilities',
                body: ['The bundled server already covers end-to-end OTA operations.'],
                table: {
                  headers: ['Capability', 'Status'],
                  rows: [
                    ['Manifest and archive hosting', 'Included'],
                    ['Token auth for admin/upload routes', 'Included'],
                    ['Release management dashboard', 'Included'],
                    ['OpenAPI and Swagger', 'Included'],
                    ['draft/released/revoked lifecycle', 'Included']
                  ]
                }
              },
              {
                heading: 'Authentication model',
                body: ['All /api routes require Bearer token from OTA_SERVER_TOKEN.'],
                bullets: [
                  'No token -> only login form on dashboard',
                  'Authorized session stored in browser storage',
                  'Actions require explicit confirmation dialog'
                ]
              },
              {
                heading: 'Lifecycle controls',
                body: ['Use Confirm/Revoke/Draft/Delete to control release availability without redeploying app binaries.']
              }
            ]
          },
          {
            id: 'openapi-swagger',
            title: 'OpenAPI and Swagger',
            summary: 'Inspect API contract from raw OpenAPI and interactive Swagger UI.',
            sections: [
              {
                heading: 'Documentation endpoints',
                body: ['Use /openapi.json for machine contract and /docs for interactive exploration.']
              }
            ]
          }
        ]
      },
      {
        id: 'troubleshooting-recipes',
        title: 'Troubleshooting and Recipes',
        pages: [
          {
            id: 'troubleshooting',
            title: 'Troubleshooting',
            summary: 'Most common CI/runtime issues and verified fixes.',
            sections: [
              {
                heading: 'Linux glib/pkg-config errors',
                body: ['Install system dependencies in CI before cargo check/build.']
              },
              {
                heading: 'pnpm version mismatch',
                body: ['Align pnpm/action-setup version with packageManager field in package.json.']
              },
              {
                heading: 'Manifest asset not found',
                body: ['Ensure selected release actually contains stable.json/beta.json; runtime now selects release containing manifest asset.']
              },
              {
                heading: 'Bundle identifier error',
                body: ['Replace default com.tauri.dev identifier in Tauri config before release builds.']
              },
              {
                heading: 'Landing route/base mismatch',
                body: ['Validate router BASE_URL and SPA fallback output for GitHub Pages refresh behavior.']
              },
              {
                heading: 'Server auth failures',
                body: ['401/403 typically means invalid OTA server token or missing Authorization header.']
              },
              {
                heading: 'Version visible but not selectable',
                body: ['Validate release status, channel, and prerelease flags against client track.']
              },
              {
                heading: 'Runbook: update not appearing',
                body: ['Follow deterministic triage sequence before changing code.'],
                checklist: [
                  'Check app current version + channel',
                  'Fetch manifest directly via curl/browser',
                  'Inspect releases index status= released',
                  'Verify archive and signature URLs return 200'
                ]
              },
              {
                heading: 'Runbook: CI publish failing',
                body: ['Start from first failing job and compare effective env matrix with docs reference.'],
                checklist: [
                  'Confirm pnpm/action version alignment',
                  'Confirm Linux system packages in workflow',
                  'Confirm target provider auth permissions'
                ]
              }
            ]
          },
          {
            id: 'recipes',
            title: 'Operational Recipes',
            summary: 'Practical rollout patterns for production teams.',
            sections: [
              {
                heading: 'Staged rollout with beta channel',
                body: ['Ship beta prerelease first, validate in pilot cohort, then promote stable release.']
              },
              {
                heading: 'Tenant-aware delivery',
                body: ['Use requestHeaders and server-side routing for enterprise multi-tenant rollout controls.']
              }
            ]
          }
        ]
      }
    ]
  }
}
