// Clipboard core (src/clipboard.ts), useClipboard() and MlCopyButton.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { MlConfigProvider, MlCopyButton, copyRich, copyText, en, isClipboardSupported, useClipboard } from '../src'

function setClipboard(value: unknown) {
  Object.defineProperty(navigator, 'clipboard', { value, configurable: true })
}

function stubExec(result: boolean | 'throw') {
  const exec = vi.fn((cmd: string) => {
    if (result === 'throw') throw new Error('nope')
    return cmd === 'copy' && result
  })
  Object.defineProperty(document, 'execCommand', { value: exec, configurable: true, writable: true })
  return exec
}

afterEach(() => {
  setClipboard(undefined)
  vi.useRealTimers()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

describe('copyText', () => {
  it('uses navigator.clipboard.writeText when it works', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    setClipboard({ writeText })
    const exec = stubExec(true)
    expect(await copyText('吼')).toBe(true)
    expect(writeText).toHaveBeenCalledWith('吼')
    expect(exec).not.toHaveBeenCalled()
  })

  it('falls back to a hidden textarea + execCommand when the API rejects (non-secure context)', async () => {
    setClipboard({ writeText: vi.fn().mockRejectedValue(new DOMException('denied', 'NotAllowedError')) })
    let seen = ''
    const exec = vi.fn(() => {
      seen = document.querySelector('textarea')?.value ?? ''
      return true
    })
    Object.defineProperty(document, 'execCommand', { value: exec, configurable: true, writable: true })
    const input = document.body.appendChild(document.createElement('input'))
    input.focus()
    expect(await copyText('paw print')).toBe(true)
    expect(exec).toHaveBeenCalledWith('copy')
    expect(seen).toBe('paw print')
    // Cleans up after itself and gives focus back.
    expect(document.querySelector('textarea')).toBeNull()
    expect(document.activeElement).toBe(input)
  })

  it('falls back when navigator.clipboard is missing, and reports failure honestly', async () => {
    setClipboard(undefined)
    stubExec(true)
    expect(await copyText('a')).toBe(true)
    stubExec(false)
    expect(await copyText('b')).toBe(false)
    stubExec('throw')
    expect(await copyText('c')).toBe(false)
    expect(document.querySelector('textarea')).toBeNull()
  })

  it('isClipboardSupported sees either path', () => {
    setClipboard({ writeText: vi.fn() })
    expect(isClipboardSupported()).toBe(true)
  })
})

describe('copyRich', () => {
  it('writes text/plain + text/html through ClipboardItem', async () => {
    const write = vi.fn().mockResolvedValue(undefined)
    const writeText = vi.fn()
    setClipboard({ write, writeText })
    class FakeItem {
      constructor(public data: Record<string, Blob>) {}
    }
    vi.stubGlobal('ClipboardItem', FakeItem)
    expect(await copyRich({ text: 'Lion', html: '<b>Lion</b>' })).toBe(true)
    const item = write.mock.calls[0][0][0] as FakeItem
    expect(Object.keys(item.data).sort()).toEqual(['text/html', 'text/plain'])
    expect(await item.data['text/html'].text()).toBe('<b>Lion</b>')
    expect(writeText).not.toHaveBeenCalled()
  })

  it('degrades to plain text without ClipboardItem', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    setClipboard({ writeText })
    vi.stubGlobal('ClipboardItem', undefined)
    expect(await copyRich({ text: 'Lion', html: '<b>Lion</b>' })).toBe(true)
    expect(writeText).toHaveBeenCalledWith('Lion')
  })
})

describe('useClipboard', () => {
  it('copied flips on and resets after the timeout; error on failure', async () => {
    vi.useFakeTimers()
    setClipboard({ writeText: vi.fn().mockResolvedValue(undefined) })
    let api!: ReturnType<typeof useClipboard>
    const w = mount(
      defineComponent({
        setup() {
          api = useClipboard({ timeout: 500 })
          return () => h('span', api.copied.value ? 'yes' : 'no')
        },
      }),
    )
    expect(api.isSupported.value).toBe(true)
    expect(await api.copy(() => 'getter')).toBe(true)
    await nextTick()
    expect(w.text()).toBe('yes')
    vi.advanceTimersByTime(499)
    await nextTick()
    expect(api.copied.value).toBe(true)
    vi.advanceTimersByTime(2)
    expect(api.copied.value).toBe(false)

    setClipboard(undefined)
    stubExec(false)
    expect(await api.copy('x')).toBe(false)
    expect(api.error.value).toBeInstanceOf(Error)
    expect(api.copied.value).toBe(false)
    w.unmount()
  })
})

describe('MlCopyButton', () => {
  beforeEach(() => setClipboard({ writeText: vi.fn().mockResolvedValue(undefined) }))

  it('copies, swaps icon + label, pops a paw and announces politely', async () => {
    const w = mount(MlCopyButton, { props: { value: 'npm i @malilion/ui' }, attachTo: document.body })
    const btn = w.get('button')
    expect(btn.attributes('aria-label')).toBe('複製')
    expect(w.get('.ml-copy__tip').text()).toBe('複製')
    expect(w.get('[role=status]').attributes('aria-live')).toBe('polite')
    expect(w.find('.ml-copy__paw').exists()).toBe(false)
    expect(btn.classes()).toEqual(expect.arrayContaining(['ml-btn', 'ml-btn--ghost', 'ml-btn--square']))
    const pathBefore = w.get('.ml-copy__glyph path').attributes('d')

    await btn.trigger('click')
    await flushPromises()
    expect((navigator.clipboard.writeText as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith('npm i @malilion/ui')
    expect(w.emitted('copy')).toEqual([['npm i @malilion/ui']])
    expect(w.classes()).toContain('ml-copy--copied')
    expect(btn.attributes('aria-label')).toBe('已複製！')
    expect(w.get('[role=status]').text()).toBe('已複製！')
    expect(w.find('.ml-copy__paw').exists()).toBe(true)
    expect(w.get('.ml-copy__glyph path').attributes('d')).not.toBe(pathBefore)
    w.unmount()
  })

  it('button variant shows text; inline variant shows the value (or the slot); getters run at click time', async () => {
    let n = 0
    const w = mount(MlCopyButton, { props: { value: () => `v${++n}`, variant: 'button', size: 'sm' } })
    expect(w.get('.ml-copy__label').text()).toBe('複製')
    expect(w.get('button').attributes('aria-label')).toBeUndefined()
    expect(w.find('.ml-copy__tip').exists()).toBe(false)
    await w.get('button').trigger('click')
    await flushPromises()
    expect(w.emitted('copy')).toEqual([['v1']])
    expect(w.get('.ml-copy__label').text()).toBe('已複製！')

    const inline = mount(MlCopyButton, { props: { value: 'TOKEN-123', variant: 'inline' } })
    expect(inline.get('.ml-copy__text').text()).toBe('TOKEN-123')
    const slotted = mount(MlCopyButton, { props: { value: 'x', variant: 'inline' }, slots: { default: () => '顯示文字' } })
    expect(slotted.get('.ml-copy__text').text()).toBe('顯示文字')
  })

  it('emits error and shows the failed label when nothing can copy', async () => {
    setClipboard(undefined)
    stubExec(false)
    const w = mount(MlCopyButton, { props: { value: 'x' } })
    await w.get('button').trigger('click')
    await flushPromises()
    expect(w.emitted('error')?.[0][0]).toBeInstanceOf(Error)
    expect(w.emitted('copy')).toBeUndefined()
    expect(w.classes()).toContain('ml-copy--failed')
    expect(w.get('button').attributes('aria-label')).toBe('複製失敗，請手動選取')
  })

  it('disabled does nothing; English locale; custom labels', async () => {
    const w = mount(MlCopyButton, { props: { value: 'x', disabled: true } })
    await w.get('button').trigger('click')
    await flushPromises()
    expect(w.emitted('copy')).toBeUndefined()
    const e = mount({ render: () => h(MlConfigProvider, { locale: en }, () => h(MlCopyButton, { value: 'x' })) })
    expect(e.get('button').attributes('aria-label')).toBe('Copy')
    const c = mount(MlCopyButton, { props: { value: 'x', label: '拿走', copiedLabel: '拿到了' } })
    expect(c.get('button').attributes('aria-label')).toBe('拿走')
    await c.get('button').trigger('click')
    await flushPromises()
    expect(c.get('button').attributes('aria-label')).toBe('拿到了')
  })
})
