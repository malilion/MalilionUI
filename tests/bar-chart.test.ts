import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import { MlBarChart, MlConfigProvider, en } from '../src'
import { barLayout, zeroScale } from '../src/components/charts'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('bar chart math', () => {
  it('zeroScale keeps zero on a gridline with round steps', () => {
    expect(zeroScale(0, 87, 4)).toEqual({ lo: 0, hi: 100, step: 25, values: [0, 25, 50, 75, 100] })
    expect(zeroScale(-10, 50, 4).values).toEqual([-15, 0, 15, 30, 45, 60])
    expect(zeroScale(-40, -5, 4)).toMatchObject({ lo: -40, hi: 0 })
    // Positive-only data still gets at least `ticks` steps; empty data a usable axis.
    expect(zeroScale(0, 3, 4).values).toHaveLength(5)
    expect(zeroScale(Infinity, -Infinity, 4)).toMatchObject({ lo: 0, hi: 1 })
  })

  it('barLayout groups bars from the zero baseline', () => {
    const l = barLayout([[5, -3], [2, 8]], 2, 'grouped')
    expect(l.categories[1].segments.map((s) => [s.from, s.to])).toEqual([[0, -3], [0, 8]])
    expect(l.lo).toBeLessThan(0)
    expect(l.values).toContain(0)
    expect(l.categories[0].top).toBe(5)
  })

  it('barLayout stacks positives up and negatives down', () => {
    const l = barLayout([[1, 2], [3, -1]], 2, 'stacked')
    expect(l.categories[0].segments.map((s) => [s.from, s.to])).toEqual([[0, 1], [1, 4]])
    expect(l.categories[0]).toMatchObject({ total: 4, top: 4 })
    expect(l.categories[1].segments.map((s) => [s.from, s.to])).toEqual([[0, 2], [0, -1]])
    expect(l.categories[1]).toMatchObject({ total: 1, top: 2 })
    expect(l.lo).toBeLessThanOrEqual(-1)
    expect(l.hi).toBeGreaterThanOrEqual(4)
  })

  it('barLayout stacks to 100% and leaves hidden series out', () => {
    const l = barLayout([[1, 3], [3, 1]], 2, 'percent')
    expect(l.categories[0].segments.map((s) => [s.from, s.to])).toEqual([[0, 0.25], [0.25, 1]])
    expect(l.categories[0].segments[1].share).toBe(0.75)
    expect(l).toMatchObject({ lo: 0, hi: 1, values: [0, 0.25, 0.5, 0.75, 1] })
    const hidden = barLayout([[1, 3], [3, 1]], 2, 'stacked', [true, false])
    expect(hidden.categories[0].segments).toHaveLength(1)
    expect(hidden.categories[0].total).toBe(1)
    // With everything hidden the axis still covers the data.
    expect(barLayout([[10, 30]], 2, 'stacked', [false]).hi).toBeGreaterThanOrEqual(30)
  })
})

const labels = ['一月', '二月', '三月']
const series = [
  { name: '線上', data: [40, 55, -10] },
  { name: '門市', data: [20, 25, 30], tone: 'tech' as const },
]

describe('MlBarChart multi-series', () => {
  it('keeps the single-series markup when no series are given', () => {
    const wrapper = mount(MlBarChart, { props: { data: [{ label: 'A', value: 3 }] } })
    expect(wrapper.classes()).not.toContain('ml-bars--multi')
    expect(wrapper.find('.ml-bars__legend').exists()).toBe(false)
  })

  it('draws grouped bars with a shared zero baseline and a data table', () => {
    const wrapper = mount(MlBarChart, { props: { series, labels } })
    expect(wrapper.classes()).toContain('ml-bars--grouped')
    expect(wrapper.findAll('.ml-bars__slot')).toHaveLength(6)
    expect(wrapper.findAll('.ml-bars__seg--neg')).toHaveLength(1)
    expect(wrapper.findAll('.ml-bars__grid .ml-bars__zero')).toHaveLength(1)
    expect(wrapper.get('.ml-bars__plot').attributes('aria-label')).toBe('分組長條圖：2 個數列、3 個類別')
    expect(wrapper.findAll('tbody tr')).toHaveLength(3)
    expect(wrapper.get('tbody tr').text()).toContain('40')
  })

  it('stacks with totals and inspects a category by keyboard and pointer', async () => {
    const wrapper = mount(MlBarChart, { props: { series, labels, mode: 'stacked', showTotal: true }, attachTo: document.body })
    expect(wrapper.classes()).toContain('ml-bars--totals')
    expect(wrapper.findAll('.ml-bars__total').map((t) => t.text())).toEqual(['60', '80', '20'])
    const plot = wrapper.get('.ml-bars__plot')
    await plot.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.get('.ml-bars__pop-title').text()).toBe('一月')
    expect(wrapper.findAll('.ml-bars__pop-row').map((r) => r.text())).toEqual(['線上40', '門市20', '合計60'])
    await plot.trigger('keydown', { key: 'End' })
    expect(wrapper.get('.ml-bars__pop').classes()).toContain('ml-bars__pop--left')
    expect(wrapper.findAll('.ml-bars__col')[2].classes()).toContain('ml-bars__col--on')
    await plot.trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('.ml-bars__pop').exists()).toBe(false)
    await wrapper.findAll('.ml-bars__col')[1].trigger('pointerenter')
    expect(wrapper.get('.ml-bars__pop-title').text()).toBe('二月')
    await plot.trigger('pointerleave')
    expect(wrapper.find('.ml-bars__pop').exists()).toBe(false)
  })

  it('shows shares in percent mode', async () => {
    const wrapper = mount(MlBarChart, { props: { series, labels, mode: 'percent' } })
    expect(wrapper.findAll('.ml-bars__axis span').map((s) => s.text())).toEqual(['100%', '75%', '50%', '25%', '0%'])
    await wrapper.get('.ml-bars__plot').trigger('keydown', { key: 'Home' })
    expect(wrapper.findAll('.ml-bars__pop-row')[0].text()).toBe('線上40 · 66.7%')
  })

  it('toggles series from the legend', async () => {
    const wrapper = mount(MlBarChart, { props: { series, labels, mode: 'stacked', showTotal: true } })
    const keys = wrapper.findAll('.ml-bars__key')
    expect(keys[0].attributes('aria-pressed')).toBe('true')
    expect(keys[0].attributes('aria-label')).toBe('顯示或隱藏「線上」')
    await keys[0].trigger('click')
    expect(wrapper.emitted('toggle')).toEqual([['線上', false]])
    expect(keys[0].classes()).toContain('ml-bars__key--off')
    expect(wrapper.findAll('.ml-bars__total').map((t) => t.text())).toEqual(['20', '25', '30'])
    await keys[0].trigger('click')
    expect(wrapper.emitted('toggle')![1]).toEqual(['線上', true])
    expect(wrapper.findAll('.ml-bars__seg')).toHaveLength(6)
  })

  it('follows the locale', () => {
    const wrapper = mount(MlConfigProvider, { props: { locale: en }, slots: { default: () => h(MlBarChart, { series, labels, mode: 'percent' }) } })
    expect(wrapper.get('.ml-bars__plot').attributes('aria-label')).toBe('100% stacked bar chart: 2 series, 3 categories')
    expect(wrapper.get('caption').text()).toBe('Bar chart data')
  })
})
