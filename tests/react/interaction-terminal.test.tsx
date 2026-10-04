import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, createRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { Terminal, type TerminalHandle } from '../../src/react/terminal'
import type { MlTerminalLine } from '../../src'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const lines: MlTerminalLine[] = [
  { type: 'input', text: 'npm i {b}@malilion/ui{/}' },
  { type: 'progress', text: 'fetch', duration: 400 },
  { type: 'spinner', text: 'ready', duration: 300 },
  { type: 'output', text: '<img src=x onerror=alert(1)>' },
]

let root: Root | undefined
function render(el: React.ReactElement) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(el))
  return host
}
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms))

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('React Terminal', () => {
  it('hydrates the server transcript without mismatch, then animates', () => {
    vi.useFakeTimers()
    vi.stubGlobal('IntersectionObserver', undefined)
    const html = renderToString(<Terminal lines={lines} />)
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(html).toContain('100%')
    const host = document.createElement('div')
    host.innerHTML = html
    document.body.appendChild(host)
    const errors: unknown[] = []
    const spy = vi.spyOn(console, 'error').mockImplementation((...a) => void errors.push(a))
    act(() => {
      root = hydrateRoot(host, <Terminal lines={lines} />, { onRecoverableError: (e) => errors.push(e) })
    })
    spy.mockRestore()
    expect(errors).toEqual([])
    expect(host.querySelector('img')).toBeNull()
    // Reset to the start and playing.
    expect(host.querySelector('.ml-terminal__line--idle')).toBeNull()
    expect(host.querySelector('.ml-terminal--playing')).not.toBeNull()
    advance(10000)
    expect(host.querySelector('.ml-terminal__line--idle')).not.toBeNull()
    expect(host.querySelector('.ml-terminal__line--spinner .ml-terminal__mark')!.textContent).toBe('✔')
    expect(host.querySelector('.ml-terminal__action')!.textContent).toContain('重播')
  })

  it('handle controls playback and copy, onDone fires once per run', async () => {
    vi.useFakeTimers()
    const writeText = vi.fn(() => Promise.resolve())
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const onDone = vi.fn()
    const onCopy = vi.fn()
    const ref = createRef<TerminalHandle>()
    const host = render(<Terminal ref={ref} lines={lines} autoplay={false} copyable onDone={onDone} onCopy={onCopy} maxHeight={120} />)
    expect(host.querySelector('.ml-terminal__line--idle')).not.toBeNull()
    expect((host.querySelector('.ml-terminal__body') as HTMLElement).style.maxHeight).toBe('120px')
    act(() => ref.current!.play())
    expect(host.querySelectorAll('.ml-terminal__line')).toHaveLength(1)
    advance(700)
    const typed = () => host.querySelector('.ml-terminal__line--input .ml-terminal__text')!.textContent!
    const partial = typed()
    expect(partial.length).toBeGreaterThan(0)
    expect('npm i @malilion/ui'.startsWith(partial) && partial.length < 18).toBe(true)
    act(() => ref.current!.pause())
    advance(5000)
    expect(typed()).toBe(partial)
    expect(host.querySelector('.ml-terminal--playing')).toBeNull()
    act(() => ref.current!.skip())
    expect(onDone).toHaveBeenCalledTimes(1)
    expect(host.querySelector('.ml-terminal__line--idle')).not.toBeNull()
    await act(async () => {
      ;(host.querySelector('.ml-terminal__action:last-child') as HTMLButtonElement).click()
    })
    expect(writeText).toHaveBeenCalledWith('npm i @malilion/ui')
    expect(onCopy).toHaveBeenCalledWith('npm i @malilion/ui')
    expect(host.textContent).toContain('已複製')
  })

  it('reduced motion keeps the final state', () => {
    vi.useFakeTimers()
    vi.stubGlobal('IntersectionObserver', undefined)
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce'), addEventListener() {}, removeEventListener() {} }))
    const ref = createRef<TerminalHandle>()
    const host = render(<Terminal ref={ref} lines={lines} />)
    expect(host.querySelector('.ml-terminal__line--idle')).not.toBeNull()
    act(() => ref.current!.restart())
    expect(host.querySelector('.ml-terminal__line--idle')).not.toBeNull()
    expect(host.querySelector('.ml-terminal__action')).toBeNull()
  })
})
