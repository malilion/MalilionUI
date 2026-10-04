// @malilion/ui/react/editor — the rich-text editor for React, built on Tiptap.
// Same markup and stylesheet as MlRichTextEditor. A separate entry so Tiptap
// stays an optional peer dependency:
//   npm i @tiptap/core @tiptap/pm @tiptap/starter-kit @tiptap/extensions
import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import type { AnyExtension, Editor } from '@tiptap/core'
import { Icon } from './basic'
import { Field } from './form'
import { useLocale } from './locale'
import { cx, describedBy, len } from './utils'
import { useFormField } from './validation'
import {
  applyEditorLink,
  cleanToolbar,
  createRichTextEditor,
  currentEditorLink,
  defaultEditorToolbar,
  editorToolGlyph,
  editorToolTitle,
  emptyEditorSnapshot,
  isMacPlatform,
  isToggleTool,
  nextToolbarIndex,
  normalizeEditorLink,
  refreshEditor,
  runEditorTool,
  sameEditorSnapshot,
  setEditorLimit,
  snapshotEditor,
  type MlEditorSnapshot,
  type MlEditorStarterKitOptions,
  type MlEditorTool,
  type MlEditorToolbarItem,
} from '../components/rich-text'

export {
  defaultEditorToolbar,
  editorTools,
  normalizeEditorLink,
  editorHtml,
  type MlEditorTool,
  type MlEditorToolbarItem,
  type MlEditorStarterKitOptions,
} from '../components/rich-text'

export interface RichTextEditorProps {
  /** HTML; '' for an empty document. */
  value?: string
  defaultValue?: string
  onChange?: (html: string, editor: Editor) => void
  label?: ReactNode
  hint?: string
  error?: string
  index?: string
  required?: boolean
  disabled?: boolean
  readOnly?: boolean
  placeholder?: string
  /** Tools in order, '|' for a separator; false hides the toolbar. */
  toolbar?: MlEditorToolbarItem[] | false
  /** Extra controls at the end of the toolbar. */
  toolbarExtra?: ReactNode | ((editor: Editor | undefined) => ReactNode)
  /** Character limit; also shows the counter. */
  maxLength?: number
  /** Show the character counter without a limit. */
  showCount?: boolean
  /** Height of the writing area; numbers are px. */
  minHeight?: number | string
  /** Grow up to this height, then scroll; numbers are px. */
  maxHeight?: number | string
  autoFocus?: boolean
  /** Extra Tiptap extensions (read once, on mount). */
  extensions?: AnyExtension[]
  /** Options for Tiptap's StarterKit, e.g. `{ codeBlock: false }` (read once, on mount). */
  starterKit?: Partial<MlEditorStarterKitOptions>
  onFocus?: (event: FocusEvent) => void
  onBlur?: (event: FocusEvent) => void
  onReady?: (editor: Editor) => void
  id?: string
  className?: string
  style?: CSSProperties
}

export interface RichTextEditorHandle {
  /** The Tiptap editor (undefined until mounted). */
  editor: Editor | undefined
  focus: () => void
  blur: () => void
}

export const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(function RichTextEditor(props, ref) {
  const {
    value,
    defaultValue = '',
    label,
    hint,
    index,
    disabled,
    readOnly,
    placeholder,
    toolbar,
    toolbarExtra,
    maxLength,
    showCount,
    minHeight = 160,
    maxHeight,
    id,
    className,
    style,
  } = props
  const loc = useLocale()
  const { error, required } = useFormField({ error: props.error, required: props.required })
  const autoId = useId()
  const controlId = id ?? `ml-editor-${autoId.replace(/[^\w-]/g, '')}`
  const locked = !!(disabled || readOnly)
  const items = useMemo(() => (toolbar === false ? [] : cleanToolbar(toolbar ?? defaultEditorToolbar)), [toolbar])

  const mount = useRef<HTMLDivElement>(null)
  const bar = useRef<HTMLDivElement>(null)
  const linkInput = useRef<HTMLInputElement>(null)
  const [editor, setEditor] = useState<Editor>()
  const [state, setState] = useState<MlEditorSnapshot>(emptyEditorSnapshot)
  const [mac, setMac] = useState<boolean>()
  const [focusIndex, setFocusIndex] = useState(0)
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkDraft, setLinkDraft] = useState('')
  const [linkError, setLinkError] = useState(false)

  const placeholderText = placeholder ?? loc.editor.placeholder
  const attributes = () => {
    const attrs: Record<string, string> = { id: controlId, class: 'ml-editor__content ml-prose', role: 'textbox', 'aria-multiline': 'true' }
    if (label) attrs['aria-labelledby'] = `${controlId}-label`
    else attrs['aria-label'] = placeholder ?? loc.editor.content
    const described = describedBy(controlId, hint, error)
    if (described) attrs['aria-describedby'] = described
    if (error) attrs['aria-invalid'] = 'true'
    if (required) attrs['aria-required'] = 'true'
    if (readOnly) attrs['aria-readonly'] = 'true'
    if (disabled) attrs['aria-disabled'] = 'true'
    return attrs
  }

  // Latest props for the editor's callbacks, which are bound once.
  const latest = useRef({ props, items, placeholderText, locked, openLink: () => {} })
  latest.current = { props, items, placeholderText, locked, openLink: () => openLink() }
  // What the editor last emitted, so a controlled value echoing it back doesn't reset the caret.
  const emitted = useRef<string | undefined>(undefined)

  const readState = (e: Editor) => {
    const next = snapshotEditor(e, latest.current.items)
    setState((prev) => (sameEditorSnapshot(prev, next) ? prev : next))
  }

  useEffect(() => {
    setMac(isMacPlatform())
    const initial = latest.current.props.value ?? defaultValue
    emitted.current = initial
    const e = createRichTextEditor({
      element: mount.current!,
      content: initial,
      editable: !latest.current.locked,
      placeholder: () => latest.current.placeholderText,
      maxLength,
      autofocus: props.autoFocus,
      starterKit: props.starterKit,
      extensions: props.extensions,
      attributes: attributes(),
      onChange: (html, ed) => {
        emitted.current = html
        latest.current.props.onChange?.(html, ed)
      },
      onState: readState,
      onLinkShortcut: () => latest.current.openLink(),
      onFocus: (event) => latest.current.props.onFocus?.(event),
      onBlur: (event) => latest.current.props.onBlur?.(event),
    })
    setEditor(e)
    // Tiptap's onCreate waits a tick; the counter and toolbar shouldn't.
    readState(e)
    latest.current.props.onReady?.(e)
    const host = mount.current!
    return () => {
      e.destroy()
      // StrictMode mounts twice: leave no stale view behind for the second editor.
      host.replaceChildren()
      setEditor(undefined)
    }
    // Created once; later prop changes are applied by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!editor || value === undefined || value === emitted.current) return
    emitted.current = value
    editor.commands.setContent(value || '', { emitUpdate: false })
  }, [editor, value])

  useEffect(() => {
    if (!editor) return
    editor.setEditable(!locked, false)
    if (locked) setLinkOpen(false)
    readState(editor)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, locked])

  const attrKey = JSON.stringify(attributes())
  useEffect(() => {
    editor?.setOptions({ editorProps: { attributes: JSON.parse(attrKey) } })
  }, [editor, attrKey])
  useEffect(() => refreshEditor(editor), [editor, placeholderText])
  useEffect(() => setEditorLimit(editor, maxLength), [editor, maxLength])
  useEffect(() => {
    if (editor) readState(editor)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, items])

  useImperativeHandle(ref, () => ({ editor, focus: () => void editor?.commands.focus(), blur: () => void editor?.commands.blur() }), [editor])

  function openLink() {
    if (latest.current.locked || !editor) return
    setLinkDraft(currentEditorLink(editor))
    setLinkError(false)
    setLinkOpen(true)
  }
  useEffect(() => {
    if (linkOpen) linkInput.current?.select()
  }, [linkOpen])

  function closeLink() {
    setLinkOpen(false)
    editor?.commands.focus()
  }
  function removeLink() {
    applyEditorLink(editor, null)
    setLinkOpen(false)
  }
  function applyLink() {
    if (!linkDraft.trim()) return removeLink()
    const href = normalizeEditorLink(linkDraft)
    if (!href || !applyEditorLink(editor, href)) return setLinkError(true)
    setLinkOpen(false)
  }
  function onLinkKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault()
      applyLink()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      closeLink()
    }
  }

  function run(tool: MlEditorTool) {
    if (locked || !state.can[tool]) return
    if (tool === 'link') return linkOpen ? closeLink() : openLink()
    runEditorTool(editor, tool)
  }

  function onToolbarKey(event: KeyboardEvent<HTMLDivElement>) {
    const buttons = [...(bar.current?.querySelectorAll<HTMLButtonElement>('.ml-editor__tool') ?? [])]
    const next = nextToolbarIndex(buttons.length, focusIndex, event.key)
    if (next === undefined) return
    event.preventDefault()
    setFocusIndex(next)
    buttons[next]?.focus()
  }

  let order = 0
  const extra = typeof toolbarExtra === 'function' ? toolbarExtra(editor) : toolbarExtra
  const sizes = { '--ml-editor-min': len(minHeight), '--ml-editor-max': len(maxHeight), ...style } as CSSProperties

  return (
    <Field controlId={controlId} label={label} hint={hint} error={error} index={index} required={required} className={className}>
      <div
        className={cx('ml-editor', {
          'ml-editor--focused': state.focused,
          'ml-editor--error': error,
          'ml-editor--disabled': disabled,
          'ml-editor--readonly': readOnly,
        })}
        style={sizes}
      >
        {(items.length > 0 || extra) && (
          <div ref={bar} className="ml-editor__toolbar" role="toolbar" aria-label={loc.editor.toolbar} aria-controls={controlId} onKeyDown={onToolbarKey}>
            {items.map((item, i) => {
              if (item === '|') return <span key={i} className="ml-editor__sep" aria-hidden="true" />
              const n = order++
              const label = loc.editor.tools[item]
              const glyph = editorToolGlyph(item)
              return (
                <button
                  key={i}
                  type="button"
                  className={cx('ml-editor__tool', { 'ml-editor__tool--active': state.active[item] })}
                  aria-label={label}
                  aria-pressed={isToggleTool(item) ? !!state.active[item] : undefined}
                  aria-disabled={locked || !state.can[item] ? true : undefined}
                  aria-expanded={item === 'link' ? linkOpen : undefined}
                  title={editorToolTitle(item, label, mac)}
                  tabIndex={n === focusIndex ? 0 : -1}
                  onMouseDown={(e) => e.preventDefault()}
                  onFocus={() => setFocusIndex(n)}
                  onClick={() => run(item)}
                >
                  {glyph.icon ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d={glyph.icon} />
                    </svg>
                  ) : (
                    <span className="ml-editor__glyph" aria-hidden="true">
                      {glyph.text}
                    </span>
                  )}
                </button>
              )
            })}
            {extra}
          </div>
        )}
        {linkOpen && (
          <div className="ml-editor__linkbar">
            <input
              ref={linkInput}
              value={linkDraft}
              type="url"
              inputMode="url"
              className={cx('ml-editor__link-input', { 'ml-editor__link-input--error': linkError })}
              placeholder="https://"
              aria-label={loc.editor.linkUrl}
              aria-invalid={linkError ? true : undefined}
              aria-describedby={linkError ? `${controlId}-link-error` : undefined}
              onChange={(e) => {
                setLinkDraft(e.target.value)
                setLinkError(false)
              }}
              onKeyDown={onLinkKey}
            />
            <button type="button" className="ml-editor__link-btn ml-editor__link-btn--apply" onClick={applyLink}>
              {loc.editor.linkApply}
            </button>
            {state.active.link && (
              <button type="button" className="ml-editor__link-btn" onClick={removeLink}>
                {loc.editor.linkRemove}
              </button>
            )}
            <button type="button" className="ml-editor__link-close" aria-label={loc.common.close} onClick={closeLink}>
              <Icon name="close" />
            </button>
            {linkError && (
              <p id={`${controlId}-link-error`} className="ml-editor__link-error" role="alert">
                {loc.editor.linkInvalid}
              </p>
            )}
          </div>
        )}
        <div ref={mount} className="ml-editor__body" />
        {(!!maxLength || showCount) && (
          <div className="ml-editor__footer">
            <span className={cx('ml-editor__count', { 'ml-editor__count--full': !!maxLength && state.characters >= maxLength })}>
              {loc.editor.count(state.characters, maxLength)}
            </span>
          </div>
        )}
      </div>
    </Field>
  )
})
