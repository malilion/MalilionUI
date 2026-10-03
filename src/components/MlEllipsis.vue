<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { MlPlacement } from '../types'
import { useLocale } from '../locale'

const props = withDefaults(
  defineProps<{
    /** The full text. The default slot can render richer content instead (end position only). */
    text?: string
    /** Lines to show before truncating. */
    lines?: number
    /** Where the "…" goes. `middle` keeps both ends of one line — for file names, hashes, paths. */
    position?: 'end' | 'middle'
    /** Show the full text in a tooltip when (and only when) it is actually cut off. */
    tooltip?: boolean
    placement?: MlPlacement
    /** Add an expand / collapse toggle when the text is cut off. */
    expandable?: boolean
    expandText?: string
    collapseText?: string
    tag?: string
  }>(),
  { lines: 1, position: 'end', tooltip: true, placement: 'top', expandable: false, tag: 'span' },
)

const emit = defineEmits<{ truncate: [truncated: boolean] }>()
const expanded = defineModel<boolean>('expanded', { default: false })

const loc = useLocale()
const root = ref<HTMLElement>()
const body = ref<HTMLElement>()
const measurer = ref<HTMLElement>()
const truncated = ref(false)
const middleText = ref<string>()
const visible = ref(false)

const middle = computed(() => props.position === 'middle' && props.lines <= 1 && props.text != null)
const tipOn = computed(() => props.tooltip && truncated.value && !expanded.value)

/* ── Tooltip (same behaviour as MlTooltip) ─────────────── */
let timer: ReturnType<typeof setTimeout> | undefined
function show(immediate = false) {
  clearTimeout(timer)
  if (!tipOn.value) return
  if (immediate) visible.value = true
  else timer = setTimeout(() => (visible.value = true), 120)
}
function hide() {
  clearTimeout(timer)
  visible.value = false
}
watch(tipOn, (on) => !on && hide())

/* ── Measuring ─────────────────────────────────────────── */
/** Longest "head…tail" of `text` that fits `width` (the tail wins odd characters: extensions live there). */
function fitMiddle(text: string, width: number, el: HTMLElement) {
  const chars = Array.from(text)
  const fits = (s: string) => {
    el.textContent = s
    return el.offsetWidth <= width
  }
  if (fits(text)) return undefined
  const cut = (n: number) => chars.slice(0, Math.floor(n / 2)).join('') + '…' + chars.slice(chars.length - Math.ceil(n / 2)).join('')
  let lo = 0
  let hi = chars.length - 1
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (fits(cut(mid))) lo = mid
    else hi = mid - 1
  }
  return cut(lo)
}

function measure() {
  const el = body.value
  if (!el || expanded.value) return
  let cut = false
  if (middle.value) {
    const width = el.clientWidth
    const next = width > 0 && measurer.value ? fitMiddle(props.text!, width, measurer.value) : undefined
    middleText.value = next
    cut = next !== undefined
  } else {
    middleText.value = undefined
    cut = props.lines > 1 ? el.scrollHeight > el.clientHeight + 1 : el.scrollWidth > el.clientWidth + 1
  }
  if (cut !== truncated.value) {
    truncated.value = cut
    emit('truncate', cut)
  }
}

let frame = 0
function schedule() {
  if (typeof requestAnimationFrame === 'undefined') return measure()
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(measure)
}

let observer: ResizeObserver | undefined
onMounted(() => {
  measure()
  if (typeof ResizeObserver !== 'undefined' && body.value) {
    observer = new ResizeObserver(schedule)
    observer.observe(body.value)
  }
  // Webfonts change text width once they arrive.
  document.fonts?.ready?.then(() => root.value && schedule())
})
onBeforeUnmount(() => {
  observer?.disconnect()
  clearTimeout(timer)
  if (typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(frame)
})

watch(
  () => [props.text, props.lines, props.position],
  () => nextTick(measure),
)
watch(expanded, (open) => {
  if (!open) nextTick(measure)
})

function toggle() {
  expanded.value = !expanded.value
}

defineExpose({ measure, truncated })
</script>

<template>
  <component
    :is="tag"
    ref="root"
    :class="[
      'ml-ellipsis',
      lines > 1 ? 'ml-ellipsis--multi' : 'ml-ellipsis--single',
      {
        'ml-ellipsis--middle': middle,
        'ml-ellipsis--truncated': truncated,
        'ml-ellipsis--expanded': expanded,
      },
    ]"
    :style="lines > 1 ? { '--ml-ellipsis-lines': lines } : undefined"
    @mouseenter="show()"
    @mouseleave="hide"
    @focusin="show(true)"
    @focusout="hide"
    @keydown.esc="hide"
  >
    <span
      ref="body"
      class="ml-ellipsis__text"
      :tabindex="tipOn && !expandable ? 0 : undefined"
    >
      <template v-if="middle">
        <!-- The shortened copy is for eyes; screen readers get the whole string -->
        <span v-if="middleText !== undefined && !expanded" aria-hidden="true">{{ middleText }}</span>
        <span :class="{ 'ml-visually-hidden': middleText !== undefined && !expanded }">{{ text }}</span>
      </template>
      <slot v-else>{{ text }}</slot>
    </span>
    <span v-if="middle" ref="measurer" class="ml-ellipsis__measure" aria-hidden="true" />
    <button
      v-if="expandable && (truncated || expanded)"
      type="button"
      class="ml-ellipsis__toggle"
      :aria-expanded="expanded"
      @click="toggle"
    >
      {{ expanded ? (collapseText ?? loc.ellipsis.collapse) : (expandText ?? loc.ellipsis.expand) }}
    </button>
    <span
      v-if="tooltip"
      role="tooltip"
      aria-hidden="true"
      :class="['ml-tooltip__bubble', `ml-tooltip__bubble--${placement}`, { 'ml-tooltip__bubble--visible': visible && tipOn }]"
    >
      <slot name="content"><slot>{{ text }}</slot></slot>
    </span>
  </component>
</template>
