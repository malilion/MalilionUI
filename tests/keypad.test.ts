// InputMask, AmountInput (with 中文大寫金額) and NumberKeyboard.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { MlAmountInput, MlInputMask, MlNumberKeyboard, amountInChinese, applyMask, formatAmount, formatAmountInput, keyboardLayout, parseMask, resolveMask, shuffledDigits } from '../src'
import { amountSignificant, maskSignificant, reformat } from '../src/components/mask'
import { keyboardAppend, keyboardDelete } from '../src/components/number-keyboard'

let wrapper: VueWrapper | undefined
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
  vi.useRealTimers()
})

const prop = (key: string) => (wrapper!.props() as Record<string, unknown>)[key]

/** Type into an input the way a browser would: new value, caret, then an input event. */
function type(el: HTMLInputElement, value: string, caret = value.length, inputType = 'insertText') {
  el.focus()
  el.value = value
  el.setSelectionRange(caret, caret)
  el.dispatchEvent(new InputEvent('input', { inputType, bubbles: true }))
}

/* ── Masks ────────────────────────────────────────────── */

describe('applyMask', () => {
  const mobile = resolveMask(undefined, 'mobile')

  it('formats as you type, holding literals back until the next slot fills', () => {
    expect(applyMask('0912', mobile).formatted).toBe('0912')
    expect(applyMask('09123', mobile).formatted).toBe('0912-3')
    expect(applyMask('0912345678', mobile)).toEqual({ formatted: '0912-345-678', raw: '0912345678', complete: true })
  })

  it('skips characters a slot refuses and absorbs typed literals', () => {
    expect(applyMask('09a12-3x45', mobile).formatted).toBe('0912-345')
    expect(applyMask('0912--345', mobile).formatted).toBe('0912-345')
    expect(applyMask('091234567899', mobile).raw).toBe('0912345678')
  })

  it('is idempotent on its own output', () => {
    const phone = resolveMask(undefined, 'phone')
    const once = applyMask('0223456789', phone).formatted
    expect(once).toBe('(02) 2345-6789')
    expect(applyMask(once, phone).formatted).toBe(once)
  })

  it('uppercases A / X slots and honours escapes', () => {
    expect(applyMask('a123456789', resolveMask(undefined, 'id')).formatted).toBe('A123456789')
    expect(applyMask('7', parseMask('\\9-9')).formatted).toBe('9-7')
  })

  it('carrier preset takes . + - and uppercases', () => {
    const r = applyMask('abc+123', resolveMask(undefined, 'carrier'))
    expect(r).toEqual({ formatted: '/ABC+123', raw: 'ABC+123', complete: true })
  })

  it('custom tokens extend the defaults', () => {
    const parts = resolveMask('HH:HH', undefined, { H: { pattern: /[0-9a-f]/i, upper: true } })
    expect(applyMask('a1f', parts).formatted).toBe('A1:F')
  })
})

describe('reformat (caret)', () => {
  const mobile = resolveMask(undefined, 'mobile')
  const fmt = (t: string) => applyMask(t, mobile).formatted
  const sig = maskSignificant(mobile)

  it('hops over a separator when typing forward', () => {
    expect(reformat({ value: '09123', caret: 5, inputType: 'insertText', previous: '0912' }, fmt, sig)).toEqual({ text: '0912-3', caret: 6 })
  })

  it('backspace over a separator removes the digit before it', () => {
    // 0912-|345 → the browser removes "-"
    expect(reformat({ value: '0912345', caret: 4, inputType: 'deleteContentBackward', previous: '0912-345' }, fmt, sig)).toEqual({ text: '0913-45', caret: 3 })
  })

  it('keeps the caret by meaningful characters in amounts', () => {
    const amt = (t: string) => formatAmountInput(t).display
    // 1,234| + 5 → 12,345|
    expect(reformat({ value: '1,2345', caret: 6, inputType: 'insertText', previous: '1,234' }, amt, amountSignificant)).toEqual({ text: '12,345', caret: 6 })
    // 1,|234 backspace → "1234" (comma gone) → removes the 1
    expect(reformat({ value: '1234', caret: 1, inputType: 'deleteContentBackward', previous: '1,234' }, amt, amountSignificant)).toEqual({ text: '234', caret: 0 })
  })
})

/* ── Amounts ──────────────────────────────────────────── */

describe('formatAmountInput', () => {
  it('groups, strips leading zeros and parses', () => {
    expect(formatAmountInput('1234567')).toEqual({ display: '1,234,567', value: 1234567 })
    expect(formatAmountInput('007')).toEqual({ display: '7', value: 7 })
    expect(formatAmountInput('')).toEqual({ display: '', value: null })
  })

  it('decimals: one point, limited fraction, trailing point kept while typing', () => {
    expect(formatAmountInput('12.', { decimals: 2 })).toEqual({ display: '12.', value: 12 })
    expect(formatAmountInput('12.345.6', { decimals: 2 })).toEqual({ display: '12.34', value: 12.34 })
    expect(formatAmountInput('.5', { decimals: 2 })).toEqual({ display: '0.5', value: 0.5 })
    expect(formatAmountInput('12.5', { decimals: 0 })).toEqual({ display: '12', value: 12 })
  })

  it('negative only when allowed', () => {
    expect(formatAmountInput('-1200', { allowNegative: true })).toEqual({ display: '-1,200', value: -1200 })
    expect(formatAmountInput('-', { allowNegative: true })).toEqual({ display: '-', value: null })
    expect(formatAmountInput('-1200').value).toBe(1200)
  })

  it('formatAmount pads at rest', () => {
    expect(formatAmount(1234.5, { decimals: 2 })).toBe('1,234.50')
    expect(formatAmount(-0.001, { decimals: 2 })).toBe('0.00')
    expect(formatAmount(null)).toBe('')
    expect(formatAmount(1234567, { separator: '' })).toBe('1234567')
  })
})

describe('amountInChinese', () => {
  it.each([
    [0, '零元整'],
    [8, '捌元整'],
    [10, '壹拾元整'],
    [105, '壹佰零伍元整'],
    [1000, '壹仟元整'],
    [10001, '壹萬零壹元整'],
    [100000, '壹拾萬元整'],
    [12345, '壹萬貳仟參佰肆拾伍元整'],
    [100010, '壹拾萬零壹拾元整'],
    [100000000, '壹億元整'],
    [100002000, '壹億零貳仟元整'],
    [12345.6, '壹萬貳仟參佰肆拾伍元陸角整'],
    [100.05, '壹佰元零伍分'],
    [0.5, '伍角整'],
    [3.21, '參元貳角壹分'],
    [-50, '負伍拾元整'],
  ])('%s → %s', (n, words) => {
    expect(amountInChinese(n)).toBe(words)
  })

  it('empty for nothing or absurd amounts', () => {
    expect(amountInChinese(null)).toBe('')
    expect(amountInChinese(Number.NaN)).toBe('')
    expect(amountInChinese(1e17)).toBe('')
  })
})

/* ── Keyboard layout ──────────────────────────────────── */

describe('keyboardLayout', () => {
  const texts = (keys: ReturnType<typeof keyboardLayout>) => keys.map((k) => k.text || k.type)

  it('default: extra / collapse / blank, 0, ⌫', () => {
    expect(texts(keyboardLayout('default', undefined, false)).slice(9)).toEqual(['blank', '0', 'delete'])
    expect(texts(keyboardLayout('default', undefined, true)).slice(9)).toEqual(['collapse', '0', 'delete'])
    expect(texts(keyboardLayout('default', 'X', true)).slice(9)).toEqual(['X', '0', 'delete'])
  })

  it('custom: 0 widens to fill what the extra keys leave', () => {
    expect(keyboardLayout('custom', undefined, false).slice(9)).toEqual([{ type: 'digit', text: '0', span: 3 }])
    expect(keyboardLayout('custom', '.', false).slice(9)).toEqual([{ type: 'digit', text: '0', span: 2 }, { type: 'extra', text: '.' }])
    expect(texts(keyboardLayout('custom', ['00', '.'], false)).slice(9)).toEqual(['00', '0', '.'])
  })

  it('a shuffled order is a permutation of 0–9', () => {
    let seed = 7
    const order = shuffledDigits(() => ((seed = (seed * 9301 + 49297) % 233280) / 233280))
    expect([...order].sort()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(keyboardLayout('default', undefined, false, order).filter((k) => k.type === 'digit').map((k) => +k.text)).toEqual(order)
  })

  it('append respects maxlength; delete is code-point safe', () => {
    expect(keyboardAppend('123', '4', 3)).toBe('123')
    expect(keyboardAppend('12', '00', 3)).toBe('120')
    expect(keyboardDelete('12🦁')).toBe('12')
  })
})

/* ── Components ───────────────────────────────────────── */

describe('MlInputMask', () => {
  it('shows the formatted value and emits the raw one', async () => {
    wrapper = mount(MlInputMask, { props: { preset: 'mobile', modelValue: '0912345678' }, attachTo: document.body })
    const input = wrapper.find('input').element as HTMLInputElement
    expect(input.value).toBe('0912-345-678')
    expect(input.getAttribute('inputmode')).toBe('numeric')
    expect(input.placeholder).toBe('____-___-___')

    type(input, '0922-345-6789')
    expect(input.value).toBe('0922-345-678')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['0922345678'])
  })

  it('emits complete once every slot is filled, formatted when unmask is false', async () => {
    wrapper = mount(MlInputMask, { props: { mask: '999-999', unmask: false }, attachTo: document.body })
    const input = wrapper.find('input').element as HTMLInputElement
    type(input, '10')
    expect(wrapper.emitted('complete')).toBeUndefined()
    type(input, '100603')
    expect(input.value).toBe('100-603')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['100-603'])
    expect(wrapper.emitted('complete')?.[0]).toEqual(['100603', '100-603'])
  })

  it('waits for an IME to finish composing', async () => {
    wrapper = mount(MlInputMask, { props: { mask: 'AAA' }, attachTo: document.body })
    const input = wrapper.find('input').element as HTMLInputElement
    input.value = 'ㄅ'
    input.dispatchEvent(new InputEvent('input', { isComposing: true }))
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    input.value = 'abc'
    input.dispatchEvent(new CompositionEvent('compositionend'))
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['ABC'])
  })

  it('outside changes reformat; attrs reach the input', async () => {
    wrapper = mount(MlInputMask, { props: { preset: 'ubn', label: '統編', name: 'ubn', class: 'mine' } })
    expect(wrapper.classes()).toContain('mine')
    expect(wrapper.find('input').attributes('name')).toBe('ubn')
    await wrapper.setProps({ modelValue: '12345675' })
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('12345675')
    expect(wrapper.find('label').text()).toBe('統編')
  })
})

describe('MlAmountInput', () => {
  it('groups while typing and emits the number', async () => {
    wrapper = mount(MlAmountInput, { props: { currency: 'NT$' }, attachTo: document.body })
    const input = wrapper.find('input').element as HTMLInputElement
    type(input, '1234567')
    expect(input.value).toBe('1,234,567')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([1234567])
    expect(wrapper.find('.ml-amount__currency').text()).toBe('NT$')
    type(input, '')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([null])
  })

  it('clamps and pads on blur', async () => {
    wrapper = mount(MlAmountInput, { props: { decimals: 2, max: 1000, 'onUpdate:modelValue': (v: number | null) => wrapper!.setProps({ modelValue: v }) }, attachTo: document.body })
    const input = wrapper.find('input').element as HTMLInputElement
    type(input, '5000.5')
    await nextTick()
    input.dispatchEvent(new FocusEvent('blur'))
    await nextTick()
    expect(prop('modelValue')).toBe(1000)
    expect(input.value).toBe('1,000.00')
  })

  it('spells the amount in 中文大寫 and follows outside changes', async () => {
    wrapper = mount(MlAmountInput, { props: { modelValue: 12000, capital: true } })
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('12,000')
    expect(wrapper.find('.ml-amount__capital').text()).toBe('新臺幣壹萬貳仟元整')
    await wrapper.setProps({ modelValue: null })
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('')
    expect(wrapper.find('.ml-amount__words').text()).toBe('—')
  })
})

describe('MlNumberKeyboard', () => {
  it('types digits and the extra key, deletes, honours maxlength', async () => {
    wrapper = mount(MlNumberKeyboard, { props: { extraKey: '.', maxlength: 4, modelValue: '', 'onUpdate:modelValue': (v: string) => wrapper!.setProps({ modelValue: v }) } })
    const key = (text: string) => wrapper!.findAll('button').find((b) => b.text() === text)!
    await key('1').trigger('click')
    await key('.').trigger('click')
    await key('5').trigger('click')
    expect(prop('modelValue')).toBe('1.5')
    await wrapper.find('.ml-numkey__key--delete').trigger('click')
    expect(prop('modelValue')).toBe('1.')
    for (const d of ['2', '3', '4']) await key(d).trigger('click')
    expect(prop('modelValue')).toBe('1.23')
    expect(wrapper.emitted('input')?.map((e) => e[0])).toEqual(['1', '.', '5', '2', '3', '4'])
    expect(wrapper.emitted('delete')).toHaveLength(1)
  })

  it('long-pressing ⌫ keeps deleting, without an extra delete on release', async () => {
    vi.useFakeTimers()
    wrapper = mount(MlNumberKeyboard, { props: { modelValue: '123456', 'onUpdate:modelValue': (v: string) => wrapper!.setProps({ modelValue: v }) } })
    const del = wrapper.find('.ml-numkey__key--delete')
    await del.trigger('pointerdown')
    await vi.advanceTimersByTimeAsync(450 + 70 * 3)
    await del.trigger('pointerup')
    await del.trigger('click')
    expect(prop('modelValue')).toBe('123')
  })

  it('fixed: hidden until shown, closes on Done, outside tap and Esc', async () => {
    wrapper = mount(MlNumberKeyboard, { props: { fixed: true, show: false, 'onUpdate:show': (v: boolean) => wrapper!.setProps({ show: v }) }, attachTo: document.body })
    const root = wrapper.find('.ml-numkey')
    expect(root.attributes('aria-hidden')).toBe('true')
    expect(root.attributes('inert')).toBeDefined()
    expect(wrapper.find('.ml-numkey__key--collapse').exists()).toBe(true)

    await wrapper.setProps({ show: true })
    expect(root.classes()).toContain('ml-numkey--open')
    expect(root.attributes('inert')).toBeUndefined()
    await wrapper.find('.ml-numkey__done').trigger('click')
    expect(prop('show')).toBe(false)
    expect(wrapper.emitted('close')).toHaveLength(1)

    await wrapper.setProps({ show: true })
    await nextTick()
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    await nextTick()
    expect(prop('show')).toBe(false)

    await wrapper.setProps({ show: true })
    await nextTick()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(prop('show')).toBe(false)

    // Taps inside the keyboard don't close it.
    await wrapper.setProps({ show: true })
    await nextTick()
    wrapper.find('.ml-numkey__key--digit').element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    expect(prop('show')).toBe(true)
  })

  it('custom theme has a side column with ⌫ and Done', () => {
    wrapper = mount(MlNumberKeyboard, { props: { theme: 'custom', extraKey: ['00', '.'], closeText: '確認' } })
    expect(wrapper.find('.ml-numkey__side .ml-numkey__key--delete').exists()).toBe(true)
    expect(wrapper.find('.ml-numkey__key--close').text()).toBe('確認')
    expect(wrapper.findAll('.ml-numkey__keys button').map((b) => b.text()).slice(9)).toEqual(['00', '0', '.'])
  })

  it('random shuffles the digits on the client', async () => {
    wrapper = mount(MlNumberKeyboard, { props: { random: true } })
    await nextTick()
    const digits = wrapper.findAll('.ml-numkey__key--digit').map((b) => b.text())
    expect([...digits].sort()).toEqual(['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'])
  })
})
