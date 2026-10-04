import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { PickerView, datePickerColumns, type MlPickerOption, type MlPickerValue, type PickerViewHandle } from '../../src/react/picker-view'
import { ConfigProvider } from '../../src/react/locale'
import { en } from '../../src/locale-data'
import { wheelGeometry } from '../../src/components/picker-wheel'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined
function render(el: React.ReactElement) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(el))
  return host
}
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms))
const pointer = (el: Element, type: string, clientY: number) =>
  act(() => void el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, pointerType: 'touch', clientY, button: 0 })))
const key = (el: Element, k: string) => act(() => void el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true })))
const click = (el: Element) => act(() => void el.dispatchEvent(new MouseEvent('click', { bubbles: true })))
const trackAngle = (col: Element) => Number(/rotateX\(([-\d.]+)deg\)/.exec((col.querySelector('.ml-picker-view__track') as HTMLElement).style.transform)![1])
const cols = (host: Element) => [...host.querySelectorAll('[role="spinbutton"]')]

const fruit: MlPickerOption[] = ['Apple', 'Banana', 'Cherry', 'Durian', 'Elderberry', 'Fig', 'Grape', 'Honeydew', 'Kiwi', 'Lemon', 'Mango', 'Nectarine'].map((label, i) => ({
  label,
  value: label,
  disabled: i === 3 || undefined,
}))
const sizes: MlPickerOption[] = ['S', 'M', 'L'].map((label) => ({ label, value: label }))

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })
})
afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
  vi.useRealTimers()
})

describe('React PickerView', () => {
  it('flings with momentum, snaps, then reports onSettle / onChange and announces', () => {
    const onChange = vi.fn()
    const onSettle = vi.fn()
    const host = render(<PickerView columns={[fruit]} defaultValue={['Apple']} onChange={onChange} onSettle={onSettle} />)
    const col = cols(host)[0]
    pointer(col, 'pointerdown', 300)
    for (let i = 1; i <= 5; i++) {
      vi.advanceTimersByTime(16)
      pointer(col, 'pointermove', 300 - i * 30)
    }
    vi.advanceTimersByTime(16)
    pointer(col, 'pointerup', 150)
    advance(100)
    expect(onSettle).not.toHaveBeenCalled()
    advance(4000)
    expect(onSettle).toHaveBeenCalledTimes(1)
    expect(onSettle.mock.calls[0][0]).toEqual(['Nectarine'])
    expect(onSettle.mock.calls[0][2]).toBe(0)
    expect(onChange).toHaveBeenCalledWith(['Nectarine'], [fruit[11]])
    expect(trackAngle(col)).toBeCloseTo(11 * wheelGeometry(44, 5).step, 1)
    expect(cols(host)[0].getAttribute('aria-valuetext')).toBe('Nectarine')
    expect(host.querySelector('[aria-live]')!.textContent).toBe('已選擇：Nectarine')
  })

  it('rubber-bands past the top and springs back without a change', () => {
    const onSettle = vi.fn()
    const host = render(<PickerView columns={[fruit]} defaultValue={['Apple']} onSettle={onSettle} />)
    const col = cols(host)[0]
    pointer(col, 'pointerdown', 100)
    vi.advanceTimersByTime(16)
    pointer(col, 'pointermove', 300)
    vi.advanceTimersByTime(16)
    expect(trackAngle(col)).toBeLessThan(0)
    vi.advanceTimersByTime(200)
    pointer(col, 'pointerup', 300)
    advance(1500)
    expect(trackAngle(col)).toBeCloseTo(0, 2)
    expect(onSettle).not.toHaveBeenCalled()
  })

  it('keyboard and type-ahead commit at once, skipping disabled rows (controlled)', () => {
    const seen: MlPickerValue[][] = []
    function Demo() {
      const [v, setV] = useState<MlPickerValue[]>(['Cherry', 'M'])
      return (
        <PickerView
          columns={[fruit, sizes]}
          value={v}
          onChange={(next) => {
            seen.push(next)
            setV(next)
          }}
        />
      )
    }
    const host = render(<Demo />)
    const col = cols(host)[0]
    key(col, 'ArrowDown')
    expect(seen.at(-1)).toEqual(['Elderberry', 'M'])
    expect(cols(host)[0].getAttribute('aria-valuetext')).toBe('Elderberry')
    key(col, 'End')
    expect(seen.at(-1)).toEqual(['Nectarine', 'M'])
    key(col, 'Home')
    expect(seen.at(-1)).toEqual(['Apple', 'M'])
    key(col, 'PageDown')
    expect(seen.at(-1)).toEqual(['Fig', 'M'])
    key(col, 'g')
    expect(seen.at(-1)).toEqual(['Grape', 'M'])
    advance(700)
    key(cols(host)[1], 's')
    expect(seen.at(-1)).toEqual(['Grape', 'S'])
    expect(host.querySelector('[aria-live]')!.textContent).toBe('')
    advance(1000)
    expect(trackAngle(col)).toBeCloseTo(6 * wheelGeometry(44, 5).step, 1)
  })

  it('cascades and resets the next column; mouse wheel scrolls', () => {
    const options: MlPickerOption[] = [
      { label: '臺北市', value: 'tp', children: [{ label: '中正區', value: 'zz' }, { label: '大安區', value: 'da' }] },
      { label: '新竹市', value: 'hc', children: [{ label: '東區', value: 'e' }, { label: '北區', value: 'n' }] },
    ]
    const onChange = vi.fn()
    const host = render(<PickerView options={options} defaultValue={['tp', 'da']} onChange={onChange} />)
    const wheel = new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true })
    act(() => void cols(host)[0].dispatchEvent(wheel))
    expect(wheel.defaultPrevented).toBe(true)
    advance(1000)
    expect(onChange).toHaveBeenLastCalledWith(['hc', 'e'], [options[1], options[1].children![0]])
    expect(cols(host)[1].getAttribute('aria-valuetext')).toBe('東區')
    expect(host.querySelector('[aria-live]')!.textContent).toBe('已選擇：新竹市，東區')
  })

  it('heals an impossible value and confirms through the toolbar or the handle', () => {
    const onChange = vi.fn()
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const ref = createRef<PickerViewHandle>()
    const columns = datePickerColumns({ min: new Date(2020, 0, 1), max: new Date(2030, 11, 31) })
    const host = render(<PickerView ref={ref} columns={columns} defaultValue={[2023, 2, 31]} title="生日" onChange={onChange} onConfirm={onConfirm} onCancel={onCancel} />)
    expect(onChange).toHaveBeenCalledWith([2023, 2, 28], expect.any(Array))
    click(host.querySelector('.ml-picker-view__action--confirm')!)
    expect(onConfirm.mock.calls[0][0]).toEqual([2023, 2, 28])
    click(host.querySelector('.ml-picker-view__action--cancel')!)
    expect(onCancel).toHaveBeenCalledTimes(1)
    act(() => ref.current!.confirm())
    expect(onConfirm).toHaveBeenCalledTimes(2)
    expect(ref.current!.getSelectedOptions().map((o) => o.label)).toEqual(['2023', '02', '28'])
  })

  it('speaks English and ignores input when disabled', () => {
    const onChange = vi.fn()
    const host = render(
      <ConfigProvider locale={en}>
        <PickerView columns={[sizes]} toolbar disabled onChange={onChange} renderOption={(o) => <b>{o.label.toLowerCase()}</b>} />
      </ConfigProvider>,
    )
    const col = cols(host)[0]
    expect(col.getAttribute('aria-label')).toBe('Column 1')
    expect(col.getAttribute('tabindex')).toBe('-1')
    expect([...host.querySelectorAll('.ml-picker-view__action')].map((b) => b.textContent)).toEqual(['Cancel', 'Done'])
    expect(host.querySelector('li b')!.textContent).toBe('s')
    key(col, 'ArrowDown')
    expect(onChange).not.toHaveBeenCalled()
  })
})
