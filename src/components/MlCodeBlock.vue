<script setup lang="ts">
import { computed, ref } from 'vue'
import MlButton from './MlButton.vue'
import MlPaw from './MlPaw.vue'
import { highlightLines } from '../highlight'
import { toast } from '../toast'
import { copyText } from '../clipboard'
import { useLocale } from '../locale'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    code: string
    /** Shown as a badge in the bar, e.g. "vue", "ts", "bash". */
    lang?: string
    filename?: string
    /** Line numbers in the gutter. */
    lineNumbers?: boolean
    /** 1-based line numbers to light up. */
    highlight?: number[]
    /** Scroll inside this height (px number or CSS length). */
    maxHeight?: number | string
    /** A toggle in the bar that folds the code away. */
    collapsible?: boolean
    /** Start folded (with collapsible). */
    collapsed?: boolean
    /** Show the copy button. */
    copyable?: boolean
    /** Plain text: skip syntax colouring. */
    plain?: boolean
    /** Pop a toast after copying. */
    toastOnCopy?: boolean
  }>(),
  { lang: 'ts', copyable: true, toastOnCopy: false },
)

const emit = defineEmits<{ copy: [code: string] }>()

const open = ref(!props.collapsed)
const copied = ref(false)
const source = computed(() => props.code.replace(/^\n+|\s+$/g, ''))
const lines = computed(() =>
  props.plain
    ? source.value.split('\n').map((l) => l.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'))
    : highlightLines(source.value, props.lang),
)
const marked = computed(() => new Set(props.highlight ?? []))
let resetTimer: ReturnType<typeof setTimeout> | undefined

async function copy() {
  // Clipboard API first, hidden-textarea fallback for non-secure contexts.
  if (!(await copyText(source.value))) return
  copied.value = true
  clearTimeout(resetTimer)
  resetTimer = setTimeout(() => (copied.value = false), 1600)
  emit('copy', source.value)
  if (props.toastOnCopy) toast({ message: loc.value.code.copiedToast(props.filename), duration: 1800 })
}

defineExpose({ copy })
</script>

<template>
  <div :class="['ml-code', { 'ml-code--numbers': lineNumbers }]">
    <div v-if="filename || lang || copyable || collapsible" class="ml-code__bar">
      <span class="ml-code__file">
        <span v-if="lang" class="ml-code__lang">{{ lang }}</span>
        {{ filename }}
      </span>
      <div class="ml-code__actions">
        <slot name="actions" />
        <MlButton v-if="collapsible" variant="ghost" size="sm" :aria-expanded="open" @click="open = !open">
          {{ open ? loc.code.collapse : loc.code.expand }}
        </MlButton>
        <MlButton v-if="copyable" variant="outline" size="sm" stamp @click="copy">
          <template #prefix>
            <svg v-if="!copied" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M8 8h11v13H8zM5 16H4V3h11v1" />
            </svg>
            <MlPaw v-else tone="current" />
          </template>
          {{ copied ? loc.code.copied : loc.code.copy }}
        </MlButton>
      </div>
    </div>
    <pre
      v-show="open"
      class="ml-code__pre"
      :style="maxHeight !== undefined ? { maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight } : undefined"
      tabindex="0"
    ><code><span
      v-for="(line, i) in lines"
      :key="i"
      :class="['ml-code__line', { 'ml-code__line--hl': marked.has(i + 1) }]"
    ><span v-if="lineNumbers" class="ml-code__num" aria-hidden="true">{{ i + 1 }}</span><span class="ml-code__text" v-html="line || ' '" />
</span></code></pre>
  </div>
</template>
