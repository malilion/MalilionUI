import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, createRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { BankPicker } from '../../src/react/bank'
import { LunarCalendar } from '../../src/react/lunar-calendar'
import { InvoiceChecker, type InvoiceCheckerHandle, type MlInvoiceDraw } from '../../src/react/invoice'
import { Form, FormItem } from '../../src/react/validation'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined
function render(el: React.ReactElement) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(el))
  return host
}
const $ = (s: string) => document.querySelector(s)!
const $$ = (s: string) => [...document.querySelectorAll(s)]
const type = (el: Element | null, text: string) =>
  act(() => {
    const input = el as HTMLInputElement
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, text)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
const key = (el: Element, k: string) => act(() => void el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })))
const click = (el: Element) => act(() => void (el as HTMLElement).click())

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
})

describe('BankPicker', () => {
  it('search by alias and pick', () => {
    const onChange = vi.fn()
    render(<BankPicker onChange={onChange} />)
    const input = $('input.ml-combobox__search')
    type(input, 'cathay')
    const options = $$('[role="option"]')
    expect(options.map((o) => o.textContent)).toEqual(['013 國泰世華商業銀行'])
    click(options[0])
    expect(onChange).toHaveBeenCalledWith('013', expect.objectContaining({ short: '國泰世華' }))
    expect((input as HTMLInputElement).value).toBe('013 國泰世華商業銀行')
  })

  it('account: digits only, grouped, hint follows the count', () => {
    const onAccountChange = vi.fn()
    function Demo() {
      const [acct, setAcct] = useState('')
      return (
        <BankPicker
          withAccount
          defaultValue="808"
          account={acct}
          onAccountChange={(a) => {
            onAccountChange(a)
            setAcct(a)
          }}
        />
      )
    }
    render(<Demo />)
    const field = $('.ml-bank-picker__account-input') as HTMLInputElement
    type(field, '1234-5678 abc 9012')
    expect(onAccountChange).toHaveBeenLastCalledWith('123456789012')
    expect(field.value).toBe('1234 5678 9012')
    expect($('.ml-bank-picker__account .ml-field__hint').textContent).toContain('12')
  })

  it('shows FormItem errors', async () => {
    function Demo() {
      const [model, setModel] = useState({ bank: null as string | null })
      return (
        <Form model={model} rules={{ bank: { required: true } }}>
          <FormItem prop="bank">
            <BankPicker label="收款銀行" value={model.bank} onChange={(bank) => setModel({ bank })} />
          </FormItem>
          <button type="submit">送出</button>
        </Form>
      )
    }
    render(<Demo />)
    await act(async () => void ($('button[type="submit"]') as HTMLButtonElement).click())
    expect($('.ml-field__error').textContent).toContain('此欄位為必填')
  })
})

describe('LunarCalendar', () => {
  it('labels, keyboard and selection', () => {
    const onChange = vi.fn()
    const onSelect = vi.fn()
    const onMonthChange = vi.fn()
    render(<LunarCalendar today={new Date(2026, 1, 27)} onChange={onChange} onSelect={onSelect} onMonthChange={onMonthChange} />)
    expect($('[data-day="2026-02-17"] .ml-lunar-cal__label').textContent).toBe('春節')
    expect($('[data-day="2026-02-17"]').classList.contains('ml-lunar-cal__day--off')).toBe(true)
    expect($('.ml-lunar-cal__year').textContent).toBe('乙巳年（蛇） / 丙午年（馬）')
    const grid = $('[role="grid"]')
    key(grid, 'ArrowRight')
    key(grid, 'ArrowRight')
    expect(onMonthChange).toHaveBeenCalledWith(2026, 2)
    expect(document.activeElement?.getAttribute('data-day')).toBe('2026-03-01')
    key(grid, 'Enter')
    expect(onChange).toHaveBeenCalledWith(new Date(2026, 2, 1))
    expect(onSelect.mock.calls[0][1]).toMatchObject({ key: '2026-03-01', lunar: { month: 1, day: 13 } })
    expect($('[data-day="2026-03-01"]').classList.contains('ml-lunar-cal__day--selected')).toBe(true)
  })

  it('holidays prop: extra days off and a working Saturday', () => {
    render(<LunarCalendar today={new Date(2026, 1, 1)} holidays={{ '2026-02-20': '調整放假', '2026-02-07': { name: '補行上班', off: false } }} />)
    expect($('[data-day="2026-02-20"]').classList.contains('ml-lunar-cal__day--off')).toBe(true)
    expect($('[data-day="2026-02-07"]').classList.contains('ml-lunar-cal__day--workday')).toBe(true)
    click($$('.ml-lunar-cal__nav')[1])
    expect($('.ml-lunar-cal__title').textContent).toContain('3')
  })
})

describe('InvoiceChecker', () => {
  const draws: MlInvoiceDraw[] = [
    { period: '115年 7–8月', special: '89996565', grand: '91098182', first: ['54348835', '44991397', '06595111'] },
    { period: '115年 5–6月', special: '38548029', grand: '10138845', first: ['24121106', '28589937', '83663333'] },
  ]

  it('末三碼 then full number; history and onCheck', () => {
    const onCheck = vi.fn()
    render(<InvoiceChecker draws={draws} onCheck={onCheck} />)
    type($('.ml-pin__box'), '835')
    expect($('.ml-invoice__result').classList.contains('ml-invoice__result--maybe')).toBe(true)
    expect($('.ml-invoice__candidate').textContent).toBe('頭獎54348835')
    expect(onCheck).toHaveBeenLastCalledWith(expect.objectContaining({ mode: 'quick', status: 'maybe', amount: 200 }))
    expect(($('.ml-pin__box') as HTMLInputElement).value).toBe('')
    expect(document.activeElement).toBe($('.ml-pin__box'))

    const radios = $$('[role="radio"]')
    key(radios[0], 'ArrowRight')
    expect($$('.ml-pin__box')).toHaveLength(8)
    expect(document.activeElement).toBe($$('[role="radio"]')[1])
    type($('.ml-pin__box'), '91098182')
    expect($('.ml-invoice__message').textContent).toBe('恭喜中特獎！獎金 200 萬元')
    expect($('.ml-invoice__row--grand .ml-invoice__hit').textContent).toBe('91098182')
    expect($$('.ml-invoice__log-verdict').map((v) => v.textContent)).toEqual(['特獎 200 萬元', '待核對'])
    click($('.ml-invoice__clear'))
    expect(document.querySelector('.ml-invoice__history')).toBeNull()
  })

  it('period select and the imperative check()', () => {
    const ref = createRef<InvoiceCheckerHandle>()
    const onPeriodChange = vi.fn()
    render(<InvoiceChecker ref={ref} draws={draws} onPeriodChange={onPeriodChange} />)
    const select = $('select') as HTMLSelectElement
    act(() => {
      select.value = '115年 5–6月'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(onPeriodChange).toHaveBeenCalledWith('115年 5–6月')
    let result: ReturnType<InvoiceCheckerHandle['check']> = null
    act(() => void (result = ref.current!.check('AB-83663333')))
    expect(result).toMatchObject({ tier: 'first', amount: 200_000, period: '115年 5–6月' })
    expect($('.ml-invoice__message').textContent).toBe('恭喜中頭獎！獎金 20 萬元')
  })
})
