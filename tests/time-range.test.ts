import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, reactive } from 'vue'
import { MlConfigProvider, MlForm, MlFormItem, MlTimeRangePicker, en, timeRangeRules, type MlTimeRange } from '../src'
import {
  endFloor,
  formatTimeRangeDuration,
  isOvernight,
  setTimeRangeEnd,
  timeRangeSeconds,
  validateTimeRange,
} from '../src/components/time-range'
import { validateValue } from '../src/form'

afterEach(() => {
  document.body.innerHTML = ''
  vi.useRealTimers()
})

describe('time-range helpers', () => {
  it('measures a range, overnight only when allowed', () => {
    expect(timeRangeSeconds(['09:00', '18:00'])).toBe(9 * 3600)
    expect(timeRangeSeconds(['09:00', null])).toBeNull()
    expect(timeRangeSeconds(['09:00', '09:00'], true)).toBeNull()
    expect(timeRangeSeconds(['22:00', '06:00'])).toBeNull()
    expect(timeRangeSeconds(['22:00', '06:00'], true)).toBe(8 * 3600)
    expect(isOvernight(['22:00', '06:00'], true)).toBe(true)
    expect(isOvernight(['22:00', '06:00'], false)).toBe(false)
    expect(isOvernight(['06:00', '22:00'], true)).toBe(false)
  })

  it('formats durations in zh-TW and en', () => {
    expect(formatTimeRangeDuration(9 * 3600)).toBe('共 9 小時')
    expect(formatTimeRangeDuration(90 * 60)).toBe('共 1 小時 30 分')
    expect(formatTimeRangeDuration(45 * 60)).toBe('共 45 分')
    expect(formatTimeRangeDuration(3600 + 15)).toBe('共 1 小時 15 秒')
    expect(formatTimeRangeDuration(90 * 60, en)).toBe('1 h 30 min')
  })

  it('validates completeness, order, bounds and same times', () => {
    expect(validateTimeRange([null, null])).toBeNull()
    expect(validateTimeRange(['09:00', null])).toBe('incomplete')
    expect(validateTimeRange(['09:00', 'nope'])).toBe('incomplete')
    expect(validateTimeRange(['18:00', '09:00'])).toBe('order')
    expect(validateTimeRange(['18:00', '09:00'], { allowOvernight: true })).toBeNull()
    expect(validateTimeRange(['09:00', '09:00'], { allowOvernight: true })).toBe('same')
    expect(validateTimeRange(['07:00', '09:00'], { min: '08:00' })).toBe('min')
    expect(validateTimeRange(['09:00', '23:00'], { max: '22:00' })).toBe('max')
  })

  it('drops an end that is no longer after the start', () => {
    expect(setTimeRangeEnd(['09:00', '12:00'], 0, '13:00')).toEqual(['13:00', null])
    expect(setTimeRangeEnd(['09:00', '12:00'], 1, '08:00')).toEqual([null, '08:00'])
    expect(setTimeRangeEnd(['09:00', '12:00'], 1, '08:00', true)).toEqual(['09:00', '08:00'])
    expect(setTimeRangeEnd(['09:00', null], 1, '10:00')).toEqual(['09:00', '10:00'])
  })

  it('keeps the end wheels one step after the start', () => {
    expect(endFloor('09:30', { minuteStep: 15 })).toBe(9 * 3600 + 45 * 60)
    expect(endFloor('09:30:00', { seconds: true, secondStep: 30 })).toBe(9 * 3600 + 30 * 60 + 30)
    expect(endFloor('09:30', { allowOvernight: true, min: '08:00' })).toBe(8 * 3600)
    expect(endFloor(null, { min: '08:00' })).toBe(8 * 3600)
  })

  it('timeRangeRules plug into MlForm validation with locale messages', async () => {
    const rules = timeRangeRules({ required: true, min: '08:00', max: '22:00' })
    expect(await validateValue([null, null], rules)).toBe('此欄位為必填')
    expect(await validateValue(['09:00', null], rules)).toBe('請選擇開始與結束時間')
    expect(await validateValue(['18:00', '09:00'], rules)).toBe('結束時間需晚於開始時間')
    expect(await validateValue(['07:00', '09:00'], rules)).toBe('時間不能早於 08:00')
    expect(await validateValue(['07:00', '09:00'], rules, {}, en)).toBe("Times can't be before 08:00")
    expect(await validateValue(['09:00', '18:00'], rules)).toBeUndefined()
    expect(await validateValue([null, null], timeRangeRules())).toBeUndefined()
  })
})

const openPicker = async (wrapper: ReturnType<typeof mount>) => {
  await wrapper.get('button.ml-timerange__trigger').trigger('click')
  await nextTick()
  return wrapper.findAll('[role="group"]')
}

describe('MlTimeRangePicker', () => {
  it('shows both ends, the arrow and the duration', () => {
    const wrapper = mount(MlTimeRangePicker, { props: { modelValue: ['09:00', '10:30'] as MlTimeRange, label: '營業時間' } })
    const trigger = wrapper.get('button.ml-timerange__trigger')
    expect(trigger.text()).toBe('09:0010:30')
    expect(trigger.find('.ml-daterange__arrow').exists()).toBe(true)
    expect(wrapper.get('.ml-timerange__duration').text()).toBe('共 1 小時 30 分')
  })

  it('shows placeholders when empty and （隔日） for overnight ranges', () => {
    const empty = mount(MlTimeRangePicker)
    expect(empty.findAll('.ml-datepicker__placeholder').map((s) => s.text())).toEqual(['開始時間', '結束時間'])
    expect(empty.find('.ml-timerange__duration').exists()).toBe(false)

    const night = mount(MlTimeRangePicker, { props: { modelValue: ['22:00', '06:00'] as MlTimeRange, allowOvernight: true } })
    expect(night.get('.ml-timerange__trigger').text()).toContain('06:00（隔日）')
    expect(night.get('.ml-timerange__duration').text()).toBe('共 8 小時')

    // Without allowOvernight a backwards value shows no duration and no 隔日.
    const wrong = mount(MlTimeRangePicker, { props: { modelValue: ['22:00', '06:00'] as MlTimeRange } })
    expect(wrong.find('.ml-timerange__next-day').exists()).toBe(false)
    expect(wrong.find('.ml-timerange__duration').exists()).toBe(false)
  })

  it('opens two labelled wheel groups and focuses the start hours', async () => {
    const wrapper = mount(MlTimeRangePicker, { props: { modelValue: ['09:00', '18:00'] as MlTimeRange }, attachTo: document.body })
    const groups = await openPicker(wrapper)
    expect(groups.map((g) => g.attributes('aria-label'))).toEqual(['開始時間', '結束時間'])
    expect(wrapper.get('[role="dialog"]').attributes('aria-label')).toBe('選擇時間區間')
    expect(document.activeElement).toBe(groups[0].get('[role="listbox"]').element)
    expect(groups[0].findAll('[role="listbox"]').map((l) => l.attributes('aria-label'))).toEqual(['時', '分'])
    expect(wrapper.get('.ml-timerange__status').text()).toBe('共 9 小時')
  })

  it('picks each end; the end wheels stay after the start', async () => {
    const wrapper = mount(MlTimeRangePicker, { props: { modelValue: ['09:30', null] as MlTimeRange, minuteStep: 15 }, attachTo: document.body })
    const groups = await openPicker(wrapper)
    const endHours = groups[1].findAll('[role="listbox"]')[0]
    expect(endHours.findAll('[role="option"]')[8].attributes('aria-disabled')).toBe('true')
    expect(endHours.findAll('[role="option"]')[9].attributes('aria-disabled')).toBeUndefined()
    // Hour 09 with no minutes yet lands on the first time after the start.
    await endHours.findAll('[role="option"]')[9].trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([['09:30', '09:45']])
    expect(wrapper.emitted('change')?.at(-1)).toEqual([['09:30', '09:45']])

    await wrapper.setProps({ modelValue: ['09:30', '12:00'] })
    // Moving the start past the end drops the end.
    await groups[0].findAll('[role="listbox"]')[0].findAll('[role="option"]')[13].trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([['13:30', null]])
  })

  it('lets the end wrap past midnight with allowOvernight', async () => {
    const wrapper = mount(MlTimeRangePicker, { props: { modelValue: ['22:00', null] as MlTimeRange, allowOvernight: true }, attachTo: document.body })
    const groups = await openPicker(wrapper)
    const endHours = groups[1].findAll('[role="listbox"]')[0]
    expect(endHours.findAll('[aria-disabled="true"]')).toHaveLength(0)
    await endHours.findAll('[role="option"]')[6].trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([['22:00', '06:00']])
    await wrapper.setProps({ modelValue: ['22:00', '06:00'] })
    expect(groups[1].attributes('aria-label')).toBe('結束時間（隔日）')
  })

  it('honours min / max on both ends and the keyboard', async () => {
    const wrapper = mount(MlTimeRangePicker, { props: { modelValue: ['09:00', '10:00'] as MlTimeRange, min: '08:00', max: '18:00' }, attachTo: document.body })
    const groups = await openPicker(wrapper)
    for (const g of groups) {
      const hours = g.findAll('[role="listbox"]')[0]
      expect(hours.findAll('[role="option"]')[7].attributes('aria-disabled')).toBe('true')
      expect(hours.findAll('[role="option"]')[19].attributes('aria-disabled')).toBe('true')
    }
    await groups[1].findAll('[role="listbox"]')[0].trigger('keydown', { key: 'End' })
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([['09:00', '18:00']])
    await groups[0].findAll('[role="listbox"]')[0].trigger('keydown', { key: 'Home' })
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([['08:00', '18:00']])
  })

  it('現在 fills the focused end; Escape closes and returns focus', async () => {
    vi.useFakeTimers({ now: new Date(2026, 9, 5, 14, 37), toFake: ['Date'] })
    const wrapper = mount(MlTimeRangePicker, { props: { modelValue: ['09:00', null] as MlTimeRange, minuteStep: 15 }, attachTo: document.body })
    const groups = await openPicker(wrapper)
    await groups[1].trigger('focusin')
    const [nowBtn, confirm] = wrapper.findAll('.ml-timepicker__footer button')
    expect(nowBtn.text()).toBe('現在')
    expect(confirm.text()).toBe('確定')
    await nowBtn.trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([['09:00', '14:30']])

    await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(document.activeElement).toBe(wrapper.get('button.ml-timerange__trigger').element)
  })

  it('applies presets, clears and stays shut when disabled', async () => {
    const presets = [{ label: '上午', value: ['09:00', '12:00'] as MlTimeRange }]
    const wrapper = mount(MlTimeRangePicker, { props: { presets, clearable: true }, attachTo: document.body })
    await openPicker(wrapper)
    const preset = wrapper.get('.ml-daterange__preset')
    expect(preset.text()).toBe('上午')
    await preset.trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([['09:00', '12:00']])
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)

    await wrapper.setProps({ modelValue: ['09:00', '12:00'] })
    await wrapper.get('.ml-datepicker__clear').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([[null, null]])

    const off = mount(MlTimeRangePicker, { props: { disabled: true } })
    await off.get('button.ml-timerange__trigger').trigger('click')
    expect(off.find('[role="dialog"]').exists()).toBe(false)
  })

  it('uses seconds wheels and the en locale', async () => {
    const wrapper = mount(
      defineComponent({
        render: () => h(MlConfigProvider, { locale: en }, () => h(MlTimeRangePicker, { modelValue: ['09:00:00', '09:00:30'], seconds: true })),
      }),
      { attachTo: document.body },
    )
    expect(wrapper.get('.ml-timerange__duration').text()).toBe('30 s')
    const groups = await openPicker(wrapper)
    expect(groups.map((g) => g.attributes('aria-label'))).toEqual(['Start time', 'End time'])
    expect(groups[0].findAll('[role="listbox"]')).toHaveLength(3)
  })

  it('shows MlFormItem errors from timeRangeRules', async () => {
    const model = reactive({ hours: ['18:00', '09:00'] as MlTimeRange })
    const wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(MlForm, { model, rules: { hours: timeRangeRules({ required: true }) } }, () =>
            h(MlFormItem, { prop: 'hours' }, () => h(MlTimeRangePicker, { modelValue: model.hours, label: '營業時間' })),
          ),
      }),
      { attachTo: document.body },
    )
    const form = wrapper.findComponent(MlForm).vm as unknown as { validate(): Promise<boolean> }
    expect(await form.validate()).toBe(false)
    await nextTick()
    expect(wrapper.get('.ml-timerange__trigger').attributes('aria-invalid')).toBe('true')
    expect(wrapper.text()).toContain('結束時間需晚於開始時間')
  })
})
