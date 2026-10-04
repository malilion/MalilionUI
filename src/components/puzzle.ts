// Jigsaw maths shared by MlPuzzle (Vue) and Puzzle (React) — framework-free.
// The board is rows × cols cells; piece i belongs in cell i. `order[cell]`
// says which piece sits in a cell, so the puzzle is solved when order[i] === i.
// Shared edges get a tab on one side and the matching blank on the other.

export type MlPuzzleTone = 'gold' | 'tech' | 'bean' | 'steel'

export interface MlPuzzleResult {
  moves: number
  /** Milliseconds from the first move to the last. */
  time: number
}

export interface PuzzleEdges {
  /** `h[r][c]`: the edge under cell (r, c). 1 = the tab points down, -1 = up. */
  h: number[][]
  /** `v[r][c]`: the edge right of cell (r, c). 1 = the tab points right, -1 = left. */
  v: number[][]
}

/** Small, fast, seedable PRNG (mulberry32) so a seed always gives the same puzzle. */
export function puzzleRandom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function puzzleEdges(rows: number, cols: number, random: () => number): PuzzleEdges {
  const flip = () => (random() < 0.5 ? -1 : 1)
  return {
    h: Array.from({ length: rows - 1 }, () => Array.from({ length: cols }, flip)),
    v: Array.from({ length: rows }, () => Array.from({ length: cols - 1 }, flip)),
  }
}

/**
 * A shuffled order where no piece starts in its own cell (Sattolo's algorithm:
 * one long cycle). A 1-piece puzzle can only be solved.
 */
export function puzzleShuffle(count: number, random: () => number): number[] {
  const order = Array.from({ length: count }, (_, i) => i)
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(random() * i)
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return order
}

export const puzzleSolved = (order: readonly number[]) => order.every((p, i) => p === i)

export const puzzlePlaced = (order: readonly number[]) => order.reduce((n, p, i) => n + (p === i ? 1 : 0), 0)

export function puzzleSwap(order: readonly number[], a: number, b: number): number[] {
  const next = order.slice()
  ;[next[a], next[b]] = [next[b], next[a]]
  return next
}

export type PuzzleDirection = 'up' | 'down' | 'left' | 'right'

/** The neighbouring cell, or the same cell at the board's edge. */
export function puzzleNeighbour(cell: number, dir: PuzzleDirection, rows: number, cols: number): number {
  const r = Math.floor(cell / cols)
  const c = cell % cols
  if (dir === 'up') return r > 0 ? cell - cols : cell
  if (dir === 'down') return r < rows - 1 ? cell + cols : cell
  if (dir === 'left') return c > 0 ? cell - 1 : cell
  return c < cols - 1 ? cell + 1 : cell
}

const f = (v: number) => +v.toFixed(2)

/**
 * One edge from (x0, y0) to (x1, y1), traced clockwise, with a tab that
 * bulges outward (`sign` 1), inward (-1) or none (0). `size` is the tab scale.
 * The knob is symmetric, so the neighbour tracing the edge backwards meets it exactly.
 */
function edge(x0: number, y0: number, x1: number, y1: number, sign: number, size: number): string {
  if (!sign) return `L${f(x1)} ${f(y1)}`
  const len = Math.hypot(x1 - x0, y1 - y0)
  const dx = (x1 - x0) / len
  const dy = (y1 - y0) / len
  // Outward normal of a clockwise outline (y down).
  const nx = dy * sign
  const ny = -dx * sign
  const at = (u: number, v: number) => {
    const along = len / 2 + (u - 0.5) * size
    return `${f(x0 + dx * along + nx * v * size)} ${f(y0 + dy * along + ny * v * size)}`
  }
  return (
    `L${at(0.34, 0)}` +
    `C${at(0.4, 0)} ${at(0.42, 0.04)} ${at(0.39, 0.1)}` +
    `C${at(0.34, 0.2)} ${at(0.4, 0.3)} ${at(0.5, 0.3)}` +
    `C${at(0.6, 0.3)} ${at(0.66, 0.2)} ${at(0.61, 0.1)}` +
    `C${at(0.58, 0.04)} ${at(0.6, 0)} ${at(0.66, 0)}` +
    `L${f(x1)} ${f(y1)}`
  )
}

/** Outline of the piece that belongs in `cell`, in board coordinates (cells are w × h). */
export function puzzlePiecePath(cell: number, cols: number, rows: number, edges: PuzzleEdges, w: number, h: number): string {
  const r = Math.floor(cell / cols)
  const c = cell % cols
  const x = c * w
  const y = r * h
  const size = Math.min(w, h)
  const top = r > 0 ? -edges.h[r - 1][c] : 0
  const right = c < cols - 1 ? edges.v[r][c] : 0
  const bottom = r < rows - 1 ? edges.h[r][c] : 0
  const left = c > 0 ? -edges.v[r][c - 1] : 0
  return (
    `M${f(x)} ${f(y)}` +
    edge(x, y, x + w, y, top, size) +
    edge(x + w, y, x + w, y + h, right, size) +
    edge(x + w, y + h, x, y + h, bottom, size) +
    edge(x, y + h, x, y, left, size) +
    'z'
  )
}

/** How far tabs can reach past a cell, as a share of the smaller side. */
export const PUZZLE_TAB = 0.3

/** Clamp rows / cols to something playable. */
export const puzzleGrid = (n: number | undefined, fallback: number) => Math.max(2, Math.min(10, Math.round(n ?? fallback)))

/** "1:23" */
export function puzzleClock(ms: number): string {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
