// twRules inside the React Form: same rule objects, same localized messages as the Vue form.
import { afterEach, describe, expect, it } from 'vitest'
import { act, createRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Input } from '../../src/react/form'
import { ConfigProvider } from '../../src/react/locale'
import { Form, FormItem, type FormHandle, type MlFormRules } from '../../src/react/validation'
import { en } from '../../src/locale-data'
import { twRules } from '../../src/validators-tw'

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
const errorOf = (prop: string) => document.querySelector(`[data-prop="${prop}"] .ml-field__error`)

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
})

const rules: MlFormRules = {
  id: [{ required: true }, twRules.nationalId()],
  ubn: twRules.businessId(),
  barcode: twRules.mobileBarcode(),
}

function Harness({ form }: { form: React.Ref<FormHandle> }) {
  const [model, setModel] = useState({ id: 'A123456788', ubn: '04595258', barcode: '/ABC+123' })
  const set = (k: keyof typeof model) => (v: string) => setModel((m) => ({ ...m, [k]: v }))
  return (
    <Form ref={form} model={model} rules={rules}>
      <FormItem prop="id">
        <Input label="身分證字號" value={model.id} onChange={set('id')} />
      </FormItem>
      <FormItem prop="ubn">
        <Input label="統一編號" value={model.ubn} onChange={set('ubn')} />
      </FormItem>
      <FormItem prop="barcode">
        <Input label="手機條碼" value={model.barcode} onChange={set('barcode')} />
      </FormItem>
    </Form>
  )
}

describe('twRules in the React Form', () => {
  it('validate() shows the zh-TW messages and clears them once fixed', async () => {
    const form = createRef<FormHandle>()
    render(<Harness form={form} />)
    let ok: boolean | undefined
    await act(async () => void (ok = await form.current!.validate()))
    expect(ok).toBe(false)
    expect(errorOf('id')?.textContent).toBe('身分證字號格式不正確')
    expect(errorOf('ubn')?.textContent).toBe('統一編號格式不正確')
    expect(errorOf('barcode')).toBeNull()

    await type(document.querySelector('[data-prop="id"] input'), 'A123456789')
    await type(document.querySelector('[data-prop="ubn"] input'), '04595257')
    await act(async () => void (ok = await form.current!.validate()))
    expect(ok).toBe(true)
    expect(document.querySelector('.ml-field__error')).toBeNull()
  })

  it('follows the ConfigProvider locale', async () => {
    const form = createRef<FormHandle>()
    render(
      <ConfigProvider locale={en}>
        <Harness form={form} />
      </ConfigProvider>,
    )
    await act(async () => void (await form.current!.validate()))
    expect(errorOf('id')?.textContent).toBe('Invalid Taiwan ID number')
    expect(errorOf('ubn')?.textContent).toBe('Invalid business ID (UBN)')
  })
})
