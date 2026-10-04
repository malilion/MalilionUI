// MlCuteIcon, MlPuzzle and MlGlobe: their framework-free maths, then the Vue components.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { MlConfigProvider, MlCuteIcon, MlGlobe, MlPuzzle, en } from '../src'
import { CUTE_ICON_GROUPS, CUTE_ICON_NAMES, cuteIcons } from '../src/components/cute-icons'
import {
  puzzleEdges,
  puzzleNeighbour,
  puzzlePiecePath,
  puzzlePlaced,
  puzzleRandom,
  puzzleShuffle,
  puzzleSolved,
  puzzleSwap,
} from '../src/components/puzzle'
import {
  GLOBE_HOME,
  globeArcPath,
  globeDistance,
  globeDots,
  globeFormatPoint,
  globeGraticule,
  globeLand,
  globeLerpView,
  globeNormalize,
  globeProject,
} from '../src/components/globe'
import { GLOBE_POINT_COUNT } from '../src/globe-data'

/** Every number in a path string. */
const numbers = (d: string) => (d.match(/-?\d*\.?\d+/g) ?? []).map(Number)

let wrapper: VueWrapper | undefined
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
})

/* ── Cute icons ─────────────────────────────────────────── */
describe('cute-icons', () => {
  it('groups list every icon exactly once', () => {
    const grouped = CUTE_ICON_GROUPS.flatMap((g) => g.names)
    expect(grouped.slice().sort()).toEqual(CUTE_ICON_NAMES.slice().sort())
    expect(new Set(grouped).size).toBe(grouped.length)
    expect(CUTE_ICON_NAMES.length).toBeGreaterThanOrEqual(52)
    expect(CUTE_ICON_GROUPS.map((g) => g.id)).toEqual(['animals', 'food', 'nature', 'things', 'tech'])
  })

  it('every layer is a well-formed path on the 32×32 grid', () => {
    for (const name of CUTE_ICON_NAMES) {
      const layers = cuteIcons[name]
      expect(layers.length, name).toBeGreaterThan(0)
      for (const l of layers) {
        expect(l.d, name).toMatch(/^M/)
        expect(l.d, name).not.toMatch(/NaN|undefined/)
      }
      // Absolute move-tos stay on the canvas (relative steps can be negative).
      for (const m of layers.flatMap((l) => [...l.d.matchAll(/M(-?[\d.]+) (-?[\d.]+)/g)])) {
        expect(+m[1], name).toBeGreaterThanOrEqual(0)
        expect(+m[1], name).toBeLessThanOrEqual(32)
        expect(+m[2], name).toBeGreaterThanOrEqual(0)
        expect(+m[2], name).toBeLessThanOrEqual(32)
      }
    }
  })

  it('most icons have a face that blinks', () => {
    const withEyes = CUTE_ICON_NAMES.filter((n) => cuteIcons[n].some((l) => l.kind === 'eye'))
    expect(withEyes.length).toBeGreaterThan(CUTE_ICON_NAMES.length * 0.6)
  })
})

describe('MlCuteIcon', () => {
  it('draws one path per layer, decorative by default', () => {
    wrapper = mount(MlCuteIcon, { props: { name: 'lion' } })
    const svg = wrapper.get('svg')
    expect(svg.classes()).toEqual(['ml-cute', 'ml-cute--color'])
    expect(svg.attributes('aria-hidden')).toBe('true')
    expect(svg.attributes('style')).toBeUndefined()
    expect(wrapper.findAll('path')).toHaveLength(cuteIcons.lion.length)
    expect(wrapper.get('path').classes()).toEqual(['ml-cute__layer', `ml-cute__layer--${cuteIcons.lion[0].kind}`, `ml-cute__layer--${cuteIcons.lion[0].color}`])
  })

  it('size, variant, animation, hover and title', () => {
    wrapper = mount(MlCuteIcon, { props: { name: 'heart', size: 48, variant: 'mono', animate: 'beat', hover: true, title: '愛心' } })
    const svg = wrapper.get('svg')
    expect(svg.classes()).toEqual(['ml-cute', 'ml-cute--mono', 'ml-cute--beat', 'ml-cute--hover'])
    expect(svg.attributes('style')).toContain('--_size: 48px')
    expect(svg.attributes('role')).toBe('img')
    expect(svg.attributes('aria-label')).toBe('愛心')
    expect(svg.attributes('aria-hidden')).toBeUndefined()
  })

  it('metal variant', () => {
    wrapper = mount(MlCuteIcon, { props: { name: 'cyberLion', variant: 'metal' } })
    expect(wrapper.get('svg').classes()).toEqual(['ml-cute', 'ml-cute--metal'])
    expect(wrapper.findAll('.ml-cute__layer--eye.ml-cute__layer--cyan')).toHaveLength(2)
  })

  it('hover without an animation does nothing', () => {
    wrapper = mount(MlCuteIcon, { props: { name: 'cat', size: '2rem', hover: true } })
    expect(wrapper.get('svg').classes()).toEqual(['ml-cute', 'ml-cute--color'])
    expect(wrapper.get('svg').attributes('style')).toContain('--_size: 2rem')
  })
})

/* ── Puzzle maths ───────────────────────────────────────── */
describe('puzzle maths', () => {
  it('the same seed gives the same numbers', () => {
    const a = puzzleRandom(7)
    const b = puzzleRandom(7)
    const xs = Array.from({ length: 5 }, a)
    expect(Array.from({ length: 5 }, b)).toEqual(xs)
    for (const x of xs) {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(1)
    }
  })

  it('shuffles leave no piece in its own cell', () => {
    for (let seed = 1; seed < 40; seed++) {
      const order = puzzleShuffle(9, puzzleRandom(seed))
      expect(order.slice().sort((x, y) => x - y)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])
      expect(puzzlePlaced(order)).toBe(0)
      expect(puzzleSolved(order)).toBe(false)
    }
    expect(puzzleShuffle(1, puzzleRandom(1))).toEqual([0])
  })

  it('swap, placed and solved', () => {
    expect(puzzleSwap([1, 0, 2], 0, 1)).toEqual([0, 1, 2])
    expect(puzzleSolved([0, 1, 2])).toBe(true)
    expect(puzzlePlaced([0, 2, 1, 3])).toBe(2)
  })

  it('neighbours stop at the edges', () => {
    // 2 rows × 3 cols
    expect(puzzleNeighbour(0, 'left', 2, 3)).toBe(0)
    expect(puzzleNeighbour(0, 'right', 2, 3)).toBe(1)
    expect(puzzleNeighbour(1, 'down', 2, 3)).toBe(4)
    expect(puzzleNeighbour(4, 'down', 2, 3)).toBe(4)
    expect(puzzleNeighbour(5, 'up', 2, 3)).toBe(2)
    expect(puzzleNeighbour(2, 'right', 2, 3)).toBe(2)
  })

  it('edge pieces are flat on the outside, and neighbours share their knobs exactly', () => {
    const rows = 3
    const cols = 4
    const edges = puzzleEdges(rows, cols, puzzleRandom(3))
    const paths = Array.from({ length: rows * cols }, (_, i) => puzzlePiecePath(i, cols, rows, edges, 100, 80))
    // Corner piece 0 starts at the origin.
    expect(paths[0]).toMatch(/^M0 0/)
    const pts = (d: string) => {
      const ns = numbers(d)
      return new Set(Array.from({ length: ns.length / 2 }, (_, i) => `${ns[2 * i].toFixed(1)},${ns[2 * i + 1].toFixed(1)}`))
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols - 1; c++) {
        // Points on the shared vertical edge (beyond the corners) appear in both outlines.
        const a = pts(paths[r * cols + c])
        const b = pts(paths[r * cols + c + 1])
        const shared = [...a].filter((p) => b.has(p))
        expect(shared.length).toBeGreaterThanOrEqual(14)
      }
    }
    // Nothing reaches more than 30% of a cell past the board.
    for (const d of paths) {
      const ns = numbers(d)
      for (let i = 0; i < ns.length; i += 2) {
        expect(ns[i]).toBeGreaterThanOrEqual(-24.1)
        expect(ns[i]).toBeLessThanOrEqual(424.1)
        expect(ns[i + 1]).toBeGreaterThanOrEqual(-24.1)
        expect(ns[i + 1]).toBeLessThanOrEqual(264.1)
      }
    }
  })
})

/* ── MlPuzzle ───────────────────────────────────────────── */
function pieceAt(w: VueWrapper, cell: number) {
  return w.get(`[data-cell="${cell}"]`)
}
function pieceNumber(w: VueWrapper, cell: number) {
  return Number(/第 (\d+) 塊/.exec(pieceAt(w, cell).attributes('aria-label')!)![1])
}
async function tap(w: VueWrapper, cell: number) {
  pieceAt(w, cell).element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 1 }))
  window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }))
  await nextTick()
}

describe('MlPuzzle', () => {
  it('renders a seeded board: clip paths, pieces, numbers and the toolbar', () => {
    wrapper = mount(MlPuzzle, { props: { seed: 5, rows: 2, cols: 3 } })
    expect(wrapper.classes()).toEqual(expect.arrayContaining(['ml-puzzle', 'ml-puzzle--gold', 'ml-puzzle--art']))
    expect(wrapper.findAll('clipPath')).toHaveLength(6)
    expect(wrapper.findAll('.ml-puzzle__piece')).toHaveLength(6)
    expect(wrapper.findAll('.ml-puzzle__num')).toHaveLength(6)
    expect(wrapper.find('image').exists()).toBe(false)
    expect(wrapper.get('svg').attributes('aria-label')).toBe('拼圖')
    expect(wrapper.get('.ml-puzzle__stat').text()).toBe('0 步')
    expect(wrapper.get('.ml-puzzle__stat--progress').text()).toBe('0 / 6 塊就位')
    // Only one piece is in the tab order.
    expect(wrapper.findAll('[tabindex="0"]')).toHaveLength(1)
  })

  it('the same seed deals the same board', () => {
    const a = mount(MlPuzzle, { props: { seed: 9 } })
    const b = mount(MlPuzzle, { props: { seed: 9 } })
    expect(a.findAll('.ml-puzzle__edge').map((e) => e.attributes('d'))).toEqual(b.findAll('.ml-puzzle__edge').map((e) => e.attributes('d')))
    const order = (w: VueWrapper) => Array.from({ length: 9 }, (_, i) => pieceNumber(w, i))
    expect(order(a)).toEqual(order(b))
    a.unmount()
    b.unmount()
  })

  it('a picture: image pieces, the ghost and an alt in the name', () => {
    wrapper = mount(MlPuzzle, { props: { seed: 1, src: '/lion.png', alt: '獅子', ghost: true } })
    expect(wrapper.findAll('image')).toHaveLength(10)
    expect(wrapper.find('.ml-puzzle__ghost').exists()).toBe(true)
    expect(wrapper.find('.ml-puzzle__num').exists()).toBe(false)
    expect(wrapper.get('svg').attributes('aria-label')).toBe('拼圖：獅子')
  })

  it('tap two pieces to swap them; finishing emits complete', async () => {
    wrapper = mount(MlPuzzle, { props: { seed: 4, rows: 2, cols: 2, confetti: false }, attachTo: document.body })
    for (let cell = 0; cell < 4; cell++) {
      if (pieceNumber(wrapper, cell) === cell + 1) continue
      const from = [0, 1, 2, 3].find((c) => pieceNumber(wrapper!, c) === cell + 1)!
      await tap(wrapper, from)
      expect(pieceAt(wrapper, from).attributes('aria-pressed')).toBe('true')
      expect(wrapper.classes()).toContain('ml-puzzle--picking')
      await tap(wrapper, cell)
      expect(pieceNumber(wrapper, cell)).toBe(cell + 1)
    }
    const moves = wrapper.emitted('move')!
    expect(moves.length).toBeGreaterThan(0)
    expect(moves.at(-1)![2]).toBe(moves.length)
    const done = wrapper.emitted('complete')!
    expect(done).toHaveLength(1)
    expect((done[0][0] as { moves: number }).moves).toBe(moves.length)
    expect(wrapper.classes()).toContain('ml-puzzle--solved')
    expect(wrapper.get('[aria-live]').text()).toMatch(/^完成！共 \d+ 步/)
  })

  it('placed pieces lock; tapping a piece twice puts it down', async () => {
    wrapper = mount(MlPuzzle, { props: { seed: 4, rows: 2, cols: 2 }, attachTo: document.body })
    await tap(wrapper, 0)
    await tap(wrapper, 0)
    expect(pieceAt(wrapper, 0).attributes('aria-pressed')).toBe('false')
    // Put piece 1 home, then try to move it.
    const from = [0, 1, 2, 3].find((c) => pieceNumber(wrapper!, c) === 1)!
    await tap(wrapper, from)
    await tap(wrapper, 0)
    expect(pieceAt(wrapper, 0).classes()).toContain('ml-puzzle__piece--locked')
    expect(pieceAt(wrapper, 0).attributes('aria-disabled')).toBe('true')
    await tap(wrapper, 0)
    expect(pieceAt(wrapper, 0).attributes('aria-pressed')).toBe('false')
    expect(wrapper.emitted('move')).toHaveLength(1)
  })

  it('keyboard: arrows move focus, Enter picks and swaps, Escape cancels', async () => {
    wrapper = mount(MlPuzzle, { props: { seed: 2, rows: 3, cols: 3 }, attachTo: document.body })
    const svg = wrapper.get('svg')
    const key = async (k: string) => {
      ;(document.activeElement ?? svg.element).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }))
      await nextTick()
    }
    ;(pieceAt(wrapper, 0).element as SVGGElement).focus()
    await key('ArrowRight')
    expect(document.activeElement).toBe(pieceAt(wrapper, 1).element)
    expect(pieceAt(wrapper, 1).attributes('tabindex')).toBe('0')
    await key('ArrowDown')
    expect(document.activeElement).toBe(pieceAt(wrapper, 4).element)
    await key('Enter')
    expect(pieceAt(wrapper, 4).attributes('aria-pressed')).toBe('true')
    await key('Escape')
    expect(pieceAt(wrapper, 4).attributes('aria-pressed')).toBe('false')
    const a = pieceNumber(wrapper, 4)
    const b = pieceNumber(wrapper, 8)
    await key('Enter')
    await key('End')
    expect(document.activeElement).toBe(pieceAt(wrapper, 8).element)
    await key(' ')
    // Swapped, unless one of them landed home and the other was locked (not the case for this seed).
    expect([pieceNumber(wrapper, 4), pieceNumber(wrapper, 8)]).toEqual([b, a])
    expect(wrapper.emitted('move')).toEqual([[4, 8, 1]])
  })

  it('shuffle() and solve() through a ref; the shuffle button resets the count', async () => {
    wrapper = mount(MlPuzzle, { props: { seed: 3, rows: 2, cols: 2 } })
    const vm = wrapper.vm as unknown as { solve: () => void; shuffle: () => void }
    vm.solve()
    await nextTick()
    expect(wrapper.classes()).toContain('ml-puzzle--solved')
    expect(wrapper.get('.ml-puzzle__stat--progress').text()).toBe('4 / 4 塊就位')
    await wrapper.get('.ml-puzzle__shuffle').trigger('click')
    expect(wrapper.classes()).not.toContain('ml-puzzle--solved')
    expect(wrapper.emitted('shuffle')).toHaveLength(1)
    expect(wrapper.get('.ml-puzzle__stat').text()).toBe('0 步')
  })

  it('disabled: nothing moves; toolbar can be hidden', async () => {
    wrapper = mount(MlPuzzle, { props: { seed: 3, disabled: true, toolbar: false } })
    expect(wrapper.find('.ml-puzzle__bar').exists()).toBe(false)
    await tap(wrapper, 0)
    expect(wrapper.find('[aria-pressed="true"]').exists()).toBe(false)
    expect(wrapper.get('svg').attributes('aria-disabled')).toBe('true')
  })

  it('a ratio changes the board shape; rows / cols are clamped', () => {
    wrapper = mount(MlPuzzle, { props: { seed: 1, rows: 1, cols: 40, ratio: 4 } })
    expect(wrapper.findAll('.ml-puzzle__piece')).toHaveLength(20)
    const [, , w, h] = wrapper.get('svg').attributes('viewBox')!.split(' ').map(Number)
    expect(w).toBeGreaterThan(h * 3)
  })

  it('English strings', () => {
    wrapper = mount({ render: () => h(MlConfigProvider, { locale: en }, () => h(MlPuzzle, { seed: 1, alt: 'Lion' })) })
    expect(wrapper.get('svg').attributes('aria-label')).toBe('Jigsaw puzzle: Lion')
    expect(wrapper.get('.ml-puzzle__stat').text()).toBe('0 moves')
    expect(wrapper.get('.ml-puzzle__shuffle').text()).toBe('Shuffle')
  })
})

/* ── Globe maths ────────────────────────────────────────── */
describe('globe maths', () => {
  it('decodes the land mask', () => {
    const land = globeLand()
    expect(land.length % 3).toBe(0)
    const count = land.length / 3
    // About 29% of the Earth is land.
    expect(count / GLOBE_POINT_COUNT).toBeGreaterThan(0.25)
    expect(count / GLOBE_POINT_COUNT).toBeLessThan(0.33)
    for (let i = 0; i < land.length; i += 3) expect(Math.hypot(land[i], land[i + 1], land[i + 2])).toBeCloseTo(1, 4)
  })

  it('the view centre projects to the middle, facing you', () => {
    const p = globeProject(GLOBE_HOME, GLOBE_HOME)
    expect([p.x, p.y]).toEqual([100, 100])
    expect(p.z).toBeCloseTo(1)
    expect(p.visible).toBe(true)
    // The far side is hidden; north is up, east is right.
    expect(globeProject({ lat: -23.7, lng: -59 }, GLOBE_HOME).visible).toBe(false)
    expect(globeProject({ lat: 40, lng: 121 }, GLOBE_HOME).y).toBeLessThan(100)
    expect(globeProject({ lat: 23.7, lng: 140 }, GLOBE_HOME).x).toBeGreaterThan(100)
  })

  it('normalises views and eases the short way round', () => {
    expect(globeNormalize({ lat: 100, lng: 190 })).toEqual({ lat: 85, lng: -170 })
    expect(globeNormalize({ lat: 0, lng: -180 })).toEqual({ lat: 0, lng: 180 })
    expect(globeLerpView({ lat: 0, lng: 170 }, { lat: 0, lng: -170 }, 0.5)).toEqual({ lat: 0, lng: 180 })
  })

  it('continents are land; the middle of the Pacific is not', () => {
    const near = (lat: number, lng: number) => {
      const land = globeLand()
      const [x, y, z] = [Math.cos((lat * Math.PI) / 180) * Math.sin((lng * Math.PI) / 180), Math.sin((lat * Math.PI) / 180), Math.cos((lat * Math.PI) / 180) * Math.cos((lng * Math.PI) / 180)]
      let best = 0
      for (let i = 0; i < land.length; i += 3) best = Math.max(best, land[i] * x + land[i + 1] * y + land[i + 2] * z)
      return best
    }
    // Within ~2° of a land dot: central China, the Sahara, Taiwan a little further (it's small).
    expect(near(35, 105)).toBeGreaterThan(Math.cos((2 * Math.PI) / 180))
    expect(near(23, 10)).toBeGreaterThan(Math.cos((2 * Math.PI) / 180))
    expect(near(23.7, 121)).toBeGreaterThan(Math.cos((3.5 * Math.PI) / 180))
    expect(near(0, -150)).toBeLessThan(Math.cos((5 * Math.PI) / 180))
  })

  it('dots, graticule and arcs are path strings of the front half', () => {
    const [front, side, rim] = globeDots(GLOBE_HOME)
    expect(front).toMatch(/^(M-?[\d.]+ -?[\d.]+h0)+$/)
    expect(side.length).toBeGreaterThan(0)
    expect(rim.length).toBeGreaterThan(0)
    expect(globeGraticule(GLOBE_HOME)).toMatch(/^M[\d.]+ [\d.]+(L|M)/)
    const arc = globeArcPath({ from: { lat: 25, lng: 121.5 }, to: { lat: 35.7, lng: 139.7 } }, GLOBE_HOME)
    expect(arc).toMatch(/^M[\d. ]+(L[\d. ]+)+$/)
    expect(globeArcPath({ from: GLOBE_HOME, to: GLOBE_HOME }, GLOBE_HOME)).toBe('')
    // Taipei → New York runs off the visible side.
    expect(globeArcPath({ from: { lat: 25, lng: 121.5 }, to: { lat: 40.7, lng: -74 } }, GLOBE_HOME)).toMatch(/^M/)
  })

  it('distance and formatting', () => {
    expect(globeDistance({ lat: 0, lng: 0 }, { lat: 0, lng: 90 })).toBeCloseTo(90)
    expect(globeDistance({ lat: 90, lng: 0 }, { lat: -90, lng: 0 })).toBeCloseTo(180)
    expect(globeFormatPoint({ lat: 25.033, lng: 121.565 })).toBe('25.03°N, 121.57°E')
    expect(globeFormatPoint({ lat: -33.87, lng: -70.6 })).toBe('33.87°S, 70.6°W')
  })
})

/* ── MlGlobe ────────────────────────────────────────────── */
describe('MlGlobe', () => {
  const markers = [
    { lat: 25.03, lng: 121.56, label: '臺北' },
    { lat: 40.71, lng: -74.01, label: 'New York', tone: 'tech' as const },
  ]

  it('renders land, grid, markers and arcs facing Taiwan', () => {
    wrapper = mount(MlGlobe, { props: { markers, arcs: [{ from: markers[0], to: { lat: 35.68, lng: 139.69 } }], autoRotate: false } })
    expect(wrapper.classes()).toEqual(['ml-globe', 'ml-globe--gold', 'ml-globe--draggable', 'ml-globe--atmosphere'])
    expect(wrapper.findAll('.ml-globe__land')).toHaveLength(3)
    expect(wrapper.find('.ml-globe__grid').exists()).toBe(true)
    expect(wrapper.findAll('.ml-globe__arc')).toHaveLength(1)
    expect(wrapper.get('.ml-globe__arc-glint').attributes('pathLength')).toBe('1')
    const [taipei, ny] = wrapper.findAll('.ml-globe__marker')
    expect(taipei.attributes('aria-label')).toBe('臺北（25.03°N, 121.56°E）')
    expect(taipei.attributes('tabindex')).toBe('0')
    expect(ny.classes()).toContain('ml-globe__marker--back')
    expect(ny.classes()).toContain('ml-globe__marker--tech')
    expect(ny.attributes('tabindex')).toBe('-1')
    expect(wrapper.get('svg').attributes('aria-label')).toBe('地球，2 個標記. 方向鍵旋轉，Home 回到起點')
  })

  it('options: tone, size, no grid, no halo, labels', () => {
    wrapper = mount(MlGlobe, { props: { markers, tone: 'bean', size: 200, graticule: false, atmosphere: false, labels: true, draggable: false, autoRotate: false } })
    expect(wrapper.classes()).toEqual(['ml-globe', 'ml-globe--bean'])
    expect(wrapper.attributes('style')).toContain('--_size: 200px')
    expect(wrapper.find('.ml-globe__grid').exists()).toBe(false)
    expect(wrapper.get('.ml-globe__label').text()).toBe('臺北')
  })

  it('a marker: hover shows its name; click / Enter selects', async () => {
    wrapper = mount(MlGlobe, { props: { markers, autoRotate: false, flyToMarker: false }, attachTo: document.body })
    const taipei = wrapper.get('.ml-globe__marker')
    await taipei.trigger('pointerenter')
    expect(wrapper.get('.ml-globe__tip').text()).toBe('臺北')
    expect(taipei.classes()).toContain('ml-globe__marker--active')
    await taipei.trigger('pointerleave')
    expect(wrapper.find('.ml-globe__tip').exists()).toBe(false)
    await taipei.trigger('click')
    await taipei.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('select')).toEqual([
      [markers[0], 0],
      [markers[0], 0],
    ])
  })

  it('arrow keys and Home turn the globe; flyTo through a ref', async () => {
    const raf = vi.spyOn(window, 'matchMedia').mockImplementation((q: string) => ({ matches: q.includes('reduce'), media: q }) as MediaQueryList)
    wrapper = mount(MlGlobe, { props: { markers, autoRotate: false } })
    const marker = () => wrapper!.get('.ml-globe__marker').attributes('transform')
    expect(marker()).toBe('translate(100.8 97.9)')
    await wrapper.get('svg').trigger('keydown', { key: 'ArrowLeft' })
    expect(marker()).not.toBe('translate(100.8 97.9)')
    await wrapper.get('svg').trigger('keydown', { key: 'Home' })
    expect(marker()).toBe('translate(100.8 97.9)')
    ;(wrapper.vm as unknown as { flyTo: (p: { lat: number; lng: number }) => void }).flyTo(markers[0])
    await nextTick()
    expect(marker()).toBe('translate(100 100)')
    raf.mockRestore()
  })

  it('English strings', () => {
    wrapper = mount({ render: () => h(MlConfigProvider, { locale: en }, () => h(MlGlobe, { markers, autoRotate: false })) })
    expect(wrapper.get('svg').attributes('aria-label')).toBe('Globe with 2 markers. Arrow keys rotate, Home goes back')
    expect(wrapper.get('.ml-globe__marker').attributes('aria-label')).toBe('臺北 (25.03°N, 121.56°E)')
  })
})
