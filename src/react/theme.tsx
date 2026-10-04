import { useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from 'react'
import {
  getServerThemeState,
  getThemeState,
  setTheme,
  subscribeTheme,
  toggleTheme,
  type MlSetThemeOptions,
  type MlThemeMode,
  type MlThemeOrigin,
} from '../theme'
import { themeIcons, type ThemeIconName } from '../components/theme-icons'
import type { MlSize } from '../types'
import { useLocale } from './locale'
import { cx } from './utils'

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

export interface UseThemeResult {
  mode: MlThemeMode
  resolved: 'dark' | 'light'
  system: 'dark' | 'light'
  isDark: boolean
  setTheme: (mode: MlThemeMode, options?: MlSetThemeOptions) => void
  toggle: (options?: MlSetThemeOptions) => void
}

/**
 * Night Pride / Daylight / follow-the-OS, shared app-wide (the same store as the
 * Vue composable) and remembered in localStorage. Server renders get the default.
 */
export function useTheme(): UseThemeResult {
  const state = useSyncExternalStore(subscribeTheme, getThemeState, getServerThemeState)
  return { ...state, isDark: state.resolved === 'dark', setTheme, toggle: toggleTheme }
}

export interface ThemeToggleProps {
  /** switch: a metal toggle; segmented: dark / light / system; icon: a compact button. */
  variant?: 'switch' | 'segmented' | 'icon'
  /** Visible label (switch) or accessible name (segmented / icon). */
  label?: string
  /** Offer "follow the OS" in the segmented variant. Default true. */
  system?: boolean
  /** Animate the switch; defaults to the store's `smooth` option. */
  smooth?: boolean
  size?: MlSize
  disabled?: boolean
  id?: string
  className?: string
  onChange?: (mode: MlThemeMode) => void
}

const Glyph = ({ name, className }: { name: ThemeIconName; className: string }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path d={themeIcons[name]} />
  </svg>
)

const glyphOf: Record<MlThemeMode, ThemeIconName> = { dark: 'moon', light: 'sun', system: 'system' }

export function ThemeToggle({ variant = 'switch', label, system = true, smooth, size = 'md', disabled, id, className, onChange }: ThemeToggleProps) {
  const loc = useLocale()
  const theme = useTheme()
  const autoId = useId()
  const controlId = id ?? `ml-theme-toggle-${autoId.replace(/[^\w-]/g, '')}`
  const root = useRef<HTMLDivElement>(null)

  // Same as the Vue component: the server's guess until mounted, no transitions while settling.
  const [mounted, setMounted] = useState(false)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    setMounted(true)
    let frame = requestAnimationFrame(() => (frame = requestAnimationFrame(() => setReady(true))))
    return () => cancelAnimationFrame(frame)
  }, [])
  const server = getServerThemeState()
  const shownMode = mounted ? theme.mode : server.mode
  const shown = mounted ? theme.resolved : server.resolved

  const pressed = useRef<{ x: number; y: number; t: number }>(undefined)
  const origin = (): MlThemeOrigin | undefined => {
    const p = pressed.current
    if (p && Date.now() - p.t < 1500) return { x: p.x, y: p.y }
    const active = document.activeElement
    return active && root.current?.contains(active) ? active : (root.current ?? undefined)
  }
  const choose = (mode: MlThemeMode) => {
    if (disabled || mode === getThemeState().mode) return
    setTheme(mode, { origin: origin(), smooth })
    pressed.current = undefined
    onChange?.(mode)
  }
  const flip = () => choose(getThemeState().resolved === 'dark' ? 'light' : 'dark')

  /* Segmented: same markup and keyboard model as <Segmented>, with theme glyphs. */
  const options: { value: MlThemeMode; label: string }[] = [
    { value: 'dark', label: loc.theme.dark },
    { value: 'light', label: loc.theme.light },
    ...(system ? [{ value: 'system' as const, label: loc.theme.system }] : []),
  ]
  const current = !system && shownMode === 'system' ? shown : shownMode
  const els = useRef(new Map<MlThemeMode, HTMLButtonElement>())
  const [plate, setPlate] = useState({ x: 0, width: 0, ready: false })
  useIsoLayoutEffect(() => {
    if (variant !== 'segmented') return
    const measure = () => {
      const el = els.current.get(current)
      setPlate(el ? { x: el.offsetLeft, width: el.offsetWidth, ready: true } : (b) => ({ ...b, ready: false }))
    }
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : undefined
    const parent = els.current.get(current)?.parentElement
    if (ro && parent) ro.observe(parent)
    document.fonts?.ready.then(measure)
    return () => ro?.disconnect()
  }, [variant, current, system, loc])

  function onKeydown(event: KeyboardEvent) {
    if (disabled) return
    const at = options.findIndex((o) => o.value === current)
    const k = event.key
    const n = options.length
    const next = k === 'ArrowRight' || k === 'ArrowDown' ? (at + 1) % n : k === 'ArrowLeft' || k === 'ArrowUp' ? (at - 1 + n) % n : k === 'Home' ? 0 : k === 'End' ? n - 1 : -1
    if (next < 0) return
    event.preventDefault()
    choose(options[next].value)
    els.current.get(options[next].value)?.focus()
  }

  const iconLabel = label ?? (shown === 'dark' ? loc.theme.toLight : loc.theme.toDark)

  return (
    <div
      ref={root}
      className={cx(
        'ml-theme-toggle',
        `ml-theme-toggle--${variant}`,
        `ml-theme-toggle--${size}`,
        mounted ? `ml-theme-toggle--${shown}` : 'ml-theme-toggle--pending',
        className,
        { 'ml-theme-toggle--ready': ready, 'ml-theme-toggle--disabled': disabled },
      )}
      onPointerDownCapture={(e) => (pressed.current = { x: e.clientX, y: e.clientY, t: Date.now() })}
    >
      {variant === 'segmented' ? (
        <div
          role="radiogroup"
          aria-label={label ?? loc.theme.label}
          aria-disabled={disabled || undefined}
          className={cx('ml-segmented', `ml-segmented--${size}`, { 'ml-segmented--disabled': disabled })}
          onKeyDown={onKeydown}
        >
          <span
            className="ml-segmented__plate"
            aria-hidden="true"
            style={{ width: `${plate.width}px`, transform: `translateX(${plate.x}px)`, display: plate.ready ? undefined : 'none' }}
          />
          {options.map((o) => (
            <button
              key={o.value}
              ref={(el) => {
                if (el) els.current.set(o.value, el)
                else els.current.delete(o.value)
              }}
              type="button"
              role="radio"
              aria-checked={o.value === current}
              disabled={disabled}
              tabIndex={disabled ? -1 : o.value === current ? 0 : -1}
              className={cx('ml-segmented__item', { 'ml-segmented__item--active': o.value === current })}
              onClick={() => choose(o.value)}
            >
              <Glyph name={glyphOf[o.value]} className="ml-segmented__icon ml-theme-toggle__icon" />
              <span>{o.label}</span>
            </button>
          ))}
        </div>
      ) : variant === 'icon' ? (
        <button id={controlId} type="button" className="ml-theme-toggle__button" aria-label={iconLabel} title={iconLabel} disabled={disabled} onClick={flip}>
          <span className="ml-theme-toggle__orb" aria-hidden="true">
            <Glyph name="moon" className="ml-theme-toggle__glyph ml-theme-toggle__glyph--moon" />
            <Glyph name="sun" className="ml-theme-toggle__glyph ml-theme-toggle__glyph--sun" />
          </span>
        </button>
      ) : (
        <>
          <button
            id={controlId}
            type="button"
            role="switch"
            className="ml-theme-toggle__control"
            aria-checked={shown === 'light'}
            aria-label={label ? undefined : loc.theme.switch}
            disabled={disabled}
            onClick={flip}
          >
            <span className="ml-theme-toggle__track" aria-hidden="true">
              <Glyph name="moon" className="ml-theme-toggle__mark ml-theme-toggle__mark--moon" />
              <Glyph name="sun" className="ml-theme-toggle__mark ml-theme-toggle__mark--sun" />
              <span className="ml-theme-toggle__knob">
                <Glyph name="moon" className="ml-theme-toggle__glyph ml-theme-toggle__glyph--moon" />
                <Glyph name="sun" className="ml-theme-toggle__glyph ml-theme-toggle__glyph--sun" />
              </span>
            </span>
          </button>
          {label && (
            <label htmlFor={controlId} className="ml-theme-toggle__label">
              {label}
            </label>
          )}
        </>
      )}
    </div>
  )
}
