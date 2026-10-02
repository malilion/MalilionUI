import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { MlAutocomplete, MlDateTimePicker, MlSegmented, MlTimePicker, MlTimeline, MlTree } from '../src'
import { formatTime, parseTime } from '../src/components/time'

afterEach(() => {
  document.body.innerHTML = ''
  vi.useRealTimers()
})

describe('MlSegmented', () => {
  const options = [
    { value: 'day', label: '日' },
    { value: 'week', label: '週' },
    { value: 'month', label: '月', disabled: true },
    { value: 'year', label: '年' },
  ]

  it('is a radio group with one tab stop; arrows select and skip disabled', async () => {
    const wrapper = mount(MlSegmented, { props: { options, modelValue: 'day', label: '範圍' }, attachTo: document.body })
    expect(wrapper.get('[role="radiogroup"]').attributes('aria-label')).toBe('範圍')
    const radios = wrapper.findAll('[role="radio"]')
    expect(radios.map((r) => r.attributes('tabindex'))).toEqual(['0', '-1', '-1', '-1'])
    expect(radios[0].attributes('aria-checked')).toBe('true')

    await radios[0].trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['week'])
    await wrapper.setProps({ modelValue: 'week' })
    await radios[1].trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.emitted('update:modelValue')?.[1]).toEqual(['year'])
    await wrapper.setProps({ modelValue: 'year' })
    await radios[3].trigger('keydown', { key: 'ArrowLeft' })
    expect(wrapper.emitted('update:modelValue')?.[2]).toEqual(['week'])
    await wrapper.setProps({ modelValue: 'week' })
    await radios[1].trigger('keydown', { key: 'Home' })
    expect(wrapper.emitted('update:modelValue')?.[3]).toEqual(['day'])
  })

  it('ignores clicks on disabled segments', async () => {
    const wrapper = mount(MlSegmented, { props: { options, modelValue: 'day' } })
    await wrapper.findAll('[role="radio"]')[2].trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })
})

describe('MlTimeline', () => {
  const items = [
    { title: 'Created', time: '09:00' },
    { title: 'Reviewed', time: '10:30', tone: 'tech' as const, desc: 'Looks good' },
    { title: 'Deployed', time: '11:00', tone: 'success' as const, paw: true },
  ]

  it('renders items in order with tones, and a pending node', () => {
    const wrapper = mount(MlTimeline, { props: { items, pending: 'Monitoring…' } })
    const titles = wrapper.findAll('.ml-timeline__title').map((t) => t.text())
    expect(titles).toEqual(['Created', 'Reviewed', 'Deployed', 'Monitoring…'])
    expect(wrapper.findAll('.ml-timeline__item')[1].classes()).toContain('ml-timeline__item--tech')
    expect(wrapper.find('.ml-timeline__paw').exists()).toBe(true)
    expect(wrapper.find('.ml-timeline__item--pending').exists()).toBe(true)
  })

  it('reverse puts the newest first', () => {
    const wrapper = mount(MlTimeline, { props: { items, reverse: true } })
    expect(wrapper.findAll('.ml-timeline__title').map((t) => t.text())).toEqual(['Deployed', 'Reviewed', 'Created'])
  })
})

describe('MlAutocomplete', () => {
  it('keeps free text, filters suggestions and picks with the keyboard', async () => {
    const wrapper = mount(MlAutocomplete, {
      props: { suggestions: ['Simba', 'Nala', 'Sarabi', 'Scar'], modelValue: '' },
      attachTo: document.body,
    })
    const input = wrapper.get('input')
    await input.setValue('sa')
    await wrapper.setProps({ modelValue: 'sa' })
    expect(wrapper.findAll('[role="option"]').map((o) => o.text())).toEqual(['Sarabi'])
    expect(input.attributes('aria-expanded')).toBe('true')

    await input.trigger('keydown', { key: 'ArrowDown' })
    expect(input.attributes('aria-activedescendant')).toBeTruthy()
    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['Sarabi'])
    expect(wrapper.emitted('select')?.[0]?.[0]).toMatchObject({ value: 'Sarabi' })
  })

  it('lets Enter through to the form when nothing is highlighted', async () => {
    const wrapper = mount(MlAutocomplete, { props: { suggestions: ['Simba'], modelValue: 's' }, attachTo: document.body })
    const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true, bubbles: true })
    wrapper.get('input').element.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(false)
  })

  it('debounces async fetches and only applies the latest result', async () => {
    vi.useFakeTimers()
    const fetch = vi.fn(async (q: string) => [`${q}-1`, `${q}-2`])
    const wrapper = mount(MlAutocomplete, {
      props: { fetchSuggestions: fetch, debounce: 100, modelValue: '' },
      attachTo: document.body,
    })
    const input = wrapper.get('input')
    for (const q of ['l', 'li', 'lio']) {
      await input.setValue(q)
      await wrapper.setProps({ modelValue: q })
    }
    expect(input.attributes('aria-busy')).toBe('true')
    await vi.advanceTimersByTimeAsync(120)
    await flushPromises()
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith('lio')
    expect(wrapper.findAll('[role="option"]').map((o) => o.text())).toEqual(['lio-1', 'lio-2'])
  })
})

describe('time helpers', () => {
  it.each([
    ['09:05', { h: 9, m: 5, s: 0 }],
    ['23:59:30', { h: 23, m: 59, s: 30 }],
    ['24:00', null],
    ['9:7', null],
    ['', null],
  ])('parseTime(%j)', (input, expected) => {
    expect(parseTime(input)).toEqual(expected)
  })

  it('formatTime pads and optionally adds seconds', () => {
    expect(formatTime({ h: 7, m: 3, s: 9 })).toBe('07:03')
    expect(formatTime({ h: 7, m: 3, s: 9 }, true)).toBe('07:03:09')
  })
})

describe('MlTimePicker', () => {
  it('opens a panel of wheels and writes HH:mm', async () => {
    const wrapper = mount(MlTimePicker, { props: { modelValue: '08:30', minuteStep: 15 }, attachTo: document.body })
    await wrapper.get('button.ml-timepicker__trigger').trigger('click')
    await nextTick()
    const cols = wrapper.findAll('[role="listbox"]')
    expect(cols.map((c) => c.attributes('aria-label'))).toEqual(['時', '分'])
    expect(cols[1].findAll('[role="option"]').map((o) => o.text())).toEqual(['00', '15', '30', '45'])
    expect(cols[0].get('[aria-selected="true"]').text()).toBe('08')

    await cols[0].findAll('[role="option"]')[14].trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['14:30'])

    await wrapper.setProps({ modelValue: '14:30' })
    await cols[1].trigger('keydown', { key: 'ArrowDown' })
    expect(wrapper.emitted('update:modelValue')?.[1]).toEqual(['14:45'])
  })

  it('disables times outside min / max', async () => {
    const wrapper = mount(MlTimePicker, { props: { modelValue: '09:00', min: '09:30', max: '17:00' }, attachTo: document.body })
    await wrapper.get('button.ml-timepicker__trigger').trigger('click')
    await nextTick()
    const [hours, minutes] = wrapper.findAll('[role="listbox"]')
    const disabledHours = hours.findAll('[aria-disabled="true"]').map((o) => o.text())
    expect(disabledHours).toContain('08')
    expect(disabledHours).toContain('18')
    expect(disabledHours).not.toContain('09')
    expect(minutes.findAll('[role="option"]')[0].attributes('aria-disabled')).toBe('true') // 09:00 < 09:30
    expect(minutes.findAll('[role="option"]')[45].attributes('aria-disabled')).toBeUndefined()
  })

  it('Escape closes the panel and returns focus to the trigger', async () => {
    const wrapper = mount(MlTimePicker, { attachTo: document.body })
    const trigger = wrapper.get('button.ml-timepicker__trigger')
    await trigger.trigger('click')
    await nextTick()
    await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(document.activeElement).toBe(trigger.element)
  })
})

describe('MlDateTimePicker', () => {
  it('keeps the time when a new day is picked, and the day when the time changes', async () => {
    const start = new Date(2025, 4, 16, 9, 45)
    const wrapper = mount(MlDateTimePicker, { props: { modelValue: start }, attachTo: document.body })
    await wrapper.get('.ml-datepicker__trigger').trigger('click')
    await nextTick()
    await wrapper.get('[data-day="2025-05-20"]').trigger('click')
    const picked = wrapper.emitted('update:modelValue')?.[0]?.[0] as Date
    expect([picked.getDate(), picked.getHours(), picked.getMinutes()]).toEqual([20, 9, 45])

    await wrapper.setProps({ modelValue: picked })
    const hours = wrapper.findAll('[role="listbox"]')[0]
    await hours.findAll('[role="option"]')[18].trigger('click')
    const timed = wrapper.emitted('update:modelValue')?.[1]?.[0] as Date
    expect([timed.getDate(), timed.getHours(), timed.getMinutes()]).toEqual([20, 18, 45])
  })
})

describe('MlTree', () => {
  const data = [
    {
      key: 'src',
      label: 'src',
      children: [
        { key: 'components', label: 'components', children: [{ key: 'btn', label: 'MlButton.vue' }, { key: 'card', label: 'MlCard.vue' }] },
        { key: 'index', label: 'index.ts' },
      ],
    },
    { key: 'readme', label: 'README.md' },
  ]
  const visible = (w: ReturnType<typeof mount>) => w.findAll('[role="treeitem"]').map((r) => r.text())

  it('renders only expanded branches with ARIA levels and positions', () => {
    const wrapper = mount(MlTree, { props: { data, expanded: ['src'] } })
    expect(visible(wrapper)).toEqual(['src', 'components', 'index.ts', 'README.md'])
    const row = wrapper.findAll('[role="treeitem"]')[1]
    expect(row.attributes('aria-level')).toBe('2')
    expect(row.attributes('aria-posinset')).toBe('1')
    expect(row.attributes('aria-setsize')).toBe('2')
    expect(row.attributes('aria-expanded')).toBe('false')
  })

  it('follows the WAI-ARIA tree keyboard model', async () => {
    const wrapper = mount(MlTree, {
      props: { data, expanded: [] as (string | number)[], 'onUpdate:expanded': (v: (string | number)[]) => wrapper.setProps({ expanded: v }) },
      attachTo: document.body,
    })
    const rows = () => wrapper.findAll('[role="treeitem"]')
    expect(rows()[0].attributes('tabindex')).toBe('0')
    await rows()[0].trigger('keydown', { key: 'ArrowRight' }) // expand src
    expect(visible(wrapper)).toEqual(['src', 'components', 'index.ts', 'README.md'])
    await rows()[0].trigger('keydown', { key: 'ArrowRight' }) // into first child
    await flushPromises()
    expect(document.activeElement?.textContent).toBe('components')
    await rows()[1].trigger('keydown', { key: 'ArrowLeft' }) // collapsed → to parent
    await flushPromises()
    expect(document.activeElement?.textContent).toBe('src')
    await rows()[0].trigger('keydown', { key: 'ArrowLeft' }) // collapse
    expect(visible(wrapper)).toEqual(['src', 'README.md'])
    await rows()[0].trigger('keydown', { key: 'r' }) // typeahead
    await flushPromises()
    expect(document.activeElement?.textContent).toBe('README.md')
    await rows()[1].trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update:selected')?.[0]).toEqual(['readme'])
  })

  it('cascades checks down and derives parents (tri-state)', async () => {
    const wrapper = mount(MlTree, {
      props: {
        data,
        checkable: true,
        expanded: ['src', 'components'],
        checked: [] as (string | number)[],
        'onUpdate:checked': (v: (string | number)[]) => wrapper.setProps({ checked: v }),
      },
    })
    const row = (label: string) => wrapper.findAll('[role="treeitem"]').find((r) => r.text() === label)!
    await row('MlButton.vue').get('.ml-tree__check').trigger('click')
    expect(row('components').attributes('aria-checked')).toBe('mixed')
    expect(row('src').attributes('aria-checked')).toBe('mixed')

    await row('MlCard.vue').get('.ml-tree__check').trigger('click')
    expect(row('components').attributes('aria-checked')).toBe('true')

    await row('src').trigger('keydown', { key: ' ' })
    expect(row('src').attributes('aria-checked')).toBe('true')
    expect(wrapper.props('checked')).toEqual(expect.arrayContaining(['src', 'components', 'btn', 'card', 'index']))

    await row('src').trigger('keydown', { key: ' ' })
    expect(wrapper.props('checked')).toEqual([])
  })

  it('filters to matches plus ancestors, auto-expanded', () => {
    const wrapper = mount(MlTree, { props: { data, filter: 'card' } })
    expect(visible(wrapper)).toEqual(['src', 'components', 'MlCard.vue'])
    expect(wrapper.find('.ml-combobox__hit').text()).toBe('Card')
    const none = mount(MlTree, { props: { data, filter: 'zzz' } })
    expect(none.text()).toContain('沒有符合的節點')
  })
})
