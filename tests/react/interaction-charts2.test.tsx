import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { FunnelChart, ScatterChart } from '../../src/react/charts'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined
function render(el: React.ReactElement) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(el))
  return host
}
const key = (el: Element, k: string) => act(() => void el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })))
const pointer = (el: Element, type: string, init: MouseEventInit = {}) => act(() => void el.dispatchEvent(new MouseEvent(type, { bubbles: true, ...init })))
const click = (el: Element) => act(() => (el as HTMLElement).click())
const rect = (el: Element, r: Partial<DOMRect>) =>
  ((el as HTMLElement).getBoundingClientRect = () => ({ left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON() {}, ...r }) as DOMRect)

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
})

const series = [
  { name: 'A', points: [{ x: 1, y: 10 }, { x: 3, y: 30 }, { x: 5, y: 50 }] },
  { name: 'B', tone: 'tech' as const, points: [{ x: 2, y: 25, size: 4, label: 'Beta' }, { x: 4, y: 12, size: 16 }] },
]

describe('React ScatterChart', () => {
  it('inspects points with the keyboard and pointer, and toggles series', () => {
    const onToggle = vi.fn()
    const host = render(<ScatterChart series={series} trend onToggle={onToggle} />)
    const plot = host.querySelector('.ml-scatter__plot')!
    expect(plot.getAttribute('aria-label')).toBe('散佈圖：2 個數列，共 5 個資料點')
    expect(host.querySelectorAll('.ml-scatter__trend')).toHaveLength(2)
    key(plot, 'ArrowRight')
    expect(host.querySelector('.ml-scatter__tip-title')!.textContent).toBe('A')
    key(plot, 'ArrowRight')
    expect(host.querySelector('.ml-scatter__tip-title')!.textContent).toBe('Beta')
    key(plot, 'ArrowUp')
    expect(host.querySelector('.ml-scatter__tip-title')!.textContent).toBe('A')
    key(plot, 'End')
    expect(host.querySelector('.ml-scatter__tip--left')).not.toBeNull()
    key(plot, 'Escape')
    expect(host.querySelector('.ml-scatter__tip')).toBeNull()

    rect(plot, { width: 600, height: 260 })
    pointer(plot, 'pointermove', { clientX: 598, clientY: 10 })
    expect(host.querySelector('.ml-scatter__tip')!.textContent).toContain('50')
    pointer(plot, 'pointermove', { clientX: 300, clientY: 250 })
    expect(host.querySelector('.ml-scatter__tip')).toBeNull()

    const keys = host.querySelectorAll('.ml-scatter__key')
    click(keys[1])
    expect(onToggle).toHaveBeenCalledWith('B', false)
    expect(keys[1].getAttribute('aria-pressed')).toBe('false')
    expect(host.querySelectorAll('.ml-scatter__pt')).toHaveLength(3)
    click(keys[1])
    expect(onToggle).toHaveBeenLastCalledWith('B', true)
    expect(host.querySelectorAll('.ml-scatter__pt')).toHaveLength(5)
  })
})

const funnel = [
  { label: '造訪', value: 1000 },
  { label: '加入', value: 400 },
  { label: '付款', value: 100 },
]

describe('React FunnelChart', () => {
  it('inspects stages with hover and keys; selects with Enter and click', () => {
    const onSelect = vi.fn()
    const host = render(<FunnelChart data={funnel} onSelect={onSelect} />)
    const list = host.querySelector('ol')!
    const items = host.querySelectorAll('li')
    expect(list.getAttribute('aria-label')).toBe('漏斗圖：3 個階段，整體轉換率 10%')
    pointer(items[1], 'pointerover')
    expect(items[1].classList.contains('ml-funnel__stage--on')).toBe(true)
    expect(host.querySelector('.ml-funnel__tip')!.textContent).toContain('流失600')
    key(list, 'End')
    expect(document.activeElement).toBe(items[2])
    expect(items[2].getAttribute('tabindex')).toBe('0')
    expect(host.querySelector('.ml-funnel__tip-title')!.textContent).toBe('付款')
    key(list, 'ArrowUp')
    expect(document.activeElement).toBe(items[1])
    key(list, 'Enter')
    expect(onSelect).toHaveBeenCalledWith(1, funnel[1])
    click(items[0])
    expect(onSelect).toHaveBeenLastCalledWith(0, funnel[0])
    key(list, 'Escape')
    expect(host.querySelector('.ml-funnel__tip')).toBeNull()
  })
})
