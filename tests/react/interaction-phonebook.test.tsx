import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, createRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { IndexBar, type IndexBarHandle } from '../../src/react'

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

const contacts = [{ label: '陳大文' }, { label: '林美玲' }, { label: '王小明' }, { label: 'Leo' }]
const fakeOffsets = (host: HTMLElement) =>
  host.querySelectorAll<HTMLElement>('.ml-indexbar__group').forEach((s, i) => Object.defineProperty(s, 'offsetTop', { value: i * 100, configurable: true }))

describe('React IndexBar', () => {
  it('rail click scrolls, scrolling tracks the active key', () => {
    const onChange = vi.fn()
    const host = render(<IndexBar items={contacts} onChange={onChange} />)
    fakeOffsets(host)
    const list = host.querySelector<HTMLElement>('.ml-indexbar__list')!
    act(() => host.querySelectorAll<HTMLElement>('.ml-indexbar__key')[2].click())
    expect(list.scrollTop).toBe(200)
    expect(onChange).toHaveBeenLastCalledWith('ㄨ')
    expect(host.querySelector('.ml-indexbar__key--active')!.textContent).toBe('ㄨ')
    act(() => {
      list.scrollTop = 120
      list.dispatchEvent(new Event('scroll'))
    })
    expect(onChange).toHaveBeenLastCalledWith('ㄔ')
  })

  it('arrow keys and the imperative jump', () => {
    const ref = createRef<IndexBarHandle>()
    const host = render(<IndexBar ref={ref} items={contacts} />)
    const rail = host.querySelector('nav')!
    act(() => void rail.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true })))
    expect(host.querySelector('.ml-indexbar__key--active')!.textContent).toBe('L')
    expect(document.activeElement?.textContent).toBe('L')
    act(() => ref.current!.jump('ㄔ'))
    expect(host.querySelector('.ml-indexbar__key--active')!.textContent).toBe('ㄔ')
  })

  it('a drag across the rail neither jumps back on release nor leaks a click outside', () => {
    let outside = 0
    const count = () => outside++
    document.body.addEventListener('click', count)
    const host = render(<IndexBar items={contacts} />)
    fakeOffsets(host)
    const list = host.querySelector<HTMLElement>('.ml-indexbar__list')!
    const keys = [...host.querySelectorAll<HTMLElement>('.ml-indexbar__key')]
    keys.forEach((k, i) => (k.getBoundingClientRect = () => ({ top: i * 20, height: 20, bottom: i * 20 + 20 }) as DOMRect))
    const nav = host.querySelector('nav')!
    const pointer = (type: string, y: number) =>
      act(() => void nav.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientY: y, button: 0, pointerId: 1 })))
    pointer('pointerdown', 10)
    pointer('pointermove', 50)
    pointer('pointerup', 50)
    expect(list.scrollTop).toBe(200)
    // Touch: the click lands on the key the finger went down on — it must not jump back.
    act(() => keys[0].click())
    expect(list.scrollTop).toBe(200)
    // Mouse: the click lands on the rail itself — it must not reach outer handlers.
    pointer('pointerdown', 10)
    pointer('pointermove', 50)
    act(() => void nav.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(outside).toBe(1)
    act(() => keys[1].click())
    expect(list.scrollTop).toBe(100)
    document.body.removeEventListener('click', count)
  })

  it('item clicks and renderItem', () => {
    const onItemClick = vi.fn()
    const host = render(<IndexBar items={contacts} onItemClick={onItemClick} />)
    act(() => host.querySelector<HTMLElement>('.ml-indexbar__item')!.click())
    expect(onItemClick).toHaveBeenCalledWith({ label: '林美玲' })
    act(() => root!.render(<IndexBar items={contacts} renderItem={(item) => <a href="#">{item.label}!</a>} />))
    expect(host.querySelector('.ml-indexbar__row a')!.textContent).toBe('林美玲!')
  })
})
