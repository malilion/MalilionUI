// Theme store (src/theme.ts) + useTheme() + MlThemeToggle.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import {
  _resetThemeForTests,
  configureTheme,
  getThemeState,
  setTheme,
  subscribeTheme,
  themeInitScript,
  toggleTheme,
} from '../src/theme'
import { _rebindThemeForTests } from '../src/useTheme'
import { MlConfigProvider, MlThemeToggle, en, useTheme } from '../src'
import { mockMedia } from './theme-media'

const html = document.documentElement
const attr = () => html.getAttribute('data-ml-theme')

beforeEach(() => {
  localStorage.clear()
  html.removeAttribute('data-ml-theme')
  html.className = ''
  _resetThemeForTests()
  _rebindThemeForTests()
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  document.body.innerHTML = ''
  delete (document as { startViewTransition?: unknown }).startViewTransition
})

describe('theme store', () => {
  it('defaults to Night Pride and applies it on first read', () => {
    mockMedia({ dark: false })
    expect(getThemeState()).toEqual({ mode: 'dark', resolved: 'dark', system: 'light' })
    expect(attr()).toBe('dark')
  })

  it('without a stored choice, adopts the attribute already on <html>', () => {
    mockMedia()
    html.setAttribute('data-ml-theme', 'light')
    expect(getThemeState().mode).toBe('light')
  })

  it("resolves 'system' through prefers-color-scheme and follows OS changes", () => {
    const media = mockMedia({ dark: false })
    setTheme('system')
    expect(getThemeState()).toMatchObject({ mode: 'system', resolved: 'light' })
    expect(attr()).toBe('light')
    const seen: string[] = []
    subscribeTheme(() => seen.push(getThemeState().resolved))
    media.setDark(true)
    expect(attr()).toBe('dark')
    expect(seen).toEqual(['dark'])
    // An explicit choice ignores the OS.
    setTheme('light')
    media.setDark(false)
    media.setDark(true)
    expect(attr()).toBe('light')
  })

  it('persists the choice and restores it on the next visit', () => {
    mockMedia()
    setTheme('light')
    expect(localStorage.getItem('ml-theme')).toBe('light')
    _resetThemeForTests()
    html.removeAttribute('data-ml-theme')
    expect(getThemeState().mode).toBe('light')
    expect(attr()).toBe('light')
  })

  it('honours a custom key, default mode, attribute and target', () => {
    mockMedia({ dark: false })
    const box = document.createElement('section')
    box.id = 'scope'
    document.body.appendChild(box)
    configureTheme({ storageKey: 'my-theme', defaultMode: 'system', attribute: 'data-mode', target: '#scope' })
    expect(getThemeState().resolved).toBe('light')
    expect(box.getAttribute('data-mode')).toBe('light')
    toggleTheme()
    expect(localStorage.getItem('my-theme')).toBe('dark')
    expect(box.getAttribute('data-mode')).toBe('dark')
    expect(attr()).toBeNull()
  })

  it('storageKey: false keeps nothing', () => {
    mockMedia()
    configureTheme({ storageKey: false })
    setTheme('light')
    expect(localStorage.length).toBe(0)
  })

  it('survives a storage that throws', () => {
    mockMedia()
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(() => setTheme('light')).not.toThrow()
    expect(attr()).toBe('light')
    get.mockRestore()
    set.mockRestore()
  })

  it('ignores garbage in storage and syncs from other tabs', () => {
    mockMedia()
    localStorage.setItem('ml-theme', 'purple')
    expect(getThemeState().mode).toBe('dark')
    localStorage.setItem('ml-theme', 'light')
    window.dispatchEvent(new StorageEvent('storage', { key: 'ml-theme', newValue: 'light' }))
    expect(getThemeState().mode).toBe('light')
    expect(attr()).toBe('light')
  })

  it('reveals the new theme with a View Transition from the given origin', async () => {
    mockMedia()
    const animate = vi.fn()
    html.animate = animate as unknown as typeof html.animate
    let ready!: () => void
    const start = vi.fn((cb: () => void) => {
      cb()
      return { ready: new Promise<void>((r) => (ready = r)), finished: Promise.resolve() }
    })
    ;(document as { startViewTransition?: unknown }).startViewTransition = start
    getThemeState()
    setTheme('light', { origin: { x: 10, y: 20 } })
    expect(start).toHaveBeenCalledOnce()
    expect(attr()).toBe('light')
    ready()
    await new Promise((r) => setTimeout(r))
    expect(animate).toHaveBeenCalledOnce()
    const [frames, opts] = animate.mock.calls[0]
    expect(frames.clipPath[0]).toBe('circle(0px at 10px 20px)')
    expect(opts.pseudoElement).toBe('::view-transition-new(root)')
    expect(html.classList.contains('ml-theme-vt')).toBe(false)
  })

  it('falls back to a short colour fade, and switches instantly under reduced motion or smooth: false', () => {
    vi.useFakeTimers()
    const media = mockMedia()
    getThemeState()
    setTheme('light')
    expect(html.classList.contains('ml-theme-switching')).toBe(true)
    vi.advanceTimersByTime(600)
    expect(html.classList.contains('ml-theme-switching')).toBe(false)
    setTheme('dark', { smooth: false })
    expect(html.classList.contains('ml-theme-switching')).toBe(false)
    media.prefs.reduce = true
    const start = vi.fn()
    ;(document as { startViewTransition?: unknown }).startViewTransition = start
    setTheme('light')
    expect(start).not.toHaveBeenCalled()
    expect(html.classList.contains('ml-theme-switching')).toBe(false)
    expect(attr()).toBe('light')
  })
})

describe('themeInitScript', () => {
  const run = (code: string) => new Function(code)()

  it('applies the stored choice before the app boots', () => {
    mockMedia()
    localStorage.setItem('ml-theme', 'light')
    run(themeInitScript())
    expect(attr()).toBe('light')
  })

  it("resolves 'system' and does nothing without a choice or default", () => {
    mockMedia({ dark: false })
    run(themeInitScript())
    expect(attr()).toBeNull()
    run(themeInitScript({ defaultMode: 'system' }))
    expect(attr()).toBe('light')
    localStorage.setItem('k', 'dark')
    run(themeInitScript({ storageKey: 'k', attribute: 'data-x' }))
    expect(html.getAttribute('data-x')).toBe('dark')
    html.removeAttribute('data-x')
  })

  it('is safe to inline in HTML', () => {
    expect(themeInitScript({ storageKey: '</script><b>' })).not.toContain('</script>')
  })
})

describe('useTheme()', () => {
  it('shares one reactive state', async () => {
    mockMedia()
    const a = mount({ setup: () => useTheme(), render: () => null })
    const b = mount({ setup: () => useTheme(), render: () => null })
    ;(a.vm as unknown as { mode: string }).mode = 'light'
    await nextTick()
    expect((b.vm as unknown as { resolved: string; isDark: boolean }).resolved).toBe('light')
    expect((b.vm as unknown as { isDark: boolean }).isDark).toBe(false)
    expect(attr()).toBe('light')
  })
})

describe('MlThemeToggle', () => {
  const settle = async () => {
    await nextTick()
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    await nextTick()
  }

  it('switch: role=switch, flips the page theme, emits change', async () => {
    mockMedia()
    const w = mount(MlThemeToggle, { attachTo: document.body })
    await settle()
    const btn = w.get('[role=switch]')
    expect(btn.attributes('aria-checked')).toBe('false')
    expect(btn.attributes('aria-label')).toBe('日光模式')
    expect(w.classes()).toEqual(expect.arrayContaining(['ml-theme-toggle--dark', 'ml-theme-toggle--ready']))
    await btn.trigger('click')
    expect(attr()).toBe('light')
    expect(w.emitted('change')).toEqual([['light']])
    expect(btn.attributes('aria-checked')).toBe('true')
    expect(w.classes()).toContain('ml-theme-toggle--light')
    w.unmount()
  })

  it('a visible label replaces the aria-label', () => {
    mockMedia()
    const w = mount(MlThemeToggle, { props: { label: '日光' } })
    const id = w.get('[role=switch]').attributes('id')
    expect(w.get('label').attributes('for')).toBe(id)
    expect(w.get('[role=switch]').attributes('aria-label')).toBeUndefined()
  })

  it('segmented: three-way radio group with arrow keys, including system', async () => {
    mockMedia({ dark: false })
    const w = mount(MlThemeToggle, { props: { variant: 'segmented' }, attachTo: document.body })
    await settle()
    const radios = w.findAll('[role=radio]')
    expect(radios.map((r) => r.text())).toEqual(['夜間', '日光', '系統'])
    expect(w.get('[role=radiogroup]').attributes('aria-label')).toBe('佈景主題')
    await radios[2].trigger('click')
    expect(getThemeState()).toMatchObject({ mode: 'system', resolved: 'light' })
    await w.get('[role=radiogroup]').trigger('keydown', { key: 'Home' })
    expect(getThemeState().mode).toBe('dark')
    expect(w.emitted('change')).toEqual([['system'], ['dark']])
    w.unmount()
  })

  it('segmented without system shows the resolved theme', async () => {
    mockMedia({ dark: false })
    setTheme('system')
    const w = mount(MlThemeToggle, { props: { variant: 'segmented', system: false } })
    await settle()
    expect(w.findAll('[role=radio]')).toHaveLength(2)
    expect(w.get('[aria-checked=true]').text()).toBe('日光')
  })

  it('icon: describes the action, follows the locale', async () => {
    mockMedia()
    const w = mount({ render: () => h(MlConfigProvider, { locale: en }, () => h(MlThemeToggle, { variant: 'icon' })) })
    await settle()
    const btn = w.get('button')
    expect(btn.attributes('aria-label')).toBe('Switch to light theme')
    await btn.trigger('click')
    expect(btn.attributes('aria-label')).toBe('Switch to dark theme')
  })

  it('disabled does nothing', async () => {
    mockMedia()
    const w = mount(MlThemeToggle, { props: { disabled: true } })
    await w.get('[role=switch]').trigger('click')
    expect(getThemeState().mode).toBe('dark')
    expect(w.emitted('change')).toBeUndefined()
  })
})
