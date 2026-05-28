<script setup lang="ts">
import { computed, ref } from 'vue'
import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import json from 'highlight.js/lib/languages/json'
import rust from 'highlight.js/lib/languages/rust'
import shell from 'highlight.js/lib/languages/shell'
import typescript from 'highlight.js/lib/languages/typescript'
import yaml from 'highlight.js/lib/languages/yaml'

hljs.registerLanguage('bash', bash)
hljs.registerLanguage('sh', shell)
hljs.registerLanguage('json', json)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('yml', yaml)
hljs.registerLanguage('ts', typescript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('rust', rust)
hljs.registerLanguage('rs', rust)

const props = defineProps<{
  title?: string
  language: string
  value: string
}>()

const copied = ref(false)
const wrap = ref(false)

const highlighted = computed(() => {
  const lang = props.language.toLowerCase()
  try {
    if (hljs.getLanguage(lang)) {
      return hljs.highlight(props.value, { language: lang, ignoreIllegals: true }).value
    }
  } catch {
    // fallback below
  }
  return hljs.highlightAuto(props.value).value
})

async function copyCode() {
  await navigator.clipboard.writeText(props.value)
  copied.value = true
  setTimeout(() => {
    copied.value = false
  }, 1200)
}
</script>

<template>
  <figure class="code-frame">
    <figcaption class="code-frame-head">
      <div class="code-frame-meta">
        <span v-if="title" class="code-title">{{ title }}</span>
        <span class="code-lang">{{ language }}</span>
      </div>
      <div class="code-frame-actions">
        <button class="code-btn" type="button" @click="wrap = !wrap">{{ wrap ? 'No wrap' : 'Wrap' }}</button>
        <button class="code-btn" type="button" @click="copyCode">{{ copied ? 'Copied' : 'Copy' }}</button>
      </div>
    </figcaption>
    <pre :class="['code-scroll', { 'code-wrap': wrap }]"><code class="hljs" v-html="highlighted" /></pre>
  </figure>
</template>
