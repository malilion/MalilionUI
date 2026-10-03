<script setup lang="ts">
import { ref, type Component } from 'vue'
import CodeBlock from './CodeBlock.vue'

const props = defineProps<{
  title: string
  desc?: string
  file: string
  component: Component
  source: string
  /** Full-width stage instead of a wrapping row. */
  block?: boolean
}>()

const codeOpen = ref(false)

// Anything the demo itself responds to keeps working; only clicks on the
// stage's "dead" space (or on static content) open the code.
const INTERACTIVE =
  'a, button, input, select, textarea, label, summary, video, audio, [role], [tabindex], [contenteditable]'

function onStageClick(event: MouseEvent) {
  const target = event.target as Element
  if (target.closest(INTERACTIVE)) return
  if (window.getSelection()?.toString()) return
  codeOpen.value = true
}
</script>

<template>
  <section class="demo">
    <header class="demo__head">
      <div class="demo__heading">
        <h3 class="demo__title">{{ title }}</h3>
        <p v-if="desc" class="demo__desc">{{ desc }}</p>
      </div>
      <MlButton variant="ghost" size="sm" aria-haspopup="dialog" @click="codeOpen = true">
        <template #prefix>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 6l-6 6 6 6M16 6l6 6-6 6" />
          </svg>
        </template>
        程式碼
      </MlButton>
    </header>
    <div
      :class="['demo__stage', { 'demo__stage--block': block }]"
      title="點擊查看程式碼"
      @click="onStageClick"
    >
      <component :is="component" />
      <span class="demo__hint" aria-hidden="true">&lt;/&gt; 點擊查看程式碼</span>
    </div>

    <MlModal v-model:open="codeOpen" eyebrow="Source" :title="props.title" :width="820">
      <CodeBlock :code="source" :filename="`${file}.vue`" />
    </MlModal>
  </section>
</template>

<style scoped>
.demo {
  margin-top: 36px;
}

.demo__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.demo__heading {
  min-width: 0;
}

.demo__title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-family: var(--ml-font-display);
  font-size: var(--ml-text-lg);
  font-weight: 700;
}

.demo__title::before {
  content: '';
  width: 10px;
  height: 10px;
  background: var(--ml-metal-gold);
  clip-path: polygon(30% 0, 100% 0, 100% 70%, 70% 100%, 0 100%, 0 30%);
}

.demo__desc {
  margin: 6px 0 0;
  color: var(--ml-text-muted);
  font-size: var(--ml-text-sm);
}

.demo__stage {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  padding: 28px 24px;
  background: var(--ml-brushed), var(--ml-surface);
  box-shadow: inset 0 0 0 1px var(--ml-line);
  position: relative;
  cursor: pointer;
  transition: box-shadow var(--ml-dur) ease;
}

.demo__stage:hover {
  box-shadow: inset 0 0 0 1px var(--ml-accent);
}

.demo__hint {
  position: absolute;
  right: 8px;
  bottom: 6px;
  color: var(--ml-text-dim);
  font-family: var(--ml-font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.08em;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--ml-dur) ease;
}

.demo__stage:hover .demo__hint {
  opacity: 1;
}

.demo__stage--block {
  display: block;
}
</style>
