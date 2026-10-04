import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { MlActionSheet, MlActionSheetHost, MlBottomSheet, actionSheet } from '../src'
import {
  VelocityTracker,
  nearestSnap,
  parseSnapPoint,
  releaseSnap,
  resolveSnapPoints,
  rubberBand,
  sheetPosition,
  snapKey,
} from '../src/components/sheet'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

describe('sheet physics', () => {
  it('parses px, percentages and numbers, clamped to the container', () => {
    expect(parseSnapPoint(200, 800)).toBe(200)
    expect(parseSnapPoint('320px', 800)).toBe(320)
    expect(parseSnapPoint('50%', 800)).toBe(400)
    expect(parseSnapPoint('120%', 800)).toBe(800)
    expect(parseSnapPoint('nope', 800)).toBe(0)
    expect(resolveSnapPoints(['25%', 400, '95%'], 1000)).toEqual([250, 400, 950])
  })

  it('rubber-bands: grows with distance but never past the dimension', () => {
    expect(rubberBand(0, 800)).toBe(0)
    const a = rubberBand(50, 800)
    const b = rubberBand(200, 800)
    expect(a).toBeGreaterThan(0)
    expect(a).toBeLessThan(50)
    expect(b).toBeGreaterThan(a)
    expect(b - a).toBeLessThan(150) // diminishing returns
    expect(rubberBand(1e9, 800)).toBeLessThanOrEqual(800)
  })

  it('positions the sheet: follows between snaps, rubber-bands outside', () => {
    const snaps = [200, 500]
    expect(sheetPosition(350, snaps, true, 800)).toEqual({ height: 350, offset: 0, progress: 1 })
    const over = sheetPosition(600, snaps, true, 800)
    expect(over.height).toBe(500)
    expect(over.offset).toBeLessThan(0)
    expect(over.offset).toBeGreaterThan(-100)
    // Dismissible: slides down 1:1 below the lowest snap, backdrop fades.
    expect(sheetPosition(150, snaps, true, 800)).toEqual({ height: 200, offset: 50, progress: 0.75 })
    // Not dismissible: resists.
    const stuck = sheetPosition(100, snaps, false, 800)
    expect(stuck.offset).toBeGreaterThan(0)
    expect(stuck.offset).toBeLessThan(100)
  })

  it('settles on the nearest snap when released slowly', () => {
    const snaps = [200, 500, 760]
    expect(releaseSnap({ height: 330, velocity: 0, snaps, dismissible: true })).toBe(0)
    expect(releaseSnap({ height: 380, velocity: 0, snaps, dismissible: true })).toBe(1)
    expect(releaseSnap({ height: 700, velocity: 0, snaps, dismissible: true })).toBe(2)
    // Below half the lowest snap: closes when dismissible, else back to 0.
    expect(releaseSnap({ height: 80, velocity: 0, snaps, dismissible: true })).toBe(-1)
    expect(releaseSnap({ height: 80, velocity: 0, snaps, dismissible: false })).toBe(0)
  })

  it('carries a flick at least one snap in its direction', () => {
    const snaps = [200, 500, 760]
    // Barely moved up from 200 but flicked → next snap.
    expect(releaseSnap({ height: 230, velocity: 0.8, snaps, dismissible: true })).toBe(1)
    // A hard flick can skip a snap.
    expect(releaseSnap({ height: 230, velocity: 3, snaps, dismissible: true })).toBe(2)
    // Flicked down from the middle snap → lowest, from the lowest → closed.
    expect(releaseSnap({ height: 480, velocity: -0.8, snaps, dismissible: true })).toBe(0)
    expect(releaseSnap({ height: 190, velocity: -0.8, snaps, dismissible: true })).toBe(-1)
    expect(releaseSnap({ height: 190, velocity: -0.8, snaps, dismissible: false })).toBe(0)
    // Slow movement doesn't count as a flick.
    expect(releaseSnap({ height: 230, velocity: 0.1, snaps, dismissible: true })).toBe(0)
  })

  it('measures velocity over the last 100 ms', () => {
    const t = new VelocityTracker()
    t.add(0, 0)
    t.add(10, 10)
    t.add(40, 20)
    expect(t.velocity(20)).toBe(2)
    expect(t.velocity(500)).toBe(0) // finger rested before lifting
    t.reset()
    expect(t.velocity()).toBe(0)
    expect(nearestSnap(420, [200, 500, 760])).toBe(1)
  })

  it('maps keys on the handle to snap moves', () => {
    expect(snapKey('ArrowUp', 0, 3)).toBe(1)
    expect(snapKey('ArrowUp', 2, 3)).toBe(2)
    expect(snapKey('ArrowDown', 0, 3)).toBe(0)
    expect(snapKey('End', 0, 3)).toBe(2)
    expect(snapKey('Home', 2, 3)).toBe(0)
    expect(snapKey('Enter', 2, 3)).toBe(0)
    expect(snapKey('a', 1, 3)).toBeNull()
  })
})

/* ── Component interaction (happy-dom has no layout: give the sheet a size) ── */

const H = 800
let restoreClient: PropertyDescriptor | undefined
let restoreOffset: PropertyDescriptor | undefined
beforeAll(() => {
  restoreClient = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight')
  restoreOffset = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get() {
      return (this as HTMLElement).classList.contains('ml-sheet') ? H : 0
    },
  })
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get() {
      return (this as HTMLElement).classList.contains('ml-sheet__panel') ? 300 : 0
    },
  })
})
afterAll(() => {
  if (restoreClient) Object.defineProperty(HTMLElement.prototype, 'clientHeight', restoreClient)
  if (restoreOffset) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', restoreOffset)
})
afterEach(() => {
  document.body.innerHTML = ''
  document.documentElement.style.overflow = ''
})

const pointer = (type: string, target: EventTarget, clientY: number, pointerType = 'mouse') =>
  target.dispatchEvent(new PointerEvent(type, { clientY, pointerId: 1, pointerType, button: 0, bubbles: true }))

async function drag(target: Element, from: number, to: number, { slow = false, pointerType = 'mouse' } = {}) {
  pointer('pointerdown', target, from, pointerType)
  const steps = 6
  for (let i = 1; i <= steps; i++) pointer('pointermove', window, from + ((to - from) * i) / steps, pointerType)
  if (slow) {
    await sleep(130)
    pointer('pointermove', window, to, pointerType)
  }
  pointer('pointerup', window, to, pointerType)
  await nextTick()
}

function mountSheet(props: Record<string, unknown> = {}, slots: Record<string, () => unknown> = {}) {
  const open = ref(true)
  const snap = ref(0)
  const closed: number[] = []
  const wrapper = mount(
    defineComponent({
      setup: () => () => [
        h('button', { id: 'outside' }, 'outside'),
        h(
          MlBottomSheet,
          {
            open: open.value,
            'onUpdate:open': (v: boolean) => (open.value = v),
            snap: snap.value,
            'onUpdate:snap': (v: number) => (snap.value = v),
            onClose: () => closed.push(1),
            title: 'Sheet',
            snapPoints: ['25%', '50%', '90%'],
            ...props,
          },
          { default: () => h('p', { class: 'content' }, 'Body'), ...slots },
        ),
      ],
    }),
    { attachTo: document.body },
  )
  return { wrapper, open, snap, closed }
}

describe('MlBottomSheet', () => {
  it('renders a labelled modal dialog with the snap slider, locks the page and makes it inert', async () => {
    const { wrapper } = mountSheet()
    await flushPromises()
    const panel = document.querySelector<HTMLElement>('.ml-sheet__panel')!
    expect(panel.getAttribute('role')).toBe('dialog')
    expect(panel.getAttribute('aria-modal')).toBe('true')
    expect(document.getElementById(panel.getAttribute('aria-labelledby')!)?.textContent).toBe('Sheet')
    expect(panel.style.getPropertyValue('--_h')).toBe('200px')
    expect(document.activeElement).toBe(panel)
    expect(document.documentElement.style.overflow).toBe('hidden')
    expect(document.getElementById('outside')!.parentElement!.hasAttribute('inert')).toBe(true)
    const handle = document.querySelector('.ml-sheet__handle')!
    expect(handle.getAttribute('role')).toBe('slider')
    expect(handle.getAttribute('aria-valuetext')).toBe('第 1 段，共 3 段')
    expect(document.querySelector('.ml-sheet__paw')).not.toBeNull()
    wrapper.unmount()
    expect(document.documentElement.style.overflow).toBe('')
  })

  it('moves between snap points with the keyboard on the handle', async () => {
    const { snap } = mountSheet()
    await flushPromises()
    const handle = document.querySelector<HTMLElement>('.ml-sheet__handle')!
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
    await nextTick()
    expect(snap.value).toBe(1)
    expect(handle.getAttribute('aria-valuetext')).toBe('第 2 段，共 3 段')
    handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    await nextTick()
    expect(snap.value).toBe(2)
    expect(document.querySelector<HTMLElement>('.ml-sheet__panel')!.style.getPropertyValue('--_h')).toBe('720px')
  })

  it('follows a drag on the handle and settles on the nearest snap', async () => {
    const { snap, open } = mountSheet()
    await flushPromises()
    const handle = document.querySelector('.ml-sheet__handle')!
    // From 200px, drag up 190px slowly → 390px, nearest is 400px (50%).
    pointer('pointerdown', handle, 600)
    pointer('pointermove', window, 590) // past the slop: the drag starts here
    pointer('pointermove', window, 490)
    await nextTick()
    const sheet = document.querySelector('.ml-sheet')!
    expect(sheet.classList).toContain('ml-sheet--dragging')
    expect(document.querySelector<HTMLElement>('.ml-sheet__panel')!.style.getPropertyValue('--_h')).toBe('300px')
    pointer('pointermove', window, 400)
    await sleep(130)
    pointer('pointermove', window, 400)
    pointer('pointerup', window, 400)
    await nextTick()
    expect(sheet.classList).not.toContain('ml-sheet--dragging')
    expect(snap.value).toBe(1)
    expect(open.value).toBe(true)
  })

  it('rubber-bands past the top snap', async () => {
    mountSheet({}, {})
    await flushPromises()
    const handle = document.querySelector('.ml-sheet__handle')!
    pointer('pointerdown', handle, 700)
    pointer('pointermove', window, 690)
    pointer('pointermove', window, 0) // 200 + 690 = 890 > 720
    await nextTick()
    const panel = document.querySelector<HTMLElement>('.ml-sheet__panel')!
    expect(panel.style.getPropertyValue('--_h')).toBe('720px')
    const y = parseFloat(panel.style.getPropertyValue('--_y'))
    expect(y).toBeLessThan(0)
    expect(y).toBeGreaterThan(-170)
    pointer('pointerup', window, 0)
  })

  it('closes on a downward flick and emits close', async () => {
    const { open, closed } = mountSheet()
    await flushPromises()
    await drag(document.querySelector('.ml-sheet__header')!, 600, 700)
    expect(open.value).toBe(false)
    expect(closed).toHaveLength(1)
  })

  it('does not close when not dismissible (flick, Esc, backdrop)', async () => {
    const { open } = mountSheet({ dismissible: false })
    await flushPromises()
    await drag(document.querySelector('.ml-sheet__handle')!, 600, 700)
    expect(open.value).toBe(true)
    document.querySelector('.ml-sheet__panel')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    ;(document.querySelector('.ml-sheet__backdrop') as HTMLElement).click()
    await nextTick()
    expect(open.value).toBe(true)
  })

  it('closes on Escape and returns focus', async () => {
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()
    const { open } = mountSheet()
    await flushPromises()
    document.querySelector('.ml-sheet__panel')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()
    expect(open.value).toBe(false)
    expect(document.activeElement).toBe(opener)
  })

  it('only drags from the content once it is scrolled to the top (touch / pen)', async () => {
    const { snap } = mountSheet()
    await flushPromises()
    const body = document.querySelector<HTMLElement>('.ml-sheet__body')!
    const content = body.querySelector('.content')!
    // Mouse in the content is text selection, not a drag.
    await drag(content, 400, 100, { slow: true })
    expect(snap.value).toBe(0)
    // Scrolled down: pulling down scrolls the content instead.
    snap.value = 1
    await nextTick()
    body.scrollTop = 50
    await drag(content, 300, 600, { pointerType: 'pen' })
    expect(snap.value).toBe(1)
    // At the top: pulling down moves the sheet.
    body.scrollTop = 0
    await drag(content, 300, 420, { pointerType: 'pen', slow: true })
    expect(snap.value).toBe(0)
  })

  it('is a non-modal peek sheet with modal=false', async () => {
    mountSheet({ modal: false })
    await flushPromises()
    expect(document.querySelector('.ml-sheet--peek')).not.toBeNull()
    expect(document.querySelector('.ml-sheet__backdrop')).toBeNull()
    expect(document.querySelector('.ml-sheet__panel')!.hasAttribute('aria-modal')).toBe(false)
    expect(document.documentElement.style.overflow).toBe('')
    expect(document.getElementById('outside')!.parentElement!.hasAttribute('inert')).toBe(false)
  })

  it('fits its content without snap points; the handle is decoration', async () => {
    mountSheet({ snapPoints: undefined })
    await flushPromises()
    expect(document.querySelector('.ml-sheet--fit')).not.toBeNull()
    const handle = document.querySelector('.ml-sheet__handle')!
    expect(handle.getAttribute('role')).toBeNull()
    expect(handle.getAttribute('aria-hidden')).toBe('true')
    expect(document.querySelector<HTMLElement>('.ml-sheet__panel')!.style.getPropertyValue('--_h')).toBe('')
  })

  it('renders in place with inline', async () => {
    const wrapper = mount(MlBottomSheet, { props: { open: true, inline: true, title: 'T' }, attachTo: document.body })
    await flushPromises()
    expect(wrapper.find('.ml-sheet--inline').exists()).toBe(true)
    expect(document.documentElement.style.overflow).toBe('')
  })
})

const actions = [
  { label: 'Share', value: 'share', icon: 'message' as const },
  { label: 'Locked', value: 'locked', disabled: true },
  { label: 'Delete', value: 'delete', tone: 'danger' as const, description: 'Gone forever' },
]

describe('MlActionSheet', () => {
  it('renders a menu, emits select and closes', async () => {
    const wrapper = mount(MlActionSheet, { props: { open: true, actions, title: 'Photo' }, attachTo: document.body })
    await flushPromises()
    const menu = document.querySelector('[role="menu"]')!
    expect(menu.getAttribute('aria-label')).toBe('Photo')
    const items = [...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')]
    expect(items).toHaveLength(3)
    expect(items[1].disabled).toBe(true)
    expect(items[2].classList).toContain('ml-action-sheet__item--danger')
    expect(document.querySelector('.ml-action-sheet__cancel')!.textContent).toBe('取消')
    items[2].click()
    expect(wrapper.emitted('select')?.[0]).toEqual([actions[2], 2])
    expect(wrapper.emitted('update:open')?.[0]).toEqual([false])
    expect(wrapper.emitted('cancel')).toBeUndefined()
  })

  it('moves focus with the arrow keys, skipping disabled actions', async () => {
    mount(MlActionSheet, { props: { open: true, actions }, attachTo: document.body })
    await flushPromises()
    const panel = document.querySelector<HTMLElement>('.ml-sheet__panel')!
    const items = [...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')]
    const key = (k: string) => (document.activeElement ?? panel).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }))
    key('ArrowDown')
    expect(document.activeElement).toBe(items[0])
    key('ArrowDown')
    expect(document.activeElement).toBe(items[2])
    key('ArrowDown')
    expect(document.activeElement).toBe(items[0])
    key('End')
    expect(document.activeElement).toBe(items[2])
    await nextTick()
    expect(items[2].tabIndex).toBe(0)
  })

  it('emits cancel from the cancel button, Esc and hides it with cancelText=false', async () => {
    const wrapper = mount(MlActionSheet, { props: { open: true, actions, cancelText: 'Nope' }, attachTo: document.body })
    await flushPromises()
    const cancel = document.querySelector<HTMLButtonElement>('.ml-action-sheet__cancel')!
    expect(cancel.textContent).toBe('Nope')
    cancel.click()
    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(wrapper.emitted('update:open')?.[0]).toEqual([false])
    await wrapper.setProps({ open: false })
    await wrapper.setProps({ open: true })
    await flushPromises()
    document.querySelector('.ml-sheet__panel')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(wrapper.emitted('cancel')).toHaveLength(2)
    await wrapper.setProps({ cancelText: false })
    expect(document.querySelector('.ml-action-sheet__cancel')).toBeNull()
  })
})

describe('actionSheet()', () => {
  it('resolves with the picked value, the label as fallback, or null', async () => {
    mount(MlActionSheetHost, { attachTo: document.body })
    const first = actionSheet({ title: 'Pick', actions: [{ label: 'A', value: 'a' }, { label: 'B' }] })
    await flushPromises()
    let items = document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')
    expect(items).toHaveLength(2)
    items[0].click()
    await expect(first).resolves.toBe('a')

    const second = actionSheet({ actions: [{ label: 'A', value: 'a' }, { label: 'B' }] })
    await flushPromises()
    await sleep(320)
    await flushPromises()
    items = document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')
    items[1].click()
    await expect(second).resolves.toBe('B')

    const third = actionSheet({ actions: [{ label: 'A' }], cancelText: 'No' })
    await flushPromises()
    await sleep(320)
    await flushPromises()
    document.querySelector<HTMLButtonElement>('.ml-action-sheet__cancel')!.click()
    await expect(third).resolves.toBeNull()
  })
})
