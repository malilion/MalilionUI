import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { TaiwanMap } from '../../src/react/taiwan-map'
import { TaiwanRegion, type MlTaiwanRegionValue } from '../../src/react/region'
import { getTaiwanDistricts } from '../../src/taiwan-regions'

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
const county = (name: string) => $(`[data-county="${name}"]`) as SVGPathElement
const click = (el: Element) => act(() => el.dispatchEvent(new MouseEvent('click', { bubbles: true })))
const key = (k: string) => act(() => $('svg.ml-twmap__svg')!.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })))
const focus = (el: SVGPathElement) => act(() => el.focus())

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
})

describe('TaiwanMap', () => {
  const data = { 臺北市: 10, 新北市: 40, 臺中市: 25 }

  it('uncontrolled: click selects and deselects, onSelect reports it', () => {
    const onSelect = vi.fn()
    const onSelectedChange = vi.fn()
    render(<TaiwanMap data={data} onSelect={onSelect} onSelectedChange={onSelectedChange} />)
    click(county('新北市'))
    expect(onSelectedChange).toHaveBeenLastCalledWith('新北市')
    expect(onSelect).toHaveBeenLastCalledWith('新北市', true)
    expect(county('新北市').getAttribute('aria-pressed')).toBe('true')
    expect(county('新北市').getAttribute('tabindex')).toBe('0')
    expect($('.ml-twmap__outline--selected')).not.toBeNull()
    click(county('新北市'))
    expect(onSelectedChange).toHaveBeenLastCalledWith(null)
    expect(onSelect).toHaveBeenLastCalledWith('新北市', false)
  })

  it('keyboard: arrows move to neighbours, Enter selects, Escape hides the tooltip', () => {
    const onSelectedChange = vi.fn()
    render(<TaiwanMap data={data} multiple onSelectedChange={onSelectedChange} format={(v) => `${v} 人`} />)
    focus(county('臺中市'))
    expect($('.ml-twmap__tip')?.textContent).toContain('25 人')
    key('ArrowUp')
    expect(document.activeElement?.getAttribute('data-county')).toBe('苗栗縣')
    expect(county('苗栗縣').getAttribute('tabindex')).toBe('0')
    key('Enter')
    expect(onSelectedChange).toHaveBeenLastCalledWith(['苗栗縣'])
    key('Home')
    expect(document.activeElement?.getAttribute('data-county')).toBe('臺北市')
    key(' ')
    expect(onSelectedChange).toHaveBeenLastCalledWith(['苗栗縣', '臺北市'])
    key('Escape')
    expect($('.ml-twmap__tip')).toBeNull()
  })

  it('disabled counties cannot be picked; hover shows the tooltip', () => {
    const onSelectedChange = vi.fn()
    render(<TaiwanMap data={data} disabled={['臺北市']} onSelectedChange={onSelectedChange} />)
    click(county('臺北市'))
    expect(onSelectedChange).not.toHaveBeenCalled()
    act(() => county('新北市').dispatchEvent(new PointerEvent('pointerover', { bubbles: true })))
    act(() => county('新北市').dispatchEvent(new PointerEvent('pointerenter', { bubbles: false })))
    expect($('.ml-twmap__tip')?.textContent).toContain('新北市')
    expect(county('新北市').classList.contains('ml-twmap__county--hover')).toBe(true)
  })

  it('links with TaiwanRegion both ways', () => {
    function Demo() {
      const [region, setRegion] = useState<MlTaiwanRegionValue | null>(null)
      const [picked, setPicked] = useState<string | null>(null)
      return (
        <>
          <TaiwanMap
            selected={picked}
            onSelectedChange={(v) => {
              const name = typeof v === 'string' ? v : null
              setPicked(name)
              const d = name ? getTaiwanDistricts(name)[0] : undefined
              setRegion(d ? { county: d.county, district: d.name, zip: d.zip } : null)
            }}
          />
          <TaiwanRegion
            value={region}
            onChange={(v) => {
              setRegion(v)
              if (v) setPicked(v.county)
            }}
          />
        </>
      )
    }
    render(<Demo />)
    click(county('花蓮縣'))
    const [c, d] = [...document.querySelectorAll('select')] as HTMLSelectElement[]
    expect(c.value).toBe('花蓮縣')
    expect(d.value).toBe('花蓮市')
    act(() => {
      c.value = '臺東縣'
      c.dispatchEvent(new Event('change', { bubbles: true }))
    })
    act(() => {
      d.value = '綠島鄉'
      d.dispatchEvent(new Event('change', { bubbles: true }))
    })
    expect(county('臺東縣').getAttribute('aria-pressed')).toBe('true')
    expect(county('花蓮縣').getAttribute('aria-pressed')).toBe('false')
  })
})
