<script setup lang="ts" generic="T">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    items: T[]
    /** Column count, or responsive breakpoints `{ minWidth: columns }` measured on the masonry's own width. */
    columns?: number | Record<number, number>
    /** Space between items: px number or any CSS length. */
    gap?: number | string
    /** Key for each item; defaults to its index. */
    itemKey?: (item: T, index: number) => string | number
    /** Columns used before the first measurement (server render). Defaults to the smallest breakpoint. */
    ssrColumns?: number
    /** Fade items up as they are placed; repositioning glides. Off under reduced motion. */
    animate?: boolean
    /** Accessible name for the list. */
    label?: string
  }>(),
  { columns: 3, gap: 16, animate: false },
)

const emit = defineEmits<{ layout: [info: { columns: number; height: number }] }>()

const root = ref<HTMLElement>()
const ready = ref(false)
const cols = ref(0)
const colWidth = ref(0)
const height = ref(0)
const positions = ref<{ x: number; y: number }[]>([])
// Items placed in an earlier pass glide to new spots; fresh ones just appear (or fade up).
const settled = ref(0)

function columnsFor(width: number) {
  const c = props.columns
  if (typeof c === 'number') return Math.max(1, Math.floor(c))
  let best = 1
  let bestMin = -1
  for (const [min, n] of Object.entries(c)) {
    if (width >= Number(min) && Number(min) > bestMin) {
      bestMin = Number(min)
      best = n
    }
  }
  return Math.max(1, Math.floor(best))
}

const fallbackColumns = computed(() => {
  if (props.ssrColumns) return props.ssrColumns
  const c = props.columns
  if (typeof c === 'number') return Math.max(1, Math.floor(c))
  const keys = Object.keys(c).map(Number).sort((a, b) => a - b)
  return Math.max(1, Math.floor(keys.length ? c[keys[0]] : 1))
})

const gapCss = computed(() => (typeof props.gap === 'number' ? `${props.gap}px` : props.gap))

const rootStyle = computed(() =>
  ready.value
    ? { '--ml-masonry-gap': gapCss.value, '--ml-masonry-col': `${colWidth.value}px`, height: `${height.value}px` }
    : { '--ml-masonry-gap': gapCss.value, '--ml-masonry-cols': fallbackColumns.value },
)

const rows = computed(() =>
  props.items.map((item, index) => ({ item, index, key: props.itemKey ? props.itemKey(item, index) : index })),
)

function gapPx(el: HTMLElement) {
  if (typeof props.gap === 'number') return props.gap
  const v = parseFloat(getComputedStyle(el).getPropertyValue('row-gap'))
  return Number.isFinite(v) ? v : 16
}

/** Put every item into the currently shortest column. */
async function layout() {
  const el = root.value
  if (!el) return
  const width = el.clientWidth
  if (width <= 0) return
  const gap = gapPx(el)
  const n = columnsFor(width)
  const w = (width - gap * (n - 1)) / n
  if (!ready.value || n !== cols.value || Math.abs(w - colWidth.value) > 0.5) {
    cols.value = n
    colWidth.value = w
    ready.value = true
    // Items take the column width first, then we can read their real heights.
    await nextTick()
  }
  const items = [...el.children].filter((c): c is HTMLElement => c.classList.contains('ml-masonry__item'))
  const tops = Array<number>(n).fill(0)
  const next = items.map((item) => {
    let c = 0
    for (let i = 1; i < n; i++) if (tops[i] < tops[c] - 0.5) c = i
    const pos = { x: c * (w + gap), y: tops[c] }
    tops[c] += item.offsetHeight + gap
    return pos
  })
  settled.value = positions.value.length
  positions.value = next
  height.value = Math.max(0, Math.max(...tops) - gap)
  observeItems(items)
  emit('layout', { columns: n, height: height.value })
}

let frame = 0
function schedule() {
  if (typeof requestAnimationFrame === 'undefined') return void layout()
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(() => void layout())
}

let observer: ResizeObserver | undefined
const watched = new WeakSet<Element>()
function observeItems(items: HTMLElement[]) {
  if (!observer) return
  for (const item of items) {
    if (watched.has(item)) continue
    watched.add(item)
    observer.observe(item)
  }
}

onMounted(() => {
  if (typeof ResizeObserver !== 'undefined') {
    let lastWidth = -1
    observer = new ResizeObserver((entries) => {
      // The root's own height is ours to set; only its width matters.
      const own = entries.find((e) => e.target === root.value)
      if (own && entries.length === 1 && own.contentRect.width === lastWidth) return
      if (own) lastWidth = own.contentRect.width
      schedule()
    })
    if (root.value) observer.observe(root.value)
  }
  void layout()
})
onBeforeUnmount(() => {
  observer?.disconnect()
  if (typeof cancelAnimationFrame !== 'undefined') cancelAnimationFrame(frame)
})

watch(
  () => [props.items.length, props.items, props.columns, props.gap],
  () => nextTick(schedule),
)

defineExpose({ layout })
</script>

<template>
  <div
    ref="root"
    :class="['ml-masonry', { 'ml-masonry--ready': ready, 'ml-masonry--animate': animate }]"
    :style="rootStyle"
    role="list"
    :aria-label="label"
    @load.capture="schedule"
  >
    <div
      v-for="row in rows"
      :key="row.key"
      :class="[
        'ml-masonry__item',
        { 'ml-masonry__item--placed': ready && positions[row.index], 'ml-masonry__item--settled': ready && row.index < settled },
      ]"
      role="listitem"
      :style="ready && positions[row.index] ? { transform: `translate(${positions[row.index].x}px, ${positions[row.index].y}px)` } : undefined"
    >
      <slot :item="row.item" :index="row.index" />
    </div>
    <slot v-if="!items.length" name="empty" />
  </div>
</template>
