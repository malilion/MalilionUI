// Media player logic (framework-free, shared by MlVideoPlayer / MlAudioPlayer
// and their React twins): time labels, buffered ranges and the keyboard map.

export interface MlMediaSource {
  src: string
  /** MIME type, e.g. "video/webm". */
  type?: string
}

export interface MlMediaTrack {
  src: string
  kind?: 'subtitles' | 'captions'
  /** Language of the track, e.g. "zh-TW". */
  srclang?: string
  label: string
  default?: boolean
}

export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2]

/** 65 → "1:05", 3723 → "1:02:03". Unknown durations show "--:--". */
export function formatMediaTime(seconds: number, longest = seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '--:--'
  const s = Math.floor(seconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h > 0 || longest >= 3600 ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

/** "1.25×", "1×". */
export function formatRate(rate: number) {
  return `${Number(rate.toFixed(2))}×`
}

export function normalizeSources(src: string | MlMediaSource[] | undefined): MlMediaSource[] {
  if (!src) return []
  return typeof src === 'string' ? [{ src }] : src
}

/** End of the buffered range that contains `time` (what the bar shows as loaded). */
export function bufferedEnd(ranges: Pick<TimeRanges, 'length' | 'start' | 'end'> | null | undefined, time: number) {
  if (!ranges) return 0
  for (let i = 0; i < ranges.length; i++) if (ranges.start(i) <= time + 0.5 && time <= ranges.end(i)) return ranges.end(i)
  return 0
}

/** 0–1 share of the timeline, safe for unknown durations. */
export function mediaProgress(time: number, duration: number) {
  return duration > 0 && Number.isFinite(duration) ? Math.min(1, Math.max(0, time / duration)) : 0
}

export type PlayerAction =
  | { type: 'toggle' }
  | { type: 'seekBy'; seconds: number }
  | { type: 'seekTo'; fraction: number }
  | { type: 'volumeBy'; delta: number }
  | { type: 'mute' }
  | { type: 'fullscreen' }
  | { type: 'captions' }
  | { type: 'rateBy'; steps: number }

/**
 * YouTube-style shortcuts: Space / K play · ← → 5 s · J / L 10 s · ↑ ↓ volume ·
 * M mute · F fullscreen · C captions · 0–9 jump to 0–90 % · Shift + < > speed.
 */
export function playerKeyAction(key: string, shift = false): PlayerAction | null {
  switch (key) {
    case ' ':
    case 'k':
    case 'K':
      return { type: 'toggle' }
    case 'ArrowLeft':
      return { type: 'seekBy', seconds: -5 }
    case 'ArrowRight':
      return { type: 'seekBy', seconds: 5 }
    case 'j':
    case 'J':
      return { type: 'seekBy', seconds: -10 }
    case 'l':
    case 'L':
      return { type: 'seekBy', seconds: 10 }
    case 'ArrowUp':
      return { type: 'volumeBy', delta: 0.1 }
    case 'ArrowDown':
      return { type: 'volumeBy', delta: -0.1 }
    case 'm':
    case 'M':
      return { type: 'mute' }
    case 'f':
    case 'F':
      return { type: 'fullscreen' }
    case 'c':
    case 'C':
      return { type: 'captions' }
    case 'Home':
      return { type: 'seekTo', fraction: 0 }
    case 'End':
      return { type: 'seekTo', fraction: 1 }
    case '<':
    case ',':
      return shift || key === '<' ? { type: 'rateBy', steps: -1 } : null
    case '>':
    case '.':
      return shift || key === '>' ? { type: 'rateBy', steps: 1 } : null
  }
  if (/^[0-9]$/.test(key)) return { type: 'seekTo', fraction: +key / 10 }
  return null
}

/** The next rate up or down the list, staying put at the ends. */
export function stepRate(rates: number[], current: number, steps: number) {
  const sorted = [...rates].sort((a, b) => a - b)
  let i = sorted.findIndex((r) => r >= current - 1e-9)
  if (i < 0) i = sorted.length - 1
  return sorted[Math.max(0, Math.min(sorted.length - 1, i + steps))]
}

export const clampVolume = (v: number) => Math.round(Math.min(1, Math.max(0, v)) * 100) / 100

/** Controls hide after this long without pointer movement while a video plays. */
export const CONTROLS_IDLE = 2600

/** 24×24 icon paths the players draw that the shared icon set lacks. */
export const PLAYER_ICONS = {
  play: 'M8 5.5v13l10.5-6.5L8 5.5z',
  pause: 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z',
  replay: 'M4 12a8 8 0 108-8H8M8 4l-3 3 3 3',
  volume: 'M4 9.5h3.5L12 5.5v13l-4.5-4H4v-5zM15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11',
  volumeLow: 'M4 9.5h3.5L12 5.5v13l-4.5-4H4v-5zM15.5 9a4 4 0 010 6',
  muted: 'M4 9.5h3.5L12 5.5v13l-4.5-4H4v-5zM16 9.5l5 5M21 9.5l-5 5',
  fullscreen: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  exitFullscreen: 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5',
  captions: 'M3.5 5.5h17v13h-17zM10.5 10.2a2 2 0 100 3.6M17 10.2a2 2 0 100 3.6',
  pip: 'M3.5 5.5h17v13h-17zM12.5 12h6v4.5h-6z',
  back: 'M11 6.5L5.5 12l5.5 5.5M18.5 6.5L13 12l5.5 5.5',
  forward: 'M13 6.5l5.5 5.5-5.5 5.5M5.5 6.5L11 12l-5.5 5.5',
} as const

/* ── State ───────────────────────────────────────────── */

export interface PlayerState {
  playing: boolean
  /** Stalled waiting for data. */
  waiting: boolean
  ended: boolean
  error: boolean
  current: number
  duration: number
  /** Seconds loaded ahead of the playhead. */
  buffered: number
  volume: number
  muted: boolean
  rate: number
}

export const INITIAL_PLAYER_STATE: PlayerState = {
  playing: false,
  waiting: false,
  ended: false,
  error: false,
  current: 0,
  duration: 0,
  buffered: 0,
  volume: 1,
  muted: false,
  rate: 1,
}

function readMedia(media: HTMLMediaElement): Partial<PlayerState> {
  const duration = Number.isFinite(media.duration) ? media.duration : 0
  return {
    playing: !media.paused && !media.ended,
    ended: media.ended,
    current: media.currentTime,
    duration,
    buffered: bufferedEnd(media.buffered, media.currentTime),
    volume: media.volume,
    muted: media.muted,
    rate: media.playbackRate,
  }
}

const READ_EVENTS = ['play', 'pause', 'timeupdate', 'durationchange', 'loadedmetadata', 'progress', 'volumechange', 'ratechange', 'ended', 'seeked', 'emptied']

/** Keep `update` in step with a media element. Returns the detach function. */
export function attachPlayer(media: HTMLMediaElement, update: (patch: Partial<PlayerState>) => void) {
  const read = () => update(readMedia(media))
  const waiting = () => update({ waiting: true })
  const ready = () => update({ waiting: false, error: false })
  const failed = () => update({ error: true, waiting: false, playing: false })
  const reset = () => update({ error: false })
  for (const e of READ_EVENTS) media.addEventListener(e, read)
  media.addEventListener('waiting', waiting)
  media.addEventListener('playing', ready)
  media.addEventListener('canplay', ready)
  media.addEventListener('error', failed)
  media.addEventListener('loadstart', reset)
  read()
  if (media.error) failed()
  return () => {
    for (const e of READ_EVENTS) media.removeEventListener(e, read)
    media.removeEventListener('waiting', waiting)
    media.removeEventListener('playing', ready)
    media.removeEventListener('canplay', ready)
    media.removeEventListener('error', failed)
    media.removeEventListener('loadstart', reset)
  }
}

/** Play or pause; starting over once the media has ended. */
export function togglePlayback(media: HTMLMediaElement) {
  if (media.paused || media.ended) {
    if (media.ended) media.currentTime = 0
    // Autoplay policies may refuse; the state simply stays paused.
    void media.play()?.catch?.(() => {})
  } else media.pause()
}

export function seekMedia(media: HTMLMediaElement, seconds: number) {
  const max = Number.isFinite(media.duration) ? media.duration : Infinity
  media.currentTime = Math.max(0, Math.min(max, seconds))
}

/**
 * Run a keyboard action against the element. Fullscreen and captions belong to
 * the component, so they come back as `false` for it to handle.
 */
export function applyPlayerAction(media: HTMLMediaElement, action: PlayerAction, rates: number[]) {
  switch (action.type) {
    case 'toggle':
      togglePlayback(media)
      return true
    case 'seekBy':
      seekMedia(media, media.currentTime + action.seconds)
      return true
    case 'seekTo':
      if (Number.isFinite(media.duration)) seekMedia(media, media.duration * action.fraction)
      return true
    case 'volumeBy':
      media.volume = clampVolume(media.volume + action.delta)
      media.muted = media.volume === 0
      return true
    case 'mute':
      media.muted = !media.muted
      return true
    case 'rateBy':
      media.playbackRate = stepRate(rates, media.playbackRate, action.steps)
      return true
    default:
      return false
  }
}

/** Show exactly one text track (or none for -1). Only touches tracks that differ. */
export function showTextTrack(media: HTMLMediaElement, index: number) {
  const tracks = media.textTracks
  if (!tracks) return
  for (let i = 0; i < tracks.length; i++) {
    const mode = i === index ? 'showing' : 'disabled'
    if (tracks[i].mode !== mode) tracks[i].mode = mode
  }
}

/**
 * Keep the chosen track showing: browsers run their own automatic selection
 * (by language preference) after the tracks load, which would add a second one.
 */
export function holdTextTrack(media: HTMLMediaElement, index: () => number) {
  const tracks = media.textTracks
  const apply = () => showTextTrack(media, index())
  apply()
  if (!tracks?.addEventListener) return () => {}
  tracks.addEventListener('change', apply)
  tracks.addEventListener('addtrack', apply)
  media.addEventListener('loadedmetadata', apply)
  return () => {
    tracks.removeEventListener('change', apply)
    tracks.removeEventListener('addtrack', apply)
    media.removeEventListener('loadedmetadata', apply)
  }
}
