import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { BoxPlot, FilterBar, QueryBuilder, WaterfallChart, countRules, type MlFilterField, type MlFilterValue, type MlQueryField, type MlQueryGroup } from '../../src/react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined
function render(el: React.ReactElement) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(el))
  return host
}
afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
})

/** Set a form control's value the way React notices. */
function setValue(el: HTMLInputElement | HTMLSelectElement, value: string) {
  const proto = el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(el, value)
  act(() => {
    el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }))
  })
}

const fields: MlFilterField[] = [
  { key: 'q', label: '關鍵字', type: 'text' },
  { key: 'status', label: '狀態', type: 'select', options: [{ value: 'paid', label: '已付款' }] },
  { key: 'amount', label: '金額', type: 'number-range' },
]

describe('React FilterBar', () => {
  it('edits, searches, clears a chip and resets', () => {
    const onSearch = vi.fn()
    function Host() {
      const [v, setV] = useState<MlFilterValue>({})
      return <FilterBar fields={fields} value={v} onChange={setV} onSearch={onSearch} />
    }
    const host = render(<Host />)
    setValue(host.querySelector('.ml-filter__item--text input')!, '獅')
    setValue(host.querySelector('.ml-filter__item--select select')!, 'paid')
    const min = host.querySelector<HTMLInputElement>('.ml-filter__range input')!
    min.value = '100'
    act(() => void min.dispatchEvent(new FocusEvent('focusout', { bubbles: true })))
    act(() => void host.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    expect(onSearch).toHaveBeenLastCalledWith({ q: '獅', status: 'paid', amount: [100, null] })
    expect([...host.querySelectorAll('.ml-filter__chip')].map((c) => c.textContent)).toEqual(['關鍵字獅', '狀態已付款', '金額≥ 100'])
    act(() => host.querySelector<HTMLElement>('[aria-label="清除「狀態」"]')!.click())
    expect(onSearch).toHaveBeenLastCalledWith({ q: '獅', amount: [100, null] })
    act(() => [...host.querySelectorAll<HTMLElement>('button')].find((b) => b.textContent === '重設')!.click())
    expect(onSearch).toHaveBeenLastCalledWith({})
    expect(host.querySelector('.ml-filter__chip')).toBeNull()
  })
})

const qFields: MlQueryField[] = [
  { key: 'name', label: '姓名', type: 'text' },
  { key: 'age', label: '年齡', type: 'number' },
]

describe('React QueryBuilder', () => {
  it('adds and edits rules, switches combinator, nests and removes', () => {
    let latest: MlQueryGroup | undefined
    const host = render(<QueryBuilder fields={qFields} onChange={(q) => (latest = q)} />)
    const adds = () => host.querySelectorAll<HTMLElement>('.ml-query__add')
    act(() => adds()[0].click())
    expect(countRules(latest!)).toBe(1)
    setValue(host.querySelector('.ml-query__field select')!, 'age')
    setValue(host.querySelector('.ml-query__operator select')!, 'gt')
    const input = host.querySelector<HTMLInputElement>('.ml-query__value input')!
    input.value = '18'
    act(() => void input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })))
    expect(latest!.rules[0]).toMatchObject({ field: 'age', operator: 'gt', value: 18 })
    act(() => host.querySelectorAll<HTMLElement>('.ml-query__toggle')[1].click())
    expect(latest!.combinator).toBe('or')
    act(() => adds()[1].click())
    expect(countRules(latest!)).toBe(2)
    act(() => host.querySelector<HTMLElement>('[aria-label="移除群組"]')!.click())
    act(() => host.querySelector<HTMLElement>('[aria-label="移除條件"]')!.click())
    expect(latest!.rules).toHaveLength(0)
    expect(host.querySelector('.ml-query__empty')).not.toBeNull()
  })
})

describe('React charts', () => {
  it('Waterfall and BoxPlot step through with the keyboard', () => {
    const host = render(
      <>
        <WaterfallChart data={[{ label: '起', value: 10, total: true }, { label: '加', value: 5 }]} />
        <BoxPlot data={[{ label: 'A', values: [1, 2, 3, 4] }]} />
      </>,
    )
    const [wf, bp] = host.querySelectorAll<HTMLElement>('[role="img"]')
    act(() => void wf.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true })))
    expect(host.querySelector('.ml-waterfall__pop')!.textContent).toContain('15')
    act(() => void bp.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })))
    expect(host.querySelector('.ml-boxplot__pop')!.textContent).toContain('2.5')
  })
})
