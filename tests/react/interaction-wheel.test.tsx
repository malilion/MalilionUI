import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, createRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { LuckyWheel, type LuckyWheelHandle } from '../../src/react/wheel'
import { indexAtPointer, FADE_MS, type MlWheelPrize } from '../../src/components/wheel'
import { ConfigProvider } from '../../src/react/locale'
import { en } from '../../src/locale-data'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined
function render(el: React.ReactElement) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(el))
  return host
}
const advance = (ms: number) => act(() => void vi.advanceTimersByTime(ms))
const click = (el: Element) => act(() => void el.dispatchEvent(new MouseEvent('click', { bubbles: true })))
const reducedMotion = (on: boolean) =>
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: on && q.includes('reduce'), addEventListener() {}, removeEventListener() {} }))
const faceRotation = (host: Element) => Number(/rotate\(([-\d.]+)/.exec(host.querySelector('.ml-lucky-wheel__face')!.getAttribute('transform')!)![1])

const six: MlWheelPrize[] = ['A', 'B', 'C', 'D', 'E', 'F'].map((label) => ({ label }))

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })
  reducedMotion(false)
})
afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('React LuckyWheel', () => {
  it('spins from the hub, lands by weight, highlights the winner and announces it', () => {
    const prizes = six.map((p, i) => ({ ...p, weight: i === 2 ? 1 : 0 }))
    const onStart = vi.fn()
    const onResult = vi.fn()
    const host = render(<LuckyWheel prizes={prizes} duration={3000} onStart={onStart} onResult={onResult} />)
    const wheel = host.querySelector('.ml-lucky-wheel')!
    const hub = host.querySelector('button')!
    click(hub)
    expect(onStart).toHaveBeenCalledTimes(1)
    expect(wheel.classList).toContain('ml-lucky-wheel--spinning')
    expect(hub.getAttribute('aria-disabled')).toBe('true')
    expect(host.querySelector('[aria-live]')!.textContent).toBe('轉盤轉動中…')
    advance(400)
    expect(faceRotation(host)).toBeGreaterThan(360)
    click(hub)
    expect(onStart).toHaveBeenCalledTimes(1)
    advance(3000)
    expect(onResult).toHaveBeenCalledWith(prizes[2], 2)
    expect(wheel.classList).toContain('ml-lucky-wheel--landed')
    expect(host.querySelectorAll('.ml-lucky-wheel__slice')[2].classList).toContain('ml-lucky-wheel__slice--win')
    expect(host.querySelector('[aria-live]')!.textContent).toBe('恭喜！抽中：C')
    expect(indexAtPointer(faceRotation(host), 6)).toBe(2)
    expect(hub.hasAttribute('aria-disabled')).toBe(false)
    expect(document.querySelectorAll('.ml-paw-burst').length).toBeGreaterThan(0)
  })

  it('spin(i) via the handle, and a server-decided before-spin promise', async () => {
    const ref = createRef<LuckyWheelHandle>()
    let answer!: (i: number) => void
    const beforeSpin = vi.fn(() => new Promise<number>((r) => (answer = r)))
    const onResult = vi.fn()
    const host = render(<LuckyWheel ref={ref} prizes={six} duration={1500} beforeSpin={beforeSpin} onResult={onResult} confetti={false} />)
    let done!: Promise<number>
    act(() => void (done = ref.current!.spin(5)))
    expect(beforeSpin).not.toHaveBeenCalled()
    advance(1600)
    expect(await done).toBe(5)

    act(() => void (done = ref.current!.spin()))
    expect(beforeSpin).toHaveBeenCalledTimes(1)
    advance(2000)
    expect(onResult).toHaveBeenCalledTimes(1)
    await act(async () => answer(1))
    advance(5000)
    expect(await done).toBe(1)
    expect(onResult).toHaveBeenLastCalledWith(six[1], 1)
    expect(indexAtPointer(faceRotation(host), 6)).toBe(1)
    expect(document.querySelectorAll('.ml-paw-burst')).toHaveLength(0)
  })

  it('reports a failed draw and stops without a result', async () => {
    const ref = createRef<LuckyWheelHandle>()
    const onError = vi.fn()
    const onResult = vi.fn()
    const host = render(<LuckyWheel ref={ref} prizes={six} duration={1000} beforeSpin={() => Promise.reject(new Error('nope'))} onError={onError} onResult={onResult} />)
    let done!: Promise<number>
    act(() => void (done = ref.current!.spin()))
    await act(async () => {})
    advance(4000)
    expect(await done).toBe(-1)
    expect(onError.mock.calls[0][0].message).toBe('nope')
    expect(onResult).not.toHaveBeenCalled()
    expect(host.querySelector('.ml-lucky-wheel--spinning')).toBeNull()
  })

  it('reduced motion fades instead of spinning; locale and disabled', async () => {
    reducedMotion(true)
    const ref = createRef<LuckyWheelHandle>()
    const host = render(
      <ConfigProvider locale={en}>
        <LuckyWheel ref={ref} prizes={six} />
      </ConfigProvider>,
    )
    expect(host.querySelector('button')!.getAttribute('aria-label')).toBe('Spin the wheel')
    let done!: Promise<number>
    act(() => void (done = ref.current!.spin(3)))
    expect(host.querySelector('.ml-lucky-wheel--fade')).not.toBeNull()
    advance(FADE_MS + 10)
    expect(await done).toBe(3)
    expect(host.querySelector('[aria-live]')!.textContent).toBe('You won: D')
    act(() => root!.render(<LuckyWheel ref={ref} prizes={six} disabled />))
    expect(host.querySelector('button')!.disabled).toBe(true)
    let none!: Promise<number>
    act(() => void (none = ref.current!.spin()))
    expect(await none).toBe(-1)
  })
})
