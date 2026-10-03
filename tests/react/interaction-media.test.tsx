import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ImageCropper, SignaturePad, type ImageCropperHandle, type SignaturePadHandle } from '../../src/react/media'
import type { MlCropData } from '../../src/components/cropper'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined
function render(el: React.ReactElement) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(el))
  return host
}
const pointer = (el: Element, type: string, x: number, y: number, init: PointerEventInit = {}) =>
  act(() => void el.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', button: 0, bubbles: true, ...init })))
const key = (el: Element, k: string, init: KeyboardEventInit = {}) =>
  act(() => void el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, ...init })))
const click = (el: Element | null) => act(() => void (el as HTMLElement).click())

let calls: string[]
beforeEach(() => {
  calls = []
  const rec = (name: string) => () => void calls.push(name)
  const ctx = new Proxy({}, { get: (_t, p) => (typeof p === 'string' ? rec(p) : undefined), set: () => true })
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ctx as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(function (this: HTMLCanvasElement, type?: string) {
    return `data:${type ?? 'image/png'};base64,${this.width}x${this.height}`
  })
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(400)
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(300)
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, right: 400, bottom: 300, width: 400, height: 300, x: 0, y: 0, toJSON: () => ({}) })
})
afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('React SignaturePad', () => {
  it('draws, reports a PNG data URL, undoes with Ctrl+Z and clears with Delete', () => {
    const onChange = vi.fn()
    const onBegin = vi.fn()
    const ref = createRef<SignaturePadHandle>()
    const host = render(<SignaturePad ref={ref} onChange={onChange} onBegin={onBegin} />)
    const pad = host.querySelector('.ml-signature__pad')!
    const rootEl = host.querySelector('.ml-signature')!
    expect(rootEl.classList).toContain('ml-signature--empty')
    pointer(pad, 'pointerdown', 10, 10)
    for (let i = 1; i <= 5; i++) pointer(pad, 'pointermove', 10 + i * 10, 12)
    pointer(pad, 'pointerup', 60, 12)
    expect(onBegin).toHaveBeenCalledOnce()
    expect(calls).toContain('quadraticCurveTo')
    expect(onChange).toHaveBeenLastCalledWith(expect.stringMatching(/^data:image\/png;base64,/))
    expect(rootEl.classList).not.toContain('ml-signature--empty')
    expect(host.querySelector('canvas')!.getAttribute('aria-label')).toBe('已簽名，共 1 筆')
    expect(ref.current!.toSVG()).toContain('<path d="M10 10Q')
    expect(ref.current!.toData()[0].points).toHaveLength(6)
    key(rootEl, 'z', { ctrlKey: true })
    expect(onChange).toHaveBeenLastCalledWith(null)
    expect(ref.current!.isEmpty()).toBe(true)
    act(() => ref.current!.fromData([{ minWidth: 1, maxWidth: 3, points: [{ x: 1, y: 1, time: 0 }, { x: 9, y: 9, time: 20 }] }]))
    expect(ref.current!.isEmpty()).toBe(false)
    key(rootEl, 'Delete')
    expect(ref.current!.isEmpty()).toBe(true)
    expect(host.querySelector('[aria-live]')!.textContent).toBe('已清除簽名')
  })

  it('a controlled value resets the pad; disabled ignores pointers', () => {
    const onChange = vi.fn()
    const ref = createRef<SignaturePadHandle>()
    const host = render(<SignaturePad ref={ref} value="data:image/png;base64,abc" onChange={onChange} />)
    expect(ref.current!.isEmpty()).toBe(false)
    act(() => root!.render(<SignaturePad ref={ref} value={null} onChange={onChange} disabled />))
    expect(ref.current!.isEmpty()).toBe(true)
    pointer(host.querySelector('.ml-signature__pad')!, 'pointerdown', 5, 5)
    expect(onChange).not.toHaveBeenCalled()
    expect(host.querySelector('.ml-signature')!.getAttribute('tabindex')).toBe('-1')
  })
})

describe('React ImageCropper', () => {
  function loaded(props: Partial<React.ComponentProps<typeof ImageCropper>> = {}) {
    vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(800)
    vi.spyOn(HTMLImageElement.prototype, 'naturalHeight', 'get').mockReturnValue(400)
    const onChange = vi.fn()
    const ref = createRef<ImageCropperHandle>()
    const host = render(<ImageCropper ref={ref} src="/photo.jpg" onChange={onChange} {...props} />)
    act(() => void host.querySelector('img')!.dispatchEvent(new Event('load')))
    const last = () => onChange.mock.lastCall![0] as MlCropData
    return { host, ref, onChange, last }
  }

  it('lays out on load, then moves the box, resizes and pans', () => {
    const { host, last } = loaded({ aspectRatio: 1 })
    expect(last()).toEqual({ x: 240, y: 40, width: 320, height: 320, rotate: 0, scale: 1 })
    const stage = host.querySelector('.ml-cropper__stage')!
    const box = host.querySelector('.ml-cropper__box')!
    pointer(box, 'pointerdown', 200, 150)
    pointer(stage, 'pointermove', 210, 150)
    pointer(stage, 'pointerup', 210, 150)
    expect(last().x).toBe(260)
    pointer(box.querySelector('[data-handle="se"]')!, 'pointerdown', 290, 230)
    pointer(stage, 'pointermove', 270, 210)
    pointer(stage, 'pointerup', 270, 210)
    expect(last().width).toBe(last().height)
    expect(last().width).toBe(280)
    pointer(stage, 'pointerdown', 5, 5)
    pointer(stage, 'pointermove', -900, 5)
    pointer(stage, 'pointerup', -900, 5)
    expect(last().x + last().width).toBe(800)
  })

  it('wheel / keyboard / toolbar zoom and rotate; exports a canvas', () => {
    const { host, ref, last } = loaded({ shape: 'circle' })
    const stage = host.querySelector('.ml-cropper__stage')!
    act(() => void stage.dispatchEvent(new WheelEvent('wheel', { deltaY: -200, clientX: 200, clientY: 150, bubbles: true, cancelable: true })))
    expect(last().scale).toBeGreaterThan(1.3)
    const box = host.querySelector('.ml-cropper__box')!
    key(box, '-')
    key(box, 'ArrowLeft')
    const btns = host.querySelectorAll('.ml-cropper__btn')
    click(btns[3])
    expect(last().rotate).toBe(90)
    click(btns[4])
    expect(last()).toEqual({ x: 240, y: 40, width: 320, height: 320, rotate: 0, scale: 1 })
    expect(host.querySelector('[aria-live]')!.textContent).toMatch(/^裁切 320 × 320/)
    expect(ref.current!.toDataURL('image/png', undefined, { width: 128, height: 128, circle: true })).toBe('data:image/png;base64,128x128')
    expect(calls).toEqual(expect.arrayContaining(['ellipse', 'clip', 'drawImage']))
    act(() => ref.current!.setData({ rotate: 180 }))
    expect(last().rotate).toBe(180)
  })

  it('renders the preview render prop with live styles', () => {
    const { host } = loaded({
      preview: ({ styles, src }) => (
        <div className="ml-cropper__preview" style={styles(80).frame}>
          <img className="ml-cropper__preview-img" src={src} alt="" style={styles(80).image} />
        </div>
      ),
    })
    const frame = host.querySelector('.ml-cropper__aside .ml-cropper__preview') as HTMLElement
    expect(frame.style.width).toBe('80px')
    expect(frame.style.height).toBe('40px')
  })

  it('creates and revokes an object URL for a File', () => {
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake')
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const file = new File(['x'], 'a.png', { type: 'image/png' })
    const host = render(<ImageCropper src={file} />)
    expect(create).toHaveBeenCalledWith(file)
    expect(host.querySelector('img')!.getAttribute('src')).toBe('blob:fake')
    act(() => root!.render(<ImageCropper src={null} />))
    expect(revoke).toHaveBeenCalledWith('blob:fake')
    expect(host.querySelector('.ml-cropper__empty')).not.toBeNull()
  })
})
