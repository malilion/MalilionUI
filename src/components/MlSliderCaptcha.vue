<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { useLocale } from '../locale'
import { icons } from './icons'
import { PAW_PAD, PAW_TOES } from './paw'
import {
  CAPTCHA_START,
  captchaArt,
  captchaHit,
  captchaMax,
  captchaPiecePath,
  captchaRandom,
  captchaSeed,
  captchaTarget,
  type CaptchaState,
  type MlCaptchaAttempt,
  type MlCaptchaTarget,
  type MlCaptchaTone,
} from './captcha'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    /** Background picture. Without one a paw-print pattern is drawn. */
    src?: string
    /** Picture size in px (it shrinks with a narrow container). */
    width?: number
    height?: number
    tone?: MlCaptchaTone
    /** How far off (px of the picture) still counts. */
    tolerance?: number
    /** Failed tries before a new picture is dealt. 0 = never. */
    maxAttempts?: number
    /** Same seed, same gaps (for tests and demos). */
    seed?: number
    /** Put the gap here instead (e.g. from your server); listen to `refresh` to fetch a new one. */
    target?: MlCaptchaTarget
    /** Judge an attempt yourself (e.g. on the server). Without it the gap position decides. */
    verify?: (attempt: MlCaptchaAttempt) => boolean | Promise<boolean>
    disabled?: boolean
    /** Instruction under the picture. */
    hint?: string
  }>(),
  { width: 320, height: 160, tone: 'gold', tolerance: 6, maxAttempts: 5 },
)

const emit = defineEmits<{
  success: [attempt: MlCaptchaAttempt]
  fail: [attempt: MlCaptchaAttempt]
  refresh: []
}>()

const uid = `ml-captcha-${useId()}`
const round = ref(0)
const seedNow = ref(captchaSeed(props.seed ?? 1, 0))
const state = ref<CaptchaState>('idle')
const value = ref(0)
const attempts = ref(0)
const announce = ref('')

const art = computed(() => captchaArt(props.width, props.height, seedNow.value))
const target = computed(() => props.target ?? captchaTarget(props.width, props.height, captchaRandom(seedNow.value)))
const max = computed(() => captchaMax(props.width))
const pieceX = computed(() => Math.round(CAPTCHA_START + value.value * (max.value - CAPTCHA_START)))
const gap = computed(() => captchaPiecePath(target.value.x, target.value.y))
const locked = computed(() => props.disabled || state.value === 'checking' || state.value === 'success')

let timer: ReturnType<typeof setTimeout> | undefined
// Server render and hydration share seed 1; a real gap is dealt in the browser.
onMounted(() => {
  if (props.seed === undefined) seedNow.value = captchaSeed(undefined, 0)
})
onBeforeUnmount(() => {
  clearTimeout(timer)
  stopListening()
})

/** A new picture and gap. */
function refresh() {
  clearTimeout(timer)
  round.value++
  seedNow.value = captchaSeed(props.seed, round.value)
  attempts.value = 0
  reset()
  emit('refresh')
}

/** Slide the piece back and try again (same picture). */
function reset() {
  clearTimeout(timer)
  state.value = 'idle'
  value.value = 0
}

watch(
  () => props.seed,
  () => {
    round.value = 0
    seedNow.value = captchaSeed(props.seed ?? 1, 0)
    attempts.value = 0
    reset()
  },
)

let started = 0
let track: [number, number][] = []

async function check() {
  if (locked.value) return
  const attempt: MlCaptchaAttempt = { x: pieceX.value, target: { ...target.value }, duration: started ? Date.now() - started : 0, track }
  started = 0
  track = []
  let ok: boolean
  try {
    const answer = props.verify ? props.verify(attempt) : captchaHit(attempt.x, attempt.target, props.tolerance)
    if (typeof answer === 'boolean') ok = answer
    else {
      state.value = 'checking'
      announce.value = loc.value.captcha.checking
      ok = await answer
    }
  } catch {
    ok = false
  }
  if (ok) {
    state.value = 'success'
    announce.value = loc.value.captcha.success
    emit('success', attempt)
    return
  }
  state.value = 'fail'
  attempts.value++
  announce.value = loc.value.captcha.fail
  emit('fail', attempt)
  timer = setTimeout(() => {
    if (props.maxAttempts > 0 && attempts.value >= props.maxAttempts) {
      refresh()
      announce.value = loc.value.captcha.locked
    } else reset()
  }, 700)
}

/* ── Pointer ── */
const trackEl = ref<HTMLElement>()
let drag: { id: number; x: number; from: number; span: number } | null = null

function onPointerDown(event: PointerEvent) {
  if (locked.value || event.button !== 0 || !trackEl.value || state.value === 'fail') return
  event.preventDefault()
  const span = Math.max(1, trackEl.value.getBoundingClientRect().width - 44)
  drag = { id: event.pointerId, x: event.clientX, from: value.value, span }
  state.value = 'dragging'
  started = Date.now()
  track = [[0, pieceX.value]]
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
}

function onPointerMove(event: PointerEvent) {
  if (!drag || event.pointerId !== drag.id) return
  value.value = Math.min(1, Math.max(0, drag.from + (event.clientX - drag.x) / drag.span))
  track.push([Date.now() - started, pieceX.value])
}

function stopListening() {
  drag = null
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
}

function onPointerUp(event: PointerEvent) {
  if (!drag || event.pointerId !== drag.id) return
  stopListening()
  state.value = 'idle'
  void check()
}

/* ── Keyboard ── */
function onKeydown(event: KeyboardEvent) {
  if (locked.value || state.value === 'fail') return
  const span = max.value - CAPTCHA_START
  const step = (event.shiftKey ? 10 : 1) / span
  if (!started) {
    started = Date.now()
    track = [[0, pieceX.value]]
  }
  if (event.key === 'ArrowRight' || event.key === 'ArrowUp') value.value = Math.min(1, value.value + step)
  else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') value.value = Math.max(0, value.value - step)
  else if (event.key === 'Home') value.value = 0
  else if (event.key === 'End') value.value = 1
  else if (event.key === 'Enter' || event.key === ' ') void check()
  else return
  event.preventDefault()
  if (event.key !== 'Enter' && event.key !== ' ') track.push([Date.now() - started, pieceX.value])
}

const handleIcon = computed(() => (state.value === 'success' ? icons.check : state.value === 'fail' ? icons.close : icons.arrowRight))

defineExpose({ reset, refresh })
</script>

<template>
  <div
    :class="['ml-captcha', `ml-captcha--${tone}`, `ml-captcha--${state}`, { 'ml-captcha--disabled': disabled }]"
    :style="{ '--_w': `${width}px`, '--_ratio': `${width} / ${height}`, '--_v': value.toFixed(4) }"
    role="group"
    :aria-label="loc.captcha.label"
  >
    <div class="ml-captcha__stage">
      <svg class="ml-captcha__svg" :viewBox="`0 0 ${width} ${height}`" aria-hidden="true">
        <defs>
          <linearGradient :id="`${uid}-sky`" x1="0" y1="0" x2="1" y2="1">
            <stop class="ml-captcha__stop ml-captcha__stop--a" offset="0" />
            <stop class="ml-captcha__stop ml-captcha__stop--b" offset="0.55" />
            <stop class="ml-captcha__stop ml-captcha__stop--c" offset="1" />
          </linearGradient>
          <g :id="`${uid}-bg`">
            <image v-if="src" :href="src" x="0" y="0" :width="width" :height="height" preserveAspectRatio="xMidYMid slice" />
            <template v-else>
              <rect x="0" y="0" :width="width" :height="height" :fill="`url(#${uid}-sky)`" />
              <circle v-for="(d, i) in art.dots" :key="`d${i}`" class="ml-captcha__dot" :cx="d.cx" :cy="d.cy" :r="d.r" :opacity="d.o" />
              <g
                v-for="(p, i) in art.paws"
                :key="`p${i}`"
                class="ml-captcha__paw"
                :opacity="p.o"
                :transform="`translate(${p.x} ${p.y}) rotate(${p.r} 12 12) scale(${p.s})`"
              >
                <ellipse v-for="t in PAW_TOES" :key="t.cx" :cx="t.cx" :cy="t.cy" :rx="t.rx" :ry="t.ry" :transform="`rotate(${t.rotate} ${t.cx} ${t.cy})`" />
                <path :d="PAW_PAD" />
              </g>
            </template>
          </g>
          <clipPath :id="`${uid}-cut`">
            <path :d="gap" />
          </clipPath>
        </defs>
        <use :href="`#${uid}-bg`" />
        <path class="ml-captcha__gap" :d="gap" />
        <g class="ml-captcha__piece" :style="{ translate: `${pieceX - target.x}px 0px` }">
          <use :href="`#${uid}-bg`" :clip-path="`url(#${uid}-cut)`" />
          <path class="ml-captcha__edge" :d="gap" />
        </g>
      </svg>
      <button type="button" class="ml-captcha__refresh" :aria-label="loc.captcha.refresh" :disabled="disabled || state === 'checking'" @click="refresh">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="icons.rotate" /></svg>
      </button>
      <p v-if="state === 'success' || state === 'fail'" class="ml-captcha__note" aria-hidden="true">
        {{ state === 'success' ? loc.captcha.success : loc.captcha.fail }}
      </p>
    </div>
    <div ref="trackEl" class="ml-captcha__track">
      <div class="ml-captcha__fill" />
      <span class="ml-captcha__hint" aria-hidden="true">{{ state === 'checking' ? loc.captcha.checking : (hint ?? loc.captcha.hint) }}</span>
      <div
        class="ml-captcha__handle"
        role="slider"
        :tabindex="disabled ? -1 : 0"
        :aria-label="loc.captcha.slider"
        aria-valuemin="0"
        :aria-valuemax="max"
        :aria-valuenow="pieceX"
        :aria-disabled="locked ? true : undefined"
        @pointerdown="onPointerDown"
        @keydown="onKeydown"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="handleIcon" /></svg>
      </div>
    </div>
    <p class="ml-visually-hidden" aria-live="polite">{{ announce }}</p>
  </div>
</template>
