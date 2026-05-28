import type { SiteLocale } from './types'

export const SUPPORTED_LOCALES: SiteLocale[] = ['en', 'ru']

export function normalizeLocale(input?: string): SiteLocale {
  return input === 'ru' ? 'ru' : 'en'
}
