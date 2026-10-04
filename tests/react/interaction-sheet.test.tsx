import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { act, createRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ActionSheet, ActionSheetHost, BottomSheet, actionSheet, type BottomSheetHandle } from '../../src/react/sheet'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined
function render(el: React.ReactElement) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(el))
  return host
}
const key = (el: Element, k: string) => act(() => void el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })))
const click = (el: Element | null) => act(() => void (el as HTMLElement).click())
const flush = (ms = 50) => act(() => new Promise((r) => setTimeout(r, ms)))
// Gesture velocity comes from event.timeStamp; a virtual clock keeps it independent of machine load.
let clock = 1000
const pointer = (type: string, target: EventTarget, clientY: number) =>
  act(() => {
    const event = new PointerEvent(type, { clientY, pointerId: 1, pointerType: 'mouse', button: 0, bubbles: true })
    Object.defineProperty(event, 'timeStamp', { value: clock })
    void target.dispatchEvent(event)
  })
/** Let `ms` pass on the gesture clock (and let React settle). */
const tick = (ms: number) => {
  clock += ms
  return flush(Math.min(ms, 20))
}

let restore: PropertyDescriptor | undefined
beforeAll(() => {
  restore = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight')
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
    configurable: true,
    get() {
      return (this as HTMLElement).classList.contains('ml-sheet') ? 800 : 0
    },
  })
})
afterAll(() => {
  if (restore) Object.defineProperty(HTMLElement.prototype, 'clientHeight', restore)
})
afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
  document.documentElement.style.overflow = ''
})

function Demo({ onClose, dismissible = true, sheetRef }: { onClose?: () => void; dismissible?: boolean; sheetRef?: React.Ref<BottomSheetHandle> }) {
  const [open, setOpen] = useState(false)
  const [snap, setSnap] = useState(0)
  return (
    <>
      <button id="opener" onClick={() => setOpen(true)}>Open</button>
      <span id="snap">{snap}</span>
      <BottomSheet
        ref={sheetRef}
        open={open}
        onOpenChange={setOpen}
        snap={snap}
        onSnapChange={setSnap}
        onClose={onClose}
        dismissible={dismissible}
        title="Sheet"
        snapPoints={['25%', '50%', '90%']}
      >
        Body
      </BottomSheet>
    </>
  )
}

describe('React sheets', () => {
  it('BottomSheet opens modal: focus, scroll lock, inert page; Esc closes and returns focus', async () => {
    const onClose = vi.fn()
    const host = render(<Demo onClose={onClose} />)
    const opener = host.querySelector<HTMLButtonElement>('#opener')!
    opener.focus()
    click(opener)
    await flush()
    const panel = document.querySelector<HTMLElement>('.ml-sheet__panel')!
    expect(panel.getAttribute('role')).toBe('dialog')
    expect(document.activeElement).toBe(panel)
    expect(document.documentElement.style.overflow).toBe('hidden')
    expect(host.hasAttribute('inert')).toBe(true)
    expect(panel.style.getPropertyValue('--_h')).toBe('200px')
    key(panel, 'Escape')
    expect(onClose).toHaveBeenCalledOnce()
    expect(document.activeElement).toBe(opener)
    expect(document.documentElement.style.overflow).toBe('')
    expect(host.hasAttribute('inert')).toBe(false)
  })

  it('handle keyboard and ref.snapTo move between snaps', async () => {
    const ref = createRef<BottomSheetHandle>()
    const host = render(<Demo sheetRef={ref} />)
    click(host.querySelector('#opener'))
    await flush()
    const handle = document.querySelector('.ml-sheet__handle')!
    expect(handle.getAttribute('role')).toBe('slider')
    key(handle, 'ArrowUp')
    expect(host.querySelector('#snap')!.textContent).toBe('1')
    expect(handle.getAttribute('aria-valuetext')).toBe('第 2 段，共 3 段')
    act(() => ref.current!.snapTo(2))
    expect(host.querySelector('#snap')!.textContent).toBe('2')
    expect(document.querySelector<HTMLElement>('.ml-sheet__panel')!.style.getPropertyValue('--_h')).toBe('720px')
  })

  it('drag on the handle follows the finger and settles; a flick down closes', async () => {
    const onClose = vi.fn()
    const host = render(<Demo onClose={onClose} />)
    click(host.querySelector('#opener'))
    await flush()
    const handle = document.querySelector('.ml-sheet__handle')!
    pointer('pointerdown', handle, 600)
    clock += 8
    pointer('pointermove', window, 590)
    clock += 8
    pointer('pointermove', window, 490)
    expect(document.querySelector('.ml-sheet')!.classList).toContain('ml-sheet--dragging')
    expect(document.querySelector<HTMLElement>('.ml-sheet__panel')!.style.getPropertyValue('--_h')).toBe('300px')
    clock += 8
    pointer('pointermove', window, 390)
    await tick(130)
    pointer('pointermove', window, 390)
    pointer('pointerup', window, 390)
    expect(host.querySelector('#snap')!.textContent).toBe('1')

    // A gentle flick down from the middle snap → lowest; a flick from the lowest → closed.
    pointer('pointerdown', handle, 400)
    for (const y of [410, 422, 434]) {
      await tick(20)
      pointer('pointermove', window, y)
    }
    pointer('pointerup', window, 434)
    expect(host.querySelector('#snap')!.textContent).toBe('0')
    pointer('pointerdown', handle, 600)
    for (const y of [610, 640, 690]) {
      clock += 8
      pointer('pointermove', window, y)
    }
    pointer('pointerup', window, 690)
    expect(onClose).toHaveBeenCalledOnce()
    await flush(320)
    expect(document.querySelector('.ml-sheet')).toBeNull()
  })

  it('ignores dismiss gestures when not dismissible', async () => {
    const onClose = vi.fn()
    const host = render(<Demo onClose={onClose} dismissible={false} />)
    click(host.querySelector('#opener'))
    await flush()
    const handle = document.querySelector('.ml-sheet__handle')!
    pointer('pointerdown', handle, 600)
    for (const y of [610, 640, 690]) pointer('pointermove', window, y)
    pointer('pointerup', window, 690)
    key(document.querySelector('.ml-sheet__panel')!, 'Escape')
    click(document.querySelector('.ml-sheet__backdrop'))
    expect(onClose).not.toHaveBeenCalled()
    expect(document.querySelector('.ml-sheet')).not.toBeNull()
  })

  it('ActionSheet: arrow keys skip disabled items, select closes, cancel reports', async () => {
    const onSelect = vi.fn()
    const onCancel = vi.fn()
    function Sheet() {
      const [open, setOpen] = useState(true)
      return (
        <ActionSheet
          open={open}
          onOpenChange={setOpen}
          actions={[{ label: 'A', value: 'a' }, { label: 'B', disabled: true }, { label: 'C', tone: 'danger' }]}
          title="Pick"
          onSelect={onSelect}
          onCancel={onCancel}
        />
      )
    }
    render(<Sheet />)
    await flush()
    const items = [...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')]
    const panel = document.querySelector('.ml-sheet__panel')!
    key(panel, 'ArrowDown')
    expect(document.activeElement).toBe(items[0])
    key(items[0], 'ArrowDown')
    expect(document.activeElement).toBe(items[2])
    expect(items[2].tabIndex).toBe(0)
    click(items[2])
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ label: 'C' }), 2)
    expect(onCancel).not.toHaveBeenCalled()
    await flush(320)
    expect(document.querySelector('.ml-sheet')).toBeNull()
  })

  it('actionSheet() resolves with the value, the label, or null', async () => {
    render(<ActionSheetHost />)
    let result: Promise<string | number | null>
    act(() => void (result = actionSheet({ actions: [{ label: 'A', value: 1 }, { label: 'B' }] })))
    await flush()
    click(document.querySelectorAll('[role="menuitem"]')[0])
    await expect(result!).resolves.toBe(1)

    act(() => void (result = actionSheet({ actions: [{ label: 'A', value: 1 }, { label: 'B' }] })))
    await flush(360)
    click(document.querySelectorAll('[role="menuitem"]')[1])
    await expect(result!).resolves.toBe('B')

    act(() => void (result = actionSheet({ actions: [{ label: 'A' }], cancelText: 'No' })))
    await flush(360)
    const cancel = document.querySelector('.ml-action-sheet__cancel')!
    expect(cancel.textContent).toBe('No')
    click(cancel)
    await expect(result!).resolves.toBeNull()
  })
})
