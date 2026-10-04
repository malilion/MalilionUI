import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createApp, h, nextTick } from 'vue'
import { BarChart } from '../../src/react/charts'
import { MlBarChart } from '../../src'
import { signature } from './parity-utils'

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
const click = (el: Element) => act(() => (el as HTMLElement).click())

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
})

const labels = ['一月', '二月', '三月']
const series = [
  { name: '線上', data: [40, 55, -10] },
  { name: '門市', data: [20, 25, 30], tone: 'tech' as const },
]

describe('React BarChart multi-series', () => {
  it('inspects categories with the keyboard and pointer', () => {
    const host = render(<BarChart series={series} labels={labels} mode="stacked" showTotal />)
    const plot = host.querySelector('.ml-bars__plot')!
    expect(plot.getAttribute('aria-label')).toBe('堆疊長條圖：2 個數列、3 個類別')
    expect([...host.querySelectorAll('.ml-bars__total')].map((t) => t.textContent)).toEqual(['60', '80', '20'])
    key(plot, 'ArrowRight')
    expect(host.querySelector('.ml-bars__pop-title')!.textContent).toBe('一月')
    expect([...host.querySelectorAll('.ml-bars__pop-row')].map((r) => r.textContent)).toEqual(['線上40', '門市20', '合計60'])
    key(plot, 'End')
    expect(host.querySelector('.ml-bars__pop--left')).not.toBeNull()
    key(plot, 'Escape')
    expect(host.querySelector('.ml-bars__pop')).toBeNull()
    act(() => void host.querySelectorAll('.ml-bars__col')[1].dispatchEvent(new MouseEvent('pointerover', { bubbles: true })))
    expect(host.querySelector('.ml-bars__pop-title')!.textContent).toBe('二月')
  })

  it('toggles series from the legend', () => {
    const onToggle = vi.fn()
    const host = render(<BarChart series={series} labels={labels} mode="stacked" showTotal onToggle={onToggle} />)
    const keys = host.querySelectorAll('.ml-bars__key')
    click(keys[0])
    expect(onToggle).toHaveBeenCalledWith('線上', false)
    expect(keys[0].getAttribute('aria-pressed')).toBe('false')
    expect([...host.querySelectorAll('.ml-bars__total')].map((t) => t.textContent)).toEqual(['20', '25', '30'])
    click(keys[0])
    expect(onToggle).toHaveBeenLastCalledWith('線上', true)
    expect(host.querySelectorAll('.ml-bars__seg')).toHaveLength(6)
  })

  it('matches Vue after the same interaction', async () => {
    const host = render(<BarChart series={series} labels={labels} mode="percent" />)
    key(host.querySelector('.ml-bars__plot')!, 'ArrowRight')
    click(host.querySelectorAll('.ml-bars__key')[1])
    const vHost = document.createElement('div')
    document.body.appendChild(vHost)
    const app = createApp({ render: () => h(MlBarChart, { series, labels, mode: 'percent' }) })
    app.mount(vHost)
    vHost.querySelector('.ml-bars__plot')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    ;(vHost.querySelectorAll('.ml-bars__key')[1] as HTMLElement).click()
    await nextTick()
    expect(signature(host.innerHTML)).toBe(signature(vHost.innerHTML))
    expect(host.querySelector('.ml-bars__pop-row')!.textContent).toBe('線上40 · 100%')
    app.unmount()
  })
})
