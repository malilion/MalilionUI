import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, createRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { SchemaForm, Wizard, twRules, type MlSchemaModel, type SchemaField, type SchemaFormHandle, type WizardStep } from '../../src/react'

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
const submit = async () => act(async () => void $('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
const click = async (el: Element | null) => act(async () => void (el as HTMLElement).click())
const $ = (s: string) => document.querySelector(s)

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
})

const schema: SchemaField[] = [
  { field: 'name', label: '姓名', required: true },
  { field: 'id', label: '身分證字號', rules: [twRules.nationalId()] },
  { field: 'vip', label: 'VIP', type: 'switch' },
  { field: 'note', label: '備註', visible: (m) => m.vip === true },
  { field: 'locked', label: '鎖定', required: true, disabled: true },
]

describe('React SchemaForm', () => {
  it('fills defaults, validates, shows conditional fields and resets', async () => {
    let latest: MlSchemaModel = {}
    const onSubmit = vi.fn()
    const form = createRef<SchemaFormHandle>()
    function Host() {
      const [model, setModel] = useState<MlSchemaModel>({ name: 'Leo' })
      latest = model
      return <SchemaForm ref={form} schema={schema} value={model} onChange={setModel} onSubmit={onSubmit} />
    }
    render(<Host />)
    await flush()
    expect(latest).toEqual({ name: 'Leo', id: '', vip: false, note: '', locked: '' })
    expect($('[data-prop="note"]')).toBeNull()

    await type($('[data-prop="name"] input'), '')
    await type($('[data-prop="id"] input'), 'A123456788')
    await submit()
    await flush()
    expect(onSubmit).not.toHaveBeenCalled()
    expect($('[data-prop="name"] .ml-field__error')!.textContent).toContain('必填')
    expect($('[data-prop="id"] .ml-field__error')!.textContent).toContain('身分證字號')
    expect($('[data-prop="locked"] .ml-field__error')).toBeNull()

    await type($('[data-prop="name"] input'), '碼力獅')
    await type($('[data-prop="id"] input'), 'A123456789')
    await click($('[role="switch"]'))
    expect($('[data-prop="note"]')).not.toBeNull()
    await submit()
    await flush()
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: '碼力獅', id: 'A123456789', vip: true }))

    await act(async () => form.current!.resetFields())
    await flush()
    expect(latest).toMatchObject({ name: 'Leo', id: '', vip: false })
    expect($('.ml-field__error')).toBeNull()
  })
})

describe('React SchemaForm address field', () => {
  it('shows a required address error once, for the whole address', async () => {
    render(<SchemaForm schema={[{ field: 'addr', label: '地址', type: 'address', required: true }]} />)
    await submit()
    await flush()
    expect(document.querySelectorAll('[data-prop="addr"] .ml-field__error')).toHaveLength(1)
    expect($('[data-prop="addr"] legend .ml-field__required')).not.toBeNull()
  })
})

describe('React Wizard', () => {
  const steps: WizardStep[] = [
    { key: 'who', title: '身分', schema: [{ field: 'id', label: '身分證字號', required: true, rules: [twRules.nationalId()] }] },
    { key: 'contact', title: '聯絡', schema: [{ field: 'mobile', label: '手機', required: true, rules: [twRules.mobile()] }] },
    { key: 'done', title: '確認', validate: (m) => (m.mobile === '0900000000' ? '這支號碼不行' : true) },
  ]

  it('validates per step, goes back freely and submits from the last step', async () => {
    let model: MlSchemaModel = {}
    const onCurrentChange = vi.fn()
    const onSubmit = vi.fn()
    const onFinish = vi.fn()
    let release!: (v: unknown) => void
    const action = vi.fn(() => new Promise((r) => (release = r)))
    function Host() {
      const [value, setValue] = useState<MlSchemaModel>({})
      model = value
      return (
        <Wizard
          steps={steps}
          value={value}
          onChange={setValue}
          onCurrentChange={onCurrentChange}
          onSubmit={onSubmit}
          onFinish={onFinish}
          action={action}
          renderStep={({ step, model: m }) => (step.key === 'done' ? <p className="summary">{String(m.mobile)}</p> : undefined)}
          renderFinish={() => <p className="thanks">完成</p>}
        />
      )
    }
    render(<Host />)
    const steps$ = () => [...document.querySelectorAll<HTMLButtonElement>('.ml-wizard__step')]
    expect(steps$()[1].disabled).toBe(true)

    await submit()
    await flush()
    expect(onCurrentChange).not.toHaveBeenCalled()
    expect($('[data-prop="id"] .ml-field__error')).not.toBeNull()
    expect(document.activeElement).toBe($('[data-prop="id"] input'))

    await type($('[data-prop="id"] input'), 'A123456789')
    await submit()
    await flush()
    expect(onCurrentChange).toHaveBeenLastCalledWith(1, 0)
    expect($('.ml-field__error')).toBeNull()
    expect(document.activeElement?.classList.contains('ml-wizard__panel')).toBe(true)

    await click($('.ml-wizard__actions .ml-btn--ghost'))
    expect(onCurrentChange).toHaveBeenLastCalledWith(0, 1)
    expect(steps$()[1].disabled).toBe(false)
    await click(steps$()[1])
    await flush()
    expect(onCurrentChange).toHaveBeenLastCalledWith(1, 0)

    await type($('[data-prop="mobile"] input'), '0900000000')
    await submit()
    await flush()
    expect($('.summary')!.textContent).toBe('0900000000')
    await submit()
    await flush()
    expect($('.ml-wizard__error')!.textContent).toContain('這支號碼不行')
    expect(onSubmit).not.toHaveBeenCalled()

    await click(steps$()[1])
    await type($('[data-prop="mobile"] input'), '0912345678')
    await submit()
    await flush()
    await submit()
    await flush()
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ id: 'A123456789', mobile: '0912345678' }))
    expect($('.ml-wizard__actions button[type="submit"]')!.classList.contains('ml-btn--loading')).toBe(true)
    await act(async () => release(true))
    await flush()
    expect(onFinish).toHaveBeenCalled()
    expect($('.thanks')).not.toBeNull()
    expect(model.mobile).toBe('0912345678')
  })
})
