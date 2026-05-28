import type { SiteContent } from './types'
import type { SiteLocale } from './locales'

const cache = new Map<SiteLocale, SiteContent>()

export async function loadSiteContent(locale: SiteLocale): Promise<SiteContent> {
  if (cache.has(locale)) {
    return cache.get(locale) as SiteContent
  }

  const mod = locale === 'ru' ? await import('./site.ru') : await import('./site.en')
  const value = locale === 'ru' ? mod.siteRu : mod.siteEn
  cache.set(locale, value)
  return value
}
