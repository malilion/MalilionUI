import { Fragment, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { decorateDiff, diffFileName, diffLangOf, diffModel, layoutDiff, type DiffFile, type DiffSegment, type DiffViewLine, type MlCodeDiffView } from '../diff'
import { useLocale } from './locale'
import { cx, useControllable } from './utils'

export { highlightTokens } from '../highlight'
export type { HighlightToken } from '../highlight'
export { diffLines, diffWords, diffFile, parsePatch, splitLines, decorateDiff, layoutDiff, foldRanges, diffFileName, diffLangOf, diffModel } from '../diff'
export type {
  DiffLine,
  DiffLineType,
  DiffHunkHeader,
  DiffFile,
  DiffFileStatus,
  DiffOptions,
  DiffWordRanges,
  DiffSegment,
  DiffViewLine,
  DiffRow,
  DiffDecorateOptions,
  DiffLayoutOptions,
  DiffModelInput,
  MlCodeDiffView,
} from '../diff'

export interface CodeDiffProps {
  oldCode?: string
  newCode?: string
  /** A git-style unified diff instead of old / new code; may hold several files. */
  patch?: string
  filename?: string
  lang?: string
  plain?: boolean
  context?: number
  ignoreWhitespace?: boolean
  wrap?: boolean
  lineNumbers?: boolean
  wordDiff?: boolean
  viewToggle?: boolean
  navigation?: boolean
  maxHeight?: number | string
  label?: string
  maxEdits?: number
  /** Controlled view. */
  view?: MlCodeDiffView
  defaultView?: MlCodeDiffView
  onViewChange?: (view: MlCodeDiffView) => void
  onNavigate?: (index: number, total: number) => void
  /** Extra controls in the header (Vue: #actions). */
  actions?: ReactNode
}

function Segments({ segs }: { segs: DiffSegment[] }) {
  return (
    <span className="ml-diff__text">
      {segs.map((s, i) =>
        s.cls || s.mark ? (
          <span key={i} className={cx(s.cls, { 'ml-diff__word': s.mark })}>
            {s.text}
          </span>
        ) : (
          <Fragment key={i}>{s.text}</Fragment>
        ),
      )}
    </span>
  )
}

export function CodeDiff({
  oldCode,
  newCode,
  patch,
  filename,
  lang,
  plain,
  context = 3,
  ignoreWhitespace,
  wrap,
  lineNumbers = true,
  wordDiff = true,
  viewToggle = true,
  navigation = true,
  maxHeight,
  label,
  maxEdits = 1500,
  view: viewProp,
  defaultView = 'split',
  onViewChange,
  onNavigate,
  actions,
}: CodeDiffProps) {
  const loc = useLocale()
  const [view, setView] = useControllable<MlCodeDiffView>(viewProp, defaultView, onViewChange)
  const root = useRef<HTMLDivElement>(null)
  const files = useMemo(
    () => diffModel({ oldCode, newCode, patch, filename, ignoreWhitespace, maxEdits }),
    [oldCode, newCode, patch, filename, ignoreWhitespace, maxEdits],
  )
  const langOf = (f: DiffFile) => lang ?? diffLangOf(f.newName ?? f.oldName ?? filename)
  const decorated = useMemo(
    () => files.map((f) => decorateDiff(f, { lang: langOf(f), plain, wordDiff, ignoreWhitespace })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [files, lang, filename, plain, wordDiff, ignoreWhitespace],
  )
  const counts = decorated.map((lines) => lines.reduce((m, l) => Math.max(m, l.block + 1), 0))
  const offsets = counts.map((_, i) => counts.slice(0, i).reduce((a, b) => a + b, 0))
  const total = counts.reduce((a, b) => a + b, 0)
  const added = files.reduce((n, f) => n + f.added, 0)
  const removed = files.reduce((n, f) => n + f.removed, 0)
  const single = files.length <= 1
  const title = diffFileName(files[0] ?? { status: 'modified', oldName: null, newName: null }, filename ?? '')
  const badge = lang ?? diffLangOf(title.split(' → ').pop())

  // Folds and the current change reset whenever the diff itself changes.
  const [ui, setUi] = useState<{ files: DiffFile[]; expanded: Set<string>; current: number }>({ files, expanded: new Set(), current: -1 })
  const expanded = ui.files === files ? ui.expanded : new Set<string>()
  const current = ui.files === files ? ui.current : -1

  const rows = decorated.map((lines, fi) => layoutDiff(lines, { view, context, expanded: (s) => expanded.has(`${fi}:${s}`) }))
  const cols = (view === 'split' ? 2 : 1) + (lineNumbers ? 2 : 0)

  const expand = (fi: number, start: number) => setUi({ files, expanded: new Set(expanded).add(`${fi}:${start}`), current })

  function go(step: 1 | -1) {
    if (!total) return
    const next = current < 0 ? (step > 0 ? 0 : total - 1) : (current + step + total) % total
    setUi({ files, expanded, current: next })
    onNavigate?.(next, total)
    requestAnimationFrame(() => {
      const el = root.current?.querySelector<HTMLElement>(`[data-ml-diff-change="${next}"]`)
      if (!el) return
      el.focus({ preventScroll: true })
      const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
      el.scrollIntoView?.({ block: 'center', behavior: still ? 'auto' : 'smooth' })
    })
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    const t = e.target as HTMLElement
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable) return
    if (e.key === 'n' || e.key === 'p') {
      e.preventDefault()
      go(e.key === 'n' ? 1 : -1)
    }
  }

  const cellMod = (vl: DiffViewLine | null) =>
    !vl ? 'ml-diff__cell--empty' : vl.line.type === 'add' ? 'ml-diff__cell--add' : vl.line.type === 'del' ? 'ml-diff__cell--del' : undefined
  const isChange = (vl: DiffViewLine | null) => !!vl && (vl.line.type === 'add' || vl.line.type === 'del')
  const blockOf = (fi: number, block: number) => (block < 0 ? -1 : offsets[fi] + block)

  const marker = (vl: DiffViewLine) =>
    isChange(vl) && (
      <>
        <span className="ml-diff__sign" aria-hidden="true">
          {vl.line.type === 'add' ? '+' : '-'}
        </span>
        <span className="ml-visually-hidden ml-diff__sr">{vl.line.type === 'add' ? loc.diff.added : loc.diff.removed}</span>
      </>
    )
  const content = (vl: DiffViewLine) => (
    <>
      {marker(vl)}
      <Segments segs={vl.segs} />
      {vl.line.noNewline && <span className="ml-diff__eof">{loc.diff.noNewline}</span>}
    </>
  )
  const stats = (a: number, r: number) => (
    <span className="ml-diff__stats">
      <span className="ml-visually-hidden">{loc.diff.stats(a, r)}</span>
      <span className="ml-diff__stat ml-diff__stat--add" aria-hidden="true">
        +{a}
      </span>
      <span className="ml-diff__stat ml-diff__stat--del" aria-hidden="true">
        −{r}
      </span>
    </span>
  )

  return (
    <div
      ref={root}
      className={cx('ml-diff', `ml-diff--${view}`, { 'ml-diff--wrap': wrap, 'ml-diff--numbers': lineNumbers })}
      role="region"
      aria-label={label ?? loc.diff.label}
      onKeyDown={onKeyDown}
    >
      <div className="ml-diff__bar">
        <div className="ml-diff__title">
          {single ? (
            <>
              {badge && <span className="ml-diff__lang">{badge}</span>}
              {files[0] && files[0].status !== 'modified' && (
                <span className={cx('ml-diff__status', `ml-diff__status--${files[0].status}`)}>{loc.diff.status[files[0].status]}</span>
              )}
              {title && <span className="ml-diff__name">{title}</span>}
            </>
          ) : (
            <span className="ml-diff__name">{loc.diff.files(files.length)}</span>
          )}
          {stats(added, removed)}
        </div>
        <div className="ml-diff__actions">
          {actions}
          {navigation && total > 0 && (
            <div className="ml-diff__nav" role="group" aria-label={loc.diff.label}>
              <button type="button" className="ml-diff__btn" aria-label={loc.diff.prev} title={`${loc.diff.prev} (p)`} onClick={() => go(-1)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path d="m6 15 6-6 6 6" />
                </svg>
              </button>
              <span className="ml-diff__pos" aria-live="polite">
                {loc.diff.position(current + 1, total)}
              </span>
              <button type="button" className="ml-diff__btn" aria-label={loc.diff.next} title={`${loc.diff.next} (n)`} onClick={() => go(1)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </div>
          )}
          {viewToggle && (
            <div className="ml-diff__views" role="group" aria-label={loc.diff.view}>
              {(['split', 'unified'] as const).map((v) => (
                <button key={v} type="button" className={cx('ml-diff__view', { 'ml-diff__view--on': view === v })} aria-pressed={view === v} onClick={() => setView(v)}>
                  {loc.diff[v]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="ml-diff__body" style={maxHeight !== undefined ? { maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight } : undefined}>
        {files.map((file, fi) => (
          <section key={fi} className="ml-diff__file">
            {!single && (
              <div className="ml-diff__file-head">
                {file.status !== 'modified' && <span className={cx('ml-diff__status', `ml-diff__status--${file.status}`)}>{loc.diff.status[file.status]}</span>}
                <span className="ml-diff__name">{diffFileName(file)}</span>
                {stats(file.added, file.removed)}
              </div>
            )}
            <div className="ml-diff__scroll" tabIndex={0}>
              <table className="ml-diff__table">
                <caption className="ml-visually-hidden">{loc.diff.table(single ? title : diffFileName(file))}</caption>
                <thead className="ml-diff__thead">
                  {view === 'split' ? (
                    <tr>
                      {lineNumbers && <th className="ml-diff__th ml-diff__th--num" scope="col">{loc.diff.oldLine}</th>}
                      <th className="ml-diff__th ml-diff__th--code" scope="col">{loc.diff.oldCode}</th>
                      {lineNumbers && <th className="ml-diff__th ml-diff__th--num" scope="col">{loc.diff.newLine}</th>}
                      <th className="ml-diff__th ml-diff__th--code" scope="col">{loc.diff.newCode}</th>
                    </tr>
                  ) : (
                    <tr>
                      {lineNumbers && <th className="ml-diff__th ml-diff__th--num" scope="col">{loc.diff.oldLine}</th>}
                      {lineNumbers && <th className="ml-diff__th ml-diff__th--num" scope="col">{loc.diff.newLine}</th>}
                      <th className="ml-diff__th ml-diff__th--code" scope="col">{loc.diff.code}</th>
                    </tr>
                  )}
                </thead>
                <tbody>
                  {(file.binary || !(file.added + file.removed)) && (
                    <tr className="ml-diff__note">
                      <td colSpan={cols}>{file.binary ? loc.diff.binary : loc.diff.noChanges}</td>
                    </tr>
                  )}
                  {rows[fi].map((row) => {
                    if (row.kind === 'fold')
                      return (
                        <tr key={row.key} className="ml-diff__fold">
                          <td colSpan={cols}>
                            <button type="button" className="ml-diff__expand" onClick={() => expand(fi, row.start)}>
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                                <path d="m7 15 5 5 5-5M7 9l5-5 5 5" />
                              </svg>
                              {loc.diff.expand(row.count)}
                            </button>
                          </td>
                        </tr>
                      )
                    if (row.kind === 'hunk')
                      return (
                        <tr key={row.key} className="ml-diff__hunk">
                          <td colSpan={cols}>{row.text}</td>
                        </tr>
                      )
                    if (row.kind === 'line') {
                      const vl = row.line
                      const block = blockOf(fi, vl.block)
                      return (
                        <tr
                          key={row.key}
                          className={cx('ml-diff__row', `ml-diff__row--${vl.line.type}`, { 'ml-diff__row--current': vl.block >= 0 && block === current })}
                          data-ml-diff-change={row.start ? block : undefined}
                          tabIndex={row.start ? -1 : undefined}
                        >
                          {lineNumbers && <td className="ml-diff__num ml-diff__num--old">{vl.line.oldNo}</td>}
                          {lineNumbers && <td className="ml-diff__num ml-diff__num--new">{vl.line.newNo}</td>}
                          <td className={cx('ml-diff__code', cellMod(vl))}>{content(vl)}</td>
                        </tr>
                      )
                    }
                    const block = blockOf(fi, row.block)
                    return (
                      <tr
                        key={row.key}
                        className={cx('ml-diff__row', { 'ml-diff__row--change': row.block >= 0, 'ml-diff__row--current': row.block >= 0 && block === current })}
                        data-ml-diff-change={row.start ? block : undefined}
                        tabIndex={row.start ? -1 : undefined}
                      >
                        {(
                          [
                            ['old', row.left],
                            ['new', row.right],
                          ] as const
                        ).map(([side, vl]) => (
                          <Fragment key={side}>
                            {lineNumbers && (
                              <td className={cx('ml-diff__num', `ml-diff__num--${side}`, cellMod(vl))}>{vl ? (side === 'old' ? vl.line.oldNo : vl.line.newNo) : ''}</td>
                            )}
                            <td className={cx('ml-diff__code', `ml-diff__code--${side}`, cellMod(vl))}>{vl && content(vl)}</td>
                          </Fragment>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
