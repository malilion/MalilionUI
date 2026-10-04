<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import MlIcon from './MlIcon.vue'
import MlPaw from './MlPaw.vue'
import { attachPullGesture, pullProgress, pullResistance } from './gesture'
import { useLocale } from '../locale'
import type { MlPullRefreshStatus } from '../types'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    /**
     * Runs on release (bind it as `@refresh`). Return a Promise: the indicator
     * spins until it settles, then shows the success text (resolved) or the
     * fail text (rejected). A handler that returns nothing counts as done.
     */
    onRefresh?: (() => unknown) | (() => unknown)[]
    /** Height of the indicator area, and where the content rests while refreshing (px). */
    headHeight?: number
    /** How far the content must follow the finger before letting go refreshes (px). Defaults to headHeight. */
    pullDistance?: number
    disabled?: boolean
    /** How long the success / fail text stays before the head closes (ms). 0 closes right away. */
    successDuration?: number
    pullingText?: string
    loosingText?: string
    refreshingText?: string
    successText?: string
    failText?: string
  }>(),
  { headHeight: 56, successDuration: 600 },
)

const emit = defineEmits<{ 'status-change': [status: MlPullRefreshStatus] }>()

defineSlots<{
  default?: () => unknown
  /** Replace the paw indicator and text. */
  indicator?: (props: { status: MlPullRefreshStatus; distance: number; progress: number }) => unknown
}>()

const root = ref<HTMLElement>()
const status = ref<MlPullRefreshStatus>('idle')
const distance = ref(0)
const dragging = ref(false)
const live = ref('')
const threshold = computed(() => props.pullDistance ?? props.headHeight)
const progress = computed(() => pullProgress(distance.value, threshold.value))

const text = computed(() => {
  switch (status.value) {
    case 'loosing':
      return props.loosingText ?? loc.value.pullRefresh.loosing
    case 'refreshing':
      return props.refreshingText ?? loc.value.pullRefresh.refreshing
    case 'success':
      return props.successText ?? loc.value.pullRefresh.success
    case 'fail':
      return props.failText ?? loc.value.pullRefresh.fail
    default:
      return props.pullingText ?? loc.value.pullRefresh.pulling
  }
})

function setStatus(next: MlPullRefreshStatus) {
  if (status.value === next) return
  status.value = next
  emit('status-change', next)
}

let timer: ReturnType<typeof setTimeout> | undefined
let alive = true
let run = 0
const busy = () => status.value === 'refreshing'

/** Start a refresh as if the user had pulled (the keyboard button does this). */
async function refresh() {
  if (busy() || !alive) return
  clearTimeout(timer)
  const id = ++run
  distance.value = props.headHeight
  setStatus('refreshing')
  live.value = props.refreshingText ?? loc.value.pullRefresh.refreshing
  const handlers = props.onRefresh ? (Array.isArray(props.onRefresh) ? props.onRefresh : [props.onRefresh]) : []
  let ok = true
  try {
    await Promise.all(handlers.map((fn) => fn()))
  } catch {
    ok = false
  }
  if (!alive || id !== run) return
  setStatus(ok ? 'success' : 'fail')
  live.value = ok ? (props.successText ?? loc.value.pullRefresh.success) : (props.failText ?? loc.value.pullRefresh.fail)
  timer = setTimeout(collapse, props.successDuration)
}

function collapse() {
  distance.value = 0
  // Keep the result text while the head slides away, then go idle.
  timer = setTimeout(() => setStatus('idle'), 300)
}

let detach: (() => void) | undefined
onMounted(() => {
  detach = attachPullGesture({
    root: root.value!,
    enabled: () => !props.disabled && !busy(),
    onStart() {
      clearTimeout(timer)
      dragging.value = true
      setStatus('pulling')
    },
    onMove(raw) {
      distance.value = pullResistance(raw, threshold.value)
      setStatus(distance.value >= threshold.value ? 'loosing' : 'pulling')
    },
    onEnd(_raw, cancelled) {
      dragging.value = false
      if (!cancelled && status.value === 'loosing') return void refresh()
      distance.value = 0
      setStatus('idle')
    },
  })
})

onBeforeUnmount(() => {
  alive = false
  clearTimeout(timer)
  detach?.()
})

defineExpose({ refresh, status })
</script>

<template>
  <div
    ref="root"
    :class="[
      'ml-pull-refresh',
      `ml-pull-refresh--${status}`,
      { 'ml-pull-refresh--dragging': dragging, 'ml-pull-refresh--disabled': disabled },
    ]"
    :style="{ '--_head': `${headHeight}px`, '--_p': progress }"
  >
    <button v-if="!disabled" type="button" class="ml-pull-refresh__button" :disabled="status === 'refreshing'" @click="refresh">
      <MlIcon name="rotate" />{{ loc.pullRefresh.button }}
    </button>
    <div class="ml-pull-refresh__track" :style="distance ? { transform: `translate3d(0, ${distance}px, 0)` } : undefined">
      <div class="ml-pull-refresh__head" aria-hidden="true">
        <slot name="indicator" :status="status" :distance="distance" :progress="progress">
          <span class="ml-pull-refresh__icon">
            <span v-if="status === 'refreshing'" class="ml-pull-refresh__spinner">
              <MlPaw v-for="i in 4" :key="i" tone="current" class="ml-pull-refresh__step" :style="{ '--i': i - 1 }" />
            </span>
            <MlIcon v-else-if="status === 'success' || status === 'fail'" :name="status === 'success' ? 'check' : 'warning'" class="ml-pull-refresh__result" />
            <template v-else>
              <svg class="ml-pull-refresh__ring" viewBox="0 0 36 36">
                <circle class="ml-pull-refresh__ring-track" cx="18" cy="18" r="16" />
                <circle class="ml-pull-refresh__ring-fill" cx="18" cy="18" r="16" pathLength="100" />
              </svg>
              <MlPaw class="ml-pull-refresh__paw" />
            </template>
          </span>
          <span class="ml-pull-refresh__text">{{ text }}</span>
        </slot>
      </div>
      <div class="ml-pull-refresh__content"><slot /></div>
    </div>
    <span class="ml-visually-hidden" role="status">{{ live }}</span>
  </div>
</template>
