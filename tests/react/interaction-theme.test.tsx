import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ThemeToggle, useTheme } from '../../src/react/theme'
import { _resetThemeForTests, getThemeState, setTheme } from '../../src/theme'
import { mockMedia } from '../theme-media'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined
function render(el: React.ReactElement) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(el))
  return host
}
const click = (el: Element) => act(() => void el.dispatchEvent(new MouseEvent('click', { bubbles: true })))
const key = (el: Element, k: string) => act(() => void el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })))
const attr = () => document.documentElement.getAttribute('data-ml-theme')

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-ml-theme')
  _resetThemeForTests()
})
afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

describe('<ThemeToggle>', () => {
  it('switch flips the page theme and reports the new mode', () => {
    mockMedia()
    const onChange = vi.fn()
    const host = render(<ThemeToggle onChange={onChange} />)
    const sw = host.querySelector('[role=switch]')!
    expect(sw.getAttribute('aria-checked')).toBe('false')
    click(sw)
    expect(attr()).toBe('light')
    expect(onChange).toHaveBeenCalledWith('light')
    expect(sw.getAttribute('aria-checked')).toBe('true')
    expect(host.firstElementChild!.classList.contains('ml-theme-toggle--light')).toBe(true)
    expect(localStorage.getItem('ml-theme')).toBe('light')
  })

  it('segmented: click and arrow keys, system follows the OS', () => {
    const media = mockMedia({ dark: false })
    const host = render(<ThemeToggle variant="segmented" />)
    const radios = [...host.querySelectorAll('[role=radio]')]
    expect(radios.map((r) => r.textContent)).toEqual(['夜間', '日光', '系統'])
    click(radios[2])
    expect(getThemeState()).toMatchObject({ mode: 'system', resolved: 'light' })
    act(() => media.setDark(true))
    expect(attr()).toBe('dark')
    key(host.querySelector('[role=radiogroup]')!, 'ArrowLeft')
    expect(getThemeState().mode).toBe('light')
    expect(radios[1].getAttribute('aria-checked')).toBe('true')
    expect(radios[1].getAttribute('tabindex')).toBe('0')
  })

  it('icon button and useTheme() share the store with outside changes', () => {
    mockMedia()
    function Readout() {
      const t = useTheme()
      return <output>{`${t.mode}/${t.resolved}/${t.isDark}`}</output>
    }
    const host = render(
      <>
        <ThemeToggle variant="icon" />
        <Readout />
      </>,
    )
    const btn = host.querySelector('button')!
    expect(btn.getAttribute('aria-label')).toBe('切換為日光模式')
    click(btn)
    expect(host.querySelector('output')!.textContent).toBe('light/light/false')
    act(() => setTheme('dark'))
    expect(btn.getAttribute('aria-label')).toBe('切換為日光模式')
    expect(host.querySelector('output')!.textContent).toBe('dark/dark/true')
  })
})
