import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { TaiwanRegion, type MlTaiwanRegionValue } from '../../src/react/region'
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
const $ = (s: string) => document.querySelector(s)
const $$ = (s: string) => [...document.querySelectorAll(s)]
const selects = () => $$('select') as HTMLSelectElement[]
const choose = (select: HTMLSelectElement, value: string) =>
  act(() => {
    select.value = value
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })
const type = (el: Element | null, text: string) =>
  act(() => {
    const input = el as HTMLInputElement
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, text)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
const text = (s: HTMLSelectElement) => s.options[s.selectedIndex]?.textContent

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
})

describe('TaiwanRegion', () => {
  it('links the selects and reports { county, district, zip }', () => {
    const onChange = vi.fn()
    render(<TaiwanRegion onChange={onChange} />)
    const [county, district] = selects()
    expect(district.disabled).toBe(true)
    choose(county, '新北市')
    expect(onChange).not.toHaveBeenCalled()
    expect(district.disabled).toBe(false)
    expect(district.options[1].textContent).toBe('207 萬里區')
    choose(district, '板橋區')
    expect(onChange).toHaveBeenLastCalledWith({ county: '新北市', district: '板橋區', zip: '220' }, expect.objectContaining({ en: 'Banqiao Dist.' }))
    choose(county, '臺北市')
    expect(onChange).toHaveBeenLastCalledWith(null, null)
    expect(county.value).toBe('臺北市')
    expect(district.value).toBe('')
  })

  it('controlled: accepts 台, clears, and follows external resets', () => {
    function Demo() {
      const [v, setV] = useState<MlTaiwanRegionValue | null>({ county: '台中市', district: '北屯區', zip: '406' })
      return (
        <>
          <TaiwanRegion value={v} onChange={setV} clearable zip={false} />
          <button id="set" onClick={() => setV({ county: '連江縣', district: '南竿鄉', zip: '209' })} />
        </>
      )
    }
    render(<Demo />)
    const [county, district] = selects()
    expect(county.value).toBe('臺中市')
    expect(text(district)).toBe('北屯區')
    act(() => ($('.ml-region__clear') as HTMLElement).click())
    expect(county.value).toBe('')
    expect($('.ml-region__clear')).toBeNull()
    act(() => ($('#set') as HTMLElement).click())
    expect(county.value).toBe('連江縣')
    expect(district.value).toBe('南竿鄉')
  })

  it('search variant matches 台/臺, English and zip prefixes', () => {
    const onChange = vi.fn()
    render(<TaiwanRegion variant="search" lang="en" onChange={onChange} />)
    const input = $('input')!
    type(input, '台中 北屯')
    expect($$('[role="option"]').map((o) => o.textContent)).toEqual(['406 Beitun Dist., Taichung City'])
    type(input, '89')
    expect($$('[role="option"]')).toHaveLength(6)
    act(() => ($$('[role="option"]')[0] as HTMLElement).click())
    expect(onChange).toHaveBeenLastCalledWith({ county: '金門縣', district: '金沙鎮', zip: '890' }, expect.objectContaining({ countyEn: 'Kinmen County' }))
    expect((input as HTMLInputElement).value).toBe('890 Jinsha Township, Kinmen County')
  })

  it('validates inside FormItem: a county alone is still empty', async () => {
    function Demo() {
      const [model, setModel] = useState({ region: null as MlTaiwanRegionValue | null })
      return (
        <Form model={model} rules={{ region: { required: true, message: '請選擇地區' } }}>
          <FormItem prop="region">
            <TaiwanRegion label="地區" value={model.region} onChange={(region) => setModel({ region })} />
          </FormItem>
        </Form>
      )
    }
    render(<Demo />)
    expect($('.ml-field__required')).not.toBeNull()
    choose(selects()[0], '澎湖縣')
    await act(async () => {
      $('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await new Promise((r) => setTimeout(r))
    })
    expect($$('.ml-field__error').map((e) => e.textContent)).toEqual(['請選擇地區'])
    expect(selects()[0].getAttribute('aria-invalid')).toBe('true')
    await act(async () => {
      choose(selects()[1], '馬公市')
      await new Promise((r) => setTimeout(r))
    })
    expect($('.ml-field__error')).toBeNull()
  })
})
