<script setup lang="ts">
import { computed, ref } from 'vue'
import { toast } from '@malilion/ui'
import { highlight } from '../highlight'

const props = withDefaults(
  defineProps<{
    code: string
    filename?: string
    lang?: string
    /** Show a toggle to fold the code away. */
    collapsible?: boolean
  }>(),
  { lang: 'vue' },
)

const open = ref(true)
const copied = ref(false)
const source = computed(() => props.code.trim())
const html = computed(() => highlight(source.value))
let resetTimer: ReturnType<typeof setTimeout> | undefined

async function copy() {
  try {
    await navigator.clipboard.writeText(source.value)
  } catch {
    // Clipboard API needs a secure context; fall back to a hidden textarea.
    const area = document.createElement('textarea')
    area.value = source.value
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    document.execCommand('copy')
    area.remove()
  }
  copied.value = true
  clearTimeout(resetTimer)
  resetTimer = setTimeout(() => (copied.value = false), 1600)
  toast({ message: `已複製 ${props.filename ?? '程式碼'}`, duration: 1800 })
}
</script>

<template>
  <div class="code-block">
    <div class="code-block__bar">
      <span class="code-block__file">
        <span class="code-block__lang">{{ lang }}</span>
        {{ filename }}
      </span>
      <div class="code-block__actions">
        <MlButton
          v-if="collapsible"
          variant="ghost"
          size="sm"
          :aria-expanded="open"
          @click="open = !open"
        >
          {{ open ? '收起' : '展開程式碼' }}
        </MlButton>
        <MlButton variant="outline" size="sm" stamp @click="copy">
          <template #prefix>
            <svg v-if="!copied" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M8 8h11v13H8zM5 16H4V3h11v1" />
            </svg>
            <MlPaw v-else tone="current" />
          </template>
          {{ copied ? '已複製' : '複製' }}
        </MlButton>
      </div>
    </div>
    <pre v-show="open" class="code-block__pre"><code v-html="html" /></pre>
  </div>
</template>

<style scoped>
.code-block {
  background: var(--ml-surface-inset);
  box-shadow: inset 0 0 0 1px var(--ml-line);
}

.code-block__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px 8px 14px;
  border-bottom: 1px dashed var(--ml-line);
}

.code-block__file {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  overflow: hidden;
  color: var(--ml-text-dim);
  font-family: var(--ml-font-mono);
  font-size: var(--ml-text-xs);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.code-block__lang {
  padding: 2px 6px;
  background: var(--ml-accent-soft);
  color: var(--ml-accent-text);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.625rem;
}

.code-block__actions {
  display: flex;
  gap: 6px;
  flex: none;
}

.code-block__pre {
  max-height: 520px;
  margin: 0;
  padding: 16px 18px;
  overflow: auto;
  color: var(--ml-text);
  font-family: var(--ml-font-mono);
  font-size: 0.8125rem;
  line-height: 1.7;
  tab-size: 2;
}

.code-block__pre :deep(.tok-comment) { color: var(--tok-comment); font-style: italic; }
.code-block__pre :deep(.tok-string) { color: var(--tok-string); }
.code-block__pre :deep(.tok-tag) { color: var(--tok-tag); }
.code-block__pre :deep(.tok-punct) { color: var(--tok-punct); }
.code-block__pre :deep(.tok-attr) { color: var(--tok-attr); }
.code-block__pre :deep(.tok-keyword) { color: var(--tok-keyword); }
.code-block__pre :deep(.tok-number) { color: var(--tok-number); }
</style>
