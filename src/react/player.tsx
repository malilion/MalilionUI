import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type KeyboardEvent, type RefObject } from 'react'
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
  stepRate,
  togglePlayback,
  type MlMediaSource,
  type MlMediaTrack,
  type PlayerState,
} from '../components/player'
import { useLocale } from './locale'
import { cx } from './utils'

function Icon({ d, filled }: { d: string; filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill={filled ? 'currentColor' : 'none'} stroke={filled ? 'none' : 'currentColor'} strokeWidth={1.8} strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

/** Mirror a media element's state into React. */
function usePlayerState(media: RefObject<HTMLMediaElement | null>, initial?: Partial<PlayerState>) {
  const [state, setState] = useState<PlayerState>(() => ({ ...INITIAL_PLAYER_STATE, ...initial }))
  useEffect(() => {
    const el = media.current
    if (!el) return
    return attachPlayer(el, (patch) => setState((s) => ({ ...s, ...patch })))
  }, [media])
  return state
}

/** Keys a slider or a focused button already handles itself. */
function ownKey(e: KeyboardEvent<HTMLElement>) {
  const target = e.target as HTMLElement
  return (
    (target.matches('input[type="range"]') && e.key.startsWith('Arrow')) || (target.matches('button') && (e.key === ' ' || e.key === 'Enter')) || e.metaKey || e.ctrlKey || e.altKey
  )
}

export interface PlayerHandle {
  play(): Promise<void> | undefined
  pause(): void
  seek(seconds: number): void
  media: HTMLMediaElement | null
}

/* ── VideoPlayer ───────────────────────────────────────── */

export interface VideoPlayerHandle extends PlayerHandle {
  toggleFullscreen(): void
}

export interface VideoPlayerProps {
  src?: string | MlMediaSource[]
  poster?: string
  /** Subtitles / captions (WebVTT). */
  tracks?: MlMediaTrack[]
  /** Shown over the top of the video, and the player's accessible name. */
  title?: string
  autoPlay?: boolean
  muted?: boolean
  loop?: boolean
  preload?: 'none' | 'metadata' | 'auto'
  crossOrigin?: 'anonymous' | 'use-credentials'
  /** Choices in the speed menu. */
  playbackRates?: number[]
  /** Width / height of the stage, e.g. "16 / 9" or "4 / 3". */
  aspectRatio?: string
  onPlay?: () => void
  onPause?: () => void
  onEnded?: () => void
  onTimeUpdate?: (time: number) => void
  className?: string
}

const NO_TRACKS: MlMediaTrack[] = []

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(function VideoPlayer(
  {
    src,
    poster,
    tracks = NO_TRACKS,
    title,
    autoPlay,
    muted,
    loop,
    preload = 'metadata',
    crossOrigin,
    playbackRates = PLAYBACK_RATES,
    aspectRatio = '16 / 9',
    onPlay,
    onPause,
    onEnded,
    onTimeUpdate,
    className,
  },
  ref,
) {
  const loc = useLocale()
  const root = useRef<HTMLDivElement>(null)
  const media = useRef<HTMLVideoElement>(null)
  const state = usePlayerState(media, { muted: !!muted })
  const sources = normalizeSources(src)
  const progress = mediaProgress(state.current, state.duration)
  const loaded = mediaProgress(state.buffered, state.duration)

  const [menu, setMenu] = useState<'rate' | 'captions' | null>(null)
  const [caption, setCaptionState] = useState(() => tracks.findIndex((t) => t.default))
  const lastCaption = useRef(Math.max(0, caption))
  const [fullscreen, setFullscreen] = useState(false)
  const [pip, setPip] = useState(false)
  const [idle, setIdle] = useState(false)

  useEffect(() => {
    const el = media.current
    setPip(!!document.pictureInPictureEnabled && typeof el?.requestPictureInPicture === 'function')
    const onChange = () => setFullscreen(!!root.current && document.fullscreenElement === root.current)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])
  const captionRef = useRef(caption)
  captionRef.current = caption
  useEffect(() => (media.current ? holdTextTrack(media.current, () => captionRef.current) : undefined), [])
  useEffect(() => {
    if (media.current) showTextTrack(media.current, caption)
  }, [caption])
  useEffect(() => {
    if (!menu) return
    const onOutside = (e: PointerEvent) => {
      if (!(e.target as Element).closest?.('.ml-player__menu-wrap')) setMenu(null)
    }
    document.addEventListener('pointerdown', onOutside)
    return () => document.removeEventListener('pointerdown', onOutside)
  }, [menu])

  const toggle = () => media.current && togglePlayback(media.current)
  const setCaption = (i: number) => {
    setCaptionState(i)
    if (i >= 0) lastCaption.current = i
    setMenu(null)
  }
  const toggleCaptions = () => tracks.length && setCaption(caption >= 0 ? -1 : lastCaption.current)
  const toggleFullscreen = () => {
    const el = root.current
    if (!el) return
    if (document.fullscreenElement) void document.exitFullscreen?.()
    else if (el.requestFullscreen) void el.requestFullscreen().catch(() => {})
    // iPhone Safari only lets the <video> itself go full screen.
    else (media.current as HTMLVideoElement & { webkitEnterFullscreen?: () => void })?.webkitEnterFullscreen?.()
  }
  const togglePip = () => {
    if (document.pictureInPictureElement) void document.exitPictureInPicture()
    else void media.current?.requestPictureInPicture?.().catch(() => {})
  }

  /* Controls fade out while playing and the pointer rests. */
  const idleTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const latest = useRef({ playing: state.playing, menu })
  latest.current = { playing: state.playing, menu }
  const wake = () => {
    setIdle(false)
    clearTimeout(idleTimer.current)
    idleTimer.current = setTimeout(() => {
      if (latest.current.playing && !latest.current.menu && !root.current?.querySelector('.ml-player__bar:focus-within')) setIdle(true)
    }, CONTROLS_IDLE)
  }
  useEffect(() => {
    if (state.playing) wake()
    else setIdle(false)
  }, [state.playing])
  useEffect(() => () => clearTimeout(idleTimer.current), [])

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape' && menu) {
      setMenu(null)
      return
    }
    if (ownKey(e)) return
    const action = playerKeyAction(e.key, e.shiftKey)
    const el = media.current
    if (!action || !el) return
    e.preventDefault()
    wake()
    if (applyPlayerAction(el, action, playbackRates)) return
    if (action.type === 'fullscreen') toggleFullscreen()
    else if (action.type === 'captions') toggleCaptions()
  }

  useImperativeHandle(ref, () => ({
    play: () => media.current?.play(),
    pause: () => media.current?.pause(),
    seek: (s) => media.current && seekMedia(media.current, s),
    toggleFullscreen,
    get media() {
      return media.current
    },
  }))

  return (
    <div
      ref={root}
      className={cx('ml-player', 'ml-player--video', className, {
        'ml-player--playing': state.playing,
        'ml-player--idle': idle,
        'ml-player--fullscreen': fullscreen,
        'ml-player--error': state.error,
      })}
      role="region"
      aria-label={title ?? loc.player.video}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerMove={wake}
    >
      <div className="ml-player__stage" style={{ aspectRatio }}>
        <video
          ref={media}
          className="ml-player__media"
          poster={poster}
          preload={preload}
          autoPlay={autoPlay}
          muted={muted}
          loop={loop}
          crossOrigin={crossOrigin}
          playsInline
          onClick={toggle}
          onDoubleClick={toggleFullscreen}
          onPlay={onPlay}
          onPause={onPause}
          onEnded={onEnded}
          onTimeUpdate={(e) => onTimeUpdate?.(e.currentTarget.currentTime)}
        >
          {sources.map((s) => (
            <source key={s.src} src={s.src} type={s.type} />
          ))}
          {tracks.map((t) => (
            <track key={t.src} src={t.src} kind={t.kind ?? 'subtitles'} srcLang={t.srclang} label={t.label} default={t.default} />
          ))}
        </video>
        {title && (
          <div className="ml-player__top">
            <span className="ml-player__title">{title}</span>
          </div>
        )}
        {!state.playing && !state.waiting && !state.error && (
          <button type="button" className="ml-player__big" aria-label={state.ended ? loc.player.replay : loc.player.play} onClick={toggle}>
            <Icon d={state.ended ? PLAYER_ICONS.replay : PLAYER_ICONS.play} filled={!state.ended} />
          </button>
        )}
        {state.waiting && !state.error && <span className="ml-player__spinner" role="status" aria-label={loc.player.loading} />}
        {state.error && (
          <p className="ml-player__error" role="alert">
            {loc.player.error}
          </p>
        )}
      </div>
      <div className="ml-player__bar">
        <input
          className="ml-player__seek"
          type="range"
          min={0}
          max={state.duration || 0}
          step="any"
          value={state.current}
          aria-label={loc.player.seek}
          aria-valuetext={loc.player.time(formatMediaTime(state.current, state.duration), formatMediaTime(state.duration))}
          style={{ '--_p': progress, '--_b': loaded } as CSSProperties}
          onChange={(e) => media.current && seekMedia(media.current, e.currentTarget.valueAsNumber)}
        />
        <div className="ml-player__controls">
          <button type="button" className="ml-player__btn" aria-label={state.playing ? loc.player.pause : loc.player.play} onClick={toggle}>
            <Icon d={state.playing ? PLAYER_ICONS.pause : PLAYER_ICONS.play} filled />
          </button>
          <div className="ml-player__volume">
            <button type="button" className="ml-player__btn" aria-label={state.muted ? loc.player.unmute : loc.player.mute} onClick={() => media.current && (media.current.muted = !media.current.muted)}>
              <Icon d={state.muted || state.volume === 0 ? PLAYER_ICONS.muted : state.volume < 0.5 ? PLAYER_ICONS.volumeLow : PLAYER_ICONS.volume} />
            </button>
            <input
              className="ml-player__vol"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={state.muted ? 0 : state.volume}
              aria-label={loc.player.volume}
              style={{ '--_p': state.muted ? 0 : state.volume } as CSSProperties}
              onChange={(e) => {
                const el = media.current
                if (!el) return
                el.volume = clampVolume(e.currentTarget.valueAsNumber)
                el.muted = el.volume === 0
              }}
            />
          </div>
          <span className="ml-player__time">
            {formatMediaTime(state.current, state.duration)} / {formatMediaTime(state.duration)}
          </span>
          <span className="ml-player__spacer" />
          <div className="ml-player__menu-wrap">
            <button
              type="button"
              className="ml-player__btn ml-player__rate"
              aria-haspopup="menu"
              aria-expanded={menu === 'rate'}
              aria-label={loc.player.speed}
              onClick={() => setMenu(menu === 'rate' ? null : 'rate')}
            >
              {formatRate(state.rate)}
            </button>
            {menu === 'rate' && (
              <div className="ml-player__menu" role="menu" aria-label={loc.player.speed}>
                {playbackRates.map((r) => (
                  <button
                    key={r}
                    type="button"
                    role="menuitemradio"
                    aria-checked={r === state.rate}
                    className={cx('ml-player__option', { 'ml-player__option--active': r === state.rate })}
                    onClick={() => {
                      if (media.current) media.current.playbackRate = r
                      setMenu(null)
                    }}
                  >
                    {r === 1 ? loc.player.normal : formatRate(r)}
                  </button>
                ))}
              </div>
            )}
          </div>
          {tracks.length > 0 && (
            <div className="ml-player__menu-wrap">
              <button
                type="button"
                className={cx('ml-player__btn', { 'ml-player__btn--on': caption >= 0 })}
                aria-haspopup="menu"
                aria-expanded={menu === 'captions'}
                aria-label={loc.player.captions}
                onClick={() => setMenu(menu === 'captions' ? null : 'captions')}
              >
                <Icon d={PLAYER_ICONS.captions} />
              </button>
              {menu === 'captions' && (
                <div className="ml-player__menu" role="menu" aria-label={loc.player.captions}>
                  <button type="button" role="menuitemradio" aria-checked={caption < 0} className={cx('ml-player__option', { 'ml-player__option--active': caption < 0 })} onClick={() => setCaption(-1)}>
                    {loc.player.captionsOff}
                  </button>
                  {tracks.map((t, i) => (
                    <button
                      key={t.src}
                      type="button"
                      role="menuitemradio"
                      aria-checked={caption === i}
                      className={cx('ml-player__option', { 'ml-player__option--active': caption === i })}
                      onClick={() => setCaption(i)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {pip && (
            <button type="button" className="ml-player__btn" aria-label={loc.player.pip} onClick={togglePip}>
              <Icon d={PLAYER_ICONS.pip} />
            </button>
          )}
          <button type="button" className="ml-player__btn" aria-label={fullscreen ? loc.player.exitFullscreen : loc.player.fullscreen} onClick={toggleFullscreen}>
            <Icon d={fullscreen ? PLAYER_ICONS.exitFullscreen : PLAYER_ICONS.fullscreen} />
          </button>
        </div>
      </div>
    </div>
  )
})

/* ── AudioPlayer ───────────────────────────────────────── */

export interface AudioPlayerProps {
  src?: string | MlMediaSource[]
  title?: string
  artist?: string
  /** Album art. Without it, a spinning steel disc. */
  cover?: string
  autoPlay?: boolean
  loop?: boolean
  preload?: 'none' | 'metadata' | 'auto'
  /** The speed button steps through these. */
  playbackRates?: number[]
  /** Seconds the back / forward buttons skip. */
  skip?: number
  onPlay?: () => void
  onPause?: () => void
  onEnded?: () => void
  onTimeUpdate?: (time: number) => void
  className?: string
}

export const AudioPlayer = forwardRef<PlayerHandle, AudioPlayerProps>(function AudioPlayer(
  { src, title, artist, cover, autoPlay, loop, preload = 'metadata', playbackRates = PLAYBACK_RATES, skip = 10, onPlay, onPause, onEnded, onTimeUpdate, className },
  ref,
) {
  const loc = useLocale()
  const media = useRef<HTMLAudioElement>(null)
  const state = usePlayerState(media)
  const sources = normalizeSources(src)
  const progress = mediaProgress(state.current, state.duration)
  const loaded = mediaProgress(state.buffered, state.duration)

  const toggle = () => media.current && togglePlayback(media.current)
  const skipBy = (s: number) => media.current && seekMedia(media.current, media.current.currentTime + s)
  const cycleRate = () => {
    const el = media.current
    if (!el) return
    const sorted = [...playbackRates].sort((a, b) => a - b)
    el.playbackRate = el.playbackRate >= sorted[sorted.length - 1] ? sorted[0] : stepRate(sorted, el.playbackRate + 0.001, 0)
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (ownKey(e)) return
    const action = playerKeyAction(e.key, e.shiftKey)
    if (action && media.current && applyPlayerAction(media.current, action, playbackRates)) e.preventDefault()
  }

  useImperativeHandle(ref, () => ({
    play: () => media.current?.play(),
    pause: () => media.current?.pause(),
    seek: (s) => media.current && seekMedia(media.current, s),
    get media() {
      return media.current
    },
  }))

  return (
    <div
      className={cx('ml-player', 'ml-player--audio', className, { 'ml-player--playing': state.playing, 'ml-player--error': state.error })}
      role="region"
      aria-label={title ?? loc.player.audio}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <audio
        ref={media}
        className="ml-player__media"
        preload={preload}
        autoPlay={autoPlay}
        loop={loop}
        onPlay={onPlay}
        onPause={onPause}
        onEnded={onEnded}
        onTimeUpdate={(e) => onTimeUpdate?.(e.currentTarget.currentTime)}
      >
        {sources.map((s) => (
          <source key={s.src} src={s.src} type={s.type} />
        ))}
      </audio>
      <div className="ml-player__cover" aria-hidden="true">
        {cover ? <img src={cover} alt="" className="ml-player__art" /> : <span className="ml-player__disc" />}
      </div>
      <div className="ml-player__main">
        <div className="ml-player__meta">
          {title && <span className="ml-player__title">{title}</span>}
          {artist && <span className="ml-player__artist">{artist}</span>}
          <span className="ml-player__eq" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
        </div>
        <input
          className="ml-player__seek"
          type="range"
          min={0}
          max={state.duration || 0}
          step="any"
          value={state.current}
          aria-label={loc.player.seek}
          aria-valuetext={loc.player.time(formatMediaTime(state.current, state.duration), formatMediaTime(state.duration))}
          style={{ '--_p': progress, '--_b': loaded } as CSSProperties}
          onChange={(e) => media.current && seekMedia(media.current, e.currentTarget.valueAsNumber)}
        />
        <div className="ml-player__controls">
          <span className="ml-player__time">{formatMediaTime(state.current, state.duration)}</span>
          <span className="ml-player__spacer" />
          <button type="button" className="ml-player__btn" aria-label={loc.player.back(skip)} onClick={() => skipBy(-skip)}>
            <Icon d={PLAYER_ICONS.back} />
          </button>
          <button type="button" className="ml-player__btn ml-player__play" aria-label={state.playing ? loc.player.pause : loc.player.play} onClick={toggle}>
            <Icon d={state.playing ? PLAYER_ICONS.pause : PLAYER_ICONS.play} filled />
          </button>
          <button type="button" className="ml-player__btn" aria-label={loc.player.forward(skip)} onClick={() => skipBy(skip)}>
            <Icon d={PLAYER_ICONS.forward} />
          </button>
          <span className="ml-player__spacer" />
          <span className="ml-player__time">{formatMediaTime(state.duration)}</span>
        </div>
        {state.error && (
          <p className="ml-player__error" role="alert">
            {loc.player.error}
          </p>
        )}
      </div>
      <div className="ml-player__side">
        <button type="button" className="ml-player__btn ml-player__rate" aria-label={`${loc.player.speed} ${formatRate(state.rate)}`} onClick={cycleRate}>
          {formatRate(state.rate)}
        </button>
        <button type="button" className="ml-player__btn" aria-label={state.muted ? loc.player.unmute : loc.player.mute} onClick={() => media.current && (media.current.muted = !media.current.muted)}>
          <Icon d={state.muted ? PLAYER_ICONS.muted : PLAYER_ICONS.volume} />
        </button>
      </div>
    </div>
  )
})
