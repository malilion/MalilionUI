// The Malilion paw print, drawn on a 24×24 grid: four toe beans over a main pad.
// Shared by <MlPaw>, the v-paw-stamp directive and anything else that needs
// the shape as real SVG (no data: URIs, so strict CSPs keep working).

export interface PawToe {
  cx: number
  cy: number
  rx: number
  ry: number
  rotate: number
}

export const PAW_TOES: readonly PawToe[] = [
  { cx: 4.6, cy: 10, rx: 2.1, ry: 2.7, rotate: -24 },
  { cx: 9, cy: 5.6, rx: 2.25, ry: 2.95, rotate: -8 },
  { cx: 15, cy: 5.6, rx: 2.25, ry: 2.95, rotate: 8 },
  { cx: 19.4, cy: 10, rx: 2.1, ry: 2.7, rotate: 24 },
]

export const PAW_PAD =
  'M12 11.6c-3.2 0-6.8 3.7-6.8 6.6 0 2 1.5 3.3 3.4 3.3 1.3 0 2.2-.6 3.4-.6s2.1.6 3.4.6c1.9 0 3.4-1.3 3.4-3.3 0-2.9-3.6-6.6-6.8-6.6z'

/** Small glossy highlights, one per pad — what makes the beans look squishy. */
export const PAW_SHINE: readonly PawToe[] = [
  { cx: 4.1, cy: 8.9, rx: 0.6, ry: 0.9, rotate: -24 },
  { cx: 8.4, cy: 4.4, rx: 0.65, ry: 1, rotate: -8 },
  { cx: 14.4, cy: 4.4, rx: 0.65, ry: 1, rotate: 8 },
  { cx: 18.9, cy: 8.9, rx: 0.6, ry: 0.9, rotate: 24 },
  { cx: 9.4, cy: 14.6, rx: 1.3, ry: 0.75, rotate: -30 },
]

const SVG_NS = 'http://www.w3.org/2000/svg'

/** Build a paw <svg> with DOM APIs (no innerHTML, so Trusted Types is happy). */
export function createPawSvg(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('aria-hidden', 'true')
  for (const toe of PAW_TOES) {
    const el = document.createElementNS(SVG_NS, 'ellipse')
    el.setAttribute('cx', String(toe.cx))
    el.setAttribute('cy', String(toe.cy))
    el.setAttribute('rx', String(toe.rx))
    el.setAttribute('ry', String(toe.ry))
    el.setAttribute('transform', `rotate(${toe.rotate} ${toe.cx} ${toe.cy})`)
    svg.appendChild(el)
  }
  const pad = document.createElementNS(SVG_NS, 'path')
  pad.setAttribute('d', PAW_PAD)
  svg.appendChild(pad)
  return svg
}

/** The whole paw (toes + pad) as one path in the 24×24 grid, for SVG charts. */
export function createPawPath(): string {
  const toes = PAW_TOES.map(({ cx, cy, rx, ry, rotate }) => {
    const t = (rotate * Math.PI) / 180
    // Two half-arcs between opposite ends of the rotated major axis.
    const dx = ry * -Math.sin(t)
    const dy = ry * Math.cos(t)
    const a = `${(cx - dx).toFixed(2)} ${(cy - dy).toFixed(2)}`
    const b = `${(cx + dx).toFixed(2)} ${(cy + dy).toFixed(2)}`
    return `M${a}A${rx} ${ry} ${rotate} 1 0 ${b}A${rx} ${ry} ${rotate} 1 0 ${a}Z`
  })
  return toes.join('') + PAW_PAD
}
