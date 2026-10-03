// Image cropper geometry — crop box, image pan / zoom / rotate and export.
// No framework imports — shared by <MlImageCropper> and the React <ImageCropper>.
//
// Coordinates: "stage" px are CSS px inside the cropper viewport. The image is
// described by a CropView: its centre in stage px, a scale (stage px per image
// px) and a rotation in 90° steps. Crop data is in rotated-image px.

export interface Size {
  width: number
  height: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface CropView {
  /** Image centre, stage px. */
  x: number
  y: number
  /** Stage px per image px. */
  scale: number
  /** Degrees, one of 0 / 90 / 180 / 270. */
  rotate: number
}

export type CropHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
export const CROP_HANDLES: readonly CropHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

/** What was cropped, in px of the (rotated) source image. */
export interface MlCropData {
  x: number
  y: number
  width: number
  height: number
  /** Degrees clockwise: 0 / 90 / 180 / 270. */
  rotate: number
  /** Zoom relative to "whole image fits the viewport" (1). */
  scale: number
}

export interface MlCropOutput {
  /** Exact output size. Give one of width / height to keep the crop's ratio. */
  width?: number
  height?: number
  /** Upper bounds (the crop's own pixel size is the default). */
  maxWidth?: number
  maxHeight?: number
  /** Fill behind the image (e.g. '#fff' for JPEG). */
  background?: string
  /** Clip to an ellipse, leaving transparent corners (PNG / WebP). */
  circle?: boolean
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

export const normRotate = (deg: number) => (((Math.round(deg / 90) * 90) % 360) + 360) % 360

/** Size of the image after rotation (90 / 270 swap the sides). */
export function rotatedSize(natural: Size, rotate: number): Size {
  return normRotate(rotate) % 180 ? { width: natural.height, height: natural.width } : { ...natural }
}

/** The rotated image's bounding rect in stage px. */
export function imageRect(view: CropView, natural: Size): Rect {
  const { width, height } = rotatedSize(natural, view.rotate)
  const w = width * view.scale
  const h = height * view.scale
  return { x: view.x - w / 2, y: view.y - h / 2, width: w, height: h }
}

export function intersect(a: Rect, b: Rect): Rect {
  const x = Math.max(a.x, b.x)
  const y = Math.max(a.y, b.y)
  const r = Math.min(a.x + a.width, b.x + b.width)
  const bt = Math.min(a.y + a.height, b.y + b.height)
  return { x, y, width: Math.max(0, r - x), height: Math.max(0, bt - y) }
}

/** Scale at which the whole (rotated) image fits the stage — zoom 1. */
export function fitScale(stage: Size, natural: Size, rotate: number): number {
  const { width, height } = rotatedSize(natural, rotate)
  if (!width || !height || !stage.width || !stage.height) return 1
  return Math.min(stage.width / width, stage.height / height)
}

/** Smallest scale at which the image still covers the crop box. */
export function coverScale(box: Size, natural: Size, rotate: number): number {
  const { width, height } = rotatedSize(natural, rotate)
  if (!width || !height) return 0
  return Math.max(box.width / width, box.height / height)
}

/** Keep the image covering the crop box: scale up if needed, then nudge it over the box. */
export function clampView(view: CropView, natural: Size, box: Rect): CropView {
  const scale = Math.max(view.scale, coverScale(box, natural, view.rotate))
  const { width, height } = rotatedSize(natural, view.rotate)
  const hw = (width * scale) / 2
  const hh = (height * scale) / 2
  return {
    ...view,
    scale,
    x: clamp(view.x, box.x + box.width - hw, box.x + hw),
    y: clamp(view.y, box.y + box.height - hh, box.y + hh),
  }
}

/** Where the crop box may live: over the image and inside the stage. */
export function boxBounds(view: CropView, natural: Size, stage: Size): Rect {
  return intersect(imageRect(view, natural), { x: 0, y: 0, ...stage })
}

/** Largest box of `aspect` (w / h, or free) filling `area` of `within`, centred on it. */
export function centredBox(within: Rect, aspect: number | undefined, area = 0.8): Rect {
  let width = within.width * area
  let height = within.height * area
  if (aspect && aspect > 0) {
    if (width / height > aspect) width = height * aspect
    else height = width / aspect
  }
  return { x: within.x + (within.width - width) / 2, y: within.y + (within.height - height) / 2, width, height }
}

/** Fresh layout: image fitted and centred, crop box over most of it. */
export function initialLayout(stage: Size, natural: Size, aspect?: number, rotate = 0): { view: CropView; box: Rect } {
  const view: CropView = { x: stage.width / 2, y: stage.height / 2, scale: fitScale(stage, natural, rotate), rotate: normRotate(rotate) }
  return { view, box: centredBox(boxBounds(view, natural, stage), aspect) }
}

/** Slide the box, keeping its size, inside `bounds`. */
export function moveBox(box: Rect, dx: number, dy: number, bounds: Rect): Rect {
  return {
    ...box,
    x: clamp(box.x + dx, bounds.x, bounds.x + bounds.width - box.width),
    y: clamp(box.y + dy, bounds.y, bounds.y + bounds.height - box.height),
  }
}

export interface ResizeOptions {
  bounds: Rect
  /** Width / height; omit for a free box. */
  aspect?: number
  /** Smallest side, stage px. */
  minSize?: number
}

/** Drag a handle by (dx, dy). The opposite edge (or corner) stays put. */
export function resizeBox(box: Rect, handle: CropHandle, dx: number, dy: number, o: ResizeOptions): Rect {
  const { bounds } = o
  const min = o.minSize ?? 24
  const aspect = o.aspect && o.aspect > 0 ? o.aspect : undefined
  const bR = bounds.x + bounds.width
  const bB = bounds.y + bounds.height
  const east = handle.includes('e')
  const west = handle.includes('w')
  const south = handle.includes('s')
  const north = handle.includes('n')
  let l = box.x
  let t = box.y
  let r = box.x + box.width
  let b = box.y + box.height

  if (!aspect) {
    if (west) l = clamp(l + dx, bounds.x, r - min)
    if (east) r = clamp(r + dx, l + min, bR)
    if (north) t = clamp(t + dy, bounds.y, b - min)
    if (south) b = clamp(b + dy, t + min, bB)
    return { x: l, y: t, width: r - l, height: b - t }
  }

  const minW = Math.max(min, min * aspect)
  if ((east || west) && (north || south)) {
    const ax = east ? l : r
    const ay = south ? t : b
    const wantW = box.width + (east ? dx : -dx)
    const wantH = box.height + (south ? dy : -dy)
    const maxW = Math.min(east ? bR - ax : ax - bounds.x, (south ? bB - ay : ay - bounds.y) * aspect)
    const w = clamp((wantW + wantH * aspect) / 2, Math.min(minW, maxW), maxW)
    const h = w / aspect
    return { x: east ? ax : ax - w, y: south ? ay : ay - h, width: w, height: h }
  }
  if (east || west) {
    const ax = east ? l : r
    const cy = t + box.height / 2
    const maxW = Math.min(east ? bR - ax : ax - bounds.x, 2 * Math.min(cy - bounds.y, bB - cy) * aspect)
    const w = clamp(box.width + (east ? dx : -dx), Math.min(minW, maxW), maxW)
    const h = w / aspect
    return { x: east ? ax : ax - w, y: cy - h / 2, width: w, height: h }
  }
  const ay = south ? t : b
  const cx = l + box.width / 2
  const maxH = Math.min(south ? bB - ay : ay - bounds.y, (2 * Math.min(cx - bounds.x, bR - cx)) / aspect)
  const h = clamp(box.height + (south ? dy : -dy), Math.min(minW / aspect, maxH), maxH)
  const w = h * aspect
  return { x: cx - w / 2, y: south ? ay : ay - h, width: w, height: h }
}

/** Force a box to `aspect` around its centre, then back inside `bounds`. */
export function fitBoxToAspect(box: Rect, aspect: number | undefined, bounds: Rect): Rect {
  let { width, height } = box
  if (aspect && aspect > 0) {
    if (width / height > aspect) width = height * aspect
    else height = width / aspect
  }
  const k = Math.min(1, bounds.width / width || 1, bounds.height / height || 1)
  width *= k
  height *= k
  const next = { x: box.x + (box.width - width) / 2, y: box.y + (box.height - height) / 2, width, height }
  return moveBox(next, 0, 0, bounds)
}

/** Zoom to `scale` keeping `anchor` (stage px) still; never below covering the box. */
export function zoomView(view: CropView, natural: Size, box: Rect, scale: number, anchor: { x: number; y: number }, maxScale: number): CropView {
  const min = coverScale(box, natural, view.rotate)
  const s = clamp(scale, min, Math.max(maxScale, min))
  const k = s / view.scale
  return clampView(
    { ...view, scale: s, x: anchor.x - (anchor.x - view.x) * k, y: anchor.y - (anchor.y - view.y) * k },
    natural,
    box,
  )
}

/** Turn the image by 90° steps around the crop box centre. */
export function rotateView(view: CropView, natural: Size, box: Rect, delta: number): CropView {
  const rotate = normRotate(view.rotate + delta)
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  // The image point under the box centre stays under it.
  const ox = view.x - cx
  const oy = view.y - cy
  const turns = normRotate(delta) / 90
  let x = ox
  let y = oy
  for (let i = 0; i < turns; i++) [x, y] = [-y, x]
  return clampView({ ...view, rotate, x: cx + x, y: cy + y }, natural, box)
}

const round = (v: number, d = 0) => {
  const f = 10 ** d
  return Math.round(v * f) / f
}

/** The crop in source px (rotated), plus the zoom relative to fit. */
export function cropData(view: CropView, natural: Size, box: Rect, fit: number): MlCropData {
  const img = imageRect(view, natural)
  const { width: rw, height: rh } = rotatedSize(natural, view.rotate)
  const x = clamp(round((box.x - img.x) / view.scale), 0, rw)
  const y = clamp(round((box.y - img.y) / view.scale), 0, rh)
  return {
    x,
    y,
    width: clamp(round(box.width / view.scale), 1, rw - x),
    height: clamp(round(box.height / view.scale), 1, rh - y),
    rotate: view.rotate,
    scale: round(view.scale / (fit || 1), 3),
  }
}

/** Rebuild a layout that shows `data`, its box centred in the stage (resize, setData). */
export function layoutFromData(stage: Size, natural: Size, data: MlCropData, maxZoom = 10): { view: CropView; box: Rect } {
  const rotate = normRotate(data.rotate)
  const { width: rw, height: rh } = rotatedSize(natural, rotate)
  const fit = fitScale(stage, natural, rotate)
  const cw = clamp(data.width, 1, rw)
  const ch = clamp(data.height, 1, rh)
  let s = fit * clamp(data.scale || 1, 0.01, maxZoom)
  s = Math.min(s, stage.width / cw, stage.height / ch)
  const width = cw * s
  const height = ch * s
  const box = { x: (stage.width - width) / 2, y: (stage.height - height) / 2, width, height }
  const view = clampView(
    { rotate, scale: s, x: box.x - data.x * s + (rw * s) / 2, y: box.y - data.y * s + (rh * s) / 2 },
    natural,
    box,
  )
  return { view, box }
}

/** Pixel size of the exported image. */
export function outputSize(data: Pick<MlCropData, 'width' | 'height'>, o: MlCropOutput = {}): Size {
  let w = data.width
  let h = data.height
  if (o.width && o.height) {
    w = o.width
    h = o.height
  } else if (o.width) {
    h = (h * o.width) / w
    w = o.width
  } else if (o.height) {
    w = (w * o.height) / h
    h = o.height
  }
  if (o.maxWidth && w > o.maxWidth) {
    h = (h * o.maxWidth) / w
    w = o.maxWidth
  }
  if (o.maxHeight && h > o.maxHeight) {
    w = (w * o.maxHeight) / h
    h = o.maxHeight
  }
  return { width: Math.max(1, Math.round(w)), height: Math.max(1, Math.round(h)) }
}

/** Draw the crop of `source` onto a context sized `out`. */
export function drawCrop(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  natural: Size,
  data: MlCropData,
  out: Size,
  o: Pick<MlCropOutput, 'background' | 'circle'> = {},
) {
  ctx.save()
  if (o.circle) {
    ctx.beginPath()
    ctx.ellipse(out.width / 2, out.height / 2, out.width / 2, out.height / 2, 0, 0, Math.PI * 2)
    ctx.clip()
  }
  if (o.background) {
    ctx.fillStyle = o.background
    ctx.fillRect(0, 0, out.width, out.height)
  }
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  const { width: rw, height: rh } = rotatedSize(natural, data.rotate)
  ctx.scale(out.width / data.width, out.height / data.height)
  ctx.translate(-data.x + rw / 2, -data.y + rh / 2)
  ctx.rotate((normRotate(data.rotate) * Math.PI) / 180)
  ctx.drawImage(source, -natural.width / 2, -natural.height / 2, natural.width, natural.height)
  ctx.restore()
}

const px = (v: number) => `${round(v, 2)}px`

/** Inline style that places the <img> in the stage for a view. */
export function imageStyle(view: CropView, natural: Size): Record<string, string> {
  const w = natural.width * view.scale
  const h = natural.height * view.scale
  return {
    width: px(w),
    height: px(h),
    transform: `translate(${px(view.x - w / 2)}, ${px(view.y - h / 2)}) rotate(${view.rotate}deg)`,
  }
}

/** Inline style for the crop box. */
export function boxStyle(box: Rect): Record<string, string> {
  return { left: px(box.x), top: px(box.y), width: px(box.width), height: px(box.height) }
}

/**
 * Styles for a live preview: a `frame` (overflow hidden, position relative)
 * `size` px wide, holding an absolutely positioned <img> styled with `image`.
 */
export function previewStyles(data: MlCropData, natural: Size, size: number): { frame: Record<string, string>; image: Record<string, string> } {
  const k = data.width ? size / data.width : 0
  const { width: rw, height: rh } = rotatedSize(natural, data.rotate)
  const cx = (-data.x + rw / 2) * k
  const cy = (-data.y + rh / 2) * k
  const w = natural.width * k
  const h = natural.height * k
  return {
    frame: { width: px(size), height: px(data.height * k) },
    image: {
      width: px(w),
      height: px(h),
      transform: `translate(${px(cx - w / 2)}, ${px(cy - h / 2)}) rotate(${normRotate(data.rotate)}deg)`,
    },
  }
}
