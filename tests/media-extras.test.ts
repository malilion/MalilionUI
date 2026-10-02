import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import {
  MlBackTop,
  MlCarousel,
  MlColorPicker,
  MlImage,
  MlImagePreview,
  MlRate,
  MlTransfer,
  MlWatermark,
} from '../src'
import { hexToHsva, hsvaToHex, parseHex } from '../src/components/color'

afterEach(() => {
  document.body.innerHTML = ''
  vi.useRealTimers()
})

describe('MlImage', () => {
  it('shows a placeholder until load, and a labelled fallback on error', async () => {
    const wrapper = mount(MlImage, { props: { src: '/lion.png', alt: 'Lion' } })
    expect(wrapper.classes()).toContain('ml-image--loading')
    expect(wrapper.get('img').attributes('loading')).toBe('lazy')
    await wrapper.get('img').trigger('error')
    expect(wrapper.classes()).toContain('ml-image--error')
    expect(wrapper.get('[role="img"]').attributes('aria-label')).toBe('Lion（無法載入）')
    expect(wrapper.emitted('error')).toHaveLength(1)
  })

  it('opens the preview at the right image', async () => {
    const wrapper = mount(MlImage, {
      props: { src: '/b.png', alt: 'B', preview: true, previewList: ['/a.png', '/b.png', '/c.png'] },
      attachTo: document.body,
    })
    await wrapper.get('img').trigger('load')
    await wrapper.get('.ml-image__zoom').trigger('click')
    await flushPromises()
    const dialog = document.querySelector('.ml-preview')!
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.querySelector('.ml-preview__img')!.getAttribute('src')).toBe('/b.png')
    expect(dialog.querySelector('.ml-preview__counter')!.textContent).toContain('02')
  })
})

describe('MlImagePreview', () => {
  it('pages, zooms, and closes with the keyboard', async () => {
    const wrapper = mount(MlImagePreview, {
      props: { images: ['/a.png', '/b.png'], open: true, index: 0, inline: true },
      attachTo: document.body,
    })
    await flushPromises()
    const root = wrapper.get('.ml-preview')
    await root.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.emitted('update:index')?.[0]).toEqual([1])
    await root.trigger('keydown', { key: '+' })
    expect(wrapper.get('.ml-preview__zoom').text()).toBe('125%')
    await root.trigger('keydown', { key: '0' })
    expect(wrapper.get('.ml-preview__zoom').text()).toBe('100%')
    await root.trigger('keydown', { key: 'Escape' })
    expect(wrapper.emitted('update:open')?.[0]).toEqual([false])
  })

  it('does not wrap when loop is off', async () => {
    const wrapper = mount(MlImagePreview, { props: { images: ['/a', '/b'], open: true, index: 0, loop: false, inline: true } })
    await flushPromises()
    expect(wrapper.get('[aria-label="上一張"]').attributes('disabled')).toBeDefined()
  })
})

describe('MlCarousel', () => {
  const items = ['A', 'B', 'C']
  const slot = { default: ({ item }: { item: unknown }) => h('p', String(item)) }

  it('marks only the current slide as reachable and moves with arrows / dots', async () => {
    const wrapper = mount(MlCarousel, {
      props: { items, index: 0, 'onUpdate:index': (i: number) => wrapper.setProps({ index: i }) },
      slots: slot,
    })
    const slides = () => wrapper.findAll('[aria-roledescription="slide"]')
    expect(slides().map((s) => s.attributes('aria-label'))).toEqual(['1 / 3', '2 / 3', '3 / 3'])
    expect(slides()[1].attributes('inert')).toBeDefined()

    await wrapper.get('[aria-label="上一張"]').trigger('click') // loops to the end
    expect(wrapper.props('index')).toBe(2)
    await wrapper.get('[aria-roledescription="carousel"]').trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.props('index')).toBe(0)
    await wrapper.findAll('.ml-carousel__dot')[1].trigger('click')
    expect(wrapper.props('index')).toBe(1)
    expect(wrapper.findAll('.ml-carousel__dot')[1].attributes('aria-current')).toBe('true')
  })

  it('autoplays, pauses on hover and via the button', async () => {
    vi.useFakeTimers()
    const wrapper = mount(MlCarousel, {
      props: { items, autoplay: 1000, index: 0, 'onUpdate:index': (i: number) => wrapper.setProps({ index: i }) },
      slots: slot,
    })
    await vi.advanceTimersByTimeAsync(1000)
    expect(wrapper.props('index')).toBe(1)

    await wrapper.trigger('mouseenter')
    await vi.advanceTimersByTimeAsync(3000)
    expect(wrapper.props('index')).toBe(1)
    await wrapper.trigger('mouseleave')

    await wrapper.get('[aria-label="暫停自動播放"]').trigger('click')
    await vi.advanceTimersByTimeAsync(3000)
    expect(wrapper.props('index')).toBe(1)
    expect(wrapper.find('[aria-label="開始自動播放"]').exists()).toBe(true)
  })
})

describe('MlRate', () => {
  it('is a slider with keyboard steps, half values and text', async () => {
    const wrapper = mount(MlRate, {
      props: { modelValue: 3, allowHalf: true, texts: ['差', '普', '好', '很好', '超讚'], 'onUpdate:modelValue': (v: number) => wrapper.setProps({ modelValue: v }) },
    })
    const slider = wrapper.get('[role="slider"]')
    expect(slider.attributes('aria-valuetext')).toBe('3 / 5，好')
    await slider.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.props('modelValue')).toBe(3.5)
    expect(wrapper.findAll('.ml-rate__item')[3].classes()).toContain('ml-rate__item--half')
    await slider.trigger('keydown', { key: 'End' })
    expect(wrapper.props('modelValue')).toBe(5)
    await slider.trigger('keydown', { key: 'Home' })
    expect(wrapper.props('modelValue')).toBe(0)
  })

  it('clearable: clicking the current value resets it', async () => {
    const wrapper = mount(MlRate, { props: { modelValue: 2, clearable: true } })
    await wrapper.findAll('.ml-rate__item')[1].trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([0])
  })

  it('readonly renders an image with a full description and is not focusable', () => {
    const wrapper = mount(MlRate, { props: { modelValue: 4, readonly: true } })
    const el = wrapper.get('[role="img"]')
    expect(el.attributes('aria-label')).toBe('評分：4 / 5')
    expect(el.attributes('tabindex')).toBeUndefined()
  })
})

describe('colour helpers', () => {
  it.each([
    ['#fff', { r: 255, g: 255, b: 255, a: 1 }],
    ['F0AD2F', { r: 240, g: 173, b: 47, a: 1 }],
    ['#00000080', { r: 0, g: 0, b: 0, a: 128 / 255 }],
    ['#zzz', null],
  ])('parseHex(%j)', (input, out) => {
    expect(parseHex(input)).toEqual(out)
  })

  it('round-trips hex through HSV', () => {
    for (const hex of ['#f0ad2f', '#3eeed0', '#12151c', '#ffffff', '#000000']) {
      expect(hsvaToHex(hexToHsva(hex)!)).toBe(hex)
    }
    expect(hsvaToHex({ h: 0, s: 1, v: 1, a: 0.5 }, true)).toBe('#ff000080')
  })
})

describe('MlColorPicker', () => {
  it('picks presets, accepts typed hex, and moves with arrow keys', async () => {
    const wrapper = mount(MlColorPicker, {
      props: { modelValue: '#f0ad2f', 'onUpdate:modelValue': (v: string | null) => wrapper.setProps({ modelValue: v }) },
      attachTo: document.body,
    })
    expect(wrapper.get('.ml-colorpicker__trigger').text()).toBe('#f0ad2f')
    await wrapper.get('.ml-colorpicker__trigger').trigger('click')
    await nextTick()

    await wrapper.get('[aria-label="#3eeed0"]').trigger('click')
    expect(wrapper.props('modelValue')).toBe('#3eeed0')

    const hex = wrapper.get('.ml-colorpicker__hex input')
    await hex.setValue('ff5c48')
    await hex.trigger('change')
    expect(wrapper.props('modelValue')).toBe('#ff5c48')

    await hex.setValue('nope')
    await hex.trigger('change')
    expect(wrapper.props('modelValue')).toBe('#ff5c48')
    expect((hex.element as HTMLInputElement).value).toBe('#ff5c48')

    const area = wrapper.get('[role="slider"]')
    await area.trigger('keydown', { key: 'ArrowDown', shiftKey: true })
    expect(wrapper.props('modelValue')).not.toBe('#ff5c48')
    expect(area.attributes('aria-valuetext')).toMatch(/亮度 90%/)
  })
})

describe('MlTransfer', () => {
  const data = [
    { key: 1, label: 'Simba' },
    { key: 2, label: 'Nala' },
    { key: 3, label: 'Scar', disabled: true },
    { key: 4, label: 'Rafiki' },
  ]

  it('moves checked items across and reports the direction', async () => {
    const wrapper = mount(MlTransfer, {
      props: { data, modelValue: [] as (string | number)[], 'onUpdate:modelValue': (v: (string | number)[]) => wrapper.setProps({ modelValue: v }) },
    })
    const panels = () => wrapper.findAll('.ml-transfer__panel')
    const boxes = (p: number) => panels()[p].findAll('.ml-transfer__item input')
    await boxes(0)[0].setValue(true)
    await boxes(0)[3].setValue(true)
    await wrapper.get('[aria-label="移到已選"]').trigger('click')
    expect(wrapper.props('modelValue')).toEqual([1, 4])
    expect(wrapper.emitted('change')?.[0]).toEqual([[1, 4], 'right', [1, 4]])
    expect(panels()[1].findAll('.ml-transfer__item').map((i) => i.text())).toEqual(['Simba', 'Rafiki'])
  })

  it('select-all skips disabled items and respects the filter', async () => {
    const wrapper = mount(MlTransfer, { props: { data, filterable: true, modelValue: [] } })
    const left = wrapper.findAll('.ml-transfer__panel')[0]
    await left.get('input[type="search"]').setValue('a') // Simba, Nala, Scar, Rafiki all contain "a"
    await left.get('.ml-transfer__head input').setValue(true)
    expect(left.get('.ml-transfer__count').text()).toBe('3 / 4')
    await left.get('input[type="search"]').setValue('nal')
    expect(left.findAll('.ml-transfer__item').map((i) => i.text())).toEqual(['Nala'])
  })
})

describe('MlBackTop', () => {
  it('appears past the threshold and scrolls to the top', async () => {
    const scrollTo = vi.fn()
    window.scrollTo = scrollTo as unknown as typeof window.scrollTo
    const wrapper = mount(MlBackTop, { props: { visibilityHeight: 100 }, attachTo: document.body })
    expect(wrapper.find('button').exists()).toBe(false)
    Object.defineProperty(window, 'scrollY', { value: 500, configurable: true })
    window.dispatchEvent(new Event('scroll'))
    await new Promise((r) => requestAnimationFrame(() => r(null)))
    await nextTick()
    const button = wrapper.get('button')
    expect(button.attributes('aria-label')).toBe('回到頂端')
    await button.trigger('click')
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }))
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })
  })
})

describe('MlWatermark', () => {
  it('wraps content and keeps the mark layer decorative', () => {
    const wrapper = mount(MlWatermark, { props: { content: ['碼力獅', 'CONFIDENTIAL'] }, slots: { default: '<p>secret</p>' } })
    expect(wrapper.text()).toContain('secret')
    expect(wrapper.get('.ml-watermark__layer').attributes('aria-hidden')).toBe('true')
  })
})
