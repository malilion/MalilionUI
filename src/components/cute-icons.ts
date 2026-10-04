// Cute icons for MlCuteIcon (Vue) and CuteIcon (React) — framework-free.
// Sticker-style drawings on a 32×32 grid: soft fills, a cocoa outline and,
// for most of them, a little face. Every layer is plain path data plus a
// colour name, so the look (and the mono / line variants) lives in CSS.

/** Colour of a layer; the stylesheet maps each to a `--_<colour>` variable. */
export type CuteColor =
  | 'ink'
  | 'gold'
  | 'orange'
  | 'yellow'
  | 'brown'
  | 'tan'
  | 'cream'
  | 'white'
  | 'gray'
  | 'pink'
  | 'red'
  | 'green'
  | 'mint'
  | 'sky'
  | 'purple'
  | 'pearl'
  | 'steel'
  | 'navy'
  | 'cyan'

/**
 * How a layer is painted:
 * `fill` filled and outlined · `flat` filled, no outline · `line` outline only ·
 * `eye` / `shine` blink with the eyes · `blush` cheeks (hidden in mono / line) ·
 * `hole` filled even–odd, outlined.
 */
export type CuteLayerKind = 'fill' | 'flat' | 'line' | 'eye' | 'shine' | 'blush' | 'hole'

export interface CuteLayer {
  color: CuteColor
  kind: CuteLayerKind
  d: string
}

/* ── Shape helpers (all numbers rounded to 0.01) ─────────── */
const n = (v: number) => +v.toFixed(2)

const circle = (cx: number, cy: number, r: number) =>
  `M${n(cx - r)} ${n(cy)}a${n(r)} ${n(r)} 0 1 0 ${n(2 * r)} 0a${n(r)} ${n(r)} 0 1 0 ${n(-2 * r)} 0z`

const ellipse = (cx: number, cy: number, rx: number, ry: number) =>
  `M${n(cx - rx)} ${n(cy)}a${n(rx)} ${n(ry)} 0 1 0 ${n(2 * rx)} 0a${n(rx)} ${n(ry)} 0 1 0 ${n(-2 * rx)} 0z`

const rrect = (x: number, y: number, w: number, h: number, r: number) =>
  `M${n(x + r)} ${n(y)}h${n(w - 2 * r)}a${n(r)} ${n(r)} 0 0 1 ${n(r)} ${n(r)}v${n(h - 2 * r)}a${n(r)} ${n(r)} 0 0 1 ${n(-r)} ${n(r)}h${n(2 * r - w)}a${n(r)} ${n(r)} 0 0 1 ${n(-r)} ${n(-r)}v${n(2 * r - h)}a${n(r)} ${n(r)} 0 0 1 ${n(r)} ${n(-r)}z`

/** A round shape with `count` bumps around it — manes, icing, flowers. */
function scallop(cx: number, cy: number, r: number, count: number, bump: number, turn = 0) {
  const pts = Array.from({ length: count }, (_, i) => {
    const a = turn + (i / count) * Math.PI * 2
    return [cx + r * Math.sin(a), cy - r * Math.cos(a)]
  })
  const chord = 2 * r * Math.sin(Math.PI / count)
  const arc = n((chord / 2) * bump)
  return `M${n(pts[0][0])} ${n(pts[0][1])}${pts
    .map((_, i) => {
      const [x, y] = pts[(i + 1) % count]
      return `A${arc} ${arc} 0 0 1 ${n(x)} ${n(y)}`
    })
    .join('')}z`
}

/** A star with rounded joins (the outline does the rounding). */
function star(cx: number, cy: number, outer: number, inner: number, points = 5) {
  const out: string[] = []
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner : outer
    const a = (i / (points * 2)) * Math.PI * 2
    out.push(`${n(cx + r * Math.sin(a))} ${n(cy - r * Math.cos(a))}`)
  }
  return `M${out.join('L')}z`
}

const L = (color: CuteColor, d: string, kind: CuteLayerKind = 'fill'): CuteLayer => ({ color, kind, d })

type Mouth = 'smile' | 'cat' | 'open' | 'o' | 'none'

interface FaceOptions {
  /** Distance between the eyes. */
  gap?: number
  mouth?: Mouth
  blush?: boolean
  /** Scales eyes, mouth and cheeks. */
  scale?: number
  /** Closed, happy eyes (^ ^) instead of dots. */
  happy?: boolean
  /** Colour of the eyes and mouth — `cyan` for faces on a screen. */
  ink?: CuteColor
}

/** Two shiny eyes, a mouth and pink cheeks centred on (cx, cy). */
function face(cx: number, cy: number, { gap = 7, mouth = 'smile', blush = true, scale = 1, happy = false, ink = 'ink' }: FaceOptions = {}): CuteLayer[] {
  const s = scale
  const out: CuteLayer[] = []
  for (const x of [cx - gap / 2, cx + gap / 2]) {
    if (happy) out.push(L(ink, `M${n(x - 1.3 * s)} ${n(cy + 0.5 * s)}q${n(1.3 * s)} ${n(-2 * s)} ${n(2.6 * s)} 0`, 'line'))
    else {
      out.push(L(ink, ellipse(x, cy, 1.15 * s, 1.45 * s), 'eye'))
      out.push(L('white', circle(x + 0.4 * s, cy - 0.55 * s, 0.45 * s), 'shine'))
    }
  }
  const my = cy + 1.7 * s
  if (mouth === 'smile') out.push(L(ink, `M${n(cx - 1.2 * s)} ${n(my)}q${n(1.2 * s)} ${n(1.2 * s)} ${n(2.4 * s)} 0`, 'line'))
  else if (mouth === 'cat') out.push(L(ink, `M${n(cx - 1.6 * s)} ${n(my)}q${n(0.8 * s)} ${n(1 * s)} ${n(1.6 * s)} 0q${n(0.8 * s)} ${n(1 * s)} ${n(1.6 * s)} 0`, 'line'))
  else if (mouth === 'open') out.push(L('red', `M${n(cx - 1.4 * s)} ${n(my - 0.2 * s)}h${n(2.8 * s)}q0 ${n(2 * s)} ${n(-1.4 * s)} ${n(2 * s)}q${n(-1.4 * s)} 0 ${n(-1.4 * s)} ${n(-2 * s)}z`))
  else if (mouth === 'o') out.push(L(ink, ellipse(cx, my + 0.4 * s, 0.75 * s, 0.9 * s), 'flat'))
  if (blush)
    for (const x of [cx - gap / 2 - 1.9 * s, cx + gap / 2 + 1.9 * s]) out.push(L('pink', ellipse(x, cy + 1.7 * s, 1.5 * s, 0.9 * s), 'blush'))
  return out
}

/* ── The icons ──────────────────────────────────────────── */
export const cuteIcons = {
  /* Animals */
  lion: [
    L('orange', scallop(16, 16.5, 12.2, 11, 1.25)),
    L('gold', circle(9.6, 9.8, 2.5)),
    L('gold', circle(22.4, 9.8, 2.5)),
    L('pink', circle(9.6, 9.8, 1.1), 'flat'),
    L('pink', circle(22.4, 9.8, 1.1), 'flat'),
    L('gold', ellipse(16, 17, 8.4, 7.9)),
    L('cream', ellipse(16, 20.4, 3.4, 2.4), 'flat'),
    ...face(16, 15.6, { gap: 6.8, mouth: 'none' }),
    L('ink', 'M14.9 18.9h2.2q0 1.1-1.1 1.4q-1.1-.3-1.1-1.4z', 'flat'),
    L('ink', 'M14.5 20.6q.75.8 1.5 0q.75.8 1.5 0', 'line'),
  ],
  cat: [
    L('gray', 'M6.6 14L7.6 4.8Q8 3.9 8.8 4.5L14.2 9.6z'),
    L('gray', 'M25.4 14L24.4 4.8Q24 3.9 23.2 4.5L17.8 9.6z'),
    L('pink', 'M8.6 11.5l.6-4.6l3 3z', 'flat'),
    L('pink', 'M23.4 11.5l-.6-4.6l-3 3z', 'flat'),
    L('gray', ellipse(16, 18.2, 11, 9.2)),
    ...face(16, 17.6, { gap: 7.4, mouth: 'cat' }),
    L('ink', 'M2.8 17.6l4.4.8M2.8 21.2l4.4-.8M29.2 17.6l-4.4.8M29.2 21.2l-4.4-.8', 'line'),
  ],
  dog: [
    L('brown', 'M8.6 7.6C3.6 7.4 2.4 15.2 4.6 19.4C6.6 21.2 9.2 17 10 12.4z'),
    L('brown', 'M23.4 7.6C28.4 7.4 29.6 15.2 27.4 19.4C25.4 21.2 22.8 17 22 12.4z'),
    L('cream', circle(16, 17.4, 9.6)),
    L('tan', ellipse(16, 21.2, 4.4, 3.4), 'flat'),
    ...face(16, 15.6, { gap: 7, mouth: 'none' }),
    L('ink', ellipse(16, 19.9, 1.7, 1.15), 'flat'),
    L('ink', 'M16 21v.8M14.4 21.8q1.6 1.4 3.2 0', 'line'),
  ],
  bear: [
    L('brown', circle(8, 9.2, 3.7)),
    L('brown', circle(24, 9.2, 3.7)),
    L('tan', circle(8, 9.2, 1.7), 'flat'),
    L('tan', circle(24, 9.2, 1.7), 'flat'),
    L('brown', ellipse(16, 17.6, 11.2, 10.2)),
    L('tan', ellipse(16, 21.2, 4.4, 3.3)),
    ...face(16, 15.6, { gap: 8.6, mouth: 'none' }),
    L('ink', ellipse(16, 19.8, 1.6, 1.05), 'flat'),
    L('ink', 'M16 20.8v.9M14.6 22.1q1.4 1 1.4-.4q0 1.4 1.4.4', 'line'),
  ],
  bunny: [
    L('white', rrect(9.2, 1.6, 5, 14, 2.5)),
    L('white', rrect(17.8, 1.6, 5, 14, 2.5)),
    L('pink', rrect(10.7, 3.6, 2, 9.6, 1), 'flat'),
    L('pink', rrect(19.3, 3.6, 2, 9.6, 1), 'flat'),
    L('white', ellipse(16, 20.2, 10.4, 8.6)),
    ...face(16, 19.4, { gap: 7.4, mouth: 'cat' }),
  ],
  chick: [
    L('ink', 'M14.6 7.2q.4-3.4 2-2.4M16.4 7.2q1.4-3 2.8-1.4', 'line'),
    L('yellow', circle(16, 18, 11)),
    L('yellow', 'M5.6 19.4q-3.2 1.4-2.6 4.2q2.4 .4 4.2-1.6', 'fill'),
    L('yellow', 'M26.4 19.4q3.2 1.4 2.6 4.2q-2.4 .4-4.2-1.6', 'fill'),
    ...face(16, 15.8, { gap: 8, mouth: 'none' }),
    L('orange', 'M13.8 18.4l2.2-1.3l2.2 1.3l-2.2 1.6z'),
  ],
  panda: [
    L('ink', circle(8.4, 9, 3.6), 'flat'),
    L('ink', circle(23.6, 9, 3.6), 'flat'),
    L('white', ellipse(16, 17.6, 11.6, 10.2)),
    L('ink', 'M9.2 16.4c-.2-2.6 2.4-4.2 4-2.8c1.4 1.2.6 4.6-1.6 5.4c-1.6.4-2.3-1-2.4-2.6z', 'flat'),
    L('ink', 'M22.8 16.4c.2-2.6-2.4-4.2-4-2.8c-1.4 1.2-.6 4.6 1.6 5.4c1.6.4 2.3-1 2.4-2.6z', 'flat'),
    L('white', circle(11.9, 15.8, 1.05), 'eye'),
    L('white', circle(20.1, 15.8, 1.05), 'eye'),
    L('ink', ellipse(16, 20, 1.5, 1), 'flat'),
    L('ink', 'M14.6 21.6q1.4 1.2 2.8 0', 'line'),
    L('pink', ellipse(8.6, 21, 1.5, 0.9), 'blush'),
    L('pink', ellipse(23.4, 21, 1.5, 0.9), 'blush'),
  ],
  frog: [
    L('green', ellipse(16, 19.4, 12.6, 8.8)),
    L('green', circle(9.8, 11, 4.4)),
    L('green', circle(22.2, 11, 4.4)),
    L('white', circle(9.8, 11, 2.7), 'flat'),
    L('white', circle(22.2, 11, 2.7), 'flat'),
    L('ink', circle(10.2, 11.2, 1.35), 'eye'),
    L('ink', circle(21.8, 11.2, 1.35), 'eye'),
    L('ink', 'M10.6 20.2q5.4 4.4 10.8 0', 'line'),
    L('pink', ellipse(7.4, 21, 1.7, 1), 'blush'),
    L('pink', ellipse(24.6, 21, 1.7, 1), 'blush'),
  ],

  /* Food */
  bubbleTea: [
    L('pink', 'M15.8 9.6L19.4 1.6l2.4 1.1L18.6 10z'),
    L('tan', 'M7.6 11h16.8l-1.9 16.1q-.3 2-2.2 2h-8.6q-1.9 0-2.2-2z'),
    L('pearl', circle(11.8, 25.4, 1.25), 'flat'),
    L('pearl', circle(14.8, 26.2, 1.25), 'flat'),
    L('pearl', circle(17.6, 25.2, 1.25), 'flat'),
    L('pearl', circle(20.3, 26, 1.2), 'flat'),
    L('pearl', circle(13.2, 23.2, 1.2), 'flat'),
    L('pearl', circle(18.9, 23, 1.2), 'flat'),
    L('white', rrect(6, 8.4, 20, 3.4, 1.7)),
    ...face(16, 16.4, { gap: 6.6 }),
  ],
  coffee: [
    L('ink', 'M10.6 8.2q-1.4-1.6 0-3.2q1.4-1.4 0-3M15.6 8.2q-1.4-1.6 0-3.2q1.4-1.4 0-3', 'line'),
    L('white', 'M21 12.6h3a4.8 4.8 0 0 1 0 9.6h-3zM21 15.2h2.8a2.2 2.2 0 0 1 0 4.4H21z', 'hole'),
    L('white', rrect(5, 10.6, 18, 17.4, 3.6)),
    L('brown', rrect(7.2, 12.2, 13.6, 2.2, 1.1), 'flat'),
    ...face(14, 19.8, { gap: 6.6 }),
  ],
  donut: [
    L('tan', `${circle(16, 16.6, 12.2)}${circle(16, 16.6, 3.6)}`, 'hole'),
    L('pink', `${scallop(16, 16, 10.2, 12, 1.15, 0.1)}${circle(16, 16, 4.4)}`, 'hole'),
    L('yellow', 'M10.2 10.4l1.4-1', 'line'),
    L('sky', 'M20.4 8.6l1.6.6', 'line'),
    L('white', 'M23.8 14.2l.2 1.6', 'line'),
    L('sky', 'M8 15.6l.4-1.6', 'line'),
    L('yellow', 'M15.2 7.6h1.6', 'line'),
    ...face(16, 23, { gap: 6, scale: 0.85 }),
  ],
  cupcake: [
    L('ink', 'M16 6.2q.8-2.6 2.8-3.4', 'line'),
    L('red', circle(15.8, 7.4, 2.4)),
    L('sky', 'M7.8 17.4h16.4l-2.2 10.8q-.2 1-1.2 1h-9.6q-1 0-1.2-1z'),
    L('ink', 'M12 18.4l.8 9.6M16 18.4v9.6M20 18.4l-.8 9.6', 'line'),
    L('pink', 'M7.4 18.6c-2.4 0-2.6-4.2.2-4.8c-.4-3.2 3-4.8 5.4-3.2c1-3 6.4-3.2 7.4 0c2.4-1.6 5.8 0 5.4 3.2c2.8.6 2.6 4.8.2 4.8z'),
    L('white', 'M10.2 13.2q.4-1.4 1.8-1.6', 'line'),
    ...face(16, 21.4, { gap: 6, scale: 0.8, blush: false }),
  ],
  iceCream: [
    L('tan', 'M9.8 16.6h12.4l-5.2 12.4q-1 1.6-2 0z'),
    L('brown', 'M12.4 19.4l7 4.4M15 17.6l5.6 3.4M19.6 19.4l-7 4.4M17 17.6l-5.6 3.4', 'line'),
    L('mint', 'M8.4 16.4a7.6 7.6 0 1 1 15.2 0q0 1.8-1.8 1.8q-1 2.6-2.6 0h-1.6q-1.4 2-2.8 0h-4.6q-1.8 0-1.8-1.8z'),
    L('red', circle(16, 7.6, 2)),
    ...face(16, 12.6, { gap: 6.4, scale: 0.9 }),
  ],
  strawberry: [
    L('red', 'M16 29C9 26.4 5.4 20.4 6.4 15.6C7.4 11 12 10.2 16 11.8C20 10.2 24.6 11 25.6 15.6C26.6 20.4 23 26.4 16 29z'),
    L('yellow', `${ellipse(10.6, 16.4, 0.45, 0.7)}${ellipse(21.4, 16.4, 0.45, 0.7)}${ellipse(12.6, 24, 0.45, 0.7)}${ellipse(19.4, 24, 0.45, 0.7)}${ellipse(16, 26.4, 0.45, 0.7)}${ellipse(9.4, 20.4, 0.45, 0.7)}${ellipse(22.6, 20.4, 0.45, 0.7)}`, 'flat'),
    L('green', 'M16 13.2l-5-1.2l2.8-2.2l-1.8-3.4l4 1.6l4-1.6l-1.8 3.4l2.8 2.2z'),
    ...face(16, 18.6, { gap: 6.6 }),
  ],

  /* Nature & weather */
  sun: [
    L('orange', 'M16 2.4v2.8M16 26.8v2.8M2.4 16h2.8M26.8 16h2.8M6.4 6.4l2 2M23.6 23.6l2 2M6.4 25.6l2-2M23.6 8.4l2-2', 'line'),
    L('yellow', circle(16, 16, 8.4)),
    ...face(16, 15.4, { gap: 6.4 }),
  ],
  moon: [
    L('yellow', 'M19.6 4.2A12.4 12.4 0 1 0 27.8 22.6A9.6 9.6 0 0 1 19.6 4.2z'),
    ...face(12.6, 18.2, { gap: 5.6, happy: true, scale: 0.9 }),
    L('yellow', star(25.2, 7.6, 3, 1.3), 'fill'),
  ],
  cloud: [
    L('white', 'M9.4 25.4a5.6 5.6 0 0 1-.6-11.2a7.6 7.6 0 0 1 14.6-1.2a6.2 6.2 0 0 1 .2 12.4z'),
    ...face(16, 18.4, { gap: 7 }),
  ],
  rain: [
    L('sky', 'M10.4 22.8q-2.2 3-.9 4.4q.9.8 1.8 0q1.3-1.4-.9-4.4zM16 24.2q-2.2 3-.9 4.4q.9.8 1.8 0q1.3-1.4-.9-4.4zM21.6 22.8q-2.2 3-.9 4.4q.9.8 1.8 0q1.3-1.4-.9-4.4z'),
    L('white', 'M9.4 21.2a5.4 5.4 0 0 1-.6-10.8a7.4 7.4 0 0 1 14.2-1.2a6 6 0 0 1 .2 12z'),
    ...face(16, 14.6, { gap: 6.8, mouth: 'o' }),
  ],
  star: [
    L('yellow', star(16, 17, 13.4, 6.6)),
    ...face(16, 17.6, { gap: 6, scale: 0.9 }),
  ],
  rainbow: [
    L('red', 'M3.4 23a12.6 12.6 0 0 1 25.2 0h-3.4a9.2 9.2 0 0 0-18.4 0z'),
    L('yellow', 'M6.8 23a9.2 9.2 0 0 1 18.4 0h-3.2a6 6 0 0 0-12 0z'),
    L('sky', 'M10 23a6 6 0 0 1 12 0h-3a3 3 0 0 0-6 0z'),
    L('white', 'M2.6 27.4a2.6 2.6 0 0 1 .8-4.8a3.2 3.2 0 0 1 6-.2a2.6 2.6 0 0 1 1 5z'),
    L('white', 'M21.6 27.4a2.6 2.6 0 0 1 .8-4.8a3.2 3.2 0 0 1 6-.2a2.6 2.6 0 0 1 1 5z'),
  ],
  flower: [
    L('green', 'M16 19.6V29.4', 'line'),
    L('green', 'M16 26.4c-1-3.4-4.6-4.6-7.4-3.6c1.2 3.2 4.4 4.6 7.4 3.6z'),
    ...[0, 1, 2, 3, 4].map((i) => L('pink', circle(16 + 5.2 * Math.sin((i * 2 * Math.PI) / 5), 12.4 - 5.2 * Math.cos((i * 2 * Math.PI) / 5), 3.5))),
    L('yellow', circle(16, 12.4, 4.2)),
    ...face(16, 12, { gap: 3.8, scale: 0.62, blush: false }),
  ],
  sprout: [
    L('green', 'M16 18.4V11.4', 'line'),
    L('green', 'M16 12.4C15.6 7.6 11.4 5 6.6 5.8C6.8 10.6 11 13.2 16 12.4z'),
    L('green', 'M16 11C16.6 6.6 20.2 4 25 4.6C24.8 9 21 11.6 16 11z'),
    L('orange', 'M6.4 17.6h19.2l-2 10q-.3 1.4-1.7 1.4h-11.8q-1.4 0-1.7-1.4z'),
    L('orange', rrect(5, 15.6, 22, 3.6, 1.2)),
    ...face(16, 23, { gap: 6.6 }),
  ],

  /* Things */
  heart: [
    L('pink', 'M16 27.8C8 22.4 3.4 17.6 3.4 12.2a6.2 6.2 0 0 1 12.6-3a6.2 6.2 0 0 1 12.6 3c0 5.4-4.6 10.2-12.6 15.6z'),
    L('white', ellipse(8.6, 10.6, 1.5, 2.2), 'flat'),
    ...face(16, 15.8, { gap: 7 }),
  ],
  paw: [
    L('gold', ellipse(7.6, 13.2, 2.9, 3.5)),
    L('gold', ellipse(12.4, 7.6, 3.1, 3.8)),
    L('gold', ellipse(19.6, 7.6, 3.1, 3.8)),
    L('gold', ellipse(24.4, 13.2, 2.9, 3.5)),
    L('gold', 'M16 14.6c4.6 0 8.8 4.2 8.8 8.4c0 3.8-3.8 4.8-8.8 3.4c-5 1.4-8.8.4-8.8-3.4c0-4.2 4.2-8.4 8.8-8.4z'),
    L('pink', `${ellipse(7.6, 13.8, 1.3, 1.6)}${ellipse(12.4, 8.2, 1.4, 1.8)}${ellipse(19.6, 8.2, 1.4, 1.8)}${ellipse(24.4, 13.8, 1.3, 1.6)}`, 'flat'),
    L('pink', 'M16 18.4c2.8 0 5 2.4 5 4.6c0 2-2.2 2.4-5 1.6c-2.8.8-5 .4-5-1.6c0-2.2 2.2-4.6 5-4.6z', 'flat'),
  ],
  gift: [
    L('yellow', 'M16 10.4c-1.8-4.4-7.4-5.6-7.6-2.2c-.2 2.4 4.4 2.6 7.6 2.2z'),
    L('yellow', 'M16 10.4c1.8-4.4 7.4-5.6 7.6-2.2c.2 2.4-4.4 2.6-7.6 2.2z'),
    L('pink', rrect(6, 14.4, 20, 14, 2)),
    L('pink', rrect(4.4, 10.4, 23.2, 5, 1.6)),
    L('yellow', 'M14.4 10.6h3.2v17.6h-3.2z', 'flat'),
    L('ink', 'M14.4 10.6v17.6M17.6 10.6v17.6', 'line'),
    ...face(16, 20.4, { gap: 9.2, mouth: 'none' }),
    L('ink', 'M14.9 23.2q1.1 1 2.2 0', 'line'),
  ],
  rocket: [
    L('orange', 'M12.8 22.2h6.4l-1 3.6q-2.2 5-4.4 0z'),
    L('yellow', 'M14.4 22.6h3.2l-.6 2.2q-1 2.4-2 0z', 'flat'),
    L('red', 'M10.4 14.4l-4.6 5.4v4.6l4.6-2.4z'),
    L('red', 'M21.6 14.4l4.6 5.4v4.6l-4.6-2.4z'),
    L('white', 'M16 2.6c5.4 3.8 7 9.6 6.4 19.8H9.6C9 12.2 10.6 6.4 16 2.6z'),
    L('sky', circle(16, 11.4, 3.4)),
    L('white', circle(17.1, 10.3, 0.9), 'flat'),
    ...face(16, 17.6, { gap: 4.8, scale: 0.75, blush: false }),
  ],
  bell: [
    L('orange', circle(16, 25.6, 2.4)),
    L('yellow', 'M16 4.6c-5.2 0-8.2 4.2-8.2 9.2v5l-2.6 3.8h21.6l-2.6-3.8v-5c0-5-3-9.2-8.2-9.2z'),
    L('yellow', circle(16, 4.2, 1.6)),
    L('white', 'M11 12.4q.4-3 2.8-4', 'line'),
    ...face(16, 15.4, { gap: 6.4 }),
  ],
  mail: [
    L('white', rrect(3.6, 7.6, 24.8, 17.6, 2.6)),
    L('ink', 'M4.6 9.2L16 18.2L27.4 9.2', 'line'),
    L('pink', 'M16 23.8c-2.6-1.6-4-3.2-4-4.6a2 2 0 0 1 4-.6a2 2 0 0 1 4 .6c0 1.4-1.4 3-4 4.6z'),
  ],
  chat: [
    L('sky', 'M7 5h18a3.6 3.6 0 0 1 3.6 3.6v11a3.6 3.6 0 0 1-3.6 3.6h-10.4l-5.6 5v-5H7a3.6 3.6 0 0 1-3.6-3.6v-11A3.6 3.6 0 0 1 7 5z'),
    ...face(16, 13.4, { gap: 7 }),
  ],
  camera: [
    L('gray', 'M10.4 10l1.8-3.4h7.6l1.8 3.4z'),
    L('pink', rrect(3.6, 9.6, 24.8, 17.4, 3.4)),
    L('gray', circle(16, 18.2, 6.4)),
    L('sky', circle(16, 18.2, 3.8)),
    L('white', circle(17.4, 16.8, 1.2), 'flat'),
    L('yellow', rrect(22.4, 12, 3.4, 2.4, 1)),
    L('pink', ellipse(7.6, 14.6, 1.5, 0.9), 'blush'),
  ],
  music: [
    L('ink', 'M12.8 23.4V9.6M25.4 19.8V6.4', 'line'),
    L('purple', 'M12.6 8.6l13-3.4v4.4l-13 3.4z'),
    L('purple', ellipse(9.4, 24, 3.6, 2.9)),
    L('purple', ellipse(22.4, 20.4, 3.6, 2.9)),
    L('ink', `${ellipse(8.2, 23.8, 0.6, 0.75)}${ellipse(10.6, 23.8, 0.6, 0.75)}${ellipse(21.2, 20.2, 0.6, 0.75)}${ellipse(23.6, 20.2, 0.6, 0.75)}`, 'eye'),
  ],
  game: [
    L('purple', 'M9.2 8.8h13.6c4.2 0 6.8 4 7.2 9c.4 5.2-1 8.6-3.6 8.6c-2 0-3.6-2.6-5-4.6H10.6c-1.4 2-3 4.6-5 4.6C3 26.4 1.6 23 2 17.8c.4-5 3-9 7.2-9z'),
    L('ink', 'M8.6 13.6h2v2.2h2.2v2h-2.2V20h-2v-2.2H6.4v-2h2.2z', 'flat'),
    L('pink', circle(22.2, 14.6, 1.5)),
    L('yellow', circle(25, 17.6, 1.5)),
    L('ink', 'M14.6 16.4q1.4 1.2 2.8 0', 'line'),
  ],
  trophy: [
    L('gold', 'M9.6 6.2H6.8a4.1 4.1 0 0 0 0 8.2h3.6V12H6.9a1.7 1.7 0 0 1 0-3.4h2.7z'),
    L('gold', 'M22.4 6.2h2.8a4.1 4.1 0 0 1 0 8.2h-3.6V12h3.5a1.7 1.7 0 0 0 0-3.4h-2.7z'),
    L('gold', rrect(14.4, 17.6, 3.2, 4.4, 0.6)),
    L('brown', rrect(9.4, 21.6, 13.2, 6.8, 1.6)),
    L('gold', 'M8.8 4.4h14.4v6.4a7.2 7.2 0 0 1-14.4 0z'),
    L('yellow', rrect(13, 24, 6, 2, 1), 'flat'),
    ...face(16, 10.4, { gap: 5.6, scale: 0.85 }),
  ],
  crown: [
    L('gold', 'M4.6 11.6l5.4 5.2l6-8.4l6 8.4l5.4-5.2l-2.2 14.2H6.8z'),
    L('pink', circle(4.6, 10.6, 1.9)),
    L('sky', circle(16, 7.4, 1.9)),
    L('pink', circle(27.4, 10.6, 1.9)),
    ...face(16, 19.4, { gap: 6.6 }),
  ],
  bulb: [
    L('gray', rrect(11.8, 22.6, 8.4, 6, 2)),
    L('ink', 'M12.2 25.2h7.6', 'line'),
    L('yellow', 'M16 3.2a9.2 9.2 0 0 1 5.6 16.5c-1 .9-1.4 1.8-1.4 3.1h-8.4c0-1.3-.4-2.2-1.4-3.1A9.2 9.2 0 0 1 16 3.2z'),
    L('white', 'M10.6 11q.6-3.2 3.6-4.2', 'line'),
    ...face(16, 12.6, { gap: 6.4 }),
  ],
  home: [
    L('red', rrect(20.2, 4.4, 3.6, 7, 0.8)),
    L('cream', 'M6.8 14.2L16 6.6l9.2 7.6v13a1.8 1.8 0 0 1-1.8 1.8H8.6a1.8 1.8 0 0 1-1.8-1.8z'),
    L('red', 'M2.6 15.4L16 4.2l13.4 11.2l-2 2.4L16 8.2L4.6 17.8z'),
    L('brown', 'M13.4 29v-5.8a2.6 2.6 0 0 1 5.2 0V29z'),
    ...face(16, 15.6, { gap: 6.4, scale: 0.9 }),
  ],
  ghost: [
    L('white', 'M6.6 27.6V14.6a9.4 9.4 0 0 1 18.8 0v13l-3.1-2.3l-3.1 2.3l-3.2-2.3l-3.2 2.3l-3.1-2.3z'),
    ...face(16, 15.4, { gap: 6.8, mouth: 'o' }),
  ],

  /* Tech — the lion's workshop */
  cyberLion: [
    L('steel', scallop(16, 16.5, 12.2, 11, 1.25)),
    L('gold', circle(9.6, 9.8, 2.5)),
    L('gold', circle(22.4, 9.8, 2.5)),
    L('gold', ellipse(16, 17, 8.4, 7.9)),
    L('navy', rrect(8.6, 12.6, 14.8, 5, 2.5)),
    L('cyan', rrect(10.6, 14.2, 3.6, 1.8, 0.9), 'eye'),
    L('cyan', rrect(17.8, 14.2, 3.6, 1.8, 0.9), 'eye'),
    L('cream', ellipse(16, 21, 3.4, 2.3), 'flat'),
    L('ink', 'M14.9 19.4h2.2q0 1.1-1.1 1.4q-1.1-.3-1.1-1.4z', 'flat'),
    L('ink', 'M14.5 21.2q.75.8 1.5 0q.75.8 1.5 0', 'line'),
    L('pink', ellipse(10.4, 20, 1.4, 0.85), 'blush'),
    L('pink', ellipse(21.6, 20, 1.4, 0.85), 'blush'),
  ],
  robot: [
    L('ink', 'M16 6.4V3.6', 'line'),
    L('cyan', circle(16, 3, 1.6)),
    L('gray', rrect(3.2, 11, 3.2, 6.4, 1.4)),
    L('gray', rrect(25.6, 11, 3.2, 6.4, 1.4)),
    L('steel', rrect(10, 21.4, 12, 7.6, 2.8)),
    L('gold', circle(16, 25.2, 1.6)),
    L('steel', rrect(5.8, 6.4, 20.4, 15.2, 4.6)),
    L('navy', rrect(8.6, 9.2, 14.8, 9.6, 3.4)),
    ...face(16, 13.4, { gap: 6, ink: 'cyan', blush: false }),
    L('pink', ellipse(7.9, 19.8, 1.2, 0.75), 'blush'),
    L('pink', ellipse(24.1, 19.8, 1.2, 0.75), 'blush'),
  ],
  chip: [
    L('gold', 'M11.5 4.5v3.6M16 4.5v3.6M20.5 4.5v3.6M11.5 23.9v3.6M16 23.9v3.6M20.5 23.9v3.6M4.5 11.5h3.6M4.5 16h3.6M4.5 20.5h3.6M23.9 11.5h3.6M23.9 16h3.6M23.9 20.5h3.6', 'line'),
    L('navy', rrect(7.6, 7.6, 16.8, 16.8, 3.4)),
    L('gold', rrect(10.8, 10.8, 10.4, 10.4, 2.2)),
    ...face(16, 15.4, { gap: 4.6, scale: 0.75, blush: false }),
  ],
  laptop: [
    L('steel', rrect(6, 5.6, 20, 15.2, 2.6)),
    L('navy', rrect(8.2, 7.8, 15.6, 10.8, 1.6), 'flat'),
    ...face(16, 12.4, { gap: 5.6, ink: 'cyan', blush: false, scale: 0.9 }),
    L('gray', 'M2.8 21.2h26.4l-1.6 4.4q-.4 1-1.4 1H5.8q-1 0-1.4-1z'),
    L('ink', 'M13.6 23.6h4.8', 'line'),
  ],
  terminal: [
    L('navy', rrect(3.6, 5.6, 24.8, 20.8, 3.4)),
    L('ink', 'M3.8 10.6h24.4', 'line'),
    L('red', circle(7.4, 8.2, 1), 'flat'),
    L('yellow', circle(10.6, 8.2, 1), 'flat'),
    L('green', circle(13.8, 8.2, 1), 'flat'),
    L('cyan', 'M8.6 14.8l3.4 2.8l-3.4 2.8', 'line'),
    L('cyan', 'M14.4 21.6h5.4', 'line'),
  ],
  bolt: [
    L('gold', 'M18.6 2.6L6.8 18h7.4l-2.6 11.4L25.2 13h-7.6z'),
    ...face(15.6, 15.4, { gap: 4.4, scale: 0.75, blush: false }),
  ],
  shield: [
    L('steel', 'M16 3.2l10.4 3.8v7.4c0 7-4.4 11.8-10.4 14.4C10 26.2 5.6 21.4 5.6 14.4V7z'),
    L('cyan', 'M16 6.6l7.4 2.7v5.2c0 5.2-3.2 8.8-7.4 10.8c-4.2-2-7.4-5.6-7.4-10.8V9.3z', 'flat'),
    ...face(16, 14.6, { gap: 5.6, scale: 0.9 }),
  ],
  gear: [
    L('steel', star(16, 16, 13.4, 10.6, 8)),
    L('gray', circle(16, 16, 7.6)),
    ...face(16, 15.6, { gap: 5.2, scale: 0.85 }),
  ],
  key: [
    L('gold', 'M16.2 11.2h12.2v3.6h-2.2v3.4h-3.2v-3.4h-6.8z'),
    L('gold', circle(10.6, 13, 7.4)),
    ...face(10.6, 12.4, { gap: 5.2, scale: 0.85 }),
  ],
  lock: [
    L('steel', 'M9.8 14.4v-3.8a6.2 6.2 0 0 1 12.4 0v3.8h-3.2v-3.8a3 3 0 0 0-6 0v3.8z'),
    L('gold', rrect(6, 13.6, 20, 15, 3.6)),
    ...face(16, 19.6, { gap: 6.6 }),
    L('ink', 'M16 23.6v1.6', 'line'),
  ],
  database: [
    L('cyan', 'M6 8.4v15.2c0 2.4 4.5 4.4 10 4.4s10-2 10-4.4V8.4z'),
    L('mint', ellipse(16, 8.4, 10, 4)),
    L('ink', 'M6 19.4c0 2.4 4.5 4.4 10 4.4s10-2 10-4.4', 'line'),
    ...face(16, 14.4, { gap: 6.4, scale: 0.9 }),
  ],
  bug: [
    L('ink', 'M14 5.4l-2-2.8M18 5.4l2-2.8M8.6 15.4l-4-1.8M8 19.6H3.6M8.6 23.8l-4 1.8M23.4 15.4l4-1.8M24 19.6h4.4M23.4 23.8l4 1.8', 'line'),
    L('green', ellipse(16, 19.4, 8.2, 9)),
    L('ink', 'M16 14.6V28', 'line'),
    L('green', circle(16, 10, 5.2)),
    ...face(16, 9.8, { gap: 4.4, scale: 0.75, blush: false }),
    L('yellow', `${circle(12.4, 19.4, 1.3)}${circle(19.6, 19.4, 1.3)}${circle(13, 24, 1)}${circle(19, 24, 1)}`, 'flat'),
  ],
  signal: [
    L('cyan', 'M4.4 13a16.4 16.4 0 0 1 23.2 0M8.6 17.2a10.4 10.4 0 0 1 14.8 0M12.6 21.2a4.8 4.8 0 0 1 6.8 0', 'line'),
    L('cyan', circle(16, 25, 2.4)),
  ],
  battery: [
    L('gray', rrect(26.2, 13.2, 3, 6.6, 1.2)),
    L('white', rrect(3.6, 9.6, 23, 13.8, 3.4)),
    L('green', rrect(6, 12, 12.4, 9, 1.8), 'flat'),
    ...face(15, 16.2, { gap: 6.4, scale: 0.85, blush: false }),
  ],
  sparkle: [
    L('gold', 'M14.6 4C15.6 11 18.6 14.2 25.6 15.4C18.6 16.6 15.6 19.8 14.6 26.8C13.6 19.8 10.6 16.6 3.6 15.4C10.6 14.2 13.6 11 14.6 4z'),
    L('cyan', 'M24.4 3.6c.4 2.4 1.4 3.4 3.8 3.8c-2.4.4-3.4 1.4-3.8 3.8c-.4-2.4-1.4-3.4-3.8-3.8c2.4-.4 3.4-1.4 3.8-3.8z'),
    L('cyan', 'M24.6 21.4c.3 1.8 1 2.5 2.8 2.8c-1.8.3-2.5 1-2.8 2.8c-.3-1.8-1-2.5-2.8-2.8c1.8-.3 2.5-1 2.8-2.8z'),
    ...face(14.6, 15.2, { gap: 4, scale: 0.7, blush: false }),
  ],
} satisfies Record<string, CuteLayer[]>

export type CuteIconName = keyof typeof cuteIcons

/** The icons by theme, for pickers and docs. */
export const CUTE_ICON_GROUPS: { id: 'animals' | 'food' | 'nature' | 'things' | 'tech'; names: CuteIconName[] }[] = [
  { id: 'animals', names: ['lion', 'cat', 'dog', 'bear', 'bunny', 'chick', 'panda', 'frog'] },
  { id: 'food', names: ['bubbleTea', 'coffee', 'donut', 'cupcake', 'iceCream', 'strawberry'] },
  { id: 'nature', names: ['sun', 'moon', 'cloud', 'rain', 'star', 'rainbow', 'flower', 'sprout'] },
  { id: 'things', names: ['heart', 'paw', 'gift', 'rocket', 'bell', 'mail', 'chat', 'camera', 'music', 'game', 'trophy', 'crown', 'bulb', 'home', 'ghost'] },
  { id: 'tech', names: ['cyberLion', 'robot', 'chip', 'laptop', 'terminal', 'bolt', 'shield', 'gear', 'key', 'lock', 'database', 'bug', 'signal', 'battery', 'sparkle'] },
]

export const CUTE_ICON_NAMES = Object.keys(cuteIcons) as CuteIconName[]

export type MlCuteIconVariant = 'color' | 'metal' | 'mono' | 'line'
export type MlCuteIconAnimation = 'bounce' | 'wiggle' | 'float' | 'beat' | 'spin' | 'blink'
