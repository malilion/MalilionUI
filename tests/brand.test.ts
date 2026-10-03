import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import {
  MlChat,
  MlChatInput,
  MlChatMessage,
  MlCodeBlock,
  MlGauge,
  MlHeatmap,
  MlRadarChart,
  MlTour,
  highlight,
} from '../src'

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('MlHeatmap', () => {
  it('lays out one cell per day, sums duplicates and grades levels', () => {
    const end = new Date(2026, 9, 3) // a Saturday
    const wrapper = mount(MlHeatmap, {
      props: {
        end,
        weeks: 2,
        thresholds: [1, 3, 5, 8],
        data: [
          { date: '2026-10-03', count: 4 },
          { date: new Date(2026, 9, 3), count: 4 },
          { date: new Date(2026, 9, 1), count: 1 },
        ],
      },
    })
    expect(wrapper.findAll('.ml-heatmap__cell')).toHaveLength(14)
    expect(wrapper.findAll('rect.ml-heatmap__cell--l4')).toHaveLength(1) // 4 + 4 = 8
    expect(wrapper.findAll('rect.ml-heatmap__cell--l1')).toHaveLength(1)
    expect(wrapper.find('.ml-heatmap__total').text()).toContain('9')
    expect(wrapper.findAll('.ml-heatmap__swatch')).toHaveLength(5)
  })

  it('draws paws and emits the clicked day', async () => {
    const wrapper = mount(MlHeatmap, { props: { end: new Date(2026, 9, 3), weeks: 1, cell: 'paw', data: [] } })
    const cells = wrapper.findAll('path.ml-heatmap__cell')
    expect(cells).toHaveLength(7)
    await cells[6].trigger('click')
    const [date, count] = wrapper.emitted('select')![0] as [Date, number]
    expect(date.getDate()).toBe(3)
    expect(count).toBe(0)
  })
})

describe('MlCodeBlock / highlight', () => {
  it('colours tokens and keeps multi-line comments valid per line', () => {
    expect(highlight(`const a = 'x' // hi`)).toContain('<span class="tok-keyword">const</span>')
    const html = highlight('/* one\ntwo */ x')
    expect(html.split('\n')[0]).toBe('<span class="tok-comment">/* one</span>')
    expect(highlight('<b>&</b>')).toContain('&amp;')
    // # is a comment only in shell snippets
    expect(highlight('# note', 'bash')).toContain('tok-comment')
    expect(highlight('<template #actions>', 'vue')).not.toContain('tok-comment')
  })

  it('renders line numbers, highlighted lines and copies the code', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    const wrapper = mount(MlCodeBlock, { props: { code: 'a\nb\nc\n', lineNumbers: true, highlight: [2], filename: 'x.ts' } })
    expect(wrapper.findAll('.ml-code__line')).toHaveLength(3)
    expect(wrapper.findAll('.ml-code__num').map((n) => n.text())).toEqual(['1', '2', '3'])
    expect(wrapper.findAll('.ml-code__line')[1].classes()).toContain('ml-code__line--hl')
    await wrapper.findAll('button').at(-1)!.trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenCalledWith('a\nb\nc')
    expect(wrapper.emitted('copy')?.[0]).toEqual(['a\nb\nc'])
  })
})

describe('MlTour', () => {
  it('walks the steps, spotlights targets and emits finish', async () => {
    document.body.innerHTML = '<button id="t1">one</button>'
    const wrapper = mount(MlTour, {
      props: {
        steps: [{ title: 'Hi' }, { target: '#t1', title: 'Button' }],
        open: true,
        'onUpdate:current': (v: number) => wrapper.setProps({ current: v }),
        'onUpdate:open': (v: boolean) => wrapper.setProps({ open: v }),
      },
      attachTo: document.body,
    })
    await flushPromises()
    const title = () => document.querySelector('.ml-tour__title')?.textContent
    expect(title()).toBe('Hi')
    expect(document.querySelector('.ml-tour__dim')).not.toBeNull() // no target: centred, plain dim
    ;[...document.querySelectorAll<HTMLButtonElement>('.ml-tour__foot button')].at(-1)!.click()
    await flushPromises()
    expect(title()).toBe('Button')
    expect(document.querySelector('.ml-tour__spot')).not.toBeNull()
    ;[...document.querySelectorAll<HTMLButtonElement>('.ml-tour__foot button')].at(-1)!.click()
    await flushPromises()
    expect(wrapper.emitted('finish')).toHaveLength(1)
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
  })
})

describe('Chat', () => {
  it('MlChatInput sends on Enter, not on Shift+Enter or while composing', async () => {
    const wrapper = mount(MlChatInput, {
      props: { modelValue: 'hello', 'onUpdate:modelValue': (v: string) => wrapper.setProps({ modelValue: v }) },
    })
    const area = wrapper.get('textarea')
    await area.trigger('keydown', { key: 'Enter', shiftKey: true })
    await area.trigger('keydown', { key: 'Enter', isComposing: true })
    expect(wrapper.emitted('send')).toBeUndefined()
    await area.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('send')?.[0]).toEqual(['hello'])
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([''])
  })

  it('MlChatInput shows stop while loading', async () => {
    const wrapper = mount(MlChatInput, { props: { modelValue: 'x', loading: true } })
    await wrapper.get('.ml-chat-input__btn--stop').trigger('click')
    expect(wrapper.emitted('stop')).toHaveLength(1)
  })

  it('MlChatMessage renders roles, typing dots and status', () => {
    const user = mount(MlChatMessage, { props: { role: 'user', content: 'yo', status: 'error' } })
    expect(user.classes()).toContain('ml-chat-msg--user')
    expect(user.text()).toContain('傳送失敗')
    const typing = mount(MlChatMessage, { props: { typing: true } })
    expect(typing.findAll('.ml-chat-msg__typing svg')).toHaveLength(3)
    const system = mount(MlChatMessage, { props: { role: 'system', content: 'Today' } })
    expect(system.classes()).toContain('ml-chat-msg--system')
  })

  it('MlChat is a polite log', () => {
    const wrapper = mount(MlChat, { slots: { default: 'msg' } })
    expect(wrapper.get('[role="log"]').attributes('aria-live')).toBe('polite')
  })
})

describe('MlRadarChart / MlGauge', () => {
  it('radar draws a ring per level and a polygon per series', () => {
    const wrapper = mount(MlRadarChart, {
      props: {
        indicators: [{ label: 'A', max: 10 }, { label: 'B', max: 10 }, { label: 'C', max: 10 }],
        series: [{ name: 'x', values: [10, 5, 0] }, { name: 'y', values: [1, 2, 3] }],
        rings: 3,
      },
    })
    expect(wrapper.findAll('.ml-radar__grid polygon')).toHaveLength(3)
    expect(wrapper.findAll('.ml-radar__area')).toHaveLength(2)
    expect(wrapper.find('.ml-radar__legend').exists()).toBe(true)
    expect(wrapper.get('svg').attributes('aria-label')).toContain('A 10')
  })

  it('gauge is a meter and switches tone by band', async () => {
    const wrapper = mount(MlGauge, {
      props: { value: 50, unit: '%', bands: [{ from: 0, tone: 'success' }, { from: 90, tone: 'danger' }] },
    })
    const meter = wrapper.get('[role="meter"]')
    expect(meter.attributes('aria-valuenow')).toBe('50')
    expect(meter.attributes('aria-valuetext')).toBe('50%')
    expect(wrapper.classes()).toContain('ml-gauge--success')
    await wrapper.setProps({ value: 95 })
    expect(wrapper.classes()).toContain('ml-gauge--danger')
    await wrapper.setProps({ value: 500 })
    expect(wrapper.get('.ml-gauge__value').text()).toBe('500%')
    await nextTick()
  })
})
