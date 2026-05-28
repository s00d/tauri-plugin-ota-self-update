import type { SiteContent } from './types'

export const siteEn: SiteContent = {
  brand: 'Tauri OTA Self Update',
  cta: 'Open GitHub',
  nav: {
    home: 'Home',
    install: 'Install',
    run: 'Run',
    publish: 'Publish',
    action: 'GitHub Action',
    server: 'Server',
    troubleshooting: 'Troubleshooting'
  },
  pages: {
    home: {
      title: 'Self-hosted OTA updates for Tauri',
      description:
        'This project provides a Rust plugin, JavaScript API, publisher action, and managed server dashboard for shipping frontend updates without app-store releases.',
      bullets: [
        'Channels: stable and beta with strict pre-release separation.',
        'Publish targets: GitHub Releases, S3, or custom HTTP server.',
        'Release lifecycle: draft, released, revoked, delete with confirmations.',
        'Built-in dashboard and Swagger UI for operations teams.'
      ]
    },
    install: {
      title: 'Installation guide',
      description: 'Install Rust crate + JavaScript API, then configure plugin in tauri.conf.json.',
      bullets: [
        'Add `tauri-plugin-ota-self-update` to Cargo.toml.',
        'Add `tauri-plugin-ota-self-update-api` to frontend package.json.',
        'Initialize plugin in Tauri builder setup.',
        'Set baseUrl/channel/pubkey/request headers in plugin config.'
      ]
    },
    run: {
      title: 'Run and test locally',
      description: 'Use the example app, local server mode, and dashboard authorization to test OTA flow end-to-end.',
      bullets: [
        'Run example via `pnpm run example:dev` from repository root.',
        'Start server via `pnpm run server:start` with OTA_SERVER_TOKEN.',
        'Publish mock assets using `pnpm run ota:publish` in server mode.',
        'Validate app version and check/apply update flow in UI.'
      ]
    },
    publish: {
      title: 'Publish updates',
      description: 'Use the bundled publisher script or reusable GitHub Action for CI/CD publishing.',
      bullets: [
        'Set `OTA_PUBLISH_MODE` to github, s3, or server.',
        'Provide `OTA_RELEASE_STATUS` as draft/released/revoked.',
        'Manifest and archive signatures are supported for production security.',
        'Release index (`releases.json`) is updated automatically.'
      ]
    },
    action: {
      title: 'GitHub Action usage',
      description: 'The composite action supports all publish modes and can run in dry-run for wiring validation.',
      bullets: [
        'Inputs include mode, version, channel, target repo, bucket, and server token.',
        'Use `release_status` to push draft releases and confirm later from dashboard.',
        'Pair with tauri-apps/tauri-action for binary release + OTA asset release.',
        'Version tags (`v*`) can trigger release workflows.'
      ]
    },
    server: {
      title: 'Self-hosted server and dashboard',
      description: 'Express-based server ships with token middleware, dashboard UI, and interactive API docs.',
      bullets: [
        'Dashboard: authorize with token, then manage release lifecycle.',
        'Swagger UI available at `/docs`, raw OpenAPI at `/openapi.json`.',
        'Docker and docker-compose setup included.',
        'API and OTA artifacts are persisted in configured data directory.'
      ]
    },
    troubleshooting: {
      title: 'Troubleshooting and CI notes',
      description: 'Common issues are documented with practical fix paths.',
      bullets: [
        'glib/pkg-config errors in CI: install Linux system libs before cargo check.',
        'pnpm mismatch in GitHub Action: align action setup with `packageManager` version.',
        'Tauri bundle identifier errors: replace default `com.tauri.dev`.',
        'Module resolution errors in example: build API package before example build.'
      ]
    }
  }
}
