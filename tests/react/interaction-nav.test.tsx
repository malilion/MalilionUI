import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, createRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Accordion, Affix, Anchor, BackTop, ContextMenu, FloatButton, Menu, NavBar, TabBar, Tour, type AffixHandle, type ContextMenuHandle } from '../../src/react/nav'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined
function render(el: React.ReactElement) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(el))
  return host
}
const key = (el: Element, k: string, init: KeyboardEventInit = {}) =>
  act(() => void el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init })))
const click = (el: Element | null) => act(() => void (el as HTMLElement).click())
const flush = (ms = 50) => act(() => new Promise((r) => setTimeout(r, ms)))
const $ = (sel: string) => document.querySelector<HTMLElement>(sel)!
const $$ = (sel: string) => [...document.querySelectorAll<HTMLElement>(sel)]
const rect = (top: number, height = 20) => () => ({ top, bottom: top + height, left: 0, right: 100, width: 100, height, x: 0, y: top, toJSON() {} }) as DOMRect

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
  document.documentElement.style.overflow = ''
})

const items = [
  { key: 'home', label: 'Home' },
  { key: 'set', label: 'Settings', children: [{ key: 'profile', label: 'Profile' }, { key: 'keys', label: 'Keys' }] },
  { key: 'more', label: 'More', children: [{ key: 'x', label: 'X' }] },
  { key: 'off', label: 'Off', disabled: true },
]

describe('React nav', () => {
  it('Menu (vertical) toggles inline submenus, selects and lights the path', () => {
    const onChange = vi.fn()
    const onSelect = vi.fn()
    render(<Menu items={items} onChange={onChange} onSelect={onSelect} />)
    const [, settings] = $$('.ml-menu__link')
    expect(settings.getAttribute('aria-expanded')).toBe('false')
    expect(settings.closest('li')!.querySelector('.ml-menu__sub')!.hasAttribute('inert')).toBe(true)
    click(settings)
    expect(settings.getAttribute('aria-expanded')).toBe('true')
    expect(settings.closest('li')!.querySelector('.ml-menu__sub')!.hasAttribute('inert')).toBe(false)
    click($$('.ml-menu__link').find((l) => l.textContent === 'Profile')!)
    expect(onChange).toHaveBeenCalledWith('profile')
    expect(onSelect).toHaveBeenCalledWith(items[1].children![0])
    expect(settings.closest('li')!.classList.contains('ml-menu__item--in-path')).toBe(true)
    // Inline submenus stay open after a choice.
    expect(settings.getAttribute('aria-expanded')).toBe('true')
    click($$('.ml-menu__link').find((l) => l.textContent === 'Off')!)
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('Menu arrow keys skip closed submenus and disabled items; accordion keeps one open', () => {
    render(<Menu items={items} accordion />)
    const links = () => $$('.ml-menu__link')
    links()[0].focus()
    key(links()[0], 'ArrowDown')
    expect(document.activeElement?.textContent).toBe('Settings')
    key(document.activeElement!, 'ArrowDown')
    expect(document.activeElement?.textContent).toBe('More')
    key(document.activeElement!, 'ArrowDown')
    expect(document.activeElement?.textContent).toBe('Home')
    key(document.activeElement!, 'End')
    expect(document.activeElement?.textContent).toBe('More')
    click(links()[1])
    click(links().find((l) => l.textContent === 'More')!)
    expect(links()[1].getAttribute('aria-expanded')).toBe('false')
  })

  it('Menu (horizontal) opens a popup from the keyboard, walks it, and Escape returns focus', async () => {
    const onChange = vi.fn()
    render(<Menu items={items} mode="horizontal" onChange={onChange} />)
    const settings = $$('.ml-menu__link')[1]
    settings.focus()
    key(settings, 'ArrowRight')
    expect(document.activeElement?.textContent).toBe('More')
    key(document.activeElement!, 'ArrowLeft')
    expect(document.activeElement).toBe(settings)
    key(settings, 'ArrowDown')
    await flush()
    expect($('.ml-menu__popup--root')).toBeTruthy()
    expect(document.activeElement?.textContent).toBe('Profile')
    key(document.activeElement!, 'ArrowDown')
    expect(document.activeElement?.textContent).toBe('Keys')
    key(document.activeElement!, 'Escape')
    expect(document.activeElement).toBe(settings)
    expect(settings.getAttribute('aria-expanded')).toBe('false')
    await flush(200)
    expect(document.querySelector('.ml-menu__popup')).toBeNull()
    // Choosing inside a popup closes it; an outside pointerdown closes too.
    click(settings)
    await flush()
    click($$('.ml-menu__popup .ml-menu__link')[0])
    expect(onChange).toHaveBeenCalledWith('profile')
    expect(settings.getAttribute('aria-expanded')).toBe('false')
    click(settings)
    act(() => void document.body.dispatchEvent(new Event('pointerdown', { bubbles: true })))
    expect(settings.getAttribute('aria-expanded')).toBe('false')
  })

  it('Menu (collapsed) opens fly-outs on hover and closes them after a grace period', async () => {
    render(<Menu items={items} collapsed />)
    const li = $$('.ml-menu__item')[1]
    act(() => void li.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: document.body })))
    await flush()
    expect(li.querySelector('.ml-menu__popup--side .ml-menu__popup-title')?.textContent).toBe('Settings')
    act(() => void li.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body })))
    await flush(300)
    await flush(300)
    expect(li.querySelector('.ml-menu__popup')).toBeNull()
  })

  it('ContextMenu opens on right-click and Shift+F10, navigates, selects and restores focus', async () => {
    const onSelect = vi.fn()
    const onOpen = vi.fn()
    const ref = createRef<ContextMenuHandle>()
    const host = render(
      <ContextMenu ref={ref} items={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B', disabled: true }, { value: 'c', label: 'C', divider: true }]} onSelect={onSelect} onOpen={onOpen}>
        {({ open }) => <button id="t">{open ? 'open' : 'closed'}</button>}
      </ContextMenu>,
    )
    const target = host.querySelector<HTMLButtonElement>('#t')!
    target.focus()
    act(() => void target.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 40, clientY: 50 })))
    await flush()
    expect(onOpen).toHaveBeenCalledOnce()
    expect(target.textContent).toBe('open')
    const menu = $('.ml-ctx__menu')
    expect(menu.getAttribute('role')).toBe('menu')
    expect(menu.style.left).toBe('40px')
    expect(document.activeElement?.textContent).toBe('A')
    key(document.activeElement!, 'ArrowDown')
    expect(document.activeElement?.textContent).toBe('C')
    key(document.activeElement!, 'Enter')
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ value: 'c' }))
    expect(document.activeElement).toBe(target)
    expect(target.textContent).toBe('closed')
    await flush(200)
    key(target, 'F10', { shiftKey: true })
    await flush()
    expect(document.querySelector('.ml-ctx__menu')).toBeTruthy()
    key(document.activeElement!, 'Escape')
    expect(document.activeElement).toBe(target)
    act(() => ref.current!.open(1, 2))
    await flush()
    expect(target.textContent).toBe('open')
    act(() => void document.body.dispatchEvent(new Event('pointerdown', { bubbles: true })))
    expect(target.textContent).toBe('closed')
  })

  it('NavBar back and TabBar selection/action', () => {
    const onBack = vi.fn()
    const onAction = vi.fn()
    const onChange = vi.fn()
    render(
      <>
        <NavBar title="T" back onBack={onBack} />
        <TabBar items={[{ value: 'a', label: 'A', icon: 'home' }, { value: 'b', label: 'B', icon: 'user' }]} actionLabel="New" defaultValue="a" onChange={onChange} onAction={onAction} />
      </>,
    )
    click($('.ml-navbar__icon-btn'))
    expect(onBack).toHaveBeenCalledOnce()
    const buttons = $$('.ml-tabbar > button')
    expect(buttons.map((b) => b.className.split(' ')[0])).toEqual(['ml-tabbar__item', 'ml-tabbar__action', 'ml-tabbar__item'])
    click(buttons[2])
    expect(onChange).toHaveBeenCalledWith('b')
    expect(buttons[2].getAttribute('aria-current')).toBe('page')
    expect(buttons[0].getAttribute('aria-current')).toBeNull()
    click(buttons[1])
    expect(onAction).toHaveBeenCalledOnce()
  })

  it('Anchor spies on scroll and jumps on click', async () => {
    const box = document.createElement('div')
    box.id = 'box'
    for (const [id, top] of [['a', 0], ['b', 300]] as const) {
      const s = document.createElement('section')
      s.id = id
      s.getBoundingClientRect = rect(top)
      box.appendChild(s)
    }
    box.scrollTo = vi.fn() as never
    document.body.appendChild(box)
    const onChange = vi.fn()
    render(<Anchor items={[{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }]} container={box} updateHash={false} onChange={onChange} />)
    expect(onChange).toHaveBeenLastCalledWith('a')
    expect($('.ml-anchor__link--active').textContent).toBe('A')
    $('#b').getBoundingClientRect = rect(4)
    act(() => void box.dispatchEvent(new Event('scroll')))
    await flush()
    expect(onChange).toHaveBeenLastCalledWith('b')
    expect($('.ml-anchor__link--active').getAttribute('aria-current')).toBe('location')
    act(() => void $$('.ml-anchor__link')[0].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })))
    expect(box.scrollTo).toHaveBeenCalled()
    expect(onChange).toHaveBeenLastCalledWith('a')
    expect(document.activeElement).toBe($('#a'))
  })

  it('Affix pins past the offset and exposes update()', () => {
    const onChange = vi.fn()
    const ref = createRef<AffixHandle>()
    render(
      <Affix ref={ref} onChange={onChange}>
        {({ fixed }) => <span id="c">{fixed ? 'fixed' : 'static'}</span>}
      </Affix>,
    )
    expect($('#c').textContent).toBe('static')
    $('.ml-affix').getBoundingClientRect = rect(-50, 30)
    act(() => ref.current!.update())
    expect(onChange).toHaveBeenCalledWith(true)
    expect($('#c').textContent).toBe('fixed')
    const inner = $('.ml-affix__inner')
    expect(inner.classList.contains('ml-affix__inner--fixed')).toBe(true)
    expect(inner.style.position).toBe('fixed')
    expect(inner.style.top).toBe('0px')
    expect($('.ml-affix').style.height).toBe('30px')
    $('.ml-affix').getBoundingClientRect = rect(40, 30)
    act(() => ref.current!.update())
    expect(onChange).toHaveBeenLastCalledWith(false)
  })

  it('BackTop appears past the threshold and scrolls its container to the top', async () => {
    const box = document.createElement('div')
    Object.defineProperties(box, { scrollHeight: { value: 2000 }, clientHeight: { value: 500 } })
    box.scrollTo = vi.fn() as never
    document.body.appendChild(box)
    const onClick = vi.fn()
    render(<BackTop target={box} visibilityHeight={100} onClick={onClick} />)
    expect(document.querySelector('.ml-backtop')).toBeNull()
    box.scrollTop = 750
    act(() => void box.dispatchEvent(new Event('scroll')))
    await flush()
    const btn = $('.ml-backtop')
    expect(Number(btn.querySelector('.ml-backtop__progress')!.getAttribute('stroke-dashoffset'))).toBeCloseTo(Math.PI * 25)
    click(btn)
    expect(box.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
    expect(onClick).toHaveBeenCalledOnce()
    box.scrollTop = 0
    act(() => void box.dispatchEvent(new Event('scroll')))
    await flush(300)
    await flush(300)
    expect(document.querySelector('.ml-backtop')).toBeNull()
  })

  it('FloatButton toggles its speed dial, selects, and closes on Escape / outside', () => {
    const onSelect = vi.fn()
    const onClick = vi.fn()
    render(
      <>
        <FloatButton actions={[{ key: 'a', label: 'Add', icon: 'plus' }]} onSelect={onSelect} />
        <FloatButton label="Solo" inline onClick={onClick} />
      </>,
    )
    const [main, solo] = $$('.ml-fab__main')
    click(solo)
    expect(onClick).toHaveBeenCalledOnce()
    expect(main.getAttribute('aria-expanded')).toBe('false')
    click(main)
    expect(main.getAttribute('aria-expanded')).toBe('true')
    expect($('.ml-fab__action').tabIndex).toBe(0)
    click($('.ml-fab__action'))
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ key: 'a' }))
    expect(main.getAttribute('aria-expanded')).toBe('false')
    click(main)
    $('.ml-fab__action').focus()
    key(document.activeElement!, 'Escape')
    expect(main.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(main)
    click(main)
    act(() => void document.body.dispatchEvent(new Event('pointerdown', { bubbles: true })))
    expect(main.getAttribute('aria-expanded')).toBe('false')
  })

  it('Tour walks its steps, spotlights targets, locks scroll and finishes', async () => {
    const target = document.createElement('div')
    target.id = 'tgt'
    target.getBoundingClientRect = rect(100, 40)
    document.body.appendChild(target)
    const onFinish = vi.fn()
    const onClose = vi.fn()
    function Demo() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button id="go" onClick={() => setOpen(true)}>Go</button>
          <Tour steps={[{ title: 'One', target: '#tgt' }, { title: 'Two', content: 'Plain' }]} open={open} onOpenChange={setOpen} onFinish={onFinish} onClose={onClose}>
            {({ step, index }) => (index === 0 ? <b>Rich {step.title}</b> : undefined)}
          </Tour>
        </>
      )
    }
    render(<Demo />)
    const go = $('#go')
    go.focus()
    click(go)
    await flush()
    expect(document.documentElement.style.overflow).toBe('hidden')
    expect($('.ml-tour__spot').style.top).toBe('92px')
    expect($('.ml-tour__body').textContent).toBe('Rich One')
    expect(document.activeElement).toBe($('.ml-tour__card'))
    key($('.ml-tour__card'), 'ArrowRight')
    await flush()
    expect($('.ml-tour__title').textContent).toBe('Two')
    expect(document.querySelector('.ml-tour__spot')).toBeNull()
    expect($('.ml-tour__dim')).toBeTruthy()
    expect($$('.ml-tour__dots i').map((i) => i.className)).toEqual(['done', 'on'])
    key($('.ml-tour__card'), 'ArrowLeft')
    expect($('.ml-tour__title').textContent).toBe('One')
    key($('.ml-tour__card'), 'Escape')
    expect(onClose).toHaveBeenCalledWith(0)
    expect(document.activeElement).toBe(go)
    expect(document.documentElement.style.overflow).toBe('')
    await flush(400)
    click(go)
    await flush()
    click($$('.ml-tour__foot button').at(-1)!)
    click($$('.ml-tour__foot button').at(-1)!)
    expect(onFinish).toHaveBeenCalledOnce()
  })

  it('Accordion: single closes siblings, multiple keeps them, disabled stays shut', () => {
    const acc = [
      { value: 'a', title: 'A', content: 'x' },
      { value: 'b', title: 'B', content: 'y' },
      { value: 'c', title: 'C', disabled: true },
    ]
    const onChange = vi.fn()
    const host = render(<Accordion items={acc} onChange={onChange}>{(item) => (item.value === 'b' ? <em>rich</em> : undefined)}</Accordion>)
    const triggers = [...host.querySelectorAll<HTMLButtonElement>('.ml-accordion__trigger')]
    expect(host.querySelectorAll('.ml-accordion__content')[1].innerHTML).toBe('<em>rich</em>')
    click(triggers[0])
    expect(onChange).toHaveBeenLastCalledWith(['a'])
    click(triggers[1])
    expect(onChange).toHaveBeenLastCalledWith(['b'])
    expect(triggers[0].getAttribute('aria-expanded')).toBe('false')
    expect(host.querySelectorAll('.ml-accordion__panel')[0].hasAttribute('inert')).toBe(true)
    expect(triggers[2].disabled).toBe(true)
  })

  it('Accordion multiple', () => {
    const onChange = vi.fn()
    const host = render(<Accordion items={[{ value: 'a', title: 'A' }, { value: 'b', title: 'B' }]} multiple onChange={onChange} />)
    const [a, b] = host.querySelectorAll<HTMLButtonElement>('.ml-accordion__trigger')
    click(a)
    click(b)
    expect(onChange).toHaveBeenLastCalledWith(['a', 'b'])
    click(a)
    expect(onChange).toHaveBeenLastCalledWith(['b'])
  })
})
