import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Button, ButtonGroup, Highlight, ToggleGroup, type MlToggleGroupValue } from '../../src/react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined
function render(el: React.ReactElement) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(el))
  return host
}
const click = (el: Element | undefined) => act(() => void (el as HTMLElement).click())
const key = (el: Element, k: string) => act(() => void el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })))

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
})

const options = [
  { value: 'bold', label: '粗體' },
  { value: 'italic', label: '斜體' },
  { value: 'code', label: '程式碼', disabled: true },
  { value: 'strike', label: '刪除線' },
]

describe('React ToggleGroup', () => {
  it('single mode releases the pressed item (uncontrolled)', () => {
    const onChange = vi.fn()
    const host = render(<ToggleGroup options={options} defaultValue="bold" onChange={onChange} />)
    const items = [...host.querySelectorAll('button')]
    click(items[0])
    expect(onChange).toHaveBeenLastCalledWith(null)
    expect(items.map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'false', 'false'])
    click(items[1])
    expect(onChange).toHaveBeenLastCalledWith('italic')
    click(items[2])
    expect(onChange).toHaveBeenCalledTimes(2)
  })

  it('multiple mode keeps option order; allowEmpty false holds the last one', () => {
    let latest: MlToggleGroupValue = []
    function Host() {
      const [v, setV] = useState<MlToggleGroupValue>(['strike'])
      latest = v
      return <ToggleGroup options={options} multiple allowEmpty={false} value={v} onChange={setV} />
    }
    const host = render(<Host />)
    const items = [...host.querySelectorAll('button')]
    click(items[0])
    expect(latest).toEqual(['bold', 'strike'])
    click(items[3])
    click(items[0])
    expect(latest).toEqual(['bold'])
  })

  it('arrow keys move focus over enabled items without pressing', () => {
    const onChange = vi.fn()
    const host = render(<ToggleGroup options={options} value="italic" onChange={onChange} />)
    const group = host.querySelector('[role=group]')!
    const items = [...host.querySelectorAll('button')]
    expect(items.map((b) => b.tabIndex)).toEqual([-1, 0, -1, -1])
    key(group, 'ArrowRight')
    expect(document.activeElement).toBe(items[3])
    expect(items.map((b) => b.tabIndex)).toEqual([-1, -1, -1, 0])
    key(group, 'Home')
    expect(document.activeElement).toBe(items[0])
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('React ButtonGroup', () => {
  it('passes size, variant and disabled down', () => {
    const onClick = vi.fn()
    const host = render(
      <ButtonGroup size="sm" variant="tech" disabled>
        <Button onClick={onClick}>A</Button>
        <Button variant="danger">B</Button>
      </ButtonGroup>,
    )
    const [a, b] = [...host.querySelectorAll('button')]
    expect(a.className).toBe('ml-btn ml-btn--tech ml-btn--sm')
    expect(b.className).toBe('ml-btn ml-btn--danger ml-btn--sm')
    expect(a.disabled && b.disabled).toBe(true)
    click(a)
    expect(onClick).not.toHaveBeenCalled()
  })
})

describe('React Highlight', () => {
  it('re-splits when the keywords change', () => {
    function Host() {
      const [q, setQ] = useState('獅')
      return (
        <>
          <button onClick={() => setQ('碼力')}>q</button>
          <Highlight text="碼力獅" keywords={q} />
        </>
      )
    }
    const host = render(<Host />)
    expect(host.querySelector('mark')!.textContent).toBe('獅')
    click(host.querySelector('button')!)
    expect(host.querySelector('mark')!.textContent).toBe('碼力')
    expect(host.querySelector('.ml-highlight')!.textContent).toBe('碼力獅')
  })
})
