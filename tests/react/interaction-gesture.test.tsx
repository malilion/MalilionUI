import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, createRef } from 'react'
import { createRoot, hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { PullRefresh, SwipeCell, type PullRefreshHandle, type SwipeCellHandle } from '../../src/react/gesture'
import { List } from '../../src/react/layout'
import type { MlSwipeAction } from '../../src/types'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined
function render(el: React.ReactElement) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(el))
  return host
}
const pointer = (el: EventTarget, type: string, x: number, y: number) =>
  act(() => void el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, pointerId: 1, pointerType: 'mouse' })))
const key = (el: Element | null, k: string, init: KeyboardEventInit = {}) =>
  act(() => void el!.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init })))
const $ = (s: string) => document.querySelector(s)
const $$ = (s: string) => [...document.querySelectorAll(s)]
const rect = (width: number) => ({ left: 0, top: 0, width, height: 56, right: width, bottom: 56, x: 0, y: 0, toJSON() {} }) as DOMRect
const flushTimers = () => act(() => new Promise<void>((r) => setTimeout(r, 0)))

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  vi.useRealTimers()
})

const right: MlSwipeAction[] = [
  { label: '封存', value: 'archive', icon: 'folder', tone: 'accent' },
  { label: '刪除', value: 'delete', icon: 'close', tone: 'danger' },
]
const left: MlSwipeAction[] = [{ label: '已讀', value: 'read' }]

function geometry() {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    if (this.classList.contains('ml-swipe-cell__actions--right')) return rect(144)
    if (this.classList.contains('ml-swipe-cell__actions--left')) return rect(72)
    if (this.classList.contains('ml-swipe-cell')) return rect(360)
    return rect(0)
  })
}

async function drag(content: Element, dx: number, dy = 0) {
  pointer(content, 'pointerdown', 200, 20)
  pointer(window, 'pointermove', 200 + (dy ? 0 : Math.sign(dx) * 10), 20 + (dy ? Math.sign(dy) * 10 : 0))
  pointer(window, 'pointermove', 200 + dx, 20 + dy)
  return async () => {
    pointer(window, 'pointerup', 200 + dx, 20 + dy)
    await flushTimers()
  }
}

const transform = (el: Element | null) => (el as HTMLElement).style.transform

describe('SwipeCell', () => {
  it('drags open past half the actions and reports the side', async () => {
    geometry()
    const onOpenChange = vi.fn()
    render(<SwipeCell title="獅子王" leftActions={left} rightActions={right} onOpenChange={onOpenChange} />)
    const content = $('.ml-swipe-cell__content')!
    const release = await drag(content, -100)
    expect($('.ml-swipe-cell')!.classList).toContain('ml-swipe-cell--dragging')
    expect(transform(content)).toBe('translate3d(-100px, 0, 0)')
    await release()
    expect(onOpenChange).toHaveBeenCalledWith('right')
    expect(transform(content)).toBe('translate3d(-144px, 0, 0)')
    expect($('.ml-swipe-cell__actions--right')!.hasAttribute('inert')).toBe(false)
    expect($('.ml-swipe-cell__actions--left')!.hasAttribute('inert')).toBe(true)
    expect($('.ml-swipe-cell__more')!.getAttribute('aria-expanded')).toBe('true')
  })

  it('direction lock: a vertical drag never moves the row', async () => {
    geometry()
    const onOpenChange = vi.fn()
    render(<SwipeCell title="A" rightActions={right} onOpenChange={onOpenChange} />)
    const content = $('.ml-swipe-cell__content')!
    const release = await drag(content, -4, 40)
    pointer(window, 'pointermove', 40, 60)
    expect(transform(content)).toBe('')
    await release()
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('full swipe fires the outermost action and closes', async () => {
    geometry()
    const onAction = vi.fn()
    render(<SwipeCell title="A" rightActions={right} fullSwipe onAction={onAction} />)
    const content = $('.ml-swipe-cell__content')!
    const release = await drag(content, -260)
    expect($('.ml-swipe-cell')!.classList).toContain('ml-swipe-cell--full')
    expect($('.ml-swipe-cell__action--expanded')!.textContent).toBe('刪除')
    await release()
    expect(onAction).toHaveBeenCalledWith(right[1], 'right')
    expect(transform(content)).toBe('')
  })

  it('only one cell of a group stays open', async () => {
    geometry()
    render(
      <List>
        <SwipeCell title="A" rightActions={right} />
        <SwipeCell title="B" rightActions={right} />
      </List>,
    )
    const [a, b] = $$('.ml-swipe-cell__content')
    await (await drag(a, -100))()
    expect(transform(a)).toBe('translate3d(-144px, 0, 0)')
    await (await drag(b, -100))()
    expect(transform(b)).toBe('translate3d(-144px, 0, 0)')
    expect(transform(a)).toBe('')
  })

  it('outside tap and tapping the open row close it; actions call onAction', async () => {
    geometry()
    const onAction = vi.fn()
    const onSelect = vi.fn()
    render(<SwipeCell title="A" clickable onSelect={onSelect} rightActions={right} defaultOpen="right" onAction={onAction} />)
    const content = $('.ml-swipe-cell__content')!
    expect(transform(content)).toBe('translate3d(-144px, 0, 0)')
    act(() => (document.body as HTMLElement).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })))
    expect(transform(content)).toBe('')
    const handle = createRef<SwipeCellHandle>()
    act(() => root!.render(<SwipeCell ref={handle} title="A" clickable onSelect={onSelect} rightActions={right} onAction={onAction} />))
    act(() => handle.current!.open('right'))
    act(() => ($('.ml-list-item__row') as HTMLElement).click())
    expect(onSelect).not.toHaveBeenCalled()
    expect(transform(content)).toBe('')
    act(() => ($('.ml-list-item__row') as HTMLElement).click())
    expect(onSelect).toHaveBeenCalledOnce()
    act(() => handle.current!.open('right'))
    act(() => ($$('.ml-swipe-cell__actions--right button')[0] as HTMLElement).click())
    expect(onAction).toHaveBeenCalledWith(right[0], 'right')
    expect(transform(content)).toBe('')
  })

  it('keyboard: more button, arrows, Escape, Shift+F10', async () => {
    geometry()
    const onOpenChange = vi.fn()
    render(<SwipeCell title="獅子王" leftActions={left} rightActions={right} onOpenChange={onOpenChange} />)
    const more = $('.ml-swipe-cell__more') as HTMLButtonElement
    expect(more.getAttribute('aria-label')).toBe('獅子王：更多動作')
    act(() => more.click())
    await flushTimers()
    expect(onOpenChange).toHaveBeenLastCalledWith('right')
    expect(document.activeElement?.textContent).toBe('封存')
    key(document.activeElement, 'ArrowRight')
    await flushTimers()
    expect(onOpenChange).toHaveBeenLastCalledWith('left')
    expect(document.activeElement?.textContent).toBe('已讀')
    key(document.activeElement, 'Escape')
    expect(onOpenChange).toHaveBeenLastCalledWith(null)
    expect(document.activeElement).toBe(more)
    key($('.ml-swipe-cell__content'), 'F10', { shiftKey: true })
    await flushTimers()
    expect(onOpenChange).toHaveBeenLastCalledWith('right')
  })
})

describe('PullRefresh', () => {
  async function pull(y: number) {
    const el = $('.feed')!
    pointer(el, 'pointerdown', 100, 10)
    pointer(window, 'pointermove', 100, 22)
    pointer(window, 'pointermove', 100, y)
    return () => pointer(window, 'pointerup', 100, y)
  }
  const cls = () => $('.ml-pull-refresh')!.classList
  const text = () => $('.ml-pull-refresh__text')?.textContent
  const track = () => transform($('.ml-pull-refresh__track'))

  it('pull → release → refreshing → success → idle', async () => {
    vi.useFakeTimers()
    let resolve!: () => void
    const onRefresh = vi.fn(() => new Promise<void>((r) => (resolve = r)))
    const onStatusChange = vi.fn()
    render(
      <PullRefresh onRefresh={onRefresh} onStatusChange={onStatusChange}>
        <ul className="feed"><li>一</li></ul>
      </PullRefresh>,
    )
    const release = await pull(60)
    expect(cls()).toContain('ml-pull-refresh--pulling')
    expect(text()).toBe('下拉即可重新整理')
    pointer(window, 'pointermove', 100, 220)
    expect(cls()).toContain('ml-pull-refresh--loosing')
    expect(text()).toBe('放開以重新整理')
    release()
    expect(onRefresh).toHaveBeenCalledOnce()
    expect(cls()).toContain('ml-pull-refresh--refreshing')
    expect(track()).toBe('translate3d(0, 56px, 0)')
    expect($('[role="status"]')!.textContent).toBe('重新整理中…')
    await act(async () => resolve())
    expect(cls()).toContain('ml-pull-refresh--success')
    expect(text()).toBe('已更新')
    act(() => void vi.advanceTimersByTime(600))
    expect(track()).toBe('')
    act(() => void vi.advanceTimersByTime(300))
    expect(cls()).toContain('ml-pull-refresh--idle')
    expect(onStatusChange.mock.calls.map((c) => c[0])).toEqual(['pulling', 'loosing', 'refreshing', 'success', 'idle'])
  })

  it('rejection shows the fail text; an early release springs back', async () => {
    const onRefresh = vi.fn(() => Promise.reject(new Error('x')))
    render(
      <PullRefresh onRefresh={onRefresh}>
        <ul className="feed" />
      </PullRefresh>,
    )
    ;(await pull(50))()
    expect(onRefresh).not.toHaveBeenCalled()
    expect(cls()).toContain('ml-pull-refresh--idle')
    await flushTimers()
    ;(await pull(240))()
    await act(async () => {})
    expect(cls()).toContain('ml-pull-refresh--fail')
    expect(text()).toBe('更新失敗')
  })

  it('ignores horizontal drags', async () => {
    const onRefresh = vi.fn()
    render(
      <PullRefresh onRefresh={onRefresh}>
        <ul className="feed" />
      </PullRefresh>,
    )
    pointer($('.feed')!, 'pointerdown', 100, 10)
    pointer(window, 'pointermove', 115, 12)
    pointer(window, 'pointermove', 100, 240)
    expect(cls()).not.toContain('ml-pull-refresh--dragging')
    pointer(window, 'pointerup', 100, 240)
    expect(onRefresh).not.toHaveBeenCalled()
  })

  it('the focus-only button and the ref handle refresh', async () => {
    const onRefresh = vi.fn()
    const handle = createRef<PullRefreshHandle>()
    render(
      <PullRefresh ref={handle} onRefresh={onRefresh}>
        <ul className="feed" />
      </PullRefresh>,
    )
    act(() => ($('.ml-pull-refresh__button') as HTMLElement).click())
    expect(onRefresh).toHaveBeenCalledOnce()
    await act(async () => {})
    expect(handle.current!.status).toBe('success')
    await act(() => handle.current!.refresh())
    expect(onRefresh).toHaveBeenCalledTimes(2)
  })

  it('hydrates the server markup without mismatch', () => {
    const el = (
      <PullRefresh>
        <SwipeCell title="A" rightActions={right} leftActions={left} />
      </PullRefresh>
    )
    const host = document.createElement('div')
    host.innerHTML = renderToString(el)
    document.body.appendChild(host)
    const errors: unknown[] = []
    const spy = vi.spyOn(console, 'error').mockImplementation((...a) => void errors.push(a))
    act(() => {
      root = hydrateRoot(host, el, { onRecoverableError: (e) => errors.push(e) })
    })
    spy.mockRestore()
    expect(errors).toEqual([])
  })
})
