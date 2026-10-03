// MlSignaturePad / MlImageCropper: the framework-free math, then the Vue components.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { MlImageCropper, MlSignaturePad, en } from '../src'
import MlConfigProvider from '../src/components/MlConfigProvider.vue'
import {
  cloneStrokes,
  keepPoint,
  pointWidths,
  strokeSegments,
  strokesToSVG,
  widthForVelocity,
  type SignatureStroke,
} from '../src/components/signature'
import {
  boxBounds,
  clampView,
  coverScale,
  cropData,
  fitBoxToAspect,
  fitScale,
  imageRect,
  initialLayout,
  layoutFromData,
  moveBox,
  normRotate,
  outputSize,
  previewStyles,
  resizeBox,
  rotateView,
  rotatedSize,
  zoomView,
} from '../src/components/cropper'

/* ── signature.ts ─────────────────────────────────────────── */

const line = (n: number, dt = 16, step = 4): SignatureStroke => ({
  minWidth: 1,
  maxWidth: 4,
  points: Array.from({ length: n }, (_, i) => ({ x: i * step, y: 10, time: i * dt })),
})

describe('signature math', () => {
  it('maps speed to width within [min, max]', () => {
    expect(widthForVelocity(0, 1, 4)).toBe(4)
    expect(widthForVelocity(3, 1, 4)).toBe(1)
    expect(widthForVelocity(1, 0.5, 4)).toBe(2)
  })

  it('thins out fast strokes and swells slow ones', () => {
    const slow = pointWidths(line(10, 40, 1).points, 1, 4)
    const fast = pointWidths(line(10, 2, 20).points, 1, 4)
    expect(slow.at(-1)!).toBeGreaterThan(fast.at(-1)!)
    for (const w of [...slow, ...fast]) {
      expect(w).toBeGreaterThanOrEqual(1)
      expect(w).toBeLessThanOrEqual(4)
    }
  })

  it('uses pen pressure when present', () => {
    const w = pointWidths([{ x: 0, y: 0, time: 0, pressure: 1 }, { x: 50, y: 0, time: 1, pressure: 1 }], 1, 5)
    expect(w).toEqual([5, 5])
  })

  it('smooths a stroke into n quadratic segments; a tap is a dot', () => {
    expect(strokeSegments(line(0))).toEqual([])
    const [dot] = strokeSegments(line(1))
    expect(dot.dot).toBe(true)
    const segs = strokeSegments(line(5))
    expect(segs).toHaveLength(5)
    // Midpoint to midpoint, each sample as the control point.
    expect(segs[1]).toMatchObject({ x0: 2, cx: 4, x1: 6 })
    expect(segs[0]).toMatchObject({ x0: 0, y0: 10 })
    expect(segs.at(-1)).toMatchObject({ x1: 16, y1: 10 })
    // Segments are final once the next point exists: adding a point never changes earlier ones.
    const more = strokeSegments(line(6))
    expect(more.slice(0, 4)).toEqual(segs.slice(0, 4))
  })

  it('exports SVG with background, scale and per-stroke colours', () => {
    const svg = strokesToSVG([line(3), { ...line(1), color: '#c00' }], { width: 200, height: 100, ink: '#123', background: '#fff', scale: 2 })
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="200" height="100" viewBox="0 0 200 100">/)
    expect(svg).toContain('<rect width="100%" height="100%" fill="#fff"/>')
    expect(svg).toContain('transform="scale(2)"')
    expect(svg).toContain('stroke="#123"')
    expect(svg).toContain('<circle')
    expect(svg).toContain('fill="#c00"')
    expect(strokesToSVG([], { width: 10, height: 10, ink: '#000' })).not.toContain('<g')
  })

  it('clones and sanitises stroke data', () => {
    const bad = [{ points: [{ x: 1, y: 2, time: 3 }, { x: NaN, y: 0, time: 0 }], minWidth: 1, maxWidth: 2 }, { points: [] }] as unknown as SignatureStroke[]
    expect(cloneStrokes(bad)).toEqual([{ minWidth: 1, maxWidth: 2, points: [{ x: 1, y: 2, time: 3 }] }])
    expect(keepPoint(undefined, { x: 0, y: 0, time: 0 })).toBe(true)
    expect(keepPoint({ x: 0, y: 0, time: 0 }, { x: 0.2, y: 0.2, time: 1 })).toBe(false)
  })
})

/* ── cropper.ts ───────────────────────────────────────────── */

const stage = { width: 400, height: 300 }
const photo = { width: 800, height: 400 }

describe('cropper math', () => {
  it('rotates sizes and normalises angles', () => {
    expect(rotatedSize(photo, 90)).toEqual({ width: 400, height: 800 })
    expect(rotatedSize(photo, -180)).toEqual(photo)
    expect(normRotate(-90)).toBe(270)
    expect(normRotate(450)).toBe(90)
  })

  it('fits the image and centres a box with the aspect ratio', () => {
    expect(fitScale(stage, photo, 0)).toBe(0.5)
    expect(fitScale(stage, photo, 90)).toBe(0.375)
    const { view, box } = initialLayout(stage, photo, 1)
    expect(view).toEqual({ x: 200, y: 150, scale: 0.5, rotate: 0 })
    expect(imageRect(view, photo)).toEqual({ x: 0, y: 50, width: 400, height: 200 })
    expect(box.width).toBeCloseTo(160)
    expect(box.height).toBeCloseTo(160)
    expect(box.x + box.width / 2).toBeCloseTo(200)
  })

  it('keeps a moved box over the image and inside the stage', () => {
    const { view, box } = initialLayout(stage, photo, 1)
    const bounds = boxBounds(view, photo, stage)
    expect(bounds).toEqual({ x: 0, y: 50, width: 400, height: 200 })
    const moved = moveBox(box, -999, 999, bounds)
    expect(moved.x).toBe(0)
    expect(moved.y + moved.height).toBe(250)
  })

  it('resizes free boxes from any handle, respecting min size and bounds', () => {
    const bounds = { x: 0, y: 0, width: 400, height: 300 }
    const box = { x: 100, y: 100, width: 100, height: 100 }
    expect(resizeBox(box, 'se', 50, 20, { bounds })).toEqual({ x: 100, y: 100, width: 150, height: 120 })
    expect(resizeBox(box, 'nw', -500, -500, { bounds })).toEqual({ x: 0, y: 0, width: 200, height: 200 })
    expect(resizeBox(box, 'w', 500, 0, { bounds, minSize: 30 })).toEqual({ x: 170, y: 100, width: 30, height: 100 })
    expect(resizeBox(box, 'n', 0, 30, { bounds })).toEqual({ x: 100, y: 130, width: 100, height: 70 })
  })

  it('resizes fixed-ratio boxes, anchored at the opposite corner or edge', () => {
    const bounds = { x: 0, y: 0, width: 400, height: 300 }
    const box = { x: 100, y: 100, width: 100, height: 50 }
    const se = resizeBox(box, 'se', 40, 20, { bounds, aspect: 2 })
    expect(se.width / se.height).toBeCloseTo(2)
    expect([se.x, se.y]).toEqual([100, 100])
    const nw = resizeBox(box, 'nw', -1000, -1000, { bounds, aspect: 2 })
    expect(nw.x + nw.width).toBeCloseTo(200)
    expect(nw.y + nw.height).toBeCloseTo(150)
    expect(nw.width / nw.height).toBeCloseTo(2)
    expect(nw.y).toBeGreaterThanOrEqual(0)
    const e = resizeBox(box, 'e', 20, 0, { bounds, aspect: 2 })
    expect(e).toMatchObject({ x: 100, width: 120, height: 60 })
    expect(e.y + e.height / 2).toBeCloseTo(125)
    const s = resizeBox(box, 's', 0, -1000, { bounds, aspect: 2, minSize: 10 })
    expect(s.height).toBeCloseTo(10)
    expect(s.width).toBeCloseTo(20)
  })

  it('reshapes a box to a new ratio around its centre', () => {
    const next = fitBoxToAspect({ x: 0, y: 0, width: 200, height: 100 }, 1, { x: 0, y: 0, width: 400, height: 300 })
    expect(next).toEqual({ x: 50, y: 0, width: 100, height: 100 })
  })

  it('keeps the image covering the box when panning and zooming', () => {
    const { view, box } = initialLayout(stage, photo, 1)
    expect(coverScale(box, photo, 0)).toBeCloseTo(0.4)
    const panned = clampView({ ...view, x: view.x + 1000 }, photo, box)
    expect(imageRect(panned, photo).x).toBeCloseTo(box.x)
    const zoomedOut = zoomView(view, photo, box, 0.01, { x: 200, y: 150 }, 2)
    expect(zoomedOut.scale).toBeCloseTo(0.4)
    const zoomedIn = zoomView(view, photo, box, 99, { x: 200, y: 150 }, 2)
    expect(zoomedIn.scale).toBe(2)
    // The anchor stays put.
    const anchored = zoomView(view, photo, box, 1, { x: 200, y: 150 }, 2)
    expect([anchored.x, anchored.y]).toEqual([200, 150])
  })

  it('rotates around the box centre and keeps it covered', () => {
    const { view, box } = initialLayout(stage, photo, 1)
    const turned = rotateView(view, photo, box, 90)
    expect(turned.rotate).toBe(90)
    const img = imageRect(turned, photo)
    expect(img.x).toBeLessThanOrEqual(box.x + 0.001)
    expect(img.y).toBeLessThanOrEqual(box.y + 0.001)
    expect(img.x + img.width).toBeGreaterThanOrEqual(box.x + box.width - 0.001)
    expect(rotateView(turned, photo, box, -90).rotate).toBe(0)
  })

  it('reports crop data in source px and round-trips through layoutFromData', () => {
    const { view, box } = initialLayout(stage, photo, 1)
    const fit = fitScale(stage, photo, 0)
    const data = cropData(view, photo, box, fit)
    expect(data).toEqual({ x: 240, y: 40, width: 320, height: 320, rotate: 0, scale: 1 })
    const again = layoutFromData(stage, photo, data)
    expect(cropData(again.view, photo, again.box, fit)).toEqual(data)
    const bigger = layoutFromData({ width: 800, height: 600 }, photo, data)
    expect(cropData(bigger.view, photo, bigger.box, fitScale({ width: 800, height: 600 }, photo, 0))).toEqual(data)
  })

  it('sizes the output', () => {
    const d = { width: 320, height: 160 }
    expect(outputSize(d)).toEqual({ width: 320, height: 160 })
    expect(outputSize(d, { width: 100 })).toEqual({ width: 100, height: 50 })
    expect(outputSize(d, { height: 40 })).toEqual({ width: 80, height: 40 })
    expect(outputSize(d, { width: 256, height: 256 })).toEqual({ width: 256, height: 256 })
    expect(outputSize(d, { maxWidth: 160 })).toEqual({ width: 160, height: 80 })
    expect(outputSize(d, { maxHeight: 20 })).toEqual({ width: 40, height: 20 })
  })

  it('builds preview styles', () => {
    const p = previewStyles({ x: 240, y: 40, width: 320, height: 320, rotate: 0, scale: 1 }, photo, 160)
    expect(p.frame).toEqual({ width: '160px', height: '160px' })
    expect(p.image.width).toBe('400px')
    expect(p.image.transform).toBe('translate(-120px, -20px) rotate(0deg)')
  })
})

/* ── Vue components ───────────────────────────────────────── */

type FakeCtx = Record<string, unknown> & { calls: string[] }
function fakeContext(): FakeCtx {
  const calls: string[] = []
  const rec = (name: string) => () => void calls.push(name)
  return {
    calls,
    setTransform: rec('setTransform'),
    clearRect: rec('clearRect'),
    fillRect: rec('fillRect'),
    beginPath: rec('beginPath'),
    moveTo: rec('moveTo'),
    quadraticCurveTo: rec('quadraticCurveTo'),
    arc: rec('arc'),
    stroke: rec('stroke'),
    fill: rec('fill'),
    drawImage: rec('drawImage'),
    save: rec('save'),
    restore: rec('restore'),
    scale: rec('scale'),
    translate: rec('translate'),
    rotate: rec('rotate'),
    clip: rec('clip'),
    ellipse: rec('ellipse'),
  }
}

let ctx: FakeCtx
beforeEach(() => {
  ctx = fakeContext()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => ctx as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(function (this: HTMLCanvasElement, type?: string) {
    return `data:${type ?? 'image/png'};base64,${this.width}x${this.height}`
  })
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(400)
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(200)
})
afterEach(() => {
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

const pointer = (el: Element, type: string, x: number, y: number, init: PointerEventInit = {}) =>
  el.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', button: 0, bubbles: true, ...init }))

describe('MlSignaturePad', () => {
  it('renders the empty pad with placeholder, guideline and accessible text', () => {
    const w = mount(MlSignaturePad)
    expect(w.classes()).toContain('ml-signature--empty')
    expect(w.attributes('role')).toBe('group')
    expect(w.attributes('aria-label')).toBe('簽名板')
    expect(w.find('.ml-signature__placeholder').text()).toBe('請在此簽名')
    expect(w.find('canvas').attributes('aria-label')).toBe('尚未簽名')
    expect(w.find(`#${w.attributes('aria-describedby')}`).text()).toContain('Ctrl + Z')
    expect(w.findAll('.ml-signature__tool').every((b) => b.attributes('disabled') !== undefined)).toBe(true)
  })

  it('draws a stroke, emits a PNG data URL, then undo / clear', async () => {
    const w = mount(MlSignaturePad, { attachTo: document.body })
    const pad = w.find('.ml-signature__pad').element
    pointer(pad, 'pointerdown', 10, 10)
    for (let i = 1; i <= 6; i++) pointer(pad, 'pointermove', 10 + i * 8, 10 + i * 3)
    expect(ctx.calls).toContain('quadraticCurveTo')
    pointer(pad, 'pointerup', 58, 28)
    await nextTick()
    expect(w.emitted('begin')).toHaveLength(1)
    expect(w.emitted('end')).toHaveLength(1)
    const value = w.emitted('update:modelValue')!.at(-1)![0] as string
    expect(value).toMatch(/^data:image\/png;base64,/)
    expect(w.emitted('change')!.at(-1)).toEqual([value])
    expect(w.classes()).not.toContain('ml-signature--empty')
    expect(w.find('canvas').attributes('aria-label')).toBe('已簽名，共 1 筆')
    const vm = w.vm as unknown as { isEmpty: () => boolean; toSVG: () => string; toData: () => SignatureStroke[]; undo: () => void; clear: () => void }
    expect(vm.isEmpty()).toBe(false)
    expect(vm.toSVG()).toContain('<path d="M10 10Q')
    expect(vm.toData()[0].points.length).toBe(7)
    // Ctrl+Z on the pad undoes.
    await w.trigger('keydown', { key: 'z', ctrlKey: true })
    expect(w.emitted('update:modelValue')!.at(-1)).toEqual([null])
    expect(vm.isEmpty()).toBe(true)
    w.unmount()
  })

  it('Delete clears; disabled ignores pointers; JPEG export gets white paper', async () => {
    const w = mount(MlSignaturePad, { attachTo: document.body })
    const vm = w.vm as unknown as { fromData: (s: SignatureStroke[]) => void; toDataURL: (t?: string) => string }
    vm.fromData([line(4)])
    await nextTick()
    expect(w.emitted('change')).toHaveLength(1)
    expect(vm.toDataURL('image/jpeg')).toMatch(/^data:image\/jpeg/)
    expect(ctx.calls).toContain('fillRect') // white paper for JPEG
    await w.trigger('keydown', { key: 'Delete' })
    expect(w.emitted('change')!.at(-1)).toEqual([null])
    expect(w.find('[aria-live]').text()).toBe('已清除簽名')
    await w.setProps({ disabled: true })
    pointer(w.find('.ml-signature__pad').element, 'pointerdown', 5, 5)
    expect(w.emitted('begin')).toBeUndefined()
    expect(w.attributes('tabindex')).toBe('-1')
    w.unmount()
  })

  it('records pen pressure and resets when the parent clears v-model', async () => {
    const w = mount(MlSignaturePad, { attachTo: document.body })
    const pad = w.find('.ml-signature__pad').element
    pointer(pad, 'pointerdown', 10, 10, { pointerType: 'pen', pressure: 0.8 })
    pointer(pad, 'pointermove', 30, 10, { pointerType: 'pen', pressure: 0.2 })
    pointer(pad, 'pointerup', 30, 10, { pointerType: 'pen' })
    const vm = w.vm as unknown as { toData: () => SignatureStroke[]; isEmpty: () => boolean }
    expect(vm.toData()[0].points.map((p) => p.pressure)).toEqual([0.8, 0.2])
    await w.setProps({ modelValue: null })
    await w.setProps({ modelValue: 'data:image/png;base64,abc' })
    expect(vm.isEmpty()).toBe(false)
    expect(vm.toData()).toEqual([])
    await w.setProps({ modelValue: null })
    expect(vm.isEmpty()).toBe(true)
    w.unmount()
  })

  it('follows the locale', () => {
    const p = mount({ components: { MlConfigProvider, MlSignaturePad }, template: '<MlConfigProvider :locale="en"><MlSignaturePad /></MlConfigProvider>', setup: () => ({ en }) })
    expect(p.find('.ml-signature__placeholder').text()).toBe('Sign here')
    expect(p.find('.ml-signature').attributes('aria-label')).toBe('Signature pad')
  })
})

describe('MlImageCropper', () => {
  function loaded(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(300)
    vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(800)
    vi.spyOn(HTMLImageElement.prototype, 'naturalHeight', 'get').mockReturnValue(400)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, right: 400, bottom: 300, width: 400, height: 300, x: 0, y: 0, toJSON: () => ({}) })
    const w = mount(MlImageCropper, { props: { src: '/photo.jpg', ...props }, slots, attachTo: document.body })
    w.find('img').trigger('load')
    return w
  }

  it('shows an empty state without a source', () => {
    const w = mount(MlImageCropper)
    expect(w.find('.ml-cropper__empty').text()).toBe('尚未選擇圖片')
    expect(w.find('.ml-cropper__box').exists()).toBe(false)
    expect(w.findAll('.ml-cropper__btn').every((b) => b.attributes('disabled') !== undefined)).toBe(true)
  })

  it('lays out on load and emits crop data', async () => {
    const w = loaded({ aspectRatio: 1 })
    await nextTick()
    expect(w.emitted('ready')![0]).toEqual([{ width: 800, height: 400 }])
    expect(w.emitted('change')!.at(-1)).toEqual([{ x: 240, y: 40, width: 320, height: 320, rotate: 0, scale: 1 }])
    const box = w.find('.ml-cropper__box')
    expect(box.attributes('style')).toContain('width: 160px')
    expect(w.findAll('.ml-cropper__handle')).toHaveLength(8)
    expect(w.find('.ml-cropper__readout').text()).toBe('320 × 320')
    expect(w.find('img').classes()).not.toContain('ml-cropper__img--pending')
  })

  it('drags the box, resizes from a handle and pans the image', async () => {
    const w = loaded()
    await nextTick()
    const stage = w.find('.ml-cropper__stage').element
    const box = w.find('.ml-cropper__box').element
    pointer(box, 'pointerdown', 200, 150)
    pointer(stage, 'pointermove', 220, 160)
    pointer(stage, 'pointerup', 220, 160)
    const moved = w.emitted('change')!.at(-1)![0] as { x: number; y: number; width: number }
    expect([moved.x, moved.y]).toEqual([120, 60])
    expect(moved.width).toBe(640)
    // Free box: dragging the west handle only narrows from the left.
    pointer(box.querySelector('[data-handle="w"]')!, 'pointerdown', 40, 150)
    pointer(stage, 'pointermove', 90, 150)
    pointer(stage, 'pointerup', 90, 150)
    const resized = w.emitted('change')!.at(-1)![0] as { x: number; width: number; height: number }
    expect([resized.x, resized.width, resized.height]).toEqual([220, 540, 320])
    // Panning outside the box: the image can't leave the box uncovered.
    pointer(stage, 'pointerdown', 5, 5)
    pointer(stage, 'pointermove', 400, 5)
    pointer(stage, 'pointerup', 400, 5)
    const panned = w.emitted('change')!.at(-1)![0] as { x: number }
    expect(panned.x).toBe(0)
  })

  it('zooms, rotates and resets from the toolbar; keyboard moves the box', async () => {
    const w = loaded({ aspectRatio: 1 })
    await nextTick()
    const btns = w.findAll('.ml-cropper__btn')
    await btns[2].trigger('click') // zoom in
    expect((w.emitted('change')!.at(-1)![0] as { scale: number }).scale).toBe(1.2)
    await btns[3].trigger('click') // rotate right
    expect((w.emitted('change')!.at(-1)![0] as { rotate: number }).rotate).toBe(90)
    expect(w.find('img').attributes('style')).toContain('rotate(90deg)')
    expect(w.find('[aria-live]').text()).toMatch(/^裁切 \d+ × \d+/)
    await btns[0].trigger('click') // rotate left
    await btns[4].trigger('click') // reset
    expect(w.emitted('change')!.at(-1)).toEqual([{ x: 240, y: 40, width: 320, height: 320, rotate: 0, scale: 1 }])
    const box = w.find('.ml-cropper__box')
    await box.trigger('keydown', { key: 'ArrowRight', shiftKey: true })
    expect((w.emitted('change')!.at(-1)![0] as { x: number }).x).toBe(260)
    await box.trigger('keydown', { key: 'ArrowDown', altKey: true })
    const grown = w.emitted('change')!.at(-1)![0] as { width: number; height: number }
    expect(grown.width).toBe(grown.height)
    expect(grown.width).toBeGreaterThan(320)
    await box.trigger('keydown', { key: '+' })
    expect((w.emitted('change')!.at(-1)![0] as { scale: number }).scale).toBeCloseTo(1.1, 2)
    // The range input drives zoom too.
    const range = w.find('input[type="range"]')
    await range.setValue('2')
    expect((w.emitted('change')!.at(-1)![0] as { scale: number }).scale).toBe(2)
  })

  it('exports through a canvas at the requested size and offers preview styles', async () => {
    const w = loaded({ shape: 'circle' }, { preview: '<template #preview="{ styles }"><i class="pv" :style="styles(50).frame" /></template>' })
    await nextTick()
    expect(w.classes()).toContain('ml-cropper--circle')
    const vm = w.vm as unknown as { toDataURL: (t?: string, q?: number, o?: object) => string; getCanvas: (o?: object) => HTMLCanvasElement | null; getData: () => { width: number } }
    expect(vm.toDataURL('image/png', undefined, { width: 256, height: 256, circle: true })).toBe('data:image/png;base64,256x256')
    expect(ctx.calls).toEqual(expect.arrayContaining(['ellipse', 'clip', 'drawImage']))
    expect(vm.getCanvas()!.width).toBe(vm.getData().width)
    expect(w.find('.pv').attributes('style')).toContain('width: 50px')
  })

  it('accepts a File and revokes its object URL', async () => {
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake')
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const file = new File(['x'], 'a.png', { type: 'image/png' })
    const w = mount(MlImageCropper, { props: { src: file } })
    await nextTick()
    expect(create).toHaveBeenCalledWith(file)
    expect(w.find('img').attributes('src')).toBe('blob:fake')
    await w.setProps({ src: null })
    expect(revoke).toHaveBeenCalledWith('blob:fake')
    expect(w.find('.ml-cropper__empty').exists()).toBe(true)
  })
})
