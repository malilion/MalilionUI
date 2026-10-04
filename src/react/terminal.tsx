import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Paw } from './basic'
import { useLocale } from './locale'
import { cx, len } from './utils'
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
  type TerminalPlayer,
} from '../components/terminal'

export type { MlTerminalLine, MlTerminalLineType, MlTerminalTone, MlTerminalScript, MlTerminalStyle, TerminalSegment } from '../components/terminal'
export { parseTerminalMarkup, terminalPlainText, terminalTranscript, normalizeTerminalLines } from '../components/terminal'

const reducedMotion = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function observeInView(el: Element, onEnter: () => void, { once = true, onLeave }: { once?: boolean; onLeave?: () => void } = {}) {
  if (typeof IntersectionObserver === 'undefined') {
    onEnter()
    return () => {}
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          onEnter()
          if (once) io.disconnect()
        } else onLeave?.()
      }
    },
    { threshold: 0.15 },
  )
  io.observe(el)
  return () => io.disconnect()
}

// useLayoutEffect warns during SSR; the animation only ever starts on the client.
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

export interface TerminalProps {
  /** The script. A plain string is an output line. */
  lines: MlTerminalScript
  title?: string
  prompt?: string
  /** Start when scrolled into view. Without it the finished transcript shows until play(). */
  autoplay?: boolean
  loop?: boolean
  /** ms between loops. */
  loopDelay?: number
  /** Playback multiplier: 2 = twice as fast. */
  speed?: number
  /** Base ms per typed character (jittered). */
  typeSpeed?: number
  /** A button in the title bar that copies every input command. */
  copyable?: boolean
  dots?: 'rivet' | 'paw'
  height?: number | string
  maxHeight?: number | string
  /** Characters in a progress bar. */
  meterWidth?: number
  onDone?: () => void
  onCopy?: (commands: string) => void
  className?: string
  style?: CSSProperties
}

export interface TerminalHandle {
  play: () => void
  pause: () => void
  restart: () => void
  skip: () => void
  copy: () => Promise<void>
}

export const Terminal = forwardRef<TerminalHandle, TerminalProps>(function Terminal(
  {
    lines,
    title = 'malilion@den: ~',
    prompt = '❯',
    autoplay = true,
    loop = false,
    loopDelay = 2400,
    speed = 1,
    typeSpeed = 55,
    copyable = false,
    dots = 'rivet',
    height,
    maxHeight,
    meterWidth = 24,
    onDone,
    onCopy,
    className,
    style,
  },
  ref,
) {
  const loc = useLocale()
  const linesKey = JSON.stringify(lines)
  const script = useMemo(() => normalizeTerminalLines(lines), [linesKey])
  // Server render and first client render both show the finished transcript, so
  // hydration matches and no-JS readers get everything; the animation starts in an effect.
  const [state, setState] = useState(() => terminalFinalState(script.length))
  const [running, setRunning] = useState(false)
  const [played, setPlayed] = useState(false)
  const [copied, setCopied] = useState(false)
  const [lockedHeight, setLockedHeight] = useState<string>()
  const root = useRef<HTMLElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const copyTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  const latest = useRef({ script, speed, typeSpeed, loop, loopDelay, onDone, onCopy })
  latest.current = { script, speed, typeSpeed, loop, loopDelay, onDone, onCopy }

  const playerRef = useRef<TerminalPlayer | null>(null)
  if (!playerRef.current) {
    playerRef.current = createTerminalPlayer({
      lines: () => latest.current.script,
      speed: () => latest.current.speed,
      typeSpeed: () => latest.current.typeSpeed,
      loop: () => latest.current.loop,
      loopDelay: () => latest.current.loopDelay,
      onUpdate: (s) => {
        setState(s)
        setRunning(playerRef.current!.running)
      },
      onDone: () => latest.current.onDone?.(),
    })
  }
  const player = playerRef.current

  const sync = useCallback(() => setRunning(player.running), [player])
  const skip = useCallback(() => {
    player.skip()
    sync()
  }, [player, sync])
  const play = useCallback(() => {
    if (reducedMotion()) return skip()
    setPlayed(true)
    player.play()
    sync()
  }, [player, skip, sync])
  const pause = useCallback(() => {
    player.pause()
    sync()
  }, [player, sync])
  const restart = useCallback(() => {
    if (reducedMotion()) return skip()
    setPlayed(true)
    player.restart()
    sync()
  }, [player, skip, sync])
  const copy = useCallback(async () => {
    const text = terminalCommands(latest.current.script)
    await copyTerminalText(text)
    setCopied(true)
    clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopied(false), 1600)
    latest.current.onCopy?.(text)
  }, [])

  useImperativeHandle(ref, () => ({ play, pause, restart, skip, copy }), [play, pause, restart, skip, copy])

  useIsoLayoutEffect(() => {
    if (!autoplay || reducedMotion() || !root.current) return
    // Hold the finished height so the page doesn't jump while lines appear.
    if (height === undefined && body.current) setLockedHeight(`${body.current.offsetHeight}px`)
    player.reset()
    const stop = observeInView(root.current, play, { once: !loop, onLeave: loop ? pause : undefined })
    return () => {
      stop()
      player.destroy()
    }
    // Mount-time decision, like the Vue component.
  }, [])

  // A new script: replay if we were playing, otherwise show it finished.
  const firstScript = useRef(true)
  useEffect(() => {
    if (firstScript.current) {
      firstScript.current = false
      return
    }
    if (player.running) player.restart()
    else if (player.state.finished) player.showFinal()
  }, [script, player])

  // Follow the newest line while playing.
  useEffect(() => {
    const el = body.current
    if (running && el && el.scrollHeight > el.clientHeight) el.scrollTop = el.scrollHeight
  }, [state, running])

  useEffect(
    () => () => {
      player.destroy()
      clearTimeout(copyTimer.current)
    },
    [player],
  )

  const rows = terminalRows(script, state, prompt, meterWidth)
  const transcript = terminalTranscript(script, prompt)

  return (
    <figure
      ref={root}
      className={cx('ml-terminal', className, { 'ml-terminal--playing': running, 'ml-terminal--paws': dots === 'paw' })}
      style={style}
      aria-label={loc.terminal.label(title)}
    >
      <div className="ml-terminal__head">
        <span className="ml-terminal__dots" aria-hidden="true">
          {['close', 'min', 'max'].map((d) => (
            <span key={d} className={cx('ml-terminal__dot', `ml-terminal__dot--${d}`)}>
              {dots === 'paw' && <Paw tone="current" shine={false} />}
            </span>
          ))}
        </span>
        <span className="ml-terminal__title">{title}</span>
        <span className="ml-terminal__actions">
          {played && state.finished && !running && !loop && (
            <button type="button" className="ml-terminal__action" onClick={restart}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" />
              </svg>
              {loc.terminal.replay}
            </button>
          )}
          {copyable && (
            <button type="button" className="ml-terminal__action" onClick={copy}>
              {copied ? (
                <Paw tone="current" shine={false} />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path d="M8 8h11v13H8zM5 16H4V3h11v1" />
                </svg>
              )}
              {copied ? loc.terminal.copied : loc.terminal.copy}
            </button>
          )}
        </span>
      </div>
      <div ref={body} className="ml-terminal__body" style={{ height: len(height), maxHeight: len(maxHeight), minHeight: lockedHeight }} aria-hidden="true">
        {rows.map((row) => (
          <div key={row.index} className={terminalRowClass(row).join(' ')}>
            {row.prompt !== undefined && <span className="ml-terminal__prompt">{row.prompt}</span>}
            {row.spinner && <span className="ml-terminal__spinner">{row.spinner}</span>}
            {row.mark && <span className="ml-terminal__mark">{row.mark}</span>}
            <span className="ml-terminal__text">
              {row.segments.map((seg, j) => (
                <span key={j} className={segmentClass(seg).join(' ')}>
                  {seg.text}
                </span>
              ))}
              {row.caret && <span className="ml-terminal__caret" />}
            </span>
            {row.meter && (
              <span className="ml-terminal__meter">
                <span className="ml-terminal__fill">{row.meter.fill}</span>
                <span className="ml-terminal__rest">{row.meter.rest}</span>
              </span>
            )}
            {row.meter && <span className="ml-terminal__pct">{row.meter.pct}</span>}
          </div>
        ))}
      </div>
      <pre className="ml-visually-hidden">{transcript}</pre>
    </figure>
  )
})
