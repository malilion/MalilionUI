<script setup lang="ts">
import { computed, h, onBeforeUnmount, onMounted, reactive, ref, watch, type FunctionalComponent } from 'vue'
import {
  CONTROLS_IDLE,
  INITIAL_PLAYER_STATE,
  PLAYBACK_RATES,
  PLAYER_ICONS,
  applyPlayerAction,
  attachPlayer,
  clampVolume,
  formatMediaTime,
  formatRate,
  mediaProgress,
  normalizeSources,
  playerKeyAction,
  seekMedia,
  holdTextTrack,
  showTextTrack,
  togglePlayback,
  type MlMediaSource,
  type MlMediaTrack,
  type PlayerState,
} from './player'
import { useLocale } from '../locale'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    src?: string | MlMediaSource[]
    poster?: string
    /** Subtitles / captions (WebVTT). */
    tracks?: MlMediaTrack[]
    /** Shown over the top of the video, and the player's accessible name. */
    title?: string
    autoplay?: boolean
    muted?: boolean
    loop?: boolean
    preload?: 'none' | 'metadata' | 'auto'
    crossorigin?: 'anonymous' | 'use-credentials'
    /** Choices in the speed menu. */
    playbackRates?: number[]
    /** Width / height of the stage, e.g. "16 / 9" or "4 / 3". */
    aspectRatio?: string
  }>(),
  { tracks: () => [], preload: 'metadata', playbackRates: () => PLAYBACK_RATES, aspectRatio: '16 / 9' },
)
const emit = defineEmits<{ play: []; pause: []; ended: []; timeupdate: [time: number] }>()

const root = ref<HTMLElement>()
const media = ref<HTMLVideoElement>()
const state = reactive<PlayerState>({ ...INITIAL_PLAYER_STATE, muted: !!props.muted })
const sources = computed(() => normalizeSources(props.src))
const progress = computed(() => mediaProgress(state.current, state.duration))
const loaded = computed(() => mediaProgress(state.buffered, state.duration))
const longest = computed(() => state.duration)

const menu = ref<'rate' | 'captions' | null>(null)
const caption = ref(props.tracks.findIndex((t) => t.default))
let lastCaption = Math.max(0, caption.value)
const fullscreen = ref(false)
const pip = ref(false)
const idle = ref(false)

let detach: (() => void) | undefined
let release: (() => void) | undefined
onMounted(() => {
  const el = media.value!
  detach = attachPlayer(el, (patch) => Object.assign(state, patch))
  release = holdTextTrack(el, () => caption.value)
  pip.value = typeof document !== 'undefined' && !!document.pictureInPictureEnabled && typeof el.requestPictureInPicture === 'function'
  document.addEventListener('fullscreenchange', onFullscreenChange)
})
onBeforeUnmount(() => {
  detach?.()
  release?.()
  clearTimeout(idleTimer)
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  document.removeEventListener('pointerdown', onOutside)
})
watch(caption, (i) => media.value && showTextTrack(media.value, i))

function toggle() {
  if (media.value) togglePlayback(media.value)
}
function seek(event: Event) {
  if (media.value) seekMedia(media.value, (event.target as HTMLInputElement).valueAsNumber)
}
function setVolume(event: Event) {
  const el = media.value
  if (!el) return
  el.volume = clampVolume((event.target as HTMLInputElement).valueAsNumber)
  el.muted = el.volume === 0
}
function toggleMute() {
  if (media.value) media.value.muted = !media.value.muted
}
function setRate(rate: number) {
  if (media.value) media.value.playbackRate = rate
  menu.value = null
}
function setCaption(i: number) {
  caption.value = i
  if (i >= 0) lastCaption = i
  menu.value = null
}
function toggleCaptions() {
  if (!props.tracks.length) return
  setCaption(caption.value >= 0 ? -1 : lastCaption)
}

function onFullscreenChange() {
  fullscreen.value = !!root.value && document.fullscreenElement === root.value
}
function toggleFullscreen() {
  const el = root.value
  if (!el) return
  if (document.fullscreenElement) void document.exitFullscreen?.()
  else if (el.requestFullscreen) void el.requestFullscreen().catch(() => {})
  // iPhone Safari only lets the <video> itself go full screen.
  else (media.value as HTMLVideoElement & { webkitEnterFullscreen?: () => void })?.webkitEnterFullscreen?.()
}
function togglePip() {
  const el = media.value
  if (!el) return
  if (document.pictureInPictureElement) void document.exitPictureInPicture()
  else void el.requestPictureInPicture?.().catch(() => {})
}

function openMenu(which: 'rate' | 'captions') {
  menu.value = menu.value === which ? null : which
}
function onOutside(event: PointerEvent) {
  if (!(event.target as Element).closest?.('.ml-player__menu-wrap')) menu.value = null
}
watch(menu, (m) => {
  document.removeEventListener('pointerdown', onOutside)
  if (m) document.addEventListener('pointerdown', onOutside)
})

/* Controls fade out while playing and the pointer rests. */
let idleTimer: ReturnType<typeof setTimeout> | undefined
function wake() {
  idle.value = false
  clearTimeout(idleTimer)
  idleTimer = setTimeout(() => {
    if (state.playing && !menu.value && !root.value?.querySelector('.ml-player__bar:focus-within')) idle.value = true
  }, CONTROLS_IDLE)
}
watch(
  () => state.playing,
  (playing) => (playing ? wake() : (idle.value = false)),
)

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && menu.value) {
    menu.value = null
    return
  }
  const target = event.target as HTMLElement
  // Sliders and menu buttons handle their own keys.
  if (target.matches('input[type="range"]') && event.key.startsWith('Arrow')) return
  if (target.matches('button') && (event.key === ' ' || event.key === 'Enter')) return
  if (event.metaKey || event.ctrlKey || event.altKey) return
  const action = playerKeyAction(event.key, event.shiftKey)
  const el = media.value
  if (!action || !el) return
  event.preventDefault()
  wake()
  if (applyPlayerAction(el, action, props.playbackRates)) return
  if (action.type === 'fullscreen') toggleFullscreen()
  else if (action.type === 'captions') toggleCaptions()
}

defineExpose({
  play: () => media.value?.play(),
  pause: () => media.value?.pause(),
  seek: (seconds: number) => media.value && seekMedia(media.value, seconds),
  toggleFullscreen,
  media,
})

const Icon: FunctionalComponent<{ d: string; filled?: boolean }> = ({ d, filled }) =>
  h('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false', fill: filled ? 'currentColor' : 'none', stroke: filled ? 'none' : 'currentColor', 'stroke-width': 1.8, 'stroke-linejoin': 'round' }, [h('path', { d })])
</script>

<template>
  <div
    ref="root"
    :class="[
      'ml-player',
      'ml-player--video',
      { 'ml-player--playing': state.playing, 'ml-player--idle': idle, 'ml-player--fullscreen': fullscreen, 'ml-player--error': state.error },
    ]"
    role="region"
    :aria-label="title ?? loc.player.video"
    tabindex="0"
    @keydown="onKeydown"
    @pointermove="wake"
  >
    <div class="ml-player__stage" :style="{ aspectRatio }">
      <video
        ref="media"
        class="ml-player__media"
        :poster="poster"
        :preload="preload"
        :autoplay="autoplay"
        :muted="muted"
        :loop="loop"
        :crossorigin="crossorigin"
        playsinline
        @click="toggle"
        @dblclick="toggleFullscreen"
        @play="emit('play')"
        @pause="emit('pause')"
        @ended="emit('ended')"
        @timeupdate="emit('timeupdate', ($event.target as HTMLMediaElement).currentTime)"
      >
        <source v-for="s in sources" :key="s.src" :src="s.src" :type="s.type" />
        <track v-for="t in tracks" :key="t.src" :src="t.src" :kind="t.kind ?? 'subtitles'" :srclang="t.srclang" :label="t.label" :default="t.default" />
      </video>
      <div v-if="title" class="ml-player__top"><span class="ml-player__title">{{ title }}</span></div>
      <button v-if="!state.playing && !state.waiting && !state.error" type="button" class="ml-player__big" :aria-label="state.ended ? loc.player.replay : loc.player.play" @click="toggle">
        <Icon :d="state.ended ? PLAYER_ICONS.replay : PLAYER_ICONS.play" :filled="!state.ended" />
      </button>
      <span v-if="state.waiting && !state.error" class="ml-player__spinner" role="status" :aria-label="loc.player.loading" />
      <p v-if="state.error" class="ml-player__error" role="alert">{{ loc.player.error }}</p>
    </div>
    <div class="ml-player__bar">
      <input
        class="ml-player__seek"
        type="range"
        min="0"
        :max="state.duration || 0"
        step="any"
        :value="state.current"
        :aria-label="loc.player.seek"
        :aria-valuetext="loc.player.time(formatMediaTime(state.current, longest), formatMediaTime(state.duration))"
        :style="{ '--_p': progress, '--_b': loaded }"
        @input="seek"
      />
      <div class="ml-player__controls">
        <button type="button" class="ml-player__btn" :aria-label="state.playing ? loc.player.pause : loc.player.play" @click="toggle">
          <Icon :d="state.playing ? PLAYER_ICONS.pause : PLAYER_ICONS.play" filled />
        </button>
        <div class="ml-player__volume">
          <button type="button" class="ml-player__btn" :aria-label="state.muted ? loc.player.unmute : loc.player.mute" @click="toggleMute">
            <Icon :d="state.muted || state.volume === 0 ? PLAYER_ICONS.muted : state.volume < 0.5 ? PLAYER_ICONS.volumeLow : PLAYER_ICONS.volume" />
          </button>
          <input
            class="ml-player__vol"
            type="range"
            min="0"
            max="1"
            step="0.05"
            :value="state.muted ? 0 : state.volume"
            :aria-label="loc.player.volume"
            :style="{ '--_p': state.muted ? 0 : state.volume }"
            @input="setVolume"
          />
        </div>
        <span class="ml-player__time">{{ formatMediaTime(state.current, longest) }} / {{ formatMediaTime(state.duration) }}</span>
        <span class="ml-player__spacer" />
        <div class="ml-player__menu-wrap">
          <button type="button" class="ml-player__btn ml-player__rate" aria-haspopup="menu" :aria-expanded="menu === 'rate'" :aria-label="loc.player.speed" @click="openMenu('rate')">
            {{ formatRate(state.rate) }}
          </button>
          <div v-if="menu === 'rate'" class="ml-player__menu" role="menu" :aria-label="loc.player.speed">
            <button
              v-for="r in playbackRates"
              :key="r"
              type="button"
              role="menuitemradio"
              :aria-checked="r === state.rate"
              :class="['ml-player__option', { 'ml-player__option--active': r === state.rate }]"
              @click="setRate(r)"
            >
              {{ r === 1 ? loc.player.normal : formatRate(r) }}
            </button>
          </div>
        </div>
        <div v-if="tracks.length" class="ml-player__menu-wrap">
          <button
            type="button"
            :class="['ml-player__btn', { 'ml-player__btn--on': caption >= 0 }]"
            aria-haspopup="menu"
            :aria-expanded="menu === 'captions'"
            :aria-label="loc.player.captions"
            @click="openMenu('captions')"
          >
            <Icon :d="PLAYER_ICONS.captions" />
          </button>
          <div v-if="menu === 'captions'" class="ml-player__menu" role="menu" :aria-label="loc.player.captions">
            <button type="button" role="menuitemradio" :aria-checked="caption < 0" :class="['ml-player__option', { 'ml-player__option--active': caption < 0 }]" @click="setCaption(-1)">
              {{ loc.player.captionsOff }}
            </button>
            <button
              v-for="(t, i) in tracks"
              :key="t.src"
              type="button"
              role="menuitemradio"
              :aria-checked="caption === i"
              :class="['ml-player__option', { 'ml-player__option--active': caption === i }]"
              @click="setCaption(i)"
            >
              {{ t.label }}
            </button>
          </div>
        </div>
        <button v-if="pip" type="button" class="ml-player__btn" :aria-label="loc.player.pip" @click="togglePip">
          <Icon :d="PLAYER_ICONS.pip" />
        </button>
        <button type="button" class="ml-player__btn" :aria-label="fullscreen ? loc.player.exitFullscreen : loc.player.fullscreen" @click="toggleFullscreen">
          <Icon :d="fullscreen ? PLAYER_ICONS.exitFullscreen : PLAYER_ICONS.fullscreen" />
        </button>
      </div>
    </div>
  </div>
</template>
