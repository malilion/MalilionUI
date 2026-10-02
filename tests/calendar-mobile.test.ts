import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import { MlCalendar, MlDatePicker, MlList, MlListItem, MlNavBar, MlPhone, MlTabBar } from '../src'
import { addMonths, monthGrid } from '../src/components/dates'

const day = (y: number, m: number, d: number) => new Date(y, m - 1, d)
const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

describe('date helpers', () => {
  it('builds a 6-week grid starting on the requested weekday', () => {
    // April 2025 starts on a Tuesday.
    const sunday = monthGrid(2025, 3, 0)
    expect(sunday).toHaveLength(42)
    expect(key(sunday[0])).toBe('2025-03-30')
    expect(key(monthGrid(2025, 3, 1)[0])).toBe('2025-03-31')
  })

  it('clamps month arithmetic to the last day', () => {
    expect(key(addMonths(day(2024, 1, 31), 1))).toBe('2024-02-29')
    expect(key(addMonths(day(2025, 3, 31), -1))).toBe('2025-02-28')
  })
})

describe('MlCalendar', () => {
  afterEach(() => vi.useRealTimers())

  function mountCal(props: Record<string, unknown> = {}) {
    return mount(MlCalendar, { props: { modelValue: day(2025, 4, 16), ...props }, attachTo: document.body })
  }

  it('shows the month of the selected date and marks it selected', () => {
    const wrapper = mountCal()
    expect(wrapper.get('.ml-calendar__title').text()).toContain('2025')
    const selected = wrapper.get('[data-day="2025-04-16"]')
    expect(selected.classes()).toContain('ml-calendar__day--selected')
    expect(selected.attributes('tabindex')).toBe('0')
    expect(wrapper.findAll('[tabindex="0"]')).toHaveLength(1)
    wrapper.unmount()
  })

  it('selects a day on click and respects min / disabledDate', async () => {
    const wrapper = mountCal({
      min: day(2025, 4, 10),
      disabledDate: (d: Date) => d.getDay() === 0,
    })
    expect(wrapper.get('[data-day="2025-04-09"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-day="2025-04-13"]').attributes('disabled')).toBeDefined() // a Sunday
    await wrapper.get('[data-day="2025-04-22"]').trigger('click')
    expect(key(wrapper.emitted('update:modelValue')![0][0] as Date)).toBe('2025-04-22')
    wrapper.unmount()
  })

  it('moves focus with the arrow keys and pages across months', async () => {
    const wrapper = mountCal()
    const grid = wrapper.get('[role="grid"]')
    await grid.trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    expect((document.activeElement as HTMLElement).dataset.day).toBe('2025-04-23')

    await grid.trigger('keydown', { key: 'PageDown' })
    await nextTick()
    expect((document.activeElement as HTMLElement).dataset.day).toBe('2025-05-23')
    expect(wrapper.emitted('month-change')?.at(-1)).toEqual([2025, 4])

    await grid.trigger('keydown', { key: 'Enter' })
    expect(key(wrapper.emitted('update:modelValue')![0][0] as Date)).toBe('2025-05-23')
    wrapper.unmount()
  })

  it('picks a range in either order', async () => {
    const wrapper = mount(MlCalendar, {
      props: {
        mode: 'range' as const,
        range: [null, null] as [Date | null, Date | null],
        'onUpdate:range': (v: [Date | null, Date | null]) => wrapper.setProps({ range: v }),
      },
    })
    await wrapper.setProps({ range: [day(2025, 4, 20), null] })
    await wrapper.get('[data-day="2025-04-12"]').trigger('click')
    const [start, end] = wrapper.props('range') as [Date, Date]
    expect([key(start), key(end)]).toEqual(['2025-04-12', '2025-04-20'])
    expect(wrapper.get('[data-day="2025-04-15"]').element.parentElement!.className).toContain('ml-calendar__cell--range')
  })

  it('marks today and draws paw markers', () => {
    vi.useFakeTimers()
    vi.setSystemTime(day(2025, 4, 3))
    const wrapper = mount(MlCalendar, { props: { markers: [day(2025, 4, 18)] } })
    expect(wrapper.get('[aria-current="date"]').attributes('data-day')).toBe('2025-04-03')
    expect(wrapper.find('[data-day="2025-04-18"] .ml-calendar__marker').exists()).toBe(true)
  })
})

describe('MlDatePicker', () => {
  it('opens a calendar dialog, picks a date and closes back to the trigger', async () => {
    const wrapper = mount(MlDatePicker, {
      props: {
        label: '生日',
        modelValue: day(2025, 4, 16),
        'onUpdate:modelValue': (v: Date | null) => wrapper.setProps({ modelValue: v }),
      },
      attachTo: document.body,
    })
    const trigger = wrapper.get('[aria-haspopup="dialog"]')
    expect(wrapper.get('label').attributes('for')).toBe(trigger.attributes('id'))
    expect(trigger.text()).toContain('2025')

    await trigger.trigger('click')
    await nextTick()
    await nextTick()
    expect(trigger.attributes('aria-expanded')).toBe('true')
    expect((document.activeElement as HTMLElement).dataset.day).toBe('2025-04-16')

    await wrapper.get('[data-day="2025-04-25"]').trigger('click')
    expect(key(wrapper.props('modelValue') as Date)).toBe('2025-04-25')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(document.activeElement).toBe(trigger.element)
    wrapper.unmount()
  })

  it('closes on Escape and can be cleared', async () => {
    const wrapper = mount(MlDatePicker, {
      props: { clearable: true, modelValue: day(2025, 4, 16) },
      attachTo: document.body,
    })
    await wrapper.get('[aria-haspopup="dialog"]').trigger('click')
    await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)

    await wrapper.get('[aria-label="清除日期"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([null])
    wrapper.unmount()
  })
})

describe('mobile', () => {
  it('MlPhone renders its screen content and bottom slot', () => {
    const wrapper = mount(MlPhone, {
      props: { label: '登入畫面' },
      slots: { default: '<p>Hello</p>', bottom: '<nav>tabs</nav>' },
    })
    expect(wrapper.attributes('aria-label')).toBe('登入畫面')
    expect(wrapper.get('.ml-phone__content').text()).toBe('Hello')
    expect(wrapper.get('.ml-phone__bottom').text()).toBe('tabs')
  })

  it('MlNavBar emits back', async () => {
    const wrapper = mount(MlNavBar, { props: { title: 'Messages', back: true } })
    await wrapper.get('[aria-label="返回"]').trigger('click')
    expect(wrapper.emitted('back')).toHaveLength(1)
    expect(wrapper.text()).toContain('Messages')
  })

  it('MlTabBar switches tabs and splits around the paw action', async () => {
    const items = [
      { value: 'home', label: 'Home', icon: 'home' as const },
      { value: 'explore', label: 'Explore', icon: 'compass' as const },
      { value: 'inbox', label: 'Inbox', icon: 'message' as const, badge: 3 },
      { value: 'me', label: 'Me', icon: 'user' as const },
    ]
    const wrapper = mount(MlTabBar, {
      props: {
        items,
        actionLabel: '新增',
        modelValue: 'home',
        'onUpdate:modelValue': (v?: string) => wrapper.setProps({ modelValue: v }),
      },
    })
    const buttons = wrapper.findAll('button')
    expect(buttons.map((b) => b.attributes('aria-label') ?? b.text())).toEqual(['Home', 'Explore', '新增', '3Inbox', 'Me'])
    await buttons[3].trigger('click')
    expect(wrapper.get('[aria-current="page"]').text()).toContain('Inbox')
    await wrapper.get('[aria-label="新增"]').trigger('click')
    expect(wrapper.emitted('action')).toHaveLength(1)
  })

  it('MlListItem renders as a button, link or plain row', async () => {
    const wrapper = mount(MlList, {
      props: { title: 'Today' },
      slots: {
        default: () => [
          mountItem({ title: 'Malilion Bot', subtitle: 'Your design is amazing!', meta: '10:24', badge: 2, clickable: true }),
          mountItem({ title: 'Docs', href: '#/docs', chevron: true }),
          mountItem({ title: 'Static' }),
        ],
      },
    })
    const rows = wrapper.findAll('.ml-list-item__row')
    expect(rows.map((r) => r.element.tagName)).toEqual(['BUTTON', 'A', 'DIV'])
    expect(rows[0].text()).toContain('10:24')
    expect(rows[0].get('.ml-list-item__badge').text()).toBe('2')
  })
})

function mountItem(props: Record<string, unknown>) {
  return h(MlListItem, props as never)
}
