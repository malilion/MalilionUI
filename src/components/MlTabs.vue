<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, reactive, ref, useId, watch } from 'vue'
import type { MlTabItem } from '../types'

const props = withDefaults(
  defineProps<{
    items: MlTabItem[]
    variant?: 'line' | 'plate'
    /** Accessible name for the tab list. */
    label?: string
  }>(),
  { variant: 'line' },
)

const model = defineModel<string>()
if (model.value === undefined) {
  model.value = props.items.find((item) => !item.disabled)?.value
}

const baseId = `ml-tabs-${useId()}`
const tabId = (value: string) => `${baseId}-tab-${value}`
const panelId = (value: string) => `${baseId}-panel-${value}`

const list = ref<HTMLElement>()
const tabEls = new Map<string, HTMLElement>()
const ink = reactive({ x: 0, width: 0, ready: false })

function setTabEl(value: string, el: unknown) {
  if (el instanceof HTMLElement) tabEls.set(value, el)
  else tabEls.delete(value)
}

function measure() {
  const el = model.value ? tabEls.get(model.value) : undefined
  if (!el) return
  ink.x = el.offsetLeft
  ink.width = el.offsetWidth
  ink.ready = true
}

function select(item: MlTabItem) {
  if (item.disabled) return
  model.value = item.value
}

// Roving focus with automatic activation, per the WAI-ARIA tabs pattern.
function onKeydown(event: KeyboardEvent) {
  const enabled = props.items.filter((item) => !item.disabled)
  const current = enabled.findIndex((item) => item.value === model.value)
  let next = -1
  if (event.key === 'ArrowRight') next = (current + 1) % enabled.length
  else if (event.key === 'ArrowLeft') next = (current - 1 + enabled.length) % enabled.length
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = enabled.length - 1
  if (next < 0) return
  event.preventDefault()
  const target = enabled[next]
  model.value = target.value
  tabEls.get(target.value)?.focus()
}

let observer: ResizeObserver | undefined

onMounted(() => {
  measure()
  if (typeof ResizeObserver !== 'undefined' && list.value) {
    observer = new ResizeObserver(measure)
    observer.observe(list.value)
  }
  // Web fonts can change tab widths after first paint.
  document.fonts?.ready.then(measure)
})

onBeforeUnmount(() => observer?.disconnect())

watch(model, () => nextTick(measure))
watch(() => props.items, () => nextTick(measure), { deep: true })
</script>

<template>
  <div :class="['ml-tabs', `ml-tabs--${variant}`]">
    <div ref="list" role="tablist" class="ml-tabs__list" :aria-label="label">
      <button
        v-for="item in items"
        :id="tabId(item.value)"
        :key="item.value"
        :ref="(el) => setTabEl(item.value, el)"
        type="button"
        role="tab"
        class="ml-tabs__tab"
        :aria-selected="item.value === model"
        :aria-controls="panelId(item.value)"
        :tabindex="item.value === model ? 0 : -1"
        :disabled="item.disabled"
        @click="select(item)"
        @keydown="onKeydown"
      >
        <slot name="tab" :item="item" :active="item.value === model">{{ item.label }}</slot>
      </button>
      <span
        v-show="ink.ready"
        class="ml-tabs__ink"
        aria-hidden="true"
        :style="{ width: `${ink.width}px`, transform: `translateX(${ink.x}px)` }"
      />
    </div>
    <template v-for="item in items" :key="item.value">
      <div
        v-if="$slots[item.value]"
        v-show="item.value === model"
        :id="panelId(item.value)"
        role="tabpanel"
        class="ml-tabs__panel"
        tabindex="0"
        :aria-labelledby="tabId(item.value)"
      >
        <slot :name="item.value" />
      </div>
    </template>
  </div>
</template>
