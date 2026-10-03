import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Markdown } from '../../src/react/markdown'

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

describe('Markdown (React)', () => {
  it('streams: finished blocks keep their DOM, the caret follows the tail', () => {
    render(<Markdown source={'First.\n\nSec'} streaming />)
    const first = host.querySelector('p')
    expect(host.querySelectorAll('p')[1].querySelector('.ml-markdown__caret')).not.toBeNull()
    render(<Markdown source={'First.\n\nSecond **bo'} streaming />)
    expect(host.querySelector('p')).toBe(first)
    expect(host.querySelectorAll('p')[1].textContent).toBe('Second bo')
    expect(host.querySelector('strong')?.textContent).toBe('bo')
    render(<Markdown source={'First.\n\nSecond **bold**'} />)
    expect(host.querySelector('.ml-markdown__caret')).toBeNull()
    expect(host.firstElementChild?.getAttribute('aria-busy')).toBeNull()
  })

  it('forwards copy from code blocks', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.resolve() }, configurable: true })
    const onCopy = vi.fn()
    render(<Markdown source={'```sh\nnpm i\n```'} onCopy={(c) => onCopy(c)} />)
    await act(async () => {
      ;(host.querySelector('.ml-code button') as HTMLElement).click()
    })
    expect(onCopy).toHaveBeenCalledWith('npm i')
  })
})
