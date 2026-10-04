import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { CodeDiff } from '../../src/react/diff'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined
let host: HTMLElement
function render(el: React.ReactElement) {
  if (!root) {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
  }
  act(() => root!.render(el))
  return host
}

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
})

const OLD = Array.from({ length: 30 }, (_, i) => `line ${i + 1}`).join('\n')
const NEW = OLD.replace('line 5', 'line five').replace('line 25', 'line 25 (lion)')
const click = (el: Element | null | undefined) => act(() => (el as HTMLElement).click())

describe('CodeDiff (React)', () => {
  it('expands folds and resets them when the input changes', () => {
    render(<CodeDiff oldCode={OLD} newCode={NEW} />)
    expect([...host.querySelectorAll('.ml-diff__expand')].map((e) => e.textContent)).toEqual(['展開 13 行', '展開 2 行'])
    click(host.querySelector('.ml-diff__expand'))
    expect(host.querySelectorAll('.ml-diff__expand')).toHaveLength(1)
    expect(host.querySelectorAll('tbody tr.ml-diff__row')).toHaveLength(28)
    render(<CodeDiff oldCode={OLD} newCode={NEW + '\nmore'} />)
    // A new diff starts folded again (the tail now touches the new last line).
    expect([...host.querySelectorAll('.ml-diff__expand')].map((e) => e.textContent)).toEqual(['展開 13 行'])
  })

  it('switches view, uncontrolled and controlled', () => {
    const onViewChange = vi.fn()
    render(<CodeDiff oldCode={OLD} newCode={NEW} onViewChange={onViewChange} />)
    click(host.querySelectorAll('.ml-diff__view')[1])
    expect(onViewChange).toHaveBeenCalledWith('unified')
    expect(host.firstElementChild!.className).toContain('ml-diff--unified')
    expect(host.querySelectorAll('tr.ml-diff__row--del')).toHaveLength(2)
    render(<CodeDiff oldCode={OLD} newCode={NEW} view="split" onViewChange={onViewChange} />)
    click(host.querySelectorAll('.ml-diff__view')[1])
    expect(host.firstElementChild!.className).toContain('ml-diff--split')
  })

  it('navigates changes with buttons and n / p', async () => {
    const onNavigate = vi.fn()
    render(<CodeDiff oldCode={OLD} newCode={NEW} onNavigate={onNavigate} />)
    const pos = () => host.querySelector('.ml-diff__pos')!.textContent
    expect(pos()).toBe('2 處變更')
    click(host.querySelectorAll('.ml-diff__btn')[1])
    await act(() => new Promise((r) => requestAnimationFrame(() => r(undefined))))
    expect(pos()).toBe('1 / 2')
    expect(document.activeElement?.getAttribute('data-ml-diff-change')).toBe('0')
    act(() => {
      host.firstElementChild!.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', bubbles: true }))
    })
    await act(() => new Promise((r) => requestAnimationFrame(() => r(undefined))))
    expect(pos()).toBe('2 / 2')
    expect(document.activeElement?.getAttribute('data-ml-diff-change')).toBe('1')
    expect(host.querySelector('[data-ml-diff-change="1"]')!.className).toContain('ml-diff__row--current')
    act(() => {
      host.firstElementChild!.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', bubbles: true }))
    })
    expect(pos()).toBe('1 / 2')
    expect(onNavigate).toHaveBeenLastCalledWith(0, 2)
  })
})
