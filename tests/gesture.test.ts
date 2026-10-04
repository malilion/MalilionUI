import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import { MlList, MlPullRefresh, MlSwipeCell, type MlSwipeAction } from '../src'
import {
  createVelocityTracker,
  fullSwipeDistance,
  lockDirection,
  pullProgress,
  pullResistance,
  rubberband,
  sideOffset,
  swipeOffset,
  swipeSnap,
  claimSwipeGroup,
  releaseSwipeGroup,
} from '../src/components/gesture'

const pointer = (target: EventTarget, type: string, x: number, y: number, extra: PointerEventInit = {}) =>
  target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, pointerId: 1, pointerType: 'mouse', ...extra }))

const rect = (width: number) => ({ left: 0, top: 0, width, height: 56, right: width, bottom: 56, x: 0, y: 0, toJSON() {} }) as DOMRect

const tick = () => (vi.isFakeTimers() ? (vi.advanceTimersByTime(0), Promise.resolve()) : new Promise((r) => setTimeout(r, 0)))

let wrappers: VueWrapper[] = []
const track = <T extends VueWrapper>(w: T) => (wrappers.push(w), w)

afterEach(() => {
  wrappers.forEach((w) => w.unmount())
  wrappers = []
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('gesture math', () => {
  it('locks the direction only after a few pixels, on the dominant axis', () => {
    expect(lockDirection(3, 4)).toBeNull()
    expect(lockDirection(9, 4)).toBe('x')
    expect(lockDirection(-3, 12)).toBe('y')
    expect(lockDirection(-12, -8)).toBe('x')
    expect(lockDirection(5, 5, 4)).toBe('y')
  })

  it('rubber-bands towards, but never past, the dimension', () => {
    expect(rubberband(0, 100)).toBe(0)
    expect(rubberband(-20, 100)).toBe(0)
    expect(rubberband(10, 100)).toBeGreaterThan(5)
    expect(rubberband(10, 100)).toBeLessThan(10)
    expect(rubberband(1e6, 100)).toBeLessThan(100)
    expect(rubberband(200, 100)).toBeGreaterThan(rubberband(100, 100))
  })

  it('pull resistance reaches the threshold at 1.5× travel', () => {
    expect(pullResistance(90, 60)).toBeCloseTo(60)
    expect(pullResistance(30, 60)).toBeLessThan(30)
    expect(pullResistance(10_000, 60)).toBeLessThan(180)
    expect(pullProgress(30, 60)).toBe(0.5)
    expect(pullProgress(120, 60)).toBe(1)
    expect(pullProgress(-5, 60)).toBe(0)
  })

  it('measures velocity over the recent window only', () => {
    const v = createVelocityTracker(100)
    expect(v.velocity()).toBe(0)
    v.add(0, 0)
    v.add(4, 30)
    expect(v.velocity()).toBe(0) // too short to judge
    v.add(50, 100)
    expect(v.velocity()).toBe(2)
    v.add(400, 100) // a long pause before letting go
    expect(Math.abs(v.velocity())).toBeLessThan(0.3)
    v.reset()
    v.add(0, 0)
    v.add(0, 50)
    expect(v.velocity()).toBe(0)
  })

  it('clamps the swipe offset to the actions, rubber-banding or following a full swipe', () => {
    const limits = { left: 80, right: 150 }
    expect(swipeOffset(50, limits)).toBe(50)
    expect(swipeOffset(-120, limits)).toBe(-120)
    expect(swipeOffset(200, limits)).toBeGreaterThan(80)
    expect(swipeOffset(200, limits)).toBeLessThan(160)
    expect(swipeOffset(60, { left: 0, right: 150 })).toBe(0)
    expect(swipeOffset(-300, { ...limits, full: true, width: 360 })).toBe(-300)
    expect(swipeOffset(-500, { ...limits, full: true, width: 360 })).toBe(-360)
    expect(fullSwipeDistance(360, 150)).toBe(216)
    expect(fullSwipeDistance(200, 150)).toBe(198)
  })

  it('snaps by position, but a flick wins', () => {
    const limits = { left: 80, right: 150 }
    expect(swipeSnap(-100, 0, limits)).toBe('right')
    expect(swipeSnap(-60, 0, limits)).toBeNull()
    expect(swipeSnap(-30, -0.8, limits)).toBe('right')
    expect(swipeSnap(-140, 0.8, limits)).toBeNull()
    expect(swipeSnap(50, 0, limits)).toBe('left')
    expect(swipeSnap(20, 0.5, limits)).toBe('left')
    expect(swipeSnap(60, -0.5, limits)).toBeNull()
    expect(swipeSnap(40, 1, { left: 0, right: 150 })).toBeNull()
    expect(sideOffset('right', limits)).toBe(-150)
    expect(sideOffset('left', limits)).toBe(80)
    expect(sideOffset(null, limits)).toBe(0)
  })

  it('keeps one open cell per group', () => {
    const a = { close: vi.fn() }
    const b = { close: vi.fn() }
    claimSwipeGroup('g', a)
    claimSwipeGroup('g', b)
    expect(a.close).toHaveBeenCalledOnce()
    releaseSwipeGroup('g', a) // not the open one: no effect
    claimSwipeGroup('g', a)
    expect(b.close).toHaveBeenCalledOnce()
    releaseSwipeGroup('g', a)
  })
})

/* ── MlSwipeCell ── */

const right: MlSwipeAction[] = [
  { label: '封存', value: 'archive', icon: 'folder', tone: 'accent' },
  { label: '刪除', value: 'delete', icon: 'close', tone: 'danger' },
]
const left: MlSwipeAction[] = [{ label: '已讀', value: 'read', icon: 'check' }]

/** Right actions 144px, left 72px, the row 360px. */
function geometry() {
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    if (this.classList.contains('ml-swipe-cell__actions--right')) return rect(144)
    if (this.classList.contains('ml-swipe-cell__actions--left')) return rect(72)
    if (this.classList.contains('ml-swipe-cell')) return rect(360)
    return rect(0)
  })
}

function mountCell(props: Record<string, unknown> = {}) {
  geometry()
  return track(
    mount(MlSwipeCell, {
      props: { title: '獅子王', subtitle: '今晚開會', rightActions: right, leftActions: left, ...props },
      attachTo: document.body,
    }),
  )
}

/** Drag the row's content from x=200 by dx (and dy). */
async function drag(w: VueWrapper, dx: number, dy = 0, steps = [10]) {
  const el = w.get('.ml-swipe-cell__content').element
  pointer(el, 'pointerdown', 200, 20)
  for (const s of steps) pointer(window, 'pointermove', 200 + Math.sign(dx) * s, 20 + Math.sign(dy) * s * (dy ? 1 : 0))
  pointer(window, 'pointermove', 200 + dx, 20 + dy)
  await nextTick()
  return {
    release: async () => {
      pointer(window, 'pointerup', 200 + dx, 20 + dy)
      await nextTick()
      await nextTick()
      await tick() // let the post-drag click swallower expire
    },
  }
}

const transform = (w: VueWrapper) => (w.get('.ml-swipe-cell__content').element as HTMLElement).style.transform

describe('MlSwipeCell', () => {
  it('renders list-row markup, a keyboard "more" button and inert action groups', () => {
    const w = mountCell()
    expect(w.element.tagName).toBe('LI')
    expect(w.classes()).toEqual(expect.arrayContaining(['ml-list-item', 'ml-swipe-cell']))
    expect(w.get('.ml-list-item__title').text()).toBe('獅子王')
    const more = w.get('.ml-swipe-cell__more')
    expect(more.attributes('aria-label')).toBe('獅子王：更多動作')
    expect(more.attributes('aria-expanded')).toBe('false')
    const groups = w.findAll('[role="group"]')
    expect(groups.map((g) => g.attributes('aria-label'))).toEqual(['左側動作', '右側動作'])
    expect(groups.every((g) => g.attributes('inert') !== undefined)).toBe(true)
    expect(w.findAll('.ml-swipe-cell__actions--right button').map((b) => b.text())).toEqual(['封存', '刪除'])
    expect(w.get('.ml-swipe-cell__action--danger').classes()).toContain('ml-swipe-cell__action--outer')
  })

  it('follows a horizontal drag and snaps open past half the actions', async () => {
    const w = mountCell()
    const d = await drag(w, -100)
    expect(w.classes()).toContain('ml-swipe-cell--dragging')
    expect(transform(w)).toBe('translate3d(-100px, 0, 0)')
    await d.release()
    expect(w.emitted('update:open')).toEqual([['right']])
    expect(transform(w)).toBe('translate3d(-144px, 0, 0)')
    expect(w.get('.ml-swipe-cell__actions--right').attributes('inert')).toBeUndefined()
    expect(w.get('.ml-swipe-cell__more').attributes('aria-expanded')).toBe('true')
  })

  it('springs back when released before half way, and opens the left side on a right swipe', async () => {
    const w = mountCell()
    await (await drag(w, -50)).release()
    expect(w.emitted('update:open')).toBeUndefined()
    expect(transform(w)).toBe('')
    await (await drag(w, 60)).release()
    expect(w.emitted('update:open')).toEqual([['left']])
    expect(transform(w)).toBe('translate3d(72px, 0, 0)')
  })

  it('locks to vertical so the list can scroll', async () => {
    const w = mountCell()
    const d = await drag(w, -4, 40)
    expect(w.classes()).not.toContain('ml-swipe-cell--dragging')
    pointer(window, 'pointermove', 60, 60)
    await nextTick()
    expect(transform(w)).toBe('')
    await d.release()
    expect(w.emitted('update:open')).toBeUndefined()
  })

  it('opens on a quick flick even when short', async () => {
    let t = 0
    vi.spyOn(performance, 'now').mockImplementation(() => (t += 10))
    const w = mountCell()
    await (await drag(w, -40)).release()
    expect(w.emitted('update:open')).toEqual([['right']])
  })

  it('a full swipe fires the outermost action', async () => {
    const w = mountCell({ fullSwipe: true })
    const d = await drag(w, -260)
    expect(w.classes()).toContain('ml-swipe-cell--full')
    expect(w.get('.ml-swipe-cell__action--danger').classes()).toContain('ml-swipe-cell__action--expanded')
    await d.release()
    expect(w.emitted('action')).toEqual([[right[1], 'right']])
    expect(transform(w)).toBe('')
    const l = await drag(w, 260)
    await l.release()
    expect(w.emitted('action')![1]).toEqual([left[0], 'left'])
  })

  it('without fullSwipe, a long drag just opens', async () => {
    const w = mountCell()
    const d = await drag(w, -300)
    expect(w.classes()).not.toContain('ml-swipe-cell--full')
    await d.release()
    expect(w.emitted('action')).toBeUndefined()
    expect(w.emitted('update:open')).toEqual([['right']])
  })

  it('tapping an action emits it and closes; tapping the open row or outside closes', async () => {
    const w = mountCell({ open: 'right', 'onUpdate:open': (v: 'left' | 'right' | null) => w.setProps({ open: v }) })
    await nextTick()
    await w.findAll('.ml-swipe-cell__actions--right button')[0].trigger('click')
    expect(w.emitted('action')).toEqual([[right[0], 'right']])
    expect(w.props('open')).toBeNull()

    await w.setProps({ open: 'right' })
    await w.get('.ml-list-item__row').trigger('click')
    expect(w.props('open')).toBeNull()

    await w.setProps({ open: 'left' })
    await nextTick()
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    await nextTick()
    expect(w.props('open')).toBeNull()
  })

  it('closes the other open cell of the group', async () => {
    geometry()
    const host = track(
      mount({
        render: () =>
          h(MlList, null, () => [
            h(MlSwipeCell, { title: 'A', rightActions: right }),
            h(MlSwipeCell, { title: 'B', rightActions: right }),
          ]),
      }, { attachTo: document.body }),
    )
    const [a, b] = host.findAllComponents(MlSwipeCell)
    await (await drag(a, -100)).release()
    expect(a.emitted('update:open')).toEqual([['right']])
    await (await drag(b, -100)).release()
    expect(a.emitted('update:open')![1]).toEqual([null])
    expect(b.emitted('update:open')).toEqual([['right']])
  })

  it('keyboard: the more button reveals and focuses the actions, arrows switch sides, Escape closes', async () => {
    const w = mountCell()
    const more = w.get('.ml-swipe-cell__more')
    await more.trigger('click')
    await nextTick()
    expect(w.emitted('update:open')).toEqual([['right']])
    expect(document.activeElement?.textContent).toBe('封存')
    await w.get('.ml-swipe-cell__actions--right button').trigger('keydown', { key: 'ArrowRight' })
    await nextTick()
    expect(w.emitted('update:open')![1]).toEqual(['left'])
    expect(document.activeElement?.textContent).toBe('已讀')
    await w.trigger('keydown', { key: 'Escape' })
    expect(w.emitted('update:open')![2]).toEqual([null])
    expect(document.activeElement).toBe(more.element)
  })

  it('keyboard: Shift+F10 / the menu key open the actions; activating one returns focus', async () => {
    const w = mountCell({ clickable: true })
    await w.get('.ml-list-item__row').trigger('keydown', { key: 'F10', shiftKey: true })
    await nextTick()
    expect(w.emitted('update:open')).toEqual([['right']])
    const del = w.findAll('.ml-swipe-cell__actions--right button')[1]
    await del.trigger('click') // keyboard activation has detail 0
    await nextTick()
    expect(w.emitted('action')).toEqual([[right[1], 'right']])
    expect(document.activeElement).toBe(w.get('.ml-swipe-cell__more').element)
    await w.trigger('keydown', { key: 'ContextMenu' })
    expect(w.emitted('update:open')!.at(-1)).toEqual(['right'])
  })

  it('disabled: no gesture and no more button', async () => {
    const w = mountCell({ disabled: true })
    expect(w.find('.ml-swipe-cell__more').exists()).toBe(false)
    await (await drag(w, -100)).release()
    expect(transform(w)).toBe('')
    expect(w.emitted('update:open')).toBeUndefined()
  })

  it('renders the default slot and custom action slots', () => {
    const w = track(
      mount(MlSwipeCell, {
        props: { tag: 'div' },
        slots: { default: '<p class="x">row</p>', right: '<button class="custom">Pin</button>' },
      }),
    )
    expect(w.element.tagName).toBe('DIV')
    expect(w.find('.x').exists()).toBe(true)
    expect(w.find('.ml-swipe-cell__actions--right .custom').exists()).toBe(true)
    expect(w.find('.ml-swipe-cell__actions--left').exists()).toBe(false)
    expect(w.get('.ml-swipe-cell__more').attributes('aria-label')).toBe('更多動作')
  })
})

/* ── MlPullRefresh ── */

function mountPull(props: Record<string, unknown> = {}) {
  return track(
    mount(MlPullRefresh, {
      props,
      slots: { default: '<ul class="feed"><li>一</li><li>二</li></ul>' },
      attachTo: document.body,
    }),
  )
}

/** Drag down from y=10 to y. */
async function pull(w: VueWrapper, y: number, x = 100) {
  const el = w.get('.feed').element
  pointer(el, 'pointerdown', 100, 10)
  pointer(window, 'pointermove', x === 100 ? 100 : 100 + Math.sign(x - 100) * 12, x === 100 ? 22 : 11)
  pointer(window, 'pointermove', x, y)
  await nextTick()
  return async () => {
    pointer(window, 'pointerup', x, y)
    await nextTick()
    await tick()
  }
}

const head = (w: VueWrapper) => w.get('.ml-pull-refresh__text').text()
const offsetOf = (w: VueWrapper) => (w.get('.ml-pull-refresh__track').element as HTMLElement).style.transform

describe('MlPullRefresh', () => {
  it('renders the head, a focus-only refresh button and a status region', () => {
    const w = mountPull()
    expect(w.classes()).toContain('ml-pull-refresh--idle')
    expect(w.get('.ml-pull-refresh__head').attributes('aria-hidden')).toBe('true')
    expect(head(w)).toBe('下拉即可重新整理')
    expect(w.get('.ml-pull-refresh__button').text()).toBe('重新整理')
    expect(w.get('[role="status"]').text()).toBe('')
    expect(w.find('.ml-pull-refresh__paw').exists()).toBe(true)
  })

  it('pulling → release text → refreshing → success → idle, awaiting the promise', async () => {
    vi.useFakeTimers()
    let resolve!: () => void
    const onRefresh = vi.fn(() => new Promise<void>((r) => (resolve = r)))
    const w = mountPull({ onRefresh })
    const release = await pull(w, 40)
    expect(w.classes()).toEqual(expect.arrayContaining(['ml-pull-refresh--pulling', 'ml-pull-refresh--dragging']))
    expect(offsetOf(w)).toMatch(/^translate3d\(0, [\d.]+px, 0\)$/)
    pointer(window, 'pointermove', 100, 200)
    await nextTick()
    expect(w.classes()).toContain('ml-pull-refresh--loosing')
    expect(head(w)).toBe('放開以重新整理')
    await release()
    expect(onRefresh).toHaveBeenCalledOnce()
    expect(w.classes()).toContain('ml-pull-refresh--refreshing')
    expect(w.findAll('.ml-pull-refresh__step')).toHaveLength(4)
    expect(offsetOf(w)).toBe('translate3d(0, 56px, 0)')
    expect(w.get('[role="status"]').text()).toBe('重新整理中…')
    expect(w.get('.ml-pull-refresh__button').attributes('disabled')).toBeDefined()
    resolve()
    await flushPromises()
    expect(w.classes()).toContain('ml-pull-refresh--success')
    expect(head(w)).toBe('已更新')
    expect(w.get('[role="status"]').text()).toBe('已更新')
    vi.advanceTimersByTime(600)
    await nextTick()
    expect(offsetOf(w)).toBe('')
    vi.advanceTimersByTime(300)
    await nextTick()
    expect(w.classes()).toContain('ml-pull-refresh--idle')
    expect(w.emitted('status-change')!.map((e) => e[0])).toEqual(['pulling', 'loosing', 'refreshing', 'success', 'idle'])
  })

  it('a rejected promise shows the fail text', async () => {
    vi.useFakeTimers()
    const w = mountPull({ onRefresh: () => Promise.reject(new Error('offline')), failText: '網路斷線' })
    const release = await pull(w, 220)
    await release()
    await flushPromises()
    expect(w.classes()).toContain('ml-pull-refresh--fail')
    expect(head(w)).toBe('網路斷線')
    expect(w.get('[role="status"]').text()).toBe('網路斷線')
  })

  it('springs back without refreshing when released early', async () => {
    const onRefresh = vi.fn()
    const w = mountPull({ onRefresh })
    const release = await pull(w, 50)
    await release()
    expect(onRefresh).not.toHaveBeenCalled()
    expect(w.classes()).toContain('ml-pull-refresh--idle')
    expect(offsetOf(w)).toBe('')
  })

  it('ignores horizontal drags, upward drags, and pulls when the page is scrolled', async () => {
    const onRefresh = vi.fn()
    const w = mountPull({ onRefresh })
    let release = await pull(w, 14, 220)
    expect(w.classes()).not.toContain('ml-pull-refresh--dragging')
    await release()
    const el = w.get('.feed').element
    pointer(el, 'pointerdown', 100, 100)
    pointer(window, 'pointermove', 100, 80)
    pointer(window, 'pointermove', 100, 300)
    await nextTick()
    expect(w.classes()).not.toContain('ml-pull-refresh--dragging')
    pointer(window, 'pointerup', 100, 300)

    const scroller = document.scrollingElement as HTMLElement
    Object.defineProperty(scroller, 'scrollTop', { value: 120, configurable: true })
    release = await pull(w, 220)
    expect(w.classes()).not.toContain('ml-pull-refresh--dragging')
    await release()
    delete (scroller as { scrollTop?: number }).scrollTop
    expect(onRefresh).not.toHaveBeenCalled()
  })

  it('works with touch events and cancels the native scroll while pulling', async () => {
    const onRefresh = vi.fn()
    const w = mountPull({ onRefresh })
    const el = w.get('.feed').element
    const touch = (type: string, y: number) => {
      const event = new Event(type, { bubbles: true, cancelable: true }) as TouchEvent
      const list = type === 'touchend' ? [] : [{ clientX: 100, clientY: y, identifier: 0, target: el }]
      Object.defineProperty(event, 'touches', { value: list })
      el.dispatchEvent(event)
      return event
    }
    touch('touchstart', 10)
    expect(touch('touchmove', 14).defaultPrevented).toBe(true) // downward at the top: ours from the start
    touch('touchmove', 30)
    const late = touch('touchmove', 220)
    expect(late.defaultPrevented).toBe(true)
    await nextTick()
    expect(w.classes()).toContain('ml-pull-refresh--loosing')
    touch('touchend', 220)
    await nextTick()
    expect(onRefresh).toHaveBeenCalledOnce()
  })

  it('the keyboard button and the exposed refresh() start a refresh', async () => {
    const onRefresh = vi.fn()
    const w = mountPull({ onRefresh })
    await w.get('.ml-pull-refresh__button').trigger('click')
    expect(onRefresh).toHaveBeenCalledOnce()
    await flushPromises()
    expect(w.classes()).toContain('ml-pull-refresh--success')
    await (w.vm as unknown as { refresh: () => Promise<void> }).refresh()
    expect(onRefresh).toHaveBeenCalledTimes(2)
  })

  it('disabled: no button and no pulling', async () => {
    const onRefresh = vi.fn()
    const w = mountPull({ onRefresh, disabled: true })
    expect(w.find('.ml-pull-refresh__button').exists()).toBe(false)
    const release = await pull(w, 220)
    await release()
    expect(onRefresh).not.toHaveBeenCalled()
  })

  it('custom head height, threshold and texts', async () => {
    const w = mountPull({ headHeight: 80, pullDistance: 100, pullingText: '往下拉', loosingText: '放手' })
    expect(head(w)).toBe('往下拉')
    const release = await pull(w, 140) // 130px of travel → below 100px of pull
    expect(head(w)).toBe('往下拉')
    pointer(window, 'pointermove', 100, 400)
    await nextTick()
    expect(head(w)).toBe('放手')
    await release()
    expect(offsetOf(w)).toBe('translate3d(0, 80px, 0)')
  })
})
