// Colour conversions for MlColorPicker. Hex strings are #rrggbb or #rrggbbaa.

export interface HSVA {
  h: number // 0–360
  s: number // 0–1
  v: number // 0–1
  a: number // 0–1
}

const clamp = (n: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n))
const hex2 = (n: number) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0')

/** Accepts #rgb, #rgba, #rrggbb, #rrggbbaa (with or without #). */
export function parseHex(input: string | null | undefined): { r: number; g: number; b: number; a: number } | null {
  if (!input) return null
  let hex = input.trim().replace(/^#/, '').toLowerCase()
  if (!/^([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(hex)) return null
  if (hex.length <= 4) hex = [...hex].map((c) => c + c).join('')
  const n = (i: number) => parseInt(hex.slice(i, i + 2), 16)
  return { r: n(0), g: n(2), b: n(4), a: hex.length === 8 ? n(6) / 255 : 1 }
}

export function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const [rr, gg, bb] = [r / 255, g / 255, b / 255]
  const max = Math.max(rr, gg, bb)
  const min = Math.min(rr, gg, bb)
  const d = max - min
  let h = 0
  if (d) {
    if (max === rr) h = ((gg - bb) / d) % 6
    else if (max === gg) h = (bb - rr) / d + 2
    else h = (rr - gg) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return { h, s: max ? d / max : 0, v: max }
}

export function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 }
}

export function hexToHsva(hex: string | null | undefined): HSVA | null {
  const rgb = parseHex(hex)
  if (!rgb) return null
  return { ...rgbToHsv(rgb.r, rgb.g, rgb.b), a: rgb.a }
}

export function hsvaToHex({ h, s, v, a }: HSVA, alpha = false): string {
  const { r, g, b } = hsvToRgb(h % 360, clamp(s), clamp(v))
  const base = `#${hex2(r)}${hex2(g)}${hex2(b)}`
  return alpha && a < 1 ? base + hex2(a * 255) : base
}
