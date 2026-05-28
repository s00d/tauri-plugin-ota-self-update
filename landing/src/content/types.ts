export type SiteLocale = 'en' | 'ru'

export interface MarketingFeature {
  title: string
  description: string
}

export interface MarketingContent {
  badge: string
  title: string
  subtitle: string
  primaryCta: string
  secondaryCta: string
  highlights: string[]
  features: MarketingFeature[]
}

export interface DocSection {
  heading: string
  body: string[]
  bullets?: string[]
  code?: { language: string; value: string; title?: string }
  note?: string
  noteVariant?: 'info' | 'warn' | 'error' | 'success'
  checklist?: string[]
  faq?: Array<{ q: string; a: string }>
  table?: {
    headers: string[]
    rows: string[][]
  }
}

export interface DocPage {
  id: string
  title: string
  summary: string
  sections: DocSection[]
}

export interface DocGroup {
  id: string
  title: string
  pages: DocPage[]
}

export interface SiteDocs {
  docsTitle: string
  docsIntro: string
  groups: DocGroup[]
}

export interface SiteContent {
  brand: string
  navHome: string
  navDocs: string
  marketing: MarketingContent
  docs: SiteDocs
}
