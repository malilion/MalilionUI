import { Fragment, forwardRef, useEffect, useImperativeHandle, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { activeGroup, groupIndexItems, itemKey, railKeyAt, railKeys } from '../components/index-bar'
import type { MlIndexBarItem } from '../types'
import { zhuyinPieces, type MlIndexMode } from '../zhuyin'
import { useLocale } from './locale'
import { cx } from './utils'

/* ── IndexBar ──────────────────────────────────────────── */

export interface IndexBarHandle {
  /** Scroll so a group's header sits at the top. */
  jump(index: string): void
}

export interface IndexBarProps<T extends MlIndexBarItem = MlIndexBarItem> {
  items?: T[]
  /** zhuyin: ㄅㄆㄇ for Chinese (by 注音 collation), then A–Z. alphabet: A–Z, Chinese by pinyin. */
  mode?: MlIndexMode
  /** The rail's keys, in order. Default: only the indexes that have items. */
  indexes?: string[]
  /** Sort each group like a phone book. false keeps your order. */
  sort?: boolean
  /** Height of the scrolling list. Numbers are pixels. */
  height?: number | string
  /** Group headers stick to the top while their group scrolls past. */
  sticky?: boolean
  /** Accessible name of the rail. Default "索引". */
  label?: string
  onChange?: (index: string) => void
  onItemClick?: (item: T) => void
  renderItem?: (item: T, index: string) => ReactNode
  renderHeader?: (index: string) => ReactNode
  empty?: ReactNode
  className?: string
}

const NO_ITEMS: MlIndexBarItem[] = []

function IndexBarInner<T extends MlIndexBarItem>(
  { items = NO_ITEMS as T[], mode = 'zhuyin', indexes, sort = true, height = 420, sticky = true, label, onChange, onItemClick, renderItem, renderHeader, empty, className }: IndexBarProps<T>,
  ref: React.Ref<IndexBarHandle>,
) {
  const loc = useLocale()
  const groups = groupIndexItems(items, mode, sort, indexes)
  const keys = railKeys(groups, indexes)
  const present = new Set(groups.map((g) => g.key))
  const [activeState, setActiveState] = useState(groups[0]?.key ?? '')
  const active = present.has(activeState) ? activeState : (groups[0]?.key ?? '')
  const [dragging, setDragging] = useState(false)
  const list = useRef<HTMLDivElement>(null)
  const rail = useRef<HTMLElement>(null)
  const latest = useRef({ active, groups, onChange })
  latest.current = { active, groups, onChange }

  const setActive = (key: string) => {
    if (key === latest.current.active) return
    latest.current.active = key
    setActiveState(key)
    latest.current.onChange?.(key)
  }

  const onScroll = () => {
    const el = list.current
    if (!el) return
    const sections = [...el.querySelectorAll<HTMLElement>('.ml-indexbar__group')]
    if (!sections.length) return
    const key = latest.current.groups[activeGroup(sections.map((s) => s.offsetTop), el.scrollTop)]?.key
    if (key) setActive(key)
  }

  const jump = (key: string) => {
    const el = list.current
    const section = [...(el?.querySelectorAll<HTMLElement>('.ml-indexbar__group') ?? [])].find((s) => s.dataset.index === key)
    if (!el || !section) return
    el.scrollTop = section.offsetTop
    setActive(key)
  }
  useImperativeHandle(ref, () => ({ jump }))

  const pick = (clientY: number) => {
    const buttons = [...(rail.current?.querySelectorAll<HTMLElement>('.ml-indexbar__key:not(:disabled)') ?? [])]
    if (!buttons.length) return
    const centers = buttons.map((b) => {
      const r = b.getBoundingClientRect()
      return r.top + r.height / 2
    })
    const key = buttons[railKeyAt(centers, clientY)].dataset.key
    if (key) jump(key)
    return key
  }

  // No pointer capture: a finger already stays with the rail, and capturing would
  // send the click that ends a drag to the <nav>, where it bubbles out as a click
  // on nothing. Instead the click that ends a drag onto another key is dropped.
  const drag = useRef({ downKey: undefined as string | undefined, away: false })
  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0) return
    e.preventDefault()
    setDragging(true)
    drag.current = { downKey: pick(e.clientY), away: false }
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    if (dragging && pick(e.clientY) !== drag.current.downKey) drag.current.away = true
  }
  const onKeyClick = (key: string) => {
    if (drag.current.away) drag.current.away = false
    else jump(key)
  }

  const focusKey = useRef<string>(undefined)
  useEffect(() => {
    if (focusKey.current === undefined) return
    const key = focusKey.current
    focusKey.current = undefined
    ;[...(rail.current?.querySelectorAll<HTMLElement>('.ml-indexbar__key') ?? [])].find((b) => b.dataset.key === key)?.focus()
  })
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const usable = keys.filter((k) => present.has(k))
    const i = usable.indexOf(active)
    const next =
      e.key === 'ArrowDown' ? usable[Math.min(usable.length - 1, i + 1)]
      : e.key === 'ArrowUp' ? usable[Math.max(0, i - 1)]
      : e.key === 'Home' ? usable[0]
      : e.key === 'End' ? usable[usable.length - 1]
      : undefined
    if (next === undefined) return
    e.preventDefault()
    focusKey.current = next
    jump(next)
  }

  return (
    <div
      className={cx('ml-indexbar', className, { 'ml-indexbar--sticky': sticky, 'ml-indexbar--dragging': dragging })}
      style={{ '--ml-indexbar-h': typeof height === 'number' ? `${height}px` : height } as React.CSSProperties}
    >
      <div ref={list} className="ml-indexbar__list" tabIndex={0} onScroll={onScroll}>
        {groups.map((group) => (
          <section key={group.key} className="ml-indexbar__group" data-index={group.key}>
            <div className="ml-indexbar__header" role="heading" aria-level={3}>
              {renderHeader ? renderHeader(group.key) : group.key}
            </div>
            <ul className="ml-indexbar__items">
              {group.items.map((item, i) => (
                <li key={itemKey(item, i)} className="ml-indexbar__row">
                  {renderItem ? (
                    renderItem(item, group.key)
                  ) : (
                    <button type="button" className="ml-indexbar__item" onClick={() => onItemClick?.(item)}>
                      <span className="ml-indexbar__label">{item.label}</span>
                      {item.desc && <span className="ml-indexbar__desc">{item.desc}</span>}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
        {!groups.length && <p className="ml-indexbar__empty">{empty ?? loc.indexBar.empty}</p>}
      </div>
      {groups.length > 0 && (
        <nav
          ref={rail}
          className="ml-indexbar__rail"
          aria-label={label ?? loc.indexBar.label}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
          onPointerLeave={() => setDragging(false)}
          onKeyDown={onKeyDown}
          onClick={(e) => {
            // A mouse drag between keys clicks the rail itself; keep that click from reaching outer handlers.
            if (e.target !== e.currentTarget) return
            drag.current.away = false
            e.stopPropagation()
          }}
        >
          {keys.map((key) => (
            <button
              key={key}
              type="button"
              className={cx('ml-indexbar__key', { 'ml-indexbar__key--active': key === active, 'ml-indexbar__key--empty': !present.has(key) })}
              data-key={key}
              aria-label={loc.indexBar.jump(key)}
              aria-current={key === active ? 'true' : undefined}
              disabled={!present.has(key)}
              tabIndex={key === active ? 0 : -1}
              onClick={() => onKeyClick(key)}
            >
              {key}
            </button>
          ))}
        </nav>
      )}
      {dragging && active && (
        <span className="ml-indexbar__bubble" aria-hidden="true">
          {active}
        </span>
      )}
    </div>
  )
}

export const IndexBar = forwardRef(IndexBarInner) as <T extends MlIndexBarItem = MlIndexBarItem>(
  props: IndexBarProps<T> & { ref?: React.Ref<IndexBarHandle> },
) => ReturnType<typeof IndexBarInner>

/* ── Zhuyin ────────────────────────────────────────────── */

export interface ZhuyinProps {
  /** The Chinese text. */
  text: string
  /**
   * Readings for the Han characters in order, separated by spaces (注音 or
   * pinyin; "_" skips one). Without it, words registered with registerZhuyin() are used.
   */
  zhuyin?: string | string[]
  /** right: 直式 like Taiwanese textbooks. top: a ruby line above. */
  position?: 'right' | 'top'
  className?: string
}

const MARK = ['', '', 'ˊ', 'ˇ', 'ˋ', '']

export function Zhuyin({ text, zhuyin, position = 'right', className }: ZhuyinProps) {
  const units = zhuyinPieces(text, zhuyin)
  return (
    <span className={cx('ml-zhuyin', `ml-zhuyin--${position}`, className)} lang="zh-Hant-TW">
      {units.map((u, i) =>
        u.symbols.length ? (
          <span key={i} className="ml-zhuyin__glyph">
            <ruby className="ml-zhuyin__unit">
              {u.char}
              <rp>(</rp>
              <rt className="ml-zhuyin__rt">
                <span className="ml-zhuyin__col">
                  {u.tone === 5 && <span className="ml-zhuyin__light">˙</span>}
                  {u.symbols.map((sym, k) => (
                    <span key={k} className="ml-zhuyin__sym">
                      {sym}
                    </span>
                  ))}
                </span>
                {MARK[u.tone] && <span className="ml-zhuyin__tone">{MARK[u.tone]}</span>}
              </rt>
              <rp>)</rp>
            </ruby>
            {u.tail}
          </span>
        ) : (
          <Fragment key={i}>{u.char}</Fragment>
        ),
      )}
    </span>
  )
}
