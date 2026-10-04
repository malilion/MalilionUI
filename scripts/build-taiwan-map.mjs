// Regenerate src/taiwan-map-data.ts — the 22 縣市 outlines MlTaiwanMap / TaiwanMap draw.
//   node scripts/build-taiwan-map.mjs              download the pinned source and rewrite
//   node scripts/build-taiwan-map.mjs file.json    use a local copy instead
//   node scripts/build-taiwan-map.mjs --svg out.svg  also write a preview SVG
//
// Source: taiwan-atlas 2021.9.20 counties-10t.json (MIT, https://github.com/dkaoster/taiwan-atlas),
// a TopoJSON redistribution of 內政部國土測繪中心「直轄市、縣市界線(TWD97經緯度)」
// (data.gov.tw dataset 7442, https://data.gov.tw/dataset/7442), released under the
// 政府資料開放授權條款－第1版 (Open Government Data License, version 1.0).
//
// Pipeline (no dependencies): decode the TopoJSON arcs → equirectangular projection
// (x scaled by cos 23.7°) → move 連江 / 金門 / 澎湖 into enlarged insets stacked in the
// empty strait west of the main island → Douglas–Peucker
// per *arc*, so the border two 縣市 share is simplified once and never gaps → round
// to integers → drop islets smaller than a few px² → relative SVG path strings.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const SOURCE = 'https://cdn.jsdelivr.net/npm/taiwan-atlas@2021.9.20/counties-10t.json'
const target = fileURLToPath(new URL('../src/taiwan-map-data.ts', import.meta.url))
const regionsFile = fileURLToPath(new URL('../src/taiwan-regions.ts', import.meta.url))

const args = process.argv.slice(2)
const svgAt = args.indexOf('--svg')
const svgOut = svgAt >= 0 ? args.splice(svgAt, 2)[1] : null
const topo = JSON.parse(args[0] ? readFileSync(args[0], 'utf8') : await (await fetch(SOURCE)).text())

/* ── settings ───────────────────────────────────────────── */
const K = 230 // output units per degree of latitude
const COS = Math.cos((23.7 * Math.PI) / 180)
const LON0 = 119.0
const LAT1 = 25.45
const EPS = 0.5 // Douglas–Peucker tolerance, output units
const MIN_AREA = 6 // islets smaller than this (units²) are dropped, unless they are a county's only land
const PAD = 8

const project = ([lon, lat]) => [(lon - LON0) * COS * K, (LAT1 - lat) * K]

// Insets: [scale, target top-left x, y] for every county drawn outside its true position.
const INSETS = {
  連江縣: { scale: 2.4, at: [PAD + 6, PAD + 6] },
  金門縣: { scale: 2.4, below: '連江縣' },
  澎湖縣: { scale: 1.6, below: '金門縣' },
}
// Areas the source includes that a county map leaves out (beyond the insets' reach).
const DROP = [
  { county: '金門縣', lon: [119.2, 119.7] }, // 烏坵 — 120 km north-east of 金門, would stretch the inset
]
// Parts moved closer inside their inset (degrees), so the inset can be enlarged instead of mostly sea.
const SHIFT = [
  { county: '連江縣', lon: [120.3, 121], by: [-0.27, -0.12] }, // 東引, ~45 km north-east of 北竿
]
// Label anchors moved off small 縣市 so neighbouring labels don't collide (view-box units).
const LABEL_AT = { 基隆市: [602, 64], 新竹市: [392, 144], 嘉義縣: [374, 470] }
const shiftOf = (county, lon) => SHIFT.find((s) => s.county === county && lon >= s.lon[0] && lon <= s.lon[1])?.by ?? [0, 0]

/* ── county order / names from taiwan-regions.ts ─────────── */
const order = [...readFileSync(regionsFile, 'utf8').matchAll(/"([㐀-鿿]{2}[市縣])[A-Za-z' ]+:/g)].map((m) => m[1])
if (order.length !== 22) throw new Error(`expected 22 counties in taiwan-regions.ts, got ${order.length}`)

/* ── decode TopoJSON ────────────────────────────────────── */
const { scale: [sx, sy], translate: [tx, ty] } = topo.transform
const arcsLL = topo.arcs.map((arc) => {
  let x = 0
  let y = 0
  return arc.map(([dx, dy]) => {
    x += dx
    y += dy
    return [x * sx + tx, y * sy + ty]
  })
})

const counties = topo.objects.counties.geometries.map((g) => {
  const name = g.properties.COUNTYNAME.replaceAll('台', '臺')
  if (!order.includes(name)) throw new Error(`unknown county ${name}`)
  const polys = g.type === 'Polygon' ? [g.arcs] : g.arcs
  return { name, polys }
})
if (counties.length !== 22) throw new Error(`expected 22 counties in the source, got ${counties.length}`)

// Which county owns each arc (shared arcs: any — they are all on the main island).
const owner = new Map()
for (const c of counties) for (const p of c.polys) for (const r of p) for (const a of r) owner.set(a < 0 ? ~a : a, c.name)

/* ── project + insets ───────────────────────────────────── */
/** Apply SHIFT to every point of an arc, keyed on the arc's first longitude. */
const moved = (county, i) => {
  const [dx, dy] = shiftOf(county, arcsLL[i][0][0])
  return ([lon, lat]) => [lon + dx, lat + dy]
}
const insetBox = {}
for (const [name, cfg] of Object.entries(INSETS)) {
  if (cfg.below) cfg.at = [PAD + 6, Math.round(insetBox[cfg.below].y + insetBox[cfg.below].h + 10)]
  const pts = []
  const c = counties.find((x) => x.name === name)
  for (const p of c.polys) for (const r of p) for (const a of r) pts.push(...arcsLL[a < 0 ? ~a : a].map(moved(name, a < 0 ? ~a : a)))
  const kept = pts.filter(([lon]) => !DROP.some((d) => d.county === name && lon >= d.lon[0] && lon <= d.lon[1]))
  const xy = kept.map(project)
  const minX = Math.min(...xy.map((p) => p[0]))
  const minY = Math.min(...xy.map((p) => p[1]))
  const maxX = Math.max(...xy.map((p) => p[0]))
  const maxY = Math.max(...xy.map((p) => p[1]))
  const m = 8 // margin inside the frame
  cfg.map = ([x, y]) => [cfg.at[0] + m + (x - minX) * cfg.scale, cfg.at[1] + m + (y - minY) * cfg.scale]
  insetBox[name] = { x: cfg.at[0], y: cfg.at[1], w: (maxX - minX) * cfg.scale + 2 * m, h: (maxY - minY) * cfg.scale + 2 * m }
}

const arcsXY = arcsLL.map((arc, i) => {
  const cfg = INSETS[owner.get(i)]
  const move = moved(owner.get(i), i)
  return arc.map((ll) => (cfg ? cfg.map(project(move(ll))) : project(ll)))
})

/* ── Douglas–Peucker per arc (endpoints = junctions stay put) ── */
function segDist2([px, py], [ax, ay], [bx, by]) {
  const dx = bx - ax
  const dy = by - ay
  const len = dx * dx + dy * dy
  let t = len ? ((px - ax) * dx + (py - ay) * dy) / len : 0
  t = Math.max(0, Math.min(1, t))
  return (px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2
}
function dp(points, eps) {
  const keep = new Uint8Array(points.length)
  keep[0] = keep[points.length - 1] = 1
  const stack = [[0, points.length - 1]]
  while (stack.length) {
    const [a, b] = stack.pop()
    let best = -1
    let bestD = eps * eps
    for (let i = a + 1; i < b; i++) {
      const d = segDist2(points[i], points[a], points[b])
      if (d > bestD) {
        best = i
        bestD = d
      }
    }
    if (best >= 0) {
      keep[best] = 1
      stack.push([a, best], [best, b])
    }
  }
  return points.filter((_, i) => keep[i])
}
function simplify(points) {
  const closed = points.length > 3 && points[0][0] === points.at(-1)[0] && points[0][1] === points.at(-1)[1]
  if (!closed) return dp(points, EPS)
  // A closed arc (an island): split at the point farthest from the start so DP has a baseline.
  let far = 1
  let farD = 0
  points.forEach((p, i) => {
    const d = (p[0] - points[0][0]) ** 2 + (p[1] - points[0][1]) ** 2
    if (d > farD) {
      far = i
      farD = d
    }
  })
  return [...dp(points.slice(0, far + 1), EPS).slice(0, -1), ...dp(points.slice(far), EPS)]
}
const round = (pts) => {
  const out = []
  for (const [x, y] of pts) {
    const p = [Math.round(x), Math.round(y)]
    const last = out.at(-1)
    if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p)
  }
  return out
}
const arcs = arcsXY.map((a) => round(simplify(a)))

/* ── rings → paths ──────────────────────────────────────── */
function ring(indexes) {
  const pts = []
  for (const a of indexes) {
    const arc = a < 0 ? [...arcs[~a]].reverse() : arcs[a]
    pts.push(...(pts.length ? arc.slice(1) : arc))
  }
  if (pts.length > 1 && pts[0][0] === pts.at(-1)[0] && pts[0][1] === pts.at(-1)[1]) pts.pop()
  return pts
}
const area = (pts) => {
  let s = 0
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[(i + 1) % pts.length]
    s += x1 * y2 - x2 * y1
  }
  return s / 2
}
const toPath = (rings) =>
  rings
    .map((pts) => {
      let d = `M${pts[0][0]} ${pts[0][1]}l`
      for (let i = 1; i < pts.length; i++) {
        const dx = pts[i][0] - pts[i - 1][0]
        const dy = pts[i][1] - pts[i - 1][1]
        d += `${i > 1 && dx >= 0 ? ' ' : ''}${dx}${dy >= 0 ? ' ' : ''}${dy}`
      }
      return `${d}z`
    })
    .join('')

/** Point inside the polygon farthest from its edges (grid search, refined) — where the label goes. */
function labelPoint(rings) {
  const outer = rings[0]
  const inside = (x, y) => {
    let hit = false
    for (const r of rings) {
      for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
        const [xi, yi] = r[i]
        const [xj, yj] = r[j]
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
      }
    }
    return hit
  }
  const edgeDist = (x, y) => {
    let best = Infinity
    for (const r of rings) for (let i = 0, j = r.length - 1; i < r.length; j = i++) best = Math.min(best, segDist2([x, y], r[j], r[i]))
    return Math.sqrt(best)
  }
  const xs = outer.map((p) => p[0])
  const ys = outer.map((p) => p[1])
  let [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  let best = { x: (x0 + x1) / 2, y: (y0 + y1) / 2, d: -1 }
  for (let pass = 0; pass < 4; pass++) {
    const step = Math.max(x1 - x0, y1 - y0) / 24
    for (let x = x0; x <= x1; x += step) {
      for (let y = y0; y <= y1; y += step) {
        if (!inside(x, y)) continue
        const d = edgeDist(x, y)
        if (d > best.d) best = { x, y, d }
      }
    }
    ;[x0, x1, y0, y1] = [best.x - step, best.x + step, best.y - step, best.y + step]
  }
  return [Math.round(best.x), Math.round(best.y)]
}

const shapes = []
for (const name of order) {
  const c = counties.find((x) => x.name === name)
  // DROP areas are matched on the original longitude of a polygon's first arc.
  const kept = c.polys
    .filter((p) => {
      const [lon] = arcsLL[p[0][0] < 0 ? ~p[0][0] : p[0][0]][0]
      return !DROP.some((d) => d.county === name && lon >= d.lon[0] && lon <= d.lon[1])
    })
    .map((p) => p.map(ring).filter((r) => r.length >= 3))
    .filter((p) => p.length)
  kept.sort((a, b) => Math.abs(area(b[0])) - Math.abs(area(a[0])))
  const big = kept.filter((p, i) => i === 0 || Math.abs(area(p[0])) >= MIN_AREA)
  const rings = big.flatMap((p) => p.filter((r, i) => i === 0 || Math.abs(area(r)) >= MIN_AREA))
  // Inset counties are labelled in their frame's top-left corner (the islands are too small).
  const box = insetBox[name]
  const [lx, ly] = box ? [Math.round(box.x + 7), Math.round(box.y + 6)] : (LABEL_AT[name] ?? labelPoint(big[0]))
  shapes.push({ name, d: toPath(rings), x: lx, y: ly, parts: big.length })
}

/* ── frames + view box ──────────────────────────────────── */
const frames = []
for (const name of Object.keys(INSETS)) {
  const b = insetBox[name]
  frames.push({ county: name, x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.w), h: Math.round(b.h) })
}
let maxX = 0
let maxY = 0
for (const s of shapes) {
  for (const m of s.d.matchAll(/M(-?\d+) (-?\d+)l([^z]*)z/g)) {
    let x = +m[1]
    let y = +m[2]
    const nums = m[3].match(/-?\d+/g).map(Number)
    for (let i = 0; i < nums.length; i += 2) {
      x += nums[i]
      y += nums[i + 1]
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }
}
const width = Math.ceil(maxX + PAD)
const height = Math.ceil(maxY + PAD)

/* ── emit ───────────────────────────────────────────────── */
const json = (v) => JSON.stringify(v)
const body = `// GENERATED by scripts/build-taiwan-map.mjs — do not edit by hand.
//
// 22 縣市 outlines for MlTaiwanMap (Vue) and TaiwanMap (React), in the county order
// of taiwan-regions.ts. Source: 內政部國土測繪中心「直轄市、縣市界線(TWD97經緯度)」
// (政府資料開放平臺 dataset 7442, https://data.gov.tw/dataset/7442), via the
// taiwan-atlas 2021.9.20 TopoJSON redistribution (counties-10t.json, MIT,
// https://github.com/dkaoster/taiwan-atlas). License: 政府資料開放授權條款－第1版
// (Open Government Data License, version 1.0, https://data.gov.tw/license).
//
// Equirectangular projection (x × cos 23.7°), ${K} units per degree, simplified with
// Douglas–Peucker (ε ${EPS}) per shared border and rounded to integers. 連江縣 (×${INSETS['連江縣'].scale}),
// 金門縣 (×${INSETS['金門縣'].scale}) and 澎湖縣 (×${INSETS['澎湖縣'].scale}) are enlarged into framed insets on the left;
// inside the 連江 inset 東引 is moved closer to 北竿. 烏坵 and 東沙／南沙群島 are not drawn. Paths are relative ("M x y l dx dy … z").

export interface TaiwanMapShape {
  /** Official 縣市 name (臺), as in taiwan-regions. */
  name: string
  /** SVG path in the map's view box. */
  d: string
  /** Label anchor (text centre) — the point inside the largest part farthest from its edges (a few small 縣市 are nudged); for an inset, its frame's top-left corner (text starts there). */
  x: number
  y: number
}

export interface TaiwanMapFrame {
  /** The 縣市 drawn inside this inset frame. */
  county: string
  x: number
  y: number
  w: number
  h: number
}

/** Width and height of the map's view box. */
export const TAIWAN_MAP_SIZE: readonly [number, number] = [${width}, ${height}]

/** Inset frames for the outlying islands (連江縣, 金門縣, 澎湖縣), moved and enlarged. */
export const TAIWAN_MAP_FRAMES: readonly TaiwanMapFrame[] = ${json(frames)}

export const TAIWAN_MAP_SHAPES: readonly TaiwanMapShape[] = [
${shapes.map((s) => `  { name: ${json(s.name)}, x: ${s.x}, y: ${s.y}, d: ${json(s.d)} },`).join('\n')}
]
`
writeFileSync(target, body)
console.log(`wrote ${target}: ${(Buffer.byteLength(body) / 1024).toFixed(1)} KB, view box ${width}×${height}`)
for (const s of shapes) console.log(`  ${s.name} parts=${s.parts} bytes=${s.d.length} label=${s.x},${s.y}`)

if (svgOut) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="background:#111">
${frames.map((f) => `<rect x="${f.x}" y="${f.y}" width="${f.w}" height="${f.h}" fill="none" stroke="#666" stroke-dasharray="3 3"/>`).join('\n')}
${shapes.map((s, i) => `<path d="${s.d}" fill="hsl(${i * 47} 60% 50%)" stroke="#111" stroke-width="0.8"/>`).join('\n')}
${shapes.map((s) => `<text x="${s.x}" y="${s.y}" font-size="10" fill="#fff" text-anchor="middle">${s.name}</text>`).join('\n')}
</svg>`
  writeFileSync(svgOut, svg)
}
