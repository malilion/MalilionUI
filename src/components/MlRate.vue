<script setup lang="ts">
import { computed, ref } from 'vue'
import MlPaw from './MlPaw.vue'
import type { MlSize } from '../types'
import { useLocale } from '../locale'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    max?: number
    /** Allow half paws (0.5 steps). */
    allowHalf?: boolean
    /** Display only — not focusable, no hover. */
    readonly?: boolean
    disabled?: boolean
    /** Clicking the current value again resets to 0. */
    clearable?: boolean
    size?: MlSize
    tone?: 'gold' | 'bean' | 'tech'
    /** Text per whole value, e.g. ['很差', '普通', …]; shown beside the paws. */
    texts?: string[]
    /** Show the number beside the paws. */
    showValue?: boolean
    /** Accessible name. */
    label?: string
  }>(),
  { max: 5, size: 'md', tone: 'gold' },
)

const emit = defineEmits<{ change: [value: number] }>()
const model = defineModel<number>({ default: 0 })

const hover = ref<number | null>(null)
const step = computed(() => (props.allowHalf ? 0.5 : 1))
const shown = computed(() => hover.value ?? model.value)
const interactive = computed(() => !props.readonly && !props.disabled)

/** How full paw `i` (1-based) is: 0, 0.5 or 1. */
function fill(i: number) {
  const v = shown.value
  if (v >= i) return 1
  if (v >= i - 0.5) return 0.5
  return 0
}

const text = computed(() => {
  const v = shown.value
  if (props.texts?.length) return props.texts[Math.ceil(v) - 1] ?? ''
  return props.showValue ? String(v) : ''
})
const valueText = computed(() => {
  const t = props.texts?.[Math.ceil(model.value) - 1]
  return `${model.value} / ${props.max}${t ? `，${t}` : ''}`
})

function valueAt(event: MouseEvent, i: number) {
  if (!props.allowHalf) return i
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  return event.clientX - rect.left < rect.width / 2 ? i - 0.5 : i
}

function set(v: number) {
  if (!interactive.value) return
  const next = props.clearable && v === model.value ? 0 : Math.min(props.max, Math.max(0, v))
  model.value = next
  emit('change', next)
}

function onKeydown(event: KeyboardEvent) {
  if (!interactive.value) return
  const map: Record<string, number> = {
    ArrowRight: model.value + step.value,
    ArrowUp: model.value + step.value,
    ArrowLeft: model.value - step.value,
    ArrowDown: model.value - step.value,
    Home: 0,
    End: props.max,
  }
  if (event.key in map) {
    event.preventDefault()
    const v = Math.min(props.max, Math.max(0, map[event.key]))
    model.value = v
    emit('change', v)
  }
}
</script>

<template>
  <div
    :class="[
      'ml-rate',
      `ml-rate--${size}`,
      `ml-rate--${tone}`,
      { 'ml-rate--interactive': interactive, 'ml-rate--disabled': disabled },
    ]"
    :role="readonly ? 'img' : 'slider'"
    :aria-label="readonly ? `${label ?? loc.rate}：${valueText}` : label ?? loc.rate"
    :aria-valuemin="readonly ? undefined : 0"
    :aria-valuemax="readonly ? undefined : max"
    :aria-valuenow="readonly ? undefined : model"
    :aria-valuetext="readonly ? undefined : valueText"
    :aria-disabled="disabled || undefined"
    :tabindex="interactive ? 0 : undefined"
    @keydown="onKeydown"
    @mouseleave="hover = null"
  >
    <span
      v-for="i in max"
      :key="i"
      :class="['ml-rate__item', { 'ml-rate__item--on': fill(i) === 1, 'ml-rate__item--half': fill(i) === 0.5 }]"
      aria-hidden="true"
      @mousemove="interactive && (hover = valueAt($event, i))"
      @click="set(valueAt($event, i))"
    >
      <MlPaw tone="current" :shine="false" class="ml-rate__base" />
      <span class="ml-rate__fill" :style="{ width: `${fill(i) * 100}%` }">
        <MlPaw tone="current" class="ml-rate__paw" />
      </span>
    </span>
    <span v-if="text" class="ml-rate__text" aria-hidden="true">{{ text }}</span>
  </div>
</template>
