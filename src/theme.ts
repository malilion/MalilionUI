// Theme switching, framework-free: Night Pride (dark) / Daylight (light) / follow
// the OS. One store per page shared by the Vue composable and the React hook.
// Nothing touches window / document until the store is first read in a browser,
// so importing this module during SSR is safe.

export type MlThemeMode = 'dark' | 'light' | 'system'
export type MlResolvedTheme = 'dark' | 'light'

export interface MlThemeState {
  /** What the user chose. */
  mode: MlThemeMode
  /** What is applied: `mode`, with 'system' resolved through prefers-color-scheme. */
  resolved: MlResolvedTheme
  /** What the OS currently prefers. */
  system: MlResolvedTheme
}

export interface MlThemeOptions {
  /** localStorage key for the choice; `false` to not persist. Default `'ml-theme'`. */
  storageKey?: string | false
  /**
   * Mode used when nothing is stored. Default: the target's current
   * `data-ml-theme` if it has one, else `'dark'` (Night Pride).
   */
  defaultMode?: MlThemeMode
  /** Attribute written on the target. Default `'data-ml-theme'`. */
  attribute?: string
  /** Element (or selector / getter) that carries the attribute. Default `<html>`. */
  target?: Element | string | (() => Element | null | undefined)
  /** Animate switches (View Transition circular reveal, else a short colour fade). Default `true`. */
  smooth?: boolean
  /** Length of the smooth switch in ms. Default `520`. */
  duration?: number
}

/** Where a smooth switch reveals from: a point, an element (its centre) or a pointer event. */
export type MlThemeOrigin = { x: number; y: number } | Element | { clientX: number; clientY: number; currentTarget?: unknown }

export interface MlSetThemeOptions {
  /** Point the circular reveal grows from. Without it the page cross-fades. */
  origin?: MlThemeOrigin
  /** Override the global `smooth` option for this switch. */
  smooth?: boolean
}

const MODES: readonly MlThemeMode[] = ['dark', 'light', 'system']
const isMode = (v: unknown): v is MlThemeMode => typeof v === 'string' && (MODES as readonly string[]).includes(v)
const DARK_QUERY = '(prefers-color-scheme: dark)'

let options: MlThemeOptions = {}
let mode: MlThemeMode = 'dark'
let system: MlResolvedTheme = 'dark'
let state: MlThemeState = { mode, resolved: 'dark', system }
let serverState: MlThemeState = state
let started = false
let stopListening: (() => void) | undefined
const listeners = new Set<() => void>()

const inBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined'
const storageKey = () => (options.storageKey === undefined ? 'ml-theme' : options.storageKey)
const attribute = () => options.attribute ?? 'data-ml-theme'
const resolve = (m: MlThemeMode, sys: MlResolvedTheme): MlResolvedTheme => (m === 'system' ? sys : m)

function computeServerState(): MlThemeState {
  const m = options.defaultMode ?? 'dark'
  return { mode: m, resolved: resolve(m, 'dark'), system: 'dark' }
}

function targetEl(): Element | null {
  if (!inBrowser()) return null
  const t = options.target
  if (!t) return document.documentElement
  if (typeof t === 'string') return document.querySelector(t)
  if (typeof t === 'function') return t() ?? null
  return t
}

function readStored(): MlThemeMode | null {
  const key = storageKey()
  if (!key) return null
  try {
    const v = window.localStorage.getItem(key)
    return isMode(v) ? v : null
  } catch {
    return null // storage blocked (private mode, sandboxed iframe…)
  }
}

function writeStored(value: MlThemeMode) {
  const key = storageKey()
  if (!key) return
  try {
    window.localStorage.setItem(key, value)
  } catch {
    /* the choice just won't survive a reload */
  }
}

function initialMode(): MlThemeMode {
  const stored = readStored()
  if (stored) return stored
  if (options.defaultMode) return options.defaultMode
  const current = targetEl()?.getAttribute(attribute())
  return current === 'light' || current === 'dark' ? current : 'dark'
}

function commit() {
  const next: MlThemeState = { mode, resolved: resolve(mode, system), system }
  if (next.mode === state.mode && next.resolved === state.resolved && next.system === state.system) return
  state = next
  for (const fn of [...listeners]) fn()
}

function applyAttribute() {
  const el = targetEl()
  if (el && el.getAttribute(attribute()) !== state.resolved) el.setAttribute(attribute(), state.resolved)
}

function start() {
  if (started || !inBrowser()) return
  started = true
  const mq = typeof window.matchMedia === 'function' ? window.matchMedia(DARK_QUERY) : null
  system = mq ? (mq.matches ? 'dark' : 'light') : 'dark'
  mode = initialMode()
  state = { mode, resolved: resolve(mode, system), system }
  applyAttribute()

  const onSystem = (e: { matches: boolean }) => {
    system = e.matches ? 'dark' : 'light'
    const before = state.resolved
    commit()
    if (state.resolved !== before) transition(() => applyAttribute(), undefined)
  }
  const onStorage = (e: StorageEvent) => {
    const key = storageKey()
    if (!key || e.key !== key) return
    mode = isMode(e.newValue) ? e.newValue : options.defaultMode ?? 'dark'
    commit()
    applyAttribute()
  }
  if (mq) {
    if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onSystem)
    else mq.addListener?.(onSystem)
  }
  window.addEventListener('storage', onStorage)
  stopListening = () => {
    if (mq) {
      if (typeof mq.removeEventListener === 'function') mq.removeEventListener('change', onSystem)
      else mq.removeListener?.(onSystem)
    }
    window.removeEventListener('storage', onStorage)
  }
}

/* ── Smooth switching ─────────────────────────────────────── */

let fadeTimer: ReturnType<typeof setTimeout> | undefined

function originPoint(origin: MlThemeOrigin | undefined): { x: number; y: number } | undefined {
  if (!origin) return undefined
  if ('x' in origin && 'y' in origin && typeof origin.x === 'number') return { x: origin.x, y: origin.y }
  const center = (el: unknown) => {
    if (!el || typeof (el as Element).getBoundingClientRect !== 'function') return undefined
    const r = (el as Element).getBoundingClientRect()
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }
  if ('clientX' in origin) {
    // Keyboard-triggered clicks report 0,0 — fall back to the element's centre.
    if (origin.clientX || origin.clientY) return { x: origin.clientX, y: origin.clientY }
    return center(origin.currentTarget)
  }
  return center(origin)
}

function reducedMotion() {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

type ViewTransitionDoc = Document & {
  startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void> }
}

function transition(apply: () => void, origin: MlThemeOrigin | undefined, smooth = options.smooth ?? true) {
  if (!inBrowser() || !smooth || reducedMotion()) return apply()
  const duration = options.duration ?? 520
  const doc = document as ViewTransitionDoc
  const html = document.documentElement
  const point = originPoint(origin)

  if (typeof doc.startViewTransition === 'function') {
    // Circular reveal of the new theme from the toggle; without a point the UA cross-fades.
    if (point) html.classList.add('ml-theme-vt')
    let vt: { ready: Promise<void>; finished: Promise<void> }
    try {
      vt = doc.startViewTransition(apply)
    } catch {
      html.classList.remove('ml-theme-vt')
      return apply()
    }
    if (point) {
      const radius = Math.hypot(Math.max(point.x, window.innerWidth - point.x), Math.max(point.y, window.innerHeight - point.y))
      vt.ready
        .then(() => {
          html.animate(
            { clipPath: [`circle(0px at ${point.x}px ${point.y}px)`, `circle(${radius}px at ${point.x}px ${point.y}px)`] },
            { duration, easing: 'cubic-bezier(0.22, 0.8, 0.24, 1)', pseudoElement: '::view-transition-new(root)' },
          )
        })
        .catch(() => {})
    }
    vt.finished.catch(() => {}).then(() => html.classList.remove('ml-theme-vt'))
    return
  }

  // Fallback: let colours ease across for a moment.
  html.classList.add('ml-theme-switching')
  html.style.setProperty('--ml-theme-switch-dur', `${Math.round(duration * 0.7)}ms`)
  apply()
  clearTimeout(fadeTimer)
  fadeTimer = setTimeout(() => {
    html.classList.remove('ml-theme-switching')
    html.style.removeProperty('--ml-theme-switch-dur')
  }, duration)
}

/* ── Public API ──────────────────────────────────────────── */

/**
 * Set the store's options (storage key, default mode, target…). Call before the
 * first read, e.g. at app start; later calls re-read storage and re-apply.
 */
export function configureTheme(next: MlThemeOptions) {
  options = { ...options, ...next }
  serverState = computeServerState()
  if (!started) {
    if (!inBrowser()) state = serverState
    return
  }
  mode = initialMode()
  commit()
  applyAttribute()
}

/** Current theme. In the browser the first call reads storage and applies the attribute. */
export function getThemeState(): MlThemeState {
  start()
  return started ? state : serverState
}

/** What a server render (or the first hydration pass) assumes: the default mode, OS treated as dark. */
export function getServerThemeState(): MlThemeState {
  return serverState
}

/** Listen for changes (choice, OS preference, another tab). Returns an unsubscribe. */
export function subscribeTheme(listener: () => void): () => void {
  start()
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Choose a mode; persisted and applied, smoothly unless disabled or reduced motion is on. */
export function setTheme(next: MlThemeMode, opts: MlSetThemeOptions = {}) {
  if (!isMode(next)) return
  start()
  if (!started) return // server: shared across requests, so never mutated
  mode = next
  writeStored(next)
  const before = state.resolved
  commit()
  if (state.resolved === before) applyAttribute()
  else transition(() => applyAttribute(), opts.origin, opts.smooth)
}

/** Flip between dark and light (from 'system', to the opposite of what the OS shows). */
export function toggleTheme(opts?: MlSetThemeOptions) {
  setTheme(getThemeState().resolved === 'dark' ? 'light' : 'dark', opts)
}

/**
 * A tiny script for <head> that applies the stored theme before first paint, so a
 * returning Daylight visitor never sees a flash of Night Pride. Returns the script
 * body (no <script> tags). Always targets <html>; uses the configured options
 * unless you pass others.
 */
export function themeInitScript(opts: Pick<MlThemeOptions, 'storageKey' | 'defaultMode' | 'attribute'> = {}): string {
  const o = { ...options, ...opts }
  const key = o.storageKey === undefined ? 'ml-theme' : o.storageKey
  const json = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c')
  return (
    `(function(){try{var d=document.documentElement,m=null,k=${json(key || null)};` +
    `if(k){try{m=localStorage.getItem(k)}catch(e){}}` +
    `if(m!=='dark'&&m!=='light'&&m!=='system')m=${json(o.defaultMode ?? null)};` +
    `if(!m)return;` +
    `if(m==='system')m=window.matchMedia&&!window.matchMedia(${json(DARK_QUERY)}).matches?'light':'dark';` +
    `d.setAttribute(${json(o.attribute ?? 'data-ml-theme')},m)}catch(e){}})();`
  )
}

/** @internal test helper: forget everything (listeners stay attached to nothing). */
export function _resetThemeForTests() {
  stopListening?.()
  stopListening = undefined
  started = false
  options = {}
  mode = 'dark'
  system = 'dark'
  state = serverState = computeServerState()
  listeners.clear()
  clearTimeout(fadeTimer)
}
