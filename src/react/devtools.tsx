// Developer-facing pieces: useClipboard, <CopyButton>, <JsonViewer>.
// Same markup as MlCopyButton / MlJsonViewer, same framework-free cores.
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react'
import { copySource, copyText, isClipboardSupported, type MlCopySource } from '../clipboard'
import { COPY_ICON, COPIED_ICON, copyButtonClasses, copySourceText } from '../components/copy'
import {
  flattenJson,
  formatJsonPath,
  jsonAllContainers,
  jsonCopyText,
  jsonDefaultOpen,
  jsonDisplayText,
  jsonHighlight,
  jsonIsDate,
  jsonReveal,
  jsonSafeUrl,
  jsonStringView,
  parseJson,
  searchJson,
  type JsonMoreRow,
  type JsonNodeRow,
  type JsonParseResult,
  type JsonRow,
  type JsonSearch,
} from '../components/json'
import { pawStamp } from '../pawStamp'
import type { MlCopyButtonVariant, MlJsonCopyEvent, MlJsonPathStyle, MlPawTone, MlSize } from '../types'
import { Icon, Paw } from './basic'
import { useLocale } from './locale'
import { cx, useControllable } from './utils'

/* ── useClipboard ──────────────────────────────────────── */

export interface UseClipboardOptions {
  /** How long `copied` stays true, in ms. Default 1500. */
  timeout?: number
}

export interface UseClipboardResult {
  copy: (source: MlCopySource) => Promise<boolean>
  copied: boolean
  error: Error | null
  /** `false` on the server and until mounted. */
  isSupported: boolean
}

/** Copy with automatic fallback for non-secure contexts, plus a self-resetting `copied` flag. */
export function useClipboard({ timeout = 1500 }: UseClipboardOptions = {}): UseClipboardResult {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isSupported, setSupported] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const live = useRef(true)
  useEffect(() => {
    live.current = true
    setSupported(isClipboardSupported())
    return () => {
      live.current = false
      clearTimeout(timer.current)
    }
  }, [])
  const copy = useCallback(
    async (source: MlCopySource) => {
      let ok = false
      let err: Error | null = null
      try {
        ok = (await copySource(source)).ok
        if (!ok) err = new Error('Copy to clipboard failed')
      } catch (e) {
        err = e instanceof Error ? e : new Error(String(e))
      }
      if (!live.current) return ok
      clearTimeout(timer.current)
      setError(err)
      setCopied(ok)
      if (ok) timer.current = setTimeout(() => setCopied(false), timeout)
      return ok
    },
    [timeout],
  )
  return { copy, copied, error, isSupported }
}

/* ── CopyButton ────────────────────────────────────────── */

export interface CopyButtonProps {
  value: MlCopySource
  variant?: MlCopyButtonVariant
  size?: MlSize
  label?: string
  copiedLabel?: string
  timeout?: number
  stamp?: boolean | MlPawTone
  tooltip?: boolean
  placement?: 'top' | 'bottom'
  disabled?: boolean
  className?: string
  /** Inline variant: what to show instead of the value. */
  children?: ReactNode
  onCopy?: (text: string) => void
  onError?: (error: Error) => void
}

export function CopyButton({
  value,
  variant = 'icon',
  size = 'md',
  label,
  copiedLabel,
  timeout = 1500,
  stamp = true,
  tooltip = true,
  placement = 'top',
  disabled,
  className,
  children,
  onCopy,
  onError,
}: CopyButtonProps) {
  const loc = useLocale()
  const { copy, copied } = useClipboard({ timeout })
  const [failed, setFailed] = useState(false)
  const failTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(failTimer.current), [])
  const idle = label ?? loc.copy.copy
  const done = copiedLabel ?? loc.copy.copied
  const current = copied ? done : failed ? loc.copy.failed : idle

  async function onClick(event: MouseEvent<HTMLButtonElement>) {
    if (disabled) return
    const button = event.currentTarget
    const { detail, clientX, clientY } = event
    let text = ''
    const ok = await copy(async () => {
      const v = typeof value === 'function' ? await value() : value
      text = typeof v === 'string' ? v : (v?.text ?? '')
      return v
    })
    clearTimeout(failTimer.current)
    setFailed(!ok)
    if (!ok) {
      failTimer.current = setTimeout(() => setFailed(false), timeout)
      onError?.(new Error('Copy to clipboard failed'))
      return
    }
    onCopy?.(text)
    if (stamp !== false) {
      const tone = typeof stamp === 'string' && stamp !== 'current' ? stamp : 'gold'
      if (detail > 0 && (clientX || clientY)) pawStamp(clientX, clientY, tone)
      else {
        const r = button.getBoundingClientRect()
        pawStamp(r.left + r.width / 2, r.top + r.height / 2, tone)
      }
    }
  }

  return (
    <span className={cx('ml-copy', `ml-copy--${variant}`, `ml-copy--${size}`, `ml-copy--tip-${placement}`, { 'ml-copy--copied': copied, 'ml-copy--failed': failed }, className)}>
      {variant === 'inline' && <span className="ml-copy__text">{children ?? copySourceText(value)}</span>}
      <button type="button" className={copyButtonClasses(variant, size).join(' ')} disabled={disabled} aria-label={variant === 'button' ? undefined : current} onClick={onClick}>
        <span className="ml-copy__icon" aria-hidden="true">
          <svg className="ml-copy__glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="square" strokeLinejoin="miter">
            <path d={copied ? COPIED_ICON : COPY_ICON} />
          </svg>
          {copied && <Paw className="ml-copy__paw" />}
        </span>
        {variant === 'button' && <span className="ml-copy__label">{current}</span>}
      </button>
      {tooltip && variant !== 'button' && (
        <span className="ml-copy__tip" aria-hidden="true">
          {current}
        </span>
      )}
      <span className="ml-visually-hidden" role="status" aria-live="polite">
        {copied ? done : failed ? loc.copy.failed : ''}
      </span>
    </span>
  )
}

/* ── JsonViewer ────────────────────────────────────────── */

export interface JsonViewerProps {
  data?: unknown
  source?: string
  expandDepth?: number
  pathStyle?: MlJsonPathStyle
  toolbar?: boolean
  filter?: boolean
  copyable?: boolean
  maxStringLength?: number
  chunkSize?: number
  links?: boolean
  label?: string
  maxHeight?: number | string
  /** Controlled search text. */
  search?: string
  defaultSearch?: string
  onSearchChange?: (search: string) => void
  onCopy?: (event: MlJsonCopyEvent) => void
  className?: string
}

const Parts = ({ parts }: { parts: { text: string; hit: boolean }[] }) => (
  <>
    {parts.map((p, k) =>
      p.hit ? (
        <mark key={k} className="ml-json__hit">
          {p.text}
        </mark>
      ) : (
        p.text
      ),
    )}
  </>
)

export function JsonViewer({
  data,
  source,
  expandDepth = 2,
  pathStyle = 'jsonpath',
  toolbar = true,
  filter,
  copyable = true,
  maxStringLength = 120,
  chunkSize = 100,
  links = true,
  label,
  maxHeight,
  search: searchProp,
  defaultSearch = '',
  onSearchChange,
  onCopy,
  className,
}: JsonViewerProps) {
  const loc = useLocale()
  const [search, setSearch] = useControllable(searchProp, defaultSearch, onSearchChange)

  const parsed = useMemo<JsonParseResult>(() => (source !== undefined ? parseJson(source) : { ok: true, value: data }), [source, data])
  const root = parsed.ok ? parsed.value : undefined
  const parseError = parsed.ok ? null : parsed.error

  const [state, setState] = useState(() => ({
    root,
    open: jsonDefaultOpen(root, expandDepth),
    shown: new Map<string, number>(),
    long: new Set<string>(),
    found: null as JsonSearch | null,
  }))
  const found = useMemo(() => searchJson(root, search ?? ''), [root, search])
  // Derived-state resets during render (no flash): new data, then a new search.
  let current = state
  if (current.root !== root) current = { root, open: jsonDefaultOpen(root, expandDepth), shown: new Map(), long: new Set(), found: null }
  if (current.found !== found) {
    const next = found ? jsonReveal(current.open, current.shown, found, chunkSize) : { open: current.open, shown: current.shown }
    current = { ...current, ...next, found }
  }
  if (current !== state) setState(current)
  const { open, shown, long: longOpen } = current
  const query = found?.query

  const rows = useMemo(() => flattenJson(root, { open, shown, chunkSize, search: found, filter }), [root, open, shown, chunkSize, found, filter])
  const focusable = rows.filter((r): r is JsonNodeRow | JsonMoreRow => r.kind !== 'close')

  const update = (patch: Partial<typeof state>) => setState((s) => ({ ...s, ...patch }))
  const setOpen = (id: string, value: boolean) => {
    if (open.has(id) === value) return
    const next = new Set(open)
    if (value) next.add(id)
    else next.delete(id)
    update({ open: next })
  }
  const toggle = (row: JsonNodeRow) => row.expandable && setOpen(row.id, !row.expanded)
  const showMore = (row: JsonMoreRow) => {
    const next = new Map(shown)
    next.set(row.parentId, (next.get(row.parentId) ?? chunkSize) + row.next)
    update({ shown: next })
  }
  const setLong = (id: string, value: boolean) => {
    const next = new Set(longOpen)
    if (value) next.add(id)
    else next.delete(id)
    update({ long: next })
  }
  const expandAll = () => update({ open: jsonAllContainers(root) })
  const collapseAll = () => {
    update({ open: new Set() })
    setFocusedId('$')
  }

  const stringView = (row: JsonNodeRow) => jsonStringView(jsonDisplayText(row.value), { max: maxStringLength, expanded: longOpen.has(row.id), query })
  const opener = (type: string) => (type === 'array' ? '[' : '{')
  const closer = (type: string) => (type === 'array' ? ']' : '}')
  const pathOf = (id: string) => (rows.find((r) => r.id === id && r.kind === 'node') as JsonNodeRow | undefined)?.path ?? []

  /* Copying */
  const [announce, setAnnounce] = useState('')
  const [flashId, setFlashId] = useState<string | null>(null)
  const flashTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(flashTimer.current), [])

  async function doCopy(row: JsonNodeRow, kind: 'path' | 'value', event?: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) {
    if (!copyable) return
    const text = kind === 'path' ? formatJsonPath(row.path, pathStyle) : jsonCopyText(row.value)
    const target = event?.currentTarget ?? null
    const point = event && 'clientX' in event && event.detail > 0 ? { x: event.clientX, y: event.clientY } : null
    if (!(await copyText(text))) return
    setAnnounce(kind === 'path' ? loc.json.copiedPath(text) : loc.json.copiedValue)
    setFlashId(row.id)
    clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlashId(null), 900)
    if (point) pawStamp(point.x, point.y)
    else if (target) {
      const r = target.getBoundingClientRect()
      pawStamp(r.left + Math.min(r.width / 2, 40), r.top + r.height / 2)
    }
    onCopy?.({ kind, text, path: [...row.path] })
  }

  /* Keyboard */
  const rowEls = useRef(new Map<string, HTMLElement>())
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const pendingFocus = useRef<string | null>(null)
  const ids = focusable.map((r) => r.id)
  const tabId = focusedId !== null && ids.includes(focusedId) ? focusedId : (ids[0] ?? null)
  useEffect(() => {
    if (pendingFocus.current) {
      rowEls.current.get(pendingFocus.current)?.focus()
      pendingFocus.current = null
    }
  })
  const focusRow = (id: string | null | undefined) => {
    if (!id) return
    pendingFocus.current = id
    setFocusedId(id)
    rowEls.current.get(id)?.focus()
  }

  function onKeyDown(event: KeyboardEvent<HTMLLIElement>, row: JsonNodeRow | JsonMoreRow) {
    const i = focusable.findIndex((r) => r.id === row.id)
    const node = row.kind === 'node' ? row : null
    const sv = node && (node.type === 'string' || node.type === 'date') ? stringView(node) : null
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        focusRow(focusable[i + 1]?.id)
        break
      case 'ArrowUp':
        event.preventDefault()
        focusRow(focusable[i - 1]?.id)
        break
      case 'ArrowRight':
        event.preventDefault()
        if (node?.expandable && !node.expanded) setOpen(node.id, true)
        else if (node?.expanded) focusRow(focusable[i + 1]?.id)
        else if (sv?.truncated && node) setLong(node.id, true)
        break
      case 'ArrowLeft':
        event.preventDefault()
        if (node?.expanded) setOpen(node.id, false)
        else if (node && sv?.long && !sv.truncated && !sv.forced) setLong(node.id, false)
        else focusRow(row.parentId)
        break
      case 'Home':
        event.preventDefault()
        focusRow(focusable[0]?.id)
        break
      case 'End':
        event.preventDefault()
        focusRow(focusable[focusable.length - 1]?.id)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (!node) showMore(row as JsonMoreRow)
        else if (node.expandable) toggle(node)
        else doCopy(node, 'value', event)
        break
      default: {
        if (!node || event.altKey || event.shiftKey) return
        const key = event.key.toLowerCase()
        const mod = event.ctrlKey || event.metaKey
        if (key === 'c' && !(mod && document.getSelection?.()?.toString())) {
          event.preventDefault()
          doCopy(node, 'value', event)
        } else if (key === 'p' && !mod) {
          event.preventDefault()
          doCopy(node, 'path', event)
        }
      }
    }
  }

  const onRowClick = (row: JsonRow) => {
    if (row.kind === 'close') return
    setFocusedId(row.id)
    if (row.kind === 'more') showMore(row)
    else toggle(row)
  }
  const refFor = (id: string) => (el: HTMLElement | null) => {
    if (el) rowEls.current.set(id, el)
    else rowEls.current.delete(id)
  }
  const levelStyle = (level: number) => ({ '--_level': level }) as CSSProperties
  const copyTitle = copyable ? loc.json.copyValue : undefined

  function renderValue(row: JsonNodeRow) {
    if (row.type === 'object' || row.type === 'array') {
      if (row.expanded) return <span className="ml-json__brace">{opener(row.type)}</span>
      return (
        <>
          <span
            className="ml-json__value ml-json__value--collapsed"
            title={row.expandable && copyable ? undefined : copyTitle}
            onClick={(e) => {
              e.stopPropagation()
              if (row.expandable && !row.expanded) toggle(row)
              else doCopy(row, 'value', e)
            }}
          >
            {`${opener(row.type)}${row.size ? '…' : ''}${closer(row.type)}`}
          </span>
          {row.size > 0 && <span className="ml-json__count">{row.type === 'array' ? loc.json.items(row.size) : loc.json.keys(row.size)}</span>}
        </>
      )
    }
    if (row.type === 'circular') {
      return <span className="ml-json__value ml-json__value--circular">{`${loc.json.circular} → ${formatJsonPath(pathOf(row.circular ?? '$'), pathStyle) || '$'}`}</span>
    }
    if (row.type === 'string' || row.type === 'date') {
      const sv = stringView(row)
      const url = links && row.type === 'string' ? jsonSafeUrl(row.value as string) : undefined
      const date = row.type === 'date' || (links && row.type === 'string' && jsonIsDate(row.value as string))
      const body = <Parts parts={sv.parts} />
      return (
        <>
          <span
            className={cx('ml-json__value', 'ml-json__value--string', { 'ml-json__value--date': date })}
            title={copyTitle}
            onClick={(e) => {
              e.stopPropagation()
              doCopy(row, 'value', e)
            }}
          >
            {'"'}
            {url ? (
              <a className="ml-json__link" href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                {body}
              </a>
            ) : date ? (
              <time className="ml-json__date" dateTime={jsonDisplayText(row.value)}>
                {body}
              </time>
            ) : (
              body
            )}
            {sv.truncated ? '…' : ''}
            {'"'}
          </span>
          {sv.long && !sv.forced && (
            <button
              type="button"
              className="ml-json__toggle-text"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation()
                setLong(row.id, sv.truncated)
              }}
            >
              {sv.truncated ? loc.json.expandString(sv.hidden) : loc.json.collapseString}
            </button>
          )}
        </>
      )
    }
    return (
      <span
        className={cx('ml-json__value', `ml-json__value--${row.type}`)}
        title={copyTitle}
        onClick={(e) => {
          e.stopPropagation()
          doCopy(row, 'value', e)
        }}
      >
        <Parts parts={jsonHighlight(jsonDisplayText(row.value), query)} />
      </span>
    )
  }

  const caret = parseError ? `${' '.repeat(Math.max(0, parseError.column - 1))}^` : ''

  return (
    <div className={cx('ml-json', { 'ml-json--error': parseError, 'ml-json--copyable': copyable }, className)}>
      {toolbar && !parseError && (
        <div className="ml-json__toolbar">
          <label className="ml-json__search">
            <Icon name="search" className="ml-json__search-icon" />
            <input
              className="ml-json__search-input"
              type="search"
              value={search ?? ''}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={loc.json.search}
              aria-label={loc.json.search}
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          {found && (
            <span className="ml-json__matches" aria-live="polite">
              {loc.json.matches(found.count)}
            </span>
          )}
          <span className="ml-json__tools">
            <button type="button" className="ml-btn ml-btn--ghost ml-btn--sm" onClick={expandAll}>
              {loc.json.expandAll}
            </button>
            <button type="button" className="ml-btn ml-btn--ghost ml-btn--sm" onClick={collapseAll}>
              {loc.json.collapseAll}
            </button>
          </span>
        </div>
      )}
      {parseError ? (
        <div className="ml-json__error" role="alert">
          <p className="ml-json__error-title">{loc.json.parseError(parseError.line, parseError.column)}</p>
          <p className="ml-json__error-detail">{parseError.found === undefined ? loc.json.unexpectedEnd : loc.json.unexpected(parseError.found)}</p>
          <pre className="ml-json__error-snippet">
            <code>
              <span className="ml-json__error-line">{parseError.lineText}</span>
              {'\n'}
              <span className="ml-json__error-caret" aria-hidden="true">
                {caret}
              </span>
            </code>
          </pre>
        </div>
      ) : (
        <ul role="tree" className="ml-json__tree" aria-label={label ?? loc.json.label} style={maxHeight !== undefined ? { maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight } : undefined}>
          {rows.map((row) => {
            if (row.kind === 'close') {
              return (
                <li key={row.id} role="none" aria-hidden="true" className="ml-json__row ml-json__row--close" style={levelStyle(row.level)}>
                  <span className="ml-json__twisty ml-json__twisty--leaf" />
                  <span className="ml-json__brace">{closer(row.type)}</span>
                  {!row.last && <span className="ml-json__comma">,</span>}
                </li>
              )
            }
            if (row.kind === 'more') {
              return (
                <li
                  key={row.id}
                  ref={refFor(row.id)}
                  role="treeitem"
                  aria-level={row.level}
                  aria-setsize={row.setsize}
                  aria-posinset={row.posinset}
                  tabIndex={tabId === row.id ? 0 : -1}
                  className="ml-json__row ml-json__row--more"
                  style={levelStyle(row.level)}
                  onClick={() => onRowClick(row)}
                  onKeyDown={(e) => onKeyDown(e, row)}
                  onFocus={() => setFocusedId(row.id)}
                >
                  <span className="ml-json__twisty ml-json__twisty--leaf" />
                  <span className="ml-json__more">
                    <Paw tone="current" />
                    {loc.json.more(row.next, row.rest)}
                  </span>
                </li>
              )
            }
            return (
              <li
                key={row.id}
                ref={refFor(row.id)}
                role="treeitem"
                aria-level={row.level}
                aria-setsize={row.setsize}
                aria-posinset={row.posinset}
                aria-expanded={row.expandable ? row.expanded : undefined}
                tabIndex={tabId === row.id ? 0 : -1}
                className={cx('ml-json__row', `ml-json__row--${row.type}`, { 'ml-json__row--match': row.hit, 'ml-json__row--copied': flashId === row.id })}
                style={levelStyle(row.level)}
                onClick={() => onRowClick(row)}
                onKeyDown={(e) => onKeyDown(e, row)}
                onFocus={() => setFocusedId(row.id)}
              >
                {row.expandable ? (
                  <span className="ml-json__twisty" aria-hidden="true">
                    <Icon name="chevronRight" />
                  </span>
                ) : (
                  <span className="ml-json__twisty ml-json__twisty--leaf" />
                )}
                {row.key !== undefined && (
                  <>
                    <span
                      className={cx('ml-json__key', { 'ml-json__key--index': typeof row.key === 'number' })}
                      title={copyable ? loc.json.copyPath : undefined}
                      onClick={(e) => {
                        e.stopPropagation()
                        doCopy(row, 'path', e)
                      }}
                    >
                      <Parts parts={jsonHighlight(String(row.key), typeof row.key === 'string' ? query : undefined)} />
                    </span>
                    <span className="ml-json__colon">:</span>
                  </>
                )}
                {renderValue(row)}
                {!row.last && !row.expanded && <span className="ml-json__comma">,</span>}
              </li>
            )
          })}
        </ul>
      )}
      {!parseError && filter && found && !found.count && <p className="ml-json__empty">{loc.json.empty}</p>}
      <span className="ml-visually-hidden" role="status" aria-live="polite">
        {announce}
      </span>
    </div>
  )
}
