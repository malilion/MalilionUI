<script setup lang="ts">
import { computed, type Component } from 'vue'
import ApiTables from '../components/ApiTables.vue'
import CodeBlock from '../components/CodeBlock.vue'
import DemoBlock from '../components/DemoBlock.vue'
import PageHeader from '../components/PageHeader.vue'
import { groups, type PageDef } from '../registry'
import { framework } from '../framework'
import { reactProse, reactUsage } from '../react-docs'
import { reactSetups } from '../react-pages'
import reactApi from 'virtual:react-api'
import reactExamples from 'virtual:react-examples'

const props = defineProps<{ page: PageDef }>()

// Each example is imported twice: once to render it, once as raw text to show and copy.
const modules = import.meta.glob<{ default: Component }>('../examples/**/*.vue', { eager: true })
const sources = import.meta.glob<string>('../examples/**/*.vue', { eager: true, query: '?raw', import: 'default' })

const examples = computed(() =>
  (props.page.examples ?? []).map((example) => {
    const path = `../examples/${example.file}.vue`
    return { ...example, component: modules[path].default, source: sources[path] }
  }),
)

const reactComponents = new Set(reactApi.components)
const isReact = computed(() => framework.value === 'react')
const usage = computed(() => (props.page.usage && isReact.value ? reactUsage(props.page.usage, reactComponents) : props.page.usage))
const setup = computed(() => (isReact.value ? reactSetups[props.page.id] : props.page.setup))

const groupLabel = computed(() => {
  const group = groups.find((g) => g.id === props.page.group)
  return group ? `${group.en} / ${group.label}` : ''
})
</script>

<template>
  <article>
    <PageHeader
      :eyebrow="groupLabel"
      :title="page.title"
      :zh="page.zh"
      :desc="isReact ? reactProse(page.desc, reactComponents) : page.desc"
      :is-new="page.isNew"
    >
      <CodeBlock v-if="usage" :code="usage" lang="ts" filename="import" />
    </PageHeader>

    <section v-if="setup" class="setup">
      <h2 class="setup__title">{{ setup.title }}</h2>
      <CodeBlock :code="setup.code" :filename="setup.filename" :lang="setup.lang ?? 'vue'" />
    </section>

    <DemoBlock
      v-for="example in examples"
      :key="example.file"
      :title="example.title"
      :desc="isReact && example.desc ? reactProse(example.desc, reactComponents) : example.desc"
      :file="example.file"
      :component="example.component"
      :source="example.source"
      :block="example.block"
      :react="isReact ? (reactExamples[example.file] ?? null) : undefined"
    />

    <ApiTables v-if="page.api" :api="page.api" :react="isReact ? reactApi : undefined" />
  </article>
</template>

<style scoped>
.setup {
  margin-top: 36px;
}

.setup__title {
  margin: 0 0 12px;
  font-family: var(--ml-font-display);
  font-size: var(--ml-text-lg);
}
</style>
