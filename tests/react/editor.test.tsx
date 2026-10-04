// RichTextEditor (@malilion/ui/react/editor): markup parity with MlRichTextEditor, then a real Tiptap editor in React.
import { afterEach, describe, expect, it } from 'vitest'
import { act, createRef, StrictMode, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MlRichTextEditor } from '../../src/editor'
import { RichTextEditor, type RichTextEditorHandle } from '../../src/react/editor'
import { react, vue } from './parity-utils'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('RichTextEditor parity', () => {
  const cases: [string, Record<string, unknown>, () => string][] = [
    ['default', {}, () => react(<RichTextEditor />)],
    ['field', { label: 'Body', hint: 'Markdown-ish', index: '01', required: true }, () => react(<RichTextEditor label="Body" hint="Markdown-ish" index="01" required />)],
    ['error + count', { error: 'Required', maxLength: 200 }, () => react(<RichTextEditor error="Required" maxLength={200} />)],
    ['custom toolbar', { toolbar: ['|', 'h1', 'bold', '|', '|', 'link', 'clear', '|'], showCount: true }, () => react(<RichTextEditor toolbar={['|', 'h1', 'bold', '|', '|', 'link', 'clear', '|']} showCount />)],
    ['no toolbar', { toolbar: false, disabled: true }, () => react(<RichTextEditor toolbar={false} disabled />)],
    ['readonly', { readonly: true }, () => react(<RichTextEditor readOnly />)],
  ]
  for (const [name, props, render] of cases) {
    it(name, async () => {
      expect(render()).toBe(await vue(MlRichTextEditor, props))
    })
  }
})

let root: Root | undefined
function render(el: React.ReactElement) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(el))
  return host
}
const content = () => document.querySelector('.ml-editor__content') as HTMLElement
const tool = (label: string) => document.querySelector(`.ml-editor__tool[aria-label="${label}"]`) as HTMLButtonElement
const click = (el: Element) => act(() => (el as HTMLElement).click())

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
})

describe('RichTextEditor', () => {
  it('controlled: toolbar commands call onChange, outside values load without echo', () => {
    const changes: string[] = []
    const ref = createRef<RichTextEditorHandle>()
    let set: (v: string) => void = () => {}
    function App() {
      const [html, setHtml] = useState('<p>roar</p>')
      set = setHtml
      return (
        <RichTextEditor
          ref={ref}
          value={html}
          onChange={(v) => {
            changes.push(v)
            setHtml(v)
          }}
          maxLength={50}
        />
      )
    }
    render(<App />)
    expect(content().textContent).toBe('roar')
    expect(document.querySelector('.ml-editor__count')?.textContent).toBe('4 / 50 字')
    act(() => void ref.current!.editor!.commands.setTextSelection({ from: 1, to: 5 }))
    click(tool('斜體'))
    expect(changes.at(-1)).toBe('<p><em>roar</em></p>')
    expect(tool('斜體').getAttribute('aria-pressed')).toBe('true')
    const before = changes.length
    act(() => set('<p>new</p>'))
    expect(content().textContent).toBe('new')
    expect(changes.length).toBe(before)
  })

  it('uncontrolled with defaultValue; empty document is an empty string', () => {
    const changes: string[] = []
    const ref = createRef<RichTextEditorHandle>()
    render(<RichTextEditor ref={ref} defaultValue="<p>x</p>" onChange={(v) => changes.push(v)} />)
    act(() => void ref.current!.editor!.commands.clearContent(true))
    expect(changes).toEqual([''])
  })

  it('StrictMode leaves a single editor view', () => {
    render(
      <StrictMode>
        <RichTextEditor defaultValue="<p>one</p>" />
      </StrictMode>,
    )
    expect(document.querySelectorAll('.ml-editor__body > .ProseMirror')).toHaveLength(1)
    expect(content().textContent).toBe('one')
  })

  it('link bar refuses script URLs and sets real ones', () => {
    const ref = createRef<RichTextEditorHandle>()
    render(<RichTextEditor ref={ref} defaultValue="<p>docs</p>" />)
    act(() => void ref.current!.editor!.commands.setTextSelection({ from: 1, to: 5 }))
    click(tool('連結'))
    const input = document.querySelector('.ml-editor__link-input') as HTMLInputElement
    const typeUrl = (value: string) =>
      act(() => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
        input.dispatchEvent(new Event('input', { bubbles: true }))
      })
    typeUrl('javascript:alert(1)')
    act(() => void input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })))
    expect(document.querySelector('.ml-editor__link-error')).not.toBeNull()
    typeUrl('lion@malilion.dev')
    click(document.querySelector('.ml-editor__link-btn--apply')!)
    expect(content().querySelector('a')?.getAttribute('href')).toBe('mailto:lion@malilion.dev')
    expect(document.querySelector('.ml-editor__linkbar')).toBeNull()
  })

  it('disabled locks the editor and the tools', () => {
    const changes: string[] = []
    function App() {
      const [off, setOff] = useState(true)
      return (
        <>
          <button className="flip" onClick={() => setOff((v) => !v)} />
          <RichTextEditor defaultValue="<p>x</p>" disabled={off} onChange={(v) => changes.push(v)} />
        </>
      )
    }
    render(<App />)
    expect(content().getAttribute('contenteditable')).toBe('false')
    expect(tool('粗體').getAttribute('aria-disabled')).toBe('true')
    click(tool('粗體'))
    expect(changes).toEqual([])
    click(document.querySelector('.flip')!)
    expect(content().getAttribute('contenteditable')).toBe('true')
    expect(tool('粗體').getAttribute('aria-disabled')).toBeNull()
  })

  it('toolbarExtra gets the editor', () => {
    render(<RichTextEditor toolbar={['bold']} toolbarExtra={(editor) => <button className="extra" data-ready={String(!!editor)} />} />)
    expect(document.querySelector('.extra')?.getAttribute('data-ready')).toBe('true')
  })
})
