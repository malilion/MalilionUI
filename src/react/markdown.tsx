import { Fragment, createElement, memo, useCallback, useMemo, useRef, type ReactNode } from 'react'
import {
  caretTarget,
  containsBlock,
  createMarkdownParser,
  headingIds,
  headingKey,
  inlineText,
  isPlainLang,
  type MdBlock,
  type MdHeading,
  type MdInline,
  type MlMarkdownCodeSlot,
  type MlMarkdownImageSlot,
  type MlMarkdownLinkSlot,
} from '../markdown'
import { Paw } from './basic'
import { CodeBlock } from './charts'
import { useLocale } from './locale'
import { cx } from './utils'

export { parseMarkdown, parseInline, createMarkdownParser, sanitizeUrl, slugify, headingIds } from '../markdown'
export type { MdBlock, MdInline, MdHeading, MdCode, MdList, MdListItem, MdTable, MdAlign, MdParseOptions, MlMarkdownCodeSlot, MlMarkdownLinkSlot, MlMarkdownImageSlot } from '../markdown'

export interface MarkdownComponents {
  /** Replace fenced code blocks. */
  code?: (props: MlMarkdownCodeSlot) => ReactNode
  /** Replace links; `href` is already sanitised. */
  link?: (props: MlMarkdownLinkSlot & { children: ReactNode }) => ReactNode
  /** Replace images; `src` is already sanitised. */
  image?: (props: MlMarkdownImageSlot) => ReactNode
}

export interface MarkdownProps {
  source?: string
  /** Still arriving: finish the open tail gracefully and show a caret. */
  streaming?: boolean
  caret?: 'bar' | 'paw'
  /** Single newlines become line breaks (chat-style). */
  breaks?: boolean
  lineNumbers?: boolean
  copyable?: boolean
  /** target for external links; '' keeps them in the same tab. */
  linkTarget?: string
  headingAnchors?: boolean
  anchorPrefix?: string
  /** Custom renderers (like the Vue slots #code / #link / #image). */
  components?: MarkdownComponents
  onCopy?: (code: string) => void
  className?: string
}

interface RenderOpts {
  caret: 'bar' | 'paw'
  caretLabel: string
  lineNumbers?: boolean
  copyable: boolean
  linkTarget: string
  ids: Map<MdHeading, string>
  components?: MarkdownComponents
  onCopy?: (code: string) => void
}

function Caret({ caret, label }: { caret: 'bar' | 'paw'; label: string }) {
  return (
    <span className={cx('ml-markdown__caret', `ml-markdown__caret--${caret}`)} role="img" aria-label={label}>
      {caret === 'paw' && <Paw tone="current" />}
    </span>
  )
}

function inlines(nodes: MdInline[], o: RenderOpts): ReactNode[] {
  return nodes.map((n, i) => {
    switch (n.type) {
      case 'text':
        return <Fragment key={i}>{n.text}</Fragment>
      case 'strong':
      case 'em':
      case 'del':
        return createElement(n.type, { key: i }, ...inlines(n.children, o))
      case 'code':
        return (
          <code key={i} className="ml-markdown__code">
            {n.text}
          </code>
        )
      case 'br':
        return <br key={i} />
      case 'link': {
        const children = inlines(n.children, o)
        if (o.components?.link)
          return <Fragment key={i}>{o.components.link({ href: n.href, title: n.title, external: n.external, text: inlineText(n.children), children })}</Fragment>
        return (
          <a
            key={i}
            className="ml-markdown__link"
            href={n.href}
            title={n.title}
            target={n.external && o.linkTarget ? o.linkTarget : undefined}
            rel={n.external ? 'noopener noreferrer' : undefined}
          >
            {children}
          </a>
        )
      }
      case 'image':
        if (o.components?.image) return <Fragment key={i}>{o.components.image({ src: n.src, alt: n.alt, title: n.title })}</Fragment>
        return <img key={i} className="ml-markdown__img" src={n.src} alt={n.alt} title={n.title} loading="lazy" />
    }
  })
}

function renderBlock(b: MdBlock, caretAt: MdBlock | null, o: RenderOpts, key: number, tight = false): ReactNode {
  const caret = b === caretAt ? <Caret caret={o.caret} label={o.caretLabel} /> : null
  const cellClass = (a: string | null) => (a ? `ml-markdown__cell--${a}` : undefined)
  switch (b.type) {
    case 'heading': {
      const id = o.ids.get(b)
      return createElement(
        `h${b.level}`,
        { key, className: cx('ml-markdown__h', `ml-markdown__h--${b.level}`), id },
        ...inlines(b.children, o),
        id ? (
          <a key="anchor" className="ml-markdown__anchor" href={`#${id}`} aria-hidden="true" tabIndex={-1}>
            #
          </a>
        ) : null,
        caret ? <Fragment key="caret">{caret}</Fragment> : null,
      )
    }
    case 'paragraph':
      return tight ? (
        <Fragment key={key}>
          {inlines(b.children, o)}
          {caret}
        </Fragment>
      ) : (
        <p key={key} className="ml-markdown__p">
          {inlines(b.children, o)}
          {caret}
        </p>
      )
    case 'code':
      if (o.components?.code) return <Fragment key={key}>{o.components.code({ code: b.code, lang: b.lang, closed: b.closed })}</Fragment>
      return <CodeBlock key={key} code={b.code} lang={b.lang} plain={isPlainLang(b.lang)} lineNumbers={o.lineNumbers} copyable={o.copyable} onCopy={o.onCopy} />
    case 'blockquote':
      return (
        <blockquote key={key} className="ml-markdown__quote">
          {b.children.map((c, i) => renderBlock(c, caretAt, o, i))}
        </blockquote>
      )
    case 'list': {
      const Tag = b.ordered ? 'ol' : 'ul'
      return (
        <Tag key={key} className={cx('ml-markdown__list', { 'ml-markdown__list--loose': b.loose })} start={b.ordered && b.start !== 1 ? b.start : undefined}>
          {b.items.map((item, i) => (
            <li key={i} className={cx('ml-markdown__li', { 'ml-markdown__li--task': item.task })}>
              {item.task && <input className="ml-markdown__check" type="checkbox" checked={item.checked} disabled readOnly />}
              {item.children.map((c, j) => renderBlock(c, caretAt, o, j, !b.loose))}
            </li>
          ))}
        </Tag>
      )
    }
    case 'table':
      return (
        <div key={key} className="ml-markdown__table-wrap">
          <table className="ml-markdown__table">
            <thead>
              <tr>
                {b.head.map((cell, i) => (
                  <th key={i} className={cellClass(b.align[i])}>
                    {inlines(cell, o)}
                  </th>
                ))}
              </tr>
            </thead>
            {b.rows.length > 0 && (
              <tbody>
                {b.rows.map((row, r) => (
                  <tr key={r}>
                    {row.map((cell, i) => (
                      <td key={i} className={cellClass(b.align[i])}>
                        {inlines(cell, o)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>
      )
    case 'hr':
      return <hr key={key} className="ml-markdown__hr" />
  }
}

interface BlockProps {
  block: MdBlock
  caretAt: MdBlock | null
  anchors: string
  o: RenderOpts
}

// One top-level block. While an answer streams in, earlier blocks keep their
// identity (the parser caches them), so only the tail re-renders.
const TopBlock = memo(
  function TopBlock({ block, caretAt, o }: BlockProps) {
    return <>{renderBlock(block, caretAt, o, 0)}</>
  },
  (a, b) =>
    a.block === b.block &&
    a.caretAt === b.caretAt &&
    a.anchors === b.anchors &&
    a.o.caret === b.o.caret &&
    a.o.caretLabel === b.o.caretLabel &&
    a.o.lineNumbers === b.o.lineNumbers &&
    a.o.copyable === b.o.copyable &&
    a.o.linkTarget === b.o.linkTarget &&
    a.o.components === b.o.components &&
    a.o.onCopy === b.o.onCopy,
)

export function Markdown({
  source = '',
  streaming,
  caret = 'bar',
  breaks,
  lineNumbers,
  copyable = true,
  linkTarget = '_blank',
  headingAnchors,
  anchorPrefix = '',
  components,
  onCopy,
  className,
}: MarkdownProps) {
  const loc = useLocale()
  const parser = useRef<ReturnType<typeof createMarkdownParser>>(undefined)
  parser.current ??= createMarkdownParser()
  const parse = parser.current
  const blocks = useMemo(() => parse(source, { streaming, breaks }), [parse, source, streaming, breaks])
  const ids = useMemo(() => (headingAnchors ? headingIds(blocks, anchorPrefix) : new Map<MdHeading, string>()), [blocks, headingAnchors, anchorPrefix])
  // A stable copy handler, so an inline onCopy doesn't re-render every block.
  const copyRef = useRef(onCopy)
  copyRef.current = onCopy
  const copy = useCallback((code: string) => copyRef.current?.(code), [])
  const caretAt = streaming ? caretTarget(blocks) : null
  const o: RenderOpts = { caret, caretLabel: loc.markdown.streaming, lineNumbers, copyable, linkTarget, ids, components, onCopy: copy }
  return (
    <div className={cx('ml-markdown', { 'ml-markdown--streaming': streaming }, className)} aria-busy={streaming ? 'true' : undefined}>
      {blocks.map((b, i) => {
        const owns = containsBlock(b, caretAt)
        return <TopBlock key={i} block={b} caretAt={owns ? caretAt : null} anchors={headingKey(b, ids)} o={o} />
      })}
      {streaming && !caretAt && <Caret caret={caret} label={loc.markdown.streaming} />}
    </div>
  )
}
