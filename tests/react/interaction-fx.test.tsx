import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, createRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { BorderBeam, CountUp, DecryptText, Loading, Marquee, PawBurst, Reveal, Spotlight, Tilt, usePawStamp, type CountUpHandle, type DecryptTextHandle, type PawBurstHandle } from '../../src/react/fx'
import { Chat, ChatInput, type ChatHandle } from '../../src/react/chat'
import { LineChart } from '../../src/react/charts'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined
function render(el: React.ReactElement) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(el))
  return host
}
const fire = (el: Element, type: string, init: MouseEventInit = {}) => act(() => void el.dispatchEvent(new MouseEvent(type, { bubbles: true, ...init })))
const key = (el: Element, k: string, init: KeyboardEventInit = {}) =>
  act(() => void el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init })))
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms))
function type(area: HTMLTextAreaElement, value: string) {
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(area, value)
    area.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
const rect = (el: Element, r: Partial<DOMRect>) =>
  ((el as HTMLElement).getBoundingClientRect = () => ({ left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON() {}, ...r }) as DOMRect)

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('React effects', () => {
  it('CountUp counts to the value, then re-counts on change and on restart()', () => {
    vi.useFakeTimers()
    const onDone = vi.fn()
    const ref = createRef<CountUpHandle>()
    const host = render(<CountUp ref={ref} value={1000} duration={500} startOnView={false} onDone={onDone} />)
    const shown = host.querySelector('[aria-hidden="true"]')!
    expect(host.querySelector('.ml-visually-hidden')!.textContent).toBe('1,000')
    advance(100)
    expect(host.querySelector('.ml-countup--running')).not.toBeNull()
    advance(600)
    expect(shown.textContent).toBe('1,000')
    expect(onDone).toHaveBeenCalledTimes(1)
    act(() => root!.render(<CountUp ref={ref} value={2000} duration={500} startOnView={false} onDone={onDone} />))
    advance(700)
    expect(shown.textContent).toBe('2,000')
    act(() => ref.current!.restart())
    advance(16)
    expect(Number(shown.textContent!.replace(/,/g, ''))).toBeLessThan(2000)
    advance(700)
    expect(onDone).toHaveBeenCalledTimes(3)
  })

  it('CountUp waits for the viewport when startOnView', () => {
    vi.useFakeTimers()
    let enter: (() => void) | undefined
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: IntersectionObserverCallback) {
          enter = () => cb([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver)
        }
        observe() {}
        disconnect() {}
      },
    )
    const host = render(<CountUp value={50} duration={100} />)
    advance(300)
    expect(host.querySelector('[aria-hidden="true"]')!.textContent).toBe('0')
    act(() => enter!())
    advance(300)
    expect(host.querySelector('[aria-hidden="true"]')!.textContent).toBe('50')
  })

  it('DecryptText scrambles then locks in, and replays via play()', () => {
    vi.useFakeTimers()
    const onDone = vi.fn()
    const ref = createRef<DecryptTextHandle>()
    const host = render(<DecryptText ref={ref} text="LION" trigger="mount" duration={300} onDone={onDone} />)
    advance(50)
    expect(host.querySelector('.ml-decrypt--running')).not.toBeNull()
    expect(host.querySelectorAll('.ml-decrypt__char--scrambled').length).toBeGreaterThan(0)
    advance(400)
    expect(host.textContent).toBe('LION')
    expect(host.querySelector('.ml-decrypt__char--scrambled')).toBeNull()
    expect(onDone).toHaveBeenCalledTimes(1)
    act(() => ref.current!.play())
    advance(400)
    expect(onDone).toHaveBeenCalledTimes(2)
  })

  it('DecryptText trigger="hover" plays on mouseenter and on text change', () => {
    vi.useFakeTimers()
    const onDone = vi.fn()
    const host = render(<DecryptText text="AB" trigger="hover" duration={100} onDone={onDone} />)
    advance(200)
    expect(onDone).not.toHaveBeenCalled()
    fire(host.querySelector('.ml-decrypt')!, 'mouseover')
    advance(200)
    expect(onDone).toHaveBeenCalledTimes(1)
    act(() => root!.render(<DecryptText text="CD" trigger="hover" duration={100} onDone={onDone} />))
    advance(200)
    expect(host.textContent).toBe('CD')
    expect(onDone).toHaveBeenCalledTimes(2)
  })

  it('Reveal hides until in view, then shows and reports it', () => {
    let cb: IntersectionObserverCallback | undefined
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(c: IntersectionObserverCallback) {
          cb = c
        }
        observe() {}
        disconnect() {}
      },
    )
    const onReveal = vi.fn()
    const host = render(
      <Reveal stagger={50} once={false} onReveal={onReveal}>
        <p>a</p>
        <p>b</p>
      </Reveal>,
    )
    const el = host.querySelector('.ml-reveal') as HTMLElement
    expect(el.classList.contains('ml-reveal--hidden')).toBe(true)
    expect((el.children[1] as HTMLElement).style.getPropertyValue('--_i')).toBe('1')
    act(() => cb!([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver))
    expect(el.classList.contains('ml-reveal--shown')).toBe(true)
    expect(onReveal).toHaveBeenCalledTimes(1)
    act(() => cb!([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver))
    expect(el.classList.contains('ml-reveal--hidden')).toBe(true)
  })

  it('Reveal stays visible under prefers-reduced-motion', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce') }))
    const host = render(<Reveal>x</Reveal>)
    expect(host.querySelector('.ml-reveal')!.className).toBe('ml-reveal ml-reveal--fade-up')
  })

  it('Spotlight follows the pointer and switches off on leave', () => {
    const host = render(<Spotlight>Lit</Spotlight>)
    const el = host.querySelector('.ml-spotlight') as HTMLElement
    rect(el, { left: 10, top: 20, width: 200, height: 100 })
    fire(el, 'pointermove', { clientX: 60, clientY: 70 })
    expect(el.classList.contains('ml-spotlight--on')).toBe(true)
    expect(el.style.getPropertyValue('--_x')).toBe('50px')
    expect(el.style.getPropertyValue('--_y')).toBe('50px')
    fire(el, 'pointerout', { relatedTarget: document.body })
    expect(el.classList.contains('ml-spotlight--on')).toBe(false)
  })

  it('Tilt tilts toward the pointer and passes the active state to a render prop', () => {
    const host = render(<Tilt max={10}>{({ active }) => (active ? 'on' : 'off')}</Tilt>)
    const el = host.querySelector('.ml-tilt') as HTMLElement
    rect(el, { width: 100, height: 100 })
    expect(el.textContent).toBe('off')
    fire(el, 'pointermove', { clientX: 100, clientY: 0 })
    expect(el.textContent).toBe('on')
    expect(el.style.getPropertyValue('--_rx')).toBe('10.00deg')
    expect(el.style.getPropertyValue('--_ry')).toBe('10.00deg')
    expect(el.style.getPropertyValue('--_scale')).toBe('1.02')
    fire(el, 'pointerout', { relatedTarget: document.body })
    expect(el.classList.contains('ml-tilt--active')).toBe(false)
    expect(el.style.getPropertyValue('--_rx')).toBe('0.00deg')
  })

  it('Marquee renders an inert, hidden copy for the seamless loop', () => {
    const host = render(<Marquee>Logo</Marquee>)
    const groups = host.querySelectorAll('.ml-marquee__group')
    expect(groups).toHaveLength(2)
    expect(groups[1].getAttribute('aria-hidden')).toBe('true')
    expect(groups[1].hasAttribute('inert')).toBe(true)
  })

  it('BorderBeam passes duration and size as CSS vars', () => {
    const host = render(<BorderBeam duration={2} size={3} id="b">x</BorderBeam>)
    const el = host.querySelector('#b') as HTMLElement
    expect(el.style.getPropertyValue('--_dur')).toBe('2s')
    expect(el.style.getPropertyValue('--_size')).toBe('3px')
  })

  it('PawBurst flings paws on click and through fire()', () => {
    vi.useFakeTimers()
    const onBurst = vi.fn()
    const ref = createRef<PawBurstHandle>()
    const host = render(
      <PawBurst ref={ref} count={5} onBurst={onBurst}>
        <button>Go</button>
      </PawBurst>,
    )
    fire(host.querySelector('button')!, 'click')
    expect(document.querySelectorAll('.ml-paw-burst')).toHaveLength(5)
    expect(onBurst).toHaveBeenCalledTimes(1)
    act(() => ref.current!.fire(10, 10))
    expect(document.querySelectorAll('.ml-paw-burst')).toHaveLength(10)
    advance(2000)
    expect(document.querySelectorAll('.ml-paw-burst')).toHaveLength(0)
    act(() => root!.render(<PawBurst disabled onBurst={onBurst}><button>Go</button></PawBurst>))
    fire(host.querySelector('button')!, 'click')
    expect(onBurst).toHaveBeenCalledTimes(2)
  })

  it('usePawStamp stamps a paw on pointerdown unless off or disabled', () => {
    function Demo({ tone, disabled }: { tone: boolean | 'bean'; disabled?: boolean }) {
      const stamp = usePawStamp(tone)
      return <button ref={stamp} disabled={disabled}>Tap</button>
    }
    const host = render(<Demo tone="bean" />)
    const btn = host.querySelector('button')!
    fire(btn, 'pointerdown', { clientX: 5, clientY: 6 })
    const stamp = document.querySelector('.ml-paw-stamp') as HTMLElement
    expect(stamp.classList.contains('ml-paw-stamp--bean')).toBe(true)
    expect(stamp.style.left).toBe('5px')
    stamp.remove()
    act(() => root!.render(<Demo tone={false} />))
    fire(btn, 'pointerdown')
    act(() => root!.render(<Demo tone disabled />))
    fire(btn, 'pointerdown')
    expect(document.querySelector('.ml-paw-stamp')).toBeNull()
  })

  it('Loading fades its mask in and out and marks the region busy', () => {
    vi.useFakeTimers()
    function Demo() {
      const [busy, setBusy] = useState(false)
      return (
        <>
          <button onClick={() => setBusy(!busy)}>t</button>
          <Loading loading={busy} text="Hold on" id="area">
            Body
          </Loading>
        </>
      )
    }
    const host = render(<Demo />)
    const area = host.querySelector('#area') as HTMLElement
    expect(area.style.position).toBe('relative')
    expect(host.querySelector('.ml-loading')).toBeNull()
    fire(host.querySelector('button')!, 'click')
    expect(area.getAttribute('aria-busy')).toBe('true')
    advance(20)
    expect(host.querySelector('.ml-loading--in')).not.toBeNull()
    expect(host.querySelector('.ml-loader__label')!.textContent).toBe('Hold on')
    fire(host.querySelector('button')!, 'click')
    expect(area.hasAttribute('aria-busy')).toBe(false)
    expect(host.querySelector('.ml-loading--in')).toBeNull()
    expect(host.querySelector('.ml-loading')).not.toBeNull()
    advance(400)
    expect(host.querySelector('.ml-loading')).toBeNull()
  })

  it('Loading fullscreen portals the mask to the body', () => {
    render(<Loading loading fullscreen>x</Loading>)
    const mask = document.body.querySelector(':scope > .ml-loading.ml-loading--fullscreen')
    expect(mask).not.toBeNull()
  })
})

describe('React chat', () => {
  it('ChatInput sends on Enter, keeps Shift+Enter and IME composition, and clears', () => {
    const onSend = vi.fn()
    const onChange = vi.fn()
    const host = render(<ChatInput onSend={onSend} onChange={onChange} />)
    const area = host.querySelector('textarea')!
    const btn = host.querySelector('.ml-chat-input__btn') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    type(area, '  hi  ')
    expect(onChange).toHaveBeenLastCalledWith('  hi  ')
    expect(btn.disabled).toBe(false)
    key(area, 'Enter', { shiftKey: true })
    key(area, 'Enter', { isComposing: true })
    expect(onSend).not.toHaveBeenCalled()
    key(area, 'Enter')
    expect(onSend).toHaveBeenCalledWith('hi')
    expect(area.value).toBe('')
    type(area, 'again')
    act(() => btn.click())
    expect(onSend).toHaveBeenLastCalledWith('again')
  })

  it('ChatInput blocks sending while loading and offers stop', () => {
    const onSend = vi.fn()
    const onStop = vi.fn()
    const host = render(<ChatInput loading defaultValue="x" onSend={onSend} onStop={onStop} />)
    key(host.querySelector('textarea')!, 'Enter')
    expect(onSend).not.toHaveBeenCalled()
    act(() => (host.querySelector('.ml-chat-input__btn--stop') as HTMLElement).click())
    expect(onStop).toHaveBeenCalled()
  })

  it('ChatInput works controlled', () => {
    function Demo() {
      const [v, setV] = useState('ok')
      return (
        <>
          <ChatInput value={v} onChange={setV} />
          <output>{v}</output>
        </>
      )
    }
    const host = render(<Demo />)
    key(host.querySelector('textarea')!, 'Enter')
    expect(host.querySelector('output')!.textContent).toBe('')
  })

  it('Chat follows new messages only while pinned to the bottom', () => {
    const ref = createRef<ChatHandle>()
    const host = render(<Chat ref={ref} watchKey={1}>m</Chat>)
    const log = host.querySelector('.ml-chat__log') as HTMLElement
    Object.defineProperty(log, 'scrollHeight', { configurable: true, value: 1000 })
    Object.defineProperty(log, 'clientHeight', { configurable: true, value: 200 })
    act(() => root!.render(<Chat ref={ref} watchKey={2}>m</Chat>))
    expect(log.scrollTop).toBe(1000)
    log.scrollTop = 100
    act(() => void log.dispatchEvent(new Event('scroll')))
    const jump = host.querySelector('.ml-chat__jump') as HTMLElement
    expect(jump).not.toBeNull()
    act(() => root!.render(<Chat ref={ref} watchKey={3}>m</Chat>))
    expect(log.scrollTop).toBe(100)
    act(() => jump.click())
    expect(log.scrollTop).toBe(1000)
    log.scrollTop = 0
    act(() => ref.current!.scrollToBottom())
    expect(log.scrollTop).toBe(1000)
  })
})

describe('React LineChart', () => {
  it('inspects points with the keyboard and pointer', () => {
    const host = render(<LineChart series={[{ name: 'A', data: [1, 5, 3] }, { name: 'B', data: [2, 2] }]} labels={['Mon', 'Tue', 'Wed']} />)
    const plot = host.querySelector('.ml-line__plot') as HTMLElement
    expect(plot.getAttribute('aria-label')).toBe('A：1、5、3；B：2、2')
    expect(host.querySelectorAll('.ml-line__key')).toHaveLength(2)
    expect(host.querySelector('.ml-line__tip')).toBeNull()
    key(plot, 'ArrowRight')
    expect(host.querySelector('.ml-line__tip-title')!.textContent).toBe('Mon')
    key(plot, 'End')
    expect(host.querySelector('.ml-line__tip-title')!.textContent).toBe('Wed')
    expect([...host.querySelectorAll('.ml-line__tip-row b')].map((b) => b.textContent)).toEqual(['3', '—'])
    expect(host.querySelector('.ml-line__tip--left')).not.toBeNull()
    expect(host.querySelectorAll('.ml-line__focus')).toHaveLength(1)
    key(plot, 'Escape')
    expect(host.querySelector('.ml-line__tip')).toBeNull()
    rect(plot, { width: 200 })
    fire(plot, 'pointermove', { clientX: 100 })
    expect(host.querySelector('.ml-line__tip-title')!.textContent).toBe('Tue')
    expect(host.querySelector('.ml-line__x--on')!.textContent).toBe('Tue')
    fire(plot, 'pointerout', { relatedTarget: document.body })
    expect(host.querySelector('.ml-line__tip')).toBeNull()
  })

  it('formats the axis and hides the legend for one series', () => {
    const host = render(<LineChart series={[{ name: 'A', data: [0, 100] }]} format={(v) => `$${v}`} />)
    expect(host.querySelector('.ml-line__legend')).toBeNull()
    expect(host.querySelector('.ml-line__axis span')!.textContent).toBe('$100')
    expect(host.querySelector('.ml-line__zero')).not.toBeNull()
  })
})
