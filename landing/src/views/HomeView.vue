<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { normalizeLocale } from '../content/locales'
import { getSiteContent } from '../content/loadSiteContent'

const route = useRoute()
const locale = computed(() => normalizeLocale(String(route.params.locale || 'en')))
const content = computed(() => getSiteContent(locale.value))

const docsPath = computed(() => (locale.value === 'ru' ? '/ru/docs' : '/docs'))
</script>

<template>
  <section class="space-y-8">
    <div class="card space-y-5">
      <p class="text-xs uppercase tracking-[0.2em] text-[#9db1ff]">{{ content.marketing.badge }}</p>
      <h1 class="text-4xl font-semibold leading-tight">{{ content.marketing.title }}</h1>
      <p class="max-w-4xl text-base leading-8 text-[#c8d3ff]">{{ content.marketing.subtitle }}</p>
      <div class="flex flex-wrap gap-3 pt-2">
        <RouterLink :to="docsPath" class="rounded border border-[#31407a] bg-[#1a2753] px-4 py-2 text-sm hover:bg-[#22316a]">
          {{ content.marketing.primaryCta }}
        </RouterLink>
        <a href="https://github.com/s00d/tauri-plugin-ota-self-update" class="rounded border border-[#31407a] px-4 py-2 text-sm hover:bg-[#1a2753]">
          {{ content.marketing.secondaryCta }}
        </a>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <div class="card">
        <h2 class="mb-3 text-xl font-semibold">Key highlights</h2>
        <ul class="list-disc space-y-2 pl-5 text-sm text-[#dce3ff]">
          <li v-for="line in content.marketing.highlights" :key="line">{{ line }}</li>
        </ul>
      </div>
      <div class="space-y-4">
        <article v-for="feature in content.marketing.features" :key="feature.title" class="card">
          <h3 class="text-base font-semibold">{{ feature.title }}</h3>
          <p class="mt-2 text-sm text-[#c8d3ff]">{{ feature.description }}</p>
        </article>
      </div>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <article class="card space-y-2">
        <h3 class="text-base font-semibold">Problem / Solution</h3>
        <p class="text-sm text-[#c8d3ff]">
          Teams need to ship frontend fixes quickly without re-submitting desktop/mobile binaries. This project delivers signed OTA bundles with strict channel policy and controlled rollout.
        </p>
      </article>
      <article class="card space-y-2">
        <h3 class="text-base font-semibold">Architecture at a glance</h3>
        <p class="text-sm text-[#c8d3ff]">
          Rust runtime handles check/apply/signature validation, JS API exposes UX-friendly commands, publisher action uploads manifests/artifacts, and server/dashboard manages lifecycle operations.
        </p>
      </article>
      <article class="card space-y-2">
        <h3 class="text-base font-semibold">Trust and security</h3>
        <p class="text-sm text-[#c8d3ff]">
          Signed manifests, token-based admin APIs, release status gates, and channel isolation reduce operational risk. Draft-first publishing plus revoke flow enables safe rollback.
        </p>
      </article>
      <article class="card space-y-2">
        <h3 class="text-base font-semibold">Migration to deep docs</h3>
        <p class="text-sm text-[#c8d3ff]">
          Use the docs tree for setup, CI pipelines, server operations, troubleshooting runbooks, and production recipes with EN/RU parity.
        </p>
        <RouterLink
          :to="docsPath"
          class="inline-flex rounded border border-[#31407a] bg-[#1a2753] px-3 py-1.5 text-xs hover:bg-[#22316a]"
        >
          Open docs tree
        </RouterLink>
      </article>
    </div>
  </section>
</template>
