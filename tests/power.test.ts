import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import {
  MlAnchor,
  MlCascader,
  MlCommandPalette,
  MlContextMenu,
  MlCountdown,
  MlQRCode,
  MlResult,
  MlSplitter,
  MlTreeSelect,
  encodeQr,
  type MlCascaderOption,
  type MlCommandItem,
} from '../src'

afterEach(() => {
  document.body.innerHTML = ''
  vi.useRealTimers()
})

const commands: MlCommandItem[] = [
  { value: 'new', label: 'New file', group: 'File' },
  { value: 'open', label: 'Open folder', group: 'File' },
  { value: 'settings', label: 'Open settings', group: 'Go', keywords: ['preferences'] },
  { value: 'off', label: 'Nope', disabled: true },
]

describe('MlCommandPalette', () => {
  it('opens on mod+K, fuzzy-filters, highlights and runs with Enter', async () => {
    const wrapper = mount(MlCommandPalette, { props: { items: commands }, attachTo: document.body })
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, metaKey: true }))
    await nextTick()
    expect(wrapper.emitted('update:open')?.[0]).toEqual([true])
    await wrapper.setProps({ open: true })

    const input = document.querySelector<HTMLInputElement>('.ml-cmd__input')!
    expect([...document.querySelectorAll('.ml-cmd__group')].map((g) => g.textContent)).toEqual(['File', 'Go'])
    input.value = 'opst'
    input.dispatchEvent(new Event('input'))
    await nextTick()
    const labels = [...document.querySelectorAll('.ml-cmd__label')].map((e) => e.textContent)
    expect(labels).toEqual(['Open settings'])
    expect([...document.querySelectorAll('.ml-cmd__hit')].map((e) => e.textContent).join('')).toBe('Opst')

    input.value = 'prefer'
    input.dispatchEvent(new Event('input'))
    await nextTick()
    expect(document.querySelector('.ml-cmd__item--active')!.textContent).toContain('Open settings')

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(wrapper.emitted('select')?.[0][0]).toMatchObject({ value: 'settings' })
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
  })

  it('skips disabled commands with the arrow keys', async () => {
    mount(MlCommandPalette, { props: { items: commands, open: false }, attachTo: document.body }).setProps({ open: true })
    await nextTick()
    await nextTick()
    const input = document.querySelector<HTMLInputElement>('.ml-cmd__input')!
    for (let i = 0; i < 3; i++) input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    await nextTick()
    expect(document.querySelector('.ml-cmd__item--active')!.textContent).toContain('New file')
  })
})

const regions: MlCascaderOption[] = [
  { value: 'tp', label: 'Taipei', children: [{ value: 'xy', label: 'Xinyi' }, { value: 'da', label: 'Daan' }] },
  { value: 'tc', label: 'Taichung', children: [{ value: 'xt', label: 'Xitun', disabled: true }] },
]

describe('MlCascader', () => {
  it('walks columns and commits the full path on a leaf', async () => {
    const wrapper = mount(MlCascader, { props: { options: regions, modelValue: [] }, attachTo: document.body })
    await wrapper.get('.ml-combobox__box').trigger('click')
    expect(wrapper.findAll('.ml-cascader__col')).toHaveLength(1)
    await wrapper.findAll('.ml-cascader__opt')[0].trigger('click')
    expect(wrapper.findAll('.ml-cascader__col')).toHaveLength(2)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    await wrapper.findAll('.ml-cascader__col')[1].findAll('.ml-cascader__opt')[1].trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['tp', 'da']])
    expect(wrapper.find('.ml-cascader__panel').exists()).toBe(false)
    await wrapper.setProps({ modelValue: ['tp', 'da'] })
    expect(wrapper.find('.ml-cascader__path').text()).toBe('Taipei/Daan')
  })

  it('searches every path and ignores disabled leaves', async () => {
    const wrapper = mount(MlCascader, { props: { options: regions, searchable: true }, attachTo: document.body })
    await wrapper.get('.ml-combobox__box').trigger('click')
    await wrapper.get('.ml-cascader__search input').setValue('x')
    expect(wrapper.findAll('.ml-cascader__hit').map((h) => h.text())).toEqual(['Taipei/Xinyi'])
  })
})

describe('MlTreeSelect', () => {
  const data = [
    { key: 'a', label: 'A', children: [{ key: 'a1', label: 'A1' }, { key: 'a2', label: 'A2' }] },
    { key: 'b', label: 'B' },
  ]

  it('single mode picks a node and closes', async () => {
    const wrapper = mount(MlTreeSelect, { props: { data, modelValue: 'a1' }, attachTo: document.body })
    expect(wrapper.find('.ml-combobox__single').text()).toBe('A1')
    await wrapper.get('.ml-combobox__box').trigger('click')
    // The chosen node's parent is expanded on open.
    expect(wrapper.emitted('update:expanded')?.[0]).toEqual([['a']])
    const b = wrapper.findAll('[role="treeitem"]').find((r) => r.text().startsWith('B'))!
    await b.trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['b'])
  })

  it('multiple mode shows a fully checked parent as one tag and removes it', async () => {
    const wrapper = mount(MlTreeSelect, { props: { data, multiple: true, modelValue: ['a', 'a1', 'a2', 'b'] } })
    expect(wrapper.findAll('.ml-combobox__tag').map((t) => t.text())).toEqual(['A', 'B'])
    await wrapper.findAll('.ml-combobox__tag-remove')[0].trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['b']])
  })
})

describe('MlContextMenu', () => {
  it('opens at the pointer, runs an item and closes', async () => {
    const wrapper = mount(MlContextMenu, {
      props: { items: [{ value: 'copy', label: 'Copy' }, { value: 'x', label: 'X', disabled: true }] },
      slots: { default: '<div class="target">target</div>' },
      attachTo: document.body,
    })
    await wrapper.get('.target').trigger('contextmenu', { clientX: 40, clientY: 50 })
    const menu = document.querySelector<HTMLElement>('.ml-ctx__menu')!
    expect(menu.style.left).toBe('40px')
    expect(document.activeElement?.textContent).toContain('Copy')
    menu.querySelectorAll<HTMLElement>('[role="menuitem"]')[0].click()
    expect(wrapper.emitted('select')?.[0][0]).toMatchObject({ value: 'copy' })
    await nextTick()
    expect(wrapper.emitted('open')).toHaveLength(1)
  })
})

describe('MlSplitter', () => {
  it('resizes with the keyboard within min / max and resets on double-click', async () => {
    const wrapper = mount(MlSplitter, { props: { modelValue: 50, min: 20, max: 70, step: 5 } })
    const handle = wrapper.get('[role="separator"]')
    expect(handle.attributes('aria-valuenow')).toBe('50')
    await handle.trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([55])
    await handle.trigger('keydown', { key: 'End' })
    expect(wrapper.emitted('update:modelValue')?.[1]).toEqual([70])
    await wrapper.setProps({ modelValue: 70, defaultSize: 40 })
    await handle.trigger('dblclick')
    expect(wrapper.emitted('update:modelValue')?.[2]).toEqual([40])
  })
})

describe('MlAnchor', () => {
  it('marks the last section above the line and jumps on click', async () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0)
      return 0
    })
    document.body.innerHTML = '<div id="s1"></div><div id="s2"></div><div id="s3"></div>'
    const tops: Record<string, number> = { s1: -400, s2: -10, s3: 300 }
    for (const id of Object.keys(tops)) {
      document.getElementById(id)!.getBoundingClientRect = () => ({ top: tops[id] }) as DOMRect
    }
    window.scrollTo = vi.fn() as typeof window.scrollTo
    const wrapper = mount(MlAnchor, {
      props: { items: [{ id: 's1', label: 'One' }, { id: 's2', label: 'Two' }, { id: 's3', label: 'Three' }], updateHash: false },
      attachTo: document.body,
    })
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['s2'])
    await wrapper.findAll('a')[2].trigger('click', { button: 0 })
    expect(window.scrollTo).toHaveBeenCalled()
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['s3'])
  })
})

describe('MlResult', () => {
  it('draws error codes with paw zeros and falls back to preset copy', () => {
    const wrapper = mount(MlResult, { props: { status: '404' } })
    expect(wrapper.findAll('.ml-result__digit').map((d) => d.text())).toEqual(['4', '4'])
    expect(wrapper.findAll('.ml-result__zero')).toHaveLength(1)
    expect(wrapper.find('.ml-result__title').text()).toBe('找不到這個頁面')
    const ok = mount(MlResult, { props: { status: 'success', title: 'Done' } })
    expect(ok.find('.ml-result__emblem').exists()).toBe(true)
    expect(ok.find('.ml-result__title').text()).toBe('Done')
  })
})

describe('MlCountdown', () => {
  it('counts down on the second and emits finish once', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 1, 0, 0, 0))
    const wrapper = mount(MlCountdown, { props: { duration: 62_000, units: ['minutes', 'seconds'] } })
    const text = () => wrapper.findAll('.ml-countdown__digits').map((d) => d.text()).join(':')
    expect(text()).toBe('01:02')
    await vi.advanceTimersByTimeAsync(3000)
    expect(text()).toBe('00:59')
    await vi.advanceTimersByTimeAsync(60_000)
    expect(text()).toBe('00:00')
    expect(wrapper.emitted('finish')).toHaveLength(1)
  })

  it('freezes while paused', async () => {
    vi.useFakeTimers()
    const wrapper = mount(MlCountdown, { props: { duration: 10_000, units: ['seconds'] } })
    await wrapper.setProps({ paused: true })
    await vi.advanceTimersByTimeAsync(5000)
    expect(wrapper.get('.ml-countdown__digits').text()).toBe('10')
    await wrapper.setProps({ paused: false })
    await vi.advanceTimersByTimeAsync(4000)
    expect(wrapper.get('.ml-countdown__digits').text()).toBe('06')
  })
})

describe('encodeQr / MlQRCode', () => {
  it('picks the smallest version and keeps the fixed patterns', () => {
    const small = encodeQr('HELLO', 'M')
    expect(small.version).toBe(1)
    expect(small.size).toBe(21)
    // Finder centre is dark, its separator ring light; timing alternates.
    expect(small.modules[3][3]).toBe(true)
    expect(small.modules[7][3]).toBe(false)
    expect([8, 9, 10, 11].map((x) => small.modules[6][x])).toEqual([true, false, true, false])
    expect(encodeQr('x'.repeat(300), 'L').version).toBe(11)
    expect(encodeQr('碼力獅', 'H').version).toBe(2) // 9 UTF-8 bytes don't fit 1-H
    expect(() => encodeQr('x'.repeat(4000), 'H')).toThrow(RangeError)
  })

  it('renders an SVG, raises the level for a logo and reports overflow', () => {
    const wrapper = mount(MlQRCode, { props: { value: 'https://example.com', logo: 'paw', size: 120 } })
    const svg = wrapper.get('svg')
    expect(svg.attributes('width')).toBe('120')
    expect(svg.attributes('aria-label')).toContain('https://example.com')
    expect(wrapper.findAll('ellipse')).toHaveLength(5) // the paw badge
    const tooLong = mount(MlQRCode, { props: { value: 'x'.repeat(4000), level: 'H' } })
    expect(tooLong.find('[role="alert"]').exists()).toBe(true)
  })
})
