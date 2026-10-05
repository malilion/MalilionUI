// Closable / addable / reorderable MlTabs, and the shared tab logic.
import { afterEach, describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { MlTabs, nextTabAfterClose } from '../src'
import { dropTab, moveTab, scrollToReveal, tabDropSlot, tabOverflow } from '../src/components/tabs'
import type { MlTabItem } from '../src/types'

const tabs = (): MlTabItem[] => [
  { value: 'home', label: '首頁', closable: false },
  { value: 'orders', label: '訂單' },
  { value: 'off', label: '停用', disabled: true },
  { value: 'users', label: '會員' },
]

describe('tab logic', () => {
  it('picks the right neighbour after a close, else the left, skipping disabled tabs', () => {
    const items = tabs()
    expect(nextTabAfterClose(items, 'orders')).toBe('users')
    expect(nextTabAfterClose(items, 'users')).toBe('orders')
    expect(nextTabAfterClose(items, 'home')).toBe('orders')
    expect(nextTabAfterClose([{ value: 'x', label: 'X' }], 'x')).toBeUndefined()
    expect(nextTabAfterClose(items, 'missing')).toBeUndefined()
  })

  it('moves a value to an index and drops it into a slot', () => {
    expect(moveTab(['a', 'b', 'c'], 'a', 2)).toEqual(['b', 'c', 'a'])
    expect(moveTab(['a', 'b', 'c'], 'c', -5)).toEqual(['c', 'a', 'b'])
    expect(moveTab(['a', 'b'], 'z', 0)).toEqual(['a', 'b'])
    // Slots count before the dragged tab is taken out.
    expect(dropTab(['a', 'b', 'c'], 'a', 3)).toEqual(['b', 'c', 'a'])
    expect(dropTab(['a', 'b', 'c'], 'a', 1)).toEqual(['a', 'b', 'c'])
    expect(dropTab(['a', 'b', 'c'], 'c', 0)).toEqual(['c', 'a', 'b'])
  })

  it('finds the drop slot from tab midpoints', () => {
    const boxes = [
      { left: 0, width: 100 },
      { left: 100, width: 60 },
    ]
    expect(tabDropSlot(boxes, 10)).toBe(0)
    expect(tabDropSlot(boxes, 60)).toBe(1)
    expect(tabDropSlot(boxes, 140)).toBe(2)
  })

  it('reports overflow and the scroll that reveals a tab', () => {
    expect(tabOverflow({ scrollLeft: 0, clientWidth: 200, scrollWidth: 200 })).toEqual({ start: false, end: false })
    expect(tabOverflow({ scrollLeft: 50, clientWidth: 200, scrollWidth: 400 })).toEqual({ start: true, end: true })
    const view = { scrollLeft: 100, clientWidth: 200 }
    expect(scrollToReveal(view, 150, 50)).toBeUndefined()
    expect(scrollToReveal(view, 20, 50)).toBe(0)
    expect(scrollToReveal(view, 320, 60)).toBe(212)
  })
})

describe('MlTabs editing', () => {
  let wrapper: VueWrapper | undefined
  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    document.body.innerHTML = ''
  })

  // A parent that applies close / reorder the way an app would.
  function mountEditable(extra: Record<string, unknown> = {}) {
    const log: { close: string[]; add: number; reorder: string[][] } = { close: [], add: 0, reorder: [] }
    const items = ref(tabs())
    const active = ref('orders')
    wrapper = mount(
      defineComponent(() => () =>
        h(MlTabs, {
          items: items.value,
          modelValue: active.value,
          'onUpdate:modelValue': (v?: string) => (active.value = v ?? ''),
          closable: true,
          addable: true,
          reorderable: true,
          onClose: (v: string) => {
            log.close.push(v)
            if (v === active.value) active.value = nextTabAfterClose(items.value, v) ?? ''
            items.value = items.value.filter((i) => i.value !== v)
          },
          onAdd: () => log.add++,
          onReorder: (order: string[]) => {
            log.reorder.push(order)
            items.value = order.map((v) => items.value.find((i) => i.value === v)!)
          },
          ...extra,
        }),
      ),
      { attachTo: document.body },
    )
    return { log, items, active }
  }
  const tabEls = () => wrapper!.findAll('[role="tab"]')
  const labels = () => tabEls().map((t) => t.text())

  it('gives closable tabs a close button; an item can opt out', async () => {
    mountEditable()
    await nextTick()
    const closes = wrapper!.findAll('.ml-tabs__close')
    expect(closes.map((b) => b.attributes('aria-label'))).toEqual(['關閉 訂單', '關閉 停用', '關閉 會員'])
    expect(closes[1].attributes('disabled')).toBeDefined()
    expect(closes[0].attributes('tabindex')).toBe('-1')
    expect(wrapper!.get('.ml-tabs__add').attributes('aria-label')).toBe('新增分頁')
    expect(tabEls()[1].attributes('aria-keyshortcuts')).toBe('Delete Alt+ArrowLeft Alt+ArrowRight')
  })

  it('closes from the × without changing selection, and with the middle button', async () => {
    const { log, active } = mountEditable()
    await nextTick()
    await wrapper!.findAll('.ml-tabs__close')[2].trigger('click')
    expect(log.close).toEqual(['users'])
    expect(active.value).toBe('orders')
    tabEls()[0].element.dispatchEvent(new MouseEvent('auxclick', { button: 1, bubbles: true }))
    expect(log.close).toEqual(['users']) // home isn't closable
    tabEls()[1].element.dispatchEvent(new MouseEvent('auxclick', { button: 1, bubbles: true }))
    expect(log.close).toEqual(['users', 'orders'])
  })

  it('closes the focused tab with Delete and moves focus to the neighbour', async () => {
    const { log, active } = mountEditable()
    await nextTick()
    ;(tabEls()[1].element as HTMLElement).focus()
    await tabEls()[1].trigger('keydown', { key: 'Delete' })
    await nextTick()
    expect(log.close).toEqual(['orders'])
    expect(active.value).toBe('users')
    expect(document.activeElement?.textContent).toBe('會員')
    await tabEls()[0].trigger('keydown', { key: 'Backspace' })
    expect(log.close).toEqual(['orders'])
  })

  it('emits add', async () => {
    const { log } = mountEditable()
    await wrapper!.get('.ml-tabs__add').trigger('click')
    expect(log.add).toBe(1)
  })

  it('reorders with Alt + arrows, keeps focus and announces the move', async () => {
    const { log } = mountEditable()
    await nextTick()
    ;(tabEls()[1].element as HTMLElement).focus()
    await tabEls()[1].trigger('keydown', { key: 'ArrowRight', altKey: true })
    await nextTick()
    expect(log.reorder).toEqual([['home', 'off', 'orders', 'users']])
    expect(labels()).toEqual(['首頁', '停用', '訂單', '會員'])
    expect(document.activeElement?.textContent).toBe('訂單')
    expect(wrapper!.get('[aria-live="polite"]').text()).toBe('訂單 移到第 3 個，共 4 個')
    // Already first: nothing to do.
    await tabEls()[0].trigger('keydown', { key: 'ArrowLeft', altKey: true })
    expect(log.reorder).toHaveLength(1)
  })

  it('drags a tab past its neighbours with a drop indicator', async () => {
    const { log } = mountEditable()
    await nextTick()
    // Each tab box is 100px wide, side by side.
    const boxes = [...document.querySelectorAll<HTMLElement>('.ml-tabs__list > .ml-tabs__item, .ml-tabs__list > .ml-tabs__tab')]
    boxes.forEach((el, i) => {
      el.getBoundingClientRect = () => ({ left: i * 100, width: 100, right: i * 100 + 100, top: 0, bottom: 40, height: 40, x: i * 100, y: 0, toJSON() {} }) as DOMRect
    })
    const pe = (type: string, x: number) => new PointerEvent(type, { clientX: x, button: 0, pointerId: 1, pointerType: 'mouse', bubbles: true, cancelable: true })
    tabEls()[1].element.dispatchEvent(pe('pointerdown', 150))
    window.dispatchEvent(pe('pointermove', 152)) // under the drag threshold
    await nextTick()
    expect(wrapper!.find('.ml-tabs__drop').exists()).toBe(false)
    window.dispatchEvent(pe('pointermove', 380))
    await nextTick()
    expect(wrapper!.find('.ml-tabs__drop').exists()).toBe(true)
    expect(tabEls()[1].classes()).toContain('ml-tabs__tab--dragging')
    window.dispatchEvent(pe('pointerup', 380))
    await nextTick()
    expect(log.reorder).toEqual([['home', 'off', 'users', 'orders']])
    expect(wrapper!.find('.ml-tabs__drop').exists()).toBe(false)
  })

  it('keeps the old markup when editing is off', () => {
    wrapper = mount(MlTabs, { props: { items: tabs() } })
    expect(wrapper.find('.ml-tabs__item').exists()).toBe(false)
    expect(wrapper.find('.ml-tabs__add').exists()).toBe(false)
    expect(wrapper.find('[aria-live]').exists()).toBe(false)
    expect(wrapper.findAll('[role="tab"]')[1].attributes('aria-keyshortcuts')).toBeUndefined()
  })

  it('shows scroll buttons when the strip overflows', async () => {
    wrapper = mount(MlTabs, { props: { items: tabs() }, attachTo: document.body })
    const list = wrapper.get('.ml-tabs__list').element as HTMLElement
    Object.defineProperties(list, { clientWidth: { value: 200 }, scrollWidth: { value: 500 } })
    list.scrollLeft = 100
    await wrapper.get('.ml-tabs__list').trigger('scroll')
    expect(wrapper.get('.ml-tabs__bar').classes()).toEqual(expect.arrayContaining(['ml-tabs__bar--more-start', 'ml-tabs__bar--more-end']))
    expect(wrapper.findAll('.ml-tabs__scroll').map((b) => b.attributes('aria-label'))).toEqual(['向左捲動分頁', '向右捲動分頁'])
  })
})
