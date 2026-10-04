import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { prefersReducedMotion } from '../composables'
import { pawBurst } from '../pawStamp'
import { scratchCleared, scratchPaint, scratchStroke, type MlScratchTone } from '../components/scratch'
import { useLocale } from './locale'
import { cx, useControllable } from './utils'

export type { MlScratchTone } from '../components/scratch'

export interface ScratchCardProps {
  /** Card size in px (it shrinks with a narrow container). Default 300 × 150. */
  width?: number
  height?: number
  /** The coating's metal. Default gold. */
  tone?: MlScratchTone
  /** Text printed on the coating. */
  coverText?: string
  /** Width of a scratch, px. Default 28. */
  brush?: number
  /** Share scratched off (0–1) that reveals the rest. Default 0.5. */
  threshold?: number
  /** Paw confetti on reveal. Default true. */
  confetti?: boolean
  disabled?: boolean
  /** Revealed (controlled). Set back to false for a fresh coating. */
  revealed?: boolean
  defaultRevealed?: boolean
  onRevealedChange?: (revealed: boolean) => void
  onReveal?: () => void
  onProgress?: (ratio: number) => void
  /** The prize under the coating. */
  children?: ReactNode
  className?: string
}

export interface ScratchCardHandle {
  reveal: () => void
  reset: () => void
}

export const ScratchCard = forwardRef<ScratchCardHandle, ScratchCardProps>(function ScratchCard(
  {
    width = 300,
    height = 150,
    tone = 'gold',
    coverText,
    brush = 28,
    threshold = 0.5,
    confetti = true,
    disabled = false,
    revealed: revealedProp,
    defaultRevealed = false,
    onRevealedChange,
    onReveal,
    onProgress,
    children,
    className,
  },
  ref,
) {
  const loc = useLocale()
  const [revealed, setRevealed] = useControllable(revealedProp, defaultRevealed, onRevealedChange)
  const [ready, setReady] = useState(false)
  const [scratching, setScratching] = useState(false)
  const [announce, setAnnounce] = useState('')
  const canvas = useRef<HTMLCanvasElement>(null)
  const root = useRef<HTMLDivElement>(null)
  const ctx = useRef<CanvasRenderingContext2D | null>(null)
  const text = coverText ?? loc.scratch.cover

  useEffect(() => {
    if (revealed || !canvas.current) return
    ctx.current = scratchPaint(canvas.current, width, height, tone, text, window.devicePixelRatio || 1)
    setReady(!!ctx.current)
  }, [width, height, tone, text, revealed])

  useEffect(() => {
    if (!revealed) setAnnounce('')
  }, [revealed])

  const live = useRef({ revealed, threshold, confetti, onReveal, onProgress, loc })
  live.current = { revealed, threshold, confetti, onReveal, onProgress, loc }

  function reveal() {
    const l = live.current
    if (l.revealed) return
    l.revealed = true
    setRevealed(true)
    setScratching(false)
    setAnnounce(l.loc.scratch.revealed)
    l.onReveal?.()
    if (l.confetti && root.current && !prefersReducedMotion()) {
      const r = root.current.getBoundingClientRect()
      pawBurst(r.left + r.width / 2, r.top + r.height / 2, { count: 18, spread: 360, power: Math.max(120, r.width * 0.5) })
    }
  }
  const reset = () => setRevealed(false)
  const api = useRef({ reveal, reset })
  api.current = { reveal, reset }
  useImperativeHandle(ref, () => ({ reveal: () => api.current.reveal(), reset: () => api.current.reset() }), [])

  const last = useRef<{ x: number; y: number } | null>(null)
  const moves = useRef(0)

  function point(event: ReactPointerEvent) {
    const r = canvas.current!.getBoundingClientRect()
    const k = width / (r.width || width)
    return { x: (event.clientX - r.left) * k, y: (event.clientY - r.top) * k }
  }
  function measure() {
    if (!ctx.current) return
    const ratio = scratchCleared(ctx.current)
    live.current.onProgress?.(ratio)
    if (ratio >= live.current.threshold) reveal()
  }
  function onPointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (disabled || revealed || !ctx.current || event.button !== 0) return
    event.preventDefault()
    canvas.current!.setPointerCapture?.(event.pointerId)
    setScratching(true)
    last.current = point(event)
    scratchStroke(ctx.current, last.current, last.current, brush)
  }
  function onPointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!scratching || !ctx.current || !last.current) return
    const p = point(event)
    scratchStroke(ctx.current, last.current, p, brush)
    last.current = p
    if (++moves.current % 8 === 0) measure()
  }
  function onPointerUp() {
    if (!scratching) return
    setScratching(false)
    last.current = null
    measure()
  }

  return (
    <div
      ref={root}
      className={cx(
        'ml-scratch',
        `ml-scratch--${tone}`,
        { 'ml-scratch--ready': ready, 'ml-scratch--revealed': revealed, 'ml-scratch--scratching': scratching, 'ml-scratch--disabled': disabled },
        className,
      )}
      style={{ '--_w': `${width}px`, '--_ratio': `${width} / ${height}` } as CSSProperties}
      role="group"
      aria-label={loc.scratch.label}
    >
      <div className="ml-scratch__prize" aria-hidden={revealed ? undefined : true} inert={!revealed}>
        {children}
      </div>
      <div className="ml-scratch__cover" aria-hidden="true">
        <span>{text}</span>
      </div>
      <canvas
        ref={canvas}
        className="ml-scratch__canvas"
        aria-hidden="true"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
      {!revealed && (
        <button type="button" className="ml-scratch__reveal" disabled={disabled} title={loc.scratch.hint} onClick={reveal}>
          {loc.scratch.revealNow}
        </button>
      )}
      <p className="ml-visually-hidden" aria-live="polite">
        {announce}
      </p>
    </div>
  )
})
