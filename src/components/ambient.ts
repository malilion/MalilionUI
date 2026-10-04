// Shared by the ambient effects (Aurora, Particles, Radar, Clock): one place that
// decides whether an animation loop should be running right now. Framework-free.

export interface MotionState {
  /** On screen, tab visible and no reduced-motion preference. */
  running: boolean
  /** The element intersects the viewport. */
  inView: boolean
  /** The tab is visible. */
  visible: boolean
  /** The user asked the OS for less motion. */
  reduced: boolean
}

/**
 * Watches `el` for leaving the viewport, the tab being hidden and the
 * reduced-motion preference changing; calls `onChange` with the new state
 * right away and whenever `running` or `reduced` flips. Returns a cleanup.
 * SSR / old browsers: whatever API is missing counts as "fine, keep going".
 */
export function motionGate(el: Element, onChange: (state: MotionState) => void): () => void {
  const state: MotionState = { running: false, inView: true, visible: true, reduced: false }
  let lastKey = ''
  const emit = () => {
    state.running = state.inView && state.visible && !state.reduced
    const key = `${state.running}${state.reduced}`
    if (key === lastKey) return
    lastKey = key
    onChange({ ...state })
  }
  const cleanups: (() => void)[] = []

  if (typeof document !== 'undefined') {
    const onVisibility = () => {
      state.visible = document.visibilityState !== 'hidden'
      emit()
    }
    state.visible = document.visibilityState !== 'hidden'
    document.addEventListener('visibilitychange', onVisibility)
    cleanups.push(() => document.removeEventListener('visibilitychange', onVisibility))
  }

  const mq = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-reduced-motion: reduce)') : undefined
  if (mq) {
    state.reduced = !!mq.matches
    const onMq = () => {
      state.reduced = !!mq.matches
      emit()
    }
    mq.addEventListener?.('change', onMq)
    cleanups.push(() => mq.removeEventListener?.('change', onMq))
  }

  if (typeof IntersectionObserver !== 'undefined') {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) state.inView = entry.isIntersecting
        emit()
      },
      { threshold: 0 },
    )
    io.observe(el)
    cleanups.push(() => io.disconnect())
  }

  emit()
  return () => cleanups.forEach((fn) => fn())
}

/** Seeded PRNG (mulberry32): same seed, same sequence — keeps first renders deterministic. */
export function ambientRandom(seed: number): () => number {
  let a = seed >>> 0 || 0x9e3779b9
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
export { clamp as ambientClamp }
