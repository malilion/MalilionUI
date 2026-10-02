import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import {
  MlBorderBeam,
  MlCountUp,
  MlDecryptText,
  MlMarquee,
  MlPawBurst,
  MlReveal,
  MlSpotlight,
  MlTilt,
  pawBurst,
} from '../src'

// Drive requestAnimationFrame from fake timers so animations can be stepped.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })
})

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
})

function reducedMotion(on: boolean) {
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: on && q.includes('reduce'), addEventListener() {}, removeEventListener() {} }))
}

describe('MlCountUp', () => {
  it('counts to the value, formatted, and keeps the final value for screen readers', async () => {
    const wrapper = mount(MlCountUp, { props: { value: 12345.6, decimals: 1, prefix: '$', startOnView: false, duration: 1000 } })
    expect(wrapper.get('.ml-visually-hidden').text()).toBe('$12,345.6')
    vi.advanceTimersByTime(300)
    await nextTick()
    const mid = wrapper.get('[aria-hidden="true"]').text()
    expect(mid).not.toBe('$0.0')
    expect(mid).not.toBe('$12,345.6')
    vi.advanceTimersByTime(1000)
    await nextTick()
    expect(wrapper.get('[aria-hidden="true"]').text()).toBe('$12,345.6')
    expect(wrapper.emitted('done')).toHaveLength(1)
  })

  it('jumps straight to the value under reduced motion', async () => {
    reducedMotion(true)
    const wrapper = mount(MlCountUp, { props: { value: 99, startOnView: false } })
    await nextTick()
    expect(wrapper.get('[aria-hidden="true"]').text()).toBe('99')
  })

  it('counts from the current number when the value changes', async () => {
    const wrapper = mount(MlCountUp, { props: { value: 10, startOnView: false, duration: 100 } })
    vi.advanceTimersByTime(200)
    await wrapper.setProps({ value: 20 })
    vi.advanceTimersByTime(200)
    await nextTick()
    expect(wrapper.get('[aria-hidden="true"]').text()).toBe('20')
  })
})

describe('MlDecryptText', () => {
  it('scrambles then locks into the text, exposing the text as its label', async () => {
    const wrapper = mount(MlDecryptText, { props: { text: 'ROAR 42', trigger: 'mount', duration: 600 } })
    expect(wrapper.attributes('aria-label')).toBe('ROAR 42')
    vi.advanceTimersByTime(100)
    await nextTick()
    expect(wrapper.findAll('.ml-decrypt__char--scrambled').length).toBeGreaterThan(0)
    // Spaces are never scrambled.
    expect(wrapper.findAll('.ml-decrypt__char')[4].text()).toBe('')
    vi.advanceTimersByTime(700)
    await nextTick()
    expect(wrapper.text()).toBe('ROAR 42')
    expect(wrapper.find('.ml-decrypt__char--scrambled').exists()).toBe(false)
  })

  it('replays on hover when trigger="hover"', async () => {
    const wrapper = mount(MlDecryptText, { props: { text: 'LION', trigger: 'hover', duration: 400 } })
    expect(wrapper.text()).toBe('LION')
    await wrapper.trigger('mouseenter')
    vi.advanceTimersByTime(50)
    await nextTick()
    expect(wrapper.classes()).toContain('ml-decrypt--running')
  })
})

describe('MlTilt', () => {
  it('tilts toward the pointer and resets on leave', async () => {
    const wrapper = mount(MlTilt, { props: { max: 10 }, slots: { default: '<p>card</p>' } })
    wrapper.element.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100, right: 200, bottom: 100, x: 0, y: 0, toJSON() {} })
    await wrapper.trigger('pointermove', { clientX: 200, clientY: 0 })
    const style = wrapper.attributes('style')!
    expect(style).toContain('--_ry: 10.00deg')
    expect(style).toContain('--_rx: 10.00deg')
    expect(wrapper.classes()).toContain('ml-tilt--active')
    await wrapper.trigger('pointerleave')
    expect(wrapper.attributes('style')).toContain('--_ry: 0.00deg')
  })
})

describe('MlBorderBeam / MlSpotlight', () => {
  it('beam exposes tone, speed and size as classes and variables', () => {
    const wrapper = mount(MlBorderBeam, { props: { tone: 'tech', duration: 6, size: 3, reverse: true } })
    expect(wrapper.classes()).toEqual(expect.arrayContaining(['ml-beam--tech', 'ml-beam--reverse']))
    expect(wrapper.attributes('style')).toContain('--_dur: 6s')
    expect(wrapper.get('.ml-beam__ring').attributes('aria-hidden')).toBe('true')
  })

  it('spotlight follows the pointer', async () => {
    const wrapper = mount(MlSpotlight)
    wrapper.element.getBoundingClientRect = () => ({ left: 10, top: 20, width: 300, height: 200, right: 310, bottom: 220, x: 10, y: 20, toJSON() {} })
    await wrapper.trigger('pointermove', { clientX: 110, clientY: 70 })
    expect(wrapper.attributes('style')).toContain('--_x: 100px')
    expect(wrapper.attributes('style')).toContain('--_y: 50px')
    expect(wrapper.classes()).toContain('ml-spotlight--on')
  })
})

describe('MlMarquee', () => {
  it('renders a hidden, inert copy for the seamless loop', () => {
    const wrapper = mount(MlMarquee, { props: { label: '合作夥伴' }, slots: { default: '<span>Vue</span><span>Vite</span>' } })
    const groups = wrapper.findAll('.ml-marquee__group')
    expect(groups).toHaveLength(2)
    expect(groups[1].attributes('aria-hidden')).toBe('true')
    expect(groups[1].attributes('inert')).toBeDefined()
    expect(wrapper.get('[role="region"]').attributes('aria-label')).toBe('合作夥伴')
  })
})

describe('MlReveal', () => {
  it('stays visible without motion support, and hides until in view otherwise', async () => {
    reducedMotion(true)
    const still = mount(MlReveal, { slots: { default: '<p>hi</p>' } })
    await nextTick()
    expect(still.classes()).not.toContain('ml-reveal--hidden')

    reducedMotion(false)
    let enter: (() => void) | undefined
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
          enter = () => cb([{ isIntersecting: true }])
        }
        observe() {}
        disconnect() {}
      },
    )
    const wrapper = mount(MlReveal, { props: { stagger: 80 }, slots: { default: '<p>a</p><p>b</p>' } })
    await nextTick()
    expect(wrapper.classes()).toContain('ml-reveal--hidden')
    expect((wrapper.findAll('p')[1].element as HTMLElement).style.getPropertyValue('--_i')).toBe('1')
    enter!()
    await nextTick()
    expect(wrapper.classes()).toContain('ml-reveal--shown')
    expect(wrapper.emitted('reveal')).toHaveLength(1)
  })
})

describe('pawBurst / MlPawBurst', () => {
  it('spawns paws that clean themselves up', () => {
    reducedMotion(false)
    pawBurst(100, 100, { count: 6 })
    expect(document.querySelectorAll('.ml-paw-burst')).toHaveLength(6)
    vi.advanceTimersByTime(3000)
    expect(document.querySelectorAll('.ml-paw-burst')).toHaveLength(0)
  })

  it('does nothing under reduced motion', () => {
    reducedMotion(true)
    pawBurst(0, 0)
    expect(document.querySelectorAll('.ml-paw-burst')).toHaveLength(0)
  })

  it('bursts when its trigger is clicked', async () => {
    reducedMotion(false)
    const wrapper = mount(MlPawBurst, { props: { count: 4 }, slots: { default: '<button>Yay</button>' }, attachTo: document.body })
    await wrapper.get('button').trigger('click')
    expect(document.querySelectorAll('.ml-paw-burst')).toHaveLength(4)
    expect(wrapper.emitted('burst')).toHaveLength(1)
  })
})
