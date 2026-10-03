import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type ForwardedRef,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type RefAttributes,
} from 'react'
import type { MlTransferItem, MlTreeNode } from '../types'
import { Button, Icon, Paw } from './basic'
import { Checkbox } from './form'
import { useLocale } from './locale'
import { cx, len, useControllable } from './utils'

type Key = string | number

/* ── Tree ──────────────────────────────────────────────── */

interface Row {
  node: MlTreeNode
  level: number
  parent: Key | null
  posinset: number
  setsize: number
  hasChildren: boolean
  expanded: boolean
}

export interface TreeHandle {
  /** Expand every node that has children. */
  expandAll: () => void
  collapseAll: () => void
}

export interface TreeProps {
  data: MlTreeNode[]
  /** Tri-state checkboxes; checked keys live in checked / onCheckedChange. */
  checkable?: boolean
  /** Click / Enter marks a single node as selected. */
  selectable?: boolean
  /** Show only nodes whose label contains this text (plus their ancestors). */
  filter?: string
  /** Accessible name for the tree. */
  label?: string
  /** Text when nothing matches the filter. */
  emptyText?: string
  expanded?: Key[]
  defaultExpanded?: Key[]
  onExpandedChange?: (keys: Key[]) => void
  selected?: Key | null
  defaultSelected?: Key | null
  onSelectedChange?: (key: Key | null) => void
  checked?: Key[]
  defaultChecked?: Key[]
  onCheckedChange?: (keys: Key[]) => void
  onSelect?: (node: MlTreeNode) => void
  onCheck?: (node: MlTreeNode, checked: boolean) => void
  /** Custom label content (the Vue `node` slot). */
  renderNode?: (node: MlTreeNode, level: number, expanded: boolean) => ReactNode
}

const NONE: Key[] = []

function parts(label: string, query: string): ReactNode {
  const at = query ? label.toLowerCase().indexOf(query) : -1
  if (at < 0) return label
  return (
    <>
      {label.slice(0, at)}
      <mark className="ml-combobox__hit">{label.slice(at, at + query.length)}</mark>
      {label.slice(at + query.length)}
    </>
  )
}

export const Tree = forwardRef<TreeHandle, TreeProps>(function Tree(
  {
    data,
    checkable,
    selectable = true,
    filter,
    label,
    emptyText,
    expanded: expandedProp,
    defaultExpanded = NONE,
    onExpandedChange,
    selected: selectedProp,
    defaultSelected = null,
    onSelectedChange,
    checked: checkedProp,
    defaultChecked = NONE,
    onCheckedChange,
    onSelect,
    onCheck,
    renderNode,
  },
  ref,
) {
  const loc = useLocale()
  const [expanded, setExpandedKeys] = useControllable(expandedProp, defaultExpanded, onExpandedChange)
  const [selected, setSelected] = useControllable<Key | null>(selectedProp, defaultSelected, onSelectedChange)
  const [checked, setChecked] = useControllable(checkedProp, defaultChecked, onCheckedChange)
  const rowEls = useRef(new Map<Key, HTMLElement>())
  const [focusedKey, setFocusedKey] = useState<Key | null>(null)
  const pendingFocus = useRef<Key | null>(null)
  const typeahead = useRef({ text: '', timer: undefined as ReturnType<typeof setTimeout> | undefined })

  const parentOf = new Map<Key, Key | null>()
  const byKey = new Map<Key, MlTreeNode>()
  const index = (nodes: MlTreeNode[], parent: Key | null) =>
    nodes.forEach((n) => {
      byKey.set(n.key, n)
      parentOf.set(n.key, parent)
      if (n.children) index(n.children, n.key)
    })
  index(data, null)

  const query = filter?.trim().toLowerCase() ?? ''
  const matches = (n: MlTreeNode) => !!query && n.label.toLowerCase().includes(query)
  let kept: Set<Key> | null = null
  if (query) {
    const keep = new Set<Key>()
    const visit = (n: MlTreeNode): boolean => {
      const childHit = (n.children ?? []).map(visit).some(Boolean)
      const hit = matches(n) || childHit
      if (hit) keep.add(n.key)
      return hit
    }
    data.forEach(visit)
    kept = keep
  }
  const expandedSet = new Set(expanded)
  const isExpanded = (n: MlTreeNode) => !!n.children?.length && (kept ? n.children.some((c) => kept!.has(c.key)) : expandedSet.has(n.key))

  const rows: Row[] = []
  const walk = (nodes: MlTreeNode[], level: number, parent: Key | null) => {
    const shown = kept ? nodes.filter((n) => kept!.has(n.key)) : nodes
    shown.forEach((node, i) => {
      const open = isExpanded(node)
      rows.push({ node, level, parent, posinset: i + 1, setsize: shown.length, hasChildren: !!node.children?.length, expanded: open })
      if (open) walk(node.children!, level + 1, node.key)
    })
  }
  walk(data, 1, null)

  const checkedSet = new Set(checked)
  const leaves = (n: MlTreeNode): MlTreeNode[] => (n.children?.length ? n.children.flatMap(leaves) : [n])
  function checkState(n: MlTreeNode): boolean | 'mixed' {
    if (!n.children?.length) return checkedSet.has(n.key)
    const ls = leaves(n).filter((l) => !l.disabled)
    if (!ls.length) return checkedSet.has(n.key)
    const on = ls.filter((l) => checkedSet.has(l.key)).length
    return on === 0 ? false : on === ls.length ? true : 'mixed'
  }

  function toggleCheck(n: MlTreeNode) {
    if (n.disabled) return
    const turnOn = checkState(n) !== true
    const next = new Set(checked)
    const apply = (node: MlTreeNode) => {
      if (node.disabled) return
      if (turnOn) next.add(node.key)
      else next.delete(node.key)
      node.children?.forEach(apply)
    }
    apply(n)
    // Re-derive every ancestor from its children.
    let parent = parentOf.get(n.key) ?? null
    while (parent !== null) {
      const kids = (byKey.get(parent)!.children ?? []).filter((c) => !c.disabled)
      if (kids.length && kids.every((c) => next.has(c.key))) next.add(parent)
      else next.delete(parent)
      parent = parentOf.get(parent) ?? null
    }
    setChecked([...next])
    onCheck?.(n, turnOn)
  }

  function setExpanded(n: MlTreeNode, open: boolean) {
    if (!n.children?.length || kept) return
    const has = expandedSet.has(n.key)
    if (open && !has) setExpandedKeys([...expanded, n.key])
    else if (!open && has) setExpandedKeys(expanded.filter((k) => k !== n.key))
  }

  function select(n: MlTreeNode) {
    if (n.disabled || !selectable) return
    setSelected(n.key)
    onSelect?.(n)
  }

  function onRowClick(row: Row) {
    setFocusedKey(row.node.key)
    if (row.node.disabled) return
    if (checkable && !selectable) toggleCheck(row.node)
    else select(row.node)
    if (row.hasChildren) setExpanded(row.node, !row.expanded)
  }

  useImperativeHandle(ref, () => ({
    expandAll: () => setExpandedKeys([...byKey.values()].filter((n) => n.children?.length).map((n) => n.key)),
    collapseAll: () => setExpandedKeys([]),
  }))

  const keys = rows.map((r) => r.node.key)
  const tabKey = focusedKey !== null && keys.includes(focusedKey) ? focusedKey : selected !== null && keys.includes(selected) ? selected : (keys[0] ?? null)

  function focusKey(key: Key | undefined | null) {
    if (key === undefined || key === null) return
    setFocusedKey(key)
    pendingFocus.current = key
    rowEls.current.get(key)?.focus()
  }
  useEffect(() => {
    const key = pendingFocus.current
    if (key === null) return
    pendingFocus.current = null
    rowEls.current.get(key)?.focus()
  })
  useEffect(() => () => clearTimeout(typeahead.current.timer), [])

  function onKeydown(event: KeyboardEvent, row: Row) {
    const i = rows.findIndex((r) => r.node.key === row.node.key)
    const n = row.node
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        focusKey(rows[i + 1]?.node.key)
        break
      case 'ArrowUp':
        event.preventDefault()
        focusKey(rows[i - 1]?.node.key)
        break
      case 'ArrowRight':
        event.preventDefault()
        if (row.hasChildren && !row.expanded) setExpanded(n, true)
        else if (row.expanded) focusKey(rows[i + 1]?.node.key)
        break
      case 'ArrowLeft':
        event.preventDefault()
        if (row.expanded && !kept) setExpanded(n, false)
        else focusKey(row.parent)
        break
      case 'Home':
        event.preventDefault()
        focusKey(rows[0]?.node.key)
        break
      case 'End':
        event.preventDefault()
        focusKey(rows[rows.length - 1]?.node.key)
        break
      case 'Enter':
        event.preventDefault()
        if (selectable) select(n)
        else if (checkable) toggleCheck(n)
        break
      case ' ':
        event.preventDefault()
        if (checkable) toggleCheck(n)
        else select(n)
        break
      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          const t = typeahead.current
          clearTimeout(t.timer)
          t.text += event.key.toLowerCase()
          t.timer = setTimeout(() => (t.text = ''), 600)
          const order = [...rows.slice(i + (t.text.length === 1 ? 1 : 0)), ...rows.slice(0, i + 1)]
          focusKey(order.find((r) => r.node.label.toLowerCase().startsWith(t.text))?.node.key)
        }
    }
  }

  return (
    <div className="ml-tree-wrap">
      <ul role="tree" aria-label={label} aria-multiselectable={checkable || undefined} className={cx('ml-tree', { 'ml-tree--checkable': checkable })}>
        {rows.map((row) => {
          const state = checkable ? checkState(row.node) : false
          return (
            <li
              key={row.node.key}
              ref={(el) => {
                if (el) rowEls.current.set(row.node.key, el)
                else rowEls.current.delete(row.node.key)
              }}
              role="treeitem"
              aria-level={row.level}
              aria-setsize={row.setsize}
              aria-posinset={row.posinset}
              aria-expanded={row.hasChildren ? row.expanded : undefined}
              aria-selected={selectable && !checkable ? selected === row.node.key : undefined}
              aria-checked={checkable ? state : undefined}
              aria-disabled={row.node.disabled || undefined}
              tabIndex={tabKey === row.node.key ? 0 : -1}
              className={cx('ml-tree__row', {
                'ml-tree__row--selected': selectable && selected === row.node.key,
                'ml-tree__row--disabled': row.node.disabled,
                'ml-tree__row--match': matches(row.node),
              })}
              style={{ '--_level': row.level } as CSSProperties}
              onClick={() => onRowClick(row)}
              onKeyDown={(e) => onKeydown(e, row)}
              onFocus={() => setFocusedKey(row.node.key)}
            >
              {row.hasChildren ? (
                <span
                  className="ml-tree__twisty"
                  aria-hidden="true"
                  onClick={(e) => {
                    e.stopPropagation()
                    setExpanded(row.node, !row.expanded)
                  }}
                >
                  <Icon name="chevronRight" />
                </span>
              ) : (
                <span className="ml-tree__twisty ml-tree__twisty--leaf" aria-hidden="true">
                  <Paw tone="current" />
                </span>
              )}
              {checkable && (
                <span
                  className={cx('ml-tree__check', { 'ml-tree__check--on': state === true, 'ml-tree__check--mixed': state === 'mixed' })}
                  aria-hidden="true"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleCheck(row.node)
                  }}
                >
                  {state === true ? <Icon name="check" /> : state === 'mixed' ? <Icon name="minus" /> : null}
                </span>
              )}
              {row.node.icon && <Icon name={row.node.icon} className="ml-tree__icon" />}
              <span className="ml-tree__label">{renderNode ? renderNode(row.node, row.level, row.expanded) : parts(row.node.label, query)}</span>
            </li>
          )
        })}
      </ul>
      {!rows.length && query && <p className="ml-tree__empty">{emptyText ?? loc.tree.empty}</p>}
    </div>
  )
})

/* ── Transfer ──────────────────────────────────────────── */

type Side = 'left' | 'right'
const SIDES: Side[] = ['left', 'right']

export interface TransferProps {
  data: MlTransferItem[]
  /** Keys of the items in the right-hand list. */
  value?: Key[]
  defaultValue?: Key[]
  onChange?: (keys: Key[], direction: Side, moved: Key[]) => void
  /** [left title, right title] */
  titles?: [string, string]
  /** Search box above each list. */
  filterable?: boolean
  filterPlaceholder?: string
  /** Text on the move buttons; icons only when omitted. */
  buttonTexts?: [string, string]
  emptyText?: string
  renderItem?: (item: MlTransferItem, side: Side) => ReactNode
}

export function Transfer({ data, value, defaultValue = NONE, onChange, titles, filterable, filterPlaceholder, buttonTexts, emptyText, renderItem }: TransferProps) {
  const loc = useLocale()
  const heads = titles ?? loc.transfer.titles
  const [model, setModel] = useControllable(value, defaultValue)
  const id = `ml-transfer-${useId().replace(/[^\w-]/g, '')}`
  const [checked, setChecked] = useState<Record<Side, Key[]>>({ left: [], right: [] })
  const [query, setQuery] = useState<Record<Side, string>>({ left: '', right: '' })

  const rightSet = new Set(model)
  const items: Record<Side, MlTransferItem[]> = {
    left: data.filter((d) => !rightSet.has(d.key)),
    // Keep the right side in the order the keys were added.
    right: model.map((k) => data.find((d) => d.key === k)).filter((d): d is MlTransferItem => !!d),
  }
  const visible = (side: Side) => {
    const q = query[side].trim().toLowerCase()
    return q ? items[side].filter((d) => d.label.toLowerCase().includes(q)) : items[side]
  }
  const setSide = (side: Side, keys: Key[]) => setChecked((c) => ({ ...c, [side]: keys }))

  function toggle(side: Side, item: MlTransferItem, on: boolean) {
    if (item.disabled) return
    setSide(side, on ? [...checked[side], item.key] : checked[side].filter((k) => k !== item.key))
  }

  /** Select-all state over the *visible, enabled* items of one side. */
  function allState(side: Side): boolean | 'mixed' {
    const pool = visible(side).filter((d) => !d.disabled)
    if (!pool.length) return false
    const on = pool.filter((d) => checked[side].includes(d.key)).length
    return on === 0 ? false : on === pool.length ? true : 'mixed'
  }

  function toggleAll(side: Side) {
    const pool = visible(side).filter((d) => !d.disabled).map((d) => d.key)
    setSide(side, allState(side) === true ? checked[side].filter((k) => !pool.includes(k)) : [...new Set([...checked[side], ...pool])])
  }

  function move(to: Side) {
    const from: Side = to === 'right' ? 'left' : 'right'
    const moving = checked[from].filter((k) => items[from].some((d) => d.key === k && !d.disabled))
    if (!moving.length) return
    const next = to === 'right' ? [...model, ...moving] : model.filter((k) => !moving.includes(k))
    setModel(next)
    setSide(from, [])
    onChange?.(next, to, moving)
  }

  return (
    <div className="ml-transfer">
      {SIDES.map((side, s) => {
        const shown = visible(side)
        const all = allState(side)
        return [
          <section key={side} className="ml-transfer__panel" aria-labelledby={`${id}-${side}-title`}>
            <header className="ml-transfer__head">
              <Checkbox
                checked={all === true}
                indeterminate={all === 'mixed'}
                disabled={!shown.some((d) => !d.disabled)}
                aria-label={loc.transfer.selectAll(heads[s])}
                onChange={() => toggleAll(side)}
              />
              <span id={`${id}-${side}-title`} className="ml-transfer__title">
                {heads[s]}
              </span>
              <span className="ml-transfer__count">
                {`${checked[side].length ? `${checked[side].length} / ` : ''}${items[side].length}`}
              </span>
            </header>
            {filterable && (
              <div className="ml-transfer__search">
                <Icon name="search" />
                <input
                  type="search"
                  value={query[side]}
                  placeholder={filterPlaceholder ?? loc.transfer.filter}
                  aria-label={loc.transfer.searchIn(heads[s])}
                  onChange={(e) => setQuery((q) => ({ ...q, [side]: e.target.value }))}
                />
              </div>
            )}
            <ul className="ml-transfer__list" aria-label={heads[s]}>
              {shown.map((item) => (
                <li key={item.key} className="ml-transfer__item">
                  <Checkbox
                    checked={checked[side].includes(item.key)}
                    disabled={item.disabled}
                    hint={item.hint}
                    label={renderItem ? renderItem(item, side) : item.label}
                    onChange={(on) => toggle(side, item, on)}
                  />
                </li>
              ))}
            </ul>
            {!shown.length && (
              <p className="ml-transfer__empty">
                <Paw tone="steel" />
                {query[side] ? loc.transfer.noMatch : (emptyText ?? loc.transfer.empty)}
              </p>
            )}
          </section>,
          s === 0 && (
            <div key="actions" className="ml-transfer__actions">
              <Button
                size="sm"
                square={!buttonTexts}
                aria-label={buttonTexts ? undefined : loc.transfer.moveTo(heads[1])}
                disabled={!checked.left.length}
                suffix={<Icon name="arrowRight" />}
                onClick={() => move('right')}
              >
                {buttonTexts ? buttonTexts[1] : ''}
              </Button>
              <Button
                size="sm"
                variant="outline"
                square={!buttonTexts}
                aria-label={buttonTexts ? undefined : loc.transfer.moveBack(heads[0])}
                disabled={!checked.right.length}
                prefix={<Icon name="arrowLeft" />}
                onClick={() => move('left')}
              >
                {buttonTexts ? buttonTexts[0] : ''}
              </Button>
            </div>
          ),
        ]
      })}
    </div>
  )
}

/* ── VirtualList ───────────────────────────────────────── */

export interface VirtualListHandle {
  /** Scroll so row `index` is visible (aligned to the top by default). */
  scrollToIndex: (index: number, align?: 'start' | 'center' | 'end') => void
}

export interface VirtualListProps<T> {
  items: T[]
  /** Fixed row height in px (every row must be this tall). */
  itemHeight: number
  /** Viewport height: px number or any CSS length. */
  height?: number | string
  /** Extra rows rendered above and below the viewport. */
  overscan?: number
  /** Key for each row; defaults to its index. */
  itemKey?: (item: T, index: number) => string | number
  /** Accessible name for the list. */
  label?: string
  onReachEnd?: () => void
  onScroll?: (top: number) => void
  /** Renders one row (the Vue default slot). */
  children?: (item: T, index: number) => ReactNode
  /** Shown when `items` is empty. */
  empty?: ReactNode
}

function VirtualListInner<T>(
  { items, itemHeight, height = 360, overscan = 6, itemKey, label, onReachEnd, onScroll, children, empty }: VirtualListProps<T>,
  ref: ForwardedRef<VirtualListHandle>,
) {
  const viewport = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewHeight, setViewHeight] = useState(typeof height === 'number' ? height : 360)
  const frame = useRef(0)
  const reported = useRef(-1)
  const latest = useRef({ onReachEnd, onScroll, total: 0, items, itemHeight })

  const total = items.length * itemHeight
  latest.current = { onReachEnd, onScroll, total, items, itemHeight }
  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const end = Math.min(items.length, Math.ceil((scrollTop + viewHeight) / itemHeight) + overscan)

  function handleScroll() {
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      const el = viewport.current
      if (!el) return
      const l = latest.current
      setScrollTop(el.scrollTop)
      l.onScroll?.(el.scrollTop)
      // Fire once per list length when the last rows come into view.
      if (el.scrollTop + el.clientHeight >= l.total - l.itemHeight * 2 && reported.current !== l.items.length) {
        reported.current = l.items.length
        l.onReachEnd?.()
      }
    })
  }

  useEffect(() => {
    const el = viewport.current
    if (!el) return
    if (el.clientHeight) setViewHeight(el.clientHeight)
    let observer: ResizeObserver | undefined
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(([entry]) => {
        if (entry.contentRect.height) setViewHeight(entry.contentRect.height)
      })
      observer.observe(el)
    }
    return () => {
      observer?.disconnect()
      cancelAnimationFrame(frame.current)
    }
  }, [])

  // A shorter list (e.g. a new filter) might leave us scrolled past the end.
  const firstLength = useRef(true)
  useEffect(() => {
    if (firstLength.current) {
      firstLength.current = false
      return
    }
    const el = viewport.current
    if (el && el.scrollTop > total) el.scrollTop = Math.max(0, total - el.clientHeight)
    setScrollTop(el?.scrollTop ?? 0)
  }, [items.length])

  useImperativeHandle(ref, () => ({
    scrollToIndex(index, align = 'start') {
      const el = viewport.current
      if (!el) return
      const h = latest.current.itemHeight
      const offset = align === 'start' ? 0 : align === 'center' ? (el.clientHeight - h) / 2 : el.clientHeight - h
      el.scrollTop = Math.max(0, index * h - offset)
      setScrollTop(el.scrollTop)
    },
  }))

  return (
    <div ref={viewport} className="ml-vlist" style={{ height: len(height) }} role="list" aria-label={label} tabIndex={0} onScroll={handleScroll}>
      <div className="ml-vlist__spacer" style={{ height: `${total}px` }}>
        <div className="ml-vlist__window" style={{ transform: `translateY(${start * itemHeight}px)` }}>
          {items.slice(start, end).map((item, i) => {
            const index = start + i
            return (
              <div
                key={itemKey ? itemKey(item, index) : index}
                className="ml-vlist__row"
                role="listitem"
                aria-setsize={items.length}
                aria-posinset={index + 1}
                style={{ height: `${itemHeight}px` }}
              >
                {children?.(item, index)}
              </div>
            )
          })}
        </div>
      </div>
      {!items.length && empty}
    </div>
  )
}

/** Renders only the rows in view; every row must be `itemHeight` px tall. */
export const VirtualList = forwardRef(VirtualListInner) as <T>(props: VirtualListProps<T> & RefAttributes<VirtualListHandle>) => ReactElement | null
