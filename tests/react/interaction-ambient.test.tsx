import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, createRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Aurora, Clock, Particles, Radar, type ParticlesHandle } from '../../src/react/ambient'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined
function render(el: React.ReactElement) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(el))
  return host
}
const $ = (s: string) => document.querySelector(s)!
const $$ = (s: string) => [...document.querySelectorAll(s)]
const live = (s: string) => ($(s) as HTMLElement).style.getPropertyValue('--_rd-live') || ($(s) as HTMLElement).style.getPropertyValue('--_ck-live')

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  vi.useRealTimers()
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

const reduceMotion = () =>
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (q: string) => ({ matches: q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList,
  )

describe('Aurora', () => {
  it('content on top; pauses with the prop and while the tab is hidden', () => {
    render(
      <Aurora palette="bean" className="hero">
        <h1>Hi</h1>
      </Aurora>,
    )
    expect($('.ml-aurora').className).toBe('ml-aurora ml-aurora--bean hero ml-aurora--grain')
    expect($('.ml-aurora__content h1').textContent).toBe('Hi')
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect($('.ml-aurora').classList.contains('ml-aurora--paused')).toBe(true)
    // @ts-expect-error restore the prototype getter
    delete document.visibilityState
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect($('.ml-aurora').classList.contains('ml-aurora--paused')).toBe(false)
  })
})

describe('Particles', () => {
  it('draws on a canvas, loops, stops when paused, and exposes burst()', () => {
    const calls: string[] = []
    const ctx = new Proxy({} as Record<string, unknown>, {
      get: (t, k: string) => (k in t ? t[k] : (...a: unknown[]) => calls.push(`${k}(${a.length})`)),
      set: (t, k: string, v) => ((t[k] = v), true),
    })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D)
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
    const ref = createRef<ParticlesHandle>()
    const host = render(<Particles ref={ref} tone="tech">Hi</Particles>)
    expect($('canvas').getAttribute('aria-hidden')).toBe('true')
    expect(calls.some((c) => c.startsWith('clearRect'))).toBe(true)
    const n = calls.length
    act(() => vi.advanceTimersByTime(100))
    expect(calls.length).toBeGreaterThan(n)
    act(() => ref.current!.burst(10, 10))
    act(() => root!.render(<Particles ref={ref} tone="tech" paused>Hi</Particles>))
    const paused = calls.length
    act(() => vi.advanceTimersByTime(300))
    expect(calls.length).toBe(paused)
    act(() => root!.unmount())
    root = undefined
    expect(vi.getTimerCount()).toBe(0)
    expect(host.innerHTML).toBe('')
  })
})

describe('Radar', () => {
  const blips = [
    { angle: 45, distance: 0.5, label: 'Alpha' },
    { angle: 200, distance: 0.8, label: 'Bravo', tone: 'danger' as const },
  ]

  it('click selects (onSelect + lock-on), Escape releases', () => {
    const onSelect = vi.fn()
    render(<Radar blips={blips} onSelect={onSelect} />)
    const [a, b] = $$('.ml-radar-scope__blip') as HTMLButtonElement[]
    expect(a.getAttribute('aria-label')).toBe('Alpha：方位 045°，距離 50%')
    act(() => b.click())
    expect(onSelect).toHaveBeenCalledWith(blips[1], 1)
    expect(b.classList.contains('ml-radar-scope__blip--active')).toBe(true)
    expect(b.getAttribute('aria-pressed')).toBe('true')
    act(() => b.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
    expect(b.classList.contains('ml-radar-scope__blip--active')).toBe(false)
  })

  it('the sweep turns and blips flare; paused freezes; unmount stops', () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
    render(<Radar blips={blips} />)
    act(() => vi.advanceTimersByTime(300))
    const a1 = live('.ml-radar-scope__sweep')
    expect(a1).toMatch(/deg$/)
    expect(live('.ml-radar-scope__blip')).not.toBe('')
    act(() => vi.advanceTimersByTime(300))
    expect(live('.ml-radar-scope__sweep')).not.toBe(a1)
    act(() => root!.render(<Radar blips={blips} paused />))
    const frozen = live('.ml-radar-scope__sweep')
    act(() => vi.advanceTimersByTime(300))
    expect(live('.ml-radar-scope__sweep')).toBe(frozen)
    act(() => root!.unmount())
    root = undefined
    expect(vi.getTimerCount()).toBe(0)
  })

  it('reduced motion keeps the still frame', () => {
    reduceMotion()
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })
    render(<Radar blips={blips} />)
    act(() => vi.advanceTimersByTime(300))
    expect(live('.ml-radar-scope__sweep')).toBe('')
  })
})

describe('Clock', () => {
  it('frozen: label, readout, offset', () => {
    render(<Clock time={Date.UTC(2026, 6, 1, 3, 4, 5)} timeZone="America/New_York" label="紐約" digital offset />)
    expect($('.ml-clock__face').getAttribute('aria-label')).toBe('紐約 下午 11:04')
    expect($('time').textContent).toBe('23:04:05')
    expect($('.ml-clock__offset').textContent).toBe('UTC−4')
  })

  it('live from `now`: hands move, readout follows, unmount clears timers', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'] })
    let t = Date.UTC(2026, 0, 1, 0, 0, 5, 950)
    render(<Clock now={() => t} timeZone="Asia/Taipei" label="台北" digital offset />)
    expect($('time').textContent).toBe('08:00:05')
    expect($('.ml-clock__offset').textContent).toBe('UTC+8')
    expect($('.ml-clock__face').getAttribute('aria-label')).toBe('台北 上午 8:00')
    expect(live('.ml-clock__hand--second')).toBe('30deg')
    t += 1000
    act(() => vi.advanceTimersByTime(1000))
    expect($('time').textContent).toBe('08:00:06')
    act(() => root!.unmount())
    root = undefined
    expect(vi.getTimerCount()).toBe(0)
  })

  it('sweep glides on animation frames', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame'] })
    let t = Date.UTC(2026, 0, 1, 0, 0, 10, 0)
    render(<Clock now={() => t} timeZone="UTC" motion="sweep" />)
    expect(live('.ml-clock__hand--second')).toBe('60deg')
    t += 250
    act(() => vi.advanceTimersByTime(20))
    expect(live('.ml-clock__hand--second')).toBe('61.5deg')
  })
})
