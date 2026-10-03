import { afterEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import { MlBanner, MlFloatButton, MlKanban, MlMention, MlSortable } from '../src'

afterEach(() => {
  document.body.innerHTML = ''
  localStorage.clear()
})

describe('MlMention', () => {
  it('opens on the trigger, filters and inserts the chosen name', async () => {
    const wrapper = mount(MlMention, {
      props: {
        options: [{ value: 1, label: 'Nala' }, { value: 2, label: 'Simba' }],
        modelValue: '',
        'onUpdate:modelValue': (v: string) => wrapper.setProps({ modelValue: v }),
      },
      attachTo: document.body,
    })
    const area = wrapper.get('textarea').element as HTMLTextAreaElement
    area.value = 'hi @si'
    area.setSelectionRange(6, 6)
    await wrapper.get('textarea').trigger('input')
    expect(wrapper.get('textarea').attributes('aria-expanded')).toBe('true')
    expect(wrapper.findAll('[role="option"] .ml-dropdown__label').map((o) => o.text())).toEqual(['Simba'])
    expect(wrapper.emitted('search')?.at(-1)).toEqual(['si', '@'])
    await wrapper.get('textarea').trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['hi @Simba '])
    expect(wrapper.emitted('select')?.[0][0]).toMatchObject({ label: 'Simba' })
  })

  it('ignores a trigger in the middle of a word', async () => {
    const wrapper = mount(MlMention, { props: { options: [{ value: 1, label: 'x' }] }, attachTo: document.body })
    const area = wrapper.get('textarea').element as HTMLTextAreaElement
    area.value = 'mail@host'
    area.setSelectionRange(9, 9)
    await wrapper.get('textarea').trigger('input')
    expect(wrapper.get('textarea').attributes('aria-expanded')).toBe('false')
  })
})

describe('MlSortable', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

  it('reorders from the keyboard and Escape restores the order', async () => {
    const wrapper = mount(MlSortable, {
      props: { modelValue: items, handle: true, 'onUpdate:modelValue': (v: unknown[]) => wrapper.setProps({ modelValue: v as typeof items }) },
      slots: { default: (({ item }: { item: { id: string } }) => h('span', item.id)) as never },
      attachTo: document.body,
    })
    const handle = () => wrapper.findAll('.ml-sortable__handle')
    await handle()[0].trigger('keydown', { key: ' ' })
    expect(handle()[0].attributes('aria-pressed')).toBe('true')
    await handle()[0].trigger('keydown', { key: 'ArrowDown' })
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([[{ id: 'b' }, { id: 'a' }, { id: 'c' }]])
    // The grabbed item is now second.
    await handle()[1].trigger('keydown', { key: ' ' })
    expect(wrapper.emitted('change')?.[0][0]).toMatchObject({ oldIndex: 0, newIndex: 1 })

    await handle()[1].trigger('keydown', { key: ' ' })
    await handle()[1].trigger('keydown', { key: 'ArrowDown' })
    await handle()[2].trigger('keydown', { key: 'Escape' })
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([[{ id: 'b' }, { id: 'a' }, { id: 'c' }]])
  })
})

describe('MlKanban', () => {
  it('renders columns, counts and the full state', () => {
    const wrapper = mount(MlKanban, {
      props: {
        modelValue: [
          { key: 'todo', title: 'Todo', items: [{ id: 1, t: 'A' }] },
          { key: 'doing', title: 'Doing', limit: 1, items: [{ id: 2, t: 'B' }] },
        ],
      },
      slots: { card: (({ item }: { item: { t: string } }) => h('b', item.t)) as never },
    })
    expect(wrapper.findAll('.ml-kanban__col')).toHaveLength(2)
    expect(wrapper.findAll('.ml-kanban__count').map((c) => c.text())).toEqual(['1', '1 / 1'])
    expect(wrapper.findAll('.ml-kanban__count')[1].classes()).toContain('ml-kanban__count--full')
    expect(wrapper.findAll('b').map((b) => b.text())).toEqual(['A', 'B'])
  })
})

describe('MlFloatButton', () => {
  it('toggles its speed dial and emits the chosen action', async () => {
    const wrapper = mount(MlFloatButton, {
      props: {
        actions: [{ key: 'a', label: 'A', icon: 'plus' as const }],
        'onUpdate:open': (v: boolean) => wrapper.setProps({ open: v }),
      },
      attachTo: document.body,
    })
    const main = wrapper.get('.ml-fab__main')
    expect(main.attributes('aria-expanded')).toBe('false')
    await main.trigger('click')
    expect(main.attributes('aria-expanded')).toBe('true')
    await wrapper.get('.ml-fab__action').trigger('click')
    expect(wrapper.emitted('select')?.[0][0]).toMatchObject({ key: 'a' })
    expect(main.attributes('aria-expanded')).toBe('false')
  })

  it('emits click without actions, sits in a corner', async () => {
    const wrapper = mount(MlFloatButton, { props: { corner: 'top-left', offset: 10 } })
    expect(wrapper.attributes('style')).toContain('top: 10px')
    expect(wrapper.attributes('style')).toContain('left: 10px')
    await wrapper.get('.ml-fab__main').trigger('click')
    expect(wrapper.emitted('click')).toHaveLength(1)
  })
})

describe('MlBanner', () => {
  it('closes and remembers it with a storage key', async () => {
    const wrapper = mount(MlBanner, { props: { message: 'Hello', closable: true, storageKey: 'b1' } })
    expect(wrapper.text()).toContain('Hello')
    await wrapper.get('.ml-banner__close').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(localStorage.getItem('b1')).toBe('dismissed')
    const again = mount(MlBanner, { props: { message: 'Hello', storageKey: 'b1' } })
    await nextTick()
    expect(again.find('.ml-banner').exists()).toBe(false)
  })

  it('uses alert semantics for warnings', () => {
    expect(mount(MlBanner, { props: { tone: 'danger', message: 'x' } }).get('.ml-banner').attributes('role')).toBe('alert')
  })
})
