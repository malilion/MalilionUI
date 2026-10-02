import { afterEach, describe, expect, it } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, reactive, ref } from 'vue'
import {
  MlCheckbox,
  MlCombobox,
  MlDrawer,
  MlForm,
  MlFormItem,
  MlInput,
  MlPopconfirm,
  MlPopover,
  MlSkeleton,
  MlSkeletonItem,
  validateValue,
} from '../src'

afterEach(() => {
  document.body.innerHTML = ''
})

const fruits = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana', disabled: true },
  { value: 'cherry', label: 'Cherry' },
  { value: 'grape', label: 'Grape' },
]

describe('MlCombobox', () => {
  it('opens with the keyboard, skips disabled options and picks with Enter', async () => {
    const wrapper = mount(MlCombobox, {
      props: { options: fruits, label: 'Fruit', modelValue: null },
      attachTo: document.body,
    })
    const box = wrapper.get('[role="combobox"]')
    expect(box.attributes('aria-expanded')).toBe('false')
    expect(box.attributes('aria-labelledby')).toBe(`${box.attributes('id')}-label`)

    await box.trigger('keydown', { key: 'ArrowDown' })
    expect(box.attributes('aria-expanded')).toBe('true')
    const active = () => wrapper.get(`#${box.attributes('aria-activedescendant')}`).text()
    expect(active()).toBe('Apple')

    await box.trigger('keydown', { key: 'ArrowDown' })
    expect(active()).toBe('Cherry')

    await box.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['cherry'])
    expect(box.attributes('aria-expanded')).toBe('false')
  })

  it('filters while typing and shows a no-match row', async () => {
    const wrapper = mount(MlCombobox, { props: { options: fruits, searchable: true }, attachTo: document.body })
    const input = wrapper.get('input[role="combobox"]')
    await input.setValue('ap')
    const labels = wrapper.findAll('[role="option"]').map((o) => o.text())
    expect(labels).toEqual(['Apple', 'Grape'])
    expect(wrapper.find('.ml-combobox__hit').text()).toBe('Ap')

    await input.setValue('zzz')
    expect(wrapper.findAll('[role="option"]')).toHaveLength(0)
    expect(wrapper.text()).toContain('找不到符合的選項')
  })

  it('toggles values in multiple mode, removes tags and clears', async () => {
    const model = ref<(string | number)[]>(['apple'])
    const wrapper = mount(MlCombobox, {
      props: {
        options: fruits,
        multiple: true,
        clearable: true,
        modelValue: model.value,
        'onUpdate:modelValue': (v: unknown) => {
          model.value = v as (string | number)[]
          wrapper.setProps({ modelValue: model.value })
        },
      },
      attachTo: document.body,
    })
    expect(wrapper.get('[role="listbox"]').attributes('aria-multiselectable')).toBe('true')
    await wrapper.findAll('[role="option"]')[2].trigger('click')
    expect(model.value).toEqual(['apple', 'cherry'])
    expect(wrapper.findAll('.ml-combobox__tag').map((t) => t.text())).toEqual(['Apple', 'Cherry'])

    await wrapper.get('[aria-label="移除 Apple"]').trigger('click')
    expect(model.value).toEqual(['cherry'])

    await wrapper.get('.ml-combobox__clear').trigger('click')
    expect(model.value).toEqual([])
  })

  it('posts its value through hidden inputs when given a name', () => {
    const wrapper = mount(MlCombobox, { props: { options: fruits, multiple: true, name: 'fruit', modelValue: ['apple', 'grape'] } })
    expect(wrapper.findAll('input[type="hidden"]').map((i) => i.attributes('value'))).toEqual(['apple', 'grape'])
  })

  it('Escape closes only the list', async () => {
    const wrapper = mount(MlCombobox, { props: { options: fruits }, attachTo: document.body })
    const box = wrapper.get('[role="combobox"]')
    await box.trigger('keydown', { key: ' ' })
    expect(box.attributes('aria-expanded')).toBe('true')
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })
    box.element.dispatchEvent(event)
    await nextTick()
    expect(event.defaultPrevented).toBe(true)
    expect(box.attributes('aria-expanded')).toBe('false')
  })
})

describe('validateValue', () => {
  it.each([
    ['', [{ required: true }], '此欄位為必填'],
    [false, [{ required: true }], '此欄位為必填'],
    ['ab', [{ min: 3 }], '至少需要 3 個字元'],
    [['a', 'b', 'c'], [{ max: 2 }], '最多選擇 2 項'],
    [5, [{ min: 10 }], '不能小於 10'],
    ['nope', [{ type: 'email' as const }], '請輸入有效的電子郵件'],
    ['a@b.co', [{ type: 'email' as const }], undefined],
    ['', [{ type: 'email' as const }], undefined],
    ['abc', [{ pattern: /^\d+$/, message: 'digits only' }], 'digits only'],
  ])('%j with %j → %s', async (value, rules, expected) => {
    expect(await validateValue(value, rules)).toBe(expected)
  })

  it('runs async validators and uses their message', async () => {
    const rules = [{ validator: async (v: unknown) => (v === 'taken' ? '名稱已被使用' : true) }]
    expect(await validateValue('taken', rules)).toBe('名稱已被使用')
    expect(await validateValue('free', rules)).toBeUndefined()
  })
})

describe('MlForm', () => {
  function mountForm(onSubmit = () => {}) {
    const model = reactive({ email: '', agree: false })
    const Demo = defineComponent({
      setup() {
        return () =>
          h(
            MlForm,
            {
              model,
              rules: { email: [{ required: true }, { type: 'email' }], agree: { required: true, message: '請先同意' } },
              onSubmit,
            },
            () => [
              h(MlFormItem, { prop: 'email' }, () =>
                h(MlInput, { label: 'Email', modelValue: model.email, 'onUpdate:modelValue': (v: unknown) => (model.email = v as string) }),
              ),
              h(MlFormItem, { prop: 'agree' }, () =>
                h(MlCheckbox, { modelValue: model.agree, 'onUpdate:modelValue': (v: unknown) => (model.agree = v as boolean) }, () => 'I agree'),
              ),
              h('button', { type: 'submit' }, 'Go'),
            ],
          )
      },
    })
    return { wrapper: mount(Demo, { attachTo: document.body }), model }
  }

  it('shows errors on submit, marks the input invalid and focuses it', async () => {
    const submitted: unknown[] = []
    const { wrapper } = mountForm(() => submitted.push(true))
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    const input = wrapper.get('input[type="text"], input:not([type])')
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(input.attributes('required')).toBeDefined()
    expect(wrapper.text()).toContain('此欄位為必填')
    // The checkbox has no error line of its own, so the form item adds one.
    expect(wrapper.text()).toContain('請先同意')
    expect(document.activeElement).toBe(input.element)
    expect(submitted).toHaveLength(0)
    expect(wrapper.findComponent(MlForm).emitted('invalid')?.[0]?.[0]).toEqual({ email: '此欄位為必填', agree: '請先同意' })
  })

  it('re-validates as the user fixes things, then submits', async () => {
    const submitted: unknown[] = []
    const { wrapper, model } = mountForm(() => submitted.push(true))
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    model.email = 'lion@pride.io'
    model.agree = true
    await flushPromises()
    expect(wrapper.find('.ml-field__error').exists()).toBe(false)

    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(submitted).toHaveLength(1)
  })

  it('validates a field when it loses focus', async () => {
    const { wrapper } = mountForm()
    await wrapper.get('input').trigger('focusout')
    await flushPromises()
    expect(wrapper.text()).toContain('此欄位為必填')
    // agree was never touched, so it stays quiet
    expect(wrapper.text()).not.toContain('請先同意')
  })
})

describe('MlPopover', () => {
  it('toggles on trigger click, wires ARIA, and closes on Escape', async () => {
    const wrapper = mount(MlPopover, {
      props: { title: 'Pride stats' },
      slots: { default: '<button>Info</button>', content: 'Content here' },
      attachTo: document.body,
    })
    const trigger = wrapper.get('button')
    expect(trigger.attributes('aria-expanded')).toBe('false')
    await trigger.trigger('click')
    await nextTick()
    const panel = wrapper.get('[role="dialog"]')
    expect(trigger.attributes('aria-expanded')).toBe('true')
    expect(trigger.attributes('aria-controls')).toBe(panel.attributes('id'))
    expect(panel.attributes('aria-labelledby')).toBeTruthy()
    expect(panel.text()).toContain('Content here')

    await panel.trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(document.activeElement).toBe(trigger.element)
  })

  it('closes on an outside click', async () => {
    const wrapper = mount(MlPopover, { props: { open: true, 'onUpdate:open': (v: boolean) => wrapper.setProps({ open: v }) }, slots: { default: '<button>x</button>', content: 'c' }, attachTo: document.body })
    await nextTick()
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    await nextTick()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })
})

describe('MlPopconfirm', () => {
  it('focuses cancel first and emits confirm', async () => {
    const wrapper = mount(MlPopconfirm, {
      props: { title: '刪除這頭獅子？', description: '無法復原', tone: 'danger' },
      slots: { default: '<button class="trigger">Delete</button>' },
      attachTo: document.body,
    })
    await wrapper.get('.trigger').trigger('click')
    await flushPromises()
    const dialog = wrapper.get('[role="dialog"]')
    expect(dialog.attributes('aria-describedby')).toBeTruthy()
    expect(document.activeElement?.textContent).toContain('取消')
    await wrapper.findAll('.ml-popconfirm__actions button')[1].trigger('click')
    expect(wrapper.emitted('confirm')).toHaveLength(1)
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })
})

describe('MlDrawer', () => {
  it('renders a labelled modal dialog on the chosen edge and closes on Escape', async () => {
    const wrapper = mount(MlDrawer, {
      props: { open: true, title: 'Settings', placement: 'left', size: 300, inline: true },
      slots: { default: '<input />' },
      attachTo: document.body,
    })
    await nextTick()
    const panel = wrapper.get('[role="dialog"]')
    expect(panel.attributes('aria-modal')).toBe('true')
    expect(wrapper.get(`#${panel.attributes('aria-labelledby')}`).text()).toBe('Settings')
    expect(wrapper.get('.ml-drawer').classes()).toContain('ml-drawer--left')
    expect(panel.attributes('style')).toContain('--_size: 300px')

    await wrapper.get('.ml-drawer').trigger('keydown', { key: 'Escape' })
    expect(wrapper.emitted('update:open')?.[0]).toEqual([false])
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})

describe('MlSkeleton', () => {
  it('shows a busy placeholder, then the content', async () => {
    const wrapper = mount(MlSkeleton, { props: { rows: 4, avatar: true }, slots: { default: '<p class="real">Loaded</p>' } })
    expect(wrapper.get('[role="status"]').attributes('aria-busy')).toBe('true')
    // title + 4 rows + avatar
    expect(wrapper.findAll('.ml-skeleton__item')).toHaveLength(6)
    expect(wrapper.find('.real').exists()).toBe(false)

    await wrapper.setProps({ loading: false })
    expect(wrapper.find('.real').exists()).toBe(true)
    expect(wrapper.find('.ml-skeleton').exists()).toBe(false)
  })

  it('MlSkeletonItem takes numeric sizes as px', () => {
    const item = mount(MlSkeletonItem, { props: { variant: 'circle', width: 32, height: '2rem' } })
    expect(item.classes()).toContain('ml-skeleton__item--circle')
    expect(item.attributes('style')).toContain('width: 32px')
    expect(item.attributes('style')).toContain('height: 2rem')
  })
})
