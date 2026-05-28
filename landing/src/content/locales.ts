export const SUPPORTED_LOCALES = ['en', 'ru'] as const
export type SiteLocale = (typeof SUPPORTED_LOCALES)[number]

export function normalizeLocale(input?: string): SiteLocale {
  return input === 'ru' ? 'ru' : 'en'
}
