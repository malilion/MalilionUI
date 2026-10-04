// MlRichTextEditor (@malilion/ui/editor): the framework-free core, then the Vue component on a real Tiptap editor.
import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick, reactive, ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import type { Editor } from '@tiptap/core'
import { MlConfigProvider, MlForm, MlFormItem, en } from '../src'
import MalilionEditor, { MlRichTextEditor, defaultEditorToolbar, normalizeEditorLink } from '../src/editor'
import { cleanToolbar, editorToolTitle, nextToolbarIndex } from '../src/components/rich-text'
import { MalilionResolver } from '../src/resolver'

let wrapper: VueWrapper | undefined
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
})

type Exposed = { editor: Editor | undefined; focus: () => void }
const editorOf = (w: VueWrapper) => (w.vm as unknown as Exposed).editor!
const content = () => document.querySelector('.ml-editor__content') as HTMLElement
const tool = (label: string) => document.querySelector(`.ml-editor__tool[aria-label="${label}"]`) as HTMLButtonElement

function render(props: Record<string, unknown> = {}, slots?: Record<string, unknown>) {
  wrapper = mount(MlRichTextEditor, { props, slots: slots as never, attachTo: document.body })
  return wrapper
}

describe('editor core', () => {
  it('normalizes and vets link URLs', () => {
    expect(normalizeEditorLink('https://malilion.dev/a?b#c')).toBe('https://malilion.dev/a?b#c')
    expect(normalizeEditorLink('  malilion.dev/docs ')).toBe('https://malilion.dev/docs')
    expect(normalizeEditorLink('lion@malilion.dev')).toBe('mailto:lion@malilion.dev')
    expect(normalizeEditorLink('/guide')).toBe('/guide')
    expect(normalizeEditorLink('#top')).toBe('#top')
    expect(normalizeEditorLink('tel:+886212345678')).toBe('tel:+886212345678')
    expect(normalizeEditorLink('javascript:alert(1)')).toBeNull()
    expect(normalizeEditorLink(' JaVa\tScRipt:alert(1)')).toBeNull()
    expect(normalizeEditorLink('data:text/html,<b>')).toBeNull()
    expect(normalizeEditorLink('not a url')).toBeNull()
    expect(normalizeEditorLink('')).toBeNull()
  })

  it('cleans separators and unknown tools out of a toolbar', () => {
    expect(cleanToolbar(['|', 'bold', '|', '|', 'nope' as never, 'italic', '|'])).toEqual(['bold', '|', 'italic'])
    expect(cleanToolbar(defaultEditorToolbar)).toEqual(defaultEditorToolbar)
  })

  it('formats shortcuts per platform, and not at all before mount', () => {
    expect(editorToolTitle('bold', 'Bold')).toBe('Bold')
    expect(editorToolTitle('bold', 'Bold', true)).toBe('Bold (⌘B)')
    expect(editorToolTitle('redo', 'Redo', false)).toBe('Redo (Ctrl+Shift+Z)')
    expect(editorToolTitle('horizontalRule', 'Divider', true)).toBe('Divider')
  })

  it('moves toolbar focus with arrows, Home and End', () => {
    expect(nextToolbarIndex(5, 4, 'ArrowRight')).toBe(0)
    expect(nextToolbarIndex(5, 0, 'ArrowLeft')).toBe(4)
    expect(nextToolbarIndex(5, 2, 'Home')).toBe(0)
    expect(nextToolbarIndex(5, 2, 'End')).toBe(4)
    expect(nextToolbarIndex(5, 2, 'a')).toBeUndefined()
  })

  it('the resolver imports the editor from its sub-path', () => {
    const [components] = MalilionResolver()
    expect(components.resolve('MlRichTextEditor')).toEqual({
      name: 'MlRichTextEditor',
      from: '@malilion/ui/editor',
      sideEffects: '@malilion/ui/on-demand/MlRichTextEditor',
    })
  })
})

describe('MlRichTextEditor', () => {
  it('loads v-model HTML and renders the default toolbar', async () => {
    render({ modelValue: '<p>Hello <strong>lion</strong></p>' })
    await nextTick()
    expect(content().innerHTML).toContain('<strong>lion</strong>')
    expect(content().getAttribute('role')).toBe('textbox')
    expect(content().classList.contains('ml-prose')).toBe(true)
    const tools = document.querySelectorAll('.ml-editor__tool')
    expect(tools).toHaveLength(defaultEditorToolbar.filter((t) => t !== '|').length)
    expect(document.querySelector('[role=toolbar]')?.getAttribute('aria-label')).toBe('文字格式')
    expect(tool('粗體').getAttribute('title')).toMatch(/^粗體 \((⌘B|Ctrl\+B)\)$/)
    // Roving tabindex: one tab stop.
    expect([...tools].filter((b) => b.getAttribute('tabindex') === '0')).toHaveLength(1)
  })

  it('toggles marks from the toolbar and emits HTML', async () => {
    const w = render({ modelValue: '<p>roar</p>' })
    const editor = editorOf(w)
    editor.commands.setTextSelection({ from: 1, to: 5 })
    await nextTick()
    expect(tool('粗體').getAttribute('aria-pressed')).toBe('false')
    tool('粗體').click()
    await nextTick()
    expect(w.emitted('update:modelValue')!.at(-1)).toEqual(['<p><strong>roar</strong></p>'])
    expect(tool('粗體').getAttribute('aria-pressed')).toBe('true')
    expect(tool('粗體').classList.contains('ml-editor__tool--active')).toBe(true)
    tool('標題 2').click()
    await nextTick()
    // Tiptap's TrailingNode keeps a paragraph after a closing block.
    expect(w.emitted('update:modelValue')!.at(-1)![0]).toMatch(/^<h2><strong>roar<\/strong><\/h2>/)
    tool('復原').click()
    await nextTick()
    expect(w.emitted('update:modelValue')!.at(-1)).toEqual(['<p><strong>roar</strong></p>'])
  })

  it('emits an empty string for an empty document', async () => {
    const w = render({ modelValue: '<p>x</p>' })
    editorOf(w).commands.clearContent(true)
    await nextTick()
    expect(w.emitted('update:modelValue')!.at(-1)).toEqual([''])
  })

  it('takes outside v-model changes without echoing them', async () => {
    const w = render({ modelValue: '<p>one</p>' })
    await w.setProps({ modelValue: '<p>two</p>' })
    expect(content().textContent).toBe('two')
    expect(w.emitted('update:modelValue')).toBeUndefined()
  })

  it('custom toolbar, toolbar-extra slot, or none', async () => {
    render({ toolbar: ['bold', '|', 'link'] }, { 'toolbar-extra': ({ editor }: { editor?: Editor }) => h('button', { class: 'extra', 'data-ready': String(!!editor) }) })
    await nextTick()
    expect([...document.querySelectorAll('.ml-editor__tool')].map((b) => b.getAttribute('aria-label'))).toEqual(['粗體', '連結'])
    expect(document.querySelectorAll('.ml-editor__sep')).toHaveLength(1)
    expect(document.querySelector('.extra')?.getAttribute('data-ready')).toBe('true')
    wrapper!.unmount()
    render({ toolbar: false })
    expect(document.querySelector('.ml-editor__toolbar')).toBeNull()
  })

  it('disabled and readonly lock the editor', async () => {
    const w = render({ modelValue: '<p>x</p>', disabled: true })
    await nextTick()
    expect(content().getAttribute('contenteditable')).toBe('false')
    expect(content().getAttribute('aria-disabled')).toBe('true')
    expect(tool('粗體').getAttribute('aria-disabled')).toBe('true')
    tool('粗體').click()
    expect(w.emitted('update:modelValue')).toBeUndefined()
    await w.setProps({ disabled: false, readonly: true })
    expect(content().getAttribute('aria-readonly')).toBe('true')
    expect(document.querySelector('.ml-editor--readonly')).not.toBeNull()
    await w.setProps({ readonly: false })
    expect(content().getAttribute('contenteditable')).toBe('true')
    expect(tool('粗體').getAttribute('aria-disabled')).toBeNull()
  })

  it('counts characters and enforces max-length', async () => {
    const w = render({ modelValue: '<p>abc</p>', maxLength: 5 })
    await nextTick()
    expect(document.querySelector('.ml-editor__count')?.textContent?.trim()).toBe('3 / 5 字')
    editorOf(w).commands.insertContentAt(4, 'defgh')
    await nextTick()
    // The transaction would pass the limit, so it is refused.
    expect(content().textContent).toBe('abc')
    editorOf(w).commands.insertContentAt(4, 'de')
    await nextTick()
    expect(document.querySelector('.ml-editor__count--full')?.textContent?.trim()).toBe('5 / 5 字')
  })

  it('link bar: sets a link, refuses script URLs, removes', async () => {
    const w = render({ modelValue: '<p>docs</p>' })
    const editor = editorOf(w)
    editor.commands.setTextSelection({ from: 1, to: 5 })
    tool('連結').click()
    await nextTick()
    const input = document.querySelector('.ml-editor__link-input') as HTMLInputElement
    expect(tool('連結').getAttribute('aria-expanded')).toBe('true')
    input.value = 'javascript:alert(1)'
    input.dispatchEvent(new Event('input'))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    await nextTick()
    expect(document.querySelector('.ml-editor__link-error')?.textContent).toBe('網址格式不正確')
    expect(content().querySelector('a')).toBeNull()
    input.value = 'malilion.dev'
    input.dispatchEvent(new Event('input'))
    ;(document.querySelector('.ml-editor__link-btn--apply') as HTMLButtonElement).click()
    await nextTick()
    const a = content().querySelector('a')!
    expect(a.getAttribute('href')).toBe('https://malilion.dev')
    expect(a.getAttribute('rel')).toBe('noopener noreferrer nofollow')
    expect(document.querySelector('.ml-editor__linkbar')).toBeNull()
    // Reopen inside the link: prefilled, with a remove button.
    tool('連結').click()
    await nextTick()
    expect((document.querySelector('.ml-editor__link-input') as HTMLInputElement).value).toBe('https://malilion.dev')
    ;(document.querySelectorAll('.ml-editor__link-btn')[1] as HTMLButtonElement).click()
    await nextTick()
    expect(content().querySelector('a')).toBeNull()
  })

  it('pasted javascript: links never become anchors', async () => {
    render({ modelValue: '<p><a href="javascript:alert(1)">x</a> <a href="https://ok.dev">ok</a></p>' })
    await nextTick()
    const links = [...content().querySelectorAll('a')].map((a) => a.getAttribute('href'))
    expect(links).toEqual(['https://ok.dev'])
  })

  it('arrow keys move focus along the toolbar', async () => {
    render({ toolbar: ['bold', 'italic', '|', 'undo'] })
    await nextTick()
    const bar = document.querySelector('.ml-editor__toolbar')!
    const buttons = [...document.querySelectorAll<HTMLButtonElement>('.ml-editor__tool')]
    buttons[0].focus()
    bar.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    await nextTick()
    expect(document.activeElement).toBe(buttons[1])
    expect(buttons[1].getAttribute('tabindex')).toBe('0')
    bar.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    await nextTick()
    expect(document.activeElement).toBe(buttons[2])
  })

  it('follows the locale and the form item', async () => {
    const model = reactive({ body: '' })
    const form = ref<InstanceType<typeof MlForm>>()
    wrapper = mount(
      {
        render: () =>
          h(MlConfigProvider, { locale: en }, () =>
            h(MlForm, { ref: form, model, rules: { body: { required: true } } }, () =>
              h(MlFormItem, { prop: 'body' }, () => h(MlRichTextEditor, { label: 'Body', modelValue: model.body, 'onUpdate:modelValue': (v: string) => (model.body = v) })),
            ),
          ),
      },
      { attachTo: document.body },
    )
    await nextTick()
    expect(tool('Bold')).not.toBeNull()
    expect(content().querySelector('[data-placeholder]')?.getAttribute('data-placeholder')).toBe('Start writing…')
    expect(await form.value!.validate()).toBe(false)
    await nextTick()
    expect(document.querySelector('.ml-editor--error')).not.toBeNull()
    expect(content().getAttribute('aria-invalid')).toBe('true')
    expect(content().getAttribute('aria-required')).toBe('true')
    expect(content().getAttribute('aria-labelledby')).toBe(`${content().id}-label`)
  })

  it('the plugin registers the component globally', () => {
    const registered: string[] = []
    MalilionEditor.install({ component: (name: string) => registered.push(name) } as never)
    expect(registered).toEqual(['MlRichTextEditor'])
  })
})
