import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import { MlGrid, MlGridItem, MlInfiniteScroll, MlLayout, MlSpace, MlVirtualList } from '../src'

afterEach(() => {
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('MlSpace', () => {
  it('applies the gap preset and puts dividers only between real children', () => {
    const wrapper = mount(MlSpace, {
      props: { size: 'lg', divider: 'paw' },
      slots: { default: () => [h('a', 'A'), null, h('a', 'B'), h('a', 'C')] },
    })
    expect(wrapper.classes()).toContain('ml-space--lg')
    expect(wrapper.findAll('a')).toHaveLength(3)
    expect(wrapper.findAll('.ml-space__divider--paw')).toHaveLength(2)
    const custom = mount(MlSpace, { props: { size: 18 }, slots: { default: 'x' } })
    expect(custom.attributes('style')).toContain('--ml-space-gap: 18px')
  })
})

describe('MlGrid', () => {
  it('sets columns, gap and item spans', () => {
    const wrapper = mount(MlGrid, {
      props: { cols: 6, gap: 'lg' },
      slots: { default: () => [h(MlGridItem, { span: 2, offset: 3 }, () => 'x')] },
    })
    const grid = wrapper.get('.ml-grid')
    expect(grid.attributes('style')).toContain('--ml-grid-cols: 6')
    expect(grid.attributes('style')).toContain('--ml-grid-gap: 24px')
    expect(wrapper.get('.ml-grid__item').attributes('style')).toContain('grid-column: 3 / span 2')
    const auto = mount(MlGrid, { props: { minItemWidth: '200px' } })
    expect(auto.get('.ml-grid').classes()).toContain('ml-grid--auto')
  })
})

describe('MlLayout', () => {
  function mockViewport(mobile: boolean) {
    vi.stubGlobal('matchMedia', () => ({
      matches: mobile,
      addEventListener: () => {},
      removeEventListener: () => {},
    }))
  }

  it('toggles the rail on desktop', async () => {
    mockViewport(false)
    const wrapper = mount(MlLayout, {
      slots: { aside: '<nav>side</nav>', default: '<p>main</p>', header: '<h1>head</h1>' },
    })
    await nextTick()
    ;(wrapper.vm as unknown as { toggleAside: () => void }).toggleAside()
    expect(wrapper.emitted('update:collapsed')?.[0]).toEqual([true])
  })

  it('turns the aside into a drawer on mobile, closed by the scrim or Esc', async () => {
    mockViewport(true)
    const wrapper = mount(MlLayout, { slots: { aside: '<nav>side</nav>', default: '<p>main</p>' } })
    await nextTick()
    expect(wrapper.classes()).toContain('ml-layout--mobile')
    expect(wrapper.get('.ml-layout__aside').attributes('inert')).toBeDefined()
    ;(wrapper.vm as unknown as { toggleAside: () => void }).toggleAside()
    expect(wrapper.emitted('update:asideOpen')?.[0]).toEqual([true])
    await wrapper.setProps({ asideOpen: true })
    expect(wrapper.classes()).toContain('ml-layout--aside-open')
    await wrapper.trigger('keydown', { key: 'Escape' })
    expect(wrapper.emitted('update:asideOpen')?.at(-1)).toEqual([false])
  })
})

describe('MlVirtualList', () => {
  it('renders only the visible window and jumps with scrollToIndex', async () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0)
      return 0
    })
    const items = Array.from({ length: 10_000 }, (_, i) => i)
    const wrapper = mount(MlVirtualList, {
      props: { items, itemHeight: 20, height: 100, overscan: 2 },
      slots: { default: (({ item }: { item: number }) => `row ${item}`) as never },
    })
    // 100px / 20px = 5 visible + 2 overscan below.
    expect(wrapper.findAll('.ml-vlist__row')).toHaveLength(7)
    expect(wrapper.get('.ml-vlist__spacer').attributes('style')).toContain('height: 200000px')

    const vm = wrapper.vm as unknown as { scrollToIndex: (i: number) => void }
    vm.scrollToIndex(5000)
    await nextTick()
    const rows = wrapper.findAll('.ml-vlist__row').map((r) => r.text())
    expect(rows).toContain('row 5000')
    expect(rows).not.toContain('row 0')
    expect(wrapper.get('.ml-vlist__row').attributes('aria-posinset')).toBe('4999')
  })
})

describe('MlInfiniteScroll', () => {
  it('emits load when the sentinel is visible, never while loading or finished', async () => {
    let fire: (visible: boolean) => void = () => {}
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
          fire = (visible) => cb([{ isIntersecting: visible }])
        }
        observe() {}
        disconnect() {}
      },
    )
    const wrapper = mount(MlInfiniteScroll, { slots: { default: '<p>items</p>' } })
    fire(true)
    expect(wrapper.emitted('load')).toHaveLength(1)
    await wrapper.setProps({ loading: true })
    fire(true)
    expect(wrapper.emitted('load')).toHaveLength(1)
    await wrapper.setProps({ loading: false, finished: true })
    fire(true)
    expect(wrapper.emitted('load')).toHaveLength(1)
    expect(wrapper.text()).toContain('沒有更多了')
  })
})
