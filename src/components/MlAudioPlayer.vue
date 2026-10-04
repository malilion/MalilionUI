<script setup lang="ts">
import { computed, h, onBeforeUnmount, onMounted, reactive, ref, type FunctionalComponent } from 'vue'
import {
  INITIAL_PLAYER_STATE,
  PLAYBACK_RATES,
  PLAYER_ICONS,
  applyPlayerAction,
  attachPlayer,
  formatMediaTime,
  formatRate,
  mediaProgress,
  normalizeSources,
  playerKeyAction,
  seekMedia,
  stepRate,
  togglePlayback,
  type MlMediaSource,
  type PlayerState,
} from './player'
import { useLocale } from '../locale'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    src?: string | MlMediaSource[]
    title?: string
    artist?: string
    /** Album art. Without it, a spinning steel disc. */
    cover?: string
    autoplay?: boolean
    loop?: boolean
    preload?: 'none' | 'metadata' | 'auto'
    /** The speed button steps through these. */
    playbackRates?: number[]
    /** Seconds the back / forward buttons skip. */
    skip?: number
  }>(),
  { preload: 'metadata', playbackRates: () => PLAYBACK_RATES, skip: 10 },
)
const emit = defineEmits<{ play: []; pause: []; ended: []; timeupdate: [time: number] }>()

const media = ref<HTMLAudioElement>()
const state = reactive<PlayerState>({ ...INITIAL_PLAYER_STATE })
const sources = computed(() => normalizeSources(props.src))
const progress = computed(() => mediaProgress(state.current, state.duration))
const loaded = computed(() => mediaProgress(state.buffered, state.duration))

let detach: (() => void) | undefined
onMounted(() => (detach = attachPlayer(media.value!, (patch) => Object.assign(state, patch))))
onBeforeUnmount(() => detach?.())

function toggle() {
  if (media.value) togglePlayback(media.value)
}
function skipBy(seconds: number) {
  if (media.value) seekMedia(media.value, media.value.currentTime + seconds)
}
function seek(event: Event) {
  if (media.value) seekMedia(media.value, (event.target as HTMLInputElement).valueAsNumber)
}
function toggleMute() {
  if (media.value) media.value.muted = !media.value.muted
}
function cycleRate() {
  const el = media.value
  if (!el) return
  const sorted = [...props.playbackRates].sort((a, b) => a - b)
  el.playbackRate = el.playbackRate >= sorted[sorted.length - 1] ? sorted[0] : stepRate(sorted, el.playbackRate + 0.001, 0)
}

function onKeydown(event: KeyboardEvent) {
  const target = event.target as HTMLElement
  if (target.matches('input[type="range"]') && event.key.startsWith('Arrow')) return
  if (target.matches('button') && (event.key === ' ' || event.key === 'Enter')) return
  if (event.metaKey || event.ctrlKey || event.altKey) return
  const action = playerKeyAction(event.key, event.shiftKey)
  if (!action || !media.value) return
  if (applyPlayerAction(media.value, action, props.playbackRates)) event.preventDefault()
}

defineExpose({
  play: () => media.value?.play(),
  pause: () => media.value?.pause(),
  seek: (seconds: number) => media.value && seekMedia(media.value, seconds),
  media,
})

const Icon: FunctionalComponent<{ d: string; filled?: boolean }> = ({ d, filled }) =>
  h('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false', fill: filled ? 'currentColor' : 'none', stroke: filled ? 'none' : 'currentColor', 'stroke-width': 1.8, 'stroke-linejoin': 'round' }, [h('path', { d })])
</script>

<template>
  <div
    :class="['ml-player', 'ml-player--audio', { 'ml-player--playing': state.playing, 'ml-player--error': state.error }]"
    role="region"
    :aria-label="title ?? loc.player.audio"
    tabindex="0"
    @keydown="onKeydown"
  >
    <audio
      ref="media"
      class="ml-player__media"
      :preload="preload"
      :autoplay="autoplay"
      :loop="loop"
      @play="emit('play')"
      @pause="emit('pause')"
      @ended="emit('ended')"
      @timeupdate="emit('timeupdate', ($event.target as HTMLMediaElement).currentTime)"
    >
      <source v-for="s in sources" :key="s.src" :src="s.src" :type="s.type" />
    </audio>
    <div class="ml-player__cover" aria-hidden="true">
      <img v-if="cover" :src="cover" alt="" class="ml-player__art" />
      <span v-else class="ml-player__disc" />
    </div>
    <div class="ml-player__main">
      <div class="ml-player__meta">
        <span v-if="title" class="ml-player__title">{{ title }}</span>
        <span v-if="artist" class="ml-player__artist">{{ artist }}</span>
        <span class="ml-player__eq" aria-hidden="true"><i /><i /><i /><i /></span>
      </div>
      <input
        class="ml-player__seek"
        type="range"
        min="0"
        :max="state.duration || 0"
        step="any"
        :value="state.current"
        :aria-label="loc.player.seek"
        :aria-valuetext="loc.player.time(formatMediaTime(state.current, state.duration), formatMediaTime(state.duration))"
        :style="{ '--_p': progress, '--_b': loaded }"
        @input="seek"
      />
      <div class="ml-player__controls">
        <span class="ml-player__time">{{ formatMediaTime(state.current, state.duration) }}</span>
        <span class="ml-player__spacer" />
        <button type="button" class="ml-player__btn" :aria-label="loc.player.back(skip)" @click="skipBy(-skip)">
          <Icon :d="PLAYER_ICONS.back" />
        </button>
        <button type="button" class="ml-player__btn ml-player__play" :aria-label="state.playing ? loc.player.pause : loc.player.play" @click="toggle">
          <Icon :d="state.playing ? PLAYER_ICONS.pause : PLAYER_ICONS.play" filled />
        </button>
        <button type="button" class="ml-player__btn" :aria-label="loc.player.forward(skip)" @click="skipBy(skip)">
          <Icon :d="PLAYER_ICONS.forward" />
        </button>
        <span class="ml-player__spacer" />
        <span class="ml-player__time">{{ formatMediaTime(state.duration) }}</span>
      </div>
      <p v-if="state.error" class="ml-player__error" role="alert">{{ loc.player.error }}</p>
    </div>
    <div class="ml-player__side">
      <button type="button" class="ml-player__btn ml-player__rate" :aria-label="`${loc.player.speed} ${formatRate(state.rate)}`" @click="cycleRate">{{ formatRate(state.rate) }}</button>
      <button type="button" class="ml-player__btn" :aria-label="state.muted ? loc.player.unmute : loc.player.mute" @click="toggleMute">
        <Icon :d="state.muted ? PLAYER_ICONS.muted : PLAYER_ICONS.volume" />
      </button>
    </div>
  </div>
</template>
