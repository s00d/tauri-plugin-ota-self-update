<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { getSiteContent } from '../content/loadSiteContent'
import { normalizeLocale } from '../content/locales'
import type { SitePageKey } from '../content/types'

const route = useRoute()
const locale = computed(() => normalizeLocale(String(route.params.locale || 'en')))
const content = computed(() => getSiteContent(locale.value))
const pageKey = computed(() => (route.meta.pageKey as SitePageKey) || 'home')
const page = computed(() => content.value.pages[pageKey.value])
</script>

<template>
  <section class="card space-y-4">
    <h1 class="text-2xl font-semibold">{{ page.title }}</h1>
    <p class="text-sm leading-7 text-[#c8d3ff]">{{ page.description }}</p>
    <ul class="list-disc space-y-2 pl-5 text-sm text-[#dce3ff]">
      <li v-for="point in page.bullets" :key="point">{{ point }}</li>
    </ul>
    <a href="https://github.com/s00d/tauri-plugin-ota-self-update" class="inline-flex rounded border border-[#31407a] px-3 py-2 text-sm hover:bg-[#1a2753]">{{ content.cta }}</a>
  </section>
</template>
