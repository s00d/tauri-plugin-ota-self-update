import { copyFile, mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const dist = resolve('dist')
const locales = ['', 'ru']
const pages = ['install', 'run', 'publish', 'action', 'server', 'troubleshooting']

await copyFile(join(dist, 'index.html'), join(dist, '404.html'))

for (const locale of locales) {
  const localePrefix = locale ? `/${locale}` : ''
  const indexDir = join(dist, locale)
  await mkdir(indexDir, { recursive: true })
  await copyFile(join(dist, 'index.html'), join(indexDir, 'index.html'))

  for (const page of pages) {
    const pageDir = join(dist, localePrefix, page)
    await mkdir(pageDir, { recursive: true })
    await copyFile(join(dist, 'index.html'), join(pageDir, 'index.html'))
  }
}
