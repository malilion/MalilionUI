import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import { MlConfigProvider, MlPickerView, en, type MlPickerOption, type MlPickerValue } from '../src'
import {
  MAX_OVERSHOOT,
  MOMENTUM_TAU,
  SNAP_TAU,
  dateToPickerValue,
  datePickerColumns,
  daysInMonth,
  glideAt,
  glideDone,
  makeMomentum,
  motionAt,
  type Motion,
  isLeapYear,
  makeGlide,
  momentumTarget,
  nearestEnabled,
  normalizeVisibleCount,
  pickValues,
  pickerValueToDate,
  releaseVelocity,
  resolvePicker,
  rowAtOffset,
  rowHidden,
  rubberClamp,
  rubberband,
  stepEnabled,
  timePickerColumns,
  typeAheadMatch,
  wheelGeometry,
} from '../src/components/picker-wheel'

const opts = (labels: string[], disabled: number[] = []): MlPickerOption[] =>
  labels.map((label, i) => (disabled.includes(i) ? { label, value: label, disabled: true } : { label, value: label }))

/** Run a motion to rest; returns the furthest points reached and when it settled. */
function simulate(m: Motion) {
  let max = -Infinity
  let min = Infinity
  let last = Infinity
  let monotonic = true
  for (let t = 0; t < 8000; t += 4) {
    const s = motionAt(m, t)
    if (t > 0 && Math.sign(s.pos - last) !== Math.sign(m.target - last) && Math.abs(s.pos - last) > 1e-9) monotonic = false
    last = s.pos
    max = Math.max(max, s.pos)
    min = Math.min(min, s.pos)
    if (s.done) return { max, min, t, end: s.pos, monotonic }
  }
  return { max, min, t: Infinity, end: NaN, monotonic }
}

describe('picker wheel physics', () => {
  it('rubber-bands drags past the ends: monotonic, damped and bounded', () => {
    expect(rubberband(0, 2.5)).toBe(0)
    expect(rubberband(1, 2.5)).toBeLessThan(1)
    expect(rubberband(4, 2.5)).toBeGreaterThan(rubberband(2, 2.5))
    expect(rubberband(1000, 2.5)).toBeLessThan(2.5)
    expect(rubberClamp(3, 9, 2.5)).toBe(3)
    expect(rubberClamp(-2, 9, 2.5)).toBeCloseTo(-rubberband(2, 2.5))
    expect(rubberClamp(12, 9, 2.5)).toBeCloseTo(9 + rubberband(3, 2.5))
  })

  it('decelerates a fling with momentum and lands exactly on a row, without overshooting mid-list', () => {
    const v = 0.03 // items per ms
    const target = momentumTarget(10, v, 100, () => false)
    expect(target).toBe(Math.round(10 + v * MOMENTUM_TAU))
    const m = makeMomentum(10, v, target, 99)
    expect(m.kind).toBe('ease')
    // Velocity is continuous at release: the motion starts at the finger's speed…
    expect(motionAt(m, 0).velocity).toBeCloseTo(v, 4)
    // …slows down all the way…
    expect(motionAt(m, 300).velocity).toBeLessThan(v / 2)
    const run = simulate(m)
    // …and stops on the row, never past it, in about a second.
    expect(run.end).toBe(target)
    expect(run.max).toBeLessThanOrEqual(target)
    expect(run.monotonic).toBe(true)
    expect(run.t).toBeGreaterThan(600)
    expect(run.t).toBeLessThan(1600)
    // Slower flings stop sooner; flings go both ways.
    expect(momentumTarget(10, 0.01, 100, () => false)).toBeLessThan(target)
    expect(momentumTarget(10, -0.03, 100, () => false)).toBe(2)
  })

  it('bounces past the last row and springs back (rubber band), capped', () => {
    const target = momentumTarget(18, 0.2, 20, () => false)
    expect(target).toBe(19)
    const m = makeMomentum(18, 0.2, target, 19)
    expect(m.kind).toBe('spring')
    const run = simulate(m)
    expect(run.max).toBeGreaterThan(19.1)
    expect(run.max).toBeLessThanOrEqual(19 + MAX_OVERSHOOT + 1e-6)
    expect(run.end).toBeCloseTo(19, 1)
    expect(run.t).toBeLessThan(1500)
    // The raw spring: released while overscrolled, it springs straight back without crossing.
    const g = makeGlide(-0.8, 0, 0, SNAP_TAU)
    let crossed = false
    for (let t = 0; t < 2000; t += 4) if (glideAt(g, t).pos > 1e-3) crossed = true
    expect(crossed).toBe(false)
    expect(glideDone(glideAt(g, 1000).pos, glideAt(g, 1000).velocity, 0)).toBe(true)
  })

  it('skips disabled rows when snapping, in the direction of travel', () => {
    const dis = (i: number) => i === 3 || i === 4
    // Nearest enabled row; a tie goes the way the wheel was moving.
    expect(nearestEnabled(3, 8, dis, 1)).toBe(2)
    expect(nearestEnabled(4, 8, dis, -1)).toBe(5)
    expect(nearestEnabled(3.4, 8, (i) => i === 3, 1)).toBe(4)
    expect(nearestEnabled(3.4, 8, (i) => i === 3, -1)).toBe(2)
    expect(nearestEnabled(9, 8, dis)).toBe(7)
    expect(nearestEnabled(1, 3, () => true)).toBe(-1)
    expect(momentumTarget(2, 0.009, 8, dis)).toBe(5)
    expect(stepEnabled(2, 1, 8, dis)).toBe(5)
    expect(stepEnabled(5, -1, 8, dis)).toBe(2)
    expect(stepEnabled(7, 5, 8, dis)).toBe(7)
    expect(stepEnabled(1, -5, 8, (i) => i === 0)).toBe(1)
  })

  it('measures release velocity from the last 100 ms and ignores a held finger', () => {
    const samples = [
      { t: 0, pos: 0 },
      { t: 50, pos: 1 },
      { t: 100, pos: 2 },
      { t: 116, pos: 2.5 },
    ]
    expect(releaseVelocity(samples, 120)).toBeCloseTo((2.5 - 1) / 66, 3)
    expect(releaseVelocity(samples, 400)).toBe(0)
    expect(releaseVelocity([{ t: 0, pos: 0 }, { t: 10, pos: 50 }], 10)).toBe(0.2)
  })

  it('lays rows on a cylinder exactly visibleCount rows tall', () => {
    expect(normalizeVisibleCount(6)).toBe(7)
    expect(normalizeVisibleCount(1)).toBe(3)
    const geo = wheelGeometry(44, 5)
    expect(geo.radius).toBe(110)
    expect(geo.step).toBeCloseTo(23.07, 1)
    expect(rowHidden(3, 0, geo)).toBe(false)
    expect(rowHidden(4, 0, geo)).toBe(true)
    // Taps: the centre is the current row, one chord below is the next.
    expect(rowAtOffset(0, 6, geo)).toBe(6)
    expect(rowAtOffset(44, 6, geo)).toBe(7)
    expect(rowAtOffset(-90, 6, geo)).toBe(4)
  })

  it('type-ahead finds the next row by first letters and cycles on repeats', () => {
    const labels = ['Apple', 'Avocado', 'Banana', 'Blueberry', 'Cherry']
    const none = () => false
    expect(typeAheadMatch(labels, 'b', 0, none)).toBe(2)
    expect(typeAheadMatch(labels, 'b', 2, none)).toBe(3)
    expect(typeAheadMatch(labels, 'bb', 3, none)).toBe(2)
    expect(typeAheadMatch(labels, 'bl', 2, none)).toBe(3)
    expect(typeAheadMatch(labels, 'a', 4, (i) => i === 0)).toBe(1)
    expect(typeAheadMatch(labels, 'z', 0, none)).toBe(-1)
  })
})

describe('picker columns', () => {
  it('knows the days of every month, including Feb 29 in leap years', () => {
    expect(isLeapYear(2024)).toBe(true)
    expect(isLeapYear(2023)).toBe(false)
    expect(isLeapYear(1900)).toBe(false)
    expect(isLeapYear(2000)).toBe(true)
    expect(daysInMonth(2024, 2)).toBe(29)
    expect(daysInMonth(2023, 2)).toBe(28)
    expect(daysInMonth(2026, 4)).toBe(30)
    expect(daysInMonth(2026, 12)).toBe(31)
    expect(dateToPickerValue(new Date(2024, 1, 29))).toEqual([2024, 2, 29])
    expect(pickerValueToDate([2023, 2, 31]).getDate()).toBe(28)
  })

  it('builds 年/月/日 columns that follow the month and disable rows outside min / max', () => {
    const make = datePickerColumns({ min: new Date(2020, 1, 15), max: new Date(2026, 9, 4), format: { year: (y) => `${y} 年` } })
    const [years, months, days] = make([2024, 2, 1])
    expect(years.map((o) => o.value)).toEqual([2020, 2021, 2022, 2023, 2024, 2025, 2026])
    expect(years[0].label).toBe('2020 年')
    expect(months).toHaveLength(12)
    expect(days).toHaveLength(29)
    expect(days[28].label).toBe('29')
    const [, minMonths, minDays] = make([2020, 2, 1])
    expect(minMonths[0].disabled).toBe(true)
    expect(minMonths[1].disabled).toBeUndefined()
    expect(minDays.filter((o) => o.disabled).map((o) => o.value)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14])
    const [, maxMonths, maxDays] = make([2026, 10, 1])
    expect(maxMonths.filter((o) => o.disabled).map((o) => o.value)).toEqual([11, 12])
    expect(maxDays.find((o) => o.value === 5)?.disabled).toBe(true)
    expect(datePickerColumns({ type: 'year-month' })([2026, 1])).toHaveLength(2)
  })

  it('resolves vanished and out-of-range dates to a real day (Feb 31 → Feb 29, leap → 28)', () => {
    const columns = datePickerColumns({ min: new Date(2020, 0, 1), max: new Date(2030, 11, 31) })
    expect(resolvePicker({ columns }, [2024, 2, 31], [2023, 0, 30]).values).toEqual([2024, 2, 29])
    const leap = resolvePicker({ columns }, [2024, 2, 29])
    expect(pickValues({ columns }, leap, 0, leap.columns[0].findIndex((o) => o.value === 2023)).values).toEqual([2023, 2, 28])
    const jan31 = resolvePicker({ columns }, [2025, 1, 31])
    expect(pickValues({ columns }, jan31, 1, 3).values).toEqual([2025, 4, 30])
    // Before min: the nearest enabled month / day.
    const bounded = datePickerColumns({ min: new Date(2020, 5, 10), max: new Date(2030, 0, 1) })
    expect(resolvePicker({ columns: bounded }, [2020, 1, 1]).values).toEqual([2020, 6, 10])
  })

  it('builds time columns with a minute step', () => {
    const [hours, minutes] = timePickerColumns({ minuteStep: 15 })
    expect(hours).toHaveLength(24)
    expect(minutes.map((o) => o.label)).toEqual(['00', '15', '30', '45'])
    expect(timePickerColumns({ seconds: true, secondStep: 30 })[2].map((o) => o.value)).toEqual([0, 30])
  })

  it('cascades: later columns follow the pick and reset to their first enabled row', () => {
    const options: MlPickerOption[] = [
      { label: '臺北市', value: 'tp', children: [{ label: '中正區', value: 'zz' }, { label: '大安區', value: 'da' }] },
      { label: '基隆市', value: 'kl', children: [{ label: '仁愛區', value: 'ra', disabled: true }, { label: '中正區', value: 'zz' }, { label: '信義區', value: 'xy' }] },
      { label: '連江縣', value: 'lj' },
    ]
    const start = resolvePicker({ options }, ['tp', 'da'])
    expect(start.indexes).toEqual([0, 1])
    expect(start.columns).toHaveLength(2)
    // Picking 基隆市 resets the district (even though 中正區 exists there too), skipping the disabled first row.
    const next = pickValues({ options }, start, 0, 1)
    expect(next.values).toEqual(['kl', 'zz'])
    expect(next.indexes).toEqual([1, 1])
    // A leaf ends the cascade early.
    expect(pickValues({ options }, start, 0, 2).columns).toHaveLength(1)
    // Partial values fill in.
    expect(resolvePicker({ options }, []).values).toEqual(['tp', 'zz'])
  })
})

/* ── Vue component ──────────────────────────────────────── */

const fruit = opts(['Apple', 'Banana', 'Cherry', 'Durian', 'Elderberry', 'Fig', 'Grape', 'Honeydew', 'Kiwi', 'Lemon', 'Mango', 'Nectarine'], [3])
const sizes = opts(['S', 'M', 'L'])

let wrapper: VueWrapper | undefined

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

async function mountPicker(props: Record<string, unknown>) {
  wrapper = mount(MlPickerView, {
    props: { 'onUpdate:modelValue': (v: MlPickerValue[]) => wrapper?.setProps({ modelValue: v }), ...props },
    attachTo: document.body,
  })
  await nextTick()
  await nextTick()
  return wrapper
}

const pointer = (el: Element, type: string, clientY: number) =>
  el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, pointerType: 'touch', clientY, button: 0 }))

async function advance(ms: number) {
  vi.advanceTimersByTime(ms)
  await nextTick()
  await nextTick()
}

const trackAngle = (col: Element) => Number(/rotateX\(([-\d.]+)deg\)/.exec((col.querySelector('.ml-picker-view__track') as HTMLElement).style.transform)![1])

describe('MlPickerView', () => {
  it('renders spinbutton columns with the value text, band and hidden far rows', async () => {
    const w = await mountPicker({ columns: [fruit, sizes], modelValue: ['Cherry', 'L'], labels: ['水果', '尺寸'] })
    const cols = w.findAll('[role="spinbutton"]')
    expect(cols).toHaveLength(2)
    expect(cols[0].attributes()).toMatchObject({ 'aria-label': '水果', 'aria-valuenow': '3', 'aria-valuemin': '1', 'aria-valuemax': '12', 'aria-valuetext': 'Cherry', tabindex: '0' })
    expect(cols[1].attributes('aria-valuetext')).toBe('L')
    expect(w.find('.ml-picker-view__band').exists()).toBe(true)
    expect(w.find('.ml-picker-view__toolbar').exists()).toBe(false)
    const rows = cols[0].findAll('li')
    expect(rows[2].classes()).toContain('ml-picker-view__item--selected')
    expect(rows[3].classes()).toContain('ml-picker-view__item--disabled')
    expect((rows[11].element as HTMLElement).style.visibility).toBe('hidden')
    expect((rows[4].element as HTMLElement).style.visibility).toBe('')
    expect(w.attributes('aria-label')).toBe('滾輪選擇器')
  })

  it('flings with a pointer drag: momentum, deceleration, snap, then change', async () => {
    const w = await mountPicker({ columns: [fruit], modelValue: ['Apple'] })
    const col = w.get('[role="spinbutton"]').element
    pointer(col, 'pointerdown', 300)
    for (let i = 1; i <= 5; i++) {
      vi.advanceTimersByTime(16)
      pointer(col, 'pointermove', 300 - i * 30)
    }
    vi.advanceTimersByTime(16)
    const during = trackAngle(col)
    expect(during).toBeGreaterThan(0)
    pointer(col, 'pointerup', 150)
    await advance(100)
    // Still moving on its own after the finger left.
    expect(trackAngle(col)).toBeGreaterThan(during)
    expect(w.emitted('change')).toBeUndefined()
    await advance(4000)
    const change = w.emitted('change')!
    expect(change).toHaveLength(1)
    const [values, selected, column] = change[0] as [MlPickerValue[], MlPickerOption[], number]
    expect(column).toBe(0)
    // Fast flick toward the end of a 12-row list: lands on the last row (after a bounce).
    expect(values).toEqual(['Nectarine'])
    expect(selected[0].label).toBe('Nectarine')
    expect(w.emitted('update:modelValue')!.at(-1)).toEqual([['Nectarine']])
    const geo = wheelGeometry(44, 5)
    expect(trackAngle(col)).toBeCloseTo(11 * geo.step, 1)
    expect(w.get('[role="spinbutton"]').attributes('aria-valuetext')).toBe('Nectarine')
    expect(w.get('[aria-live]').text()).toBe('已選擇：Nectarine')
  })

  it('a slow drag snaps to the nearest row and skips a disabled one', async () => {
    const w = await mountPicker({ columns: [fruit], modelValue: ['Cherry'] })
    const col = w.get('[role="spinbutton"]').element
    pointer(col, 'pointerdown', 300)
    // Drag up 1.1 rows slowly, then hold still before releasing: Durian (disabled) is skipped.
    for (let i = 1; i <= 10; i++) {
      vi.advanceTimersByTime(30)
      pointer(col, 'pointermove', 300 - i * 4.84)
    }
    vi.advanceTimersByTime(200)
    pointer(col, 'pointerup', 251.6)
    await advance(2000)
    expect(w.emitted('change')![0][0]).toEqual(['Elderberry'])
  })

  it('rubber-bands when dragged past the first row and springs back without a change', async () => {
    const w = await mountPicker({ columns: [fruit], modelValue: ['Apple'] })
    const col = w.get('[role="spinbutton"]').element
    pointer(col, 'pointerdown', 100)
    vi.advanceTimersByTime(16)
    pointer(col, 'pointermove', 300) // 200px down = 4.5 rows past the top
    vi.advanceTimersByTime(16)
    const stretched = trackAngle(col)
    const geo = wheelGeometry(44, 5)
    expect(stretched).toBeLessThan(0)
    expect(stretched).toBeGreaterThan(-2.5 * geo.step)
    vi.advanceTimersByTime(200)
    pointer(col, 'pointerup', 300)
    await advance(1500)
    expect(trackAngle(col)).toBeCloseTo(0, 2)
    expect(w.emitted('change')).toBeUndefined()
  })

  it('taps a row above or below the band to spin it in', async () => {
    const w = await mountPicker({ columns: [fruit], modelValue: ['Fig'] })
    const col = w.get('[role="spinbutton"]').element as HTMLElement
    col.getBoundingClientRect = () => ({ top: 0, height: 220, bottom: 220, left: 0, right: 100, width: 100, x: 0, y: 0, toJSON() {} }) as DOMRect
    pointer(col, 'pointerdown', 110 + 44)
    pointer(col, 'pointerup', 110 + 44)
    await advance(1000)
    expect(w.emitted('change')![0][0]).toEqual(['Grape'])
  })

  it('scrolls with the mouse wheel one row per notch and settles', async () => {
    const w = await mountPicker({ columns: [fruit], modelValue: ['Apple'] })
    const col = w.get('[role="spinbutton"]').element
    for (let i = 0; i < 2; i++) {
      const e = new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true })
      col.dispatchEvent(e)
      expect(e.defaultPrevented).toBe(true)
      vi.advanceTimersByTime(30)
    }
    await advance(1000)
    expect(w.emitted('change')![0][0]).toEqual(['Cherry'])
  })

  it('moves with the keyboard, skipping disabled rows, and commits at once', async () => {
    const w = await mountPicker({ columns: [fruit, sizes], modelValue: ['Cherry', 'M'] })
    const col = w.get('[role="spinbutton"]')
    await col.trigger('keydown', { key: 'ArrowDown' })
    expect(w.emitted('change')![0]).toEqual([['Elderberry', 'M'], [fruit[4], sizes[1]], 0])
    await nextTick()
    expect(col.attributes('aria-valuetext')).toBe('Elderberry')
    await col.trigger('keydown', { key: 'ArrowUp' })
    expect(w.emitted('change')!.at(-1)![0]).toEqual(['Cherry', 'M'])
    await col.trigger('keydown', { key: 'End' })
    expect(w.emitted('change')!.at(-1)![0]).toEqual(['Nectarine', 'M'])
    await col.trigger('keydown', { key: 'Home' })
    expect(w.emitted('change')!.at(-1)![0]).toEqual(['Apple', 'M'])
    await col.trigger('keydown', { key: 'PageDown' })
    expect(w.emitted('change')!.at(-1)![0]).toEqual(['Fig', 'M'])
    await col.trigger('keydown', { key: 'PageUp' })
    expect(w.emitted('change')!.at(-1)![0]).toEqual(['Apple', 'M'])
    // Keyboard users hear the spinbutton itself; no duplicate announcement.
    expect(w.get('[aria-live]').text()).toBe('')
    await advance(1000)
    expect(trackAngle(col.element)).toBeCloseTo(0, 2)
  })

  it('type-ahead jumps by first letters', async () => {
    const w = await mountPicker({ columns: [fruit], modelValue: ['Apple'] })
    const col = w.get('[role="spinbutton"]')
    await col.trigger('keydown', { key: 'g' })
    expect(w.emitted('change')!.at(-1)![0]).toEqual(['Grape'])
    vi.advanceTimersByTime(700)
    await col.trigger('keydown', { key: 'l' })
    expect(w.emitted('change')!.at(-1)![0]).toEqual(['Lemon'])
    vi.advanceTimersByTime(700)
    await col.trigger('keydown', { key: 'd' }) // Durian is disabled
    expect(w.emitted('change')).toHaveLength(2)
  })

  it('cascades: a new county resets the district and announces both', async () => {
    const options: MlPickerOption[] = [
      { label: '臺北市', value: 'tp', children: opts(['中正區', '大安區', '信義區']) },
      { label: '新竹市', value: 'hc', children: opts(['東區', '北區', '香山區']) },
    ]
    const w = await mountPicker({ options, modelValue: ['tp', '信義區'] })
    const [county, district] = w.findAll('[role="spinbutton"]')
    expect(district.attributes('aria-valuetext')).toBe('信義區')
    await county.trigger('keydown', { key: 'ArrowDown' })
    expect(w.emitted('change')![0][0]).toEqual(['hc', '東區'])
    await advance(500)
    const cols = w.findAll('[role="spinbutton"]')
    expect(cols[1].attributes('aria-valuetext')).toBe('東區')
    expect(cols[1].findAll('li').map((li) => li.text())).toEqual(['東區', '北區', '香山區'])
    expect(trackAngle(cols[1].element)).toBeCloseTo(0, 2)
    expect(w.get('[aria-live]').text()).toBe('已選擇：新竹市，東區')
  })

  it('fixes an impossible v-model (Feb 31) and follows external v-model changes', async () => {
    const columns = datePickerColumns({ min: new Date(2020, 0, 1), max: new Date(2030, 11, 31) })
    const w = await mountPicker({ columns, modelValue: [2024, 2, 31] })
    expect(w.emitted('update:modelValue')![0]).toEqual([[2024, 2, 29]])
    expect(w.emitted('change')).toBeUndefined()
    await w.setProps({ modelValue: [2021, 6, 15] })
    await nextTick()
    await advance(1000)
    const cols = w.findAll('[role="spinbutton"]')
    expect(cols.map((c) => c.attributes('aria-valuetext'))).toEqual(['2021', '06', '15'])
    expect(trackAngle(cols[2].element)).toBeCloseTo(14 * wheelGeometry(44, 5).step, 1)
  })

  it('toolbar: cancel / confirm (confirm stops a moving wheel first), disabled', async () => {
    const w = await mountPicker({ columns: [fruit], modelValue: ['Apple'], title: '選水果' })
    expect(w.get('.ml-picker-view__title').text()).toBe('選水果')
    expect(w.attributes('aria-label')).toBe('選水果')
    const col = w.get('[role="spinbutton"]').element
    pointer(col, 'pointerdown', 300)
    for (let i = 1; i <= 3; i++) {
      vi.advanceTimersByTime(16)
      pointer(col, 'pointermove', 300 - i * 20)
    }
    pointer(col, 'pointerup', 240)
    await advance(50)
    await w.get('.ml-picker-view__action--confirm').trigger('click')
    const [values] = w.emitted('confirm')![0] as [MlPickerValue[]]
    expect(values).toEqual(w.emitted('change')!.at(-1)![0])
    expect(values[0]).not.toBe('Apple')
    await w.get('.ml-picker-view__action--cancel').trigger('click')
    expect(w.emitted('cancel')).toHaveLength(1)

    await w.setProps({ disabled: true })
    const changes = w.emitted('change')!.length
    const spin = w.get('[role="spinbutton"]')
    expect(spin.attributes()).toMatchObject({ tabindex: '-1', 'aria-disabled': 'true' })
    await spin.trigger('keydown', { key: 'ArrowDown' })
    expect(w.emitted('change')).toHaveLength(changes)
  })

  it('speaks English and supports the option slot', () => {
    const english = mount({
      render: () =>
        h(MlConfigProvider, { locale: en }, () =>
          h(MlPickerView, { columns: [sizes], toolbar: true }, { option: ({ option }: { option: MlPickerOption }) => h('b', option.label.toLowerCase()) }),
        ),
    })
    expect(english.get('[role="spinbutton"]').attributes('aria-label')).toBe('Column 1')
    expect(english.findAll('.ml-picker-view__action').map((b) => b.text())).toEqual(['Cancel', 'Done'])
    expect(english.find('li b').text()).toBe('s')
    english.unmount()
  })
})
