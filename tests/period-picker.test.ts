import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import { MlDatePicker, MlDateRangePicker, en, zhTW } from '../src'
import MlPeriodPanel from '../src/components/MlPeriodPanel.vue'
import {
  addPeriods,
  comparePeriods,
  decadeStart,
  formatPeriod,
  periodDisabled,
  periodEnd,
  periodGrid,
  periodKey,
  periodStart,
  samePeriod,
} from '../src/components/dates'

const day = (y: number, m: number, d = 1) => new Date(y, m - 1, d)
const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let wrapper: VueWrapper<any> | undefined
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
})

describe('period helpers', () => {
  it('finds the start and end of months, quarters and years', () => {
    const d = day(2026, 11, 17)
    expect(key(periodStart(d, 'month'))).toBe('2026-11-01')
    expect(key(periodEnd(d, 'month'))).toBe('2026-11-30')
    expect(key(periodStart(d, 'quarter'))).toBe('2026-10-01')
    expect(key(periodEnd(d, 'quarter'))).toBe('2026-12-31')
    expect(key(periodStart(d, 'year'))).toBe('2026-01-01')
    expect(key(periodEnd(day(2024, 2, 3), 'month'))).toBe('2024-02-29')
  })

  it('steps, compares and keys periods across year boundaries', () => {
    expect(key(addPeriods(day(2026, 12, 9), 'month', 1))).toBe('2027-01-01')
    expect(key(addPeriods(day(2026, 2, 9), 'quarter', -1))).toBe('2025-10-01')
    expect(key(addPeriods(day(2026, 5, 9), 'year', 10))).toBe('2036-01-01')
    expect(comparePeriods(day(2027, 1), day(2026, 11), 'month')).toBe(2)
    expect(comparePeriods(day(2026, 3, 31), day(2026, 1, 1), 'quarter')).toBe(0)
    expect(samePeriod(day(2026, 4), day(2026, 6, 30), 'quarter')).toBe(true)
    expect(samePeriod(null, day(2026, 1), 'year')).toBe(false)
    expect(periodKey(day(2026, 10, 4), 'month')).toBe('2026-10')
    expect(periodKey(day(2026, 10, 4), 'quarter')).toBe('2026-Q4')
    expect(periodKey(day(2026, 10, 4), 'year')).toBe('2026')
  })

  it('lays out grids and the decade', () => {
    expect(decadeStart(2026)).toBe(2020)
    expect(periodGrid('month', 2026).map((d) => d.getMonth())).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    expect(periodGrid('quarter', 2026).map((d) => d.getMonth())).toEqual([0, 3, 6, 9])
    const years = periodGrid('year', 2020).map((d) => d.getFullYear())
    expect(years[0]).toBe(2019)
    expect(years.at(-1)).toBe(2030)
    expect(years).toHaveLength(12)
  })

  it('disables periods wholly outside min / max, and asks disabledDate about the first day', () => {
    const min = day(2026, 3, 15)
    expect(periodDisabled(day(2026, 2), 'month', min)).toBe(true)
    expect(periodDisabled(day(2026, 3), 'month', min)).toBe(false) // partly inside
    expect(periodDisabled(day(2026, 1), 'quarter', min)).toBe(false)
    expect(periodDisabled(day(2027, 1), 'year', undefined, day(2026, 12, 31))).toBe(true)
    expect(periodDisabled(day(2026, 7), 'month', undefined, undefined, (d) => d.getMonth() === 6)).toBe(true)
  })

  it('formats periods per locale', () => {
    const d = day(2026, 10, 4)
    expect(formatPeriod(d, 'month', zhTW.date.period)).toBe('2026 年 10 月')
    expect(formatPeriod(d, 'quarter', zhTW.date.period)).toBe('2026 年第 4 季')
    expect(formatPeriod(d, 'year', zhTW.date.period)).toBe('2026 年')
    expect(formatPeriod(d, 'month', en.date.period)).toBe('2026-10')
    expect(formatPeriod(d, 'quarter', en.date.period)).toBe('2026 Q4')
    expect(formatPeriod(d, 'year', en.date.period)).toBe('2026')
  })
})

const focusedKey = () => (document.activeElement as HTMLElement).dataset.period
async function press(el: Element, k: string) {
  el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }))
  await nextTick()
  await nextTick()
}
function panel(props: Record<string, unknown>) {
  wrapper = mount(MlPeriodPanel, { props: props as never, attachTo: document.body })
  return wrapper
}

describe('MlPeriodPanel', () => {
  it('month: arrows, Home / End, PageUp / PageDown and Enter', async () => {
    const w = panel({ type: 'month', modelValue: day(2026, 5, 20) })
    expect(w.findAll('[role="gridcell"]')).toHaveLength(12)
    expect(w.findAll('tr')).toHaveLength(4)
    expect(w.get('.ml-calendar__title').text()).toBe('2026 年')
    expect(w.get('[tabindex="0"]').attributes('data-period')).toBe('2026-05')
    expect(w.get('[aria-selected="true"] button').attributes('data-period')).toBe('2026-05')
    ;(w.vm as unknown as { focus(): void }).focus()
    await nextTick()
    await nextTick()
    const grid = w.get('[role="grid"]').element
    await press(grid, 'ArrowRight')
    expect(focusedKey()).toBe('2026-06')
    await press(grid, 'ArrowDown') // 3 columns
    expect(focusedKey()).toBe('2026-09')
    await press(grid, 'Home')
    expect(focusedKey()).toBe('2026-07')
    await press(grid, 'End')
    expect(focusedKey()).toBe('2026-09')
    await press(grid, 'PageDown')
    expect(focusedKey()).toBe('2027-09')
    expect(w.get('.ml-calendar__title').text()).toBe('2027 年')
    expect(w.find('.ml-calendar__body--next').exists()).toBe(true)
    await press(grid, 'ArrowUp')
    await press(grid, 'ArrowUp')
    await press(grid, 'ArrowUp')
    expect(focusedKey()).toBe('2026-12')
    await press(grid, 'Enter')
    expect(key(w.emitted('update:modelValue')!.at(-1)![0] as Date)).toBe('2026-12-01')
  })

  it('quarter: a 2 × 2 grid, PageUp moves a year', async () => {
    const w = panel({ type: 'quarter', modelValue: day(2026, 8, 3), locale: 'en' })
    expect(w.findAll('[role="gridcell"]').map((c) => c.text())).toEqual(['第 1 季', '第 2 季', '第 3 季', '第 4 季'])
    expect(w.get('[tabindex="0"]').attributes('aria-label')).toBe('2026 年第 3 季')
    ;(w.vm as unknown as { focus(): void }).focus()
    await nextTick()
    await nextTick()
    expect(w.findAll('tr')).toHaveLength(2)
    const grid = w.get('[role="grid"]').element
    await press(grid, 'ArrowUp')
    expect(focusedKey()).toBe('2026-Q1')
    await press(grid, 'ArrowDown')
    await press(grid, 'End')
    expect(focusedKey()).toBe('2026-Q4')
    await press(grid, 'ArrowRight')
    expect(focusedKey()).toBe('2027-Q1')
    await press(grid, 'PageUp')
    expect(focusedKey()).toBe('2026-Q1')
    await press(grid, ' ')
    expect(key(w.emitted('update:modelValue')!.at(-1)![0] as Date)).toBe('2026-01-01')
  })

  it('year: a decade with neighbours, PageDown moves ten years', async () => {
    const w = panel({ type: 'year', modelValue: day(2026, 3, 3) })
    expect(w.get('.ml-calendar__title').text()).toBe('2020 – 2029 年')
    expect(w.findAll('.ml-calendar__period--outside').map((b) => b.text())).toEqual(['2019', '2030'])
    ;(w.vm as unknown as { focus(): void }).focus()
    await nextTick()
    await nextTick()
    const grid = w.get('[role="grid"]').element
    await press(grid, 'Home') // row: 2025 2026 2027
    expect(focusedKey()).toBe('2025')
    await press(grid, 'PageDown')
    expect(focusedKey()).toBe('2035')
    expect(w.get('.ml-calendar__title').text()).toBe('2030 – 2039 年')
    await w.get('[data-period="2029"]').trigger('click') // outside → previous decade
    expect(w.get('.ml-calendar__title').text()).toBe('2020 – 2029 年')
    expect(key(w.emitted('update:modelValue')!.at(-1)![0] as Date)).toBe('2029-01-01')
  })

  it('respects min / max per period and marks the current one', async () => {
    const now = new Date()
    const w = panel({ type: 'month', modelValue: null, min: new Date(now.getFullYear(), 2, 15), max: new Date(now.getFullYear(), 9, 1) })
    const disabled = w.findAll('button[data-period]').filter((b) => b.attributes('disabled') !== undefined).map((b) => b.attributes('data-period')!.slice(5))
    expect(disabled).toEqual(['01', '02', '11', '12'])
    expect(w.get('[aria-current="date"]').attributes('data-period')).toBe(periodKey(now, 'month'))
    await w.get(`[data-period="${now.getFullYear()}-01"]`).trigger('click')
    expect(w.emitted('update:modelValue')).toBeUndefined()
    // Prev / next buttons page by year.
    await w.get('[aria-label="下一年"]').trigger('click')
    expect(w.get('.ml-calendar__title').text()).toBe(`${now.getFullYear() + 1} 年`)
    expect(w.findAll('button[data-period]:disabled')).toHaveLength(12)
  })

  it('keyboard stops at min / max and skips disabled periods', async () => {
    const w = panel({ type: 'quarter', modelValue: day(2026, 10), max: day(2026, 12, 31), disabledDate: (d: Date) => d.getMonth() === 6 })
    ;(w.vm as unknown as { focus(): void }).focus()
    await nextTick()
    await nextTick()
    const grid = w.get('[role="grid"]').element
    await press(grid, 'ArrowRight') // 2027 Q1 is past max
    expect(focusedKey()).toBe('2026-Q4')
    await press(grid, 'ArrowLeft') // Q3 is disabled → Q2
    expect(focusedKey()).toBe('2026-Q2')
  })

  it('range: hover previews the band, the second pick orders the ends', async () => {
    const w = panel({ type: 'month', mode: 'range', range: [day(2026, 6), null], 'onUpdate:range': (r: unknown) => w.setProps({ range: r }) })
    await w.get('[data-period="2026-03"]').trigger('mouseenter')
    expect(w.findAll('.ml-calendar__cell--range').map((c) => c.get('button').attributes('data-period'))).toEqual(['2026-04', '2026-05'])
    expect(w.find('.ml-calendar__cell--start').exists()).toBe(true)
    await w.get('[data-period="2026-03"]').trigger('click')
    const [a, b] = w.emitted('update:range')!.at(-1)![0] as [Date, Date]
    expect([key(a), key(b)]).toEqual(['2026-03-01', '2026-06-01'])
  })
})

describe('MlDatePicker type', () => {
  it('picks a month, shows it in zh and focuses the grid on open', async () => {
    wrapper = mount(MlDatePicker, {
      props: { type: 'month', modelValue: day(2026, 10, 4), 'onUpdate:modelValue': (v: Date | null) => wrapper!.setProps({ modelValue: v }) },
      attachTo: document.body,
    })
    const trigger = wrapper.get('[aria-haspopup="dialog"]')
    expect(trigger.text()).toBe('2026 年 10 月')
    await trigger.trigger('click')
    await nextTick()
    await nextTick()
    expect(wrapper.get('[role="dialog"]').attributes('aria-label')).toBe('選擇月份')
    expect(focusedKey()).toBe('2026-10')
    await wrapper.get('[data-period="2026-02"]').trigger('click')
    expect(key(wrapper.props('modelValue') as Date)).toBe('2026-02-01')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(document.activeElement).toBe(trigger.element)
  })

  it('formats quarter / year and uses period wording for the placeholder', () => {
    wrapper = mount(MlDatePicker, { props: { type: 'quarter', modelValue: day(2026, 11, 9) } })
    expect(wrapper.get('.ml-datepicker__trigger').text()).toBe('2026 年第 4 季')
    wrapper.unmount()
    wrapper = mount(MlDatePicker, { props: { type: 'year', clearable: true } })
    expect(wrapper.get('.ml-datepicker__trigger').text()).toBe('選擇年份')
    wrapper.unmount()
    wrapper = mount(MlDatePicker, { props: { type: 'month', modelValue: day(2026, 3), locale: 'en', format: { year: 'numeric', month: 'long' } } })
    expect(wrapper.get('.ml-datepicker__trigger').text()).toBe('March 2026')
  })
})

describe('MlDateRangePicker type', () => {
  it('commits a month range and counts months', async () => {
    let value: [Date | null, Date | null] = [null, null]
    wrapper = mount(MlDateRangePicker, {
      props: {
        type: 'month',
        modelValue: value,
        'onUpdate:modelValue': (v: [Date | null, Date | null]) => {
          value = v
          wrapper!.setProps({ modelValue: v })
        },
      },
      attachTo: document.body,
    })
    expect(wrapper.get('.ml-daterange__trigger').text()).toContain('開始月份')
    await wrapper.get('.ml-daterange__trigger').trigger('click')
    expect(wrapper.find('.ml-daterange__presets').exists()).toBe(false)
    const y = new Date().getFullYear()
    await wrapper.get(`[data-period="${y}-08"]`).trigger('click')
    expect(wrapper.get('.ml-daterange__status').text()).toBe(`${y} 年 8 月 → 再選結束`)
    await wrapper.get(`[data-period="${y}-03"]`).trigger('click')
    expect(wrapper.find('.ml-daterange__panel').exists()).toBe(false)
    expect(value.map((d) => key(d!))).toEqual([`${y}-03-01`, `${y}-08-01`])
    expect(wrapper.get('.ml-daterange__days').text()).toBe('6 個月')
  })

  it('year ranges page by decade', async () => {
    wrapper = mount(MlDateRangePicker, { props: { type: 'year', modelValue: [day(2021, 1), day(2024, 1)], clearable: true }, attachTo: document.body })
    expect(wrapper.get('.ml-daterange__days').text()).toBe('4 年')
    expect(wrapper.get('.ml-datepicker__clear').attributes('aria-label')).toBe('清除年份區間')
    await wrapper.get('.ml-daterange__trigger').trigger('click')
    expect(wrapper.get('.ml-calendar__title').text()).toBe('2020 – 2029 年')
    expect(wrapper.findAll('[aria-selected="true"]')).toHaveLength(2)
    expect(wrapper.findAll('.ml-calendar__cell--range')).toHaveLength(2)
  })
})
