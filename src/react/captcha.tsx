import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { icons } from '../components/icons'
import { PAW_PAD, PAW_TOES } from '../components/paw'
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
} from '../components/captcha'
import { useLocale } from './locale'
import { cx } from './utils'

export { captchaHit, captchaPiecePath, captchaTarget } from '../components/captcha'
export type { MlCaptchaAttempt, MlCaptchaTarget, MlCaptchaTone, CaptchaState } from '../components/captcha'

export interface SliderCaptchaProps {
  /** Background picture. Without one a paw-print pattern is drawn. */
  src?: string
  /** Picture size in px (it shrinks with a narrow container). Default 320 × 160. */
  width?: number
  height?: number
  tone?: MlCaptchaTone
  /** How far off (px of the picture) still counts. Default 6. */
  tolerance?: number
  /** Failed tries before a new picture is dealt. 0 = never. Default 5. */
  maxAttempts?: number
  /** Same seed, same gaps (for tests and demos). */
  seed?: number
  /** Put the gap here instead (e.g. from your server); listen to `onRefresh` to fetch a new one. */
  target?: MlCaptchaTarget
  /** Judge an attempt yourself (e.g. on the server). Without it the gap position decides. */
  verify?: (attempt: MlCaptchaAttempt) => boolean | Promise<boolean>
  disabled?: boolean
  /** Instruction under the picture. */
  hint?: string
  onSuccess?: (attempt: MlCaptchaAttempt) => void
  onFail?: (attempt: MlCaptchaAttempt) => void
  onRefresh?: () => void
  className?: string
}

export interface SliderCaptchaHandle {
  /** Slide the piece back and try again (same picture). */
  reset: () => void
  /** A new picture and gap. */
  refresh: () => void
}

export const SliderCaptcha = forwardRef<SliderCaptchaHandle, SliderCaptchaProps>(function SliderCaptcha(
  {
    src,
    width = 320,
    height = 160,
    tone = 'gold',
    tolerance = 6,
    maxAttempts = 5,
    seed,
    target: targetProp,
    verify,
    disabled = false,
    hint,
    onSuccess,
    onFail,
    onRefresh,
    className,
  },
  ref,
) {
  const loc = useLocale()
  const uid = `ml-captcha-${useId().replace(/:/g, '')}`
  const [seedNow, setSeedNow] = useState(() => captchaSeed(seed ?? 1, 0))
  const [state, setState] = useState<CaptchaState>('idle')
  const [value, setValue] = useState(0)
  const [announce, setAnnounce] = useState('')
  const round = useRef(0)
  const attempts = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const art = captchaArt(width, height, seedNow)
  const target = targetProp ?? captchaTarget(width, height, captchaRandom(seedNow))
  const max = captchaMax(width)
  const pieceX = Math.round(CAPTCHA_START + value * (max - CAPTCHA_START))
  const gap = captchaPiecePath(target.x, target.y)
  const locked = disabled || state === 'checking' || state === 'success'

  const live = useRef({ pieceX, target, locked, state, value, props: { tolerance, maxAttempts, verify, onSuccess, onFail, onRefresh }, loc })
  live.current = { pieceX, target, locked, state, value, props: { tolerance, maxAttempts, verify, onSuccess, onFail, onRefresh }, loc }

  // Server render and hydration share seed 1; a real gap is dealt in the browser.
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      if (seed === undefined) setSeedNow(captchaSeed(undefined, 0))
      return
    }
    round.current = 0
    attempts.current = 0
    setSeedNow(captchaSeed(seed ?? 1, 0))
    reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed])

  function reset() {
    clearTimeout(timer.current)
    setState('idle')
    setValue(0)
    live.current.state = 'idle'
    live.current.value = 0
  }

  function refresh() {
    clearTimeout(timer.current)
    round.current++
    attempts.current = 0
    setSeedNow(captchaSeed(seed, round.current))
    reset()
    live.current.props.onRefresh?.()
  }

  const started = useRef(0)
  const track = useRef<[number, number][]>([])

  async function check(x = live.current.pieceX) {
    const l = live.current
    if (l.locked) return
    const attempt: MlCaptchaAttempt = { x, target: { ...l.target }, duration: started.current ? Date.now() - started.current : 0, track: track.current }
    started.current = 0
    track.current = []
    let ok: boolean
    try {
      const answer = l.props.verify ? l.props.verify(attempt) : captchaHit(attempt.x, attempt.target, l.props.tolerance)
      if (typeof answer === 'boolean') ok = answer
      else {
        setState('checking')
        live.current.locked = true
        setAnnounce(l.loc.captcha.checking)
        ok = await answer
      }
    } catch {
      ok = false
    }
    if (ok) {
      setState('success')
      setAnnounce(l.loc.captcha.success)
      l.props.onSuccess?.(attempt)
      return
    }
    setState('fail')
    live.current.state = 'fail'
    attempts.current++
    setAnnounce(l.loc.captcha.fail)
    l.props.onFail?.(attempt)
    timer.current = setTimeout(() => {
      const { maxAttempts: most } = live.current.props
      if (most > 0 && attempts.current >= most) {
        refreshRef.current()
        setAnnounce(live.current.loc.captcha.locked)
      } else reset()
    }, 700)
  }
  const refreshRef = useRef(refresh)
  refreshRef.current = refresh

  /* ── Pointer ── */
  const trackEl = useRef<HTMLDivElement>(null)
  const listeners = useRef<{ move: (e: PointerEvent) => void; up: (e: PointerEvent) => void } | null>(null)

  function stopListening() {
    const l = listeners.current
    if (l) {
      window.removeEventListener('pointermove', l.move)
      window.removeEventListener('pointerup', l.up)
      window.removeEventListener('pointercancel', l.up)
    }
    listeners.current = null
  }
  useEffect(
    () => () => {
      clearTimeout(timer.current)
      stopListening()
    },
    [],
  )

  function onPointerDown(event: ReactPointerEvent) {
    if (locked || event.button !== 0 || !trackEl.current || state === 'fail') return
    event.preventDefault()
    const span = Math.max(1, trackEl.current.getBoundingClientRect().width - 44)
    const drag = { id: event.pointerId, x: event.clientX, from: value, span }
    setState('dragging')
    started.current = Date.now()
    track.current = [[0, pieceX]]
    const toX = (v: number) => Math.round(CAPTCHA_START + v * (max - CAPTCHA_START))
    let latest = value
    const move = (e: PointerEvent) => {
      if (e.pointerId !== drag.id) return
      latest = Math.min(1, Math.max(0, drag.from + (e.clientX - drag.x) / drag.span))
      setValue(latest)
      track.current.push([Date.now() - started.current, toX(latest)])
    }
    const up = (e: PointerEvent) => {
      if (e.pointerId !== drag.id) return
      stopListening()
      setState('idle')
      live.current.state = 'idle'
      void check(toX(latest))
    }
    listeners.current = { move, up }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  /* ── Keyboard ── */
  function onKeyDown(event: KeyboardEvent) {
    if (locked || state === 'fail') return
    const step = (event.shiftKey ? 10 : 1) / (max - CAPTCHA_START)
    if (!started.current) {
      started.current = Date.now()
      track.current = [[0, pieceX]]
    }
    let next = value
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next = Math.min(1, value + step)
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next = Math.max(0, value - step)
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = 1
    else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      void check()
      return
    } else return
    event.preventDefault()
    setValue(next)
    track.current.push([Date.now() - started.current, Math.round(CAPTCHA_START + next * (max - CAPTCHA_START))])
  }

  const api = useRef({ reset, refresh })
  api.current = { reset, refresh }
  useImperativeHandle(ref, () => ({ reset: () => api.current.reset(), refresh: () => api.current.refresh() }), [])

  const handleIcon = state === 'success' ? icons.check : state === 'fail' ? icons.close : icons.arrowRight

  return (
    <div
      className={cx('ml-captcha', `ml-captcha--${tone}`, `ml-captcha--${state}`, { 'ml-captcha--disabled': disabled }, className)}
      style={{ '--_w': `${width}px`, '--_ratio': `${width} / ${height}`, '--_v': value.toFixed(4) } as CSSProperties}
      role="group"
      aria-label={loc.captcha.label}
    >
      <div className="ml-captcha__stage">
        <svg className="ml-captcha__svg" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
          <defs>
            <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="1" y2="1">
              <stop className="ml-captcha__stop ml-captcha__stop--a" offset="0" />
              <stop className="ml-captcha__stop ml-captcha__stop--b" offset="0.55" />
              <stop className="ml-captcha__stop ml-captcha__stop--c" offset="1" />
            </linearGradient>
            <g id={`${uid}-bg`}>
              {src ? (
                <image href={src} x="0" y="0" width={width} height={height} preserveAspectRatio="xMidYMid slice" />
              ) : (
                <>
                  <rect x="0" y="0" width={width} height={height} fill={`url(#${uid}-sky)`} />
                  {art.dots.map((d, i) => (
                    <circle key={`d${i}`} className="ml-captcha__dot" cx={d.cx} cy={d.cy} r={d.r} opacity={d.o} />
                  ))}
                  {art.paws.map((p, i) => (
                    <g key={`p${i}`} className="ml-captcha__paw" opacity={p.o} transform={`translate(${p.x} ${p.y}) rotate(${p.r} 12 12) scale(${p.s})`}>
                      {PAW_TOES.map((t) => (
                        <ellipse key={t.cx} cx={t.cx} cy={t.cy} rx={t.rx} ry={t.ry} transform={`rotate(${t.rotate} ${t.cx} ${t.cy})`} />
                      ))}
                      <path d={PAW_PAD} />
                    </g>
                  ))}
                </>
              )}
            </g>
            <clipPath id={`${uid}-cut`}>
              <path d={gap} />
            </clipPath>
          </defs>
          <use href={`#${uid}-bg`} />
          <path className="ml-captcha__gap" d={gap} />
          <g className="ml-captcha__piece" style={{ translate: `${pieceX - target.x}px 0px` }}>
            <use href={`#${uid}-bg`} clipPath={`url(#${uid}-cut)`} />
            <path className="ml-captcha__edge" d={gap} />
          </g>
        </svg>
        <button type="button" className="ml-captcha__refresh" aria-label={loc.captcha.refresh} disabled={disabled || state === 'checking'} onClick={refresh}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d={icons.rotate} />
          </svg>
        </button>
        {(state === 'success' || state === 'fail') && (
          <p className="ml-captcha__note" aria-hidden="true">
            {state === 'success' ? loc.captcha.success : loc.captcha.fail}
          </p>
        )}
      </div>
      <div ref={trackEl} className="ml-captcha__track">
        <div className="ml-captcha__fill" />
        <span className="ml-captcha__hint" aria-hidden="true">
          {state === 'checking' ? loc.captcha.checking : (hint ?? loc.captcha.hint)}
        </span>
        <div
          className="ml-captcha__handle"
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label={loc.captcha.slider}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={pieceX}
          aria-disabled={locked ? true : undefined}
          onPointerDown={onPointerDown}
          onKeyDown={onKeyDown}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d={handleIcon} />
          </svg>
        </div>
      </div>
      <p className="ml-visually-hidden" aria-live="polite">
        {announce}
      </p>
    </div>
  )
})
