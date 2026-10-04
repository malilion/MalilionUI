import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, createRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { SliderCaptcha } from '../../src/react/captcha'
import { ScratchCard, type ScratchCardHandle } from '../../src/react/scratch'
import { Gacha, GridLottery, type GachaHandle, type GridLotteryHandle } from '../../src/react/lottery'
import { CAPTCHA_START } from '../../src/components/captcha'
import type { MlLotteryPrize } from '../../src/components/lottery'

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
const key = (el: Element, k: string, shiftKey = false) => act(() => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, shiftKey, bubbles: true })))

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  vi.useRealTimers()
  document.body.innerHTML = ''
})

const prizes: MlLotteryPrize[] = [
  { label: '獅王', icon: 'crown' },
  { label: '珍奶', icon: 'bubbleTea' },
  { label: '咖啡', icon: 'coffee' },
  { label: '甜甜圈', icon: 'donut' },
  { label: '禮物', icon: 'gift' },
  { label: '貼圖', icon: 'cat' },
  { label: '紅利', icon: 'star' },
  { label: '雲', icon: 'cloud' },
]

describe('SliderCaptcha', () => {
  it('keyboard to the gap, Enter passes', async () => {
    const onSuccess = vi.fn()
    render(<SliderCaptcha seed={3} target={{ x: 60, y: 30 }} onSuccess={onSuccess} />)
    const slider = $('[role="slider"]')
    for (let i = 0; i < 5; i++) key(slider, 'ArrowRight', true)
    for (let x = CAPTCHA_START + 50; x < 60; x++) key(slider, 'ArrowRight')
    expect(slider.getAttribute('aria-valuenow')).toBe('60')
    await act(async () => key(slider, 'Enter'))
    expect(onSuccess).toHaveBeenCalledWith(expect.objectContaining({ x: 60, target: { x: 60, y: 30 } }))
    expect($('.ml-captcha').classList.contains('ml-captcha--success')).toBe(true)
  })

  it('a miss fails, then resets; too many deal a new gap', async () => {
    vi.useFakeTimers()
    const onFail = vi.fn()
    const onRefresh = vi.fn()
    render(<SliderCaptcha seed={3} maxAttempts={1} onFail={onFail} onRefresh={onRefresh} />)
    const gap = $('.ml-captcha__gap').getAttribute('d')
    await act(async () => key($('[role="slider"]'), 'Enter'))
    expect(onFail).toHaveBeenCalledTimes(1)
    expect($('.ml-captcha').classList.contains('ml-captcha--fail')).toBe(true)
    act(() => vi.advanceTimersByTime(700))
    expect(onRefresh).toHaveBeenCalledTimes(1)
    expect($('.ml-captcha__gap').getAttribute('d')).not.toBe(gap)
    expect($('.ml-captcha').classList.contains('ml-captcha--idle')).toBe(true)
  })
})

describe('ScratchCard', () => {
  it('reveal button, onReveal, and reset through the handle', () => {
    const ref = createRef<ScratchCardHandle>()
    const onReveal = vi.fn()
    const onRevealedChange = vi.fn()
    render(<ScratchCard ref={ref} confetti={false} onReveal={onReveal} onRevealedChange={onRevealedChange}>大獎</ScratchCard>)
    expect($('.ml-scratch__prize').getAttribute('aria-hidden')).toBe('true')
    act(() => ($('.ml-scratch__reveal') as HTMLButtonElement).click())
    expect(onReveal).toHaveBeenCalledTimes(1)
    expect(onRevealedChange).toHaveBeenLastCalledWith(true)
    expect($('.ml-scratch__prize').hasAttribute('aria-hidden')).toBe(false)
    act(() => ref.current!.reset())
    expect(onRevealedChange).toHaveBeenLastCalledWith(false)
    expect(document.querySelector('.ml-scratch__reveal')).not.toBeNull()
  })
})

describe('GridLottery', () => {
  it('draw(i) lands there and reports it', async () => {
    vi.useFakeTimers()
    const ref = createRef<GridLotteryHandle>()
    const onResult = vi.fn()
    const onStart = vi.fn()
    render(<GridLottery ref={ref} prizes={prizes} confetti={false} onStart={onStart} onResult={onResult} />)
    let result!: Promise<number>
    act(() => {
      result = ref.current!.draw(6)
    })
    expect(onStart).toHaveBeenCalledTimes(1)
    expect($('.ml-grid-lottery').classList.contains('ml-grid-lottery--running')).toBe(true)
    act(() => vi.advanceTimersByTime(5000))
    await expect(result).resolves.toBe(6)
    expect(onResult).toHaveBeenCalledWith(prizes[6], 6)
    expect($('.ml-grid-lottery__cell--won').getAttribute('aria-label')).toBe('紅利')
  })

  it('a server answer after cruising', async () => {
    vi.useFakeTimers()
    const onResult = vi.fn()
    let answer!: (i: number) => void
    render(<GridLottery prizes={prizes} confetti={false} onResult={onResult} beforeDraw={() => new Promise<number>((r) => (answer = r))} />)
    act(() => ($('.ml-grid-lottery__go') as HTMLButtonElement).click())
    act(() => vi.advanceTimersByTime(1500))
    expect(onResult).not.toHaveBeenCalled()
    await act(async () => answer(3))
    act(() => vi.advanceTimersByTime(4000))
    expect(onResult).toHaveBeenCalledWith(prizes[3], 3)
  })
})

describe('Gacha', () => {
  it('turn, drop, open, again', async () => {
    vi.useFakeTimers()
    const ref = createRef<GachaHandle>()
    const onResult = vi.fn()
    const onClose = vi.fn()
    render(<Gacha ref={ref} prizes={prizes} confetti={false} onResult={onResult} onClose={onClose} />)
    act(() => {
      void ref.current!.draw(2)
    })
    expect($('.ml-gacha').classList.contains('ml-gacha--turning')).toBe(true)
    act(() => vi.advanceTimersByTime(1100))
    expect($('.ml-gacha').classList.contains('ml-gacha--dropping')).toBe(true)
    act(() => vi.advanceTimersByTime(1400))
    expect($('.ml-gacha__prize-label').textContent).toBe('咖啡')
    expect(onResult).toHaveBeenCalledWith(prizes[2], 2)
    expect(document.activeElement).toBe($('.ml-gacha__again'))
    act(() => ($('.ml-gacha__again') as HTMLButtonElement).click())
    expect(onClose).toHaveBeenCalledTimes(1)
    expect($('.ml-gacha').classList.contains('ml-gacha--idle')).toBe(true)
  })
})
