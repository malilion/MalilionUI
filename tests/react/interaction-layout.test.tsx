import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, createRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import {
  Carousel,
  Image,
  ImagePreview,
  InfiniteScroll,
  Kanban,
  Layout,
  ListItem,
  Sortable,
  Space,
  Splitter,
  Watermark,
  type LayoutHandle,
} from '../../src/react/layout'
import type { MlKanbanColumn } from '../../src/types'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined
function render(el: React.ReactElement) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(el))
  return host
}
const key = (el: Element | null, k: string) => act(() => void el!.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })))
const click = (el: Element | null) => act(() => void (el as HTMLElement).click())
const pointer = (el: EventTarget, type: string, x = 0, y = 0) =>
  act(() => void el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, pointerId: 1, pointerType: 'mouse' })))
const $ = (s: string) => document.querySelector(s)
const $$ = (s: string) => [...document.querySelectorAll(s)]
const rect = (left: number, top: number, width: number, height: number) =>
  ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON() {} }) as DOMRect

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('Layout', () => {
  it('collapses to a rail on desktop via the handle and header context', () => {
    const ref = createRef<LayoutHandle>()
    const onCollapsedChange = vi.fn()
    render(
      <Layout ref={ref} onCollapsedChange={onCollapsedChange} header={({ toggleAside }) => <button onClick={toggleAside}>menu</button>} aside={({ collapsed }) => <nav>{collapsed ? 'rail' : 'wide'}</nav>}>
        main
      </Layout>,
    )
    click($('.ml-layout__header button'))
    expect(onCollapsedChange).toHaveBeenLastCalledWith(true)
    expect($('.ml-layout')!.classList.contains('ml-layout--collapsed')).toBe(true)
    expect($('nav')!.textContent).toBe('rail')
    act(() => ref.current!.toggleAside())
    expect($('nav')!.textContent).toBe('wide')
  })

  it('becomes a drawer on mobile: toggle opens, Escape and the scrim close', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }))
    const ref = createRef<LayoutHandle>()
    render(<Layout ref={ref} aside={<a href="#">x</a>}>main</Layout>)
    const layout = $('.ml-layout')!
    expect(layout.classList.contains('ml-layout--mobile')).toBe(true)
    expect($('aside')!.hasAttribute('inert')).toBe(true)
    act(() => ref.current!.toggleAside())
    expect(layout.classList.contains('ml-layout--aside-open')).toBe(true)
    expect($('aside')!.hasAttribute('inert')).toBe(false)
    key($('aside a'), 'Escape')
    expect(layout.classList.contains('ml-layout--aside-open')).toBe(false)
    act(() => ref.current!.toggleAside())
    click($('.ml-layout__scrim'))
    expect(layout.classList.contains('ml-layout--aside-open')).toBe(false)
  })
})

describe('Space / ListItem', () => {
  it('puts a divider between flattened children', () => {
    render(
      <Space divider="line">
        <i>a</i>
        {null}
        <>
          <i>b</i>
          <i>c</i>
        </>
      </Space>,
    )
    expect($$('.ml-space__divider')).toHaveLength(2)
  })

  it('clickable rows are buttons that call onSelect', () => {
    const onSelect = vi.fn()
    render(<ListItem title="Leo" clickable onSelect={onSelect} />)
    click($('button.ml-list-item__row'))
    expect(onSelect).toHaveBeenCalledOnce()
  })
})

describe('Splitter', () => {
  it('moves with arrows, Home/End/Enter and double-click, clamped to min/max', () => {
    const onChange = vi.fn()
    render(<Splitter onChange={onChange} min={20} max={80} step={5} defaultSize={40} />)
    const handle = $('[role="separator"]')!
    key(handle, 'ArrowRight')
    expect(onChange).toHaveBeenLastCalledWith(55)
    expect(handle.getAttribute('aria-valuenow')).toBe('55')
    key(handle, 'ArrowLeft')
    key(handle, 'ArrowLeft')
    expect(onChange).toHaveBeenLastCalledWith(45)
    key(handle, 'End')
    expect(onChange).toHaveBeenLastCalledWith(80)
    key(handle, 'ArrowRight')
    expect(handle.getAttribute('aria-valuenow')).toBe('80')
    key(handle, 'Home')
    expect(onChange).toHaveBeenLastCalledWith(20)
    key(handle, 'Enter')
    expect(onChange).toHaveBeenLastCalledWith(40)
    key(handle, 'Home')
    act(() => void handle.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })))
    expect(onChange).toHaveBeenLastCalledWith(40)
  })

  it('drags with the pointer and ignores input when disabled', () => {
    const onChange = vi.fn()
    const { rerender } = { rerender: (el: React.ReactElement) => act(() => root!.render(el)) }
    render(<Splitter direction="vertical" onChange={onChange} />)
    ;($('.ml-splitter') as HTMLElement).getBoundingClientRect = () => rect(0, 100, 400, 200)
    const handle = $('[role="separator"]')!
    pointer(handle, 'pointerdown', 10, 200)
    expect($('.ml-splitter')!.classList.contains('ml-splitter--dragging')).toBe(true)
    pointer(handle, 'pointermove', 10, 250)
    expect(onChange).toHaveBeenLastCalledWith(75)
    pointer(handle, 'pointerup')
    expect($('.ml-splitter')!.classList.contains('ml-splitter--dragging')).toBe(false)
    pointer(handle, 'pointermove', 10, 120)
    expect(onChange).toHaveBeenCalledTimes(1)
    rerender(<Splitter direction="vertical" onChange={onChange} disabled />)
    key(handle, 'ArrowDown')
    expect(onChange).toHaveBeenCalledTimes(1)
    expect((handle as HTMLElement).tabIndex).toBe(-1)
  })
})

describe('InfiniteScroll', () => {
  it('loads when the sentinel shows, waits while loading, and continues after a page', () => {
    let fire: (hit: boolean) => void = () => {}
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: (e: { isIntersecting: boolean }[]) => void) {
          fire = (hit) => cb([{ isIntersecting: hit }])
        }
        observe() {}
        disconnect() {}
      },
    )
    vi.stubGlobal('requestAnimationFrame', (cb: () => void) => (cb(), 1))
    const onLoad = vi.fn()
    render(<InfiniteScroll onLoad={onLoad}>rows</InfiniteScroll>)
    act(() => fire(true))
    expect(onLoad).toHaveBeenCalledTimes(1)
    act(() => root!.render(<InfiniteScroll onLoad={onLoad} loading>rows</InfiniteScroll>))
    expect($('.ml-loader')).not.toBeNull()
    act(() => fire(true))
    expect(onLoad).toHaveBeenCalledTimes(1)
    act(() => root!.render(<InfiniteScroll onLoad={onLoad}>rows</InfiniteScroll>))
    expect(onLoad).toHaveBeenCalledTimes(2)
    act(() => root!.render(<InfiniteScroll onLoad={onLoad} finished>rows</InfiniteScroll>))
    act(() => fire(true))
    expect(onLoad).toHaveBeenCalledTimes(2)
    expect($('.ml-infinite__end')).not.toBeNull()
  })

  it('manual mode loads from the button only', () => {
    const onLoad = vi.fn()
    render(<InfiniteScroll manual onLoad={onLoad} />)
    click($('.ml-infinite__foot button'))
    expect(onLoad).toHaveBeenCalledOnce()
  })
})

describe('Carousel', () => {
  const items = ['A', 'B', 'C']
  const active = () => $$('.ml-carousel__slide').findIndex((s) => !s.hasAttribute('aria-hidden'))

  it('pages with arrows, keys and dots; stops at the ends without loop', () => {
    const onIndexChange = vi.fn()
    render(<Carousel items={items} loop={false} onIndexChange={onIndexChange}>{(item) => item}</Carousel>)
    const prev = $('.ml-carousel__arrow--prev') as HTMLButtonElement
    expect(prev.disabled).toBe(true)
    click($('.ml-carousel__arrow--next'))
    expect(active()).toBe(1)
    key($('.ml-carousel'), 'ArrowRight')
    expect(active()).toBe(2)
    expect(($('.ml-carousel__arrow--next') as HTMLButtonElement).disabled).toBe(true)
    key($('.ml-carousel'), 'ArrowRight')
    expect(active()).toBe(2)
    key($('.ml-carousel'), 'ArrowLeft')
    click($$('.ml-carousel__dot')[0])
    expect(onIndexChange.mock.calls.map((c) => c[0])).toEqual([1, 2, 1, 0])
    expect($$('.ml-carousel__dot')[0].getAttribute('aria-current')).toBe('true')
    expect($$('.ml-carousel__slide')[1].hasAttribute('inert')).toBe(true)
  })

  it('autoplays, pauses on hover / focus / the play button, and wraps', () => {
    vi.useFakeTimers()
    render(<Carousel items={items} autoplay={1000}>{(item) => <button>{item}</button>}</Carousel>)
    act(() => void vi.advanceTimersByTime(1000))
    expect(active()).toBe(1)
    act(() => void vi.advanceTimersByTime(1000))
    act(() => void vi.advanceTimersByTime(1000))
    expect(active()).toBe(0)
    expect($('.ml-carousel__viewport')!.getAttribute('aria-live')).toBe('off')

    act(() => void $('.ml-carousel')!.dispatchEvent(new MouseEvent('mouseover', { bubbles: true })))
    act(() => void vi.advanceTimersByTime(3000))
    expect(active()).toBe(0)
    expect($('.ml-carousel__viewport')!.getAttribute('aria-live')).toBe('polite')
    act(() => void $('.ml-carousel')!.dispatchEvent(new MouseEvent('mouseout', { bubbles: true })))
    act(() => void vi.advanceTimersByTime(1000))
    expect(active()).toBe(1)

    act(() => ($('.ml-carousel__play') as HTMLElement).focus())
    act(() => void vi.advanceTimersByTime(3000))
    expect(active()).toBe(1)
    act(() => ($('.ml-carousel__play') as HTMLElement).blur())

    click($('.ml-carousel__play'))
    expect($('.ml-carousel__play')!.getAttribute('aria-label')).toBe('開始自動播放')
    act(() => ($('.ml-carousel__play') as HTMLElement).blur())
    act(() => void vi.advanceTimersByTime(3000))
    expect(active()).toBe(1)
    click($('.ml-carousel__play'))
    act(() => ($('.ml-carousel__play') as HTMLElement).blur())
    act(() => void vi.advanceTimersByTime(1000))
    expect(active()).toBe(2)
  })
})

describe('Image / ImagePreview', () => {
  it('tracks load / error state', () => {
    const onError = vi.fn()
    const onLoad = vi.fn()
    render(<Image src="/a.png" alt="A" onLoad={onLoad} onError={onError} />)
    const img = $('img')!
    expect($('.ml-image')!.classList.contains('ml-image--loading')).toBe(true)
    act(() => void img.dispatchEvent(new Event('load')))
    expect($('.ml-image')!.classList.contains('ml-image--loaded')).toBe(true)
    expect(onLoad).toHaveBeenCalledOnce()
    act(() => void img.dispatchEvent(new Event('error')))
    expect($('.ml-image__error')!.getAttribute('aria-label')).toBe('A（無法載入）')
    expect((img as HTMLElement).style.display).toBe('none')
    expect(onError).toHaveBeenCalledOnce()
    act(() => root!.render(<Image src="/b.png" alt="A" />))
    expect($('.ml-image')!.classList.contains('ml-image--loading')).toBe(true)
  })

  it('opens the preview at the clicked image and pages, zooms, rotates and closes', () => {
    render(<Image src="/b.png" alt="B" preview previewList={['/a.png', '/b.png', '/c.png']} />)
    const zoomBtn = $('.ml-image__zoom') as HTMLElement
    act(() => zoomBtn.focus())
    click(zoomBtn)
    const dialog = $('.ml-preview') as HTMLElement
    expect(dialog.parentElement).toBe(document.body)
    expect(document.activeElement).toBe(dialog)
    expect(document.documentElement.style.overflow).toBe('hidden')
    expect($('.ml-preview__img')!.getAttribute('src')).toBe('/b.png')
    expect($('.ml-preview__counter')!.textContent).toBe('02 / 03')
    key(dialog, 'ArrowRight')
    expect($('.ml-preview__img')!.getAttribute('src')).toBe('/c.png')
    key(dialog, 'ArrowRight')
    expect($('.ml-preview__img')!.getAttribute('src')).toBe('/a.png')
    key(dialog, '+')
    expect($('.ml-preview__zoom')!.textContent).toBe('125%')
    expect($('.ml-preview__img')!.classList.contains('ml-preview__img--grab')).toBe(true)
    key(dialog, 'r')
    expect(($('.ml-preview__img') as HTMLElement).style.transform).toContain('rotate(90deg)')
    key(dialog, '0')
    expect($('.ml-preview__zoom')!.textContent).toBe('100%')
    for (let i = 0; i < 8; i++) click($$('.ml-preview__toolbar button')[0])
    expect($('.ml-preview__zoom')!.textContent).toBe('25%')
    expect(($$('.ml-preview__toolbar button')[0] as HTMLButtonElement).disabled).toBe(true)
    key(dialog, 'Escape')
    expect(document.documentElement.style.overflow).toBe('')
    expect(document.activeElement).toBe(zoomBtn)
  })

  it('controlled preview without loop disables the ends and reports onClose', () => {
    const onClose = vi.fn()
    function Host() {
      const [open, setOpen] = useState(true)
      const [index, setIndex] = useState(0)
      return <ImagePreview images={['/a.png', '/b.png']} loop={false} open={open} onOpenChange={setOpen} index={index} onIndexChange={setIndex} onClose={onClose} />
    }
    render(<Host />)
    expect(($('.ml-preview__nav--prev') as HTMLButtonElement).disabled).toBe(true)
    click($('.ml-preview__nav--next'))
    expect(($('.ml-preview__nav--next') as HTMLButtonElement).disabled).toBe(true)
    click($('.ml-preview__stage'))
    expect(onClose).toHaveBeenCalledOnce()
  })
})

describe('Watermark', () => {
  it('draws a tile and puts the layer back when it is removed or restyled', async () => {
    const ctx = new Proxy({ measureText: () => ({ width: 40 }) } as Record<string, unknown>, { get: (t, k) => (k in t ? t[k as string] : () => {}), set: () => true })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as never)
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,AA')
    render(<Watermark content={['Top', 'secret']} gap={[10, 10]}>doc</Watermark>)
    const layer = $('.ml-watermark__layer') as HTMLElement
    expect(layer.style.backgroundImage).toContain('data:image/png')
    expect(layer.style.backgroundSize).toBe('50px 52px')
    expect(layer.style.zIndex).toBe('9')

    await act(async () => {
      layer.remove()
      await new Promise((r) => setTimeout(r, 0))
    })
    expect($('.ml-watermark')!.contains(layer)).toBe(true)

    await act(async () => {
      layer.style.display = 'none'
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(layer.style.display).toBe('')
    expect(layer.style.backgroundImage).toContain('data:image/png')
  })
})

describe('Sortable', () => {
  type Task = { id: number; title: string }
  const tasks: Task[] = [
    { id: 1, title: 'Forge' },
    { id: 2, title: 'Polish' },
    { id: 3, title: 'Ship' },
  ]
  const titles = () => $$('.ml-sortable > .ml-sortable__item').map((e) => e.textContent)

  /** Lists sit in 200px columns; rows are 40px tall. */
  function geometry() {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      const list = this.closest('[data-ml-sortable]')
      if (!list || !this.classList.contains('ml-sortable__item')) return rect(0, 0, 0, 0)
      const col = $$('[data-ml-sortable]').indexOf(list)
      const row = [...list.querySelectorAll(':scope > .ml-sortable__item')].indexOf(this)
      return rect(col * 200, row * 40, 200, 40)
    })
    document.elementFromPoint = (x: number) => $$('[data-ml-sortable]')[Math.floor(x / 200)] ?? null
  }

  it('reorders with the keyboard: Space grabs, arrows move, Space drops, Escape cancels', () => {
    const onSort = vi.fn()
    const onChange = vi.fn()
    vi.stubGlobal('requestAnimationFrame', (cb: () => void) => (cb(), 1))
    render(<Sortable defaultValue={tasks} handle onChange={onChange} onSort={onSort} itemLabel={(t: Task) => t.title}>{(t) => t.title}</Sortable>)
    let handle = $$('.ml-sortable__handle')[0] as HTMLElement
    act(() => handle.focus())
    key(handle, ' ')
    expect(handle.getAttribute('aria-pressed')).toBe('true')
    expect($('.ml-visually-hidden')!.textContent).toContain('Forge')
    key(handle, 'ArrowDown')
    key(document.activeElement, 'ArrowDown')
    expect(titles()).toEqual(['Polish', 'Ship', 'Forge'])
    expect(document.activeElement?.closest('li')?.textContent).toBe('Forge')
    key(document.activeElement, 'ArrowDown')
    expect(titles()).toEqual(['Polish', 'Ship', 'Forge'])
    key(document.activeElement, 'Enter')
    expect(onSort).toHaveBeenLastCalledWith(expect.objectContaining({ item: tasks[0], oldIndex: 0, newIndex: 2 }))
    expect(onChange).toHaveBeenLastCalledWith([tasks[1], tasks[2], tasks[0]])

    handle = $$('.ml-sortable__handle')[0] as HTMLElement
    key(handle, ' ')
    key(handle, 'ArrowDown')
    expect(titles()).toEqual(['Ship', 'Polish', 'Forge'])
    key(document.activeElement, 'Escape')
    expect(titles()).toEqual(['Polish', 'Ship', 'Forge'])
    expect(onSort).toHaveBeenCalledTimes(1)
  })

  it('reorders by pointer drag with a placeholder, and ignores tiny moves', () => {
    geometry()
    const onSort = vi.fn()
    render(<Sortable defaultValue={tasks} onSort={onSort}>{(t) => <span>{t.title}</span>}</Sortable>)
    const forge = $$('.ml-sortable__item span')[0]
    pointer(forge, 'pointerdown', 10, 20)
    pointer(window, 'pointermove', 12, 22)
    expect($('.ml-sortable__placeholder')).toBeNull()
    pointer(window, 'pointermove', 10, 100)
    expect($('.ml-sortable__ghost')).not.toBeNull()
    expect(document.documentElement.classList.contains('ml-sortable-dragging')).toBe(true)
    pointer(window, 'pointermove', 10, 100)
    expect(titles()).toEqual(['Polish', 'Ship'])
    expect($('.ml-sortable')!.classList.contains('ml-sortable--target')).toBe(true)
    expect([...$('.ml-sortable')!.children].map((c) => c.className)).toEqual(['ml-sortable__item', 'ml-sortable__item', 'ml-sortable__placeholder', 'ml-visually-hidden'])
    pointer(window, 'pointerup', 10, 100)
    expect(titles()).toEqual(['Polish', 'Ship', 'Forge'])
    expect($('.ml-sortable__ghost')).toBeNull()
    expect(onSort).toHaveBeenCalledWith(expect.objectContaining({ item: tasks[0], oldIndex: 0, newIndex: 2 }))
  })

  it('pointer cancel and disabled leave the order alone', () => {
    geometry()
    const onChange = vi.fn()
    render(<Sortable defaultValue={tasks} onChange={onChange}>{(t) => t.title}</Sortable>)
    pointer($$('.ml-sortable__item')[0], 'pointerdown', 10, 20)
    pointer(window, 'pointermove', 10, 100)
    pointer(window, 'pointercancel')
    expect(titles()).toEqual(['Forge', 'Polish', 'Ship'])
    act(() => root!.render(<Sortable defaultValue={tasks} onChange={onChange} disabled>{(t) => t.title}</Sortable>))
    pointer($$('.ml-sortable__item')[0], 'pointerdown', 10, 20)
    pointer(window, 'pointermove', 10, 100)
    pointer(window, 'pointerup', 10, 100)
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('Kanban', () => {
  type Task = { id: number; title: string }
  const cols = (): MlKanbanColumn<Task>[] => [
    { key: 'todo', title: 'To do', items: [{ id: 1, title: 'Forge' }, { id: 2, title: 'Polish' }] },
    { key: 'doing', title: 'Doing', items: [{ id: 3, title: 'Ship' }], limit: 1 },
    { key: 'done', title: 'Done', items: [] },
  ]
  const cards = () => $$('.ml-kanban__col').map((c) => [...c.querySelectorAll('.ml-kanban__card')].map((e) => e.textContent))

  function geometry() {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      const list = this.closest('[data-ml-sortable]')
      if (!list || !this.classList.contains('ml-sortable__item')) return rect(0, 0, 0, 0)
      return rect($$('[data-ml-sortable]').indexOf(list) * 200, [...list.querySelectorAll(':scope > .ml-sortable__item')].indexOf(this) * 40, 200, 40)
    })
    document.elementFromPoint = (x: number) => $$('[data-ml-sortable]')[Math.floor(x / 200)] ?? null
  }

  it('moves a card across columns and reports the move', () => {
    geometry()
    const onMove = vi.fn()
    const onChange = vi.fn()
    render(<Kanban defaultValue={cols()} onMove={onMove} onChange={onChange} renderCard={(t) => t.title} />)
    expect($('.ml-kanban__empty')!.textContent).toBe('拖曳卡片到這裡')
    expect($$('.ml-kanban__count')[1].classList.contains('ml-kanban__count--full')).toBe(true)
    pointer($$('.ml-kanban__card')[0], 'pointerdown', 10, 10)
    pointer(window, 'pointermove', 410, 10)
    pointer(window, 'pointermove', 410, 10)
    expect($$('.ml-kanban__list')[2].classList.contains('ml-sortable--target')).toBe(true)
    pointer(window, 'pointerup', 410, 10)
    expect(cards()).toEqual([['Polish'], ['Ship'], ['Forge']])
    expect(onMove).toHaveBeenCalledWith({ item: { id: 1, title: 'Forge' }, from: 'todo', to: 'done', newIndex: 0 })
    expect(onChange.mock.lastCall![0].map((c: MlKanbanColumn<Task>) => c.items.length)).toEqual([1, 1, 1])
  })

  it('refuses drops into a full column', () => {
    geometry()
    const onMove = vi.fn()
    render(<Kanban defaultValue={cols()} onMove={onMove} renderCard={(t) => t.title} />)
    pointer($$('.ml-kanban__card')[0], 'pointerdown', 10, 10)
    pointer(window, 'pointermove', 210, 10)
    pointer(window, 'pointermove', 210, 10)
    expect($$('.ml-kanban__list')[1].classList.contains('ml-sortable--target')).toBe(false)
    pointer(window, 'pointerup', 210, 10)
    expect(cards()).toEqual([['Forge', 'Polish'], ['Ship'], []])
    expect(onMove).not.toHaveBeenCalled()
  })

  it('works controlled, reordering within a column', () => {
    geometry()
    function Host() {
      const [value, setValue] = useState(cols)
      return <Kanban value={value} onChange={setValue} renderCard={(t) => t.title} renderColumnFooter={(c) => `${c.items.length}`} />
    }
    render(<Host />)
    pointer($$('.ml-kanban__card')[1], 'pointerdown', 10, 50)
    pointer(window, 'pointermove', 10, 5)
    pointer(window, 'pointermove', 10, 5)
    pointer(window, 'pointerup', 10, 5)
    expect(cards()).toEqual([['Polish', 'Forge'], ['Ship'], []])
    expect($$('.ml-kanban__foot').map((f) => f.textContent)).toEqual(['2', '1', '0'])
  })
})
