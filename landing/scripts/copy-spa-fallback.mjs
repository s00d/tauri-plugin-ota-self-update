import { copyFile, mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const dist = resolve('dist')
const locales = ['', 'ru']
const docsPages = [
  'installation',
  'quick-start',
  'channels-lifecycle',
  'activation-policy',
  'plugin-config',
  'js-rust-api',
  'publisher-modes',
  'github-action',
  'server-dashboard',
  'openapi-swagger',
  'troubleshooting',
  'recipes'
]

await copyFile(join(dist, 'index.html'), join(dist, '404.html'))

for (const locale of locales) {
  const prefix = locale ? `/${locale}` : ''

  const homeDir = join(dist, prefix)
  await mkdir(homeDir, { recursive: true })
  await copyFile(join(dist, 'index.html'), join(homeDir, 'index.html'))

  const docsDir = join(dist, prefix, 'docs')
  await mkdir(docsDir, { recursive: true })
  await copyFile(join(dist, 'index.html'), join(docsDir, 'index.html'))

  for (const slug of docsPages) {
    const slugDir = join(dist, prefix, 'docs', slug)
    await mkdir(slugDir, { recursive: true })
    await copyFile(join(dist, 'index.html'), join(slugDir, 'index.html'))
  }
}
