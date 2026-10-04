// MlVideoPlayer / MlAudioPlayer and the shared player logic.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { MlAudioPlayer, MlVideoPlayer, formatMediaTime, playerKeyAction } from '../src'
import { applyPlayerAction, bufferedEnd, formatRate, mediaProgress, showTextTrack, stepRate } from '../src/components/player'

let wrapper: VueWrapper | undefined
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
})

/** A media element whose state the test drives: happy-dom doesn't decode media. */
function fakeMedia(el: HTMLMediaElement, duration = 120) {
  let paused = true
  let ended = false
  let time = 0
  let volume = 1
  let muted = el.muted
  let rate = 1
  const fire = (type: string) => el.dispatchEvent(new Event(type))
  Object.defineProperties(el, {
    paused: { get: () => paused, configurable: true },
    ended: { get: () => ended, configurable: true },
    duration: { get: () => duration, configurable: true },
    currentTime: { get: () => time, set: (t: number) => ((time = t), fire('timeupdate')), configurable: true },
    volume: { get: () => volume, set: (v: number) => ((volume = v), fire('volumechange')), configurable: true },
    muted: { get: () => muted, set: (m: boolean) => ((muted = m), fire('volumechange')), configurable: true },
    playbackRate: { get: () => rate, set: (r: number) => ((rate = r), fire('ratechange')), configurable: true },
    buffered: { get: () => ({ length: 1, start: () => 0, end: () => 30 }), configurable: true },
  })
  el.play = vi.fn(async () => {
    paused = false
    ended = false
    fire('play')
  })
  el.pause = vi.fn(() => {
    paused = true
    fire('pause')
  })
  return {
    end: () => {
      ended = true
      paused = true
      fire('ended')
    },
    fire,
  }
}

describe('player helpers', () => {
  it('formats times', () => {
    expect(formatMediaTime(0)).toBe('0:00')
    expect(formatMediaTime(65.9)).toBe('1:05')
    expect(formatMediaTime(3723)).toBe('1:02:03')
    expect(formatMediaTime(65, 3723)).toBe('0:01:05')
    expect(formatMediaTime(Number.NaN)).toBe('--:--')
    expect(formatRate(1.25)).toBe('1.25×')
    expect(formatRate(1)).toBe('1×')
  })

  it('maps keys like YouTube', () => {
    expect(playerKeyAction(' ')).toEqual({ type: 'toggle' })
    expect(playerKeyAction('k')).toEqual({ type: 'toggle' })
    expect(playerKeyAction('ArrowLeft')).toEqual({ type: 'seekBy', seconds: -5 })
    expect(playerKeyAction('l')).toEqual({ type: 'seekBy', seconds: 10 })
    expect(playerKeyAction('7')).toEqual({ type: 'seekTo', fraction: 0.7 })
    expect(playerKeyAction('>', true)).toEqual({ type: 'rateBy', steps: 1 })
    expect(playerKeyAction('.', false)).toBeNull()
    expect(playerKeyAction('x')).toBeNull()
  })

  it('rates, progress and buffered ranges', () => {
    expect(stepRate([0.5, 1, 2], 1, 1)).toBe(2)
    expect(stepRate([0.5, 1, 2], 2, 1)).toBe(2)
    expect(stepRate([0.5, 1, 2], 1, -1)).toBe(0.5)
    expect(mediaProgress(30, 120)).toBe(0.25)
    expect(mediaProgress(30, 0)).toBe(0)
    const ranges = { length: 2, start: (i: number) => [0, 50][i], end: (i: number) => [20, 80][i] }
    expect(bufferedEnd(ranges, 10)).toBe(20)
    expect(bufferedEnd(ranges, 60)).toBe(80)
    expect(bufferedEnd(ranges, 30)).toBe(0)
  })

  it('applies actions to the element', () => {
    const el = document.createElement('video')
    const m = fakeMedia(el)
    applyPlayerAction(el, { type: 'toggle' }, [1])
    expect(el.play).toHaveBeenCalled()
    applyPlayerAction(el, { type: 'seekBy', seconds: 500 }, [1])
    expect(el.currentTime).toBe(120)
    applyPlayerAction(el, { type: 'seekTo', fraction: 0.5 }, [1])
    expect(el.currentTime).toBe(60)
    applyPlayerAction(el, { type: 'volumeBy', delta: -2 }, [1])
    expect([el.volume, el.muted]).toEqual([0, true])
    applyPlayerAction(el, { type: 'rateBy', steps: 1 }, [1, 1.5, 2])
    expect(el.playbackRate).toBe(1.5)
    expect(applyPlayerAction(el, { type: 'fullscreen' }, [1])).toBe(false)
    void m
  })

  it('shows exactly one text track', () => {
    const el = document.createElement('video')
    const tracks = [{ mode: 'showing' }, { mode: 'showing' }]
    Object.defineProperty(el, 'textTracks', { value: Object.assign(tracks, { length: 2 }) })
    showTextTrack(el, 1)
    expect(tracks.map((t) => t.mode)).toEqual(['disabled', 'showing'])
  })
})

describe('MlVideoPlayer', () => {
  const tracks = [
    { src: '/zh.vtt', srclang: 'zh-TW', label: '中文', default: true },
    { src: '/en.vtt', srclang: 'en', label: 'English' },
  ]

  it('renders the native video, sources, tracks and controls', () => {
    wrapper = mount(MlVideoPlayer, { props: { src: [{ src: '/a.webm', type: 'video/webm' }, { src: '/a.mp4' }], poster: '/p.jpg', tracks, title: '示範' } })
    const video = wrapper.find('video')
    expect(video.attributes('poster')).toBe('/p.jpg')
    expect(video.attributes('playsinline')).toBeDefined()
    expect(wrapper.findAll('source').map((s) => s.attributes('src'))).toEqual(['/a.webm', '/a.mp4'])
    expect(wrapper.findAll('track').map((t) => t.attributes('srclang'))).toEqual(['zh-TW', 'en'])
    expect(wrapper.attributes('aria-label')).toBe('示範')
    expect(wrapper.find('.ml-player__big').attributes('aria-label')).toBe('播放')
    expect(wrapper.find('.ml-player__time').text()).toBe('0:00 / 0:00')
  })

  it('plays and pauses from the big button and keyboard, tracking time', async () => {
    wrapper = mount(MlVideoPlayer, { props: { src: '/a.mp4' }, attachTo: document.body })
    const m = fakeMedia(wrapper.find('video').element as HTMLMediaElement)
    m.fire('durationchange')
    await wrapper.find('.ml-player__big').trigger('click')
    await nextTick()
    expect(wrapper.classes()).toContain('ml-player--playing')
    expect(wrapper.find('.ml-player__big').exists()).toBe(false)
    expect(wrapper.emitted('play')).toHaveLength(1)

    await wrapper.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.find('.ml-player__time').text()).toBe('0:05 / 2:00')
    expect(wrapper.find('.ml-player__seek').attributes('aria-valuetext')).toBe('0:05，總長 2:00')
    expect(wrapper.emitted('timeupdate')?.at(-1)).toEqual([5])

    await wrapper.trigger('keydown', { key: ' ' })
    expect(wrapper.classes()).not.toContain('ml-player--playing')
    m.end()
    await nextTick()
    expect(wrapper.find('.ml-player__big').attributes('aria-label')).toBe('重播')
  })

  it('seek and volume sliders drive the element', async () => {
    wrapper = mount(MlVideoPlayer, { props: { src: '/a.mp4' }, attachTo: document.body })
    const el = wrapper.find('video').element as HTMLMediaElement
    fakeMedia(el)
    const seek = wrapper.find('.ml-player__seek')
    ;(seek.element as HTMLInputElement).value = '42'
    await seek.trigger('input')
    expect(el.currentTime).toBe(42)
    const vol = wrapper.find('.ml-player__vol')
    ;(vol.element as HTMLInputElement).value = '0'
    await vol.trigger('input')
    expect(el.muted).toBe(true)
    expect(wrapper.find('.ml-player__volume button').attributes('aria-label')).toBe('取消靜音')
  })

  it('speed menu: opens, picks a rate, closes on Escape', async () => {
    wrapper = mount(MlVideoPlayer, { props: { src: '/a.mp4', playbackRates: [1, 2] }, attachTo: document.body })
    const el = wrapper.find('video').element as HTMLMediaElement
    fakeMedia(el)
    const button = wrapper.find('.ml-player__rate')
    await button.trigger('click')
    expect(button.attributes('aria-expanded')).toBe('true')
    const options = wrapper.findAll('[role="menuitemradio"]')
    expect(options.map((o) => o.text())).toEqual(['正常', '2×'])
    await options[1].trigger('click')
    expect(el.playbackRate).toBe(2)
    expect(wrapper.find('.ml-player__rate').text()).toBe('2×')
    await button.trigger('click')
    await wrapper.trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
  })

  it('captions menu and the C key', async () => {
    wrapper = mount(MlVideoPlayer, { props: { src: '/a.mp4', tracks }, attachTo: document.body })
    const captions = () => wrapper!.find('[aria-label="字幕"]')
    expect(captions().classes()).toContain('ml-player__btn--on')
    await wrapper.trigger('keydown', { key: 'c' })
    expect(captions().classes()).not.toContain('ml-player__btn--on')
    await captions().trigger('click')
    await wrapper.findAll('[role="menuitemradio"]')[2].trigger('click')
    expect(captions().classes()).toContain('ml-player__btn--on')
    await captions().trigger('click')
    expect(wrapper.findAll('[role="menuitemradio"]')[2].attributes('aria-checked')).toBe('true')
  })

  it('fullscreen goes through the root element', async () => {
    wrapper = mount(MlVideoPlayer, { props: { src: '/a.mp4' }, attachTo: document.body })
    const request = vi.fn(() => Promise.resolve())
    ;(wrapper.element as HTMLElement).requestFullscreen = request
    await wrapper.find('[aria-label="全螢幕"]').trigger('click')
    expect(request).toHaveBeenCalled()
    await wrapper.trigger('keydown', { key: 'f' })
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('shows an error when the media fails', async () => {
    wrapper = mount(MlVideoPlayer, { props: { src: '/missing.mp4' } })
    wrapper.find('video').element.dispatchEvent(new Event('error'))
    await nextTick()
    expect(wrapper.find('[role="alert"]').text()).toBe('無法播放這個媒體')
    expect(wrapper.find('.ml-player__big').exists()).toBe(false)
  })
})

describe('MlAudioPlayer', () => {
  it('renders cover or disc, meta and skips', async () => {
    wrapper = mount(MlAudioPlayer, { props: { src: '/a.m4a', title: '獅吼', artist: '碼力獅', skip: 15 }, attachTo: document.body })
    expect(wrapper.find('.ml-player__disc').exists()).toBe(true)
    expect(wrapper.find('.ml-player__title').text()).toBe('獅吼')
    const el = wrapper.find('audio').element as HTMLMediaElement
    fakeMedia(el, 300)
    await wrapper.find('[aria-label="快轉 15 秒"]').trigger('click')
    await wrapper.find('[aria-label="快轉 15 秒"]').trigger('click')
    await wrapper.find('[aria-label="倒退 15 秒"]').trigger('click')
    expect(el.currentTime).toBe(15)
    await wrapper.find('.ml-player__play').trigger('click')
    expect(wrapper.classes()).toContain('ml-player--playing')
    expect(wrapper.find('.ml-player__play').attributes('aria-label')).toBe('暫停')
  })

  it('the speed button cycles and wraps', async () => {
    wrapper = mount(MlAudioPlayer, { props: { src: '/a.m4a', playbackRates: [1, 1.5, 2], cover: '/c.jpg' } })
    expect(wrapper.find('.ml-player__art').attributes('src')).toBe('/c.jpg')
    const el = wrapper.find('audio').element as HTMLMediaElement
    fakeMedia(el)
    const rate = wrapper.find('.ml-player__rate')
    await rate.trigger('click')
    await rate.trigger('click')
    expect(el.playbackRate).toBe(2)
    await rate.trigger('click')
    expect(el.playbackRate).toBe(1)
    expect(rate.attributes('aria-label')).toBe('播放速度 1×')
  })
})
