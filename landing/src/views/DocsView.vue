<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import CodeBlock from '../components/docs/CodeBlock.vue'
import { normalizeLocale } from '../content/locales'
import { getSiteContent } from '../content/loadSiteContent'

const route = useRoute()
const locale = computed(() => normalizeLocale(String(route.params.locale || 'en')))
const content = computed(() => getSiteContent(locale.value))

const allPages = computed(() =>
  content.value.docs.groups.flatMap((g) =>
    g.pages.map((p) => ({ ...p, groupId: g.id, groupTitle: g.title }))
  )
)
const currentId = computed(() => String(route.params.slug || 'installation'))
const current = computed(() => allPages.value.find((p) => p.id === currentId.value) || allPages.value[0])

const docsLink = (id: string) => (locale.value === 'ru' ? `/ru/docs/${id}` : `/docs/${id}`)
const docsRoot = computed(() => (locale.value === 'ru' ? '/ru/docs' : '/docs'))
const sectionAnchor = (heading: string) =>
  heading
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '')

const toc = computed(() =>
  (current.value?.sections || []).map((section) => ({
    id: sectionAnchor(section.heading),
    heading: section.heading
  }))
)

const activeHeading = ref('')
let observer: IntersectionObserver | null = null

function bindAnchors() {
  observer?.disconnect()
  nextTick(() => {
    document.querySelectorAll<HTMLElement>('[data-doc-section-anchor="true"]').forEach((el) => observer?.observe(el))
  })
}

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting)
      if (!visible.length) return
      const top = visible.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      activeHeading.value = top.target.id
    },
    { rootMargin: '-20% 0px -65% 0px', threshold: [0, 1] }
  )
  bindAnchors()
})

watch(
  () => current.value?.id,
  () => {
    activeHeading.value = ''
    bindAnchors()
  }
)

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})
</script>

<template>
  <section class="docs-shell">
    <aside class="card h-fit space-y-4 lg:sticky lg:top-4">
      <div>
        <h2 class="text-lg font-semibold">{{ content.docs.docsTitle }}</h2>
        <p class="mt-2 text-xs text-[#9db1ff]">{{ content.docs.docsIntro }}</p>
      </div>
      <nav class="space-y-4">
        <details v-for="group in content.docs.groups" :key="group.id" class="sidebar-group space-y-2" open>
          <summary class="text-xs uppercase tracking-[0.18em] text-[#8ea2ed]">{{ group.title }}</summary>
          <div class="mt-2 space-y-1">
            <RouterLink
              v-for="page in group.pages"
              :key="page.id"
              :to="docsLink(page.id)"
              @click="window.scrollTo({ top: 0, behavior: 'auto' })"
              class="block rounded px-2 py-1 text-sm hover:bg-[#1a2753]"
              :class="page.id === current.id ? 'bg-[#1a2753] text-white' : 'text-[#dce3ff]'"
            >
              {{ page.title }}
            </RouterLink>
          </div>
        </details>
      </nav>
    </aside>

    <article class="card docs-prose space-y-6">
      <div class="text-xs text-[#9db1ff]">
        <RouterLink :to="docsRoot" class="hover:underline">{{ content.docs.docsTitle }}</RouterLink>
        <span> / {{ current.groupTitle }} / {{ current.title }}</span>
      </div>

      <header class="space-y-2">
        <h1 class="text-2xl font-semibold">{{ current.title }}</h1>
        <p class="text-sm leading-7 text-[#c8d3ff]">{{ current.summary }}</p>
      </header>

      <section
        v-for="section in current.sections"
        :id="sectionAnchor(section.heading)"
        :key="section.heading"
        data-doc-section-anchor="true"
        class="space-y-3 border-t border-[#26315f] pt-4"
      >
        <h2 class="text-lg font-semibold">{{ section.heading }}</h2>
        <p v-for="paragraph in section.body" :key="paragraph" class="text-sm leading-7 text-[#dce3ff]">{{ paragraph }}</p>
        <ul v-if="section.bullets?.length" class="list-disc space-y-1 pl-5 text-sm text-[#dce3ff]">
          <li v-for="bullet in section.bullets" :key="bullet">{{ bullet }}</li>
        </ul>
        <div v-if="section.checklist?.length" class="docs-checklist">
          <label v-for="item in section.checklist" :key="item" class="docs-checklist-item">
            <input type="checkbox" checked disabled />
            <span>{{ item }}</span>
          </label>
        </div>
        <div v-if="section.table" class="docs-table-wrap">
          <table class="docs-table">
            <thead>
              <tr>
                <th v-for="header in section.table.headers" :key="header">{{ header }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in section.table.rows" :key="idx">
                <td v-for="(col, colIdx) in row" :key="`${idx}-${colIdx}`">{{ col }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <CodeBlock
          v-if="section.code"
          :title="section.code.title"
          :language="section.code.language"
          :value="section.code.value"
        />
        <p
          v-if="section.note"
          class="docs-callout"
          :class="`docs-callout-${section.noteVariant || 'info'}`"
        >
          {{ section.note }}
        </p>
        <div v-if="section.faq?.length" class="space-y-2">
          <details v-for="item in section.faq" :key="item.q" class="docs-faq">
            <summary>{{ item.q }}</summary>
            <p>{{ item.a }}</p>
          </details>
        </div>
      </section>
    </article>

    <aside class="card hidden h-fit lg:block lg:sticky lg:top-4">
      <h3 class="mb-3 text-sm font-semibold">On this page</h3>
      <nav class="space-y-1">
        <a
          v-for="item in toc"
          :key="item.id"
          :href="`#${item.id}`"
          class="toc-link"
          :class="{ 'toc-link-active': activeHeading === item.id }"
        >
          {{ item.heading }}
        </a>
      </nav>
    </aside>
  </section>
</template>
