import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, createRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { AvatarGroup, Barcode, DatePicker, Text, type BarcodeHandle } from '../../src/react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined
function render(el: React.ReactElement) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(el))
  return host
}
const click = (el: Element | null) => act(() => void (el as HTMLElement).click())

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
})

const people = ['碼力獅', 'Leo', 'Nala', '小虎', 'Simba'].map((name) => ({ name }))

describe('React essentials', () => {
  it('AvatarGroup expands and collapses, reporting the change', () => {
    const onExpandedChange = vi.fn()
    const host = render(<AvatarGroup items={people} max={2} expandable onExpandedChange={onExpandedChange} />)
    const avatars = () => host.querySelectorAll('.ml-avatar:not(.ml-avatar-group__more)').length
    expect(avatars()).toBe(2)
    click(host.querySelector('button.ml-avatar-group__more'))
    expect(onExpandedChange).toHaveBeenLastCalledWith(true)
    expect(avatars()).toBe(5)
    click(host.querySelector('.ml-avatar-group__less'))
    expect(onExpandedChange).toHaveBeenLastCalledWith(false)
    expect(avatars()).toBe(2)
  })

  it('Text copies the shown text or the given string', async () => {
    const copied: string[] = []
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (t: string) => void copied.push(t) }, configurable: true })
    const host = render(
      <>
        <Text copyable> ORD-42 </Text>
        <Text copyable="24536806">2453-6806</Text>
      </>,
    )
    const buttons = host.querySelectorAll('button')
    await act(async () => (buttons[0] as HTMLElement).click())
    await act(async () => (buttons[1] as HTMLElement).click())
    expect(copied).toEqual(['ORD-42', '24536806'])
  })

  it('Barcode exposes toSVG() through its ref', () => {
    const ref = createRef<BarcodeHandle>()
    render(<Barcode ref={ref} value="ABC" />)
    expect(ref.current!.toSVG()).toContain('aria-label="條碼：ABC"')
  })

  it('DatePicker with calendar="roc" pages decades by 民國', () => {
    const host = render(<DatePicker defaultValue={new Date(2026, 0, 1)} type="year" calendar="roc" />)
    expect(host.querySelector('.ml-datepicker__trigger')!.textContent).toBe('民國 115 年')
    click(host.querySelector('.ml-datepicker__trigger'))
    expect(host.querySelector('.ml-calendar__title')!.textContent).toBe('民國 110 – 119 年')
    click(host.querySelector('.ml-calendar__nav:last-of-type'))
    expect(host.querySelector('.ml-calendar__title')!.textContent).toBe('民國 120 – 129 年')
  })
})
