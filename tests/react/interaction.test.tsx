import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Checkbox, ConfigProvider, Countdown, Empty, Modal, Pagination, Segmented, Switch, Tabs, ToastHost, en, toast } from '../../src/react'

// React 19 warns unless tests opt into act() semantics.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined
function render(el: React.ReactElement) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(el))
  return host
}
const key = (el: Element, k: string) => act(() => void el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })))
const click = (el: Element | null) => act(() => void (el as HTMLElement).click())

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
  toast.clear()
  vi.useRealTimers()
})

describe('React components', () => {
  it('Switch and Checkbox work uncontrolled and report changes', () => {
    const onSwitch = vi.fn()
    const onCheck = vi.fn()
    const host = render(
      <>
        <Switch label="Push" onChange={onSwitch} />
        <Checkbox label="Snacks" onChange={onCheck} />
      </>,
    )
    const sw = host.querySelector('[role="switch"]')!
    click(sw)
    expect(sw.getAttribute('aria-checked')).toBe('true')
    expect(onSwitch).toHaveBeenCalledWith(true)
    click(host.querySelector('input[type="checkbox"]'))
    expect(onCheck).toHaveBeenCalledWith(true)
  })

  it('Tabs move with the arrow keys and show the matching panel', () => {
    const host = render(
      <Tabs
        items={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B', disabled: true }, { value: 'c', label: 'C' }]}
        panels={{ a: 'Panel A', c: 'Panel C' }}
      />,
    )
    const tabs = host.querySelectorAll('[role="tab"]')
    expect(tabs[0].getAttribute('aria-selected')).toBe('true')
    key(tabs[0], 'ArrowRight') // skips the disabled tab
    expect(tabs[2].getAttribute('aria-selected')).toBe('true')
    const panels = host.querySelectorAll('[role="tabpanel"]')
    expect((panels[0] as HTMLElement).hidden).toBe(true)
    expect((panels[1] as HTMLElement).hidden).toBe(false)
  })

  it('Segmented is a controlled radio group', () => {
    function Demo() {
      const [v, setV] = useState<string | number>('x')
      return <Segmented options={[{ value: 'x', label: 'X' }, { value: 'y', label: 'Y' }]} value={v} onChange={setV} />
    }
    const host = render(<Demo />)
    const radios = host.querySelectorAll('[role="radio"]')
    key(radios[0], 'ArrowRight')
    expect(radios[1].getAttribute('aria-checked')).toBe('true')
    expect(radios[1].getAttribute('tabindex')).toBe('0')
  })

  it('Pagination clamps and moves', () => {
    const onChange = vi.fn()
    const host = render(<Pagination total={5} defaultPage={5} onChange={onChange} />)
    const [prev, , , , , , next] = host.querySelectorAll('button')
    expect((next as HTMLButtonElement).disabled).toBe(true)
    click(prev)
    expect(onChange).toHaveBeenCalledWith(4)
    expect(host.querySelector('[aria-current="page"]')?.textContent).toBe('4')
  })

  it('Modal portals to body, traps Escape and closes', () => {
    const onClose = vi.fn()
    render(
      <Modal open title="Deploy?" onClose={onClose} footer={<button>OK</button>}>
        Ship it
      </Modal>,
    )
    const dialog = document.querySelector('[role="dialog"]')!
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(document.body.textContent).toContain('Ship it')
    key(dialog, 'Escape')
    expect(onClose).toHaveBeenCalled()
  })

  it('toast() shows in <ToastHost> and dismisses itself', () => {
    vi.useFakeTimers()
    render(<ToastHost />)
    act(() => void toast.success({ title: 'Deployed', duration: 1000 }))
    expect(document.querySelector('.ml-toast--success')?.textContent).toContain('Deployed')
    act(() => void vi.advanceTimersByTime(1100))
    expect(document.querySelector('.ml-toast')).toBeNull()
  })

  it('ConfigProvider switches the language', () => {
    const host = render(
      <ConfigProvider locale={en}>
        <Empty art="none" />
      </ConfigProvider>,
    )
    expect(host.textContent).toContain('Nothing here yet')
  })

  it('Countdown ticks on the second and finishes once', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 1))
    const onFinish = vi.fn()
    const host = render(<Countdown duration={3000} units={['seconds']} onFinish={onFinish} />)
    const digits = () => host.querySelector('.ml-countdown__digits')?.textContent
    expect(digits()).toBe('03')
    act(() => void vi.advanceTimersByTime(1000))
    expect(digits()).toBe('02')
    act(() => void vi.advanceTimersByTime(5000))
    expect(digits()).toBe('00')
    expect(onFinish).toHaveBeenCalledTimes(1)
  })
})
