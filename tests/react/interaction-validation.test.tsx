import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, createRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Checkbox, Input } from '../../src/react/form'
import { TagInput } from '../../src/react/inputs'
import { DatePicker } from '../../src/react/pickers'
import { Combobox } from '../../src/react/select'
import { Form, FormItem, type FormHandle, type FormProps, type MlFormRules } from '../../src/react/validation'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined
function render(el: React.ReactElement) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(el))
  return host
}
const type = async (el: Element | null, text: string) =>
  act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, text)
    el!.dispatchEvent(new Event('input', { bubbles: true }))
  })
const flush = () => act(async () => void (await new Promise((r) => setTimeout(r, 10))))
const $ = (s: string) => document.querySelector(s)
const $$ = (s: string) => [...document.querySelectorAll(s)]

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
})

type Model = { name: string; code: string; agree: boolean; tags: string[]; pet: string | null; day: Date | null }
const initial: Model = { name: '', code: '', agree: false, tags: [], pet: null, day: null }
const rules: MlFormRules = {
  name: [{ required: true, message: 'Name needed' }, { validator: async (v) => (v === 'taken' ? 'Taken' : true) }],
  code: { pattern: /^\d{3}$/, message: 'Three digits' },
  agree: { required: true, message: 'Please agree' },
  tags: { required: true, message: 'Add a tag' },
}

function Harness({ form, ...props }: { form: React.Ref<FormHandle> } & Partial<FormProps>) {
  const [model, setModel] = useState(initial)
  const set = <K extends keyof Model>(k: K) => (v: Model[K]) => setModel((m) => ({ ...m, [k]: v }))
  return (
    <Form ref={form} model={model} rules={rules} onReset={(m) => setModel(m as Model)} {...props}>
      <FormItem prop="name">
        <Input label="Name" value={model.name} onChange={set('name')} />
      </FormItem>
      <FormItem prop="code">
        <Input label="Code" value={model.code} onChange={set('code')} />
      </FormItem>
      <FormItem prop="agree">
        <Checkbox label="Agree" checked={model.agree} onChange={set('agree')} />
      </FormItem>
      <FormItem prop="tags">
        <TagInput label="Tags" value={model.tags} onChange={set('tags')} />
      </FormItem>
      <FormItem prop="pet" rules={{ required: true, message: 'Pick a pet' }}>
        <Combobox label="Pet" options={[{ value: 'cat', label: 'Cat' }]} value={model.pet} onChange={set('pet') as (v: unknown) => void} />
      </FormItem>
      <FormItem prop="day" rules={{ required: true, message: 'Pick a day' }}>
        <DatePicker label="Day" value={model.day} onChange={set('day')} />
      </FormItem>
      <button type="submit">Go</button>
    </Form>
  )
}

const item = (prop: string) => $(`[data-prop="${prop}"]`)!

describe('Form validation', () => {
  it('marks required fields and shows errors on the control or the item', async () => {
    const form = createRef<FormHandle>()
    render(<Harness form={form} />)
    // required comes from the rules: asterisk on the controls' labels
    expect(item('name').querySelector('.ml-field__required')).not.toBeNull()
    expect(item('code').querySelector('.ml-field__required')).toBeNull()
    expect(item('pet').querySelector('.ml-field__required')).not.toBeNull()
    expect(item('pet').querySelector('[role="combobox"]')!.getAttribute('aria-required')).toBe('true')

    let ok: boolean | undefined
    await act(async () => void (ok = await form.current!.validate()))
    expect(ok).toBe(false)
    const nameInput = item('name').querySelector('input')!
    expect(nameInput.getAttribute('aria-invalid')).toBe('true')
    expect(item('name').querySelector('.ml-field__error')?.textContent).toBe('Name needed')
    // Claimed by the Input: only one error line.
    expect(item('name').querySelectorAll('.ml-field__error')).toHaveLength(1)
    expect(item('name').classList.contains('ml-form-item--error')).toBe(true)
    // Optional + empty: pattern skipped.
    expect(item('code').querySelector('.ml-field__error')).toBeNull()
    // Checkbox doesn't claim: FormItem prints the error itself.
    expect(item('agree').querySelector(':scope > .ml-field__error')?.textContent).toBe('Please agree')
    expect(item('tags').querySelector('input')!.getAttribute('aria-invalid')).toBe('true')
    expect(item('pet').querySelector('.ml-field__error')?.textContent).toBe('Pick a pet')
    expect(item('day').querySelector('.ml-datepicker__trigger')!.getAttribute('aria-invalid')).toBe('true')
    expect(item('day').querySelectorAll('.ml-field__error')).toHaveLength(1)

    // After a submit, fields re-check as they change — including async rules.
    await type(nameInput, 'taken')
    await flush()
    expect(item('name').querySelector('.ml-field__error')?.textContent).toBe('Taken')
    await type(nameInput, 'nala')
    await flush()
    expect(item('name').querySelector('.ml-field__error')).toBeNull()
    expect(nameInput.getAttribute('aria-invalid')).toBeNull()

    let msg: string | undefined
    await type(item('code').querySelector('input'), '12a')
    await flush()
    await act(async () => void (msg = await form.current!.validateField('code')))
    expect(msg).toBe('Three digits')
    expect(item('code').querySelector('.ml-field__error')?.textContent).toBe('Three digits')
  })

  it('validates on blur before any submit', async () => {
    const form = createRef<FormHandle>()
    render(<Harness form={form} />)
    const input = item('code').querySelector('input')!
    await type(input, 'abc')
    await flush()
    expect(item('code').querySelector('.ml-field__error')).toBeNull()
    await act(async () => void input.dispatchEvent(new FocusEvent('focusout', { bubbles: true })))
    await flush()
    expect(item('code').querySelector('.ml-field__error')?.textContent).toBe('Three digits')
    await type(input, '123')
    await flush()
    expect(item('code').querySelector('.ml-field__error')).toBeNull()
  })

  it('submit reports errors and focuses the first, or hands over the model', async () => {
    const onInvalid = vi.fn()
    const onSubmit = vi.fn()
    const form = createRef<FormHandle>()
    render(<Harness form={form} onInvalid={onInvalid} onSubmit={onSubmit} />)
    await act(async () => void ($('form') as HTMLFormElement).requestSubmit())
    await flush()
    expect(onInvalid).toHaveBeenCalledTimes(1)
    expect(Object.keys(onInvalid.mock.calls[0][0])).toEqual(['name', 'agree', 'tags', 'pet', 'day'])
    expect(document.activeElement).toBe(item('name').querySelector('input'))
    expect(onSubmit).not.toHaveBeenCalled()

    await act(async () => form.current!.resetFields())
    await flush()
    expect($$('.ml-field__error')).toHaveLength(0)
    expect($$('[aria-invalid="true"]')).toHaveLength(0)
  })

  it('resetFields restores the first-render model and clears errors; clearValidation keeps values', async () => {
    const form = createRef<FormHandle>()
    render(<Harness form={form} />)
    const input = item('code').querySelector('input')!
    await type(input, 'x')
    await act(async () => void (await form.current!.validate()))
    expect(item('code').querySelector('.ml-field__error')).not.toBeNull()
    act(() => form.current!.clearValidation(['code']))
    expect(item('code').querySelector('.ml-field__error')).toBeNull()
    expect(input.value).toBe('x')
    expect(item('name').querySelector('.ml-field__error')).not.toBeNull()
    await act(async () => form.current!.resetFields())
    await flush()
    expect(input.value).toBe('')
    expect($$('.ml-field__error')).toHaveLength(0)
    // Not submitted any more: changes don't re-validate until blur/submit.
    await type(input, 'y')
    await flush()
    expect(item('code').querySelector('.ml-field__error')).toBeNull()
  })

  it('passes an explicit error prop through outside any form', () => {
    render(<Input label="Solo" error="Nope" />)
    expect($('input')!.getAttribute('aria-invalid')).toBe('true')
    expect($('.ml-field__error')?.textContent).toBe('Nope')
  })
})
