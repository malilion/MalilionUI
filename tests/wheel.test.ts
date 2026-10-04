import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import { MlConfigProvider, MlLuckyWheel, en, type MlWheelPrize } from '../src'
import {
  FADE_MS,
  RAMP_MS,
  WheelSpinner,
  cruiseAngle,
  indexAtPointer,
  landingOffset,
  landingRotation,
  luminance,
  mod,
  overshootFor,
  pickWeighted,
  pointerKick,
  prizeOdds,
  sliceTone,
  slicePath,
  spinAngle,
  wheelSlices,
} from '../src/components/wheel'

/** Deterministic PRNG (mulberry32) so distribution tests are repeatable. */
function seeded(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const six: MlWheelPrize[] = ['A', 'B', 'C', 'D', 'E', 'F'].map((label) => ({ label }))

describe('wheel maths', () => {
  it('picks by weight with the expected distribution (seeded)', () => {
    const prizes: MlWheelPrize[] = [{ label: 'big', weight: 1 }, { label: 'mid', weight: 9 }, { label: 'none', weight: 0 }, { label: 'gone', weight: 50, disabled: true }, { label: 'small', weight: 30 }]
    const random = seeded(42)
    const counts = [0, 0, 0, 0, 0]
    const N = 40000
    for (let i = 0; i < N; i++) counts[pickWeighted(prizes, random)]++
    expect(counts[2]).toBe(0)
    expect(counts[3]).toBe(0)
    expect(counts[0] / N).toBeCloseTo(1 / 40, 2)
    expect(counts[1] / N).toBeCloseTo(9 / 40, 2)
    expect(counts[4] / N).toBeCloseTo(30 / 40, 2)
    expect(prizeOdds(prizes)).toEqual([1 / 40, 9 / 40, 0, 0, 30 / 40])
  })

  it('defaults weight to 1 and returns -1 when nothing can win', () => {
    const random = seeded(7)
    const counts = [0, 0, 0]
    for (let i = 0; i < 9000; i++) counts[pickWeighted(six.slice(0, 3), random)]++
    for (const c of counts) expect(c / 9000).toBeCloseTo(1 / 3, 1)
    expect(pickWeighted([{ label: 'x', disabled: true }, { label: 'y', weight: 0 }])).toBe(-1)
    expect(pickWeighted([])).toBe(-1)
    // Edge of the random range still lands on a real prize.
    expect(pickWeighted(six, () => 0.999999999)).toBe(5)
    expect(pickWeighted(six, () => 0)).toBe(0)
  })

  it('maps a rotation to the slice under the top pointer', () => {
    // Slice i spans [i·60°, (i+1)·60°] clockwise from the top.
    expect(indexAtPointer(0, 6)).toBe(0)
    expect(indexAtPointer(-30, 6)).toBe(0)
    expect(indexAtPointer(-90, 6)).toBe(1)
    // Turning the wheel clockwise brings the *previous* slices under the pointer.
    expect(indexAtPointer(30, 6)).toBe(5)
    expect(indexAtPointer(3600 + 330, 6)).toBe(0)
    expect(indexAtPointer(-719, 4)).toBe(3)
    expect(indexAtPointer(10, 0)).toBe(-1)
  })

  it('computes landing rotations that end on the target after enough turns', () => {
    for (const from of [0, 17.5, 359, 1234.5, -80]) {
      for (let index = 0; index < 6; index++) {
        for (const offset of [0.32, 0.5, 0.76]) {
          const to = landingRotation(from, index, 6, 5, offset)
          expect(to).toBeGreaterThanOrEqual(from + 5 * 360)
          expect(to).toBeLessThan(from + 6 * 360)
          expect(indexAtPointer(to, 6)).toBe(index)
          // Exactly `offset` of the way into the slice.
          expect(mod(-to, 360) / 60 - index).toBeCloseTo(offset, 6)
        }
      }
    }
    expect(landingOffset(() => 0)).toBeCloseTo(0.32)
    expect(landingOffset(() => 0.9999)).toBeLessThan(0.77)
  })

  it('eases fast at first, overshoots a little and settles on the target', () => {
    const from = 0
    const to = landingRotation(from, 2, 6, 6, 0.5)
    const ov = overshootFor(6)
    const D = 6000
    expect(spinAngle(0, from, to, D, ov)).toBe(0)
    // A third of the time covers well over half the distance.
    expect(spinAngle(D / 3, from, to, D, ov)).toBeGreaterThan(to * 0.75)
    const samples = Array.from({ length: 601 }, (_, i) => spinAngle((i / 600) * D, from, to, D, ov))
    const peak = Math.max(...samples)
    expect(peak).toBeGreaterThan(to)
    expect(peak - to).toBeCloseTo(ov, 1)
    expect(samples[600]).toBe(to)
    // The overshoot never pushes the pointer into the neighbouring slice.
    for (const s of samples.slice(400)) expect(indexAtPointer(s, 6)).toBe(2)
    expect(ov).toBeLessThan(60 * 0.32)
    expect(cruiseAngle(RAMP_MS * 3, 0, 1)).toBeCloseTo(RAMP_MS * 2.5)
  })

  it('kicks the pointer only right after a peg passes', () => {
    expect(pointerKick(0, 6)).toBe(-24)
    expect(pointerKick(6, 6)).toBeCloseTo(-12)
    expect(pointerKick(30, 6)).toBe(0)
    expect(pointerKick(60.5, 6)).toBeLessThan(-20)
    expect(pointerKick(45, 1)).toBe(0)
    // At rest on any landing spot the pointer is straight.
    for (const offset of [0.32, 0.5, 0.76]) expect(pointerKick(landingRotation(0, 1, 6, 1, offset), 6)).toBe(0)
  })

  it('builds slices, colours and paths', () => {
    expect(slicePath(0, 4)).toBe('M100 100L100.00 18.00A82 82 0 0 1 182.00 100.00Z')
    expect(slicePath(0, 1)).toMatch(/^M100 18A82 82 0 1 1 /)
    expect(sliceTone(six, 0)).toBe('gold')
    expect(sliceTone(six, 1)).toBe('steel')
    // Five slices would put gold next to gold at the wrap.
    expect(sliceTone(six.slice(0, 5), 4)).toBe('success')
    expect(sliceTone([{ label: 'a', tone: 'danger' }], 0)).toBe('danger')
    expect(luminance('#000')).toBe(0)
    expect(luminance('#ffffff')).toBeCloseTo(1)
    expect(luminance('red')).toBeUndefined()
    const s = wheelSlices([{ label: 'dark', color: '#12151c' }, { label: 'light', color: '#ffd56a' }, { label: 'tone' }], 'u')
    expect(s.map((x) => x.ink)).toEqual(['light', 'dark', 'dark'])
    expect(s[0].fill).toBe('#12151c')
    expect(s[2].fill).toBe('url(#u-bean)')
    expect(s[1].mid).toBe(180)
  })

  it('WheelSpinner lands from rest and from a cruise', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })
    const onLand = vi.fn()
    const angles: number[] = []
    const sp = new WheelSpinner({ onAngle: (r) => angles.push(r), onLand })
    sp.land(4, 8, { duration: 2000, turns: 3, random: () => 0.5 })
    vi.advanceTimersByTime(2100)
    expect(onLand).toHaveBeenCalledTimes(1)
    expect(indexAtPointer(sp.rotation, 8)).toBe(4)
    expect(sp.rotation).toBeLessThan(360)
    expect(Math.max(...angles)).toBeGreaterThan(3 * 360)

    sp.cruise(1)
    vi.advanceTimersByTime(1000)
    const mid = sp.rotation
    expect(mid).toBeGreaterThan(400)
    sp.landFromCruise(2, 8, { duration: 1500, random: () => 0.5 })
    let prev = mid
    let jumps = 0
    const stepAngles: number[] = []
    for (let i = 0; i < 300 && onLand.mock.calls.length < 2; i++) {
      vi.advanceTimersByTime(16)
      stepAngles.push(sp.rotation)
      if (sp.rotation - prev > 40) jumps++
      prev = sp.rotation
    }
    expect(onLand).toHaveBeenCalledTimes(2)
    expect(indexAtPointer(sp.rotation, 8)).toBe(2)
    expect(jumps).toBe(0)
    vi.useRealTimers()
  })
})

// Drive requestAnimationFrame from fake timers so the spin can be stepped.
describe('MlLuckyWheel', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })
  })
  afterEach(() => {
    vi.useRealTimers()
    document.body.innerHTML = ''
    vi.unstubAllGlobals()
  })
  const reducedMotion = (on: boolean) =>
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: on && q.includes('reduce'), addEventListener() {}, removeEventListener() {} }))

  it('renders the face, rim, pegs and an accessible hub', () => {
    const wrapper = mount(MlLuckyWheel, { props: { prizes: six, size: 280 } })
    expect(wrapper.findAll('.ml-lucky-wheel__slice')).toHaveLength(6)
    expect(wrapper.findAll('.ml-lucky-wheel__peg')).toHaveLength(6)
    expect(wrapper.findAll('.ml-lucky-wheel__light').length).toBeGreaterThanOrEqual(16)
    expect(wrapper.get('svg').attributes('aria-label')).toBe('幸運轉盤：A、B、C、D、E、F')
    const hub = wrapper.get('button.ml-lucky-wheel__hub')
    expect(hub.attributes('aria-label')).toBe('開始抽獎')
    expect(hub.text()).toBe('GO')
    expect(wrapper.get('[aria-live="polite"]').text()).toBe('')
    expect((wrapper.element as HTMLElement).style.getPropertyValue('--_size')).toBe('280px')
  })

  it('spins on the hub, ignores presses mid-spin, lands by weight and announces the prize', async () => {
    reducedMotion(false)
    const prizes: MlWheelPrize[] = six.map((p, i) => ({ ...p, weight: i === 3 ? 1 : 0 }))
    const wrapper = mount(MlLuckyWheel, { props: { prizes, duration: 3000 }, attachTo: document.body })
    const hub = wrapper.get('button')
    await hub.trigger('click')
    expect(wrapper.emitted('start')).toHaveLength(1)
    expect(wrapper.classes()).toContain('ml-lucky-wheel--spinning')
    expect(hub.attributes('aria-disabled')).toBe('true')
    expect(wrapper.get('[aria-live]').text()).toBe('轉盤轉動中…')
    vi.advanceTimersByTime(500)
    await nextTick()
    const face = wrapper.get('.ml-lucky-wheel__face').attributes('transform')!
    expect(Number(/rotate\(([-\d.]+)/.exec(face)![1])).toBeGreaterThan(360)
    await hub.trigger('click')
    expect(wrapper.emitted('start')).toHaveLength(1)
    vi.advanceTimersByTime(3000)
    await nextTick()
    expect(wrapper.emitted('result')).toEqual([[prizes[3], 3]])
    expect(wrapper.classes()).toContain('ml-lucky-wheel--landed')
    expect(wrapper.findAll('.ml-lucky-wheel__slice')[3].classes()).toContain('ml-lucky-wheel__slice--win')
    expect(wrapper.get('[aria-live]').text()).toBe('恭喜！抽中：D')
    expect(hub.attributes('aria-disabled')).toBeUndefined()
    // The pointer is at rest and the face rests on slice 3.
    expect(wrapper.get('.ml-lucky-wheel__pointer').attributes('transform')).toBe('rotate(0.00 100 7.5)')
    const rest = Number(/rotate\(([-\d.]+)/.exec(wrapper.get('.ml-lucky-wheel__face').attributes('transform')!)![1])
    expect(indexAtPointer(rest, 6)).toBe(3)
    // PawBurst confetti on landing.
    expect(document.querySelectorAll('.ml-paw-burst').length).toBeGreaterThan(0)
    wrapper.unmount()
  })

  it('spin(i) lands on the given index (even a disabled one) and resolves with it', async () => {
    reducedMotion(false)
    const prizes = six.map((p, i) => ({ ...p, disabled: i === 5 }))
    const wrapper = mount(MlLuckyWheel, { props: { prizes, duration: 1000, confetti: false } })
    const vm = wrapper.vm as unknown as { spin: (i?: number) => Promise<number> }
    const done = vm.spin(5)
    expect(await vm.spin(1)).toBe(-1)
    vi.advanceTimersByTime(1100)
    expect(await done).toBe(5)
    expect(wrapper.emitted('result')![0][1]).toBe(5)
    expect(document.querySelectorAll('.ml-paw-burst')).toHaveLength(0)
  })

  it('waits for a before-spin promise (server draw) while spinning, then lands on its answer', async () => {
    reducedMotion(false)
    let answer!: (i: number) => void
    const beforeSpin = vi.fn(() => new Promise<number>((r) => (answer = r)))
    const wrapper = mount(MlLuckyWheel, { props: { prizes: six, duration: 2000, beforeSpin, confetti: false } })
    const vm = wrapper.vm as unknown as { spin: (i?: number) => Promise<number> }
    const done = vm.spin()
    expect(beforeSpin).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(1500)
    await nextTick()
    expect(wrapper.classes()).toContain('ml-lucky-wheel--spinning')
    expect(wrapper.emitted('result')).toBeUndefined()
    answer(4)
    await Promise.resolve()
    vi.advanceTimersByTime(5000)
    expect(await done).toBe(4)
    expect(wrapper.emitted('result')).toEqual([[six[4], 4]])
  })

  it('before-spin can cancel, choose synchronously, or fail', async () => {
    reducedMotion(false)
    const wrapper = mount(MlLuckyWheel, { props: { prizes: six, duration: 800, confetti: false, beforeSpin: () => false } })
    const vm = wrapper.vm as unknown as { spin: (i?: number) => Promise<number> }
    expect(await vm.spin()).toBe(-1)
    expect(wrapper.emitted('start')).toBeUndefined()
    await wrapper.setProps({ beforeSpin: () => 2 })
    const two = vm.spin()
    vi.advanceTimersByTime(900)
    expect(await two).toBe(2)
    await wrapper.setProps({ beforeSpin: () => Promise.reject(new Error('offline')) })
    const failed = vm.spin()
    await Promise.resolve()
    await Promise.resolve()
    vi.advanceTimersByTime(5000)
    expect(await failed).toBe(-1)
    expect((wrapper.emitted('error')![0][0] as Error).message).toBe('offline')
    expect(wrapper.emitted('result')).toHaveLength(1)
    expect(wrapper.classes()).not.toContain('ml-lucky-wheel--spinning')
  })

  it('reduced motion: no long spin, a short fade to the result', async () => {
    reducedMotion(true)
    const wrapper = mount(MlLuckyWheel, { props: { prizes: six, duration: 6000 } })
    const vm = wrapper.vm as unknown as { spin: (i?: number) => Promise<number> }
    const done = vm.spin(1)
    await nextTick()
    expect(wrapper.classes()).toContain('ml-lucky-wheel--fade')
    vi.advanceTimersByTime(FADE_MS + 10)
    expect(await done).toBe(1)
    await nextTick()
    expect(wrapper.classes()).not.toContain('ml-lucky-wheel--fade')
    expect(wrapper.get('[aria-live]').text()).toBe('恭喜！抽中：B')
  })

  it('is disabled with the prop or without prizes, and follows the locale', async () => {
    const wrapper = mount(MlLuckyWheel, { props: { prizes: six, disabled: true } })
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
    expect(wrapper.classes()).toContain('ml-lucky-wheel--disabled')
    expect(await (wrapper.vm as unknown as { spin: () => Promise<number> }).spin()).toBe(-1)
    const empty = mount(MlLuckyWheel, { props: { prizes: [] } })
    expect(empty.get('button').attributes('disabled')).toBeDefined()
    const english = mount({ render: () => h(MlConfigProvider, { locale: en }, () => h(MlLuckyWheel, { prizes: six.slice(0, 2), label: 'Spin' })) })
    expect(english.get('button').attributes('aria-label')).toBe('Spin the wheel')
    expect(english.get('svg').attributes('aria-label')).toBe('Spin: A, B')
  })
})
