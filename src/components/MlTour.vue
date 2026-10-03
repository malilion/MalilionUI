<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import MlButton from './MlButton.vue'
import MlIcon from './MlIcon.vue'
import MlMascot from './MlMascot.vue'
import { prefersReducedMotion, trapFocus, useScrollLock } from '../composables'
import { useLocale } from '../locale'
import type { MlTourStep } from '../types'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    steps: MlTourStep[]
    /** Show the lion guide in each card. */
    mascot?: boolean
    /** Space around the highlighted element, in px. */
    padding?: number
    /** Close when the dimmed area is clicked. */
    closeOnMask?: boolean
  }>(),
  { mascot: true, padding: 8, closeOnMask: false },
)

const emit = defineEmits<{ finish: []; close: [step: number] }>()
const open = defineModel<boolean>('open', { default: false })
const current = defineModel<number>('current', { default: 0 })

const card = ref<HTMLElement>()
const rect = ref<{ top: number; left: number; width: number; height: number } | null>(null)
const titleId = `ml-tour-${useId()}`
const scrollLock = useScrollLock()
let returnFocusTo: HTMLElement | null = null

const step = computed(() => props.steps[current.value])
const isLast = computed(() => current.value >= props.steps.length - 1)

function resolveTarget(target: MlTourStep['target']): HTMLElement | null {
  if (!target) return null
  if (typeof target === 'string') return document.querySelector<HTMLElement>(target)
  if (typeof target === 'function') return target()
  return target
}

function measure() {
  const el = resolveTarget(step.value?.target)
  if (!el) {
    rect.value = null
    return
  }
  const r = el.getBoundingClientRect()
  const p = props.padding
  rect.value = { top: r.top - p, left: r.left - p, width: r.width + p * 2, height: r.height + p * 2 }
}

async function show() {
  const el = resolveTarget(step.value?.target)
  el?.scrollIntoView?.({ block: 'center', inline: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  // Measure now, and again once a smooth scroll has settled.
  measure()
  setTimeout(measure, 380)
  await nextTick()
  card.value?.focus()
}

function go(to: number) {
  if (to < 0 || to >= props.steps.length) return
  current.value = to
}

function next() {
  if (isLast.value) {
    open.value = false
    emit('finish')
  } else go(current.value + 1)
}

function close() {
  open.value = false
  emit('close', current.value)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
  } else if (event.key === 'ArrowRight' && !(event.target as HTMLElement).closest('button')) {
    next()
  } else if (event.key === 'ArrowLeft' && !(event.target as HTMLElement).closest('button')) {
    go(current.value - 1)
  } else if (card.value) {
    trapFocus(event, card.value)
  }
}

const onViewportChange = () => open.value && measure()

watch(
  open,
  async (isOpen) => {
    if (typeof window === 'undefined') return
    if (isOpen) {
      returnFocusTo = document.activeElement as HTMLElement | null
      scrollLock.lock()
      window.addEventListener('resize', onViewportChange)
      window.addEventListener('scroll', onViewportChange, true)
      await nextTick()
      show()
    } else {
      scrollLock.unlock()
      window.removeEventListener('resize', onViewportChange)
      window.removeEventListener('scroll', onViewportChange, true)
      returnFocusTo?.focus?.()
      returnFocusTo = null
    }
  },
  { immediate: true },
)

watch(current, () => open.value && show())

onBeforeUnmount(() => {
  scrollLock.unlock()
  window.removeEventListener('resize', onViewportChange)
  window.removeEventListener('scroll', onViewportChange, true)
})

/** Where the card sits: beside the target on the requested side, clamped on screen; centred when there's no target. */
const cardStyle = computed(() => {
  const r = rect.value
  if (!r) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  const gap = 14
  const placement = step.value?.placement ?? 'bottom'
  const w = Math.min(340, window.innerWidth - 32)
  const clampX = (x: number) => Math.max(16, Math.min(window.innerWidth - w - 16, x))
  const clampY = (y: number) => Math.max(16, Math.min(window.innerHeight - 200, y))
  if (placement === 'top') return { left: `${clampX(r.left)}px`, top: `${r.top - gap}px`, transform: 'translateY(-100%)', width: `${w}px` }
  if (placement === 'left') return { left: `${Math.max(16, r.left - gap - w)}px`, top: `${clampY(r.top)}px`, width: `${w}px` }
  if (placement === 'right') return { left: `${Math.min(window.innerWidth - w - 16, r.left + r.width + gap)}px`, top: `${clampY(r.top)}px`, width: `${w}px` }
  return { left: `${clampX(r.left)}px`, top: `${r.top + r.height + gap}px`, width: `${w}px` }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="ml-tour">
      <div v-if="open && step" class="ml-tour" @keydown="onKeydown">
        <!-- The spotlight: a hole whose giant shadow dims everything else -->
        <div
          v-if="rect"
          class="ml-tour__spot"
          :style="{ top: `${rect.top}px`, left: `${rect.left}px`, width: `${rect.width}px`, height: `${rect.height}px` }"
          aria-hidden="true"
        />
        <div v-else class="ml-tour__dim" aria-hidden="true" />
        <div class="ml-tour__catcher" @click="closeOnMask && close()" />
        <div
          ref="card"
          :key="`step-${current}`"
          class="ml-tour__card"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          tabindex="-1"
          :style="cardStyle"
        >
          <header class="ml-tour__head">
            <MlMascot v-if="mascot" :size="40" frame="ring" title="" class="ml-tour__lion" />
            <div class="ml-tour__heading">
              <p class="ml-tour__count">{{ loc.tour.step(current + 1, steps.length) }}</p>
              <h2 :id="titleId" class="ml-tour__title">{{ step.title }}</h2>
            </div>
            <button type="button" class="ml-tour__close" :aria-label="loc.tour.skip" @click="close">
              <MlIcon name="close" />
            </button>
          </header>
          <div class="ml-tour__body">
            <slot :step="step" :index="current">{{ step.content }}</slot>
          </div>
          <footer class="ml-tour__foot">
            <span class="ml-tour__dots" aria-hidden="true">
              <i v-for="(_, i) in steps" :key="i" :class="{ on: i === current, done: i < current }" />
            </span>
            <MlButton v-if="current > 0" size="sm" variant="ghost" @click="go(current - 1)">{{ loc.tour.prev }}</MlButton>
            <MlButton size="sm" stamp @click="next">{{ isLast ? loc.tour.finish : loc.tour.next }}</MlButton>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
