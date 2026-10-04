import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, createRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { AudioPlayer, VideoPlayer, type VideoPlayerHandle } from '../../src/react'

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

function fakeMedia(el: HTMLMediaElement, duration = 120) {
  let paused = true
  let time = 0
  let muted = false
  let rate = 1
  const fire = (type: string) => act(() => void el.dispatchEvent(new Event(type)))
  Object.defineProperties(el, {
    paused: { get: () => paused, configurable: true },
    ended: { get: () => false, configurable: true },
    duration: { get: () => duration, configurable: true },
    currentTime: { get: () => time, set: (t: number) => ((time = t), fire('timeupdate')), configurable: true },
    muted: { get: () => muted, set: (m: boolean) => ((muted = m), fire('volumechange')), configurable: true },
    playbackRate: { get: () => rate, set: (r: number) => ((rate = r), fire('ratechange')), configurable: true },
  })
  el.play = vi.fn(async () => {
    paused = false
    fire('play')
  })
  el.pause = vi.fn(() => {
    paused = true
    fire('pause')
  })
  fire('durationchange')
}

describe('React players', () => {
  it('VideoPlayer plays, seeks by keyboard and reports events', () => {
    const onPlay = vi.fn()
    const onTimeUpdate = vi.fn()
    const ref = createRef<VideoPlayerHandle>()
    const host = render(<VideoPlayer ref={ref} src="/a.mp4" onPlay={onPlay} onTimeUpdate={onTimeUpdate} />)
    const player = host.querySelector<HTMLElement>('.ml-player')!
    fakeMedia(host.querySelector('video')!)
    act(() => host.querySelector<HTMLElement>('.ml-player__big')!.click())
    expect(onPlay).toHaveBeenCalled()
    expect(player.classList.contains('ml-player--playing')).toBe(true)
    act(() => void player.dispatchEvent(new KeyboardEvent('keydown', { key: 'l', bubbles: true })))
    expect(host.querySelector('.ml-player__time')!.textContent).toBe('0:10 / 2:00')
    expect(onTimeUpdate).toHaveBeenLastCalledWith(10)
    act(() => ref.current!.seek(90))
    expect(host.querySelector('.ml-player__time')!.textContent).toBe('1:30 / 2:00')
  })

  it('VideoPlayer speed and captions menus', () => {
    const tracks = [{ src: '/zh.vtt', label: '中文', default: true }, { src: '/en.vtt', label: 'English' }]
    const host = render(<VideoPlayer src="/a.mp4" tracks={tracks} playbackRates={[1, 2]} />)
    const video = host.querySelector('video')!
    fakeMedia(video)
    act(() => host.querySelector<HTMLElement>('.ml-player__rate')!.click())
    act(() => host.querySelectorAll<HTMLElement>('[role="menuitemradio"]')[1].click())
    expect(video.playbackRate).toBe(2)
    expect(host.querySelector('[role="menu"]')).toBeNull()
    const cc = () => host.querySelector('[aria-label="字幕"]')!
    expect(cc().classList.contains('ml-player__btn--on')).toBe(true)
    act(() => void host.querySelector('.ml-player')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true })))
    expect(cc().classList.contains('ml-player__btn--on')).toBe(false)
  })

  it('AudioPlayer skips, cycles speed and mutes', () => {
    const host = render(<AudioPlayer src="/a.m4a" title="獅吼" playbackRates={[1, 2]} />)
    const audio = host.querySelector('audio')!
    fakeMedia(audio, 300)
    act(() => host.querySelector<HTMLElement>('[aria-label="快轉 10 秒"]')!.click())
    expect(audio.currentTime).toBe(10)
    act(() => host.querySelector<HTMLElement>('.ml-player__rate')!.click())
    expect(audio.playbackRate).toBe(2)
    act(() => host.querySelector<HTMLElement>('[aria-label="靜音"]')!.click())
    expect(audio.muted).toBe(true)
    expect(host.querySelector('[aria-label="取消靜音"]')).not.toBeNull()
  })
})
