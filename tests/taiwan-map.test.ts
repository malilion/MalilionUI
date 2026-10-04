// MlTaiwanMap: the generated outlines, the scale / neighbour helpers, then the Vue component.
import { describe, expect, it } from 'vitest'
import { h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { MlConfigProvider, MlTaiwanMap, en } from '../src'
import { getTaiwanCounties } from '../src/taiwan-regions'
import {
  TAIWAN_MAP_FRAMES,
  TAIWAN_MAP_SHAPES,
  TAIWAN_MAP_SIZE,
  taiwanMapCounty,
  taiwanMapNeighbour,
  taiwanMapScale,
  taiwanMapValues,
  type TaiwanMapDirection,
} from '../src/components/taiwan-map'

/** Absolute points of a relative "M x y l dx dy … z" path, one list per ring. */
function rings(d: string): [number, number][][] {
  const out: [number, number][][] = []
  for (const m of d.matchAll(/M(-?\d+) (-?\d+)l([^Mz]*)z/g)) {
    let x = +m[1]
    let y = +m[2]
    const pts: [number, number][] = [[x, y]]
    const nums = (m[3].match(/-?\d+/g) ?? []).map(Number)
    expect(nums.length % 2).toBe(0)
    for (let i = 0; i < nums.length; i += 2) pts.push([(x += nums[i]), (y += nums[i + 1])])
    out.push(pts)
  }
  return out
}

describe('taiwan-map-data', () => {
  it('has the 22 縣市 of taiwan-regions, in the same order', () => {
    expect(TAIWAN_MAP_SHAPES.map((s) => s.name)).toEqual(getTaiwanCounties().map((c) => c.name))
    expect(new Set(TAIWAN_MAP_SHAPES.map((s) => s.name)).size).toBe(22)
  })

  it('paths parse, stay inside the view box, and nothing is consumed by the regex but whole rings', () => {
    const [w, h] = TAIWAN_MAP_SIZE
    for (const s of TAIWAN_MAP_SHAPES) {
      expect(s.d).toMatch(/^(M-?\d+ -?\d+l[-\d ]*z)+$/)
      const rs = rings(s.d)
      expect(rs.length).toBeGreaterThan(0)
      for (const r of rs) {
        expect(r.length).toBeGreaterThanOrEqual(3)
        for (const [x, y] of r) {
          expect(x).toBeGreaterThanOrEqual(0)
          expect(x).toBeLessThanOrEqual(w)
          expect(y).toBeGreaterThanOrEqual(0)
          expect(y).toBeLessThanOrEqual(h)
        }
      }
      expect(s.x).toBeGreaterThan(0)
      expect(s.y).toBeGreaterThan(0)
    }
  })

  it('keeps the outlying islands in their framed insets and the main island to the east', () => {
    expect(TAIWAN_MAP_FRAMES.map((f) => f.county).sort()).toEqual(['澎湖縣', '連江縣', '金門縣'].sort())
    for (const f of TAIWAN_MAP_FRAMES) {
      const pts = rings(TAIWAN_MAP_SHAPES.find((s) => s.name === f.county)!.d).flat()
      for (const [x, y] of pts) {
        expect(x).toBeGreaterThanOrEqual(f.x)
        expect(x).toBeLessThanOrEqual(f.x + f.w)
        expect(y).toBeGreaterThanOrEqual(f.y)
        expect(y).toBeLessThanOrEqual(f.y + f.h)
      }
    }
    const right = Math.max(...TAIWAN_MAP_FRAMES.map((f) => f.x + f.w))
    for (const s of TAIWAN_MAP_SHAPES) {
      if (TAIWAN_MAP_FRAMES.some((f) => f.county === s.name)) continue
      expect(Math.min(...rings(s.d).flat().map((p) => p[0]))).toBeGreaterThan(right)
    }
    // North → south: 基隆 above 臺中 above 高雄 above 屏東's southern tip.
    const y = (n: string) => TAIWAN_MAP_SHAPES.find((s) => s.name === n)!.y
    expect(y('基隆市')).toBeLessThan(y('臺中市'))
    expect(y('臺中市')).toBeLessThan(y('高雄市'))
    // 綠島 and 蘭嶼 are drawn with 臺東縣, 小琉球 with 屏東縣, 龜山島 with 宜蘭縣.
    expect(rings(TAIWAN_MAP_SHAPES.find((s) => s.name === '臺東縣')!.d).length).toBeGreaterThanOrEqual(3)
    expect(rings(TAIWAN_MAP_SHAPES.find((s) => s.name === '屏東縣')!.d).length).toBeGreaterThanOrEqual(2)
    expect(rings(TAIWAN_MAP_SHAPES.find((s) => s.name === '宜蘭縣')!.d).length).toBeGreaterThanOrEqual(2)
  })

  it('stays small', () => {
    const bytes = TAIWAN_MAP_SHAPES.reduce((n, s) => n + s.d.length, 0)
    expect(bytes).toBeLessThan(25_000)
  })
})

describe('taiwan-map helpers', () => {
  it('resolves 台/臺 and English names', () => {
    expect(taiwanMapCounty('台北市')).toBe('臺北市')
    expect(taiwanMapCounty('Kaohsiung City')).toBe('高雄市')
    expect(taiwanMapCounty('hsinchu county')).toBe('新竹縣')
    expect(taiwanMapCounty('Matsu')).toBe('連江縣')
    expect(taiwanMapCounty('火星市')).toBeUndefined()
  })

  it('normalises records and lists, skipping junk and adding repeats', () => {
    expect([...taiwanMapValues({ 台中市: 3, 花蓮縣: null, 火星市: 9, Taipei: 2 })]).toEqual([
      ['臺中市', 3],
      ['臺北市', 2],
    ])
    expect(taiwanMapValues([{ county: '臺南市', value: 1 }, { county: '台南市', value: 4 }, { county: '嘉義市', value: Number.NaN }]).get('臺南市')).toBe(5)
    expect(taiwanMapValues(undefined).size).toBe(0)
  })

  it('linear scale: continuous, banded, clamped to a domain', () => {
    const s = taiwanMapScale([10, 20, 30])
    expect([s.min, s.max, s.buckets]).toEqual([10, 30, null])
    expect(s.shade(10)).toBe(0)
    expect(s.shade(20)).toBe(0.5)
    expect(s.shade(30)).toBe(1)
    const banded = taiwanMapScale([0, 100], { steps: 4 })
    expect(banded.buckets!.map((b) => [b.from, b.to, b.t])).toEqual([
      [0, 25, 0],
      [25, 50, 1 / 3],
      [50, 75, 2 / 3],
      [75, 100, 1],
    ])
    expect(banded.shade(10)).toBe(0)
    expect(banded.shade(60)).toBeCloseTo(2 / 3)
    expect(banded.shade(100)).toBe(1)
    const fixed = taiwanMapScale([5, 500], { domain: [0, 100] })
    expect(fixed.shade(500)).toBe(1)
    expect(fixed.shade(-5)).toBe(0)
    // One value (or all equal): everything is full strength, not NaN.
    expect(taiwanMapScale([7]).shade(7)).toBe(1)
  })

  it('quantile scale: bands of about equal size, never splitting equal values', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    const q = taiwanMapScale(values, { scale: 'quantile', steps: 5 })
    expect(q.buckets!.map((b) => b.to)).toEqual([2, 4, 6, 8, 10])
    expect(values.map(q.shade)).toEqual([0, 0, 0.25, 0.25, 0.5, 0.5, 0.75, 0.75, 1, 1])
    const ties = taiwanMapScale([1, 1, 1, 1, 9], { scale: 'quantile', steps: 4 })
    expect(ties.buckets!.length).toBe(2)
    expect(ties.shade(1)).toBe(0)
    expect(ties.shade(9)).toBe(1)
  })

  it('arrow keys move to geographic neighbours', () => {
    expect(taiwanMapNeighbour('臺中市', 'down')).toMatch(/彰化縣|南投縣/)
    expect(taiwanMapNeighbour('臺中市', 'up')).toBe('苗栗縣')
    expect(taiwanMapNeighbour('高雄市', 'right')).toBe('臺東縣')
    expect(taiwanMapNeighbour('臺南市', 'left')).toBe('澎湖縣')
    expect(taiwanMapNeighbour('屏東縣', 'down')).toBeUndefined()
    expect(taiwanMapNeighbour('火星市', 'down')).toBeUndefined()
  })

  it('the arrow-key graph reaches every 縣市 from every 縣市', () => {
    const names = TAIWAN_MAP_SHAPES.map((s) => s.name)
    const dirs: TaiwanMapDirection[] = ['up', 'down', 'left', 'right']
    for (const start of names) {
      const seen = new Set([start])
      const queue = [start]
      while (queue.length) {
        const cur = queue.shift()!
        for (const d of dirs) {
          const next = taiwanMapNeighbour(cur, d)
          if (next && !seen.has(next)) {
            seen.add(next)
            queue.push(next)
          }
        }
      }
      expect([start, seen.size]).toEqual([start, 22])
    }
  })
})

/* ── MlTaiwanMap ─────────────────────────────────────────── */

const county = (w: ReturnType<typeof mount>, name: string) => w.find(`[data-county="${name}"]`)

describe('MlTaiwanMap', () => {
  const data = { 臺北市: 10, 新北市: 40, 台中市: 25 }

  it('shades counties, marks missing data and builds the accessible table', () => {
    const w = mount(MlTaiwanMap, { props: { data } })
    expect(w.findAll('.ml-twmap__county')).toHaveLength(22)
    expect(county(w, '臺北市').attributes('style')).toContain('--_t: 0.000')
    expect(county(w, '新北市').attributes('style')).toContain('--_t: 1.000')
    expect(county(w, '臺中市').attributes('style')).toContain('--_t: 0.500')
    expect(county(w, '花蓮縣').classes()).toContain('ml-twmap__county--empty')
    expect(county(w, '花蓮縣').attributes('aria-label')).toBe('花蓮縣：無資料')
    expect(w.find('svg').attributes('aria-label')).toBe('臺灣縣市地圖：3 個縣市有資料，最低 10，最高 40')
    expect(w.findAll('tbody tr')).toHaveLength(22)
    expect(w.find('tbody tr').text()).toBe('臺北市10')
    expect(w.find('.ml-twmap__min').text()).toBe('10')
    expect(w.find('.ml-twmap__max').text()).toBe('40')
    expect(w.find('.ml-twmap__swatch--empty').exists()).toBe(true)
    // Roving tabindex: one stop.
    expect(w.findAll('[tabindex="0"]')).toHaveLength(1)
  })

  it('click and Enter select; a second click deselects', async () => {
    const w = mount(MlTaiwanMap, { props: { data, format: (v: number) => `${v} 人` } })
    await county(w, '新北市').trigger('click')
    expect(w.emitted('update:selected')!.at(-1)).toEqual(['新北市'])
    expect(w.emitted('select')!.at(-1)).toEqual(['新北市', true])
    expect(county(w, '新北市').attributes('aria-pressed')).toBe('true')
    expect(w.find('.ml-twmap__outline--selected').exists()).toBe(true)
    expect(county(w, '新北市').attributes('tabindex')).toBe('0')
    await county(w, '新北市').trigger('click')
    expect(w.emitted('update:selected')!.at(-1)).toEqual([null])
    await county(w, '臺中市').trigger('focus')
    await w.find('svg').trigger('keydown', { key: 'Enter' })
    expect(w.emitted('update:selected')!.at(-1)).toEqual(['臺中市'])
    // Tooltip on focus.
    expect(w.find('.ml-twmap__tip').text()).toContain('臺中市')
    expect(w.find('.ml-twmap__tip').text()).toContain('25 人')
  })

  it('multiple, disabled and highlight', async () => {
    const w = mount(MlTaiwanMap, { props: { multiple: true, selected: ['台北市'], disabled: ['金門縣'], highlight: '高雄市' } })
    await county(w, '新北市').trigger('click')
    expect(w.emitted('update:selected')!.at(-1)).toEqual([['臺北市', '新北市']])
    await county(w, '金門縣').trigger('click')
    expect(w.emitted('update:selected')).toHaveLength(1)
    expect(county(w, '金門縣').attributes('aria-disabled')).toBe('true')
    expect(w.findAll('.ml-twmap__outline--highlight')).toHaveLength(1)
    // No data → no legend.
    expect(w.find('.ml-twmap__legend').exists()).toBe(false)
  })

  it('arrow keys move focus to the neighbouring county', async () => {
    const w = mount(MlTaiwanMap, { props: { data }, attachTo: document.body })
    ;(county(w, '臺中市').element as SVGPathElement).focus()
    await nextTick()
    await w.find('svg').trigger('keydown', { key: 'ArrowUp' })
    expect(document.activeElement?.getAttribute('data-county')).toBe('苗栗縣')
    expect(county(w, '苗栗縣').attributes('tabindex')).toBe('0')
    expect(county(w, '臺中市').attributes('tabindex')).toBe('-1')
    await w.find('svg').trigger('keydown', { key: 'End' })
    expect(document.activeElement?.getAttribute('data-county')).toBe('花蓮縣')
    await w.find('svg').trigger('keydown', { key: 'Escape' })
    expect(w.find('.ml-twmap__tip').exists()).toBe(false)
    w.unmount()
  })

  it('selectable=false: images, not buttons; steps legend; labels', () => {
    const w = mount(MlTaiwanMap, { props: { data, selectable: false, scale: 'quantile', steps: 3, labels: true } })
    expect(county(w, '臺北市').attributes('role')).toBe('img')
    expect(county(w, '臺北市').attributes('aria-pressed')).toBeUndefined()
    expect(w.findAll('.ml-twmap__step .ml-twmap__swatch:not(.ml-twmap__swatch--empty)')).toHaveLength(3)
    expect(w.findAll('.ml-twmap__label')).toHaveLength(22)
    expect(w.findAll('.ml-twmap__label').map((t) => t.text())).toContain('竹市')
  })

  it('follows the locale', () => {
    const w = mount(MlConfigProvider, { props: { locale: en }, slots: { default: () => h(MlTaiwanMap, { data, labels: true }) } })
    expect(w.find('[data-county="臺北市"]').attributes('aria-label')).toBe('Taipei City: 10')
    expect(w.find('[data-county="花蓮縣"]').attributes('aria-label')).toBe('Hualien County: No data')
    expect(w.find('svg').attributes('aria-label')).toBe('Map of Taiwan: 3 counties with data, from 10 to 40')
    expect(w.findAll('.ml-twmap__label').map((t) => t.text())).toContain('Hsinchu C.')
  })
})
