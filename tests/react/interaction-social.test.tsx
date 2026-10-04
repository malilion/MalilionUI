import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, createRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { StickerPicker } from '../../src/react/sticker'
import { Comments } from '../../src/react/comments'
import { SwipeStack, type SwipeStackHandle } from '../../src/react/swipe-stack'
import { Inbox } from '../../src/react/inbox'
import { ConfigProvider } from '../../src/react/locale'
import { en } from '../../src/locale-data'
import type { MlComment } from '../../src/components/comments'
import type { MlInboxItem } from '../../src/components/inbox'
import { CUTE_ICON_GROUPS } from '../../src/components/cute-icons'

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
const key = (el: Element, k: string, init: KeyboardEventInit = {}) => act(() => void el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, ...init })))
const click = (el: Element) => act(() => (el as HTMLElement).click())
/** Set a controlled input / textarea's value the way React notices. */
function type(el: Element, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  act(() => {
    Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

afterEach(async () => {
  await new Promise((r) => setTimeout(r, 0))
  act(() => root?.unmount())
  root = undefined
  vi.useRealTimers()
  vi.restoreAllMocks()
  document.body.innerHTML = ''
  localStorage.clear()
})

const NOW = new Date('2026-10-04T12:00:00')
const at = (min: number) => NOW.getTime() - min * 60_000

describe('StickerPicker', () => {
  it('grid keys, select, recent with storage, search', () => {
    localStorage.setItem('stk', JSON.stringify(['frog']))
    const onSelect = vi.fn()
    render(<StickerPicker storageKey="stk" columns={4} onSelect={onSelect} />)
    const items = () => $$('.ml-sticker-picker__item') as HTMLElement[]
    expect(items().map((b) => b.dataset.name)).toEqual(CUTE_ICON_GROUPS[0].names)
    act(() => items()[0].focus())
    key(items()[0], 'ArrowDown')
    expect(document.activeElement).toBe(items()[4])
    expect(items()[4].tabIndex).toBe(0)
    key(items()[4], 'ArrowRight')
    expect(document.activeElement).toBe(items()[5])
    click(items()[2])
    expect(onSelect).toHaveBeenCalledWith('dog')
    expect(JSON.parse(localStorage.getItem('stk')!)).toEqual(['dog', 'frog'])
    click($('[data-tab="recent"]'))
    expect(items().map((b) => b.dataset.name)).toEqual(['dog', 'frog'])
    key($('[role="tablist"]'), 'End')
    expect($('.ml-sticker-picker__tab--active').getAttribute('data-tab')).toBe('tech')
    expect(document.activeElement).toBe($('[data-tab="tech"]'))
    type($('input'), '珍珠奶茶')
    expect(items().map((b) => b.dataset.name)).toEqual(['bubbleTea'])
    expect($('[aria-live]').textContent).toBe('找到 1 個貼圖')
    key($('input'), 'Enter')
    expect(onSelect).toHaveBeenLastCalledWith('bubbleTea')
  })

  it('trigger: portal dialog, Escape closes and refocuses, select closes', () => {
    const onSelect = vi.fn()
    const onOpenChange = vi.fn()
    render(<StickerPicker trigger onSelect={onSelect} onOpenChange={onOpenChange} />)
    const btn = $('.ml-sticker-picker__trigger') as HTMLButtonElement
    click(btn)
    const panel = $('.ml-sticker-picker__panel--popup')
    expect(panel.parentElement).toBe(document.body)
    expect(panel.getAttribute('role')).toBe('dialog')
    expect(btn.getAttribute('aria-expanded')).toBe('true')
    expect(document.activeElement).toBe(panel.querySelector('input'))
    key(panel.querySelector('input')!, 'Escape')
    expect(document.querySelector('.ml-sticker-picker__panel')).toBeNull()
    expect(document.activeElement).toBe(btn)
    expect(onOpenChange.mock.calls).toEqual([[true], [false]])
    click(btn)
    click($('.ml-sticker-picker__item'))
    expect(onSelect).toHaveBeenCalledWith('lion')
    expect(document.querySelector('.ml-sticker-picker__panel')).toBeNull()
    click(btn)
    act(() => void document.body.dispatchEvent(new Event('pointerdown', { bubbles: true })))
    expect(document.querySelector('.ml-sticker-picker__panel')).toBeNull()
  })
})

const thread: MlComment[] = [
  {
    id: 1,
    author: { name: '阿哲' },
    content: '第一則',
    time: at(60),
    likes: 2,
    replies: [
      { id: 11, author: { name: '小美' }, content: '回覆一', time: at(50), replies: [{ id: 111, author: { name: '阿哲' }, content: '再回覆', time: at(40) }] },
      { id: 12, author: { name: 'Leo' }, content: '回覆二', time: at(45) },
    ],
  },
  { id: 2, author: { name: 'Yuki' }, content: '<i>text</i>', time: at(5), likes: 9 },
]

describe('Comments', () => {
  function Controlled(props: { onSubmit?: (c: string, p?: string | number) => void; onLike?: (id: string | number, liked: boolean) => void; maxDepth?: number; collapseAfter?: number }) {
    const [list, setList] = useState(thread)
    return <Comments comments={list} onCommentsChange={setList} now={NOW} currentUser={{ name: '你' }} {...props} />
  }

  it('threads, text only, relative time, flattening, collapse and sort', () => {
    render(<Controlled maxDepth={1} collapseAfter={2} />)
    expect($('.ml-comments__title').textContent).toContain('5 則')
    expect($('article time').textContent).toBe('5 分鐘前')
    expect($('article .ml-comments__content').textContent).toBe('<i>text</i>')
    expect(document.querySelector('article i')).toBeNull()
    expect($('.ml-comments__reply-to').textContent).toBe('回覆 @小美')
    const toggle = $('.ml-comments__toggle')
    expect(toggle.textContent).toBe('展開 1 則回覆')
    click(toggle)
    expect($('.ml-comments__toggle').textContent).toBe('收起回覆')
    click($$('.ml-comments__sort-btn')[2])
    expect($$('.ml-comments__list > li > article h4').map((h) => h.textContent)).toEqual(['Yuki', '阿哲'])
  })

  it('like toggles with the paw; submit and reply with keyboard', () => {
    const onLike = vi.fn()
    const onSubmit = vi.fn()
    render(<Controlled onLike={onLike} onSubmit={onSubmit} />)
    const like = $$('.ml-comments__like')[0]
    click(like)
    expect(onLike).toHaveBeenCalledWith(2, true)
    expect($$('.ml-comments__like')[0].getAttribute('aria-pressed')).toBe('true')
    expect($$('.ml-comments__like-count')[0].textContent).toBe('10')

    const top = $('.ml-comments__composer textarea')
    type(top, '大家好')
    key(top, 'Enter', { metaKey: true })
    expect(onSubmit).toHaveBeenCalledWith('大家好', undefined)
    expect($('[aria-live]').textContent).toBe('已送出留言')
    expect($$('.ml-comments__list > li > article h4')[0].textContent).toBe('你')

    const replyBtn = $$('.ml-comments__reply-btn')[1] as HTMLElement
    click(replyBtn)
    const box = $('.ml-comments__editor--reply textarea')
    expect(document.activeElement).toBe(box)
    key(box, 'Escape')
    expect(document.querySelector('.ml-comments__editor--reply')).toBeNull()
    expect(document.activeElement).toBe(replyBtn)
    click(replyBtn)
    type($('.ml-comments__editor--reply textarea'), '回你')
    key($('.ml-comments__editor--reply textarea'), 'Enter', { ctrlKey: true })
    expect(onSubmit).toHaveBeenLastCalledWith('回你', 2)
    expect(document.body.textContent).toContain('回你')
    expect(document.activeElement).toBe($$('.ml-comments__reply-btn')[1])
  })

  it('empty, readonly and English', () => {
    render(
      <ConfigProvider locale={en}>
        <Comments comments={[]} />
        <Comments comments={thread} now={NOW} readonly />
      </ConfigProvider>,
    )
    expect($('.ml-empty__title').textContent).toBe('No comments yet')
    expect($$('textarea')).toHaveLength(1)
    expect($$('.ml-comments')[1].querySelector('time')!.textContent).toBe('5 minutes ago')
    expect($$('.ml-comments')[1].querySelector('.ml-comments__reply-btn')).toBeNull()
  })
})

describe('SwipeStack', () => {
  const cards = ['A', 'B', 'C']
  it('buttons, keyboard, undo, handle and empty', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList)
    const onSwipe = vi.fn()
    const onUndo = vi.fn()
    const onEmpty = vi.fn()
    const onIndexChange = vi.fn()
    const ref = createRef<SwipeStackHandle>()
    render(<SwipeStack ref={ref} items={cards} itemLabel={(s) => s} renderItem={(s) => <b>{s}</b>} onSwipe={onSwipe} onUndo={onUndo} onEmpty={onEmpty} onIndexChange={onIndexChange} />)
    expect($$('.ml-swipe-stack__card').map((c) => c.querySelector('b')!.textContent)).toEqual(['A', 'B', 'C'])
    click($('.ml-swipe-stack__btn--like'))
    expect(onSwipe).toHaveBeenCalledWith('A', 'right', 0)
    expect(onIndexChange).toHaveBeenLastCalledWith(1)
    expect($('[aria-live]').textContent).toBe('喜歡：A')
    key($('.ml-swipe-stack'), 'ArrowLeft')
    expect(onSwipe).toHaveBeenLastCalledWith('B', 'left', 1)
    key($('.ml-swipe-stack'), 'ArrowUp')
    expect(onSwipe).toHaveBeenCalledTimes(2)
    key($('.ml-swipe-stack'), 'Backspace')
    expect(onUndo).toHaveBeenCalledWith('B', 1)
    expect($('.ml-swipe-stack__card--top b').textContent).toBe('B')
    let ok = false
    act(() => void (ok = ref.current!.swipe('right')))
    expect(ok).toBe(true)
    act(() => void ref.current!.swipe('left'))
    expect(onEmpty).toHaveBeenCalledTimes(1)
    expect(document.querySelector('.ml-swipe-stack__card--top')).toBeNull()
    expect($('.ml-swipe-stack__empty').textContent).toContain('沒有更多卡片了')
    act(() => void (ok = ref.current!.swipe('left')))
    expect(ok).toBe(false)
  })

  it('pointer drag: stamp strength while dragging, throw past the threshold', () => {
    const onSwipe = vi.fn()
    render(<SwipeStack items={cards} renderItem={(s) => s} onSwipe={onSwipe} />)
    const deck = $('.ml-swipe-stack__deck') as HTMLElement
    vi.spyOn(deck, 'getBoundingClientRect').mockReturnValue({ width: 300, height: 400, top: 0, left: 0, right: 300, bottom: 400, x: 0, y: 0, toJSON() {} })
    const pe = (type: string, x: number) => new PointerEvent(type, { clientX: x, clientY: 0, pointerId: 2, button: 0, pointerType: 'mouse', bubbles: true })
    act(() => void deck.dispatchEvent(pe('pointerdown', 0)))
    act(() => void window.dispatchEvent(pe('pointermove', 45)))
    const top = $('.ml-swipe-stack__card--top') as HTMLElement
    expect(top.classList.contains('ml-swipe-stack__card--dragging')).toBe(true)
    expect(top.style.getPropertyValue('--_ss-like')).toBe('0.5')
    act(() => void window.dispatchEvent(pe('pointermove', 150)))
    act(() => void window.dispatchEvent(pe('pointerup', 150)))
    expect(onSwipe).toHaveBeenCalledWith('A', 'right', 0)
    expect(document.querySelector('.ml-swipe-stack__card--leaving-right')).not.toBeNull()
  })
})

const notes: MlInboxItem[] = [
  { id: 'a', title: '提到你', type: 'mention', time: new Date('2026-10-04T11:58:00') },
  { id: 'b', title: '部署完成', type: 'success', time: new Date('2026-10-04T08:00:00'), read: true },
  { id: 'c', title: '昨天的', time: new Date('2026-10-03T21:00:00') },
]

describe('Inbox', () => {
  function Controlled(props: Partial<React.ComponentProps<typeof Inbox>>) {
    const [items, setItems] = useState(notes)
    return <Inbox items={items} onItemsChange={setItems} now={NOW} {...props} />
  }

  it('bell opens, focuses the first unread, Escape returns to the bell, outside click closes', () => {
    render(<Controlled />)
    const bell = $('.ml-inbox__bell') as HTMLButtonElement
    expect(bell.getAttribute('aria-label')).toBe('通知，2 則未讀')
    expect($('.ml-inbox__badge').textContent).toBe('2')
    click(bell)
    expect($('.ml-inbox__panel').getAttribute('role')).toBe('dialog')
    expect(document.activeElement?.textContent).toContain('提到你')
    key(document.activeElement!, 'Escape')
    expect(document.querySelector('.ml-inbox__panel')).toBeNull()
    expect(document.activeElement).toBe(bell)
    click(bell)
    act(() => void document.body.dispatchEvent(new Event('pointerdown', { bubbles: true })))
    expect(document.querySelector('.ml-inbox__panel')).toBeNull()
  })

  it('read on select, tabs, read all, dismiss with keys', () => {
    const onRead = vi.fn()
    const onReadAll = vi.fn()
    const onDismiss = vi.fn()
    const onSelect = vi.fn()
    render(<Controlled inline onRead={onRead} onReadAll={onReadAll} onDismiss={onDismiss} onSelect={onSelect} />)
    expect($$('.ml-inbox__group-title').map((g) => g.textContent)).toEqual(['今天', '昨天'])
    expect($$('.ml-inbox__count').map((c) => c.textContent)).toEqual(['3', '2', '1'])
    click($$('.ml-inbox__main')[0])
    expect(onRead).toHaveBeenCalledWith('a')
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }))
    expect($$('.ml-inbox__item--unread')).toHaveLength(1)
    key($('[role="tablist"]'), 'ArrowRight')
    expect($('.ml-inbox__tab--active').getAttribute('data-tab')).toBe('unread')
    expect(document.activeElement).toBe($('[data-tab="unread"]'))
    expect($$('.ml-inbox__main')).toHaveLength(1)
    click($('.ml-inbox__read-all'))
    expect(onReadAll).toHaveBeenCalledTimes(1)
    expect($('.ml-empty__title').textContent).toBe('全部都讀完了')
    click($('[data-tab="all"]'))
    const mains = () => $$('.ml-inbox__main') as HTMLElement[]
    act(() => mains()[0].focus())
    key(mains()[0], 'ArrowDown')
    expect(document.activeElement).toBe(mains()[1])
    key(mains()[1], 'End')
    expect(document.activeElement).toBe(mains()[2])
    key(mains()[2], 'Delete')
    expect(onDismiss).toHaveBeenCalledWith('c')
    expect(mains()).toHaveLength(2)
    expect(document.activeElement).toBe(mains()[1])
    expect($('[aria-live]').textContent).toBe('已移除：昨天的')
  })

  it('English', () => {
    render(
      <ConfigProvider locale={en}>
        <Inbox items={notes} now={NOW} inline />
      </ConfigProvider>,
    )
    expect($$('.ml-inbox__group-title').map((g) => g.textContent)).toEqual(['Today', 'Yesterday'])
    expect($('.ml-inbox__time').textContent).toBe('2 minutes ago')
  })
})
