import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { CommandPalette, DialogHost, Drawer, Dropdown, Popconfirm, Popover, confirm } from '../../src/react/popups'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined
function render(el: React.ReactElement) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(el))
  return host
}
const key = (el: Element, k: string) => act(() => void el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })))
const click = (el: Element | null) => act(() => void (el as HTMLElement).click())
const flush = (ms = 50) => act(() => new Promise((r) => setTimeout(r, ms)))

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
  document.documentElement.style.overflow = ''
})

describe('React popups', () => {
  it('Drawer opens, locks scroll, closes on Escape and returns focus', () => {
    const onClose = vi.fn()
    function Demo() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button id="opener" onClick={() => setOpen(true)}>Open</button>
          <Drawer open={open} onOpenChange={setOpen} onClose={onClose} title="Settings">
            Body
          </Drawer>
        </>
      )
    }
    const host = render(<Demo />)
    const opener = host.querySelector<HTMLButtonElement>('#opener')!
    opener.focus()
    click(opener)
    const panel = document.querySelector('.ml-drawer__panel')!
    expect(panel.getAttribute('role')).toBe('dialog')
    expect(document.activeElement).toBe(panel)
    expect(document.documentElement.style.overflow).toBe('hidden')
    key(panel, 'Escape')
    expect(onClose).toHaveBeenCalledOnce()
    expect(document.activeElement).toBe(opener)
    expect(document.documentElement.style.overflow).toBe('')
  })

  it('Popover toggles on click and closes on an outside pointerdown', () => {
    const host = render(
      <Popover title="Info" content="Details">
        <button>Trigger</button>
      </Popover>,
    )
    const btn = host.querySelector('button')!
    click(btn)
    expect(btn.getAttribute('aria-expanded')).toBe('true')
    expect(host.querySelector('.ml-popover__body')?.textContent).toBe('Details')
    expect(btn.getAttribute('aria-controls')).toBe(host.querySelector('.ml-popover__panel')!.id)
    click(btn)
    expect(btn.getAttribute('aria-expanded')).toBe('false')
    click(btn)
    act(() => void document.body.dispatchEvent(new Event('pointerdown', { bubbles: true })))
    expect(host.querySelector('.ml-popover')!.classList.contains('ml-popover--open')).toBe(false)
  })

  it('Dropdown moves with the keyboard, skips disabled items and selects', () => {
    const onSelect = vi.fn()
    const onChange = vi.fn()
    const host = render(
      <Dropdown
        label="Actions"
        selectable
        onSelect={onSelect}
        onChange={onChange}
        items={[
          { value: 'a', label: 'Alpha' },
          { value: 'b', label: 'Beta', disabled: true },
          { value: 'c', label: 'Charlie' },
          { value: 'd', label: 'Delta' },
        ]}
      />,
    )
    const trigger = host.querySelector('[aria-haspopup="menu"]')!
    key(trigger, 'ArrowDown')
    const items = host.querySelectorAll('[role="menuitemradio"]')
    expect(document.activeElement).toBe(items[0])
    key(items[0], 'ArrowDown')
    expect(document.activeElement).toBe(items[2])
    key(items[2], 'End')
    expect(document.activeElement).toBe(items[3])
    key(items[3], 'Home')
    expect(document.activeElement).toBe(items[0])
    key(items[0], 'c')
    expect(document.activeElement).toBe(items[2])
    key(items[2], 'Enter')
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ value: 'c' }))
    expect(onChange).toHaveBeenCalledWith('c')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(trigger)
    expect(trigger.textContent).toContain('Charlie')
  })

  it('Popconfirm focuses cancel and reports confirm / cancel', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const host = render(
      <Popconfirm title="Delete?" tone="danger" confirmText="Yes" cancelText="No" onConfirm={onConfirm} onCancel={onCancel}>
        <button>Remove</button>
      </Popconfirm>,
    )
    const btn = host.querySelector('button')!
    click(btn)
    const [cancel, ok] = host.querySelectorAll<HTMLButtonElement>('.ml-popconfirm__actions button')
    expect(document.activeElement).toBe(cancel)
    expect(ok.classList.contains('ml-btn--danger')).toBe(true)
    click(cancel)
    expect(onCancel).toHaveBeenCalledOnce()
    expect(btn.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(btn)
    click(btn)
    click(host.querySelectorAll('.ml-popconfirm__actions button')[1])
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('confirm() resolves through <DialogHost> buttons', async () => {
    render(<DialogHost />)
    let first!: Promise<boolean>
    await act(async () => void (first = confirm({ title: 'Ship?', message: 'Deploy now' })))
    expect(document.querySelector('.ml-dialog__message')?.textContent).toBe('Deploy now')
    const confirmBtn = () => document.querySelectorAll<HTMLButtonElement>('.ml-modal__footer button')
    click(confirmBtn()[1])
    await expect(first).resolves.toBe(true)
    await flush(260)

    let second!: Promise<boolean>
    await act(async () => void (second = confirm.danger('Really?')))
    expect(document.querySelector('.ml-dialog__body--danger')).not.toBeNull()
    click(confirmBtn()[0])
    await expect(second).resolves.toBe(false)
    await flush(260)

    let third!: Promise<string | null>
    await act(async () => void (third = confirm.prompt({ title: 'Rename', prompt: { defaultValue: 'Nala' } })))
    expect(document.querySelector<HTMLInputElement>('#ml-dialog-input')?.value).toBe('Nala')
    click(confirmBtn()[1])
    await expect(third).resolves.toBe('Nala')
  })

  it('CommandPalette filters and runs the active item on Enter', () => {
    const onSelect = vi.fn()
    render(
      <CommandPalette
        defaultOpen
        onSelect={onSelect}
        items={[
          { value: 'home', label: 'Go home', group: 'Nav' },
          { value: 'settings', label: 'Open settings', group: 'Nav' },
          { value: 'theme', label: 'Toggle theme', keywords: ['dark'] },
        ]}
      />,
    )
    const input = document.querySelector<HTMLInputElement>('.ml-cmd__input')!
    expect(document.activeElement).toBe(input)
    expect(document.querySelectorAll('[role="option"]')).toHaveLength(3)
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      setter.call(input, 'sett')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const options = document.querySelectorAll('[role="option"]')
    expect(options).toHaveLength(1)
    expect(options[0].querySelector('mark')?.textContent).toBe('sett')
    key(input, 'Enter')
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ value: 'settings' }))
  })

  it('CommandPalette toggles with its global shortcut', () => {
    render(<CommandPalette items={[{ value: 'a', label: 'A' }]} shortcut="ctrl+k" />)
    expect(document.querySelector('.ml-cmd')).toBeNull()
    act(() => void window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true })))
    expect(document.querySelector('.ml-cmd')).not.toBeNull()
  })
})
