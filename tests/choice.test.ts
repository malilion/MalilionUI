import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, nextTick, reactive, ref } from 'vue'
import { MlCheckbox, MlCheckboxGroup, MlConfigProvider, MlForm, MlFormItem, MlPasswordInput, en } from '../src'
import {
  checkPasswordRules,
  effectiveLength,
  isCommonPassword,
  resolvePasswordRules,
  scorePassword,
  DEFAULT_PASSWORD_RULES,
} from '../src/components/password'

describe('password scorer', () => {
  it('scores empty, common and patterned passwords as very weak', () => {
    for (const p of ['', 'password', 'P@ssw0rd!', 'Password1', '123456', '12345678', 'qwertyuiop', 'aaaaaaaaaaaa', 'abc123', 'Abcdefg1', 'abcabcabcabc'])
      expect(scorePassword(p), p).toBe(0)
  })

  it('rewards length and character variety', () => {
    expect(scorePassword('Lion2024!')).toBe(2)
    expect(scorePassword('Tr0ub4dor&3')).toBe(3)
    expect(scorePassword('kX9#mQ2$vL')).toBe(3)
    expect(scorePassword('Nala-Pride-77')).toBe(4)
    expect(scorePassword('correct horse battery staple')).toBe(4)
  })

  it('caps short passwords no matter how varied', () => {
    expect(scorePassword('kX9#m')).toBeLessThanOrEqual(1)
    expect(scorePassword('kX9#mQ2')).toBeLessThanOrEqual(2)
  })

  it('is monotonic-ish: adding random characters never lowers the score', () => {
    let prev = 0
    let s = ''
    for (const c of 'q7#Vz!m2Lp9@') {
      s += c
      const score = scorePassword(s)
      expect(score).toBeGreaterThanOrEqual(prev)
      prev = score
    }
    expect(prev).toBe(3)
  })

  it('collapses sequences, repeats and keyboard walks', () => {
    expect(effectiveLength('abcdefgh')).toBe(2)
    expect(effectiveLength('98765')).toBe(2)
    expect(effectiveLength('zzzzzz')).toBe(2)
    expect(effectiveLength('asdfgh')).toBe(2)
    expect(effectiveLength('x7k2')).toBe(4)
  })

  it('spots disguised common passwords', () => {
    expect(isCommonPassword('Password2024!')).toBe(true)
    expect(isCommonPassword('p@ssw0rd')).toBe(true)
    expect(isCommonPassword('Monkey99')).toBe(true)
    expect(isCommonPassword('Nala-Pride-77')).toBe(false)
  })

  it('checks rules in a fixed order and normalises `true`', () => {
    expect(resolvePasswordRules(true)).toEqual(DEFAULT_PASSWORD_RULES)
    expect(resolvePasswordRules(false)).toBeUndefined()
    expect(checkPasswordRules('abcDEF1', DEFAULT_PASSWORD_RULES)).toEqual([
      { key: 'length', ok: false, min: 8 },
      { key: 'upper', ok: true },
      { key: 'lower', ok: true },
      { key: 'digit', ok: true },
      { key: 'symbol', ok: false },
    ])
    expect(checkPasswordRules('密碼 1234', { symbol: true, digit: true }).map((r) => r.ok)).toEqual([true, true])
  })
})

let wrapper: VueWrapper | undefined
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
})

describe('MlCheckboxGroup', () => {
  const options = [
    { value: 'a', label: 'A' },
    { value: 'b', label: 'B' },
    { value: 'c', label: 'C' },
    { value: 'x', label: 'X', disabled: true },
  ]

  it('toggles values in the array model', async () => {
    const value = ref<(string | number)[]>(['b'])
    wrapper = mount(() => h(MlCheckboxGroup, { options, label: 'Pick', modelValue: value.value, 'onUpdate:modelValue': (v: (string | number)[]) => (value.value = v) }))
    const inputs = wrapper.findAll('input')
    expect(inputs.map((i) => (i.element as HTMLInputElement).checked)).toEqual([false, true, false, false])
    await inputs[0].setValue(true)
    expect(value.value).toEqual(['b', 'a'])
    await inputs[1].setValue(false)
    expect(value.value).toEqual(['a'])
    const group = wrapper.find('[role="group"]')
    expect(group.attributes('aria-labelledby')).toBe(`${group.attributes('id')}-label`)
    expect(wrapper.find(`#${group.attributes('id')}-label`).text()).toBe('Pick')
  })

  it('disables the rest at max and locks checked boxes at min', async () => {
    const value = ref<(string | number)[]>(['a'])
    wrapper = mount(() => h(MlCheckboxGroup, { options, min: 1, max: 2, modelValue: value.value, 'onUpdate:modelValue': (v: (string | number)[]) => (value.value = v) }))
    const boxes = () => wrapper!.findAll('input').map((i) => i.element as HTMLInputElement)
    expect(boxes()[0].disabled).toBe(true) // the only checked one: min holds it
    await wrapper.findAll('input')[1].setValue(true)
    expect(value.value).toEqual(['a', 'b'])
    await nextTick()
    expect(boxes().map((b) => b.disabled)).toEqual([false, false, true, true])
    expect(wrapper.findAll('.ml-check')[2].classes()).toContain('ml-check--disabled')
  })

  it('select-all fills enabled options, shows indeterminate, and clears', async () => {
    const value = ref<(string | number)[]>(['x'])
    wrapper = mount(() => h(MlCheckboxGroup, { options, checkAll: true, modelValue: value.value, 'onUpdate:modelValue': (v: (string | number)[]) => (value.value = v) }))
    const all = () => wrapper!.find('.ml-check-group__all input').element as HTMLInputElement
    expect(wrapper.find('.ml-check-group__all').text()).toBe('全選')
    expect(all().checked).toBe(false)
    expect(all().indeterminate).toBe(false) // disabled 'x' doesn't count
    await wrapper.findAll('.ml-check-group__items input')[0].setValue(true)
    expect(all().indeterminate).toBe(true)
    await wrapper.find('.ml-check-group__all input').setValue(true)
    expect(value.value).toEqual(['x', 'a', 'b', 'c'])
    await nextTick()
    expect(all().checked).toBe(true)
    expect(all().indeterminate).toBe(false)
    await wrapper.find('.ml-check-group__all input').setValue(false)
    expect(value.value).toEqual(['x'])
  })

  it('slot children with a value join the group; select-all knows about them after mount', async () => {
    const value = ref<(string | number)[]>([])
    wrapper = mount(() =>
      h(MlCheckboxGroup, { checkAll: 'All of them', name: 'n', modelValue: value.value, 'onUpdate:modelValue': (v: (string | number)[]) => (value.value = v) }, () => [
        h(MlCheckbox, { value: 1, label: 'One' }),
        h(MlCheckbox, { value: 2, label: 'Two' }),
      ]),
    )
    await nextTick()
    const items = wrapper.findAll('.ml-check-group__items input')
    expect(items.map((i) => i.attributes('name'))).toEqual(['n', 'n'])
    expect(items.map((i) => i.attributes('value'))).toEqual(['1', '2'])
    await items[1].setValue(true)
    expect(value.value).toEqual([2])
    await wrapper.find('.ml-check-group__all input').setValue(true)
    expect(value.value).toEqual([2, 1])
    expect(wrapper.find('.ml-check-group__all').text()).toBe('All of them')
  })

  it('a standalone MlCheckbox still works with v-model and a native value', async () => {
    const on = ref(false)
    wrapper = mount(() => h(MlCheckbox, { label: 'Solo', value: 'yes', modelValue: on.value, 'onUpdate:modelValue': (v: boolean) => (on.value = v) }))
    expect(wrapper.find('input').attributes('value')).toBe('yes')
    await wrapper.find('input').setValue(true)
    expect(on.value).toBe(true)
  })

  it('shows MlFormItem errors and required state', async () => {
    const model = reactive({ tags: [] as (string | number)[] })
    const form = ref<InstanceType<typeof MlForm>>()
    wrapper = mount(
      defineComponent({
        setup: () => () =>
          h(MlForm, { ref: form, model, rules: { tags: { required: true, message: 'Pick one' } } }, () =>
            h(MlFormItem, { prop: 'tags' }, () => h(MlCheckboxGroup, { label: 'Tags', options, modelValue: model.tags, 'onUpdate:modelValue': (v: (string | number)[]) => (model.tags = v) })),
          ),
      }),
      { attachTo: document.body },
    )
    await form.value!.validate()
    await nextTick()
    expect(wrapper.find('.ml-field__error').text()).toBe('Pick one')
    expect(wrapper.findAll('.ml-field__error')).toHaveLength(1)
    expect(wrapper.find('.ml-field__required').exists()).toBe(true)
    const group = wrapper.find('[role="group"]')
    expect(group.classes()).toContain('ml-check-group--error')
    expect(group.attributes('aria-describedby')).toBe(`${group.attributes('id')}-error`)
  })
})

describe('MlPasswordInput', () => {
  it('toggles visibility with an aria-pressed button', async () => {
    wrapper = mount(MlPasswordInput, { props: { label: 'PW', modelValue: 'secret' } })
    const input = wrapper.find('input')
    const btn = wrapper.find('.ml-password__toggle')
    expect(input.attributes('type')).toBe('password')
    expect(input.attributes('autocomplete')).toBe('current-password')
    expect(btn.attributes('aria-pressed')).toBe('false')
    expect(btn.attributes('aria-label')).toBe('顯示密碼')
    expect(btn.attributes('aria-controls')).toBe(input.attributes('id'))
    await btn.trigger('click')
    expect(input.attributes('type')).toBe('text')
    expect(btn.attributes('aria-pressed')).toBe('true')
    expect(btn.attributes('aria-label')).toBe('隱藏密碼')
    expect(wrapper.emitted('update:visible')?.[0]).toEqual([true])
  })

  it('updates the strength meter and rules as you type', async () => {
    wrapper = mount(MlPasswordInput, { props: { strength: true, rules: true, autocomplete: 'new-password', 'onUpdate:modelValue': (v: string) => wrapper!.setProps({ modelValue: v }) } })
    expect(wrapper.find('.ml-password__score').text()).toBe('—')
    expect(wrapper.findAll('.ml-password__bar--on')).toHaveLength(0)
    expect(wrapper.findAll('.ml-password__rule')).toHaveLength(5)
    await wrapper.find('input').setValue('Nala-Pride-77')
    expect(wrapper.find('.ml-password__meter').classes()).toContain('ml-password__meter--4')
    expect(wrapper.findAll('.ml-password__bar--on')).toHaveLength(4)
    expect(wrapper.find('.ml-password__score').text()).toBe('很強')
    expect(wrapper.findAll('.ml-password__rule--ok')).toHaveLength(5)
    await wrapper.find('input').setValue('abc')
    expect(wrapper.find('.ml-password__score').text()).toBe('很弱')
    expect(wrapper.findAll('.ml-password__rule--ok').map((r) => r.text())).toEqual(['包含小寫英文字母（已符合）'])
    const id = wrapper.find('input').attributes('id')
    expect(wrapper.find('input').attributes('aria-describedby')).toBe(`${id}-strength ${id}-rules`)
    expect(wrapper.find('input').attributes('autocomplete')).toBe('new-password')
  })

  it('warns while Caps Lock is on and clears on blur', async () => {
    wrapper = mount(MlPasswordInput, { props: { label: 'PW' } })
    const input = wrapper.find('input')
    const press = (caps: boolean, type = 'keydown') => {
      const e = new KeyboardEvent(type, { key: 'A' })
      Object.defineProperty(e, 'getModifierState', { value: (k: string) => k === 'CapsLock' && caps })
      input.element.dispatchEvent(e)
      return nextTick()
    }
    await press(true)
    expect(wrapper.find('.ml-password__caps').text()).toBe('大寫鎖定已開啟')
    expect(input.attributes('aria-describedby')).toContain('-caps')
    await press(false, 'keyup')
    expect(wrapper.find('.ml-password__caps').exists()).toBe(false)
    await press(true)
    await input.trigger('blur')
    expect(wrapper.find('.ml-password__caps').exists()).toBe(false)
  })

  it('follows the locale and picks up MlFormItem errors', async () => {
    wrapper = mount(() => h(MlConfigProvider, { locale: en }, () => h(MlPasswordInput, { strength: true, modelValue: 'kX9#mQ2$vL', error: 'Too short' })))
    expect(wrapper.find('.ml-password__toggle').attributes('aria-label')).toBe('Show password')
    expect(wrapper.find('.ml-password__score').text()).toBe('Strong')
    expect(wrapper.find('.ml-field__error').text()).toBe('Too short')
    expect(wrapper.find('input').attributes('aria-invalid')).toBe('true')
  })
})
