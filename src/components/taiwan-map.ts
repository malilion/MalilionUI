// View helpers shared by MlTaiwanMap (Vue) and TaiwanMap (React) — framework-free.
// The outlines live in ../taiwan-map-data (its own chunk), so only apps that draw
// the map ever download them.
import { TAIWAN_MAP_FRAMES, TAIWAN_MAP_SHAPES, TAIWAN_MAP_SIZE, type TaiwanMapShape } from '../taiwan-map-data'

export { TAIWAN_MAP_FRAMES, TAIWAN_MAP_SHAPES, TAIWAN_MAP_SIZE }
export type { TaiwanMapFrame, TaiwanMapShape } from '../taiwan-map-data'

/** One value per 縣市 — a record keyed by name, or a list. Names may use 台 or 臺. */
export type MlTaiwanMapData = Record<string, number | null | undefined> | MlTaiwanMapDatum[]

export interface MlTaiwanMapDatum {
  county: string
  value: number | null | undefined
}

export type MlTaiwanMapTone = 'gold' | 'tech' | 'bean' | 'success'
export type MlTaiwanMapScale = 'linear' | 'quantile'
export type MlTaiwanMapLang = 'zh' | 'en'

/** One legend step: values in [from, to] are drawn at shade `t` (0–1). */
export interface MlTaiwanMapBucket {
  from: number
  to: number
  t: number
}

export interface TaiwanMapScaleResult {
  min: number
  max: number
  /** Shade 0–1 for a value. */
  shade: (value: number) => number
  /** Legend steps — null for a continuous (gradient) scale. */
  buckets: MlTaiwanMapBucket[] | null
}

const EN: Record<string, [string, string]> = {
  臺北市: ['Taipei City', 'Taipei'],
  基隆市: ['Keelung City', 'Keelung'],
  新北市: ['New Taipei City', 'New Taipei'],
  連江縣: ['Lienchiang County', 'Matsu'],
  宜蘭縣: ['Yilan County', 'Yilan'],
  新竹市: ['Hsinchu City', 'Hsinchu C.'],
  新竹縣: ['Hsinchu County', 'Hsinchu Co.'],
  桃園市: ['Taoyuan City', 'Taoyuan'],
  苗栗縣: ['Miaoli County', 'Miaoli'],
  臺中市: ['Taichung City', 'Taichung'],
  彰化縣: ['Changhua County', 'Changhua'],
  南投縣: ['Nantou County', 'Nantou'],
  嘉義市: ['Chiayi City', 'Chiayi C.'],
  嘉義縣: ['Chiayi County', 'Chiayi Co.'],
  雲林縣: ['Yunlin County', 'Yunlin'],
  臺南市: ['Tainan City', 'Tainan'],
  高雄市: ['Kaohsiung City', 'Kaohsiung'],
  澎湖縣: ['Penghu County', 'Penghu'],
  金門縣: ['Kinmen County', 'Kinmen'],
  屏東縣: ['Pingtung County', 'Pingtung'],
  臺東縣: ['Taitung County', 'Taitung'],
  花蓮縣: ['Hualien County', 'Hualien'],
}
const SHORT_ZH: Record<string, string> = { 新竹市: '竹市', 新竹縣: '竹縣', 嘉義市: '嘉市', 嘉義縣: '嘉縣', 連江縣: '馬祖' }

/** The official 縣市 name for 台/臺 spellings and English names ("Taipei", "Taipei City"); undefined when unknown. */
export function taiwanMapCounty(name: string): string | undefined {
  const key = name.replace(/台/g, '臺').trim()
  if (key in EN) return key
  const lower = key.toLowerCase()
  return Object.keys(EN).find((zh) => EN[zh][0].toLowerCase() === lower || EN[zh][1].toLowerCase() === lower)
}

/** Full display name of a 縣市. */
export const taiwanMapName = (county: string, lang: MlTaiwanMapLang) => (lang === 'en' ? (EN[county]?.[0] ?? county) : county)

/** Short label drawn on the map: 臺北, 竹市, 馬祖 / Taipei, Hsinchu C. */
export const taiwanMapShortName = (county: string, lang: MlTaiwanMapLang) =>
  lang === 'en' ? (EN[county]?.[1] ?? county) : (SHORT_ZH[county] ?? county.slice(0, -1))

/** ConfigProvider locale → which names to show. */
export const taiwanMapLang = (localeName: string, lang?: MlTaiwanMapLang): MlTaiwanMapLang =>
  lang ?? (localeName.toLowerCase().startsWith('zh') ? 'zh' : 'en')

/** Normalise `data` to official name → finite value. Unknown names and non-numbers are skipped; repeats add up. */
export function taiwanMapValues(data: MlTaiwanMapData | null | undefined): Map<string, number> {
  const out = new Map<string, number>()
  if (!data) return out
  const entries: [string, unknown][] = Array.isArray(data) ? data.map((d) => [d.county, d.value]) : Object.entries(data)
  for (const [name, value] of entries) {
    const county = taiwanMapCounty(String(name))
    if (!county || typeof value !== 'number' || !Number.isFinite(value)) continue
    out.set(county, (out.get(county) ?? 0) + value)
  }
  return out
}

/**
 * Colour scale. `linear`: shade ∝ value between min and max (a gradient, or `steps`
 * equal-width bands). `quantile`: `steps` (default 5) bands holding about the same
 * number of 縣市 each. `domain` overrides min / max (values outside are clamped).
 */
export function taiwanMapScale(
  values: number[],
  options: { scale?: MlTaiwanMapScale; steps?: number; domain?: [number, number] } = {},
): TaiwanMapScaleResult {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b)
  const min = options.domain ? options.domain[0] : (sorted[0] ?? 0)
  const max = options.domain ? options.domain[1] : (sorted.at(-1) ?? 0)
  const span = max - min
  const quantile = options.scale === 'quantile'
  const rawSteps = options.steps ?? (quantile ? 5 : 0)
  const steps = rawSteps ? Math.max(2, Math.round(rawSteps)) : 0
  const unit = (v: number) => (span > 0 ? Math.min(1, Math.max(0, (v - min) / span)) : 1)

  if (quantile && sorted.length) {
    // Upper bound of each band: the value at that rank (bands never split equal values).
    const bounds: number[] = []
    for (let i = 1; i < steps; i++) bounds.push(sorted[Math.min(sorted.length - 1, Math.ceil((i * sorted.length) / steps) - 1)])
    const uniq = [...new Set(bounds)].filter((b) => b < max)
    const n = uniq.length + 1
    const t = (k: number) => (n === 1 ? 1 : k / (n - 1))
    const buckets: MlTaiwanMapBucket[] = []
    let from = min
    for (let k = 0; k < n; k++) {
      const to = k < uniq.length ? uniq[k] : max
      buckets.push({ from, to, t: t(k) })
      from = to
    }
    const shade = (v: number) => {
      const k = uniq.findIndex((b) => v <= b)
      return t(k < 0 ? n - 1 : k)
    }
    return { min, max, shade, buckets }
  }

  if (steps) {
    const width = span / steps
    const buckets = Array.from({ length: steps }, (_, k) => ({ from: min + k * width, to: k === steps - 1 ? max : min + (k + 1) * width, t: k / (steps - 1) }))
    const shade = (v: number) => {
      const k = span > 0 ? Math.min(steps - 1, Math.floor(unit(v) * steps)) : steps - 1
      return k / (steps - 1)
    }
    return { min, max, shade, buckets }
  }
  return { min, max, shade: unit, buckets: null }
}

export type TaiwanMapDirection = 'up' | 'down' | 'left' | 'right'

/** Where keyboard navigation measures from: an inset's frame centre, otherwise the label point. */
function anchors(): Map<string, [number, number]> {
  const out = new Map<string, [number, number]>()
  for (const s of TAIWAN_MAP_SHAPES) {
    const f = TAIWAN_MAP_FRAMES.find((x) => x.county === s.name)
    out.set(s.name, f ? [f.x + f.w / 2, f.y + f.h / 2] : [s.x, s.y])
  }
  return out
}
let anchorCache: Map<string, [number, number]> | undefined

/** Where a 縣市's tooltip points and keyboard navigation measures from (view-box units). */
export function taiwanMapAnchor(county: string): [number, number] | undefined {
  anchorCache ??= anchors()
  return anchorCache.get(county)
}

/**
 * The geographic neighbour of `county` in a direction: the nearest 縣市 within ±70°
 * of it, preferring ones straight ahead. Undefined at the edge of the map.
 */
export function taiwanMapNeighbour(county: string, direction: TaiwanMapDirection, among?: readonly string[]): string | undefined {
  const from = taiwanMapAnchor(county)
  if (!from || !anchorCache) return undefined
  const [ux, uy] = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[direction]
  let best: string | undefined
  let bestScore = Infinity
  for (const [name, [x, y]] of anchorCache) {
    if (name === county || (among && !among.includes(name))) continue
    const dx = x - from[0]
    const dy = y - from[1]
    const dist = Math.hypot(dx, dy)
    const along = (dx * ux + dy * uy) / dist
    if (!(along > Math.cos((70 * Math.PI) / 180))) continue
    // Off-axis neighbours cost more, so ↓ from 臺中 is 南投/彰化, not 花蓮.
    const score = dist * (1 + 2 * Math.sqrt(1 - along * along))
    if (score < bestScore) {
      best = name
      bestScore = score
    }
  }
  return best
}

export const taiwanMapShape = (county: string): TaiwanMapShape | undefined => TAIWAN_MAP_SHAPES.find((s) => s.name === county)

/** Selection as a list, whatever shape `selected` came in. */
export const taiwanMapSelection = (selected: string | readonly string[] | null | undefined): string[] =>
  (selected == null ? [] : typeof selected === 'string' ? [selected] : [...selected]).map((n) => taiwanMapCounty(n) ?? n)

/** Default value text. */
export const taiwanMapFormat = (value: number) => value.toLocaleString()
