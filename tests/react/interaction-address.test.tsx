import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { TaiwanAddress, emptyTaiwanAddress, type MlTaiwanAddressValue } from '../../src/react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined
afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
})

describe('React TaiwanAddress', () => {
  it('pastes, edits and rebases the zip', () => {
    let latest: MlTaiwanAddressValue | undefined
    const onPaste = vi.fn()
    function Host() {
      const [v, setV] = useState(emptyTaiwanAddress())
      latest = v
      return <TaiwanAddress value={v} onChange={setV} onPaste={onPaste} />
    }
    const host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    act(() => root!.render(<Host />))
    const road = host.querySelector<HTMLInputElement>('.ml-address__road input')!
    const event = new Event('paste', { bubbles: true, cancelable: true }) as Event & { clipboardData: { getData: () => string } }
    event.clipboardData = { getData: () => '100台北市中正區重慶南路一段122號5樓' }
    act(() => void road.dispatchEvent(event))
    expect(latest).toMatchObject({ zip: '100', county: '臺北市', district: '中正區', road: '重慶南路', section: '1', number: '122', floor: '5' })
    expect(onPaste).toHaveBeenCalled()
    expect(host.querySelector('.ml-address__line')!.textContent).toBe('100臺北市中正區重慶南路一段122號5樓')

    const zip = host.querySelector<HTMLInputElement>('.ml-address__zip input')!
    act(() => {
      zip.focus()
      zip.value = '100603'
      zip.setSelectionRange(6, 6)
      zip.dispatchEvent(new InputEvent('input', { inputType: 'insertText', bubbles: true }))
    })
    expect(latest!.zip).toBe('100-603')
    const district = host.querySelectorAll<HTMLSelectElement>('select')[1]
    const daan = [...district.options].find((o) => o.textContent?.includes('大安'))!.value
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!.call(district, daan)
      district.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(latest).toMatchObject({ district: '大安區', zip: '106-603' })
  })
})
