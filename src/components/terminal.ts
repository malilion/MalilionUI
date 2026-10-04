// Framework-free core of MlTerminal / <Terminal>: the tiny inline markup,
// script normalisation, the transcript, and the playback scheduler. Shared by
// the Vue and React components so both play (and render) exactly alike.

export type MlTerminalLineType = 'input' | 'output' | 'comment' | 'progress' | 'spinner' | 'blank'
export type MlTerminalTone = 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'dim'

export interface MlTerminalLine {
  /** Defaults to 'output'. */
  type?: MlTerminalLineType
  /** Supports inline markup: {green}ok{/}, {b}bold{/}. */
  text?: string
  /** ms to wait before this line starts (scaled by `speed`). */
  delay?: number
  /** Colours the whole line. */
  tone?: MlTerminalTone
  /** progress / spinner: ms until it completes. */
  duration?: number
  /** input: a prompt for this line only. */
  prompt?: string
  /** spinner: text shown while spinning (defaults to `text`). */
  pending?: string
}

/** A plain string is shorthand for an output line. */
export type MlTerminalScript = (MlTerminalLine | string)[]

export interface NormalizedTerminalLine extends MlTerminalLine {
  type: MlTerminalLineType
  text: string
}

export function normalizeTerminalLines(lines: MlTerminalScript | undefined): NormalizedTerminalLine[] {
  return (lines ?? []).map((l) =>
    typeof l === 'string' ? { type: 'output', text: l } : { ...l, type: l.type ?? 'output', text: l.text ?? '' },
  )
}

/* ── Markup ─────────────────────────────────────────────── */

/** Styles the markup understands. Anything else in braces stays literal text. */
export const TERMINAL_STYLES = ['b', 'i', 'u', 'dim', 'gold', 'green', 'red', 'yellow', 'cyan', 'pink'] as const
export type MlTerminalStyle = (typeof TERMINAL_STYLES)[number]

export interface TerminalSegment {
  text: string
  styles: MlTerminalStyle[]
}

const TAG = /\{(\/|[a-z]+)\}/g

/**
 * Parse `{green}ok{/}` style markup into styled text runs. Output is data, not
 * HTML: render each run as a text node inside a span, never with innerHTML.
 * `{/}` closes the innermost open style; unknown or unbalanced tags are text.
 */
export function parseTerminalMarkup(input: string): TerminalSegment[] {
  const out: TerminalSegment[] = []
  const stack: MlTerminalStyle[] = []
  const push = (text: string) => {
    if (!text) return
    const prev = out[out.length - 1]
    if (prev && prev.styles.join() === stack.join()) prev.text += text
    else out.push({ text, styles: [...stack] })
  }
  let last = 0
  for (const m of input.matchAll(TAG)) {
    const name = m[1]
    let handled = false
    if (name === '/') {
      if (stack.length) {
        push(input.slice(last, m.index))
        stack.pop()
        handled = true
      }
    } else if ((TERMINAL_STYLES as readonly string[]).includes(name)) {
      push(input.slice(last, m.index))
      stack.push(name as MlTerminalStyle)
      handled = true
    }
    if (handled) last = m.index! + m[0].length
  }
  push(input.slice(last))
  return out
}

export const terminalPlainText = (input: string) => parseTerminalMarkup(input).map((s) => s.text).join('')

/** The first `count` characters (code points) of a run list. */
export function sliceSegments(segments: TerminalSegment[], count: number): TerminalSegment[] {
  const out: TerminalSegment[] = []
  let left = count
  for (const seg of segments) {
    if (left <= 0) break
    const chars = Array.from(seg.text)
    if (chars.length <= left) out.push(seg)
    else out.push({ text: chars.slice(0, left).join(''), styles: seg.styles })
    left -= chars.length
  }
  return out
}

export const segmentLength = (segments: TerminalSegment[]) => segments.reduce((n, s) => n + Array.from(s.text).length, 0)

export const segmentClass = (seg: TerminalSegment) => ['ml-terminal__seg', ...seg.styles.map((s) => `ml-terminal__seg--${s}`)]

/* ── Pieces of a rendered line ──────────────────────────── */

export const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

export const spinnerMark = (tone?: MlTerminalTone) => (tone === 'danger' ? '✖' : tone === 'warning' ? '▲' : '✔')

export function progressBar(progress: number, width: number) {
  const p = Math.min(1, Math.max(0, progress))
  const filled = Math.round(p * width)
  return { fill: '█'.repeat(filled), rest: '░'.repeat(width - filled), pct: `${Math.round(p * 100)}%`.padStart(4, ' ') }
}

export interface TerminalRow {
  /** Script index; -1 for the idle prompt after the last line. */
  index: number
  type: MlTerminalLineType
  tone?: MlTerminalTone
  /** input lines only. */
  prompt?: string
  segments: TerminalSegment[]
  caret: boolean
  active: boolean
  /** progress lines only. */
  meter?: { fill: string; rest: string; pct: string }
  /** spinner while spinning. */
  spinner?: string
  /** spinner once resolved. */
  mark?: string
}

/** What to draw for `state`: one row per visible line, plus the idle prompt once finished. */
export function terminalRows(lines: NormalizedTerminalLine[], state: TerminalState, prompt: string, meterWidth = 24): TerminalRow[] {
  const rows: TerminalRow[] = []
  lines.forEach((line, index) => {
    const view = terminalLineView(state, index)
    if (view.phase === 'hidden') return
    const active = view.phase === 'active'
    const row: TerminalRow = { index, type: line.type, tone: line.tone, segments: parseTerminalMarkup(line.text), caret: false, active }
    if (line.type === 'input') {
      row.prompt = line.prompt ?? prompt
      if (view.phase === 'active') {
        row.segments = sliceSegments(row.segments, view.chars)
        row.caret = true
      }
    } else if (line.type === 'progress') {
      row.meter = progressBar(view.phase === 'active' ? view.progress : 1, meterWidth)
    } else if (line.type === 'spinner') {
      if (view.phase === 'active') {
        row.spinner = SPINNER_FRAMES[view.frame % SPINNER_FRAMES.length]
        if (line.pending !== undefined) row.segments = parseTerminalMarkup(line.pending)
      } else row.mark = spinnerMark(line.tone)
    }
    rows.push(row)
  })
  if (state.finished) rows.push({ index: -1, type: 'input', prompt, segments: [], caret: true, active: false })
  return rows
}

export const terminalRowClass = (row: TerminalRow) => [
  'ml-terminal__line',
  `ml-terminal__line--${row.type}`,
  row.tone ? `ml-terminal__line--${row.tone}` : '',
  row.active ? 'ml-terminal__line--active' : '',
  row.index < 0 ? 'ml-terminal__line--idle' : '',
].filter(Boolean)

/** Plain-text transcript of the finished script, for screen readers and copying. */
export function terminalTranscript(lines: NormalizedTerminalLine[], prompt: string): string {
  return lines
    .map((l) => {
      const text = terminalPlainText(l.text)
      switch (l.type) {
        case 'input':
          return `${l.prompt ?? prompt} ${text}`
        case 'progress':
          return `${text} 100%`.trim()
        case 'spinner':
          return `${spinnerMark(l.tone)} ${text}`
        case 'blank':
          return ''
        default:
          return text
      }
    })
    .join('\n')
}

/** Every input command, one per line — what the copy button copies. */
export const terminalCommands = (lines: NormalizedTerminalLine[]) =>
  lines.filter((l) => l.type === 'input').map((l) => terminalPlainText(l.text)).join('\n')

/** Clipboard API with a hidden-textarea fallback (insecure contexts, old Safari). */
export async function copyTerminalText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    if (typeof document === 'undefined') return false
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    let ok = false
    try {
      ok = document.execCommand('copy')
    } catch {
      ok = false
    }
    area.remove()
    return ok
  }
}

/* ── Playback ───────────────────────────────────────────── */

export interface TerminalState {
  /** Index of the line being played; lines before it are complete. */
  line: number
  /** Whether the current line is on screen yet (inputs show their prompt while waiting). */
  shown: boolean
  /** input: characters typed so far. */
  chars: number
  /** progress: 0–1. */
  progress: number
  /** spinner: frame counter. */
  frame: number
  /** Everything shown, nothing pending. */
  finished: boolean
}

export const terminalFinalState = (count: number): TerminalState => ({ line: count, shown: false, chars: 0, progress: 1, frame: 0, finished: true })
export const terminalInitialState = (): TerminalState => ({ line: 0, shown: false, chars: 0, progress: 0, frame: 0, finished: false })

/** How a line should look under `state`: hidden, finished, or mid-animation. */
export type TerminalLineView =
  | { phase: 'hidden' }
  | { phase: 'done' }
  | { phase: 'active'; chars: number; progress: number; frame: number }

export function terminalLineView(state: TerminalState, index: number): TerminalLineView {
  if (index < state.line) return { phase: 'done' }
  if (index === state.line && state.shown) return { phase: 'active', chars: state.chars, progress: state.progress, frame: state.frame }
  return { phase: 'hidden' }
}

export const TERMINAL_DEFAULT_DELAY: Record<MlTerminalLineType, number> = {
  input: 450,
  output: 70,
  comment: 70,
  blank: 70,
  progress: 180,
  spinner: 120,
}

export interface TerminalPlayerOptions {
  lines: () => NormalizedTerminalLine[]
  /** Playback multiplier: 2 = twice as fast. */
  speed?: () => number
  /** Base ms per typed character. */
  typeSpeed?: () => number
  loop?: () => boolean
  /** ms between the end and the next loop. */
  loopDelay?: () => number
  onUpdate: (state: TerminalState) => void
  onDone?: () => void
  random?: () => number
}

export interface TerminalPlayer {
  readonly state: TerminalState
  readonly running: boolean
  /** Start from the top, or resume after pause(). */
  play(): void
  pause(): void
  restart(): void
  /** Jump to the end. */
  skip(): void
  /** Back to the start without playing (the first prompt, waiting). */
  reset(): void
  /** Show the finished transcript without playing or emitting done. */
  showFinal(): void
  destroy(): void
}

export function createTerminalPlayer(o: TerminalPlayerOptions): TerminalPlayer {
  const random = o.random ?? Math.random
  const speed = () => Math.max(0.05, o.speed?.() ?? 1)
  let state = terminalFinalState(o.lines().length)
  let running = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let pending: { fn: () => void; ms: number } | null = null

  const emit = () => o.onUpdate({ ...state })
  const clear = () => {
    clearTimeout(timer)
    timer = undefined
  }
  const wait = (ms: number, fn: () => void) => {
    pending = { fn, ms: ms / speed() }
    timer = setTimeout(() => {
      pending = null
      fn()
    }, pending.ms)
  }

  function advance() {
    state = { ...state, line: state.line + 1, shown: false, chars: 0, progress: 0, frame: 0 }
    emit()
    stepLine()
  }

  function stepLine() {
    const lines = o.lines()
    if (state.line >= lines.length) return finish()
    const line = lines[state.line]
    const delay = line.delay ?? TERMINAL_DEFAULT_DELAY[line.type]
    if (line.type === 'input') {
      // The prompt and caret show while we "think", then the command types out.
      state = { ...state, shown: true }
      emit()
      const total = Array.from(terminalPlainText(line.text)).length
      const base = o.typeSpeed?.() ?? 55
      const typeNext = () => {
        if (state.chars >= total) return wait(320, advance)
        const typed = Array.from(terminalPlainText(line.text))[state.chars]
        state = { ...state, chars: state.chars + 1 }
        emit()
        // Natural rhythm: jitter every key, hesitate now and then, a beat after a space.
        let next = base * (0.55 + random() * 0.9)
        if (random() < 0.07) next += base * 3
        if (typed === ' ') next += base * 0.6
        wait(next, typeNext)
      }
      return wait(delay, typeNext)
    }
    wait(delay, () => {
      state = { ...state, shown: true }
      emit()
      if (line.type === 'progress') {
        const duration = line.duration ?? 1400
        const steps = Math.max(1, Math.round(duration / 60))
        const tick = () => {
          if (state.progress >= 1) return wait(220, advance)
          // Uneven chunks, like a real download.
          const step = (1 / steps) * (0.3 + random() * 1.4)
          state = { ...state, progress: Math.min(1, state.progress + step) }
          emit()
          wait(duration / steps, tick)
        }
        wait(duration / steps, tick)
      } else if (line.type === 'spinner') {
        const duration = line.duration ?? 1200
        let elapsed = 0
        const spin = () => {
          elapsed += 80
          if (elapsed >= duration) return advance()
          state = { ...state, frame: state.frame + 1 }
          emit()
          wait(80, spin)
        }
        wait(80, spin)
      } else advance()
    })
  }

  function finish() {
    state = terminalFinalState(o.lines().length)
    const again = !!o.loop?.()
    if (!again) {
      running = false
      pending = null
    }
    emit()
    o.onDone?.()
    if (again && running) wait(o.loopDelay?.() ?? 2400, restart)
  }

  function restart() {
    clear()
    pending = null
    running = true
    state = terminalInitialState()
    emit()
    stepLine()
  }

  return {
    get state() {
      return { ...state }
    },
    get running() {
      return running
    },
    play() {
      if (running) return
      if (pending && !state.finished) {
        running = true
        const { fn, ms } = pending
        timer = setTimeout(() => {
          pending = null
          fn()
        }, ms)
      } else restart()
    },
    pause() {
      if (!running) return
      running = false
      clear()
    },
    restart,
    skip() {
      clear()
      pending = null
      running = false
      const wasFinished = state.finished
      state = terminalFinalState(o.lines().length)
      emit()
      if (!wasFinished) o.onDone?.()
    },
    reset() {
      clear()
      pending = null
      running = false
      state = terminalInitialState()
      emit()
    },
    showFinal() {
      clear()
      pending = null
      running = false
      state = terminalFinalState(o.lines().length)
      emit()
    },
    destroy() {
      clear()
      pending = null
      running = false
    },
  }
}
