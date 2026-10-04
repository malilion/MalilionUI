// MlAurora, MlParticles, MlRadar and MlClock: their framework-free maths, then the Vue components.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSSRApp, h, nextTick } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { mount, type VueWrapper } from '@vue/test-utils'
import { MlAurora, MlClock, MlConfigProvider, MlParticles, MlRadar, en } from '../src'
import { motionGate, ambientRandom } from '../src/components/ambient'
import { AURORA_BLOBS, auroraPalette, auroraVars } from '../src/components/aurora'
import {
  PARTICLE_MAX_SPARKS,
  particleBurst,
  particleCount,
  particleField,
  particleLinks,
  particleResize,
  particleStep,
  type Particle,
} from '../src/components/particles'
import {
  RADAR_GLOW_FLOOR,
  RADAR_REST_ANGLE,
  radarBearing,
  radarGlow,
  radarPolar,
  radarPosition,
  radarRangeLabels,
  radarRings,
  radarSweepAngle,
  radarTicks,
} from '../src/components/radar'
import {
  CLOCK_TICK_MS,
  clockAngles,
  clockDigital,
  clockFormatOffset,
  clockMarks,
  clockNumerals,
  clockOffset,
  clockTickEase,
  clockTime,
  clockZoneValid,
} from '../src/components/clock'

let wrapper: VueWrapper | undefined
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  vi.useRealTimers()
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

/** matchMedia that reports reduced motion. */
const reduceMotion = () =>
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList,
  )

/** A canvas 2D context that records the calls made on it. */
function fakeContext() {
  const calls: string[] = []
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (target, key: string) => (key in target ? target[key] : (...args: unknown[]) => calls.push(`${key}(${args.length})`)),
    set: (target, key: string, v) => ((target[key] = v), true),
  })
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D)
  return calls
}

/* ── Shared ─────────────────────────────────────────────── */
describe('ambient helpers', () => {
  it('ambientRandom is seeded and in [0, 1)', () => {
    const a = ambientRandom(3)
    const b = ambientRandom(3)
    const xs = Array.from({ length: 50 }, () => a())
    expect(xs).toEqual(Array.from({ length: 50 }, () => b()))
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true)
    expect(ambientRandom(4)()).not.toBe(xs[0])
  })

  it('motionGate: hidden tab and reduced motion stop it; cleanup removes listeners', () => {
    const states: boolean[] = []
    const el = document.createElement('div')
    const stop = motionGate(el, (s) => states.push(s.running))
    expect(states).toEqual([true])
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(states).toEqual([true, false])
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(states).toEqual([true, false, true])
    stop()
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(states).toHaveLength(3)
    // @ts-expect-error restore the prototype getter
    delete document.visibilityState
    reduceMotion()
    const reduced: [boolean, boolean][] = []
    motionGate(el, (s) => reduced.push([s.running, s.reduced]))()
    expect(reduced).toEqual([[false, true]])
  })
})

/* ── Aurora ─────────────────────────────────────────────── */
describe('aurora', () => {
  it('vars clamp and round; custom colours cycle over the blobs', () => {
    expect(auroraVars({})).toEqual({ '--_au-intensity': '0.7', '--_au-speed': '1' })
    expect(auroraVars({ intensity: 3, speed: 0 })).toEqual({ '--_au-intensity': '1', '--_au-speed': '0.05' })
    const v = auroraVars({ colors: ['red', 'blue'] })
    expect(Object.keys(v).filter((k) => k.startsWith('--_au-c'))).toHaveLength(AURORA_BLOBS)
    expect([v['--_au-c1'], v['--_au-c2'], v['--_au-c3'], v['--_au-c4']]).toEqual(['red', 'blue', 'red', 'blue'])
    expect(auroraPalette('night')).toBe('night')
    expect(auroraPalette(['#fff'])).toBe('custom')
    expect(auroraPalette([])).toBe('pride')
    expect(auroraPalette('nope' as never)).toBe('pride')
  })

  it('MlAurora: classes, variables, slot on top', () => {
    wrapper = mount(MlAurora, { props: { palette: 'circuit', intensity: 0.4, speed: 2, scanlines: true }, slots: { default: '<h1>Hi</h1>' } })
    expect(wrapper.classes()).toEqual(['ml-aurora', 'ml-aurora--circuit', 'ml-aurora--grain', 'ml-aurora--scanlines'])
    expect(wrapper.attributes('style')).toContain('--_au-intensity: 0.4')
    expect(wrapper.attributes('style')).toContain('--_au-speed: 2')
    expect(wrapper.findAll('.ml-aurora__blob')).toHaveLength(4)
    expect(wrapper.get('.ml-aurora__sky').attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('.ml-aurora__content h1').text()).toBe('Hi')
  })

  it('MlAurora: custom colours, paused, no content wrapper without a slot, tag', async () => {
    wrapper = mount(MlAurora, { props: { palette: ['#123456'], grain: false, tag: 'section' } })
    expect(wrapper.element.tagName).toBe('SECTION')
    expect(wrapper.classes()).toEqual(['ml-aurora', 'ml-aurora--custom'])
    expect(wrapper.attributes('style')).toContain('--_au-c4: #123456')
    expect(wrapper.find('.ml-aurora__content').exists()).toBe(false)
    await wrapper.setProps({ paused: true })
    expect(wrapper.classes()).toContain('ml-aurora--paused')
  })

  it('MlAurora pauses while the tab is hidden', async () => {
    wrapper = mount(MlAurora)
    expect(wrapper.classes()).not.toContain('ml-aurora--paused')
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
    await nextTick()
    expect(wrapper.classes()).toContain('ml-aurora--paused')
    // @ts-expect-error restore the prototype getter
    delete document.visibilityState
  })
})

/* ── Particles ──────────────────────────────────────────── */
describe('particles maths', () => {
  const brute = (ps: Particle[], d: number) => {
    const out: string[] = []
    for (let i = 0; i < ps.length; i++)
      for (let j = i + 1; j < ps.length; j++) if (Math.hypot(ps[i].x - ps[j].x, ps[i].y - ps[j].y) < d) out.push(`${i}-${j}`)
    return out.sort()
  }
  const pairs = (flat: number[]) => {
    const out: string[] = []
    for (let k = 0; k < flat.length; k += 3) out.push(`${flat[k]}-${flat[k + 1]}`)
    return out.sort()
  }

  it('count scales with area, with a floor and a cap', () => {
    expect(particleCount(1000, 500, 1)).toBe(50)
    expect(particleCount(1000, 500, 2)).toBe(100)
    expect(particleCount(4000, 4000, 1.2, 220)).toBe(220)
    expect(particleCount(10, 10, 1)).toBe(2)
    expect(particleCount(0, 500)).toBe(0)
    expect(particleCount(500, 500, 0)).toBe(0)
  })

  it('a seeded field is deterministic and inside the box', () => {
    const a = particleField(400, 300, 40, 5)
    const b = particleField(400, 300, 40, 5)
    expect(a.particles).toEqual(b.particles)
    expect(a.particles.every((p) => p.x >= 0 && p.x <= 400 && p.y >= 0 && p.y <= 300)).toBe(true)
    expect(particleField(400, 300, 40, 6).particles[0]).not.toEqual(a.particles[0])
  })

  it('grid neighbour search finds exactly the brute-force pairs', () => {
    for (const [w, h, n, d, seed] of [
      [400, 300, 80, 60, 1],
      [800, 200, 150, 110, 2],
      [90, 90, 30, 200, 3],
      [500, 500, 120, 37, 4],
    ]) {
      const f = particleField(w, h, n, seed)
      // Some particles past the edges (they wrap with a margin).
      f.particles[0].x = -10
      f.particles[1].y = h + 10
      const links = particleLinks(f.particles, d, w, h)
      expect(pairs(links)).toEqual(brute(f.particles, d))
      for (let k = 2; k < links.length; k += 3) expect(links[k]).toBeGreaterThan(0)
      for (let k = 2; k < links.length; k += 3) expect(links[k]).toBeLessThanOrEqual(1)
    }
    expect(particleLinks(particleField(100, 100, 10).particles, 0, 100, 100)).toEqual([])
  })

  it('links reuse the output array and skip sparks', () => {
    const f = particleField(100, 100, 2, 1)
    f.particles[0].x = f.particles[0].y = 10
    f.particles[1].x = f.particles[1].y = 20
    const out = [9, 9, 9, 9]
    expect(particleLinks(f.particles, 50, 100, 100, out)).toBe(out)
    expect(out.slice(0, 2)).toEqual([0, 1])
    expect(out[2]).toBeCloseTo(1 - Math.hypot(10, 10) / 50)
    f.particles[1].life = 1
    expect(particleLinks(f.particles, 50, 100, 100)).toEqual([])
  })

  it('drift and wrap', () => {
    const f = particleField(100, 100, 1, 1)
    const p = f.particles[0]
    Object.assign(p, { x: 99, y: 50, vx: 100, vy: 0, bx: 100, by: 0 })
    particleStep(f, 0.2)
    expect(p.x).toBeLessThan(20) // 119 → wrapped past the 12 px margin
    expect(p.y).toBe(50)
  })

  it('repel pushes away, attract pulls in, none ignores the pointer', () => {
    const at = (interaction: 'repel' | 'attract' | 'none') => {
      const f = particleField(200, 200, 1, 1)
      Object.assign(f.particles[0], { x: 110, y: 100, vx: 0, vy: 0, bx: 0, by: 0 })
      particleStep(f, 0.05, { pointer: { x: 100, y: 100 }, interaction })
      return f.particles[0].x
    }
    expect(at('repel')).toBeGreaterThan(110)
    expect(at('attract')).toBeLessThan(110)
    expect(at('none')).toBe(110)
  })

  it('burst shoves neighbours, throws capped sparks that fade out', () => {
    const f = particleField(200, 200, 1, 1)
    Object.assign(f.particles[0], { x: 120, y: 100, vx: 0, vy: 0 })
    expect(particleBurst(f, 100, 100, { count: 10 })).toBe(10)
    expect(f.particles[0].vx).toBeGreaterThan(0)
    expect(f.particles).toHaveLength(11)
    for (let i = 0; i < 10; i++) particleBurst(f, 100, 100, { count: 10 })
    expect(f.particles.filter((p) => p.life !== undefined)).toHaveLength(PARTICLE_MAX_SPARKS)
    for (let i = 0; i < 40; i++) particleStep(f, 0.05)
    expect(f.particles).toHaveLength(1)
  })

  it('resize scales positions and adds or drops particles', () => {
    const f = particleField(100, 100, 10, 1)
    const x0 = f.particles[0].x
    particleResize(f, 200, 100, 4)
    expect(f.particles).toHaveLength(4)
    expect(f.particles[0].x).toBeCloseTo(x0 * 2)
    particleResize(f, 200, 100, 12)
    expect(f.particles).toHaveLength(12)
  })
})

describe('MlParticles', () => {
  it('renders a hidden canvas under the content', () => {
    wrapper = mount(MlParticles, { props: { tone: 'tech' }, slots: { default: '<p>Hi</p>' } })
    expect(wrapper.classes()).toEqual(['ml-particles', 'ml-particles--tech', 'ml-particles--burst'])
    expect(wrapper.get('canvas').attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('.ml-particles__content').text()).toBe('Hi')
  })

  it('draws, animates with rAF, honours paused and cleans up on unmount', async () => {
    const calls = fakeContext()
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })
    wrapper = mount(MlParticles, { props: { burst: false }, attachTo: document.body })
    expect(calls.some((c) => c.startsWith('clearRect'))).toBe(true)
    const before = calls.length
    vi.advanceTimersByTime(100)
    expect(calls.length).toBeGreaterThan(before)
    await wrapper.setProps({ paused: true })
    const paused = calls.length
    vi.advanceTimersByTime(200)
    expect(calls.length).toBe(paused)
    await wrapper.setProps({ paused: false })
    const remove = vi.spyOn(wrapper.element, 'removeEventListener')
    wrapper.unmount()
    wrapper = undefined
    expect(remove.mock.calls.map((c) => c[0])).toEqual(expect.arrayContaining(['click', 'pointerleave', 'pointermove']))
    const after = calls.length
    vi.advanceTimersByTime(200)
    expect(calls.length).toBe(after)
  })

  it('reduced motion: one still frame, no loop, no bursts', () => {
    const calls = fakeContext()
    reduceMotion()
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
    wrapper = mount(MlParticles, { attachTo: document.body })
    const n = calls.length
    expect(n).toBeGreaterThan(0)
    wrapper.element.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 10, clientY: 10 }))
    ;(wrapper.vm as unknown as { burst: (x: number, y: number) => void }).burst(5, 5)
    vi.advanceTimersByTime(500)
    expect(calls.length).toBe(n)
  })
})

/* ── Radar ──────────────────────────────────────────────── */
describe('radar maths', () => {
  it('polar from angle/distance or x/y', () => {
    expect(radarPolar({ angle: 450, distance: 2 })).toEqual({ angle: 90, distance: 1 })
    expect(radarPolar({ angle: -90, distance: -1 })).toEqual({ angle: 270, distance: 0 })
    expect(radarPolar({ x: 1, y: 0 })).toEqual({ angle: 90, distance: 1 })
    expect(radarPolar({ x: 0, y: -0.5 })).toEqual({ angle: 180, distance: 0.5 })
    expect(radarPolar({ x: -0.3, y: 0.3 }).angle).toBe(315)
  })

  it('positions on the scope', () => {
    expect(radarPosition({ angle: 0, distance: 0 })).toEqual({ left: 50, top: 50 })
    expect(radarPosition({ angle: 0, distance: 1 })).toEqual({ left: 50, top: 2 })
    expect(radarPosition({ angle: 90, distance: 1 })).toEqual({ left: 98, top: 50 })
    expect(radarPosition({ x: 0, y: -1 })).toEqual({ left: 50, top: 98 })
  })

  it('glow peaks as the beam passes, then fades to the floor', () => {
    expect(radarGlow(30, 30)).toBe(1)
    expect(radarGlow(60, 30)).toBeLessThan(1)
    expect(radarGlow(60, 30)).toBeGreaterThan(radarGlow(120, 30))
    expect(radarGlow(29, 30)).toBe(RADAR_GLOW_FLOOR) // just ahead of the beam: not lit yet
    expect(radarGlow(10, 350)).toBeGreaterThan(0.8) // across north
    expect(radarGlow(20, 30, 90, false)).toBeGreaterThan(0.8) // anticlockwise
  })

  it('sweep, rings, ticks, labels, bearings', () => {
    expect(radarSweepAngle(0, 90)).toBe(RADAR_REST_ANGLE)
    expect(radarSweepAngle(4000, 90, 0)).toBe(0)
    expect(radarSweepAngle(1000, -90, 0)).toBe(270)
    expect(radarRings(4)).toEqual([24, 48, 72, 96])
    expect(radarTicks().match(/M/g)).toHaveLength(36)
    expect(radarRangeLabels(4, { range: 100, unit: 'km' })).toEqual(['25 km', '50 km', '75 km', '100 km'])
    expect(radarRangeLabels(3, { range: 10 })).toEqual(['3.3', '6.7', '10'])
    expect(radarRangeLabels(2, { labels: ['a', 'b', 'c'], range: 5 })).toEqual(['a', 'b'])
    expect(radarRangeLabels(2, {})).toEqual([])
    expect(radarBearing(45)).toBe('045°')
    expect(radarBearing(359.6)).toBe('000°')
  })
})

describe('MlRadar', () => {
  const blips = [
    { angle: 45, distance: 0.5, label: 'Alpha' },
    { x: 0, y: -1, tone: 'danger' as const },
  ]

  it('rings, crosshair, blips as described buttons', () => {
    wrapper = mount(MlRadar, { props: { blips } })
    expect(wrapper.classes()).toEqual(['ml-radar-scope', 'ml-radar-scope--tech'])
    expect(wrapper.findAll('.ml-radar-scope__ring')).toHaveLength(4)
    expect(wrapper.get('.ml-radar-scope__screen').attributes('aria-label')).toBe('雷達，2 個目標')
    const [a, b] = wrapper.findAll('button')
    expect(a.attributes('aria-label')).toBe('Alpha：方位 045°，距離 50%')
    expect(b.attributes('aria-label')).toBe('目標：方位 180°，距離 100%')
    expect(b.classes()).toContain('ml-radar-scope__blip--danger')
    expect(b.attributes('style')).toContain('left: 50%; top: 98%')
    expect(a.attributes('style')).toMatch(/--_rd-glow: 0\.\d+/)
    expect(a.get('.ml-radar-scope__tip').text()).toBe('Alpha')
    expect(b.find('.ml-radar-scope__tip').exists()).toBe(false)
  })

  it('click selects and shows the label; Escape clears', async () => {
    wrapper = mount(MlRadar, { props: { blips }, attachTo: document.body })
    const a = wrapper.get('button')
    await a.trigger('click')
    expect(wrapper.emitted('select')).toEqual([[blips[0], 0]])
    expect(a.classes()).toContain('ml-radar-scope__blip--active')
    expect(a.attributes('aria-pressed')).toBe('true')
    await a.trigger('keydown', { key: 'Escape' })
    expect(a.classes()).not.toContain('ml-radar-scope__blip--active')
  })

  it('range labels and units; anticlockwise; English', () => {
    wrapper = mount(MlRadar, { props: { blips, range: 40, unit: 'nm', rings: 2, speed: -30 } })
    expect(wrapper.findAll('.ml-radar-scope__range').map((t) => t.text())).toEqual(['20 nm', '40 nm'])
    expect(wrapper.get('button').attributes('aria-label')).toBe('Alpha：方位 045°，距離 20 nm')
    expect(wrapper.classes()).toContain('ml-radar-scope--ccw')
    wrapper.unmount()
    wrapper = mount({ render: () => h(MlConfigProvider, { locale: en }, () => h(MlRadar, { blips: [blips[0]] })) })
    expect(wrapper.get('.ml-radar-scope__screen').attributes('aria-label')).toBe('Radar with 1 contact')
    expect(wrapper.get('button').attributes('aria-label')).toBe('Alpha: bearing 045°, range 50%')
  })

  it('the loop turns the sweep and lights blips; paused and unmount stop it', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
    wrapper = mount(MlRadar, { props: { blips }, attachTo: document.body })
    const sweep = wrapper.get('.ml-radar-scope__sweep').element as HTMLElement
    vi.advanceTimersByTime(500)
    const a1 = sweep.style.getPropertyValue('--_rd-live')
    expect(a1).toMatch(/deg$/)
    expect((wrapper.get('button').element as HTMLElement).style.getPropertyValue('--_rd-live')).not.toBe('')
    vi.advanceTimersByTime(300)
    expect(sweep.style.getPropertyValue('--_rd-live')).not.toBe(a1)
    await wrapper.setProps({ paused: true })
    const frozen = sweep.style.getPropertyValue('--_rd-live')
    vi.advanceTimersByTime(500)
    expect(sweep.style.getPropertyValue('--_rd-live')).toBe(frozen)
    wrapper.unmount()
    wrapper = undefined
    expect(vi.getTimerCount()).toBe(0)
  })

  it('reduced motion: the still frame stays', () => {
    reduceMotion()
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
    wrapper = mount(MlRadar, { props: { blips }, attachTo: document.body })
    vi.advanceTimersByTime(500)
    expect((wrapper.get('.ml-radar-scope__sweep').element as HTMLElement).style.getPropertyValue('--_rd-live')).toBe('')
    expect(wrapper.get('.ml-radar-scope__sweep').attributes('style')).toContain(`--_rd-a: ${RADAR_REST_ANGLE}deg`)
  })
})

/* ── Clock ──────────────────────────────────────────────── */
describe('clock maths', () => {
  const winter = new Date(Date.UTC(2026, 0, 15, 12, 34, 56, 789))
  const summer = new Date(Date.UTC(2026, 6, 15, 12, 34, 56, 0))

  it('wall time in IANA zones (DST-aware)', () => {
    expect(clockTime(winter, 'Asia/Taipei')).toEqual({ h: 20, m: 34, s: 56, ms: 789 })
    expect(clockTime(winter, 'Asia/Tokyo').h).toBe(21)
    expect(clockTime(winter, 'Europe/London').h).toBe(12)
    expect(clockTime(summer, 'Europe/London').h).toBe(13)
    expect(clockTime(winter, 'America/New_York').h).toBe(7)
    expect(clockTime(summer, 'America/New_York').h).toBe(8)
    expect(clockTime(winter, 'Asia/Kolkata')).toMatchObject({ h: 18, m: 4 })
    expect(clockTime(new Date(Date.UTC(2026, 0, 1, 16, 0, 0)), 'Asia/Taipei').h).toBe(0) // midnight is 0, not 24
  })

  it('offsets and their labels', () => {
    expect(clockOffset(winter, 'Asia/Taipei')).toBe(480)
    expect(clockOffset(winter, 'America/New_York')).toBe(-300)
    expect(clockOffset(summer, 'America/New_York')).toBe(-240)
    expect(clockOffset(winter, 'Asia/Kolkata')).toBe(330)
    expect(clockOffset(winter, 'UTC')).toBe(0)
    expect(clockFormatOffset(480)).toBe('UTC+8')
    expect(clockFormatOffset(330)).toBe('UTC+5:30')
    expect(clockFormatOffset(-210)).toBe('UTC−3:30')
    expect(clockFormatOffset(0)).toBe('UTC')
  })

  it('unknown zones fall back to local time instead of throwing', () => {
    expect(clockZoneValid('Mars/Olympus')).toBe(false)
    expect(clockZoneValid('Asia/Taipei')).toBe(true)
    expect(clockTime(winter, 'Mars/Olympus')).toEqual({ h: winter.getHours(), m: winter.getMinutes(), s: winter.getSeconds(), ms: 789 })
    expect(clockTime(new Date('nope'))).toEqual({ h: 10, m: 10, s: 30, ms: 0 })
  })

  it('hand angles', () => {
    expect(clockAngles({ h: 15, m: 0, s: 0, ms: 0 })).toEqual({ hour: 90, minute: 0, second: 0 })
    expect(clockAngles({ h: 6, m: 30, s: 0, ms: 0 })).toEqual({ hour: 195, minute: 180, second: 0 })
    expect(clockAngles({ h: 0, m: 0, s: 30, ms: 500 }, 'sweep').second).toBe(183)
    expect(clockAngles({ h: 0, m: 0, s: 30, ms: 0 }, 'tick').second).toBe(174) // still leaving 29
    expect(clockAngles({ h: 0, m: 0, s: 30, ms: CLOCK_TICK_MS }, 'tick').second).toBe(180)
    expect(clockAngles({ h: 0, m: 0, s: 30, ms: 700 }, 'still').second).toBe(180)
  })

  it('the tick overshoots a little, then settles', () => {
    const samples = Array.from({ length: 21 }, (_, i) => clockTickEase(i / 20))
    expect(samples[0]).toBe(0)
    expect(samples[20]).toBe(1)
    const peak = Math.max(...samples)
    expect(peak).toBeGreaterThan(1)
    expect(peak).toBeLessThan(1.2)
  })

  it('digital readout, marks and numerals', () => {
    expect(clockDigital({ h: 9, m: 5, s: 7, ms: 0 })).toBe('09:05:07')
    expect(clockDigital({ h: 23, m: 59, s: 7, ms: 0 }, false)).toBe('23:59')
    const { minor, major } = clockMarks()
    expect(minor.match(/M/g)).toHaveLength(48)
    expect(major.match(/M/g)).toHaveLength(12)
    expect(clockNumerals('arabic').map((n) => n.text)).toEqual(['12', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'])
    expect(clockNumerals('roman')[3]).toMatchObject({ text: 'III', y: 100 })
    expect(clockNumerals('none')).toEqual([])
  })
})

describe('MlClock', () => {
  const moment = Date.UTC(2026, 0, 15, 12, 34, 56)

  it('a frozen clock: angles, label, readout, offset', () => {
    wrapper = mount(MlClock, { props: { time: moment, timeZone: 'Asia/Taipei', label: '台北', digital: true, offset: true } })
    expect(wrapper.classes()).toEqual(['ml-clock', 'ml-clock--gold', 'ml-clock--tick'])
    expect(wrapper.get('.ml-clock__face').attributes('role')).toBe('img')
    expect(wrapper.get('.ml-clock__face').attributes('aria-label')).toBe('台北 下午 8:34')
    expect(wrapper.get('.ml-clock__hand--hour').attributes('style')).toContain(`--_ck-a: ${clockAngles({ h: 20, m: 34, s: 56, ms: 0 }).hour}deg`)
    expect(wrapper.get('.ml-clock__hand--minute').attributes('style')).toContain('--_ck-a: 209.6deg')
    expect(wrapper.get('.ml-clock__hand--second').attributes('style')).toContain('--_ck-a: 336deg')
    expect(wrapper.get('time').text()).toBe('20:34:56')
    expect(wrapper.get('time').attributes('datetime')).toBe('20:34:56')
    expect(wrapper.get('.ml-clock__label').text()).toBe('台北')
    expect(wrapper.get('.ml-clock__offset').text()).toBe('UTC+8')
    expect(wrapper.findAll('.ml-clock__numeral')).toHaveLength(12)
    expect(wrapper.find('.ml-clock__crest .ml-lion-mark').exists()).toBe(true)
  })

  it('options: roman, no seconds, no crest, tone, size; English', () => {
    wrapper = mount(MlClock, { props: { time: moment, timeZone: 'America/New_York', numerals: 'roman', seconds: false, crest: false, tone: 'tech', size: 120 } })
    expect(wrapper.classes()).toContain('ml-clock--tech')
    expect(wrapper.attributes('style')).toContain('--_ck-size: 120px')
    expect(wrapper.find('.ml-clock__hand--second').exists()).toBe(false)
    expect(wrapper.find('.ml-clock__crest').exists()).toBe(false)
    expect(wrapper.find('figcaption').exists()).toBe(false)
    expect(wrapper.get('.ml-clock__numeral').text()).toBe('XII')
    expect(wrapper.get('.ml-clock__face').attributes('aria-label')).toBe('上午 7:34')
    wrapper.unmount()
    wrapper = mount({ render: () => h(MlConfigProvider, { locale: en }, () => h(MlClock, { time: moment, timeZone: 'Asia/Tokyo', label: 'Tokyo' })) })
    expect(wrapper.get('.ml-clock__face').attributes('aria-label')).toBe('Tokyo, 9:34 PM')
  })

  it('a live clock ticks from `now`; the name changes once a minute', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'] })
    let t = Date.UTC(2026, 0, 15, 4, 59, 58, 500)
    wrapper = mount(MlClock, { props: { now: () => t, timeZone: 'Asia/Taipei', label: '台北' }, attachTo: document.body })
    await nextTick()
    const face = wrapper.get('.ml-clock__face')
    expect(face.attributes('aria-label')).toBe('台北 下午 12:59')
    const sec = wrapper.get('.ml-clock__hand--second').element as HTMLElement
    expect(sec.style.getPropertyValue('--_ck-live')).toBe('348deg')
    t += 1600 // 13:00:00.100 — mid-overshoot
    vi.advanceTimersByTime(600)
    await nextTick()
    expect(face.attributes('aria-label')).toBe('台北 下午 1:00')
    expect(wrapper.get('.ml-clock__hand--minute').element.getAttribute('style')).toContain('--_ck-live: 0deg')
    wrapper.unmount()
    wrapper = undefined
    expect(vi.getTimerCount()).toBe(0)
  })

  it('a live readout updates every second; switching to a fixed time stops the loop', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'] })
    let t = Date.UTC(2026, 0, 15, 0, 0, 10, 900)
    reduceMotion()
    wrapper = mount(MlClock, { props: { now: () => t, timeZone: 'UTC', digital: true }, attachTo: document.body })
    await nextTick()
    expect(wrapper.get('time').text()).toBe('00:00:10')
    t += 1000
    vi.advanceTimersByTime(1000)
    await nextTick()
    expect(wrapper.get('time').text()).toBe('00:00:11')
    await wrapper.setProps({ time: Date.UTC(2026, 0, 15, 6, 0, 0) })
    expect(vi.getTimerCount()).toBe(0)
    expect(wrapper.get('time').text()).toBe('06:00:00')
    expect((wrapper.get('.ml-clock__hand--hour').element as HTMLElement).style.getPropertyValue('--_ck-live')).toBe('')
  })

  it('server render of a live clock is deterministic: the 10:10 pose and a plain name', async () => {
    const html = await renderToString(createSSRApp({ render: () => h(MlClock, { digital: true, label: '台北', timeZone: 'Asia/Taipei' }) }))
    expect(html).toContain('aria-label="台北"')
    expect(html).toContain('--:--:--')
    expect(html).toContain(`--_ck-a:${clockAngles({ h: 10, m: 10, s: 30, ms: 0 }).hour}deg`)
    expect(html).not.toContain('--_ck-live')
  })
})
