import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, createRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Ellipsis, Masonry, Scrollbar, type MasonryHandle, type ScrollbarHandle } from '../../src/react/content'
import { stubBox } from '../box-stub'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined
let restore: (() => void) | undefined
function render(el: React.ReactElement) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(el))
  return host
}
const $ = (s: string) => document.querySelector(s) as HTMLElement
const $$ = (s: string) => [...document.querySelectorAll(s)] as HTMLElement[]
const fire = (el: EventTarget, event: Event) => act(() => void el.dispatchEvent(event))
const pointer = (el: EventTarget, type: string, init: PointerEventInit = {}) =>
  fire(el, new PointerEvent(type, { bubbles: true, cancelable: true, button: 0, pointerId: 1, ...init }))
const syncFrames = () =>
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    cb(0)
    return 0
  })

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  restore?.()
  restore = undefined
  document.body.innerHTML = ''
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('Ellipsis', () => {
  it('shows the tooltip only when the text is actually cut', () => {
    vi.useFakeTimers()
    restore = stubBox((el, p) => (el.classList.contains('ml-ellipsis__text') ? (p === 'scrollWidth' ? 300 : p === 'clientWidth' ? 100 : undefined) : undefined))
    const onTruncate = vi.fn()
    render(<Ellipsis text="A very long lion name" onTruncate={onTruncate} />)
    expect(onTruncate).toHaveBeenCalledWith(true)
    const rootEl = $('.ml-ellipsis')
    expect(rootEl.classList.contains('ml-ellipsis--truncated')).toBe(true)
    expect($('.ml-ellipsis__text').getAttribute('tabindex')).toBe('0')
    fire(rootEl, new MouseEvent('mouseover', { bubbles: true, relatedTarget: document.body }))
    act(() => void vi.advanceTimersByTime(150))
    expect($('.ml-tooltip__bubble').classList.contains('ml-tooltip__bubble--visible')).toBe(true)
    fire(rootEl, new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect($('.ml-tooltip__bubble').classList.contains('ml-tooltip__bubble--visible')).toBe(false)
  })

  it('stays plain when it fits', () => {
    restore = stubBox((el, p) => (el.classList.contains('ml-ellipsis__text') && (p === 'scrollWidth' || p === 'clientWidth') ? 100 : undefined))
    render(<Ellipsis text="Short" expandable />)
    expect($('.ml-ellipsis').classList.contains('ml-ellipsis--truncated')).toBe(false)
    expect($('.ml-ellipsis__toggle')).toBeNull()
    expect($('.ml-ellipsis__text').hasAttribute('tabindex')).toBe(false)
  })

  it('expands and collapses, controlled or not', () => {
    restore = stubBox((el, p) => (el.classList.contains('ml-ellipsis__text') ? (p === 'scrollHeight' ? 120 : p === 'clientHeight' ? 48 : undefined) : undefined))
    const onExpandedChange = vi.fn()
    function Demo() {
      const [open, setOpen] = useState(false)
      return (
        <Ellipsis
          text="Long story"
          lines={2}
          expandable
          expanded={open}
          onExpandedChange={(v) => {
            onExpandedChange(v)
            setOpen(v)
          }}
        />
      )
    }
    render(<Demo />)
    const toggle = () => $('.ml-ellipsis__toggle')
    expect(toggle().textContent).toBe('展開')
    act(() => toggle().click())
    expect(onExpandedChange).toHaveBeenLastCalledWith(true)
    expect($('.ml-ellipsis').classList.contains('ml-ellipsis--expanded')).toBe(true)
    expect(toggle().getAttribute('aria-expanded')).toBe('true')
    expect(toggle().textContent).toBe('收起')
    act(() => toggle().click())
    expect($('.ml-ellipsis').classList.contains('ml-ellipsis--expanded')).toBe(false)
  })

  it('cuts in the middle, keeping the full text for screen readers', () => {
    restore = stubBox((el, p) => {
      if (el.classList.contains('ml-ellipsis__text') && p === 'clientWidth') return 100
      if (el.classList.contains('ml-ellipsis__measure') && p === 'offsetWidth') return Array.from(el.textContent ?? '').length * 10
      return undefined
    })
    render(<Ellipsis text="lion-mane-gold-texture@2x.png" position="middle" />)
    expect($('.ml-ellipsis__text [aria-hidden="true"]').textContent).toBe('lion…x.png')
    expect($('.ml-ellipsis__text .ml-visually-hidden').textContent).toBe('lion-mane-gold-texture@2x.png')
  })
})

describe('Scrollbar', () => {
  const box = (el: HTMLElement, p: string) => {
    if (el.classList.contains('ml-scrollbar__wrap')) return ({ clientHeight: 100, scrollHeight: 400, clientWidth: 100, scrollWidth: 100 } as Record<string, number>)[p]
    if (el.classList.contains('ml-scrollbar__track')) return ({ clientHeight: 100, clientWidth: 100 } as Record<string, number>)[p]
    return undefined
  }

  it('sizes and moves the thumb, fires onScroll / onReachEnd', () => {
    restore = stubBox(box)
    const onScroll = vi.fn()
    const onReachEnd = vi.fn()
    render(
      <Scrollbar maxHeight={100} label="Log" onScroll={onScroll} onReachEnd={onReachEnd}>
        <p>content</p>
      </Scrollbar>,
    )
    const wrap = $('.ml-scrollbar__wrap')
    expect(wrap.style.maxHeight).toBe('100px')
    expect(wrap.getAttribute('role')).toBe('region')
    expect(wrap.getAttribute('tabindex')).toBe('0')
    expect($('.ml-scrollbar').classList.contains('ml-scrollbar--has-y')).toBe(true)
    const thumb = $('.ml-scrollbar__track--y .ml-scrollbar__thumb')
    expect(thumb.style.height).toBe('25px')
    wrap.scrollTop = 300
    fire(wrap, new Event('scroll', { bubbles: true }))
    expect(onScroll).toHaveBeenLastCalledWith({ scrollTop: 300, scrollLeft: 0 })
    expect(onReachEnd).toHaveBeenCalledTimes(1)
    expect(onReachEnd).toHaveBeenCalledWith('y')
    expect(thumb.style.transform).toBe('translateY(75px)')
    fire(wrap, new Event('scroll', { bubbles: true }))
    expect(onReachEnd).toHaveBeenCalledTimes(1)
  })

  it('drags, pages on track clicks and exposes scrollTo helpers', () => {
    restore = stubBox(box)
    const ref = createRef<ScrollbarHandle>()
    render(<Scrollbar ref={ref} height={100}>x</Scrollbar>)
    const wrap = $('.ml-scrollbar__wrap')
    const thumb = $('.ml-scrollbar__track--y .ml-scrollbar__thumb')
    pointer(thumb, 'pointerdown', { clientY: 10 })
    expect($('.ml-scrollbar').classList.contains('ml-scrollbar--dragging')).toBe(true)
    pointer(thumb, 'pointermove', { clientY: 25 })
    expect(wrap.scrollTop).toBe(60)
    pointer(thumb, 'pointerup')
    expect($('.ml-scrollbar').classList.contains('ml-scrollbar--dragging')).toBe(false)

    const scrollBy = vi.fn()
    wrap.scrollBy = scrollBy as never
    const track = $('.ml-scrollbar__track--y')
    vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({ top: 0, left: 0 } as DOMRect)
    pointer(track, 'pointerdown', { clientY: 95 })
    expect(scrollBy).toHaveBeenLastCalledWith({ top: 90, behavior: 'smooth' })

    const scrollTo = vi.fn()
    wrap.scrollTo = scrollTo as never
    expect(ref.current!.wrap).toBe(wrap)
    act(() => ref.current!.scrollTo(0, 50))
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 0, top: 50 })
    act(() => ref.current!.scrollToTop(false))
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: 'auto' })
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    act(() => ref.current!.scrollToBottom())
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 400, behavior: 'auto' })
  })
})

describe('Masonry', () => {
  const items = [
    { id: 'a', h: 100 },
    { id: 'b', h: 50 },
    { id: 'c', h: 80 },
    { id: 'd', h: 30 },
  ]

  it('drops each item into the shortest column and keeps DOM order', () => {
    syncFrames()
    restore = stubBox((el, p) => {
      if (el.classList.contains('ml-masonry') && p === 'clientWidth') return 300
      if (el.classList.contains('ml-masonry__item') && p === 'offsetHeight') return Number((el.firstElementChild as HTMLElement)?.dataset.h ?? 0)
      return undefined
    })
    const onLayout = vi.fn()
    const ref = createRef<MasonryHandle>()
    function Demo() {
      const [list, setList] = useState(items)
      return (
        <>
          <button onClick={() => setList([...list, { id: 'e', h: 20 }])}>more</button>
          <Masonry ref={ref} items={list} columns={{ 0: 1, 200: 2 }} gap={10} itemKey={(i) => i.id} onLayout={onLayout}>
            {(item) => <div data-h={item.h}>{item.id}</div>}
          </Masonry>
        </>
      )
    }
    render(<Demo />)
    const rootEl = $('.ml-masonry')
    expect(rootEl.classList.contains('ml-masonry--ready')).toBe(true)
    expect(rootEl.style.getPropertyValue('--ml-masonry-col')).toBe('145px')
    expect(rootEl.style.height).toBe('140px')
    const cells = $$('.ml-masonry__item')
    expect(cells.map((c) => c.textContent)).toEqual(['a', 'b', 'c', 'd'])
    expect(cells.map((c) => c.style.transform)).toEqual(['translate(0px, 0px)', 'translate(155px, 0px)', 'translate(155px, 60px)', 'translate(0px, 110px)'])
    expect(onLayout).toHaveBeenLastCalledWith({ columns: 2, height: 140 })

    act(() => $('button').click())
    const after = $$('.ml-masonry__item')
    expect(after).toHaveLength(5)
    expect(after[4].style.transform).toBe('translate(0px, 150px)')
    expect(after[0].classList.contains('ml-masonry__item--settled')).toBe(true)
    expect(after[4].classList.contains('ml-masonry__item--settled')).toBe(false)
    act(() => ref.current!.layout())
    expect($$('.ml-masonry__item--placed')).toHaveLength(5)
  })

  it('keeps the grid fallback until it can measure', () => {
    render(<Masonry items={items} columns={{ 0: 2, 900: 4 }}>{(item) => item.id}</Masonry>)
    const rootEl = $('.ml-masonry')
    expect(rootEl.classList.contains('ml-masonry--ready')).toBe(false)
    expect(rootEl.style.getPropertyValue('--ml-masonry-cols')).toBe('2')
  })
})
