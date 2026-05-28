<script setup lang="ts">
import { computed } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import SiteHeader from './components/layout/SiteHeader.vue'
import { normalizeLocale } from './content/locales'

const route = useRoute()
const locale = computed(() => normalizeLocale(String(route.params.locale || 'en')))
</script>

<template>
  <div>
    <SiteHeader :locale="locale" />
    <main class="container py-8">
      <RouterView />
    </main>
  </div>
</template>
