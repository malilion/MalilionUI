import { useId, useState, type AnchorHTMLAttributes, type ButtonHTMLAttributes, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react'
import { icons, type IconName } from '../components/icons'
import { PAW_PAD, PAW_SHINE, PAW_TOES } from '../components/paw'
import { mascotImages } from '../mascot'
import { pawStamp } from '../pawStamp'
import type {
  MlAlertTone,
  MlAvatarSize,
  MlAvatarStatus,
  MlBreadcrumbItem,
  MlButtonVariant,
  MlCardVariant,
  MlDescriptionItem,
  MlPawTone,
  MlProgressTone,
  MlResultStatus,
  MlSize,
  MlStepItem,
  MlTimelineItem,
  MlTone,
} from '../types'
import { useLocale } from './locale'
import { cx, len } from './utils'

/** An id that is safe inside url(#…) references. */
export function useSvgId(prefix: string) {
  return `${prefix}-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
}

/* ── Paw & Icon ─────────────────────────────────────────── */

const PAW_STOPS: Record<Exclude<MlPawTone, 'current'>, [string, string, string]> = {
  gold: ['#ffe9a6', '#f0ad2f', '#a96c0e'],
  bean: ['#ffe3ea', '#ff8fa8', '#c94d6c'],
  steel: ['#f4f6f9', '#9ea7b5', '#414956'],
  tech: ['#d9fff8', '#3eeed0', '#0a8f7b'],
}

export interface PawProps {
  tone?: MlPawTone
  /** px number or any CSS length. */
  size?: number | string
  shine?: boolean
  /** Accessible name; without it the paw is decoration. */
  title?: string
  className?: string
  style?: CSSProperties
}

export function Paw({ tone = 'gold', size = '1em', shine = true, title, className, style }: PawProps) {
  const gradientId = useSvgId('ml-paw')
  const fill = tone === 'current' ? 'currentColor' : `url(#${gradientId})`
  return (
    <svg
      className={cx('ml-paw', `ml-paw--${tone}`, className)}
      style={style}
      viewBox="0 0 24 24"
      width={len(size)}
      height={len(size)}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {tone !== 'current' && (
        <defs>
          <linearGradient id={gradientId} x1="0" y1="2" x2="0" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={PAW_STOPS[tone][0]} />
            <stop offset="0.5" stopColor={PAW_STOPS[tone][1]} />
            <stop offset="1" stopColor={PAW_STOPS[tone][2]} />
          </linearGradient>
        </defs>
      )}
      <g fill={fill}>
        {PAW_TOES.map((t) => (
          <ellipse key={t.cx} cx={t.cx} cy={t.cy} rx={t.rx} ry={t.ry} transform={`rotate(${t.rotate} ${t.cx} ${t.cy})`} />
        ))}
        <path d={PAW_PAD} />
      </g>
      {shine && tone !== 'current' && (
        <g fill="#fff" opacity={0.6}>
          {PAW_SHINE.map((d) => (
            <ellipse key={d.cx} cx={d.cx} cy={d.cy} rx={d.rx} ry={d.ry} transform={`rotate(${d.rotate} ${d.cx} ${d.cy})`} />
          ))}
        </g>
      )}
    </svg>
  )
}

const FILLED = new Set<IconName>(['up', 'down'])

export function Icon({ name, className }: { name: IconName; className?: string }) {
  const filled = FILLED.has(name)
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={2}
      strokeLinecap="square"
      strokeLinejoin="miter"
    >
      <path d={icons[name]} />
    </svg>
  )
}

/* ── Button ─────────────────────────────────────────────── */

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'prefix'> {
  variant?: MlButtonVariant
  size?: MlSize
  href?: string
  loading?: boolean
  block?: boolean
  square?: boolean
  /** Leave a paw print where it's pressed (true or a tone). */
  stamp?: boolean | MlPawTone
  prefix?: ReactNode
  suffix?: ReactNode
  target?: AnchorHTMLAttributes<HTMLAnchorElement>['target']
}

export function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  href,
  disabled,
  loading,
  block,
  square,
  stamp,
  prefix,
  suffix,
  children,
  className,
  onPointerDown,
  target,
  ...rest
}: ButtonProps) {
  const inactive = disabled || loading
  const classes = cx('ml-btn', `ml-btn--${variant}`, `ml-btn--${size}`, className, {
    'ml-btn--block': block,
    'ml-btn--square': square,
    'ml-btn--loading': loading,
  })
  const onDown = (event: React.PointerEvent<HTMLButtonElement & HTMLAnchorElement>) => {
    onPointerDown?.(event as React.PointerEvent<HTMLButtonElement>)
    if (stamp && !inactive) pawStamp(event.clientX, event.clientY, typeof stamp === 'string' && stamp !== 'current' ? stamp : 'gold')
  }
  const inner = (
    <>
      {loading ? <span className="ml-btn__spinner" aria-hidden="true" /> : prefix}
      {children != null && <span className="ml-btn__label">{children}</span>}
      {suffix}
    </>
  )
  if (href) {
    return (
      <a
        href={inactive ? undefined : href}
        target={target}
        aria-disabled={inactive || undefined}
        aria-busy={loading || undefined}
        className={classes}
        onPointerDown={onDown}
        {...(rest as HTMLAttributes<HTMLAnchorElement>)}
      >
        {inner}
      </a>
    )
  }
  return (
    <button type={type} disabled={inactive} aria-busy={loading || undefined} className={classes} onPointerDown={onDown} {...rest}>
      {inner}
    </button>
  )
}

/* ── Small pieces ───────────────────────────────────────── */

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: MlTone
  solid?: boolean
  size?: 'md' | 'lg'
  dot?: boolean
  pulse?: boolean
  paw?: boolean
}

export function Badge({ tone = 'gold', solid, size = 'md', dot, pulse, paw, className, children, ...rest }: BadgeProps) {
  return (
    <span className={cx('ml-badge', `ml-badge--${tone}`, className, { 'ml-badge--solid': solid, 'ml-badge--lg': size === 'lg' })} {...rest}>
      {paw ? (
        <Paw tone="current" className="ml-badge__paw" />
      ) : (dot || pulse) ? (
        <span className={cx('ml-badge__dot', { 'ml-badge__dot--pulse': pulse })} aria-hidden="true" />
      ) : null}
      {children}
    </span>
  )
}

export interface TagProps {
  tone?: MlTone
  variant?: 'soft' | 'outline' | 'solid'
  /** Show a × that calls onClose. */
  closable?: boolean
  onClose?: () => void
  /** Toggleable chip; pair with selected / onSelectedChange. */
  selectable?: boolean
  selected?: boolean
  onSelectedChange?: (selected: boolean) => void
  icon?: ReactNode
  className?: string
  children?: ReactNode
}

export function Tag({ tone = 'gold', variant = 'soft', closable, onClose, selectable, selected, onSelectedChange, icon, className, children }: TagProps) {
  const loc = useLocale()
  if (selectable) {
    return (
      <button
        type="button"
        className={cx('ml-tag', `ml-tag--${tone}`, `ml-tag--${variant}`, 'ml-tag--selectable', className, { 'ml-tag--selected': selected })}
        aria-pressed={!!selected}
        onClick={() => onSelectedChange?.(!selected)}
      >
        {icon}
        {children}
      </button>
    )
  }
  return (
    <span className={cx('ml-tag', `ml-tag--${tone}`, `ml-tag--${variant}`, className)}>
      {icon}
      {children}
      {closable && (
        <button type="button" className="ml-tag__close" aria-label={loc.common.remove('')} onClick={onClose}>
          <Icon name="close" />
        </button>
      )}
    </span>
  )
}

export function Kbd({ children }: { children?: ReactNode }) {
  return <kbd className="ml-kbd">{children}</kbd>
}

export function Divider({ label, claw, paw }: { label?: ReactNode; claw?: boolean; paw?: boolean }) {
  return (
    <div className={cx('ml-divider', { 'ml-divider--plain': !label && !claw && !paw })} role="separator">
      {label ? (
        <span>{label}</span>
      ) : paw ? (
        <span className="ml-divider__paws" aria-hidden="true">
          {[1, 2, 3].map((n) => (
            <Paw key={n} tone="current" />
          ))}
        </span>
      ) : claw ? (
        <span className="ml-divider__claw" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      ) : null}
    </div>
  )
}

/* ── Card & Alert ───────────────────────────────────────── */

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  variant?: MlCardVariant
  title?: ReactNode
  eyebrow?: ReactNode
  rivets?: boolean
  interactive?: boolean
  /** Replaces the eyebrow + title block. */
  header?: ReactNode
  actions?: ReactNode
  footer?: ReactNode
  as?: 'section' | 'article' | 'div' | 'aside'
}

export function Card({ variant = 'plate', title, eyebrow, rivets, interactive, header, actions, footer, as: Tag = 'section', className, children, ...rest }: CardProps) {
  return (
    <Tag className={cx('ml-card', `ml-card--${variant}`, className, { 'ml-card--rivets': rivets, 'ml-card--interactive': interactive })} {...rest}>
      {(title || eyebrow || header || actions) && (
        <header className="ml-card__header">
          <div className="ml-card__heading">
            {header ?? (
              <>
                {eyebrow && <p className="ml-card__eyebrow">{eyebrow}</p>}
                {title && <h3 className="ml-card__title">{title}</h3>}
              </>
            )}
          </div>
          {actions}
        </header>
      )}
      {children != null && <div className="ml-card__body">{children}</div>}
      {footer && <footer className="ml-card__footer">{footer}</footer>}
    </Tag>
  )
}

export interface AlertProps {
  tone?: MlAlertTone
  title?: ReactNode
  closable?: boolean
  onClose?: () => void
  icon?: ReactNode
  children?: ReactNode
  className?: string
}

export function Alert({ tone = 'info', title, closable, onClose, icon, children, className }: AlertProps) {
  const loc = useLocale()
  const [visible, setVisible] = useState(true)
  if (!visible) return null
  return (
    <div className={cx('ml-alert', `ml-alert--${tone}`, className)} role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'}>
      <span className="ml-alert__icon">{icon ?? <Icon name={tone} />}</span>
      <div className="ml-alert__content">
        {title && <p className="ml-alert__title">{title}</p>}
        {children != null && <div className="ml-alert__body">{children}</div>}
      </div>
      {closable && (
        <button
          type="button"
          className="ml-alert__close"
          aria-label={loc.common.close}
          onClick={() => {
            setVisible(false)
            onClose?.()
          }}
        >
          <Icon name="close" />
        </button>
      )}
    </div>
  )
}

/* ── Mascot, Avatar, Empty ──────────────────────────────── */

export interface MascotProps {
  size?: number
  pose?: 'avatar' | 'full'
  frame?: 'none' | 'ring' | 'hex'
  glow?: boolean
  /** Alt text; pass "" when the lion is decoration. */
  title?: string
  className?: string
}

export function Mascot({ size = 96, pose = 'avatar', frame = 'none', glow, title, className }: MascotProps) {
  const loc = useLocale()
  return (
    <span
      className={cx('ml-mascot', `ml-mascot--${pose}`, `ml-mascot--frame-${pose === 'full' ? 'none' : frame}`, className, { 'ml-mascot--glow': glow })}
      style={{ '--_size': `${size}px` } as CSSProperties}
    >
      <img className="ml-mascot__img" src={pose === 'full' ? mascotImages.full : mascotImages.avatar} alt={title ?? loc.mascot} draggable={false} decoding="async" />
    </span>
  )
}

const CJK = /[㐀-鿿豈-﫿]/
function initialsOf(name?: string) {
  const n = name?.trim()
  if (!n) return '?'
  if (CJK.test(n)) return n.slice(0, 1)
  const words = n.split(/\s+/)
  if (words.length === 1) {
    const isToken = /^[^\p{L}]/u.test(n) || (n.length <= 3 && n === n.toUpperCase())
    return isToken ? n.slice(0, 3) : n[0]
  }
  return words.slice(0, 2).map((w) => w[0]).join('')
}

export interface AvatarProps {
  src?: string
  name?: string
  size?: MlAvatarSize
  ring?: 'gold' | 'steel' | 'tech'
  status?: MlAvatarStatus
  /** Use the Malilion mascot as the picture. */
  lion?: boolean
  className?: string
}

export function Avatar({ src, name, size = 'md', ring = 'gold', status, lion, className }: AvatarProps) {
  const loc = useLocale()
  const picture = src ?? (lion ? mascotImages.avatar : undefined)
  const [failedFor, setFailedFor] = useState<string>()
  const showImg = !!picture && failedFor !== picture
  return (
    <span className={cx('ml-avatar', `ml-avatar--${size}`, `ml-avatar--${ring}`, className)} role={showImg ? undefined : 'img'} aria-label={showImg ? undefined : name}>
      <span className="ml-avatar__face">
        {showImg ? (
          <img className="ml-avatar__img" src={picture} alt={name ?? (lion ? loc.mascot : '')} onError={() => setFailedFor(picture)} />
        ) : (
          <span className="ml-avatar__initials" aria-hidden="true">
            {initialsOf(name)}
          </span>
        )}
      </span>
      {status && (
        <span className={cx('ml-avatar__status', `ml-avatar__status--${status}`)} title={loc.status[status]}>
          <span className="ml-visually-hidden">{loc.status[status]}</span>
        </span>
      )}
    </span>
  )
}

export interface EmptyProps {
  title?: ReactNode
  description?: ReactNode
  art?: 'lion' | 'paws' | 'none' | ReactNode
  size?: 'sm' | 'md'
  children?: ReactNode
}

export function Empty({ title, description, art = 'lion', size = 'md', children }: EmptyProps) {
  const loc = useLocale()
  return (
    <div className={cx('ml-empty', `ml-empty--${size}`)}>
      {art !== 'none' && (
        <div className="ml-empty__art" aria-hidden="true">
          {art === 'lion' ? (
            <>
              <Mascot pose="full" size={size === 'sm' ? 84 : 120} title="" className="ml-empty__lion" />
              <span className="ml-empty__z">
                <i>z</i>
                <i>z</i>
                <i>z</i>
              </span>
            </>
          ) : art === 'paws' ? (
            <span className="ml-empty__paws">
              {[1, 2, 3, 4].map((n) => (
                <Paw key={n} tone="current" />
              ))}
            </span>
          ) : (
            art
          )}
        </div>
      )}
      <p className="ml-empty__title">{title ?? loc.empty.title}</p>
      {description && <p className="ml-empty__desc">{description}</p>}
      {children != null && <div className="ml-empty__actions">{children}</div>}
    </div>
  )
}

/* ── Progress & Loader ──────────────────────────────────── */

export interface ProgressProps {
  /** Omit (or null) for an indeterminate scan. */
  value?: number | null
  max?: number
  label?: ReactNode
  tone?: MlProgressTone
  size?: MlSize
  striped?: boolean
  smooth?: boolean
  showValue?: boolean
  paw?: boolean
}

export function Progress({ value = null, max = 100, label, tone = 'gold', size = 'md', striped, smooth, showValue = true, paw }: ProgressProps) {
  const labelId = useSvgId('ml-progress')
  const indeterminate = value === null || value === undefined
  const percent = indeterminate || max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div
      className={cx('ml-progress', `ml-progress--${tone}`, `ml-progress--${size}`, {
        'ml-progress--striped': striped,
        'ml-progress--smooth': smooth,
        'ml-progress--indeterminate': indeterminate,
        'ml-progress--paw': paw && !indeterminate,
      })}
    >
      {(label || showValue) && (
        <div className="ml-progress__head">
          <span id={labelId}>{label}</span>
          {showValue && <span className="ml-progress__value">{indeterminate ? 'SYNC' : `${Math.round(percent)}%`}</span>}
        </div>
      )}
      <div className="ml-progress__rail" style={{ '--_value': `${percent}%` } as CSSProperties}>
        <div
          className="ml-progress__track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={indeterminate ? undefined : Math.round(percent)}
          aria-labelledby={label ? labelId : undefined}
        >
          <div className={cx('ml-progress__bar', { 'ml-progress__bar--empty': !indeterminate && percent === 0 })} />
        </div>
        {paw && !indeterminate && <Paw tone="current" className="ml-progress__runner" />}
      </div>
    </div>
  )
}

const SPIKES = Array.from({ length: 12 }, (_, i) => ({ rotate: i * 30, opacity: 0.18 + (0.82 * (i + 1)) / 12 }))

export interface LoaderProps {
  size?: number
  variant?: 'reactor' | 'paws'
  tone?: 'gold' | 'tech' | 'bean'
  label?: ReactNode
  srLabel?: string
}

export function Loader({ size = 48, variant = 'reactor', tone = 'gold', label, srLabel }: LoaderProps) {
  const loc = useLocale()
  return (
    <span className={cx('ml-loader', `ml-loader--${tone}`, `ml-loader--${variant}`)} role="status" style={{ '--_size': `${size}px` } as CSSProperties}>
      {variant === 'paws' ? (
        <span className="ml-loader__trail" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <Paw key={i} tone="current" className="ml-loader__step" style={{ '--i': i } as CSSProperties} />
          ))}
        </span>
      ) : (
        <svg className="ml-loader__svg" viewBox="0 0 64 64" aria-hidden="true">
          <g className="ml-loader__mane">
            {SPIKES.map((s) => (
              <polygon key={s.rotate} points="32,3 36.2,15 27.8,15" fill="currentColor" opacity={s.opacity} transform={`rotate(${s.rotate} 32 32)`} />
            ))}
          </g>
          <circle className="ml-loader__ring" cx="32" cy="32" r="13" fill="none" stroke="currentColor" strokeWidth={1.5} strokeDasharray="3 4" opacity={0.55} />
          <g className="ml-loader__core">
            <polygon points="32,24 38.9,28 38.9,36 32,40 25.1,36 25.1,28" fill="currentColor" />
            <polygon points="32,28.5 35,30.25 35,33.75 32,35.5 29,33.75 29,30.25" fill="#fff" opacity={0.85} />
          </g>
        </svg>
      )}
      {label ? <span className="ml-loader__label">{label}</span> : <span className="ml-visually-hidden">{srLabel ?? loc.common.loading}</span>}
    </span>
  )
}

export interface SkeletonItemProps {
  variant?: 'text' | 'title' | 'circle' | 'rect' | 'button' | 'image'
  width?: number | string
  height?: number | string
  className?: string
}

export function SkeletonItem({ variant = 'text', width, height, className }: SkeletonItemProps) {
  return <span className={cx('ml-skeleton__item', `ml-skeleton__item--${variant}`, className)} style={{ width: len(width), height: len(height) }} aria-hidden="true" />
}

export interface SkeletonProps {
  loading?: boolean
  rows?: number
  avatar?: boolean
  title?: boolean
  animated?: boolean
  label?: string
  /** Custom placeholder layout. */
  template?: ReactNode
  children?: ReactNode
}

export function Skeleton({ loading = true, rows = 3, avatar, title = true, animated = true, label, template, children }: SkeletonProps) {
  const loc = useLocale()
  if (!loading) return <>{children}</>
  return (
    <div className={cx('ml-skeleton', { 'ml-skeleton--animated': animated, 'ml-skeleton--avatar': avatar })} role="status" aria-busy="true">
      <span className="ml-visually-hidden">{label ?? loc.skeleton}</span>
      {template ?? (
        <>
          {avatar && <SkeletonItem variant="circle" className="ml-skeleton__avatar" />}
          <div className="ml-skeleton__lines">
            {title && <SkeletonItem variant="title" width="42%" />}
            {Array.from({ length: rows }, (_, i) => (
              <SkeletonItem key={i} width={i === rows - 1 && rows > 1 ? '64%' : undefined} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/* ── Stat, Banner, Result ───────────────────────────────── */

export interface StatProps {
  label: ReactNode
  value: ReactNode
  unit?: ReactNode
  delta?: number
  deltaSuffix?: string
  caption?: ReactNode
  icon?: ReactNode
}

export function Stat({ label, value, unit, delta, deltaSuffix = '%', caption, icon }: StatProps) {
  const trend = delta === undefined ? undefined : delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'
  const deltaText = delta === undefined ? '' : `${delta > 0 ? '+' : delta < 0 ? '−' : '±'}${Math.abs(delta)}${deltaSuffix}`
  return (
    <div className="ml-stat">
      <div className="ml-stat__label">
        {icon}
        {label}
      </div>
      <div className="ml-stat__value">
        <span className="ml-metal-text">{value}</span>
        {unit && <span className="ml-stat__unit">{unit}</span>}
      </div>
      {(trend || caption) && (
        <div className="ml-stat__foot">
          {trend && (
            <span className={cx('ml-stat__delta', `ml-stat__delta--${trend}`)}>
              {trend !== 'flat' && <Icon name={trend} />}
              {deltaText}
            </span>
          )}
          {caption && <span>{caption}</span>}
        </div>
      )}
    </div>
  )
}

const BANNER_ICONS: Record<string, IconName> = { info: 'info', success: 'success', warning: 'warning', danger: 'danger', gold: 'bell' }

export interface BannerProps {
  tone?: 'info' | 'success' | 'warning' | 'danger' | 'gold' | 'paw'
  title?: ReactNode
  message?: ReactNode
  icon?: IconName | 'none'
  closable?: boolean
  sticky?: boolean
  /** Remember a dismissal in localStorage under this key. */
  storageKey?: string
  onClose?: () => void
  action?: ReactNode
  children?: ReactNode
}

export function Banner({ tone = 'info', title, message, icon, closable, sticky, storageKey, onClose, action, children }: BannerProps) {
  const loc = useLocale()
  const [visible, setVisible] = useState(() => {
    if (!storageKey || typeof localStorage === 'undefined') return true
    try {
      return localStorage.getItem(storageKey) !== 'dismissed'
    } catch {
      return true
    }
  })
  if (!visible) return null
  const close = () => {
    setVisible(false)
    onClose?.()
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, 'dismissed')
      } catch {
        // Storage blocked: closed for this page view either way.
      }
    }
  }
  return (
    <div className={cx('ml-banner', `ml-banner--${tone}`, { 'ml-banner--sticky': sticky })} role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'}>
      {icon !== 'none' && (
        <span className="ml-banner__icon" aria-hidden="true">
          {tone === 'paw' && !icon ? <Paw tone="current" /> : <Icon name={icon ?? BANNER_ICONS[tone] ?? 'info'} />}
        </span>
      )}
      <p className="ml-banner__text">
        {title && <strong className="ml-banner__title">{title}</strong>}
        {children ?? message}
      </p>
      {action && <div className="ml-banner__action">{action}</div>}
      {closable && (
        <button type="button" className="ml-banner__close" aria-label={loc.banner.close} onClick={close}>
          <Icon name="close" />
        </button>
      )}
    </div>
  )
}

const RESULT_ICONS: Partial<Record<MlResultStatus, IconName>> = { success: 'success', info: 'info', warning: 'warning', error: 'danger' }

export interface ResultProps {
  status?: MlResultStatus
  title?: ReactNode
  subtitle?: ReactNode
  hideMascot?: boolean
  art?: ReactNode
  actions?: ReactNode
  children?: ReactNode
}

export function Result({ status = 'info', title, subtitle, hideMascot, art, actions, children }: ResultProps) {
  const loc = useLocale()
  const preset = loc.result[status]
  const isCode = /^\d+$/.test(status)
  return (
    <section className={cx('ml-result', `ml-result--${status}`, { 'ml-result--code': isCode })}>
      <div className="ml-result__art" aria-hidden="true">
        {art ??
          (isCode ? (
            <>
              <div className="ml-result__code">
                {[...status].map((d, i) =>
                  d === '0' ? (
                    <span key={i} className="ml-result__zero" style={{ '--_i': i } as CSSProperties}>
                      <Paw tone="gold" />
                    </span>
                  ) : (
                    <span key={i} className="ml-result__digit ml-metal-text" style={{ '--_i': i } as CSSProperties}>
                      {d}
                    </span>
                  ),
                )}
              </div>
              {!hideMascot && <Mascot pose="full" size={132} title="" className="ml-result__lion" />}
            </>
          ) : (
            <span className="ml-result__emblem">
              <Icon name={RESULT_ICONS[status]!} />
            </span>
          ))}
      </div>
      <h2 className="ml-result__title">{title ?? preset.title}</h2>
      <p className="ml-result__subtitle">{subtitle ?? preset.subtitle}</p>
      {children != null && <div className="ml-result__content">{children}</div>}
      {actions && <div className="ml-result__actions">{actions}</div>}
    </section>
  )
}

/* ── Breadcrumb, Steps, Descriptions, Timeline ──────────── */

export function Breadcrumb({ items, label }: { items: MlBreadcrumbItem[]; label?: string }) {
  const loc = useLocale()
  return (
    <nav className="ml-breadcrumb" aria-label={label ?? loc.nav.breadcrumb}>
      <ol>
        {items.map((item, i) => {
          const last = i === items.length - 1
          return (
            <li key={`${i}-${item.label}`} className="ml-breadcrumb__item">
              {item.href && !last ? (
                <a href={item.href} className="ml-breadcrumb__link">
                  {item.icon && <Icon name={item.icon} />}
                  {item.label}
                </a>
              ) : (
                <span className={cx('ml-breadcrumb__text', { 'ml-breadcrumb__text--current': last })} aria-current={last ? 'page' : undefined}>
                  {item.icon && <Icon name={item.icon} />}
                  {item.label}
                </span>
              )}
              {!last && <Icon name="chevronRight" className="ml-breadcrumb__sep" />}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export function Steps({ items, current = 0, label }: { items: MlStepItem[]; current?: number; label?: string }) {
  const loc = useLocale()
  return (
    <ol className="ml-steps" aria-label={label ?? loc.nav.steps}>
      {items.map((item, i) => (
        <li
          key={`${i}-${item.title}`}
          className={cx('ml-steps__item', i < current ? 'ml-steps__item--done' : i === current ? 'ml-steps__item--current' : 'ml-steps__item--todo')}
          aria-current={i === current ? 'step' : undefined}
        >
          <span className="ml-steps__marker">{i < current ? <Paw tone="current" /> : i + 1}</span>
          <span className="ml-steps__text">
            <span className="ml-steps__title">{item.title}</span>
            {item.desc && <span className="ml-steps__desc">{item.desc}</span>}
            <span className="ml-visually-hidden">{i < current ? loc.nav.stepDone : i === current ? loc.nav.stepCurrent : ''}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}

export interface DescriptionsProps {
  items: MlDescriptionItem[]
  title?: ReactNode
  columns?: number
  variant?: 'plate' | 'plain'
  horizontal?: boolean
  extra?: ReactNode
  /** Custom value per item. */
  renderValue?: (item: MlDescriptionItem, index: number) => ReactNode
}

export function Descriptions({ items, title, columns = 3, variant = 'plate', horizontal, extra, renderValue }: DescriptionsProps) {
  return (
    <section className={cx('ml-desc', `ml-desc--${variant}`, { 'ml-desc--horizontal': horizontal })}>
      {(title || extra) && (
        <header className="ml-desc__head">
          <h3 className="ml-desc__title">{title}</h3>
          {extra && <div className="ml-desc__extra">{extra}</div>}
        </header>
      )}
      <dl className="ml-desc__grid" style={{ '--_cols': columns } as CSSProperties}>
        {items.map((item, i) => (
          <div key={`${item.label}-${i}`} className="ml-desc__cell" style={item.span ? ({ '--_span': Math.min(item.span, columns) } as CSSProperties) : undefined}>
            <dt className="ml-desc__label">{item.label}</dt>
            <dd className={cx('ml-desc__value', { 'ml-desc__value--mono': item.mono })}>{renderValue?.(item, i) ?? item.value ?? '—'}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export interface TimelineProps {
  items: MlTimelineItem[]
  reverse?: boolean
  pending?: ReactNode
  mode?: 'left' | 'alternate'
}

export function Timeline({ items, reverse, pending, mode = 'left' }: TimelineProps) {
  const ordered = items.map((item, index) => ({ item, index })).sort((a, b) => (reverse ? b.index - a.index : a.index - b.index))
  return (
    <ol className={cx('ml-timeline', `ml-timeline--${mode}`)}>
      {ordered.map(({ item, index }, i) => (
        <li key={index} className={cx('ml-timeline__item', `ml-timeline__item--${item.tone ?? 'gold'}`)} style={{ '--_i': i } as CSSProperties}>
          <span className="ml-timeline__node" aria-hidden="true">
            {item.paw ? <Paw tone="current" className="ml-timeline__paw" /> : item.icon ? <Icon name={item.icon} className="ml-timeline__icon" /> : <span className="ml-timeline__dot" />}
          </span>
          <div className="ml-timeline__content">
            {item.time && <time className="ml-timeline__time">{item.time}</time>}
            <p className="ml-timeline__title">{item.title}</p>
            {item.desc && <div className="ml-timeline__desc">{item.desc}</div>}
          </div>
        </li>
      ))}
      {pending && (
        <li className="ml-timeline__item ml-timeline__item--pending" style={{ '--_i': ordered.length } as CSSProperties}>
          <span className="ml-timeline__node" aria-hidden="true">
            <span className="ml-timeline__dot" />
          </span>
          <div className="ml-timeline__content">
            <p className="ml-timeline__title">{pending}</p>
          </div>
        </li>
      )}
    </ol>
  )
}
