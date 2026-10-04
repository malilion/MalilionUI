import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import { MlConfigProvider, MlFunnelChart, MlScatterChart, en } from '../src'
import { bubbleRadius, diamondPath, funnelStages, linearFit, nearestIndex, niceScale, percentText } from '../src/components/charts'

afterEach(() => {
  document.body.innerHTML = ''
})

const rect = (el: Element, r: Partial<DOMRect>) =>
  ((el as HTMLElement).getBoundingClientRect = () => ({ left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON() {}, ...r }) as DOMRect)

describe('chart math', () => {
  it('niceScale covers the data with round steps, without forcing zero', () => {
    expect(niceScale(12, 87, 5)).toEqual({ lo: 0, hi: 100, step: 20, values: [0, 20, 40, 60, 80, 100] })
    expect(niceScale(1, 5, 5).values).toEqual([1, 2, 3, 4, 5])
    expect(niceScale(102, 148, 4).values).toEqual([100, 120, 140, 160])
    expect(niceScale(0.12, 0.47, 4).values).toEqual([0.1, 0.2, 0.3, 0.4, 0.5])
    expect(niceScale(-3, 3, 4).values).toEqual([-4, -2, 0, 2, 4])
    // Degenerate and empty ranges still give a usable axis.
    expect(niceScale(5, 5, 5).lo).toBeLessThan(5)
    expect(niceScale(5, 5, 5).hi).toBeGreaterThan(5)
    expect(niceScale(Infinity, -Infinity, 5)).toMatchObject({ lo: 0, hi: 1 })
  })

  it('linearFit returns the least-squares line', () => {
    const fit = linearFit([{ x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 5 }])!
    expect(fit.slope).toBeCloseTo(2)
    expect(fit.intercept).toBeCloseTo(1)
    expect(fit.r2).toBeCloseTo(1)
    expect(linearFit([{ x: 1, y: 1 }])).toBeNull()
    expect(linearFit([{ x: 1, y: 1 }, { x: 1, y: 4 }])).toBeNull()
    expect(linearFit([{ x: 0, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 0 }, { x: 3, y: 1 }])!.r2).toBeLessThan(0.5)
  })

  it('bubbleRadius scales area, not radius', () => {
    expect(bubbleRadius(0, 0, 100, [0, 10])).toBe(0)
    expect(bubbleRadius(100, 0, 100, [0, 10])).toBe(10)
    expect(bubbleRadius(25, 0, 100, [0, 10])).toBeCloseTo(5)
    expect(bubbleRadius(7, 7, 7, [4, 18])).toBe(11)
    expect(bubbleRadius(500, 0, 100, [4, 18])).toBe(18)
  })

  it('nearestIndex respects the max distance', () => {
    const pts = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 50, y: 50 }]
    expect(nearestIndex(pts, 8, 1)).toBe(1)
    expect(nearestIndex(pts, 30, 30, 10)).toBe(-1)
    expect(nearestIndex([], 0, 0)).toBe(-1)
  })

  it('diamondPath and percentText', () => {
    expect(diamondPath(10, 10, 2)).toBe('M10.0 8.0L12.0 10.0L10.0 12.0L8.0 10.0Z')
    expect(percentText(0.625)).toBe('62.5%')
    expect(percentText(1)).toBe('100%')
    expect(percentText(1 / 3)).toBe('33.3%')
  })

  it('funnelStages computes conversions, drops and widths', () => {
    const stages = funnelStages([
      { label: 'A', value: 1000 },
      { label: 'B', value: 400 },
      { label: 'C', value: 10 },
      { label: 'D', value: 0 },
    ])
    expect(stages.map((s) => s.fromPrev)).toEqual([1, 0.4, 0.025, 0])
    expect(stages.map((s) => s.fromFirst)).toEqual([1, 0.4, 0.01, 0])
    expect(stages.map((s) => s.drop)).toEqual([0, 600, 390, 10])
    expect(stages.map((s) => s.width)).toEqual([1, 0.4, 0.06, 0.06])
    expect(funnelStages([{ label: 'x', value: 0 }, { label: 'y', value: 5 }])[1].fromPrev).toBe(0)
    expect(funnelStages([])).toEqual([])
  })
})

const scatterSeries = [
  { name: 'A', points: [{ x: 1, y: 10 }, { x: 3, y: 30 }, { x: 5, y: 50 }] },
  { name: 'B', tone: 'tech' as const, points: [{ x: 2, y: 25, size: 4, label: 'Beta' }, { x: 4, y: 12, size: 16 }] },
]

describe('MlScatterChart', () => {
  it('draws axes, points, trend lines and a data table', () => {
    const wrapper = mount(MlScatterChart, { props: { series: scatterSeries, trend: true } })
    expect(wrapper.findAll('.ml-scatter__pt')).toHaveLength(5)
    expect(wrapper.findAll('.ml-scatter__pt--bubble')).toHaveLength(2)
    expect(wrapper.findAll('.ml-scatter__trend')).toHaveLength(2)
    expect(wrapper.findAll('.ml-scatter__axis span').map((s) => s.text())).toEqual(['50', '40', '30', '20', '10'])
    expect(wrapper.findAll('.ml-scatter__x span').map((s) => s.text())).toEqual(['1', '2', '3', '4', '5'])
    expect(wrapper.get('[role="img"]').attributes('aria-label')).toBe('散佈圖：2 個數列，共 5 個資料點')
    const rows = wrapper.findAll('table tbody tr')
    expect(rows).toHaveLength(5)
    expect(rows[3].text()).toContain('Beta')
    expect(wrapper.findAll('thead th').map((t) => t.text())).toEqual(['數列', '資料點', 'X', 'Y', '大小'])
  })

  it('inspects points from the keyboard in x order and across series', async () => {
    const wrapper = mount(MlScatterChart, { props: { series: scatterSeries, xTitle: '年', format: (v: number) => `${v}!` } })
    const plot = wrapper.get('.ml-scatter__plot')
    expect(wrapper.find('.ml-scatter__tip').exists()).toBe(false)
    await plot.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.get('.ml-scatter__tip-title').text()).toBe('A')
    expect(wrapper.get('.ml-scatter__tip').text()).toContain('年')
    expect(wrapper.get('.ml-scatter__tip').text()).toContain('10!')
    await plot.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.get('.ml-scatter__tip-title').text()).toBe('Beta')
    expect(wrapper.get('.ml-scatter__tip').text()).toContain('大小')
    await plot.trigger('keydown', { key: 'ArrowUp' })
    // Back to series A, at the nearest x.
    expect(wrapper.get('.ml-scatter__tip-title').text()).toBe('A')
    await plot.trigger('keydown', { key: 'End' })
    expect(wrapper.get('.ml-scatter__tip').text()).toContain('5!')
    expect(wrapper.find('.ml-scatter__tip--left').exists()).toBe(true)
    expect(wrapper.findAll('.ml-scatter__focus')).toHaveLength(1)
    await plot.trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('.ml-scatter__tip').exists()).toBe(false)
  })

  it('snaps the pointer to the nearest point and ignores empty space', async () => {
    const wrapper = mount(MlScatterChart, { props: { series: [{ name: 'A', points: [{ x: 0, y: 0 }, { x: 10, y: 10 }] }], height: 216 } })
    const plot = wrapper.get('.ml-scatter__plot')
    rect(plot.element, { width: 600, height: 216 })
    // width defaults to 600 in jsdom; (10, 10) sits at the top-right corner (600, 8).
    plot.element.dispatchEvent(new MouseEvent('pointermove', { clientX: 590, clientY: 12 }))
    await wrapper.vm.$nextTick()
    expect(wrapper.get('.ml-scatter__tip').text()).toContain('10')
    plot.element.dispatchEvent(new MouseEvent('pointermove', { clientX: 300, clientY: 100 }))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.ml-scatter__tip').exists()).toBe(false)
  })

  it('toggles a series from the legend and supports shapes', async () => {
    const wrapper = mount(MlScatterChart, { props: { series: scatterSeries, shape: 'paw' } })
    expect(wrapper.findAll('path.ml-scatter__pt')).toHaveLength(5)
    const keys = wrapper.findAll('.ml-scatter__key')
    expect(keys[1].attributes('aria-pressed')).toBe('true')
    await keys[1].trigger('click')
    expect(wrapper.emitted('toggle')![0]).toEqual(['B', false])
    expect(keys[1].attributes('aria-pressed')).toBe('false')
    expect(keys[1].classes()).toContain('ml-scatter__key--off')
    expect(wrapper.findAll('.ml-scatter__pt')).toHaveLength(3)
    // Axes stay put when a series hides.
    expect(wrapper.findAll('.ml-scatter__axis span')[0].text()).toBe('50')
    await wrapper.setProps({ shape: 'diamond' })
    expect(wrapper.findAll('path.ml-scatter__pt')[0].attributes('d')).toMatch(/^M.*Z$/)
    expect(wrapper.find('circle.ml-scatter__pt').exists()).toBe(false)
  })

  it('renders an empty chart and follows the locale', () => {
    const wrapper = mount(MlScatterChart, { props: { series: [] } })
    expect(wrapper.findAll('.ml-scatter__pt')).toHaveLength(0)
    expect(wrapper.find('.ml-scatter__legend').exists()).toBe(false)
    const english = mount({ render: () => h(MlConfigProvider, { locale: en }, () => h(MlScatterChart, { series: scatterSeries })) })
    expect(english.get('[role="img"]').attributes('aria-label')).toBe('Scatter chart: 2 series, 5 points')
    expect(english.get('caption').text()).toBe('Scatter chart data')
  })
})

const funnel = [
  { label: '造訪', value: 1000 },
  { label: '加入', value: 400 },
  { label: '付款', value: 100, tone: 'success' as const },
]

describe('MlFunnelChart', () => {
  it('renders an ordered list with values and conversions', () => {
    const wrapper = mount(MlFunnelChart, { props: { data: funnel } })
    const list = wrapper.get('ol.ml-funnel__list')
    expect(list.attributes('aria-label')).toBe('漏斗圖：3 個階段，整體轉換率 10%')
    const items = wrapper.findAll('li.ml-funnel__stage')
    expect(items).toHaveLength(3)
    expect(items.map((li) => li.attributes('tabindex'))).toEqual(['0', '-1', '-1'])
    expect(wrapper.findAll('.ml-funnel__value').map((v) => v.text())).toEqual(['1,000', '400', '100'])
    expect(wrapper.findAll('.ml-funnel__share').map((v) => v.text())).toEqual(['100%', '40%', '10%'])
    expect(items[1].get('.ml-funnel__rate').text()).toContain('較上一階段40%')
    expect(items[2].get('.ml-funnel__rate').text()).toContain('25%')
    expect(items[2].get('.ml-funnel__rate .ml-visually-hidden').text()).toBe('(整體轉換 10%)')
    expect(items[0].get('.ml-funnel__rate small').text()).toBe('起點')
    expect(items[2].classes()).toContain('ml-funnel__stage--success')
    expect(wrapper.classes()).toEqual(expect.arrayContaining(['ml-funnel--vertical', 'ml-funnel--trapezoid']))
  })

  it('tapers each trapezoid into the next stage; rect keeps them straight', () => {
    const style = (w: ReturnType<typeof mount>, i: number) => w.findAll('li')[i].attributes('style')
    const trap = mount(MlFunnelChart, { props: { data: funnel } })
    expect(style(trap, 0)).toContain('--_a: 100; --_b: 40')
    const rectW = mount(MlFunnelChart, { props: { data: funnel, shape: 'rect', orientation: 'horizontal', share: false } })
    expect(style(rectW, 1)).toContain('--_a: 40; --_b: 40')
    expect(rectW.find('.ml-funnel__share').exists()).toBe(false)
    expect(rectW.classes()).toContain('ml-funnel--horizontal')
  })

  it('inspects stages with hover and the keyboard, and selects with Enter / click', async () => {
    const wrapper = mount(MlFunnelChart, { props: { data: funnel, format: (v: number) => `${v} 人` }, attachTo: document.body })
    const list = wrapper.get('ol')
    const items = wrapper.findAll('li')
    await items[1].trigger('pointerenter')
    expect(items[1].classes()).toContain('ml-funnel__stage--on')
    expect(wrapper.get('.ml-funnel__tip').text()).toContain('流失600 人')
    await list.trigger('pointerleave')
    expect(wrapper.find('.ml-funnel__tip').exists()).toBe(false)

    await list.trigger('keydown', { key: 'End' })
    await wrapper.vm.$nextTick()
    expect(document.activeElement).toBe(items[2].element)
    expect(items[2].attributes('tabindex')).toBe('0')
    expect(wrapper.get('.ml-funnel__tip-title').text()).toBe('付款')
    await list.trigger('keydown', { key: 'ArrowUp' })
    await wrapper.vm.$nextTick()
    expect(document.activeElement).toBe(items[1].element)
    await list.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('select')![0]).toEqual([1, funnel[1]])
    await items[0].trigger('click')
    expect(wrapper.emitted('select')![1]).toEqual([0, funnel[0]])
    // The first stage's tip has no "from previous" / "dropped" rows.
    await list.trigger('keydown', { key: 'Home' })
    expect(wrapper.findAll('.ml-funnel__tip-row')).toHaveLength(2)
    await list.trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('.ml-funnel__tip').exists()).toBe(false)
    wrapper.unmount()
  })

  it('follows the locale', () => {
    const english = mount({ render: () => h(MlConfigProvider, { locale: en }, () => h(MlFunnelChart, { data: funnel })) })
    expect(english.get('ol').attributes('aria-label')).toBe('Funnel chart: 3 stages, 10% overall conversion')
    expect(english.find('.ml-funnel__rate small').text()).toBe('Start')
  })
})
