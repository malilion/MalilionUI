import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import {
  MlAvatar,
  MlButton,
  MlCheckbox,
  MlInput,
  MlLionMark,
  MlModal,
  MlProgress,
  MlSelect,
  MlStat,
  MlSwitch,
  MlTabs,
  MlTooltip,
} from '../src'

describe('MlButton', () => {
  it('renders a link when given href, and drops the href while loading', async () => {
    const wrapper = mount(MlButton, { props: { href: '/docs' }, slots: { default: 'Docs' } })
    expect(wrapper.element.tagName).toBe('A')
    expect(wrapper.attributes('href')).toBe('/docs')

    await wrapper.setProps({ loading: true })
    expect(wrapper.attributes('href')).toBeUndefined()
    expect(wrapper.attributes('aria-disabled')).toBe('true')
    expect(wrapper.attributes('aria-busy')).toBe('true')
  })

  it('disables the native button while loading and defaults to type="button"', () => {
    const wrapper = mount(MlButton, { props: { loading: true }, slots: { default: 'Go' } })
    expect(wrapper.attributes('type')).toBe('button')
    expect(wrapper.attributes('disabled')).toBeDefined()
    expect(wrapper.find('.ml-btn__spinner').exists()).toBe(true)
  })
})

describe('MlSwitch', () => {
  it('toggles v-model and reflects it in aria-checked', async () => {
    const wrapper = mount(MlSwitch, {
      props: { modelValue: false, label: 'Turbo', 'onUpdate:modelValue': (v: boolean) => wrapper.setProps({ modelValue: v }) },
    })
    const control = wrapper.get('[role="switch"]')
    expect(control.attributes('aria-checked')).toBe('false')

    await control.trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true])
    expect(control.attributes('aria-checked')).toBe('true')
  })

  it('names the switch with its label', () => {
    const wrapper = mount(MlSwitch, { props: { label: 'Notifications' } })
    const id = wrapper.get('[role="switch"]').attributes('id')
    expect(wrapper.get('label').attributes('for')).toBe(id)
  })
})

describe('MlCheckbox', () => {
  it('emits the new checked state', async () => {
    const wrapper = mount(MlCheckbox, { props: { modelValue: false, label: 'Agree' } })
    await wrapper.get('input').setValue(true)
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([true])
  })
})

describe('MlInput', () => {
  it('links label, control and error message for assistive tech', () => {
    const wrapper = mount(MlInput, { props: { label: 'Email', error: 'Missing @' } })
    const input = wrapper.get('input')
    const id = input.attributes('id')!
    expect(wrapper.get('label').attributes('for')).toBe(id)
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(input.attributes('aria-describedby')).toBe(`${id}-error`)
    expect(wrapper.get(`#${id}-error`).text()).toContain('Missing @')
  })

  it('puts class on the wrapper and other attributes on the native input', () => {
    const wrapper = mount(MlInput, { attrs: { class: 'wide', name: 'email', autocomplete: 'email' } })
    expect(wrapper.classes()).toContain('wide')
    expect(wrapper.get('input').classes()).not.toContain('wide')
    expect(wrapper.get('input').attributes('name')).toBe('email')
    expect(wrapper.get('input').attributes('autocomplete')).toBe('email')
  })

  it('updates v-model on input', async () => {
    const wrapper = mount(MlInput, { props: { modelValue: '' } })
    await wrapper.get('input').setValue('roar')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['roar'])
  })
})

describe('MlSelect', () => {
  it('shows the placeholder while nothing is chosen', () => {
    const wrapper = mount(MlSelect, {
      props: { placeholder: 'Pick one', options: [{ value: 'a', label: 'A' }] },
    })
    expect((wrapper.get('select').element as HTMLSelectElement).value).toBe('')
  })
})

describe('MlTabs', () => {
  const items = [
    { value: 'one', label: 'One' },
    { value: 'two', label: 'Two', disabled: true },
    { value: 'three', label: 'Three' },
  ]

  function mountTabs() {
    return mount(
      defineComponent(() => {
        const active = ref<string>()
        return () =>
          h(
            MlTabs,
            { items, modelValue: active.value, 'onUpdate:modelValue': (v?: string) => (active.value = v) },
            { one: () => 'Panel one', three: () => 'Panel three' },
          )
      }),
      { attachTo: document.body },
    )
  }

  it('selects the first enabled tab by default and wires tab ↔ panel', async () => {
    const wrapper = mountTabs()
    await nextTick()
    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs[0].attributes('aria-selected')).toBe('true')
    const panel = wrapper.get(`#${tabs[0].attributes('aria-controls')}`)
    expect(panel.attributes('aria-labelledby')).toBe(tabs[0].attributes('id'))
    wrapper.unmount()
  })

  it('skips disabled tabs with the arrow keys and wraps around', async () => {
    const wrapper = mountTabs()
    await nextTick()
    await wrapper.findAll('[role="tab"]')[0].trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.findAll('[role="tab"]')[2].attributes('aria-selected')).toBe('true')

    await wrapper.findAll('[role="tab"]')[2].trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.findAll('[role="tab"]')[0].attributes('aria-selected')).toBe('true')
    wrapper.unmount()
  })
})

describe('MlProgress', () => {
  it('clamps the value and reports it as a percentage', () => {
    const wrapper = mount(MlProgress, { props: { value: 150, max: 100, label: 'Load' } })
    const bar = wrapper.get('[role="progressbar"]')
    expect(bar.attributes('aria-valuenow')).toBe('100')
    expect(wrapper.text()).toContain('100%')
  })

  it('omits aria-valuenow when indeterminate', () => {
    const wrapper = mount(MlProgress, { props: { label: 'Sync' } })
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBeUndefined()
    expect(wrapper.classes()).toContain('ml-progress--indeterminate')
  })
})

describe('MlModal', () => {
  it('locks scroll while open, closes on Escape and restores scroll', async () => {
    const wrapper = mount(MlModal, {
      props: { open: false, title: 'Deploy?', inline: true },
      slots: { default: 'Body' },
      attachTo: document.body,
    })
    await wrapper.setProps({ open: true })
    await nextTick()
    expect(document.documentElement.style.overflow).toBe('hidden')

    const dialog = wrapper.get('[role="dialog"]')
    expect(wrapper.get(`#${dialog.attributes('aria-labelledby')}`).text()).toBe('Deploy?')

    await dialog.trigger('keydown', { key: 'Escape' })
    expect(wrapper.emitted('update:open')?.[0]).toEqual([false])
    expect(wrapper.emitted('close')).toHaveLength(1)

    await wrapper.setProps({ open: false })
    expect(document.documentElement.style.overflow).toBe('')
    wrapper.unmount()
  })

  it('keeps the page locked until the last of two modals closes', async () => {
    const first = mount(MlModal, { props: { open: true, inline: true }, attachTo: document.body })
    const second = mount(MlModal, { props: { open: true, inline: true }, attachTo: document.body })
    await nextTick()

    // Close out of order: per-instance save/restore would unlock the page here.
    await first.setProps({ open: false })
    expect(document.documentElement.style.overflow).toBe('hidden')
    await second.setProps({ open: false })
    expect(document.documentElement.style.overflow).toBe('')
    first.unmount()
    second.unmount()
  })
})

describe('MlTooltip', () => {
  it('describes its trigger and shows on focus', async () => {
    const wrapper = mount(MlTooltip, {
      props: { content: 'Hint' },
      slots: { default: '<button>Trigger</button>' },
      attachTo: document.body,
    })
    const bubble = wrapper.get('[role="tooltip"]')
    expect(wrapper.get('button').attributes('aria-describedby')).toBe(bubble.attributes('id'))

    await wrapper.trigger('focusin')
    expect(bubble.classes()).toContain('ml-tooltip__bubble--visible')
    await wrapper.trigger('keydown', { key: 'Escape' })
    expect(bubble.classes()).not.toContain('ml-tooltip__bubble--visible')
    wrapper.unmount()
  })
})

describe('MlAvatar', () => {
  it.each([
    ['碼力獅', '碼'],
    ['Leo Nova', 'LN'],
    ['Simba', 'S'],
    ['+4', '+4'],
    ['Leo', 'L'],
    ['AI', 'AI'],
    ['', '?'],
  ])('initials for %j → %j', (name, expected) => {
    const wrapper = mount(MlAvatar, { props: { name } })
    expect(wrapper.get('.ml-avatar__initials').text()).toBe(expected)
  })

  it('falls back to initials when the image fails', async () => {
    const wrapper = mount(MlAvatar, { props: { name: 'Leo Nova', src: '/missing.png' } })
    await wrapper.get('img').trigger('error')
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.get('.ml-avatar__initials').text()).toBe('LN')
  })
})

describe('MlStat', () => {
  it.each([
    [12.4, '+12.4%', 'up'],
    [-8.1, '−8.1%', 'down'],
    [0, '±0%', 'flat'],
  ])('delta %d renders %s (%s)', (delta, text, trend) => {
    const wrapper = mount(MlStat, { props: { label: 'x', value: 1, delta } })
    const el = wrapper.get('.ml-stat__delta')
    expect(el.text()).toBe(text)
    expect(el.classes()).toContain(`ml-stat__delta--${trend}`)
  })
})

describe('MlLionMark', () => {
  it('gives each instance its own gradient ids', () => {
    const wrapper = mount(
      defineComponent(() => () => h('div', [h(MlLionMark), h(MlLionMark)])),
    )
    const ids = wrapper.findAll('linearGradient').map((g) => g.attributes('id'))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('is decorative unless titled', () => {
    expect(mount(MlLionMark).attributes('aria-hidden')).toBe('true')
    const titled = mount(MlLionMark, { props: { title: '碼力獅' } })
    expect(titled.attributes('role')).toBe('img')
    expect(titled.attributes('aria-label')).toBe('碼力獅')
  })
})
