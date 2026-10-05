// Closable / addable / reorderable <Tabs>.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Tabs, nextTabAfterClose } from '../../src/react'
import type { MlTabItem } from '../../src/types'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined
function render(el: React.ReactElement) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(el))
  return host
}
const key = (el: Element, k: string, init: KeyboardEventInit = {}) =>
  act(() => void el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init })))
const click = (el: Element | null) => act(() => void (el as HTMLElement).click())
const $$ = (sel: string) => [...document.querySelectorAll<HTMLElement>(sel)]
const tabEls = () => $$('[role="tab"]')
const labels = () => tabEls().map((t) => t.textContent)

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
})

const start: MlTabItem[] = [
  { value: 'home', label: '首頁', closable: false },
  { value: 'orders', label: '訂單' },
  { value: 'off', label: '停用', disabled: true },
  { value: 'users', label: '會員' },
]

const log = { close: vi.fn(), add: vi.fn(), reorder: vi.fn() }

// A parent that applies close / reorder the way an app would.
function Demo() {
  const [items, setItems] = useState(start)
  const [active, setActive] = useState('orders')
  return (
    <>
      <Tabs
        items={items}
        value={active}
        onChange={setActive}
        closable
        addable
        reorderable
        onClose={(v) => {
          log.close(v)
          if (v === active) setActive(nextTabAfterClose(items, v) ?? '')
          setItems(items.filter((i) => i.value !== v))
        }}
        onAdd={log.add}
        onReorder={(order) => {
          log.reorder(order)
          setItems(order.map((v) => items.find((i) => i.value === v)!))
        }}
      />
      <output>{active}</output>
    </>
  )
}

describe('Tabs editing', () => {
  afterEach(() => Object.values(log).forEach((f) => f.mockClear()))

  it('gives closable tabs a close button; an item can opt out', () => {
    render(<Demo />)
    expect($$('.ml-tabs__close').map((b) => b.getAttribute('aria-label'))).toEqual(['關閉 訂單', '關閉 停用', '關閉 會員'])
    expect($$('.ml-tabs__close')[1].hasAttribute('disabled')).toBe(true)
    expect($$('.ml-tabs__add')[0].getAttribute('aria-label')).toBe('新增分頁')
    expect(tabEls()[1].getAttribute('aria-keyshortcuts')).toBe('Delete Alt+ArrowLeft Alt+ArrowRight')
  })

  it('closes from the × without changing selection, and with the middle button', () => {
    render(<Demo />)
    click($$('.ml-tabs__close')[2])
    expect(log.close).toHaveBeenLastCalledWith('users')
    expect(document.querySelector('output')!.textContent).toBe('orders')
    act(() => void tabEls()[0].dispatchEvent(new MouseEvent('auxclick', { button: 1, bubbles: true })))
    expect(log.close).toHaveBeenCalledTimes(1) // home isn't closable
    act(() => void tabEls()[1].dispatchEvent(new MouseEvent('auxclick', { button: 1, bubbles: true })))
    expect(log.close).toHaveBeenLastCalledWith('orders')
  })

  it('closes the focused tab with Delete and moves focus to the neighbour', () => {
    render(<Demo />)
    act(() => tabEls()[1].focus())
    key(tabEls()[1], 'Delete')
    expect(log.close).toHaveBeenCalledWith('orders')
    expect(document.querySelector('output')!.textContent).toBe('users')
    expect(document.activeElement?.textContent).toBe('會員')
    expect(labels()).toEqual(['首頁', '停用', '會員'])
  })

  it('calls onAdd', () => {
    render(<Demo />)
    click($$('.ml-tabs__add')[0])
    expect(log.add).toHaveBeenCalledTimes(1)
  })

  it('reorders with Alt + arrows, keeps focus and announces the move', () => {
    render(<Demo />)
    act(() => tabEls()[1].focus())
    key(tabEls()[1], 'ArrowRight', { altKey: true })
    expect(log.reorder).toHaveBeenCalledWith(['home', 'off', 'orders', 'users'])
    expect(labels()).toEqual(['首頁', '停用', '訂單', '會員'])
    expect(document.activeElement?.textContent).toBe('訂單')
    expect(document.querySelector('[aria-live="polite"]')!.textContent).toBe('訂單 移到第 3 個，共 4 個')
  })

  it('drags a tab past its neighbours with a drop indicator', () => {
    render(<Demo />)
    $$('.ml-tabs__list > .ml-tabs__item, .ml-tabs__list > .ml-tabs__tab').forEach((el, i) => {
      el.getBoundingClientRect = () => ({ left: i * 100, width: 100, right: i * 100 + 100, top: 0, bottom: 40, height: 40, x: i * 100, y: 0, toJSON() {} }) as DOMRect
    })
    const pe = (type: string, x: number) => new PointerEvent(type, { clientX: x, button: 0, pointerId: 1, pointerType: 'mouse', bubbles: true, cancelable: true })
    act(() => void tabEls()[1].dispatchEvent(pe('pointerdown', 150)))
    act(() => void window.dispatchEvent(pe('pointermove', 152)))
    expect(document.querySelector('.ml-tabs__drop')).toBeNull()
    act(() => void window.dispatchEvent(pe('pointermove', 380)))
    expect(document.querySelector('.ml-tabs__drop')).not.toBeNull()
    expect(tabEls()[1].classList.contains('ml-tabs__tab--dragging')).toBe(true)
    act(() => void window.dispatchEvent(pe('pointerup', 380)))
    expect(log.reorder).toHaveBeenCalledWith(['home', 'off', 'users', 'orders'])
    expect(document.querySelector('.ml-tabs__drop')).toBeNull()
  })

  it('touch drags keep scrolling instead of reordering', () => {
    render(<Demo />)
    const pe = (type: string, x: number) => new PointerEvent(type, { clientX: x, button: 0, pointerId: 1, pointerType: 'touch', bubbles: true })
    act(() => void tabEls()[1].dispatchEvent(pe('pointerdown', 150)))
    act(() => void window.dispatchEvent(pe('pointermove', 380)))
    act(() => void window.dispatchEvent(pe('pointerup', 380)))
    expect(log.reorder).not.toHaveBeenCalled()
  })

  it('shows scroll buttons when the strip overflows', () => {
    render(<Tabs items={start} />)
    const list = document.querySelector<HTMLElement>('.ml-tabs__list')!
    Object.defineProperties(list, { clientWidth: { value: 200 }, scrollWidth: { value: 500 } })
    list.scrollLeft = 100
    act(() => void list.dispatchEvent(new Event('scroll')))
    expect(document.querySelector('.ml-tabs__bar')!.className).toBe('ml-tabs__bar ml-tabs__bar--more-start ml-tabs__bar--more-end')
    expect($$('.ml-tabs__scroll').map((b) => b.getAttribute('aria-label'))).toEqual(['向左捲動分頁', '向右捲動分頁'])
  })
})
