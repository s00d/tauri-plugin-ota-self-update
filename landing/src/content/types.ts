export type SitePageKey =
  | 'home'
  | 'install'
  | 'run'
  | 'publish'
  | 'action'
  | 'server'
  | 'troubleshooting'

export interface SitePageContent {
  title: string
  description: string
  bullets: string[]
}

export interface SiteContent {
  brand: string
  nav: Record<SitePageKey, string>
  cta: string
  pages: Record<SitePageKey, SitePageContent>
}
