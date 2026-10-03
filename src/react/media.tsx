// React twins of MlSignaturePad and MlImageCropper — same markup and classes,
// same framework-free geometry (components/signature.ts, components/cropper.ts).
import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import {
  cloneStrokes,
  drawSegments,
  drawStrokes,
  keepPoint,
  strokeSegments,
  strokesToSVG,
  type SignatureStroke,
} from '../components/signature'
import {
  CROP_HANDLES,
  boxBounds,
  boxStyle,
  clampView,
  coverScale,
  cropData,
  drawCrop,
  fitBoxToAspect,
  fitScale,
  imageStyle,
  initialLayout,
  layoutFromData,
  moveBox,
  outputSize,
  previewStyles,
  resizeBox,
  rotateView,
  zoomView,
  type CropHandle,
  type CropView,
  type MlCropData,
  type MlCropOutput,
  type Rect,
  type Size,
} from '../components/cropper'
import { pawStamp } from '../pawStamp'
import { Icon, Paw } from './basic'
import { useLocale } from './locale'
import { cx, len, useControllable } from './utils'

export type { SignatureStroke, SignaturePoint } from '../components/signature'
export type { MlCropData, MlCropOutput } from '../components/cropper'

const cleanId = (id: string) => id.replace(/[^\w-]/g, '')

/* ── SignaturePad ──────────────────────────────────────── */

export interface SignaturePadHandle {
  /** Image of the pad at device resolution ('' when canvas is unavailable). */
  toDataURL(type?: string, quality?: number): string
  toSVG(): string
  isEmpty(): boolean
  clear(): void
  undo(): void
  /** Replace the drawing with saved strokes (from toData()). */
  fromData(strokes: SignatureStroke[]): void
  toData(): SignatureStroke[]
}

export interface SignaturePadProps {
  /** PNG data URL of the signature; null when empty. */
  value?: string | null
  defaultValue?: string | null
  /** After every finished stroke, undo or clear. */
  onChange?: (value: string | null) => void
  onBegin?: () => void
  onEnd?: () => void
  /** Ink colour. Default: the theme's ink. */
  penColor?: string
  minWidth?: number
  maxWidth?: number
  /** Paper colour, also baked into exports. */
  background?: string
  /** px number or any CSS length. */
  height?: number | string
  disabled?: boolean
  label?: string
  placeholder?: string
  /** Pop a paw print where the first stroke ends. */
  paw?: boolean
}

export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(function SignaturePad(
  { value, defaultValue = null, onChange, onBegin, onEnd, penColor, minWidth = 0.75, maxWidth = 3, background, height = 200, disabled, label, placeholder, paw },
  ref,
) {
  const loc = useLocale()
  const hintId = `ml-signature-${cleanId(useId())}-hint`
  const [model, setModel] = useControllable(value, defaultValue, onChange)
  const root = useRef<HTMLDivElement>(null)
  const pad = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const strokes = useRef<SignatureStroke[]>([])
  const base = useRef<string | null>(model || null)
  const baseImg = useRef<HTMLImageElement | null>(null)
  const lastEmitted = useRef<string | null>(model)
  const size = useRef({ w: 0, h: 0, dpr: 1, baseWidth: null as number | null })
  const active = useRef<{ stroke: SignatureStroke; drawn: number; id: number } | null>(null)
  const [, setTick] = useState(0)
  const rerender = () => setTick((t) => t + 1)
  const [drawing, setDrawing] = useState(false)
  const [announce, setAnnounce] = useState('')

  const empty = !strokes.current.length && !base.current
  const status = empty ? loc.signature.empty : loc.signature.signed(strokes.current.length || 1)
  const paper = background && background !== 'transparent' ? background : undefined

  function context(): CanvasRenderingContext2D | null {
    try {
      return canvas.current?.getContext('2d') ?? null
    } catch {
      return null
    }
  }
  const scaleK = () => (size.current.baseWidth && size.current.w ? size.current.w / size.current.baseWidth : 1)
  const ink = () => penColor || (canvas.current && getComputedStyle(canvas.current).color) || '#f9c757'

  function measure() {
    const el = pad.current
    const c = canvas.current
    if (!el || !c) return
    const s = size.current
    s.w = el.clientWidth
    s.h = el.clientHeight
    s.dpr = window.devicePixelRatio || 1
    c.width = Math.max(1, Math.round(s.w * s.dpr))
    c.height = Math.max(1, Math.round(s.h * s.dpr))
    if (s.baseWidth == null && s.w && strokes.current.length) s.baseWidth = s.w
  }

  function redraw() {
    const ctx = context()
    const c = canvas.current
    if (!ctx || !c) return
    const { dpr, w } = size.current
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, c.width, c.height)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const img = baseImg.current
    if (img?.naturalWidth) ctx.drawImage(img, 0, 0, w, (img.naturalHeight * w) / img.naturalWidth)
    const k = scaleK()
    ctx.setTransform(dpr * k, 0, 0, dpr * k, 0, 0)
    drawStrokes(ctx, strokes.current, ink())
  }
  const redrawRef = useRef(redraw)
  redrawRef.current = redraw

  function loadBase() {
    baseImg.current = null
    const want = base.current
    if (!want) return redraw()
    const img = new Image()
    img.onload = () => {
      if (base.current !== want) return
      baseImg.current = img
      redrawRef.current()
    }
    img.src = want
  }

  // An outside value (reset or new image) replaces the drawing; our own echoes are ignored.
  useEffect(() => {
    if (model === lastEmitted.current) return
    lastEmitted.current = model
    strokes.current = []
    size.current.baseWidth = null
    base.current = model || null
    loadBase()
    rerender()
  }, [model])

  useEffect(() => redraw(), [penColor, background])

  function toDataURL(type = 'image/png', quality?: number): string {
    const c = canvas.current
    if (!c || !context()) return ''
    try {
      // The paper is CSS on screen (so the signing line shows); bake it in here. JPEG has no alpha: white.
      const fill = paper ?? (type === 'image/jpeg' ? '#fff' : undefined)
      if (!fill) return c.toDataURL(type, quality)
      const out = document.createElement('canvas')
      out.width = c.width
      out.height = c.height
      const ctx = out.getContext('2d')
      if (!ctx) return ''
      ctx.fillStyle = fill
      ctx.fillRect(0, 0, out.width, out.height)
      ctx.drawImage(c, 0, 0)
      return out.toDataURL(type, quality)
    } catch {
      return ''
    }
  }

  function toSVG(): string {
    const img = baseImg.current
    return strokesToSVG(strokes.current, {
      width: size.current.w || pad.current?.clientWidth || 0,
      height: size.current.h || pad.current?.clientHeight || 0,
      ink: ink(),
      background: paper,
      scale: scaleK(),
      image: base.current,
      imageSize: img?.naturalWidth ? { width: img.naturalWidth, height: img.naturalHeight } : undefined,
    })
  }

  const isEmpty = () => !strokes.current.length && !base.current

  function commit(message?: string) {
    const nowEmpty = isEmpty()
    const next = nowEmpty ? null : toDataURL() || null
    lastEmitted.current = next
    setModel(next)
    setAnnounce(message ?? (nowEmpty ? loc.signature.empty : loc.signature.signed(strokes.current.length || 1)))
    rerender()
  }

  function clear() {
    strokes.current = []
    base.current = null
    baseImg.current = null
    size.current.baseWidth = null
    redraw()
    commit(loc.signature.cleared)
  }

  function undo() {
    if (!strokes.current.length) return
    strokes.current = strokes.current.slice(0, -1)
    redraw()
    commit()
  }

  function fromData(data: SignatureStroke[]) {
    strokes.current = cloneStrokes(data)
    size.current.baseWidth = size.current.w || null
    redraw()
    commit()
  }

  useImperativeHandle(ref, () => ({ toDataURL, toSVG, isEmpty, clear, undo, fromData, toData: () => cloneStrokes(strokes.current) }))

  function addPoint(event: PointerEvent) {
    const a = active.current
    if (!a || !pad.current) return
    const rect = pad.current.getBoundingClientRect()
    const k = scaleK()
    const point = {
      x: (event.clientX - rect.left) / k,
      y: (event.clientY - rect.top) / k,
      time: event.timeStamp,
      ...(event.pointerType === 'pen' && event.pressure > 0 ? { pressure: event.pressure } : {}),
    }
    const pts = a.stroke.points
    if (keepPoint(pts[pts.length - 1], point)) pts.push(point)
  }

  function paint(all: boolean) {
    const a = active.current
    const ctx = context()
    if (!a || !ctx) return
    const segs = strokeSegments(a.stroke)
    const until = all ? segs.length : Math.max(0, segs.length - 1)
    if (until <= a.drawn) return
    const k = scaleK()
    ctx.setTransform(size.current.dpr * k, 0, 0, size.current.dpr * k, 0, 0)
    drawSegments(ctx, segs.slice(a.drawn, until), a.stroke.color || ink())
    a.drawn = until
  }

  function onDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (disabled || active.current || (event.pointerType === 'mouse' && event.button !== 0)) return
    event.preventDefault()
    pad.current?.setPointerCapture?.(event.pointerId)
    if (!size.current.w) measure()
    if (size.current.baseWidth == null) size.current.baseWidth = size.current.w || null
    const stroke: SignatureStroke = { points: [], minWidth, maxWidth, ...(penColor ? { color: penColor } : {}) }
    strokes.current = [...strokes.current, stroke]
    active.current = { stroke, drawn: 0, id: event.pointerId }
    setDrawing(true)
    addPoint(event.nativeEvent)
    onBegin?.()
  }

  function onMove(event: ReactPointerEvent<HTMLDivElement>) {
    const a = active.current
    if (!a || event.pointerId !== a.id) return
    const native = event.nativeEvent
    const samples = native.getCoalescedEvents?.() ?? []
    for (const e of samples.length ? samples : [native]) addPoint(e)
    paint(false)
  }

  function onUp(event: ReactPointerEvent<HTMLDivElement>) {
    const a = active.current
    if (!a || event.pointerId !== a.id) return
    paint(true)
    const first = strokes.current.length === 1 && !base.current
    active.current = null
    setDrawing(false)
    onEnd?.()
    commit()
    if (paw && first) pawStamp(event.clientX, event.clientY)
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (disabled) return
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault()
      undo()
    } else if ((event.key === 'Delete' || event.key === 'Backspace') && event.target === root.current && !isEmpty()) {
      event.preventDefault()
      clear()
    }
  }

  useEffect(() => {
    measure()
    if (base.current) loadBase()
    else redraw()
    let ro: ResizeObserver | undefined
    let mo: MutationObserver | undefined
    if (typeof ResizeObserver !== 'undefined' && pad.current) {
      ro = new ResizeObserver(() => requestAnimationFrame(() => {
        const el = pad.current
        if (!el || (el.clientWidth === size.current.w && el.clientHeight === size.current.h)) return
        measure()
        redrawRef.current()
      }))
      ro.observe(pad.current)
    }
    if (typeof MutationObserver !== 'undefined') {
      mo = new MutationObserver(() => redrawRef.current())
      mo.observe(document.documentElement, { attributes: true, subtree: true, attributeFilter: ['data-ml-theme'] })
    }
    return () => {
      ro?.disconnect()
      mo?.disconnect()
    }
  }, [])

  const svgProps = {
    viewBox: '0 0 24 24',
    'aria-hidden': true,
    focusable: 'false' as const,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'square' as const,
    strokeLinejoin: 'miter' as const,
  }

  return (
    <div
      ref={root}
      className={cx('ml-signature', { 'ml-signature--empty': empty, 'ml-signature--drawing': drawing, 'ml-signature--disabled': disabled })}
      role="group"
      aria-label={label ?? loc.signature.label}
      aria-describedby={hintId}
      aria-disabled={disabled ? 'true' : undefined}
      tabIndex={disabled ? -1 : 0}
      style={{ '--_h': len(height), '--_paper': paper } as CSSProperties}
      onKeyDown={onKeyDown}
    >
      <div ref={pad} className="ml-signature__pad" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <span className="ml-signature__line" aria-hidden="true">
          <Paw className="ml-signature__mark" tone="current" shine={false} />
        </span>
        {empty && (
          <span className="ml-signature__placeholder" aria-hidden="true">
            {placeholder ?? loc.signature.placeholder}
          </span>
        )}
        <canvas ref={canvas} className="ml-signature__canvas" role="img" aria-label={status} />
      </div>
      <div className="ml-signature__tools">
        <button
          type="button"
          className="ml-signature__tool"
          aria-label={loc.signature.undo}
          title={loc.signature.undo}
          disabled={disabled || !strokes.current.length}
          onClick={undo}
        >
          <svg {...svgProps}>
            <path d="M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 010 11H11" />
          </svg>
        </button>
        <button type="button" className="ml-signature__tool" aria-label={loc.signature.clear} title={loc.signature.clear} disabled={disabled || empty} onClick={clear}>
          <svg {...svgProps}>
            <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
          </svg>
        </button>
      </div>
      <p id={hintId} className="ml-visually-hidden">
        {loc.signature.hint}
      </p>
      <p className="ml-visually-hidden" aria-live="polite">
        {announce}
      </p>
    </div>
  )
})

/* ── ImageCropper ──────────────────────────────────────── */

export interface ImageCropperHandle {
  /** A canvas holding the crop, at the crop's pixel size unless `output` says otherwise. */
  getCanvas(output?: MlCropOutput): HTMLCanvasElement | null
  toBlob(type?: string, quality?: number, output?: MlCropOutput): Promise<Blob | null>
  toDataURL(type?: string, quality?: number, output?: MlCropOutput): string
  getData(): MlCropData | null
  setData(data: Partial<MlCropData>): void
  reset(): void
  rotate(delta?: number): void
  zoomTo(zoom: number): void
}

export interface ImageCropperPreview {
  data: MlCropData | null
  src: string | undefined
  /** Styles for a live preview `size` px wide: a `frame` holding an <img> styled `image`. */
  styles: (size: number) => { frame: Record<string, string>; image: Record<string, string> }
}

export interface ImageCropperProps {
  /** Image URL, or a File / Blob (e.g. straight from Upload). */
  src?: string | Blob | null
  /** Crop box width / height; omit for free. */
  aspectRatio?: number
  shape?: 'rect' | 'circle'
  minSize?: number
  height?: number | string
  maxZoom?: number
  grid?: boolean
  toolbar?: boolean
  disabled?: boolean
  crossOrigin?: '' | 'anonymous' | 'use-credentials'
  alt?: string
  /** Every change of the crop box, zoom, pan or rotation. */
  onChange?: (data: MlCropData) => void
  onReady?: (size: Size) => void
  onError?: () => void
  /** Live preview area beside the viewport. */
  preview?: (p: ImageCropperPreview) => ReactNode
}

type Gesture =
  | { kind: 'move' | 'resize' | 'pan'; handle?: CropHandle; start: { x: number; y: number }; box: Rect; view: CropView }
  | { kind: 'pinch'; dist: number; scale: number }

const ARROWS: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }

export const ImageCropper = forwardRef<ImageCropperHandle, ImageCropperProps>(function ImageCropper(
  { src, aspectRatio, shape = 'rect', minSize = 32, height = 320, maxZoom = 4, grid = true, toolbar = true, disabled, crossOrigin, alt, onChange, onReady, onError, preview },
  ref,
) {
  const loc = useLocale()
  const hintId = `ml-cropper-${cleanId(useId())}-hint`
  const stage = useRef<HTMLDivElement>(null)
  const img = useRef<HTMLImageElement>(null)
  const boxEl = useRef<HTMLDivElement>(null)
  const bitmap = useRef<ImageBitmap | null>(null)
  const [url, setUrl] = useState<string | undefined>(typeof src === 'string' ? src || undefined : undefined)
  const [failed, setFailed] = useState(false)
  const [announce, setAnnounce] = useState('')
  // Geometry lives in a ref (pointer events can outrun renders); `tick` repaints.
  const geo = useRef({
    natural: null as Size | null,
    stage: { width: 0, height: 0 } as Size,
    view: { x: 0, y: 0, scale: 1, rotate: 0 } as CropView,
    box: { x: 0, y: 0, width: 0, height: 0 } as Rect,
    ready: false,
  })
  const [, setTick] = useState(0)
  const repaint = () => setTick((t) => t + 1)

  const aspect = shape === 'circle' ? 1 : aspectRatio && aspectRatio > 0 ? aspectRatio : undefined
  const g = geo.current
  const fitOf = () => (geo.current.natural ? fitScale(geo.current.stage, geo.current.natural, geo.current.view.rotate) : 1)
  const dataOf = (): MlCropData | null => {
    const s = geo.current
    return s.ready && s.natural ? cropData(s.view, s.natural, s.box, fitOf()) : null
  }
  const fit = fitOf()
  const zoom = g.view.scale / fit
  const minZoom = g.natural ? Math.min(maxZoom, coverScale(g.box, g.natural, g.view.rotate) / fit) : 1
  const data = dataOf()
  const active = g.ready && !disabled

  const latest = useRef({ onChange, maxZoom, aspect })
  latest.current = { onChange, maxZoom, aspect }

  function update(next: { view?: CropView; box?: Rect }, notify = true) {
    if (next.view) geo.current.view = next.view
    if (next.box) geo.current.box = next.box
    repaint()
    const d = dataOf()
    if (notify && d) latest.current.onChange?.(d)
  }

  function styles(size: number) {
    const d = dataOf()
    const n = geo.current.natural
    if (!d || !n) return { frame: { width: `${size}px`, height: `${size}px` }, image: { display: 'none' } }
    return previewStyles(d, n, size)
  }

  function say() {
    const d = dataOf()
    if (d) setAnnounce(loc.cropper.status(d.width, d.height, d.x, d.y, Math.round((geo.current.view.scale / fitOf()) * 100)))
  }

  function measure() {
    const el = stage.current
    if (el) geo.current.stage = { width: el.clientWidth, height: el.clientHeight }
  }

  function layout() {
    const s = geo.current
    if (!s.natural || !s.stage.width || !s.stage.height) return
    const next = initialLayout(s.stage, s.natural, latest.current.aspect)
    s.view = next.view
    s.box = next.box
    s.ready = true
  }

  // Source: URLs as-is; Files / Blobs through an object URL (+ an EXIF-aware bitmap for export).
  const prevSrc = useRef(src)
  useEffect(() => {
    if (prevSrc.current !== src) {
      prevSrc.current = src
      geo.current.ready = false
      geo.current.natural = null
      setFailed(false)
      repaint()
    }
    if (!src || typeof src === 'string') {
      setUrl(src || undefined)
      return
    }
    const objectUrl = URL.createObjectURL(src)
    let alive = true
    setUrl(objectUrl)
    if (typeof createImageBitmap === 'function') {
      createImageBitmap(src, { imageOrientation: 'from-image' })
        .then((b) => (alive ? (bitmap.current = b) : b.close()))
        .catch(() => {})
    }
    return () => {
      alive = false
      URL.revokeObjectURL(objectUrl)
      bitmap.current?.close?.()
      bitmap.current = null
    }
  }, [src])

  function onLoad() {
    const el = img.current
    if (!el?.naturalWidth) return
    setFailed(false)
    geo.current.natural = { width: el.naturalWidth, height: el.naturalHeight }
    measure()
    layout()
    onReady?.(geo.current.natural)
    update({})
  }

  function handleError() {
    setFailed(true)
    geo.current.ready = false
    repaint()
    onError?.()
  }

  // A new aspect ratio reshapes the box around its centre.
  const firstAspect = useRef(true)
  useEffect(() => {
    if (firstAspect.current) {
      firstAspect.current = false
      return
    }
    const s = geo.current
    if (!s.ready || !s.natural) return
    const box = fitBoxToAspect(s.box, aspect, boxBounds(s.view, s.natural, s.stage))
    update({ box, view: clampView(s.view, s.natural, box) })
  }, [aspect])

  function zoomTo(nextZoom: number, anchor?: { x: number; y: number }) {
    const s = geo.current
    if (!s.ready || !s.natural) return
    const f = fitOf()
    const at = anchor ?? { x: s.box.x + s.box.width / 2, y: s.box.y + s.box.height / 2 }
    update({ view: zoomView(s.view, s.natural, s.box, nextZoom * f, at, latest.current.maxZoom * f) })
  }
  const zoomBy = (factor: number, anchor?: { x: number; y: number }) => zoomTo((geo.current.view.scale / fitOf()) * factor, anchor)

  function rotate(delta = 90) {
    const s = geo.current
    if (!s.ready || !s.natural) return
    const view = rotateView(s.view, s.natural, s.box, delta)
    update({ view, box: moveBox(s.box, 0, 0, boxBounds(view, s.natural, s.stage)) })
    say()
  }

  function reset() {
    if (!geo.current.natural) return
    layout()
    update({})
    say()
  }

  function setData(next: Partial<MlCropData>) {
    const s = geo.current
    const d = dataOf()
    if (!d || !s.natural) return
    const l = layoutFromData(s.stage, s.natural, { ...d, ...next }, latest.current.maxZoom)
    const a = latest.current.aspect
    update({ view: l.view, box: a ? fitBoxToAspect(l.box, a, boxBounds(l.view, s.natural, s.stage)) : l.box })
  }

  function getCanvas(output: MlCropOutput = {}): HTMLCanvasElement | null {
    const d = dataOf()
    const n = geo.current.natural
    if (!d || !n || !img.current) return null
    const out = outputSize(d, output)
    const canvas = document.createElement('canvas')
    canvas.width = out.width
    canvas.height = out.height
    let ctx: CanvasRenderingContext2D | null = null
    try {
      ctx = canvas.getContext('2d')
    } catch {
      ctx = null
    }
    if (!ctx) return null
    const b = bitmap.current
    drawCrop(ctx, b && b.width === n.width && b.height === n.height ? b : img.current, n, d, out, output)
    return canvas
  }

  useImperativeHandle(ref, () => ({
    getCanvas,
    toBlob(type = 'image/png', quality?: number, output?: MlCropOutput) {
      const canvas = getCanvas(output)
      if (!canvas) return Promise.resolve(null)
      return new Promise<Blob | null>((resolve, reject) => {
        try {
          canvas.toBlob(resolve, type, quality)
        } catch (err) {
          reject(err)
        }
      })
    },
    toDataURL: (type = 'image/png', quality?: number, output?: MlCropOutput) => getCanvas(output)?.toDataURL(type, quality) ?? '',
    getData: dataOf,
    setData,
    reset,
    rotate,
    zoomTo: (z: number) => zoomTo(z),
  }))

  /* Pointer: move / resize the box, pan the image, pinch */
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<Gesture | null>(null)

  function local(event: { clientX: number; clientY: number }) {
    const rect = stage.current!.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  function onDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!geo.current.ready || disabled || (event.pointerType === 'mouse' && event.button !== 0)) return
    event.preventDefault()
    boxEl.current?.focus({ preventScroll: true })
    stage.current?.setPointerCapture?.(event.pointerId)
    const map = pointers.current
    map.set(event.pointerId, local(event))
    if (map.size === 2) {
      const [a, b] = [...map.values()]
      gesture.current = { kind: 'pinch', dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, scale: geo.current.view.scale }
    } else if (map.size === 1) {
      const target = event.target as Element | null
      const handle = target?.closest('[data-handle]')?.getAttribute('data-handle') as CropHandle | null
      const kind = handle ? 'resize' : target?.closest('.ml-cropper__box') ? 'move' : 'pan'
      gesture.current = { kind, handle: handle ?? undefined, start: local(event), box: geo.current.box, view: geo.current.view }
    }
  }

  function onMove(event: ReactPointerEvent<HTMLDivElement>) {
    const map = pointers.current
    const gs = gesture.current
    const s = geo.current
    if (!map.has(event.pointerId) || !gs || !s.natural) return
    const p = local(event)
    map.set(event.pointerId, p)
    const n = s.natural
    if (gs.kind === 'pinch') {
      if (map.size < 2) return
      const [a, b] = [...map.values()]
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const scale = (gs.scale * Math.hypot(a.x - b.x, a.y - b.y)) / gs.dist
      update({ view: zoomView(s.view, n, s.box, scale, mid, maxZoom * fitOf()) })
      return
    }
    const dx = p.x - gs.start.x
    const dy = p.y - gs.start.y
    if (gs.kind === 'move') update({ box: moveBox(gs.box, dx, dy, boxBounds(s.view, n, s.stage)) })
    else if (gs.kind === 'resize')
      update({ box: resizeBox(gs.box, gs.handle!, dx, dy, { bounds: boxBounds(s.view, n, s.stage), aspect, minSize }) })
    else update({ view: clampView({ ...gs.view, x: gs.view.x + dx, y: gs.view.y + dy }, n, s.box) })
  }

  function onUp(event: ReactPointerEvent<HTMLDivElement>) {
    const map = pointers.current
    if (!map.delete(event.pointerId)) return
    if (map.size === 1) {
      const [p] = [...map.values()]
      gesture.current = { kind: 'pan', start: p, box: geo.current.box, view: geo.current.view }
    } else if (!map.size) gesture.current = null
  }

  function onBoxKey(event: ReactKeyboardEvent<HTMLDivElement>) {
    const s = geo.current
    if (!s.ready || disabled || !s.natural) return
    const arrow = ARROWS[event.key]
    if (arrow) {
      const step = event.shiftKey ? 10 : 1
      const bounds = boxBounds(s.view, s.natural, s.stage)
      update({
        box: event.altKey
          ? resizeBox(s.box, 'se', arrow[0] * step, arrow[1] * step, { bounds, aspect, minSize })
          : moveBox(s.box, arrow[0] * step, arrow[1] * step, bounds),
      })
    } else if (event.key === '+' || event.key === '=') zoomBy(1.1)
    else if (event.key === '-' || event.key === '_') zoomBy(1 / 1.1)
    else return
    event.preventDefault()
    say()
  }

  // Wheel zoom needs a non-passive listener (React's onWheel is passive).
  const wheelRef = useRef<(e: WheelEvent) => void>(() => {})
  wheelRef.current = (event: WheelEvent) => {
    if (!geo.current.ready || disabled) return
    event.preventDefault()
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : 1)
    zoomBy(Math.exp(-delta * 0.0015), local(event))
  }

  useEffect(() => {
    const el = stage.current
    if (!el) return
    const onWheel = (e: WheelEvent) => wheelRef.current(e)
    el.addEventListener('wheel', onWheel, { passive: false })
    measure()
    if (img.current?.complete && img.current.naturalWidth && !geo.current.ready) onLoad()
    let ro: ResizeObserver | undefined
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => requestAnimationFrame(() => {
        const s = geo.current
        if (el.clientWidth === s.stage.width && el.clientHeight === s.stage.height) return
        const before = dataOf()
        measure()
        if (!s.natural) return
        if (!s.ready || !before) {
          layout()
          return repaint()
        }
        const l = layoutFromData(s.stage, s.natural, before, latest.current.maxZoom)
        update({ view: l.view, box: l.box }, false)
      }))
      ro.observe(el)
    }
    return () => {
      el.removeEventListener('wheel', onWheel)
      ro?.disconnect()
    }
  }, [])

  return (
    <div className={cx('ml-cropper', `ml-cropper--${shape}`, { 'ml-cropper--ready': g.ready, 'ml-cropper--disabled': disabled })} role="group" aria-label={loc.cropper.label}>
      <div className="ml-cropper__main">
        <div
          ref={stage}
          className="ml-cropper__stage"
          style={{ '--_h': len(height) } as CSSProperties}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          {url && (
            <img
              ref={img}
              className={cx('ml-cropper__img', { 'ml-cropper__img--pending': !g.ready })}
              src={url}
              alt={alt ?? ''}
              crossOrigin={crossOrigin}
              draggable="false"
              style={g.ready && g.natural ? imageStyle(g.view, g.natural) : undefined}
              onLoad={onLoad}
              onError={handleError}
            />
          )}
          {g.ready && (
            <div
              ref={boxEl}
              className="ml-cropper__box"
              role="group"
              aria-label={loc.cropper.box}
              aria-describedby={hintId}
              tabIndex={disabled ? -1 : 0}
              style={boxStyle(g.box)}
              onKeyDown={onBoxKey}
            >
              {grid && <span className="ml-cropper__grid" aria-hidden="true" />}
              {CROP_HANDLES.map((h) => (
                <span key={h} className={cx('ml-cropper__handle', `ml-cropper__handle--${h}`)} data-handle={h} aria-hidden="true" />
              ))}
            </div>
          )}
          {(!url || failed) && (
            <p className="ml-cropper__empty">
              <Icon name="file" />
              <span>{failed ? loc.cropper.error : loc.cropper.empty}</span>
            </p>
          )}
        </div>

        {toolbar && (
          <div className="ml-cropper__toolbar" role="toolbar" aria-label={loc.cropper.toolbar}>
            <button type="button" className="ml-cropper__btn ml-cropper__btn--flip" aria-label={loc.cropper.rotateLeft} title={loc.cropper.rotateLeft} disabled={!active} onClick={() => rotate(-90)}>
              <Icon name="rotate" />
            </button>
            <button type="button" className="ml-cropper__btn" aria-label={loc.cropper.zoomOut} title={loc.cropper.zoomOut} disabled={!active || zoom <= minZoom + 0.001} onClick={() => zoomBy(1 / 1.2)}>
              <Icon name="minus" />
            </button>
            <input
              type="range"
              className="ml-cropper__zoom"
              aria-label={loc.cropper.zoom}
              aria-valuetext={`${Math.round(zoom * 100)}%`}
              min={minZoom.toFixed(2)}
              max={maxZoom}
              step="0.01"
              value={zoom.toFixed(2)}
              disabled={!active}
              onChange={(e) => zoomTo(Number(e.target.value))}
            />
            <button type="button" className="ml-cropper__btn" aria-label={loc.cropper.zoomIn} title={loc.cropper.zoomIn} disabled={!active || zoom >= maxZoom - 0.001} onClick={() => zoomBy(1.2)}>
              <Icon name="plus" />
            </button>
            <button type="button" className="ml-cropper__btn" aria-label={loc.cropper.rotateRight} title={loc.cropper.rotateRight} disabled={!active} onClick={() => rotate(90)}>
              <Icon name="rotate" />
            </button>
            <button type="button" className="ml-cropper__btn" aria-label={loc.cropper.reset} title={loc.cropper.reset} disabled={!active} onClick={reset}>
              <Icon name="expand" />
            </button>
            <span className="ml-cropper__readout" aria-hidden="true">
              {data ? `${data.width} × ${data.height}` : '—'}
            </span>
          </div>
        )}
      </div>

      {preview && <div className="ml-cropper__aside">{preview({ data, src: url, styles })}</div>}

      <p id={hintId} className="ml-visually-hidden">
        {loc.cropper.hint}
      </p>
      <p className="ml-visually-hidden" aria-live="polite">
        {announce}
      </p>
    </div>
  )
})
