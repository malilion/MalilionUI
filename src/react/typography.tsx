import { createElement, useRef, type AnchorHTMLAttributes, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react'
import { EXTERNAL_ICON, isExternal, textClasses, textTag, type MlTitleLevel } from '../components/typography'
import type { MlTextSize, MlTextTone } from '../types'
import { safeHref } from '../url'
import { CopyButton } from './devtools'
import { useLocale } from './locale'
import { cx } from './utils'

/* ── Title ─────────────────────────────────────────────── */

export interface TitleProps extends HTMLAttributes<HTMLElement> {
  /** Heading level: sets both the tag (h1–h6) and the size. */
  level?: MlTitleLevel
  /** Render another tag at this level's size. */
  as?: string
  /** Gold metal gradient text. */
  metal?: boolean
  /** A short gold bar in front, HUD style. */
  accent?: boolean
  /** Keep to one line and cut with "…". */
  ellipsis?: boolean
}

export function Title({ level = 2, as, metal, accent, ellipsis, className, children, ...rest }: TitleProps) {
  return createElement(
    as ?? `h${level}`,
    {
      ...rest,
      className: cx('ml-title', `ml-title--h${level}`, className, {
        'ml-title--metal': metal,
        'ml-title--accent': accent,
        'ml-title--ellipsis': ellipsis,
      }),
    },
    metal ? <span className="ml-title__text">{children}</span> : children,
  )
}

/* ── Text ──────────────────────────────────────────────── */

export interface TextProps extends HTMLAttributes<HTMLElement> {
  /** Element to render. Defaults to code / mark / del / strong from the flags, else span. */
  as?: string
  tone?: MlTextTone
  size?: MlTextSize
  strong?: boolean
  italic?: boolean
  underline?: boolean
  /** Struck through (renders <del>). */
  delete?: boolean
  /** Highlighted (renders <mark>). */
  mark?: boolean
  /** Inline code chip (renders <code>). */
  code?: boolean
  /** Monospace digits and letters, e.g. order numbers. */
  mono?: boolean
  /** true cuts to one line with "…"; a number clamps to that many lines. */
  ellipsis?: boolean | number
  /** Adds a copy button; true copies the text shown, a string copies that instead. */
  copyable?: boolean | string
}

export function Text({
  as,
  tone = 'default',
  size,
  strong,
  italic,
  underline,
  delete: del,
  mark,
  code,
  mono,
  ellipsis,
  copyable,
  className,
  style,
  children,
  ...rest
}: TextProps) {
  const body = useRef<HTMLSpanElement>(null)
  const flags = { as, tone, size, strong, italic, underline, delete: del, mark, code, mono, ellipsis }
  const lines = typeof ellipsis === 'number' && ellipsis > 1 ? ellipsis : undefined
  const copyValue = () => (typeof copyable === 'string' ? copyable : (body.current?.textContent ?? '').trim())
  return createElement(
    textTag(flags),
    {
      ...rest,
      className: cx(...textClasses(flags), className),
      style: lines ? ({ ...style, '--ml-text-lines': lines } as CSSProperties) : style,
    },
    copyable ? (
      <>
        <span ref={body} className="ml-text__body">
          {children}
        </span>
        <CopyButton className="ml-text__copy" value={copyValue} size="sm" stamp={false} />
      </>
    ) : (
      children
    ),
  )
}

/* ── Link ──────────────────────────────────────────────── */

export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Open in a new tab with rel="noopener noreferrer", an arrow and a screen-reader note. */
  external?: boolean
  tone?: 'gold' | 'tech' | 'inherit'
  underline?: 'hover' | 'always' | 'none'
  /** Keeps the text but drops the href, so it can't be followed. */
  disabled?: boolean
  children?: ReactNode
}

export function Link({ href, target, rel, external, tone = 'gold', underline = 'hover', disabled, className, children, ...rest }: LinkProps) {
  const loc = useLocale()
  const outside = isExternal(external, target)
  return (
    <a
      {...rest}
      className={cx('ml-link', `ml-link--${tone}`, `ml-link--underline-${underline}`, className, { 'ml-link--disabled': disabled })}
      href={disabled ? undefined : safeHref(href)}
      target={disabled ? undefined : outside ? '_blank' : target}
      rel={disabled ? undefined : (rel ?? (outside ? 'noopener noreferrer' : undefined))}
      aria-disabled={disabled || undefined}
      role={disabled ? 'link' : undefined}
    >
      {children}
      {outside && (
        <>
          <svg className="ml-link__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d={EXTERNAL_ICON} />
          </svg>
          <span className="ml-visually-hidden">{loc.link.external}</span>
        </>
      )}
    </a>
  )
}
