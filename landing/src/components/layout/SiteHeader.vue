<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { getSiteContent } from '../../content/loadSiteContent'
import { normalizeLocale } from '../../content/locales'
import type { SiteLocale } from '../../content/types'

const props = defineProps<{ locale: SiteLocale }>()
const route = useRoute()

const locale = computed(() => normalizeLocale(props.locale))
const content = computed(() => getSiteContent(locale.value))

const docsPath = computed(() => (locale.value === 'ru' ? '/ru/docs' : '/docs'))
const homePath = computed(() => (locale.value === 'ru' ? '/ru' : '/'))

const localeRoute = (targetLocale: SiteLocale) => {
  const slug = typeof route.params.slug === 'string' ? route.params.slug : undefined
  const isDocsRoute = route.name === 'docs' || String(route.path).includes('/docs')

  if (isDocsRoute) {
    if (targetLocale === 'ru') return slug ? `/ru/docs/${slug}` : '/ru/docs'
    return slug ? `/docs/${slug}` : '/docs'
  }

  return targetLocale === 'ru' ? '/ru' : '/'
}
</script>

<template>
  <header class="site-header">
    <div class="container flex flex-wrap items-center justify-between gap-3 py-4">
      <div class="font-semibold tracking-tight">{{ content.brand }}</div>
      <nav class="flex flex-wrap gap-2 text-sm">
        <RouterLink :to="homePath" class="site-nav-link">{{ content.navHome }}</RouterLink>
        <RouterLink :to="docsPath" class="site-nav-link">{{ content.navDocs }}</RouterLink>
      </nav>
      <div class="flex gap-2">
        <RouterLink :to="localeRoute('en')" class="site-locale-btn">EN</RouterLink>
        <RouterLink :to="localeRoute('ru')" class="site-locale-btn">RU</RouterLink>
      </div>
    </div>
  </header>
</template>
