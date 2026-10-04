import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Treemap } from '../../src/react/treemap'
import { Sankey } from '../../src/react/sankey'
import { Gantt } from '../../src/react/gantt'
import { Candlestick } from '../../src/react/candlestick'
import { ganttDay, ganttISO, type MlGanttTask } from '../../src/components/gantt'
import type { MlTreemapDatum } from '../../src/components/treemap'
import type { MlCandle } from '../../src/components/candlestick'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined
function render(el: React.ReactElement) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(el))
  return host
}
const $ = (s: string) => document.querySelector(s)!
const $$ = (s: string) => [...document.querySelectorAll(s)]
const key = (el: Element, k: string, shiftKey = false) => act(() => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, shiftKey, bubbles: true })))
const fire = (el: Element | Window, type: string, init: PointerEventInit) => act(() => el.dispatchEvent(new PointerEvent(type, { bubbles: true, ...init })))

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  vi.useRealTimers()
  document.body.innerHTML = ''
})

const budget: MlTreemapDatum[] = [
  { label: '社福', value: 0, children: [{ label: '年金', value: 300 }, { label: '長照', value: 120 }] },
  { label: '教育', value: 320 },
  { label: '國防', value: 260 },
]

describe('Treemap', () => {
  it('click selects (uncontrolled), Escape clears, tooltip on hover', () => {
    const onSelect = vi.fn()
    const onSelectedChange = vi.fn()
    render(<Treemap data={budget} selectable onSelect={onSelect} onSelectedChange={onSelectedChange} />)
    const tiles = $$('.ml-treemap__tile')
    expect(tiles).toHaveLength(4)
    act(() => (tiles[2] as HTMLElement).click())
    expect(onSelectedChange).toHaveBeenLastCalledWith('教育')
    expect(onSelect).toHaveBeenLastCalledWith(budget[1], true)
    expect($$('.ml-treemap__tile--selected')).toHaveLength(1)
    key($('.ml-treemap__plot'), 'Escape')
    expect(onSelectedChange).toHaveBeenLastCalledWith(null)
    expect($$('.ml-treemap__tile--selected')).toHaveLength(0)
    // React builds onPointerEnter from native pointerover.
    fire(tiles[0], 'pointerover', {})
    expect($('.ml-treemap__tip').textContent).toContain('年金')
  })

  it('arrow keys roam by geometry and Enter selects (controlled)', () => {
    function Demo() {
      const [sel, setSel] = useState<string | null>(null)
      return (
        <>
          <Treemap data={budget} selectable selected={sel} onSelectedChange={setSel} />
          <output>{sel ?? '—'}</output>
        </>
      )
    }
    render(<Demo />)
    const first = $('.ml-treemap__tile[tabindex="0"]') as HTMLElement
    act(() => first.focus())
    key(first, 'ArrowRight')
    const now = document.activeElement as HTMLElement
    expect(now).not.toBe(first)
    expect(now.getAttribute('tabindex')).toBe('0')
    key(now, 'Enter')
    expect($('output').textContent).not.toBe('—')
    key(now, 'Enter')
    expect($('output').textContent).toBe('—')
  })
})

describe('Sankey', () => {
  const nodes = [
    { id: 'a', label: '燃煤' },
    { id: 'b', label: '燃氣' },
    { id: 'g', label: '電網' },
    { id: 'h', label: '住宅' },
  ]
  const links = [
    { source: 'a', target: 'g', value: 40 },
    { source: 'b', target: 'g', value: 45 },
    { source: 'g', target: 'h', value: 85 },
    { source: 'h', target: 'a', value: 3 },
  ]

  it('drops the back-link, highlights flows on hover and focus', () => {
    render(<Sankey nodes={nodes} links={links} />)
    expect($$('.ml-sankey__link')).toHaveLength(3)
    fire($$('.ml-sankey__node')[2], 'pointerover', {})
    expect($$('.ml-sankey__link--on')).toHaveLength(3)
    fire($$('.ml-sankey__node')[2], 'pointerout', { relatedTarget: $$('.ml-sankey__node')[0] })
    expect($$('.ml-sankey__link--on')).toHaveLength(1)
    expect($$('.ml-sankey__link--dim')).toHaveLength(2)
    expect($('.ml-sankey__tip').textContent).toContain('燃煤')
    fire($('.ml-sankey__stage'), 'pointerout', { relatedTarget: document.body })
    expect(document.querySelector('.ml-sankey__tip')).toBeNull()
    const first = $('.ml-sankey__node[tabindex="0"]') as SVGGElement
    act(() => first.focus())
    key(first, 'ArrowRight')
    expect((document.activeElement as Element).getAttribute('aria-label')).toContain('電網')
    key(document.activeElement!, 'ArrowRight')
    expect((document.activeElement as Element).getAttribute('aria-label')).toContain('住宅')
    expect($$('.ml-sankey__link--on')).toHaveLength(1)
  })
})

describe('Gantt', () => {
  const initial: MlGanttTask[] = [
    { id: 'a', label: '研究', start: '2026-03-02', end: '2026-03-06', progress: 0.5, group: '設計' },
    { id: 'b', label: '介面', start: '2026-03-09', end: '2026-03-13', group: '設計', deps: ['a'] },
    { id: 'm', label: '上線', start: '2026-03-20', end: '2026-03-20', milestone: true },
  ]

  function Demo({ onChange }: { onChange: (id: string, start: string, end: string) => void }) {
    const [tasks, setTasks] = useState(initial)
    return (
      <Gantt
        tasks={tasks}
        editable
        today="2026-03-10"
        onChange={(t, r) => {
          onChange(t.id, ganttISO(ganttDay(r.start)), ganttISO(ganttDay(r.end)))
          setTasks((list) => list.map((x) => (x.id === t.id ? { ...x, start: r.start, end: r.end } : x)))
        }}
      />
    )
  }

  it('keyboard moves and resizes; the parent applies the change', () => {
    const onChange = vi.fn()
    render(<Demo onChange={onChange} />)
    expect($$('.ml-gantt__dep')).toHaveLength(1)
    expect($('.ml-gantt__today')).toBeTruthy()
    const body = $('.ml-gantt__body')
    key(body, 'ArrowDown')
    expect((document.activeElement as HTMLElement).dataset.id).toBe('a')
    key(body, 'ArrowRight')
    expect(onChange).toHaveBeenLastCalledWith('a', '2026-03-03', '2026-03-07')
    key(body, 'ArrowRight', true)
    expect(onChange).toHaveBeenLastCalledWith('a', '2026-03-03', '2026-03-08')
    expect($('.ml-gantt__bar[data-id="a"]').getAttribute('aria-label')).toContain('2026/3/3 – 2026/3/8')
    expect($('[aria-live]').textContent).toContain('研究')
  })

  it('drag moves a bar and the handle resizes it', () => {
    const onChange = vi.fn()
    render(<Demo onChange={onChange} />)
    const bar = $('.ml-gantt__bar[data-id="b"]')
    fire(bar, 'pointerdown', { button: 0, clientX: 50, pointerId: 1 })
    fire(window, 'pointermove', { clientX: 50 + 64, pointerId: 1 })
    expect($('.ml-gantt__bar--draft')).toBeTruthy()
    fire(window, 'pointerup', { clientX: 50 + 64, pointerId: 1 })
    expect(onChange).toHaveBeenLastCalledWith('b', '2026-03-11', '2026-03-15')
    const handle = $('.ml-gantt__bar[data-id="a"] .ml-gantt__handle')
    fire(handle, 'pointerdown', { button: 0, clientX: 200, pointerId: 2 })
    fire(window, 'pointermove', { clientX: 200 - 300, pointerId: 2 })
    fire(window, 'pointerup', { clientX: 200 - 300, pointerId: 2 })
    // Never shorter than one day.
    expect(onChange).toHaveBeenLastCalledWith('a', '2026-03-02', '2026-03-02')
  })

  it('groups collapse', () => {
    render(<Gantt tasks={initial} today={false} />)
    act(() => ($('.ml-gantt__group') as HTMLButtonElement).click())
    expect($('.ml-gantt__group').getAttribute('aria-expanded')).toBe('false')
    expect($$('.ml-gantt__bar')).toHaveLength(0)
    expect($$('.ml-gantt__milestone')).toHaveLength(1)
    expect(document.querySelector('.ml-gantt__handle')).toBeNull()
  })
})

describe('Candlestick', { timeout: 30_000 }, () => {
  const data: MlCandle[] = Array.from({ length: 80 }, (_, i) => {
    const open = 500 + i
    const close = open + (i % 3 === 0 ? -4 : 3)
    return { time: new Date(2026, 0, 1 + i).getTime(), open, close, high: Math.max(open, close) + 2, low: Math.min(open, close) - 2, volume: 1000 + i }
  })

  it('zoom buttons, keyboard crosshair, drag pan and wheel zoom', () => {
    render(<Candlestick data={data} visible={40} ma={[5]} />)
    expect($$('.ml-candle__k')).toHaveLength(40)
    const [zin, zout] = $$('.ml-candle__tool') as HTMLButtonElement[]
    act(() => zin.click())
    expect($$('.ml-candle__k')).toHaveLength(30)
    act(() => zout.click())
    expect($$('.ml-candle__k')).toHaveLength(40)
    const plot = $('.ml-candle__plot')
    key(plot, 'End')
    expect($('.ml-candle__cross')).toBeTruthy()
    expect($('.ml-candle__legend').textContent).toContain('2026/3/21')
    key(plot, 'ArrowLeft', true)
    expect($('[aria-live]').textContent).toContain('2026/3/11')
    key(plot, 'Escape')
    expect(document.querySelector('.ml-candle__cross')).toBeNull()
    fire(plot, 'pointerdown', { button: 0, clientX: 300, pointerId: 1 })
    fire(window, 'pointermove', { clientX: 300 + 135, pointerId: 1 })
    fire(window, 'pointerup', { clientX: 300 + 135, pointerId: 1 })
    expect(plot.getAttribute('aria-label')).toContain('至 2026/3/11')
    const wheel = new WheelEvent('wheel', { deltaY: -120, clientX: 540, bubbles: true, cancelable: true })
    act(() => plot.dispatchEvent(wheel))
    expect(wheel.defaultPrevented).toBe(true)
    expect($$('.ml-candle__k').length).toBeLessThan(40)
  })

  it('upColor flips the classes and intro motion ends', () => {
    vi.useFakeTimers()
    render(<Candlestick data={data.slice(0, 20)} upColor="green" />)
    expect($('.ml-candle').classList.contains('ml-candle--up-green')).toBe(true)
    expect($('.ml-candle').classList.contains('ml-candle--intro')).toBe(true)
    act(() => vi.advanceTimersByTime(1500))
    expect($('.ml-candle').classList.contains('ml-candle--intro')).toBe(false)
  })
})
