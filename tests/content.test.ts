import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createSSRApp, h, nextTick } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { MlEllipsis, MlMasonry, MlScrollbar } from '../src'
import { stubBox } from './box-stub'

let restore: (() => void) | undefined
afterEach(() => {
  restore?.()
  restore = undefined
  document.body.innerHTML = ''
  vi.useRealTimers()
  vi.restoreAllMocks()
})
const flush = async () => {
  await nextTick()
  await nextTick()
}

describe('MlEllipsis', () => {
  it('stays plain when the text fits: no tooltip, no toggle, not focusable', async () => {
    restore = stubBox((el, p) => (el.classList.contains('ml-ellipsis__text') ? (p === 'scrollWidth' ? 100 : p === 'clientWidth' ? 100 : undefined) : undefined))
    const wrapper = mount(MlEllipsis, { props: { text: 'Short', expandable: true } })
    await flush()
    expect(wrapper.classes()).toEqual(expect.arrayContaining(['ml-ellipsis', 'ml-ellipsis--single']))
    expect(wrapper.classes()).not.toContain('ml-ellipsis--truncated')
    expect(wrapper.find('.ml-ellipsis__toggle').exists()).toBe(false)
    expect(wrapper.get('.ml-ellipsis__text').attributes('tabindex')).toBeUndefined()
    await wrapper.trigger('focusin')
    expect(wrapper.get('.ml-tooltip__bubble').classes()).not.toContain('ml-tooltip__bubble--visible')
  })

  it('detects a cut single line and shows the full text in a tooltip on hover / focus', async () => {
    vi.useFakeTimers()
    restore = stubBox((el, p) => (el.classList.contains('ml-ellipsis__text') ? (p === 'scrollWidth' ? 300 : p === 'clientWidth' ? 100 : undefined) : undefined))
    const wrapper = mount(MlEllipsis, { props: { text: 'A very long lion name that will not fit' }, attachTo: document.body })
    await flush()
    expect(wrapper.emitted('truncate')?.[0]).toEqual([true])
    expect(wrapper.classes()).toContain('ml-ellipsis--truncated')
    const text = wrapper.get('.ml-ellipsis__text')
    expect(text.attributes('tabindex')).toBe('0')
    // The text itself carries the full string, so the bubble is hidden from screen readers.
    expect(text.text()).toBe('A very long lion name that will not fit')
    const bubble = wrapper.get('.ml-tooltip__bubble')
    expect(bubble.attributes('aria-hidden')).toBe('true')
    await wrapper.trigger('mouseenter')
    expect(bubble.classes()).not.toContain('ml-tooltip__bubble--visible')
    vi.advanceTimersByTime(150)
    await nextTick()
    expect(bubble.classes()).toContain('ml-tooltip__bubble--visible')
    await wrapper.trigger('keydown', { key: 'Escape' })
    expect(bubble.classes()).not.toContain('ml-tooltip__bubble--visible')
    await wrapper.trigger('focusin')
    expect(bubble.classes()).toContain('ml-tooltip__bubble--visible')
    wrapper.unmount()
  })

  it('clamps to N lines and toggles expanded with v-model:expanded', async () => {
    restore = stubBox((el, p) => (el.classList.contains('ml-ellipsis__text') ? (p === 'scrollHeight' ? 120 : p === 'clientHeight' ? 48 : undefined) : undefined))
    const wrapper = mount(MlEllipsis, {
      props: { text: 'Long story', lines: 2, expandable: true, tooltip: false, 'onUpdate:expanded': (v: boolean) => wrapper.setProps({ expanded: v }) },
    })
    await flush()
    expect(wrapper.classes()).toContain('ml-ellipsis--multi')
    expect(wrapper.attributes('style')).toContain('--ml-ellipsis-lines: 2')
    expect(wrapper.find('.ml-tooltip__bubble').exists()).toBe(false)
    const toggle = wrapper.get('.ml-ellipsis__toggle')
    expect(toggle.text()).toBe('展開')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    await toggle.trigger('click')
    expect(wrapper.emitted('update:expanded')?.[0]).toEqual([true])
    expect(wrapper.classes()).toContain('ml-ellipsis--expanded')
    expect(wrapper.get('.ml-ellipsis__toggle').text()).toBe('收起')
    expect(wrapper.get('.ml-ellipsis__toggle').attributes('aria-expanded')).toBe('true')
    await wrapper.get('.ml-ellipsis__toggle').trigger('click')
    expect(wrapper.classes()).not.toContain('ml-ellipsis--expanded')
  })

  it('cuts in the middle to fit, keeping the full string for screen readers', async () => {
    // 10px per character, 100px available.
    restore = stubBox((el, p) => {
      if (el.classList.contains('ml-ellipsis__text') && p === 'clientWidth') return 100
      if (el.classList.contains('ml-ellipsis__measure') && p === 'offsetWidth') return Array.from(el.textContent ?? '').length * 10
      return undefined
    })
    const text = 'lion-mane-gold-texture@2x.png'
    const wrapper = mount(MlEllipsis, { props: { text, position: 'middle' } })
    await flush()
    expect(wrapper.classes()).toContain('ml-ellipsis--middle')
    const shown = wrapper.get('.ml-ellipsis__text [aria-hidden="true"]').text()
    expect(shown).toBe('lion…x.png')
    expect(shown.length).toBeLessThanOrEqual(10)
    expect(wrapper.get('.ml-ellipsis__text .ml-visually-hidden').text()).toBe(text)
    // Short enough: no cut at all.
    await wrapper.setProps({ text: 'a.png' })
    await flush()
    expect(wrapper.find('.ml-ellipsis__text [aria-hidden="true"]').exists()).toBe(false)
    expect(wrapper.classes()).not.toContain('ml-ellipsis--truncated')
  })
})

describe('MlScrollbar', () => {
  // A 100×100 window onto 400×100 content (vertical only).
  const box = (el: HTMLElement, p: string) => {
    if (el.classList.contains('ml-scrollbar__wrap')) return ({ clientHeight: 100, scrollHeight: 400, clientWidth: 100, scrollWidth: 100 } as Record<string, number>)[p]
    if (el.classList.contains('ml-scrollbar__track')) return ({ clientHeight: 100, clientWidth: 100 } as Record<string, number>)[p]
    return undefined
  }

  it('sizes the thumb, follows scrolling and fires reach-end once per arrival', async () => {
    restore = stubBox(box)
    const wrapper = mount(MlScrollbar, { props: { maxHeight: 100, label: 'Log' }, slots: { default: '<p>content</p>' } })
    await flush()
    const wrap = wrapper.get('.ml-scrollbar__wrap')
    expect(wrap.attributes('style')).toContain('max-height: 100px')
    expect(wrap.attributes('role')).toBe('region')
    expect(wrap.attributes('aria-label')).toBe('Log')
    expect(wrap.attributes('tabindex')).toBe('0')
    expect(wrapper.classes()).toContain('ml-scrollbar--has-y')
    expect(wrapper.classes()).not.toContain('ml-scrollbar--has-x')
    const thumb = wrapper.get('.ml-scrollbar__track--y .ml-scrollbar__thumb')
    expect(thumb.attributes('style')).toContain('height: 25px')
    expect(wrapper.get('.ml-scrollbar__track--y').attributes('aria-hidden')).toBe('true')

    wrap.element.scrollTop = 300
    await wrap.trigger('scroll')
    expect(wrapper.emitted('scroll')?.[0]).toEqual([{ scrollTop: 300, scrollLeft: 0 }])
    expect(wrapper.emitted('reach-end')).toEqual([['y']])
    expect(thumb.attributes('style')).toContain('translateY(75px)')
    expect(wrapper.classes()).toContain('ml-scrollbar--active')
    await wrap.trigger('scroll')
    expect(wrapper.emitted('reach-end')).toHaveLength(1)
    wrap.element.scrollTop = 100
    await wrap.trigger('scroll')
    wrap.element.scrollTop = 300
    await wrap.trigger('scroll')
    expect(wrapper.emitted('reach-end')).toHaveLength(2)
  })

  it('drags the thumb, pages on track clicks and scrolls through the exposed API', async () => {
    restore = stubBox(box)
    const wrapper = mount(MlScrollbar, { props: { height: 100 }, slots: { default: 'x' } })
    await flush()
    const wrap = wrapper.get('.ml-scrollbar__wrap').element as HTMLElement
    const thumb = wrapper.get('.ml-scrollbar__track--y .ml-scrollbar__thumb')
    // 75px of travel for 300px of scroll: 1px of drag = 4px of content.
    await thumb.trigger('pointerdown', { button: 0, clientY: 10, pointerId: 1 })
    expect(wrapper.classes()).toContain('ml-scrollbar--dragging')
    await thumb.trigger('pointermove', { clientY: 25, pointerId: 1 })
    expect(wrap.scrollTop).toBe(60)
    await thumb.trigger('pointerup', { pointerId: 1 })
    expect(wrapper.classes()).not.toContain('ml-scrollbar--dragging')

    const scrollBy = vi.fn()
    wrap.scrollBy = scrollBy as never
    const track = wrapper.get('.ml-scrollbar__track--y')
    vi.spyOn(track.element, 'getBoundingClientRect').mockReturnValue({ top: 0, left: 0 } as DOMRect)
    await track.trigger('pointerdown', { button: 0, clientY: 90 })
    expect(scrollBy).toHaveBeenLastCalledWith({ top: 90, behavior: 'smooth' })
    await track.trigger('pointerdown', { button: 0, clientY: 2 })
    expect(scrollBy).toHaveBeenLastCalledWith({ top: -90, behavior: 'smooth' })

    const scrollTo = vi.fn()
    wrap.scrollTo = scrollTo as never
    const vm = wrapper.vm as unknown as { scrollTo: (x: number, y: number) => void; scrollToTop: (s?: boolean) => void; scrollToBottom: (s?: boolean) => void }
    vm.scrollTo(0, 50)
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 0, top: 50 })
    vm.scrollToTop(false)
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 0, behavior: 'auto' })
    vi.stubGlobal('matchMedia', () => ({ matches: true }))
    vm.scrollToBottom()
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 400, behavior: 'auto' })
    vi.unstubAllGlobals()
  })

  it('renders only the requested rail and no thumbs without overflow', async () => {
    const wrapper = mount(MlScrollbar, { props: { direction: 'horizontal', always: true }, slots: { default: 'x' } })
    await flush()
    expect(wrapper.find('.ml-scrollbar__track--y').exists()).toBe(false)
    expect(wrapper.find('.ml-scrollbar__track--x').exists()).toBe(true)
    expect(wrapper.classes()).toContain('ml-scrollbar--always')
    expect(wrapper.classes()).not.toContain('ml-scrollbar--has-x')
    expect(wrapper.get('.ml-scrollbar__wrap').attributes('tabindex')).toBeUndefined()
  })
})

describe('MlMasonry', () => {
  const items = [
    { id: 'a', h: 100 },
    { id: 'b', h: 50 },
    { id: 'c', h: 80 },
    { id: 'd', h: 30 },
  ]
  const slot = { default: (({ item }: { item: { id: string; h: number } }) => h('div', { 'data-h': item.h }, item.id)) as never }

  it('server-renders plain round-robin columns in DOM order', async () => {
    const app = createSSRApp({ render: () => h(MlMasonry as never, { items, columns: { 0: 1, 600: 3 }, gap: 12 }, slot) })
    const html = await renderToString(app)
    expect(html).toContain('--ml-masonry-cols:1')
    expect(html).toContain('--ml-masonry-gap:12px')
    expect(html).not.toContain('ml-masonry--ready')
    expect([...html.matchAll(/data-h="(\d+)">(\w)/g)].map((m) => m[2])).toEqual(['a', 'b', 'c', 'd'])
  })

  it('drops each item into the shortest column', async () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0)
      return 0
    })
    restore = stubBox((el, p) => {
      if (el.classList.contains('ml-masonry') && p === 'clientWidth') return 300
      if (el.classList.contains('ml-masonry__item') && p === 'offsetHeight') return Number((el.firstElementChild as HTMLElement)?.dataset.h ?? 0)
      return undefined
    })
    const wrapper = mount(MlMasonry, { props: { items, columns: { 0: 1, 200: 2 }, gap: 10, itemKey: (i: unknown) => (i as { id: string }).id, label: 'Wall' }, slots: slot })
    await flush()
    await flush()
    const root = wrapper.get('.ml-masonry')
    expect(root.classes()).toContain('ml-masonry--ready')
    expect(root.attributes('role')).toBe('list')
    expect(root.attributes('aria-label')).toBe('Wall')
    expect(root.attributes('style')).toContain('--ml-masonry-col: 145px')
    expect(root.attributes('style')).toContain('height: 140px')
    const cells = wrapper.findAll('.ml-masonry__item')
    expect(cells.map((c) => c.text())).toEqual(['a', 'b', 'c', 'd'])
    expect(cells.map((c) => c.attributes('style'))).toEqual([
      'transform: translate(0px, 0px);',
      'transform: translate(155px, 0px);',
      'transform: translate(155px, 60px);',
      'transform: translate(0px, 110px);',
    ])
    expect(cells.every((c) => c.classes().includes('ml-masonry__item--placed'))).toBe(true)
    expect(wrapper.emitted('layout')?.at(-1)).toEqual([{ columns: 2, height: 140 }])

    // New items are placed too; earlier ones are marked as settled (they glide when animated).
    await wrapper.setProps({ items: [...items, { id: 'e', h: 20 }] })
    await flush()
    await flush()
    const after = wrapper.findAll('.ml-masonry__item')
    expect(after).toHaveLength(5)
    expect(after[4].attributes('style')).toBe('transform: translate(0px, 150px);')
    expect(after[0].classes()).toContain('ml-masonry__item--settled')
    expect(after[4].classes()).not.toContain('ml-masonry__item--settled')
  })
})
