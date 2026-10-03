import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import {
  MlDateRangePicker,
  MlDescriptions,
  MlDialogHost,
  MlLineChart,
  MlMenu,
  MlPinInput,
  MlTagInput,
  confirm,
  type MlMenuItem,
} from '../src'

afterEach(() => {
  document.body.innerHTML = ''
})

/** Mount with a v-model that writes back, like a parent component would. */
function withModel<T>(initial: T, key = 'modelValue') {
  const model = ref(initial) as { value: T }
  return {
    model,
    props: (wrapper: () => { setProps: (p: Record<string, unknown>) => unknown }) => ({
      [key]: model.value,
      [`onUpdate:${key}`]: (v: T) => {
        model.value = v
        wrapper().setProps({ [key]: v })
      },
    }),
  }
}

const menuItems: MlMenuItem[] = [
  { key: 'home', label: 'Home', icon: 'home' },
  {
    key: 'team',
    label: 'Team',
    children: [
      { key: 'members', label: 'Members', badge: 3 },
      { key: 'deep', label: 'Deep', children: [{ key: 'leaf', label: 'Leaf' }] },
    ],
  },
  { key: 'off', label: 'Off', disabled: true },
]

describe('MlMenu', () => {
  it('expands inline submenus, selects leaves and lights up the active path', async () => {
    const wrapper = mount(MlMenu, { props: { items: menuItems, modelValue: 'home' }, attachTo: document.body })
    const team = wrapper.findAll('.ml-menu__link').find((l) => l.text().includes('Team'))!
    expect(team.attributes('aria-expanded')).toBe('false')
    await team.trigger('click')
    expect(wrapper.emitted('update:openKeys')?.[0]).toEqual([['team']])
    await wrapper.setProps({ openKeys: ['team', 'deep'] })

    await wrapper.findAll('.ml-menu__link').find((l) => l.text() === 'Leaf')!.trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['leaf'])
    expect(wrapper.emitted('select')?.[0][0]).toMatchObject({ key: 'leaf' })
    await wrapper.setProps({ modelValue: 'leaf' })
    const inPath = wrapper.findAll('.ml-menu__item--in-path').map((li) => li.find('.ml-menu__label').text())
    expect(inPath).toEqual(['Team', 'Deep'])
    expect(wrapper.find('[aria-current="page"]').text()).toBe('Leaf')
  })

  it('ignores disabled items and keeps one submenu open in accordion mode', async () => {
    const items: MlMenuItem[] = [
      { key: 'a', label: 'A', children: [{ key: 'a1', label: 'A1' }] },
      { key: 'b', label: 'B', children: [{ key: 'b1', label: 'B1' }] },
      { key: 'x', label: 'X', disabled: true },
    ]
    const wrapper = mount(MlMenu, { props: { items, accordion: true, openKeys: ['a'] } })
    await wrapper.findAll('.ml-menu__link')[1 + 1].trigger('click') // B (A1 sits between A and B)
    expect(wrapper.emitted('update:openKeys')?.[0]).toEqual([['b']])
    await wrapper.findAll('.ml-menu__link').find((l) => l.text() === 'X')!.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('pops submenus out in horizontal mode and opens them with ArrowDown', async () => {
    const wrapper = mount(MlMenu, { props: { items: menuItems, mode: 'horizontal' }, attachTo: document.body })
    expect(wrapper.find('.ml-menu__popup').exists()).toBe(false)
    const team = wrapper.findAll('.ml-menu__link').find((l) => l.text().includes('Team'))!
    await team.trigger('keydown', { key: 'ArrowDown' })
    expect(wrapper.emitted('update:openKeys')?.[0]).toEqual([['team']])
    await wrapper.setProps({ openKeys: ['team'] })
    expect(wrapper.find('.ml-menu__popup--root').exists()).toBe(true)
  })
})

describe('MlDateRangePicker', () => {
  it('commits once both ends are picked and applies presets', async () => {
    let wrapper!: ReturnType<typeof mount>
    const m = withModel<[Date | null, Date | null]>([null, null])
    wrapper = mount(MlDateRangePicker, { props: { ...m.props(() => wrapper) }, attachTo: document.body })
    await wrapper.get('.ml-daterange__trigger').trigger('click')
    const days = () => wrapper.findAll('.ml-daterange__panel [data-day]').filter((d) => !d.attributes('disabled'))
    await days()[10].trigger('click')
    expect(wrapper.find('.ml-daterange__panel').exists()).toBe(true) // still waiting for the end
    await days()[14].trigger('click')
    expect(wrapper.find('.ml-daterange__panel').exists()).toBe(false)
    const [start, end] = m.model.value
    expect(start && end && (end.getTime() - start.getTime()) / 86_400_000).toBe(4)
    expect(wrapper.find('.ml-daterange__days').text()).toBe('5 天')

    await wrapper.get('.ml-daterange__trigger').trigger('click')
    await wrapper.findAll('.ml-daterange__preset')[1].trigger('click') // 最近 7 天
    const [s7, e7] = m.model.value
    expect(Math.round((e7!.getTime() - s7!.getTime()) / 86_400_000)).toBe(6)
  })
})

describe('MlLineChart', () => {
  it('draws one path per series and inspects a point from the keyboard', async () => {
    const wrapper = mount(MlLineChart, {
      props: {
        series: [
          { name: 'A', data: [1, 5, 3] },
          { name: 'B', data: [2, 2, 8], tone: 'tech' },
        ],
        labels: ['一', '二', '三'],
      },
    })
    expect(wrapper.findAll('.ml-line__stroke')).toHaveLength(2)
    expect(wrapper.find('.ml-line__legend').text()).toContain('B')
    expect(wrapper.get('[role="img"]').attributes('aria-label')).toBe('A：1、5、3；B：2、2、8')
    // Ticks are round numbers covering the data.
    expect(wrapper.findAll('.ml-line__axis span').map((s) => s.text())).toEqual(['8', '6', '4', '2', '0'])

    await wrapper.get('.ml-line__plot').trigger('keydown', { key: 'End' })
    expect(wrapper.find('.ml-line__tip').text()).toContain('三')
    expect(wrapper.find('.ml-line__tip').text()).toContain('8')
    await wrapper.get('.ml-line__plot').trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('.ml-line__tip').exists()).toBe(false)
  })
})

describe('confirm()', () => {
  it('resolves true / false / text through <MlDialogHost>', async () => {
    mount(MlDialogHost, { attachTo: document.body })

    const yes = confirm({ title: 'Deploy?', message: 'Ship it' })
    await flushPromises()
    expect(document.body.textContent).toContain('Ship it')
    ;[...document.querySelectorAll<HTMLButtonElement>('.ml-modal__footer button')].at(-1)!.click()
    await expect(yes).resolves.toBe(true)

    const no = confirm.danger('Delete?')
    await flushPromises()
    await new Promise((r) => setTimeout(r, 260))
    await flushPromises()
    expect(document.querySelector('.ml-dialog__body--danger')).not.toBeNull()
    document.querySelector<HTMLButtonElement>('.ml-modal__footer button')!.click()
    await expect(no).resolves.toBe(false)

    const name = confirm.prompt({ title: 'Rename', prompt: { defaultValue: 'Leo' } })
    await flushPromises()
    await new Promise((r) => setTimeout(r, 260))
    await flushPromises()
    const input = document.querySelector<HTMLInputElement>('#ml-dialog-input')!
    expect(input.value).toBe('Leo')
    input.value = 'Simba'
    input.dispatchEvent(new Event('input'))
    await nextTick()
    input.form!.dispatchEvent(new Event('submit', { cancelable: true }))
    await expect(name).resolves.toBe('Simba')
  })
})

describe('MlTagInput', () => {
  it('adds on Enter, splits pasted lists, rejects duplicates and removes with double Backspace', async () => {
    let wrapper!: ReturnType<typeof mount>
    const m = withModel<string[]>(['vue'])
    wrapper = mount(MlTagInput, { props: { ...m.props(() => wrapper), max: 4 } })
    const input = wrapper.get('input')

    await input.setValue('vite')
    await input.trigger('keydown', { key: 'Enter' })
    expect(m.model.value).toEqual(['vue', 'vite'])

    await input.setValue('ts, vue, css')
    expect(m.model.value).toEqual(['vue', 'vite', 'ts'])
    expect(wrapper.find('.ml-field__error').text()).toContain('vue')
    expect((input.element as HTMLInputElement).value).toBe('css')
    await input.trigger('keydown', { key: 'Enter' })
    expect(m.model.value).toHaveLength(4)
    expect(wrapper.find('.ml-taginput__count').text()).toBe('4/4')

    await input.setValue('')
    await input.trigger('keydown', { key: 'Backspace' })
    expect(wrapper.find('.ml-taginput__tag--armed').text()).toContain('css')
    await input.trigger('keydown', { key: 'Backspace' })
    expect(m.model.value).toEqual(['vue', 'vite', 'ts'])
  })

  it('runs the validator', async () => {
    const wrapper = mount(MlTagInput, { props: { modelValue: [], validate: (t: string) => t.includes('@') || 'Need @' } })
    await wrapper.get('input').setValue('nope')
    await wrapper.get('input').trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.emitted('reject')?.[0]).toEqual(['nope', 'Need @'])
  })
})

describe('MlPinInput', () => {
  it('moves forward on input, back on Backspace and emits complete on paste', async () => {
    let wrapper!: ReturnType<typeof mount>
    const m = withModel('')
    wrapper = mount(MlPinInput, { props: { ...m.props(() => wrapper), length: 4 }, attachTo: document.body })
    const boxes = () => wrapper.findAll('input')

    await boxes()[0].setValue('7')
    expect(m.model.value).toBe('7')
    expect(document.activeElement).toBe(boxes()[1].element)

    await boxes()[1].setValue('x') // letters are ignored in numeric mode
    expect(m.model.value).toBe('7')

    await boxes()[1].trigger('keydown', { key: 'Backspace' })
    expect(m.model.value).toBe('')
    expect(document.activeElement).toBe(boxes()[0].element)

    const clipboardData = { getData: () => '12-34' }
    await boxes()[0].trigger('paste', { clipboardData })
    expect(m.model.value).toBe('1234')
    expect(wrapper.emitted('complete')?.[0]).toEqual(['1234'])
  })
})

describe('MlDescriptions', () => {
  it('renders label/value pairs, spans and slot overrides', () => {
    const wrapper = mount(MlDescriptions, {
      props: {
        title: 'Info',
        columns: 2,
        items: [{ label: 'Name', value: 'Leo' }, { label: 'Status' }, { label: 'Note', value: 'Long', span: 5 }],
      },
      slots: { 'item-1': '<b>Live</b>' },
    })
    expect(wrapper.findAll('dt').map((d) => d.text())).toEqual(['Name', 'Status', 'Note'])
    expect(wrapper.findAll('dd')[1].html()).toContain('<b>Live</b>')
    expect(wrapper.findAll('.ml-desc__cell')[2].attributes('style')).toContain('--_span: 2')
  })
})
