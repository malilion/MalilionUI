<script setup lang="ts" generic="T">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    items: T[]
    /** Fixed row height in px (every row must be this tall). */
    itemHeight: number
    /** Viewport height: px number or any CSS length. */
    height?: number | string
    /** Extra rows rendered above and below the viewport. */
    overscan?: number
    /** Key for each row; defaults to its index. */
    itemKey?: (item: T, index: number) => string | number
    /** Accessible name for the list. */
    label?: string
  }>(),
  { height: 360, overscan: 6 },
)

const emit = defineEmits<{ 'reach-end': []; scroll: [top: number] }>()

const viewport = ref<HTMLElement>()
const scrollTop = ref(0)
const viewHeight = ref(typeof props.height === 'number' ? props.height : 360)

const total = computed(() => props.items.length * props.itemHeight)
const start = computed(() => Math.max(0, Math.floor(scrollTop.value / props.itemHeight) - props.overscan))
const end = computed(() =>
  Math.min(props.items.length, Math.ceil((scrollTop.value + viewHeight.value) / props.itemHeight) + props.overscan),
)
const rows = computed(() =>
  props.items.slice(start.value, end.value).map((item, i) => {
    const index = start.value + i
    return { item, index, key: props.itemKey ? props.itemKey(item, index) : index }
  }),
)

let frame = 0
let reported = -1
function onScroll() {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(() => {
    const el = viewport.value
    if (!el) return
    scrollTop.value = el.scrollTop
    emit('scroll', el.scrollTop)
    // Fire once per list length when the last rows come into view.
    if (el.scrollTop + el.clientHeight >= total.value - props.itemHeight * 2 && reported !== props.items.length) {
      reported = props.items.length
      emit('reach-end')
    }
  })
}

let observer: ResizeObserver | undefined
onMounted(() => {
  const el = viewport.value
  if (!el) return
  viewHeight.value = el.clientHeight || viewHeight.value
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(([entry]) => (viewHeight.value = entry.contentRect.height || viewHeight.value))
    observer.observe(el)
  }
})
onBeforeUnmount(() => {
  observer?.disconnect()
  cancelAnimationFrame(frame)
})

// A shorter list (e.g. a new filter) might leave us scrolled past the end.
watch(
  () => props.items.length,
  () => {
    const el = viewport.value
    if (el && el.scrollTop > total.value) el.scrollTop = Math.max(0, total.value - el.clientHeight)
    scrollTop.value = el?.scrollTop ?? 0
  },
)

/** Scroll so row `index` is visible (aligned to the top by default). */
function scrollToIndex(index: number, align: 'start' | 'center' | 'end' = 'start') {
  const el = viewport.value
  if (!el) return
  const top = index * props.itemHeight
  const offset = align === 'start' ? 0 : align === 'center' ? (el.clientHeight - props.itemHeight) / 2 : el.clientHeight - props.itemHeight
  el.scrollTop = Math.max(0, top - offset)
  scrollTop.value = el.scrollTop
}

defineExpose({ scrollToIndex })
</script>

<template>
  <div
    ref="viewport"
    class="ml-vlist"
    :style="{ height: typeof height === 'number' ? `${height}px` : height }"
    role="list"
    :aria-label="label"
    tabindex="0"
    @scroll="onScroll"
  >
    <div class="ml-vlist__spacer" :style="{ height: `${total}px` }">
      <div class="ml-vlist__window" :style="{ transform: `translateY(${start * itemHeight}px)` }">
        <div
          v-for="row in rows"
          :key="row.key"
          class="ml-vlist__row"
          role="listitem"
          :aria-setsize="items.length"
          :aria-posinset="row.index + 1"
          :style="{ height: `${itemHeight}px` }"
        >
          <slot :item="row.item" :index="row.index" />
        </div>
      </div>
    </div>
    <slot v-if="!items.length" name="empty" />
  </div>
</template>
