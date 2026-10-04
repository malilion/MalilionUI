import { forwardRef, useEffect, useId, useImperativeHandle, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import { prefersReducedMotion } from '../composables'
import { pawBurst } from '../pawStamp'
import {
  PUZZLE_TAB,
  puzzleClock,
  puzzleEdges,
  puzzleGrid,
  puzzleNeighbour,
  puzzlePiecePath,
  puzzlePlaced,
  puzzleRandom,
  puzzleShuffle,
  puzzleSolved,
  puzzleSwap,
  type MlPuzzleResult,
  type MlPuzzleTone,
  type PuzzleDirection,
  type PuzzleEdges,
} from '../components/puzzle'
import { useLocale } from './locale'
import { cx } from './utils'

export { puzzleEdges, puzzlePiecePath, puzzleRandom, puzzleShuffle, puzzleSolved, puzzleSwap } from '../components/puzzle'
export type { MlPuzzleResult, MlPuzzleTone, PuzzleEdges, PuzzleDirection } from '../components/puzzle'

export interface PuzzleProps {
  /** Picture to cut up. Without one the pieces are numbered gradient tiles. */
  src?: string
  /** What the picture shows (part of the puzzle's accessible name). */
  alt?: string
  /** Default 3. */
  rows?: number
  /** Default 3. */
  cols?: number
  /** Board width ÷ height. Default cols ÷ rows (square pieces). The picture is cropped to fit. */
  ratio?: number
  /** Board width in px (it never overflows its container). Default 360. */
  width?: number
  /** Same seed, same cut and shuffle. Without one each mount is different. */
  seed?: number
  /** Pieces in the right place stay put. Default true. */
  lock?: boolean
  /** A faint copy of the picture under the board. Default true. */
  ghost?: boolean
  /** Piece numbers. Default: on when there's no picture. */
  numbers?: boolean
  tone?: MlPuzzleTone
  /** Paw confetti when solved. Default true. */
  confetti?: boolean
  /** Moves / progress bar with a shuffle button. Default true. */
  toolbar?: boolean
  disabled?: boolean
  label?: string
  onMove?: (from: number, to: number, moves: number) => void
  onComplete?: (result: MlPuzzleResult) => void
  onShuffle?: () => void
  className?: string
}

export interface PuzzleHandle {
  shuffle: () => void
  /** Put every piece in place (counts as finishing, without a move). */
  solve: () => void
}

interface Game {
  edges: PuzzleEdges
  order: number[]
  moves: number
  startedAt: number
  selected: number | null
  done: boolean
}

const KEYS: Record<string, PuzzleDirection> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }
const CELL_W = 100

export const Puzzle = forwardRef<PuzzleHandle, PuzzleProps>(function Puzzle(
  {
    src,
    alt,
    rows: rowsProp = 3,
    cols: colsProp = 3,
    ratio,
    width = 360,
    seed,
    lock = true,
    ghost = true,
    numbers,
    tone = 'gold',
    confetti = true,
    toolbar = true,
    disabled = false,
    label,
    onMove,
    onComplete,
    onShuffle,
    className,
  },
  ref,
) {
  const loc = useLocale()
  const uid = `ml-puzzle-${useId().replace(/:/g, '')}`
  const rows = puzzleGrid(rowsProp, 3)
  const cols = puzzleGrid(colsProp, 3)
  const count = rows * cols
  const cellH = (CELL_W * cols) / (ratio && ratio > 0 ? ratio : cols / rows) / rows
  const W = CELL_W * cols
  const H = cellH * rows
  const pad = Math.ceil(PUZZLE_TAB * Math.min(CELL_W, cellH)) + 4
  const showNumbers = numbers ?? !src

  const fresh = (random: () => number, edges?: PuzzleEdges): Game => ({
    edges: edges ?? puzzleEdges(rows, cols, random),
    order: puzzleShuffle(count, random),
    moves: 0,
    startedAt: 0,
    selected: null,
    done: false,
  })
  const [game, setGame] = useState<Game>(() => ({
    ...fresh(puzzleRandom((seed ?? 1) + 7), puzzleEdges(rows, cols, puzzleRandom(seed ?? 1))),
  }))
  const [focusCell, setFocusCell] = useState(0)
  const [announce, setAnnounce] = useState('')
  const [drag, setDrag] = useState<{ cell: number; dx: number; dy: number; active: boolean } | null>(null)

  const latest = useRef({ game, props: { lock, disabled, confetti, onMove, onComplete }, rows, cols, cellH, W, pad, loc })
  latest.current = { game, props: { lock, disabled, confetti, onMove, onComplete }, rows, cols, cellH, W, pad, loc }

  // A new grid (or a fresh mount without a seed) deals a new cut.
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      if (seed === undefined) setGame(fresh(Math.random))
      return
    }
    setGame(fresh(seed === undefined ? puzzleRandom(Date.now()) : puzzleRandom(seed)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, cols, seed])

  const paths = useMemo(
    () => Array.from({ length: count }, (_, i) => puzzlePiecePath(i, cols, rows, game.edges, CELL_W, cellH)),
    [count, cols, rows, game.edges, cellH],
  )
  const solved = puzzleSolved(game.order)
  const svg = useRef<SVGSVGElement>(null)

  const canMove = (g: Game, cell: number) => !latest.current.props.disabled && !g.done && !(latest.current.props.lock && g.order[cell] === cell)

  function finish(moves: number, startedAt: number) {
    const time = startedAt ? Date.now() - startedAt : 0
    setAnnounce(latest.current.loc.puzzle.solved(moves, puzzleClock(time)))
    latest.current.props.onComplete?.({ moves, time })
    if (latest.current.props.confetti && !prefersReducedMotion() && svg.current) {
      const r = svg.current.getBoundingClientRect()
      pawBurst(r.left + r.width / 2, r.top + r.height / 2, { count: 24, spread: 360, power: Math.max(160, r.width * 0.6) })
    }
  }

  /** Swap two cells; returns false when either can't move. */
  function swap(a: number, b: number): boolean {
    const g = latest.current.game
    if (a === b || !canMove(g, a) || !canMove(g, b)) return false
    const order = puzzleSwap(g.order, a, b)
    const moves = g.moves + 1
    const startedAt = g.startedAt || Date.now()
    const done = puzzleSolved(order)
    const next = { ...g, order, moves, startedAt, selected: null, done }
    latest.current.game = next
    setGame(next)
    latest.current.props.onMove?.(a, b, moves)
    setAnnounce(latest.current.loc.puzzle.swapped(g.order[a] + 1, g.order[b] + 1))
    if (done) finish(moves, startedAt)
    return true
  }

  function setSelected(selected: number | null) {
    const next = { ...latest.current.game, selected }
    latest.current.game = next
    setGame(next)
  }

  function pick(cell: number) {
    const g = latest.current.game
    if (g.selected === null) {
      if (!canMove(g, cell)) return
      setSelected(cell)
      setAnnounce(latest.current.loc.puzzle.picked(g.order[cell] + 1))
    } else if (g.selected === cell) setSelected(null)
    else swap(g.selected, cell)
  }

  /* ── Pointer ── */
  const start = useRef<{ x: number; y: number; scale: number; id: number; cell: number; active: boolean } | null>(null)
  const listeners = useRef<{ move: (e: PointerEvent) => void; up: (e: PointerEvent) => void; cancel: () => void } | null>(null)

  function stopListening() {
    const l = listeners.current
    if (l) {
      window.removeEventListener('pointermove', l.move)
      window.removeEventListener('pointerup', l.up)
      window.removeEventListener('pointercancel', l.cancel)
    }
    listeners.current = null
    start.current = null
  }
  useEffect(() => stopListening, [])

  function onPointerDown(cell: number, event: ReactPointerEvent) {
    if (event.button !== 0 || !svg.current) return
    setFocusCell(cell)
    if (!canMove(latest.current.game, cell)) return
    const r = svg.current.getBoundingClientRect()
    const { W, pad } = latest.current
    start.current = { x: event.clientX, y: event.clientY, scale: (W + pad * 2) / (r.width || 1), id: event.pointerId, cell, active: false }
    setDrag({ cell, dx: 0, dy: 0, active: false })
    const move = (e: PointerEvent) => {
      const s = start.current
      if (!s || e.pointerId !== s.id) return
      const dx = e.clientX - s.x
      const dy = e.clientY - s.y
      if (!s.active && Math.hypot(dx, dy) < 4) return
      e.preventDefault()
      s.active = true
      setDrag({ cell: s.cell, dx: dx * s.scale, dy: dy * s.scale, active: true })
    }
    const up = (e: PointerEvent) => {
      const s = start.current
      if (!s || e.pointerId !== s.id) return
      stopListening()
      setDrag(null)
      if (!s.active) return pick(s.cell)
      const rect = svg.current!.getBoundingClientRect()
      const { W, pad, cellH, rows, cols } = latest.current
      const scale = (W + pad * 2) / (rect.width || 1)
      const x = (e.clientX - rect.left) * scale - pad
      const y = (e.clientY - rect.top) * scale - pad
      const c = Math.floor(x / CELL_W)
      const r = Math.floor(y / cellH)
      if (c >= 0 && c < cols && r >= 0 && r < rows) {
        const target = r * cols + c
        if (swap(s.cell, target)) setFocusCell(target)
      }
    }
    const cancel = () => {
      stopListening()
      setDrag(null)
    }
    listeners.current = { move, up, cancel }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
  }

  /* ── Keyboard ── */
  function focusOn(cell: number) {
    setFocusCell(cell)
    const el = svg.current?.querySelector<SVGGElement>(`[data-cell="${cell}"]`)
    if (el && document.activeElement !== el) el.focus()
  }
  // Lifting or placing a piece redraws it on another layer, which can drop focus.
  const refocus = useRef(false)
  useEffect(() => {
    if (!refocus.current) return
    refocus.current = false
    focusOn(focusCell)
  })
  function onKeyDown(event: KeyboardEvent) {
    const cell = focusCell
    if (KEYS[event.key]) focusOn(puzzleNeighbour(cell, KEYS[event.key], rows, cols))
    else if (event.key === 'Home') focusOn(0)
    else if (event.key === 'End') focusOn(count - 1)
    else if (event.key === 'Enter' || event.key === ' ') pick(cell)
    else if (event.key === 'Escape' && game.selected !== null) setSelected(null)
    else return
    event.preventDefault()
    refocus.current = true
  }

  function shuffle() {
    const g = latest.current.game
    const next = fresh(seed === undefined ? Math.random : puzzleRandom(seed + g.moves + 13), g.edges)
    latest.current.game = next
    setGame(next)
    setAnnounce('')
    onShuffle?.()
  }
  function solve() {
    const g = latest.current.game
    const next = { ...g, order: g.order.map((_, i) => i), selected: null, done: true }
    latest.current.game = next
    setGame(next)
  }
  const api = useRef({ shuffle, solve })
  api.current = { shuffle, solve }
  useImperativeHandle(ref, () => ({ shuffle: () => api.current.shuffle(), solve: () => api.current.solve() }), [])

  const pieces = game.order.map((piece, cell) => {
    const hx = (piece % cols) * CELL_W
    const hy = Math.floor(piece / cols) * cellH
    const tx = (cell % cols) * CELL_W
    const ty = Math.floor(cell / cols) * cellH
    const dragging = drag?.cell === cell && drag.active
    return {
      piece,
      cell,
      d: paths[piece],
      placed: piece === cell,
      locked: lock && piece === cell,
      selected: game.selected === cell,
      dragging,
      x: tx - hx + (dragging ? drag!.dx : 0),
      y: ty - hy + (dragging ? drag!.dy : 0),
      cx: hx + CELL_W / 2,
      cy: hy + cellH / 2,
      row: Math.floor(cell / cols) + 1,
      col: (cell % cols) + 1,
    }
  })
  const rank = (p: (typeof pieces)[number]) => (p.dragging ? 3 : p.selected ? 2 : p.placed ? 0 : 1)
  pieces.sort((a, b) => rank(a) - rank(b) || a.piece - b.piece)

  return (
    <div
      className={cx(
        'ml-puzzle',
        `ml-puzzle--${tone}`,
        {
          'ml-puzzle--solved': solved,
          'ml-puzzle--dragging': drag?.active,
          'ml-puzzle--picking': game.selected !== null,
          'ml-puzzle--disabled': disabled,
          'ml-puzzle--art': !src,
        },
        className,
      )}
      style={{ '--_w': `${width}px`, '--_ratio': `${W + pad * 2} / ${H + pad * 2}` } as CSSProperties}
    >
      <svg
        ref={svg}
        className="ml-puzzle__svg"
        viewBox={`${-pad} ${-pad} ${W + pad * 2} ${H + pad * 2}`}
        role="group"
        aria-label={label ?? loc.puzzle.label(alt)}
        aria-disabled={disabled ? true : undefined}
        onKeyDown={onKeyDown}
      >
        <defs>
          {paths.map((d, i) => (
            <clipPath key={i} id={`${uid}-${i}`}>
              <path d={d} />
            </clipPath>
          ))}
          <linearGradient id={`${uid}-art`} x1="0" y1="0" x2="1" y2="1">
            <stop className="ml-puzzle__stop ml-puzzle__stop--a" offset="0" />
            <stop className="ml-puzzle__stop ml-puzzle__stop--b" offset="0.5" />
            <stop className="ml-puzzle__stop ml-puzzle__stop--c" offset="1" />
          </linearGradient>
        </defs>
        <rect className="ml-puzzle__tray" x={0} y={0} width={W} height={H} rx="6" />
        {src && ghost && (
          <image className="ml-puzzle__ghost" href={src} x={0} y={0} width={W} height={H} preserveAspectRatio="xMidYMid slice" aria-hidden="true" />
        )}
        <path className="ml-puzzle__slots" d={paths.join('')} aria-hidden="true" />
        {pieces.map((p) => (
          <g
            key={p.piece}
            data-cell={p.cell}
            className={cx('ml-puzzle__piece', {
              'ml-puzzle__piece--placed': p.placed,
              'ml-puzzle__piece--locked': p.locked,
              'ml-puzzle__piece--selected': p.selected,
              'ml-puzzle__piece--dragging': p.dragging,
            })}
            style={{ translate: `${p.x.toFixed(2)}px ${p.y.toFixed(2)}px`, transformOrigin: `${p.cx}px ${p.cy}px` }}
            tabIndex={p.cell === focusCell ? 0 : -1}
            role="button"
            aria-label={loc.puzzle.piece(p.piece + 1, p.row, p.col, p.placed)}
            aria-pressed={p.selected}
            aria-disabled={p.locked || disabled || solved ? true : undefined}
            onPointerDown={(e) => onPointerDown(p.cell, e)}
            onFocus={() => setFocusCell(p.cell)}
          >
            <g className="ml-puzzle__face" clipPath={`url(#${uid}-${p.piece})`}>
              <rect className="ml-puzzle__art" x={0} y={0} width={W} height={H} fill={`url(#${uid}-art)`} />
              {src && <image className="ml-puzzle__image" href={src} x={0} y={0} width={W} height={H} preserveAspectRatio="xMidYMid slice" />}
            </g>
            <path className="ml-puzzle__edge" d={p.d} />
            {showNumbers && (
              <text className="ml-puzzle__num" x={p.cx} y={p.cy}>
                {p.piece + 1}
              </text>
            )}
          </g>
        ))}
      </svg>
      {toolbar && (
        <div className="ml-puzzle__bar">
          <span className="ml-puzzle__stat">{loc.puzzle.moves(game.moves)}</span>
          <span className="ml-puzzle__stat ml-puzzle__stat--progress">{loc.puzzle.progress(puzzlePlaced(game.order), count)}</span>
          <button type="button" className="ml-puzzle__shuffle" disabled={disabled} onClick={shuffle}>
            {loc.puzzle.shuffle}
          </button>
        </div>
      )}
      <p className="ml-visually-hidden" aria-live="polite">
        {announce}
      </p>
    </div>
  )
})
