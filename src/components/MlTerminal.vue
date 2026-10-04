<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import MlPaw from './MlPaw.vue'
import { observeInView, prefersReducedMotion } from '../composables'
import { useLocale } from '../locale'
import {
  copyTerminalText,
  createTerminalPlayer,
  normalizeTerminalLines,
  segmentClass,
  terminalCommands,
  terminalFinalState,
  terminalRowClass,
  terminalRows,
  terminalTranscript,
  type MlTerminalScript,
} from './terminal'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    /** The script. A plain string is an output line. */
    lines: MlTerminalScript
    /** Shown in the title bar. */
    title?: string
    /** Prompt before input lines. */
    prompt?: string
    /** Start when scrolled into view. Without it the finished transcript shows until play(). */
    autoplay?: boolean
    /** Play again after `loopDelay`. */
    loop?: boolean
    /** ms between loops. */
    loopDelay?: number
    /** Playback multiplier: 2 = twice as fast. */
    speed?: number
    /** Base ms per typed character (jittered). */
    typeSpeed?: number
    /** A button in the title bar that copies every input command. */
    copyable?: boolean
    /** Window chrome: metal rivets or paw prints. */
    dots?: 'rivet' | 'paw'
    /** Fixed body height (px number or CSS length). */
    height?: number | string
    /** Scroll inside this height; follows the newest line while playing. */
    maxHeight?: number | string
    /** Characters in a progress bar. */
    meterWidth?: number
  }>(),
  {
    title: 'malilion@den: ~',
    prompt: '❯',
    autoplay: true,
    loop: false,
    loopDelay: 2400,
    speed: 1,
    typeSpeed: 55,
    copyable: false,
    dots: 'rivet',
    meterWidth: 24,
  },
)

const emit = defineEmits<{ done: []; copy: [commands: string] }>()

const script = computed(() => normalizeTerminalLines(props.lines))
// Server render and first client render both show the finished transcript, so
// hydration matches and no-JS readers get everything; the animation starts in onMounted.
const state = ref(terminalFinalState(script.value.length))
const running = ref(false)
const played = ref(false)
const copied = ref(false)
const lockedHeight = ref<string>()
const root = ref<HTMLElement>()
const body = ref<HTMLElement>()

const rows = computed(() => terminalRows(script.value, state.value, props.prompt, props.meterWidth))
const transcript = computed(() => terminalTranscript(script.value, props.prompt))
const len = (v: number | string | undefined) => (typeof v === 'number' ? `${v}px` : v)
const bodyStyle = computed(() => ({ height: len(props.height), maxHeight: len(props.maxHeight), minHeight: lockedHeight.value }))

const player = createTerminalPlayer({
  lines: () => script.value,
  speed: () => props.speed,
  typeSpeed: () => props.typeSpeed,
  loop: () => props.loop,
  loopDelay: () => props.loopDelay,
  onUpdate: (s) => {
    state.value = s
    running.value = player.running
    if (player.running) nextTick(follow)
  },
  onDone: () => emit('done'),
})

function follow() {
  const el = body.value
  if (el && el.scrollHeight > el.clientHeight) el.scrollTop = el.scrollHeight
}

function sync() {
  running.value = player.running
}

function play() {
  if (prefersReducedMotion()) return skip()
  played.value = true
  player.play()
  sync()
}

function pause() {
  player.pause()
  sync()
}

function restart() {
  if (prefersReducedMotion()) return skip()
  played.value = true
  player.restart()
  sync()
}

function skip() {
  player.skip()
  sync()
}

let copyTimer: ReturnType<typeof setTimeout> | undefined
async function copy() {
  const text = terminalCommands(script.value)
  await copyTerminalText(text)
  copied.value = true
  clearTimeout(copyTimer)
  copyTimer = setTimeout(() => (copied.value = false), 1600)
  emit('copy', text)
}

let stopObserving: (() => void) | undefined

onMounted(() => {
  if (!props.autoplay || prefersReducedMotion() || !root.value) return
  // Hold the finished height so the page doesn't jump while lines appear.
  if (props.height === undefined && body.value) lockedHeight.value = `${body.value.offsetHeight}px`
  player.reset()
  stopObserving = observeInView(root.value, play, { once: !props.loop, onLeave: props.loop ? pause : undefined })
})

watch(
  () => JSON.stringify(props.lines),
  () => {
    if (player.running) player.restart()
    else if (state.value.finished) player.showFinal()
  },
)

onBeforeUnmount(() => {
  player.destroy()
  stopObserving?.()
  clearTimeout(copyTimer)
})

defineExpose({ play, pause, restart, skip, copy })
</script>

<template>
  <figure
    ref="root"
    :class="['ml-terminal', { 'ml-terminal--playing': running, 'ml-terminal--paws': dots === 'paw' }]"
    :aria-label="loc.terminal.label(title)"
  >
    <div class="ml-terminal__head">
      <span class="ml-terminal__dots" aria-hidden="true">
        <span v-for="d in ['close', 'min', 'max']" :key="d" :class="['ml-terminal__dot', `ml-terminal__dot--${d}`]"><MlPaw v-if="dots === 'paw'" tone="current" :shine="false" /></span>
      </span>
      <span class="ml-terminal__title">{{ title }}</span>
      <span class="ml-terminal__actions">
        <button v-if="played && state.finished && !running && !loop" type="button" class="ml-terminal__action" @click="restart">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" /></svg>{{ loc.terminal.replay }}
        </button>
        <button v-if="copyable" type="button" class="ml-terminal__action" @click="copy">
          <svg v-if="!copied" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M8 8h11v13H8zM5 16H4V3h11v1" /></svg>
          <MlPaw v-else tone="current" :shine="false" />{{ copied ? loc.terminal.copied : loc.terminal.copy }}
        </button>
      </span>
    </div>
    <div ref="body" class="ml-terminal__body" :style="bodyStyle" aria-hidden="true">
      <div v-for="row in rows" :key="row.index" :class="terminalRowClass(row)">
        <span v-if="row.prompt !== undefined" class="ml-terminal__prompt">{{ row.prompt }}</span>
        <span v-if="row.spinner" class="ml-terminal__spinner">{{ row.spinner }}</span>
        <span v-if="row.mark" class="ml-terminal__mark">{{ row.mark }}</span>
        <span class="ml-terminal__text"><span v-for="(seg, j) in row.segments" :key="j" :class="segmentClass(seg)">{{ seg.text }}</span><span v-if="row.caret" class="ml-terminal__caret" /></span>
        <span v-if="row.meter" class="ml-terminal__meter"><span class="ml-terminal__fill">{{ row.meter.fill }}</span><span class="ml-terminal__rest">{{ row.meter.rest }}</span></span>
        <span v-if="row.meter" class="ml-terminal__pct">{{ row.meter.pct }}</span>
      </div>
    </div>
    <pre class="ml-visually-hidden">{{ transcript }}</pre>
  </figure>
</template>
