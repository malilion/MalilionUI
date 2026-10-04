// MlWaterfallChart, MlBoxPlot, MlBulletChart and their maths.
import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { MlBoxPlot, MlBulletChart, MlWaterfallChart, boxStats, bulletRows, quantile, waterfallLayout } from '../src'

let wrapper: VueWrapper | undefined
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
})

const steps = [
  { label: '期初', value: 1000, total: true },
  { label: '營收', value: 500 },
  { label: '成本', value: -800 },
  { label: '小計', total: true },
  { label: '退款', value: -900 },
  { label: '期末', total: true },
]

describe('waterfall maths', () => {
  it('runs the total and spans each bar', () => {
    const { bars, lo, hi } = waterfallLayout(steps)
    expect(bars.map((b) => [b.kind, b.from, b.to, b.running])).toEqual([
      ['total', 0, 1000, 1000],
      ['up', 1000, 1500, 1500],
      ['down', 1500, 700, 700],
      ['total', 0, 700, 700],
      ['down', 700, -200, -200],
      ['total', 0, -200, -200],
    ])
    expect(lo).toBeLessThanOrEqual(-200)
    expect(hi).toBeGreaterThanOrEqual(1500)
  })

  it('a total with a value resets the running sum', () => {
    expect(waterfallLayout([{ label: 'a', value: 5 }, { label: 'b', value: 100, total: true }, { label: 'c', value: 1 }]).bars.map((b) => b.running)).toEqual([5, 100, 101])
  })
})

describe('box plot maths', () => {
  it('interpolates quartiles like Excel / R type 7', () => {
    expect(quantile([1, 2, 3, 4], 0.25)).toBe(1.75)
    expect(quantile([1, 2, 3, 4], 0.5)).toBe(2.5)
    expect(quantile([7], 0.9)).toBe(7)
  })

  it('pulls whiskers in to the 1.5 × IQR fences', () => {
    const s = boxStats([1, 2, 3, 4, 5, 6, 7, 8, 9, 100])!
    expect([s.q1, s.median, s.q3]).toEqual([3.25, 5.5, 7.75])
    expect([s.min, s.max]).toEqual([1, 9])
    expect(s.outliers).toEqual([100])
    expect(s.count).toBe(10)
    expect(s.mean).toBe(14.5)
    expect(boxStats([Number.NaN])).toBeNull()
  })
})

describe('bullet maths', () => {
  it('positions value, target and bands; finds the band', () => {
    const [r] = bulletRows([{ label: '營收', value: 270, target: 250, ranges: [150, 225, 300] }])
    expect(r.max).toBe(320)
    expect(r.valuePct).toBeCloseTo(84.375)
    expect(r.targetPct).toBeCloseTo(78.125)
    expect(r.bands).toHaveLength(4)
    expect(r.band).toBe(2)
    expect(r.ticks).toEqual([0, 80, 160, 240, 320])
  })

  it('an explicit max ends the scale exactly', () => {
    const [r] = bulletRows([{ label: '滿意度', value: 4.6, ranges: [3.5, 4.25, 5], max: 5 }])
    expect(r.ticks[r.ticks.length - 1]).toBe(5)
    expect(r.bands).toHaveLength(3)
    expect(r.band).toBe(2)
  })

  it('values past the last band stay in the top band; no bands → -1', () => {
    expect(bulletRows([{ label: 'x', value: 50, ranges: [10, 20], max: 40 }])[0].band).toBe(2)
    expect(bulletRows([{ label: 'x', value: 50 }])[0].band).toBe(-1)
  })
})

describe('MlWaterfallChart', () => {
  it('draws bars, links, values and a table', async () => {
    wrapper = mount(MlWaterfallChart, { props: { data: steps }, attachTo: document.body })
    expect(wrapper.findAll('.ml-waterfall__bar')).toHaveLength(6)
    expect(wrapper.findAll('.ml-waterfall__link')).toHaveLength(5)
    expect(wrapper.findAll('.ml-waterfall__value').map((v) => v.text())).toEqual(['1,000', '+500', '−800', '700', '−900', '-200'])
    expect(wrapper.find('.ml-waterfall__bar--down').exists()).toBe(true)
    expect(wrapper.classes()).toContain('ml-waterfall--up-red')
    expect(wrapper.findAll('tbody tr')[2].text()).toBe('成本−800700')
    const plot = wrapper.find('.ml-waterfall__plot')
    await plot.trigger('keydown', { key: 'ArrowRight' })
    await plot.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.find('.ml-waterfall__pop').text()).toContain('營收')
    expect(wrapper.find('.ml-waterfall__pop').text()).toContain('1,500')
  })

  it('green-up and no values', () => {
    wrapper = mount(MlWaterfallChart, { props: { data: steps, upColor: 'green', showValues: false } })
    expect(wrapper.classes()).toContain('ml-waterfall--up-green')
    expect(wrapper.find('.ml-waterfall__value').exists()).toBe(false)
  })
})

describe('MlBoxPlot', () => {
  it('draws box, whiskers, median, mean and outliers', async () => {
    wrapper = mount(MlBoxPlot, { props: { data: [{ label: 'A', values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 100] }, { label: 'B', stats: { min: 1, q1: 2, median: 3, q3: 4, max: 5 } }, { label: '空', values: [] }] } })
    expect(wrapper.findAll('.ml-boxplot__box')).toHaveLength(2)
    expect(wrapper.findAll('.ml-boxplot__outlier')).toHaveLength(1)
    expect(wrapper.findAll('.ml-boxplot__mean')).toHaveLength(1)
    expect(wrapper.findAll('tbody tr')[2].text()).toBe('空—')
    await wrapper.find('.ml-boxplot__plot').trigger('keydown', { key: 'Home' })
    expect(wrapper.find('.ml-boxplot__pop').text()).toContain('中位數5.5')
  })
})

describe('MlBulletChart', () => {
  it('describes each row for screen readers', () => {
    wrapper = mount(MlBulletChart, { props: { data: [{ label: '營收', value: 270, target: 250, ranges: [150, 225, 300] }], bandLabels: ['差', '普通', '良好'] } })
    expect(wrapper.find('.ml-bullet__scale').attributes('aria-label')).toBe('營收：270，目標 250，落在「良好」區間')
    expect(wrapper.findAll('.ml-bullet__band')).toHaveLength(4)
    expect(wrapper.find('.ml-bullet__target').attributes('style')).toContain('left: 78.125%')
    expect(wrapper.find('.ml-bullet__value').text()).toBe('270 / 250')
  })
})
