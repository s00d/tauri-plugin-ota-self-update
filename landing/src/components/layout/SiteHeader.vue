<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { loadSiteContent } from '../../content/loadSiteContent'
import { normalizeLocale, type SiteLocale } from '../../content/locales'

const props = defineProps<{ locale: SiteLocale }>()
const route = useRoute()
const locale = computed(() => normalizeLocale(props.locale))

const content = await loadSiteContent(locale.value)
const localePath = (path: string, targetLocale: SiteLocale) => {
  if (targetLocale === 'en') {
    return path.replace(/^\/(ru)(?=\/|$)/, '') || '/'
  }
  return path === '/' ? '/ru' : `/ru${path}`
}
</script>

<template>
  <header class="border-b border-[#26315f] bg-[#131a34]/90 backdrop-blur">
    <div class="container flex flex-wrap items-center justify-between gap-3 py-4">
      <div class="font-semibold">{{ content.brand }}</div>
      <nav class="flex flex-wrap gap-2 text-sm">
        <RouterLink v-for="(label, key) in content.nav" :key="key" :to="key === 'home' ? (locale === 'ru' ? '/ru' : '/') : `${locale === 'ru' ? '/ru' : ''}/${key}`" class="rounded px-2 py-1 hover:bg-[#1a2753]">
          {{ label }}
        </RouterLink>
      </nav>
      <div class="flex gap-2">
        <a :href="localePath(route.path, 'en')" class="rounded border border-[#31407a] px-2 py-1 text-xs">EN</a>
        <a :href="localePath(route.path, 'ru')" class="rounded border border-[#31407a] px-2 py-1 text-xs">RU</a>
      </div>
    </div>
  </header>
</template>
