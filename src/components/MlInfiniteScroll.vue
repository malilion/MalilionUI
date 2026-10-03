<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import MlButton from './MlButton.vue'
import MlLoader from './MlLoader.vue'
import MlPaw from './MlPaw.vue'

const props = withDefaults(
  defineProps<{
    /** Parent is fetching; no new `load` until it turns false. */
    loading?: boolean
    /** Nothing more to load; shows the end marker. */
    finished?: boolean
    /** Fire `load` when the end is this many px away. */
    distance?: number
    /** Scrolling ancestor to watch; defaults to the page. Element or CSS selector. */
    container?: HTMLElement | string
    loadingText?: string
    finishedText?: string
    /** Show a "load more" button instead of loading automatically. */
    manual?: boolean
  }>(),
  { distance: 200, loadingText: '小獅子正在搬資料…', finishedText: '沒有更多了' },
)

const emit = defineEmits<{ load: [] }>()

const sentinel = ref<HTMLElement>()
const visible = ref(false)
let observer: IntersectionObserver | undefined

function maybeLoad() {
  if (visible.value && !props.loading && !props.finished && !props.manual) emit('load')
}

onMounted(() => {
  if (typeof IntersectionObserver === 'undefined' || !sentinel.value) return
  const root =
    typeof props.container === 'string' ? document.querySelector(props.container) : (props.container ?? null)
  observer = new IntersectionObserver(
    ([entry]) => {
      visible.value = entry.isIntersecting
      maybeLoad()
    },
    { root, rootMargin: `0px 0px ${props.distance}px 0px` },
  )
  observer.observe(sentinel.value)
})
onBeforeUnmount(() => observer?.disconnect())

// After a page loads, keep going while the sentinel is still on screen
// (e.g. the first page didn't fill the viewport).
watch(
  () => props.loading,
  (loading, was) => {
    if (was && !loading) requestAnimationFrame(maybeLoad)
  },
)
</script>

<template>
  <div class="ml-infinite">
    <slot />
    <div ref="sentinel" class="ml-infinite__foot" aria-live="polite">
      <template v-if="finished">
        <slot name="finished">
          <span class="ml-infinite__end"><MlPaw tone="steel" />{{ finishedText }}<MlPaw tone="steel" /></span>
        </slot>
      </template>
      <template v-else-if="loading">
        <slot name="loading"><MlLoader variant="paws" :size="32" :label="loadingText" /></slot>
      </template>
      <MlButton v-else-if="manual" variant="outline" size="sm" @click="emit('load')">載入更多</MlButton>
    </div>
  </div>
</template>
