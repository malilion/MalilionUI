// Framework-free core of MlRichTextEditor / RichTextEditor: the Tiptap editor
// setup, the toolbar's tools and the state snapshot the toolbar renders from.
// Only @malilion/ui/editor and @malilion/ui/react/editor import this, so Tiptap
// stays an optional peer dependency of the main package.
import { Editor, Extension, type AnyExtension, type ChainedCommands } from '@tiptap/core'
import StarterKit, { type StarterKitOptions } from '@tiptap/starter-kit'
import { CharacterCount, Placeholder } from '@tiptap/extensions'
import type { MlLocale } from '../locale-data'
import { safeHref } from '../url'

export type MlEditorTool = keyof MlLocale['editor']['tools']
/** A tool, or '|' for a separator. */
export type MlEditorToolbarItem = MlEditorTool | '|'
export type { StarterKitOptions as MlEditorStarterKitOptions }

export const defaultEditorToolbar: MlEditorToolbarItem[] = [
  'h2', 'h3', '|',
  'bold', 'italic', 'underline', 'strike', 'code', '|',
  'bulletList', 'orderedList', 'blockquote', 'codeBlock', '|',
  'link', 'horizontalRule', '|',
  'undo', 'redo',
]

interface ToolDef {
  /** SVG path (24×24, stroked) or a short text glyph. */
  icon?: string
  text?: string
  /** Tiptap's own shortcut, shown in the tooltip. */
  keys?: string
  /** Shows a pressed state (aria-pressed). */
  toggle?: boolean
  command?: (chain: ChainedCommands) => ChainedCommands
  active?: (editor: Editor) => boolean
}

const mark = (name: string) => (editor: Editor) => editor.isActive(name)
const heading = (level: 1 | 2 | 3): ToolDef => ({
  text: `H${level}`,
  keys: `Mod-Alt-${level}`,
  toggle: true,
  command: (c) => c.toggleHeading({ level }),
  active: (e) => e.isActive('heading', { level }),
})

const TOOLS: Record<MlEditorTool, ToolDef> = {
  paragraph: { text: '¶', keys: 'Mod-Alt-0', toggle: true, command: (c) => c.setParagraph(), active: mark('paragraph') },
  h1: heading(1),
  h2: heading(2),
  h3: heading(3),
  bold: { icon: 'M7 5h6a3.5 3.5 0 010 7H7zM7 12h7a3.5 3.5 0 010 7H7z', keys: 'Mod-B', toggle: true, command: (c) => c.toggleBold(), active: mark('bold') },
  italic: { icon: 'M10 5h8M6 19h8M14 5l-4 14', keys: 'Mod-I', toggle: true, command: (c) => c.toggleItalic(), active: mark('italic') },
  underline: { icon: 'M7 4v7a5 5 0 0010 0V4M5 20h14', keys: 'Mod-U', toggle: true, command: (c) => c.toggleUnderline(), active: mark('underline') },
  strike: {
    icon: 'M16.5 7.5A4 4 0 0012.6 5h-1.4a3.6 3.6 0 00-1.6 6.8M4 12h16M7.6 16.4A4 4 0 0011.4 19h1.4a3.6 3.6 0 003.5-4.4',
    keys: 'Mod-Shift-S',
    toggle: true,
    command: (c) => c.toggleStrike(),
    active: mark('strike'),
  },
  code: { icon: 'M8.5 7l-5 5 5 5M15.5 7l5 5-5 5', keys: 'Mod-E', toggle: true, command: (c) => c.toggleCode(), active: mark('code') },
  link: {
    icon: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1',
    keys: 'Mod-K',
    toggle: true,
    active: mark('link'),
  },
  bulletList: {
    icon: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01',
    keys: 'Mod-Shift-8',
    toggle: true,
    command: (c) => c.toggleBulletList(),
    active: mark('bulletList'),
  },
  orderedList: {
    icon: 'M10 6h10M10 12h10M10 18h10M4 4.5h1.5V9M4 9h3M4 14.6a1.5 1.5 0 013 .4L4 19h3',
    keys: 'Mod-Shift-7',
    toggle: true,
    command: (c) => c.toggleOrderedList(),
    active: mark('orderedList'),
  },
  blockquote: {
    icon: 'M5 5v14M10 8h9M10 12h9M10 16h6',
    keys: 'Mod-Shift-B',
    toggle: true,
    command: (c) => c.toggleBlockquote(),
    active: mark('blockquote'),
  },
  codeBlock: {
    icon: 'M4 4h16v16H4zM9.5 9.5L7 12l2.5 2.5M14.5 9.5L17 12l-2.5 2.5',
    keys: 'Mod-Alt-C',
    toggle: true,
    command: (c) => c.toggleCodeBlock(),
    active: mark('codeBlock'),
  },
  horizontalRule: { icon: 'M3 12h18M8 7h8M8 17h8', command: (c) => c.setHorizontalRule() },
  clear: { icon: 'M7 5h11M12.5 5L10 13M4 4l16 16', command: (c) => c.unsetAllMarks().clearNodes() },
  undo: { icon: 'M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 010 11H11', keys: 'Mod-Z', command: (c) => c.undo() },
  redo: { icon: 'M15 14l5-5-5-5M20 9H9.5a5.5 5.5 0 000 11H13', keys: 'Mod-Shift-Z', command: (c) => c.redo() },
}

export const editorTools = Object.keys(TOOLS) as MlEditorTool[]

/** What a toolbar button draws: an SVG path or a text glyph. */
export function editorToolGlyph(tool: MlEditorTool): { icon?: string; text?: string } {
  return { icon: TOOLS[tool].icon, text: TOOLS[tool].text }
}

export const isToggleTool = (tool: MlEditorTool) => !!TOOLS[tool].toggle

/**
 * Tooltip: the label plus its shortcut ("粗體 (⌘B)" / "Bold (Ctrl+B)").
 * `mac` is undefined during SSR and the first client render, so both agree.
 */
export function editorToolTitle(tool: MlEditorTool, label: string, mac?: boolean): string {
  const keys = TOOLS[tool].keys
  if (!keys || mac === undefined) return label
  const parts = keys.split('-').map((k) => (k === 'Mod' ? (mac ? '⌘' : 'Ctrl') : k === 'Alt' ? (mac ? '⌥' : 'Alt') : k === 'Shift' ? (mac ? '⇧' : 'Shift') : k))
  return `${label} (${parts.join(mac ? '' : '+')})`
}

export const isMacPlatform = () => typeof navigator !== 'undefined' && /Mac|iP(hone|ad|od)/.test(navigator.platform || navigator.userAgent)

/** Only what visible tools need, filled in after every transaction. */
export interface MlEditorSnapshot {
  active: Partial<Record<MlEditorTool, boolean>>
  can: Partial<Record<MlEditorTool, boolean>>
  characters: number
  words: number
  empty: boolean
  focused: boolean
}

export const emptyEditorSnapshot: MlEditorSnapshot = { active: {}, can: {}, characters: 0, words: 0, empty: true, focused: false }

export function snapshotEditor(editor: Editor | null | undefined, tools: readonly MlEditorToolbarItem[]): MlEditorSnapshot {
  if (!editor || editor.isDestroyed) return emptyEditorSnapshot
  const active: MlEditorSnapshot['active'] = {}
  const can: MlEditorSnapshot['can'] = {}
  for (const item of tools) {
    if (item === '|') continue
    const def = TOOLS[item]
    if (def.active) active[item] = def.active(editor)
    can[item] = editor.isEditable && (def.command ? def.command(editor.can().chain()).run() : true)
  }
  const count = editor.storage.characterCount
  return { active, can, characters: count.characters(), words: count.words(), empty: editor.isEmpty, focused: editor.isFocused }
}

export function sameEditorSnapshot(a: MlEditorSnapshot, b: MlEditorSnapshot): boolean {
  if (a.characters !== b.characters || a.words !== b.words || a.empty !== b.empty || a.focused !== b.focused) return false
  for (const tool of editorTools) if (!!a.active[tool] !== !!b.active[tool] || !!a.can[tool] !== !!b.can[tool]) return false
  return true
}

/** Run a toolbar tool on the editor. 'link' is handled by the link bar instead. */
export function runEditorTool(editor: Editor | null | undefined, tool: MlEditorTool): boolean {
  const command = TOOLS[tool].command
  if (!editor || !editor.isEditable || !command) return false
  return command(editor.chain().focus()).run()
}

/**
 * What the link bar accepts: http(s), mailto:, tel:, relative paths and #anchors;
 * a bare "malilion.dev/docs" becomes https://. Script schemes give null.
 */
export function normalizeEditorLink(input: string): string | null {
  const url = input.trim()
  if (!url) return null
  if (/^[\w.+-]+@[\w-]+(\.[\w-]+)+$/.test(url)) return `mailto:${url}`
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(url) || /^[/#?.]/.test(url) ? url : /^[\w-]+(\.[\w-]+)+([/:?#]|$)/.test(url) ? `https://${url}` : null
  if (!withScheme || !safeHref(withScheme)) return null
  if (/\s/.test(withScheme)) return null
  return withScheme
}

/** The current link's href, for prefilling the link bar. */
export const currentEditorLink = (editor: Editor | null | undefined): string => (editor?.getAttributes('link').href as string | undefined) ?? ''

/**
 * Set (href) or remove (null) the link on the selection, or on the whole link
 * the caret is in. With an empty selection outside a link, the URL is inserted
 * as linked text. Returns false when the href is refused.
 */
export function applyEditorLink(editor: Editor | null | undefined, href: string | null): boolean {
  if (!editor || !editor.isEditable) return false
  const chain = editor.chain().focus().extendMarkRange('link')
  if (href === null) return chain.unsetLink().run()
  if (editor.state.selection.empty && !editor.isActive('link')) {
    return editor
      .chain()
      .focus()
      .insertContent({ type: 'text', text: href.replace(/^mailto:/, ''), marks: [{ type: 'link', attrs: { href } }] })
      .run()
  }
  return chain.setLink({ href }).run()
}

/** The value v-model / onChange carries: '' for an empty document rather than '<p></p>'. */
export const editorHtml = (editor: Editor): string => (editor.isEmpty ? '' : editor.getHTML())

/** Change the character limit of a live editor. */
export function setEditorLimit(editor: Editor | null | undefined, limit: number | undefined) {
  const ext = editor?.extensionManager.extensions.find((e) => e.name === 'characterCount')
  if (ext) ext.options.limit = limit || null
}

/** Re-render decorations (e.g. after the placeholder text changed). */
export function refreshEditor(editor: Editor | null | undefined) {
  if (editor && !editor.isDestroyed) editor.view.dispatch(editor.state.tr.setMeta('addToHistory', false))
}

export interface MlEditorSetup {
  element: HTMLElement
  content: string
  editable: boolean
  /** Read on every render of the empty state, so it can follow a prop. */
  placeholder: () => string
  maxLength?: number
  autofocus?: boolean
  starterKit?: Partial<StarterKitOptions>
  extensions?: AnyExtension[]
  /** Attributes of the contenteditable element (id, aria-*). */
  attributes: Record<string, string>
  onChange: (html: string, editor: Editor) => void
  /** After every transaction, focus and blur: re-read the toolbar state. */
  onState: (editor: Editor) => void
  /** ⌘K / Ctrl+K. */
  onLinkShortcut: () => void
  onFocus?: (event: FocusEvent) => void
  onBlur?: (event: FocusEvent) => void
}

export function createRichTextEditor(setup: MlEditorSetup): Editor {
  const linkShortcut = Extension.create({
    name: 'mlLinkShortcut',
    addKeyboardShortcuts: () => ({
      'Mod-k': () => {
        setup.onLinkShortcut()
        return true
      },
    }),
  })
  return new Editor({
    element: setup.element,
    content: setup.content || '',
    editable: setup.editable,
    // The stylesheet carries ProseMirror's base rules; no runtime <style> (CSP-friendly).
    injectCSS: false,
    autofocus: setup.autofocus ? 'end' : false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: 'https',
          HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' },
        },
        ...setup.starterKit,
      }),
      Placeholder.configure({ placeholder: () => setup.placeholder() }),
      CharacterCount.configure({ limit: setup.maxLength || null }),
      linkShortcut,
      ...(setup.extensions ?? []),
    ],
    editorProps: { attributes: setup.attributes },
    onCreate: ({ editor }) => setup.onState(editor),
    onUpdate: ({ editor }) => setup.onChange(editorHtml(editor), editor),
    onTransaction: ({ editor }) => setup.onState(editor),
    onFocus: ({ editor, event }) => {
      setup.onState(editor)
      setup.onFocus?.(event)
    },
    onBlur: ({ editor, event }) => {
      setup.onState(editor)
      setup.onBlur?.(event)
    },
  })
}

/** Roving tabindex for role="toolbar": the index to focus after `key`, if any. */
export function nextToolbarIndex(count: number, current: number, key: string): number | undefined {
  if (!count) return undefined
  if (key === 'ArrowRight') return (current + 1) % count
  if (key === 'ArrowLeft') return (current - 1 + count) % count
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  return undefined
}

/** Toolbar items without leading, trailing or doubled separators. */
export function cleanToolbar(items: readonly MlEditorToolbarItem[]): MlEditorToolbarItem[] {
  const out: MlEditorToolbarItem[] = []
  for (const item of items) {
    if (item === '|' ? out.length && out[out.length - 1] !== '|' : item in TOOLS) out.push(item)
  }
  if (out[out.length - 1] === '|') out.pop()
  return out
}
