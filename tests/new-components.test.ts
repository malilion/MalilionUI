import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import {
  MlCheckbox,
  MlDropdown,
  MlPaw,
  MlProgress,
  MlRadio,
  MlRadioGroup,
  MlTable,
  MlToastHost,
  toast,
  vPawStamp,
} from '../src'
import type { MlDropdownItem, MlTableSort } from '../src'

describe('MlPaw', () => {
  it('gives each instance its own gradient id', () => {
    const wrapper = mount(defineComponent(() => () => h('div', [h(MlPaw), h(MlPaw)])))
    const ids = wrapper.findAll('linearGradient').map((g) => g.attributes('id'))
    expect(ids).toHaveLength(2)
    expect(new Set(ids).size).toBe(2)
  })

  it('uses currentColor and skips the gradient for tone="current"', () => {
    const wrapper = mount(MlPaw, { props: { tone: 'current' } })
    expect(wrapper.find('linearGradient').exists()).toBe(false)
    expect(wrapper.get('g').attributes('fill')).toBe('currentColor')
  })
})

describe('v-paw-stamp', () => {
  afterEach(() => document.querySelectorAll('.ml-paw-stamp').forEach((el) => el.remove()))

  it('drops a paw print where the pointer went down', async () => {
    const wrapper = mount(
      { template: '<button v-paw-stamp="\'bean\'">Go</button>', directives: { pawStamp: vPawStamp } },
      { attachTo: document.body },
    )
    await wrapper.trigger('pointerdown', { clientX: 40, clientY: 60 })
    const stamp = document.querySelector<HTMLElement>('.ml-paw-stamp')
    expect(stamp?.classList).toContain('ml-paw-stamp--bean')
    expect(stamp?.style.left).toBe('40px')
    expect(stamp?.querySelectorAll('ellipse')).toHaveLength(4)
    wrapper.unmount()
  })

  it('stays quiet when disabled or switched off', async () => {
    const off = mount(
      { template: '<button v-paw-stamp="false">Go</button>', directives: { pawStamp: vPawStamp } },
      { attachTo: document.body },
    )
    const disabled = mount(
      { template: '<button v-paw-stamp disabled>Go</button>', directives: { pawStamp: vPawStamp } },
      { attachTo: document.body },
    )
    await off.trigger('pointerdown')
    await disabled.trigger('pointerdown')
    expect(document.querySelector('.ml-paw-stamp')).toBeNull()
    off.unmount()
    disabled.unmount()
  })
})

describe('MlCheckbox (paw / indeterminate)', () => {
  it('renders a paw instead of a check mark', () => {
    const wrapper = mount(MlCheckbox, { props: { paw: true } })
    expect(wrapper.find('.ml-check__paw').exists()).toBe(true)
  })

  it('sets the indeterminate DOM property', async () => {
    const wrapper = mount(MlCheckbox, { props: { indeterminate: true } })
    await nextTick()
    expect((wrapper.get('input').element as HTMLInputElement).indeterminate).toBe(true)
    await wrapper.setProps({ indeterminate: false })
    expect((wrapper.get('input').element as HTMLInputElement).indeterminate).toBe(false)
  })
})

describe('MlProgress (paw)', () => {
  it('adds a paw runner only when the value is known', async () => {
    const wrapper = mount(MlProgress, { props: { value: 40, paw: true } })
    expect(wrapper.find('.ml-progress__runner').exists()).toBe(true)
    await wrapper.setProps({ value: null })
    expect(wrapper.find('.ml-progress__runner').exists()).toBe(false)
  })
})

describe('MlRadioGroup', () => {
  const options = [
    { value: 'cub', label: 'Cub' },
    { value: 'lion', label: 'Lion' },
    { value: 'king', label: 'King', disabled: true },
  ]

  it('renders options as one named native radio group', () => {
    const wrapper = mount(MlRadioGroup, { props: { options, label: '方案' } })
    const radios = wrapper.findAll('input[type="radio"]')
    expect(radios).toHaveLength(3)
    expect(new Set(radios.map((r) => r.attributes('name'))).size).toBe(1)
    expect(wrapper.get('legend').text()).toBe('方案')
    expect(radios[2].attributes('disabled')).toBeDefined()
  })

  it('updates v-model and reflects the checked option', async () => {
    const wrapper = mount(MlRadioGroup, {
      props: {
        options,
        modelValue: 'cub',
        'onUpdate:modelValue': (v: string | number | undefined) => wrapper.setProps({ modelValue: v }),
      },
    })
    const radios = () => wrapper.findAll<HTMLInputElement>('input[type="radio"]')
    expect(radios()[0].element.checked).toBe(true)

    await radios()[1].trigger('change')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['lion'])
    expect(radios()[1].element.checked).toBe(true)
  })

  it('also works with <MlRadio> children', async () => {
    const wrapper = mount(
      defineComponent(() => {
        const value = ref<string | number>('b')
        return () =>
          h('div', [
            h(
              MlRadioGroup,
              { modelValue: value.value, 'onUpdate:modelValue': (v?: string | number) => (value.value = v!) },
              () => [h(MlRadio, { value: 'a', label: 'A' }), h(MlRadio, { value: 'b', label: 'B' })],
            ),
            h('output', value.value),
          ])
      }),
    )
    await wrapper.findAll('input')[0].trigger('change')
    expect(wrapper.get('output').text()).toBe('a')
  })
})

describe('toast + MlToastHost', () => {
  afterEach(() => {
    toast.clear()
    vi.useRealTimers()
  })

  it('shows toasts from anywhere and dismisses them by id', async () => {
    const wrapper = mount(MlToastHost, { attachTo: document.body })
    const id = toast.success({ title: '部署完成', message: 'v0.2 已上線' })
    toast('一般訊息')
    await nextTick()

    const cards = document.querySelectorAll('.ml-toast')
    expect(cards).toHaveLength(2)
    expect(cards[0].classList).toContain('ml-toast--success')
    expect(cards[1].classList).toContain('ml-toast--paw')

    toast.dismiss(id)
    await nextTick()
    expect(document.querySelectorAll('.ml-toast')).toHaveLength(1)
    wrapper.unmount()
  })

  it('auto-dismisses after its duration, but not while hovered', async () => {
    vi.useFakeTimers()
    const wrapper = mount(MlToastHost, { attachTo: document.body })
    toast({ message: 'hi', duration: 1000 })
    await nextTick()
    const card = document.querySelector('.ml-toast')!

    const live = () => document.querySelectorAll('.ml-toast:not(.ml-toast-leave-active)')
    card.dispatchEvent(new MouseEvent('mouseenter'))
    vi.advanceTimersByTime(5000)
    await nextTick()
    expect(live()).toHaveLength(1)

    card.dispatchEvent(new MouseEvent('mouseleave'))
    vi.advanceTimersByTime(1000)
    await nextTick()
    expect(live()).toHaveLength(0)
    wrapper.unmount()
  })

  it('marks danger toasts as alerts and runs actions', async () => {
    const onClick = vi.fn()
    const wrapper = mount(MlToastHost, { attachTo: document.body })
    toast.danger({ message: '建置失敗', action: { label: '重試', onClick } })
    await nextTick()
    const card = document.querySelector('.ml-toast')!
    expect(card.getAttribute('role')).toBe('alert')
    card.querySelector<HTMLButtonElement>('.ml-toast__action')!.click()
    expect(onClick).toHaveBeenCalledOnce()
    wrapper.unmount()
  })
})

describe('MlDropdown', () => {
  const items: MlDropdownItem[] = [
    { value: 'edit', label: 'Edit' },
    { value: 'copy', label: 'Copy', disabled: true },
    { value: 'share', label: 'Share' },
    { value: 'delete', label: 'Delete', danger: true, divider: true },
  ]

  function mountDropdown(props: Record<string, unknown> = {}) {
    return mount(MlDropdown, { props: { items, label: 'Actions', ...props }, attachTo: document.body })
  }

  it('opens from the trigger and focuses the first enabled item', async () => {
    const wrapper = mountDropdown()
    const trigger = wrapper.get('[aria-haspopup="menu"]')
    expect(trigger.attributes('aria-expanded')).toBe('false')

    await trigger.trigger('click')
    await nextTick()
    expect(trigger.attributes('aria-expanded')).toBe('true')
    expect(document.activeElement?.textContent).toContain('Edit')
    wrapper.unmount()
  })

  it('arrows skip disabled items, Enter selects and closes back to the trigger', async () => {
    const wrapper = mountDropdown()
    await wrapper.get('[aria-haspopup="menu"]').trigger('keydown', { key: 'ArrowDown' })
    await nextTick()
    const menu = wrapper.get('[role="menu"]')

    await menu.trigger('keydown', { key: 'ArrowDown' })
    expect(document.activeElement?.textContent).toContain('Share')

    await menu.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('select')?.[0]?.[0]).toMatchObject({ value: 'share' })
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    expect(document.activeElement).toBe(wrapper.get('[aria-haspopup="menu"]').element)
    wrapper.unmount()
  })

  it('jumps by first letter and closes on Escape', async () => {
    const wrapper = mountDropdown()
    await wrapper.get('[aria-haspopup="menu"]').trigger('click')
    await nextTick()
    const menu = wrapper.get('[role="menu"]')
    await menu.trigger('keydown', { key: 'd' })
    expect(document.activeElement?.textContent).toContain('Delete')
    await menu.trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('in selectable mode, marks the v-model item and shows it on the trigger', async () => {
    const wrapper = mountDropdown({ selectable: true, modelValue: 'share' })
    expect(wrapper.get('[aria-haspopup="menu"]').text()).toContain('Share')
    await wrapper.get('[aria-haspopup="menu"]').trigger('click')
    await nextTick()
    const checked = wrapper.get('[aria-checked="true"]')
    expect(checked.text()).toContain('Share')
    expect(checked.attributes('role')).toBe('menuitemradio')
    expect(document.activeElement).toBe(checked.element)
    wrapper.unmount()
  })

  it('closes when clicking outside', async () => {
    const wrapper = mountDropdown()
    await wrapper.get('[aria-haspopup="menu"]').trigger('click')
    await nextTick()
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    await nextTick()
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    wrapper.unmount()
  })
})

describe('MlTable', () => {
  const columns = [
    { key: 'name', title: '名字', sortable: true },
    { key: 'power', title: '力量', sortable: true, align: 'right' as const },
  ]
  const rows = [
    { id: 1, name: 'Nala', power: 80 },
    { id: 2, name: 'Simba', power: 95 },
    { id: 3, name: 'Kion', power: null },
    { id: 4, name: 'Kiara', power: 72 },
  ]

  const names = (wrapper: ReturnType<typeof mount>) =>
    wrapper.findAll('tbody tr').map((tr) => tr.findAll('td')[0].text())

  it('cycles sort none → asc → desc → none, keeping empty cells last', async () => {
    const wrapper = mount(MlTable, {
      props: {
        columns,
        rows,
        sort: null,
        'onUpdate:sort': (v: MlTableSort | null) => wrapper.setProps({ sort: v }),
      },
    })
    const powerHeader = () => wrapper.findAll('th')[1]

    await powerHeader().get('button').trigger('click')
    expect(names(wrapper)).toEqual(['Kiara', 'Nala', 'Simba', 'Kion'])
    expect(powerHeader().attributes('aria-sort')).toBe('ascending')

    await powerHeader().get('button').trigger('click')
    expect(names(wrapper)).toEqual(['Simba', 'Nala', 'Kiara', 'Kion'])
    expect(powerHeader().attributes('aria-sort')).toBe('descending')

    await powerHeader().get('button').trigger('click')
    expect(names(wrapper)).toEqual(['Nala', 'Simba', 'Kion', 'Kiara'])
    expect(powerHeader().attributes('aria-sort')).toBe('none')
  })

  it('selects rows and drives the select-all checkbox state', async () => {
    const wrapper = mount(MlTable, {
      props: {
        columns,
        rows,
        selectable: true,
        selected: [] as (string | number)[],
        'onUpdate:selected': (v: (string | number)[]) => wrapper.setProps({ selected: v }),
      },
    })
    const headerBox = () => wrapper.get('thead input').element as HTMLInputElement

    await wrapper.findAll('tbody input')[1].setValue(true)
    expect(wrapper.props('selected')).toEqual([2])
    expect(headerBox().indeterminate).toBe(true)

    await wrapper.get('thead input').setValue(true)
    expect(wrapper.props('selected')).toEqual([1, 2, 3, 4])
    expect(headerBox().checked).toBe(true)

    await wrapper.get('thead input').setValue(false)
    expect(wrapper.props('selected')).toEqual([])
  })

  it('renders custom cells, formats values and shows an empty state', async () => {
    const wrapper = mount(MlTable, {
      props: {
        columns: [{ key: 'name', title: '名字' }, { key: 'power', title: '力量', format: (v: unknown) => `${v} pt` }],
        rows: rows.slice(0, 1),
      },
      slots: { 'cell-name': ({ value }: { value: string }) => h('strong', value.toUpperCase()) },
    })
    expect(wrapper.get('tbody strong').text()).toBe('NALA')
    expect(wrapper.findAll('tbody td')[1].text()).toBe('80 pt')

    await wrapper.setProps({ rows: [] })
    expect(wrapper.get('.ml-table__empty').text()).toContain('這裡還沒有獵物')
  })

  it('emits row-click but not when toggling the row checkbox', async () => {
    const wrapper = mount(MlTable, { props: { columns, rows, selectable: true } })
    await wrapper.findAll('tbody tr')[0].trigger('click')
    await wrapper.findAll('tbody td.ml-table__select')[0].trigger('click')
    expect(wrapper.emitted('row-click')).toHaveLength(1)
  })
})
