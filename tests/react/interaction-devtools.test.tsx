import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { CopyButton, JsonViewer, useClipboard } from '../../src/react/devtools'
import { CodeBlock } from '../../src/react/charts'

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
const settle = () => act(async () => {
  await new Promise((r) => setTimeout(r))
})
const click = async (el: Element) => {
  act(() => void el.dispatchEvent(new MouseEvent('click', { bubbles: true })))
  await settle()
}
const key = async (k: string) => {
  act(() => void document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })))
  await settle()
}

let writeText: ReturnType<typeof vi.fn>
beforeEach(() => {
  writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
})
afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
  vi.useRealTimers()
})

describe('useClipboard (React)', () => {
  it('copied flips and resets; isSupported after mount; error on failure', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    let api!: ReturnType<typeof useClipboard>
    function Probe() {
      api = useClipboard({ timeout: 300 })
      return <span>{api.copied ? 'yes' : 'no'}</span>
    }
    render(<Probe />)
    expect(api.isSupported).toBe(true)
    await act(async () => {
      expect(await api.copy('roar')).toBe(true)
    })
    expect(writeText).toHaveBeenCalledWith('roar')
    expect(host.textContent).toBe('yes')
    act(() => vi.advanceTimersByTime(301))
    expect(host.textContent).toBe('no')

    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
    Object.defineProperty(document, 'execCommand', { value: () => false, configurable: true, writable: true })
    await act(async () => {
      expect(await api.copy('x')).toBe(false)
    })
    expect(api.error).toBeInstanceOf(Error)
  })
})

describe('<CopyButton>', () => {
  it('copies, swaps label, pops a paw and calls onCopy', async () => {
    const onCopy = vi.fn()
    render(<CopyButton value={() => 'npm i @malilion/ui'} variant="button" onCopy={onCopy} />)
    expect(host.querySelector('.ml-copy__label')!.textContent).toBe('複製')
    await click(host.querySelector('button')!)
    expect(writeText).toHaveBeenCalledWith('npm i @malilion/ui')
    expect(onCopy).toHaveBeenCalledWith('npm i @malilion/ui')
    expect(host.querySelector('.ml-copy__label')!.textContent).toBe('已複製！')
    expect(host.querySelector('.ml-copy__paw')).not.toBeNull()
    expect(host.querySelector('[role=status]')!.textContent).toBe('已複製！')
    expect(host.firstElementChild!.classList.contains('ml-copy--copied')).toBe(true)
  })

  it('reports errors', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true })
    Object.defineProperty(document, 'execCommand', { value: () => false, configurable: true, writable: true })
    const onError = vi.fn()
    render(<CopyButton value="x" onError={onError} />)
    await click(host.querySelector('button')!)
    expect(onError).toHaveBeenCalledWith(expect.any(Error))
    expect(host.querySelector('button')!.getAttribute('aria-label')).toBe('複製失敗，請手動選取')
  })
})

describe('<CodeBlock> uses the shared clipboard core', () => {
  it('copies the trimmed source', async () => {
    const onCopy = vi.fn()
    render(<CodeBlock code={'\nconst a = 1\n\n'} onCopy={onCopy} />)
    await click(host.querySelectorAll('button')[0])
    expect(writeText).toHaveBeenCalledWith('const a = 1')
    expect(onCopy).toHaveBeenCalledWith('const a = 1')
  })
})

const api = {
  total: 2,
  users: [
    { id: 1, name: 'Nala' },
    { id: 2, name: 'Simba' },
  ],
}
const items = () => [...host.querySelectorAll('[role=treeitem]')] as HTMLElement[]
const keyOf = (el: Element | null) => el?.querySelector('.ml-json__key')?.textContent

describe('<JsonViewer>', () => {
  it('search (uncontrolled) highlights and expands; filter narrows', async () => {
    const onSearchChange = vi.fn()
    render(<JsonViewer data={api} expandDepth={1} onSearchChange={onSearchChange} />)
    expect(items()).toHaveLength(3)
    const input = host.querySelector('.ml-json__search-input') as HTMLInputElement
    act(() => {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      set.call(input, 'simba')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(onSearchChange).toHaveBeenCalledWith('simba')
    expect([...host.querySelectorAll('mark.ml-json__hit')].map((m) => m.textContent)).toEqual(['Simba'])
    expect(host.querySelector('.ml-json__matches')!.textContent).toBe('1 筆相符')
    render(<JsonViewer data={api} search="simba" filter />)
    expect([...host.querySelectorAll('.ml-json__key')].map((k) => k.textContent)).toEqual(['users', '1', 'name'])
  })

  it('chunks and pages', () => {
    render(<JsonViewer data={Array.from({ length: 120 }, (_, i) => i)} chunkSize={50} toolbar={false} />)
    expect(items()).toHaveLength(52)
    act(() => void host.querySelector('.ml-json__row--more')!.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(items()).toHaveLength(102)
    expect(host.querySelector('.ml-json__row--more')!.textContent).toBe('再顯示 20 項（還有 20 項）')
  })

  it('copies paths and values', async () => {
    const onCopy = vi.fn()
    render(<JsonViewer data={api} expandDepth={3} pathStyle="dot" onCopy={onCopy} />)
    const name = items().filter((r) => keyOf(r) === 'name')[1]
    await click(name.querySelector('.ml-json__key')!)
    expect(writeText).toHaveBeenLastCalledWith('users.1.name')
    expect(onCopy).toHaveBeenLastCalledWith({ kind: 'path', text: 'users.1.name', path: ['users', 1, 'name'] })
    await click(name.querySelector('.ml-json__value')!)
    expect(writeText).toHaveBeenLastCalledWith('Simba')
    expect(host.querySelector('[role=status]')!.textContent).toBe('已複製值')
  })

  it('keyboard navigation mirrors the Vue tree', async () => {
    render(<JsonViewer data={api} expandDepth={1} toolbar={false} />)
    items()[0].focus()
    await key('ArrowDown')
    expect(keyOf(document.activeElement)).toBe('total')
    await key('ArrowDown')
    expect(document.activeElement!.getAttribute('aria-expanded')).toBe('false')
    await key('ArrowRight')
    expect(document.activeElement!.getAttribute('aria-expanded')).toBe('true')
    await key('ArrowRight')
    expect(keyOf(document.activeElement)).toBe('0')
    await key('ArrowLeft')
    expect(keyOf(document.activeElement)).toBe('users')
    await key('End')
    expect(keyOf(document.activeElement)).toBe('1')
    await key('Home')
    expect(document.activeElement).toBe(items()[0])
    await key('ArrowDown')
    await key('p')
    expect(writeText).toHaveBeenLastCalledWith('$.total')
    await key('c')
    expect(writeText).toHaveBeenLastCalledWith('2')
  })

  it('parse errors show line and column', () => {
    render(<JsonViewer source={'[1,\n 2,,]'} />)
    expect(host.querySelector('[role=alert]')!.textContent).toContain('第 2 行第 4 欄')
    expect(host.querySelector('[role=tree]')).toBeNull()
  })
})
