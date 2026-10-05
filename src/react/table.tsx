import { Fragment, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { cellText, clampWidth, columnWidth, editString, editorOf, nextEditable, parseEdit, resizeBounds, resizeByKey, widthStyle } from '../components/table-edit'
import type { MlTableCellEdit, MlTableColumn, MlTableSort } from '../types'
import { Icon, Loader, Paw } from './basic'
import { Checkbox, Pagination } from './form'
import { useLocale } from './locale'
import { cx, len, useControllable } from './utils'

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

type Key = string | number

export interface TableCellContext<Row> {
  column: MlTableColumn<Row>
  row: Row
  value: unknown
  index: number
  level: number
}

export interface TableProps<Row extends Record<string, any>> {
  columns: MlTableColumn<Row>[]
  rows: Row[]
  /** Field name or function giving each row a stable key. */
  rowKey?: string | ((row: Row) => Key)
  caption?: string
  striped?: boolean
  dense?: boolean
  loading?: boolean
  /** Adds a checkbox column; selected keys live in `selected`. */
  selectable?: boolean
  /** Skip built-in sorting (e.g. the server sorts); just report the new sort. */
  manualSort?: boolean
  hoverPaw?: boolean
  emptyText?: string
  /** Scroll the body inside this height with a sticky header. */
  maxHeight?: number | string
  /** Rows per page; adds a pager under the table. */
  pageSize?: number
  /** Field that holds child rows: rows with children become a tree. */
  childrenKey?: string
  /** Which rows may open the expand panel (default: all, when renderExpand is set). */
  rowExpandable?: (row: Row) => boolean
  sort?: MlTableSort | null
  defaultSort?: MlTableSort | null
  onSortChange?: (sort: MlTableSort | null) => void
  selected?: Key[]
  defaultSelected?: Key[]
  onSelectedChange?: (keys: Key[]) => void
  expanded?: Key[]
  defaultExpanded?: Key[]
  onExpandedChange?: (keys: Key[]) => void
  treeOpen?: Key[]
  defaultTreeOpen?: Key[]
  onTreeOpenChange?: (keys: Key[]) => void
  page?: number
  defaultPage?: number
  onPageChange?: (page: number) => void
  onRowClick?: (row: Row) => void
  /** An inline edit passed validation (Vue's cell-edit); update `rows` to keep it. */
  onCellEdit?: (edit: MlTableCellEdit<Row>) => void
  /** Resized column widths in px, by column key (Vue's v-model:column-widths). */
  columnWidths?: Record<string, number>
  defaultColumnWidths?: Record<string, number>
  onColumnWidthsChange?: (widths: Record<string, number>) => void
  /** A resize finished: drag released, or an arrow-key step (Vue's column-resize). */
  onColumnResize?: (key: string, width: number) => void
  /** Custom cell content (Vue's #cell-<key>); return undefined to keep the default text. */
  renderCell?: (ctx: TableCellContext<Row>) => ReactNode
  /** Custom header content (Vue's #header-<key>); return undefined to keep the title. */
  renderHeader?: (column: MlTableColumn<Row>) => ReactNode
  /** Detail panel under a row (Vue's #expand); adds the expander column. */
  renderExpand?: (ctx: { row: Row; index: number }) => ReactNode
  /** Replaces the empty state (Vue's #empty). */
  empty?: ReactNode
  className?: string
}

interface FlatRow<Row> {
  row: Row
  key: Key
  level: number
  hasChildren: boolean
}

const EMPTY: Key[] = []
const NO_WIDTHS: Record<string, number> = {}
const cellId = (key: Key, column: string) => JSON.stringify([key, column])
const isEmpty = (value: unknown) => value === null || value === undefined || value === ''

export function Table<Row extends Record<string, any>>({
  columns,
  rows,
  rowKey = 'id',
  caption,
  striped,
  dense,
  loading,
  selectable,
  manualSort,
  hoverPaw = true,
  emptyText,
  maxHeight,
  pageSize,
  childrenKey = 'children',
  rowExpandable,
  sort: sortProp,
  defaultSort = null,
  onSortChange,
  selected: selectedProp,
  defaultSelected = EMPTY,
  onSelectedChange,
  expanded: expandedProp,
  defaultExpanded = EMPTY,
  onExpandedChange,
  treeOpen: treeOpenProp,
  defaultTreeOpen = EMPTY,
  onTreeOpenChange,
  page: pageProp,
  defaultPage = 1,
  onPageChange,
  onRowClick,
  onCellEdit,
  columnWidths: columnWidthsProp,
  defaultColumnWidths = NO_WIDTHS,
  onColumnWidthsChange,
  onColumnResize,
  renderCell,
  renderHeader,
  renderExpand,
  empty,
  className,
}: TableProps<Row>) {
  const loc = useLocale()
  const [sort, setSort] = useControllable(sortProp, defaultSort, onSortChange)
  const [selected, setSelected] = useControllable(selectedProp, defaultSelected, onSelectedChange)
  const [expanded, setExpanded] = useControllable(expandedProp, defaultExpanded, onExpandedChange)
  const [treeOpen, setTreeOpen] = useControllable(treeOpenProp, defaultTreeOpen, onTreeOpenChange)
  const [page, setPage] = useControllable(pageProp, defaultPage, onPageChange)
  const [widths, setWidths] = useControllable(columnWidthsProp, defaultColumnWidths, onColumnWidthsChange)
  const hasExpand = !!renderExpand

  const keyOf = (row: Row): Key => (typeof rowKey === 'function' ? rowKey(row) : (row[rowKey] as Key))
  const childrenOf = (row: Row): Row[] => {
    const kids = row[childrenKey]
    return Array.isArray(kids) ? kids : []
  }

  const collator = useMemo(() => new Intl.Collator(loc.name, { numeric: true, sensitivity: 'base' }), [loc.name])
  const compare = (a: unknown, b: unknown) => {
    if (typeof a === 'number' && typeof b === 'number') return a - b
    if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()
    return collator.compare(String(a), String(b))
  }
  const sortList = (list: Row[]): Row[] => {
    if (!sort || manualSort) return list
    const direction = sort.order === 'asc' ? 1 : -1
    return [...list].sort((rowA, rowB) => {
      const a = rowA[sort.key]
      const b = rowB[sort.key]
      // Empty cells sink to the bottom whichever way we sort.
      if (isEmpty(a) || isEmpty(b)) return Number(isEmpty(a)) - Number(isEmpty(b))
      return compare(a, b) * direction
    })
  }

  const sortedTop = sortList(rows)
  const pageCount = pageSize ? Math.max(1, Math.ceil(sortedTop.length / pageSize)) : 1
  const start = pageSize ? (Math.min(page, pageCount) - 1) * pageSize : 0
  const pagedTop = pageSize ? sortedTop.slice(start, start + pageSize) : sortedTop
  // Fewer rows (a filter, a delete) can leave us past the last page.
  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount, setPage])

  const treeOpenSet = new Set(treeOpen)
  const isTree = rows.some((r) => childrenOf(r).length > 0)
  const view: FlatRow<Row>[] = []
  const walk = (list: Row[], level: number) => {
    for (const row of list) {
      const key = keyOf(row)
      const kids = childrenOf(row)
      view.push({ row, key, level, hasChildren: kids.length > 0 })
      if (kids.length && treeOpenSet.has(key)) walk(sortList(kids), level + 1)
    }
  }
  walk(pagedTop, 0)

  const toggleTree = (key: Key) => setTreeOpen(treeOpenSet.has(key) ? treeOpen.filter((k) => k !== key) : [...treeOpen, key])
  const expandedSet = new Set(expanded)
  const canExpand = (row: Row) => hasExpand && (rowExpandable?.(row) ?? true)
  const toggleExpand = (key: Key) => setExpanded(expandedSet.has(key) ? expanded.filter((k) => k !== key) : [...expanded, key])

  // Sort cycle: none → ascending → descending → none
  const toggleSort = (column: MlTableColumn<Row>) => {
    if (resizing) return
    if (!sort || sort.key !== column.key) setSort({ key: column.key, order: 'asc' })
    else if (sort.order === 'asc') setSort({ key: column.key, order: 'desc' })
    else setSort(null)
  }
  const ariaSort = (column: MlTableColumn<Row>) => {
    if (!column.sortable) return undefined
    if (sort?.key !== column.key) return 'none'
    return sort.order === 'asc' ? 'ascending' : 'descending'
  }

  const selectedSet = new Set(selected)
  const visibleKeys = view.map((r) => r.key)
  const allSelected = visibleKeys.length > 0 && visibleKeys.every((key) => selectedSet.has(key))
  const someSelected = !allSelected && visibleKeys.some((key) => selectedSet.has(key))
  const toggleAll = (checked: boolean) => {
    const visible = new Set(visibleKeys)
    const others = selected.filter((key) => !visible.has(key))
    setSelected(checked ? [...others, ...visibleKeys] : others)
  }
  const toggleRow = (key: Key, checked: boolean) => setSelected(checked ? [...selected, key] : selected.filter((k) => k !== key))

  const display = (column: MlTableColumn<Row>, row: Row) => cellText(column, row[column.key], row)
  const columnCount = columns.length + (selectable ? 1 : 0) + (hasExpand ? 1 : 0)

  /* ── Fixed columns: sticky offsets measured from the header cells ── */
  const scroller = useRef<HTMLDivElement>(null)
  const headRow = useRef<HTMLTableRowElement>(null)
  const [offsets, setOffsets] = useState<Record<string, number>>({})
  const [edge, setEdge] = useState({ left: false, right: false })
  const hasFixedLeft = columns.some((c) => c.fixed === 'left')
  const hasFixedRight = columns.some((c) => c.fixed === 'right')
  const measureRef = useRef(() => {})
  const onScroll = () => {
    const el = scroller.current
    if (!el) return
    const left = el.scrollLeft > 0
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
    setEdge((e) => (e.left === left && e.right === right ? e : { left, right }))
  }
  measureRef.current = () => {
    const cells = headRow.current ? ([...headRow.current.children] as HTMLElement[]) : []
    if (!cells.length) return
    const next: Record<string, number> = {}
    // Utility columns (expand, select) ride along with the left-fixed ones.
    const lead = cells.length - columns.length
    let left = 0
    if (hasFixedLeft) {
      for (let i = 0; i < lead; i++) {
        next[`__lead${i}`] = left
        left += cells[i].offsetWidth
      }
    }
    columns.forEach((c, i) => {
      if (c.fixed === 'left') {
        next[c.key] = left
        left += cells[lead + i].offsetWidth
      }
    })
    let right = 0
    for (let i = columns.length - 1; i >= 0; i--) {
      const c = columns[i]
      if (c.fixed === 'right') {
        next[c.key] = right
        right += cells[lead + i].offsetWidth
      }
    }
    setOffsets((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
    onScroll()
  }
  const fixed = hasFixedLeft || hasFixedRight
  useIsoLayoutEffect(() => {
    if (fixed) measureRef.current()
  }, [fixed, columns, view.length, widths])
  useEffect(() => {
    if (!fixed || typeof ResizeObserver === 'undefined' || !scroller.current) return
    const observer = new ResizeObserver(() => measureRef.current())
    observer.observe(scroller.current)
    return () => observer.disconnect()
  }, [fixed])

  const stickyStyle = (column: MlTableColumn<Row>): CSSProperties | undefined => {
    if (!column.fixed) return undefined
    const at = offsets[column.key] ?? 0
    return column.fixed === 'left' ? { left: `${at}px` } : { right: `${at}px` }
  }
  const leadStyle = (i: number) => (hasFixedLeft ? { left: `${offsets[`__lead${i}`] ?? 0}px` } : undefined)
  const lastLeft = [...columns].reverse().find((c) => c.fixed === 'left')?.key
  const firstRight = columns.find((c) => c.fixed === 'right')?.key
  const fixedClass = (column: MlTableColumn<Row>) => ({
    'ml-table__fixed': column.fixed,
    'ml-table__fixed--last-left': column.key === lastLeft,
    'ml-table__fixed--first-right': column.key === firstRight,
  })
  const maxHeightCss = len(maxHeight)

  /* ── Inline editing: one cell at a time; `rows` is only ever reported, never changed ── */
  const [editing, setEditing] = useState<{ row: Key; col: string } | null>(null)
  const [draft, setDraft] = useState('')
  const [editError, setEditError] = useState<string>()
  const editErrorId = `ml-table-${useId()}-edit-error`
  const editingRef = useRef(editing)
  editingRef.current = editing
  /** What to focus once the next render lands: the open editor, or a cell. */
  const focusNext = useRef<{ editor: true } | { cell: string } | null>(null)
  useEffect(() => {
    const target = focusNext.current
    if (!target) return
    focusNext.current = null
    if ('editor' in target) {
      const control = scroller.current?.querySelector<HTMLInputElement | HTMLSelectElement>('.ml-table__editor .ml-input__control')
      control?.focus()
      if (control instanceof HTMLInputElement) control.select()
    } else {
      const cells = scroller.current?.querySelectorAll<HTMLElement>('td[data-ml-cell]') ?? []
      ;[...cells].find((td) => td.dataset.mlCell === target.cell)?.focus()
    }
  })

  const isEditing = (item: FlatRow<Row>, column: MlTableColumn<Row>) => editing?.row === item.key && editing.col === column.key

  const startEdit = (item: FlatRow<Row>, column: MlTableColumn<Row>) => {
    if (!editorOf(column) || isEditing(item, column)) return
    setEditing({ row: item.key, col: column.key })
    setDraft(editString(item.row[column.key]))
    setEditError(undefined)
    focusNext.current = { editor: true }
  }

  /** Validate and report the open edit. False keeps the editor open with its message. */
  const commitEdit = (): boolean => {
    const target = editing
    if (!target) return true
    const index = view.findIndex((r) => r.key === target.row)
    const column = columns.find((c) => c.key === target.col)
    if (index < 0 || !column) {
      setEditing(null)
      return true
    }
    const row = view[index].row
    const oldValue = row[column.key]
    const result = parseEdit(column, row, oldValue, draft, loc.table)
    if (result.kind === 'error') {
      setEditError(result.message)
      return false
    }
    setEditing(null)
    setEditError(undefined)
    // The cell keeps showing rows[] as given: the parent applies (or rejects) the edit.
    if (result.kind === 'ok') {
      onCellEdit?.({ row, key: column.key, value: result.value, oldValue, rowIndex: index })
    }
    return true
  }

  const cancelEdit = () => {
    if (editing) focusNext.current = { cell: cellId(editing.row, editing.col) }
    setEditing(null)
    setEditError(undefined)
  }

  const onCellKey = (e: KeyboardEvent<HTMLElement>, item: FlatRow<Row>, column: MlTableColumn<Row>) => {
    if (e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== 'F2')) return
    e.preventDefault()
    startEdit(item, column)
  }

  const onEditorKey = (e: KeyboardEvent<HTMLElement>, item: FlatRow<Row>, c: number) => {
    // Enter while an IME is composing picks a candidate, it doesn't commit.
    if (e.nativeEvent.isComposing || e.keyCode === 229) return
    const column = columns[c]
    if (e.key === 'Enter') {
      e.preventDefault()
      if (commitEdit()) focusNext.current = { cell: cellId(item.key, column.key) }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      cancelEdit()
    } else if (e.key === 'Tab') {
      e.preventDefault()
      if (!commitEdit()) return
      const next = nextEditable(columns, c, e.shiftKey ? -1 : 1)
      if (next >= 0) startEdit(item, columns[next])
      else focusNext.current = { cell: cellId(item.key, column.key) }
    }
  }

  const onEditorBlur = (item: FlatRow<Row>, column: MlTableColumn<Row>) => {
    // Only this cell's own editor commits: Tab / Enter may already have moved on.
    const current = editingRef.current
    if (current?.row === item.key && current.col === column.key) commitEdit()
  }

  /* ── Column resizing ── */
  const [resizing, setResizing] = useState<string | null>(null)
  // Drawn widths of resizable columns without a known width, for aria-valuenow.
  const [measured, setMeasured] = useState<Record<string, number>>({})
  const widthsRef = useRef(widths)
  widthsRef.current = widths
  const endDrag = useRef<(() => void) | null>(null)
  useEffect(() => () => endDrag.current?.(), [])
  const hasResizable = columns.some((c) => c.resizable)

  const setWidth = (key: string, width: number) => {
    if (widthsRef.current[key] !== width) {
      widthsRef.current = { ...widthsRef.current, [key]: width }
      setWidths(widthsRef.current)
    }
  }

  useIsoLayoutEffect(() => {
    if (!hasResizable || !headRow.current) return
    const cells = [...headRow.current.children] as HTMLElement[]
    const lead = cells.length - columns.length
    const next: Record<string, number> = {}
    columns.forEach((c, i) => {
      if (c.resizable && cells[lead + i]) next[c.key] = cells[lead + i].offsetWidth
    })
    setMeasured((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
  }, [hasResizable, columns, widths])

  const ariaWidth = (column: MlTableColumn<Row>) => columnWidth(column, widths) ?? measured[column.key]

  const startResize = (e: PointerEvent<HTMLElement>, column: MlTableColumn<Row>) => {
    if (e.button !== 0) return
    e.preventDefault()
    const th = e.currentTarget.closest('th')
    const startX = e.clientX
    const startWidth = widthsRef.current[column.key] ?? th?.offsetWidth ?? 0
    let width = startWidth
    setResizing(column.key)
    const move = (ev: globalThis.PointerEvent) => {
      width = clampWidth(column, startWidth + ev.clientX - startX)
      setWidth(column.key, width)
    }
    const up = () => {
      endDrag.current?.()
      if (width === startWidth) return
      // The click that ends a drag lands on whatever is under the pointer: swallow it.
      const swallow = (ev: MouseEvent) => ev.stopPropagation()
      window.addEventListener('click', swallow, { capture: true, once: true })
      setTimeout(() => window.removeEventListener('click', swallow, { capture: true }))
      onColumnResize?.(column.key, width)
    }
    endDrag.current = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      setResizing(null)
      endDrag.current = null
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }

  const onResizeKey = (e: KeyboardEvent<HTMLElement>, column: MlTableColumn<Row>) => {
    const th = e.currentTarget.closest('th')
    const current = columnWidth(column, widthsRef.current) ?? th?.offsetWidth ?? 0
    const next = resizeByKey(column, current, e.key, e.shiftKey)
    if (next === null) return
    e.preventDefault()
    setWidth(column.key, next)
    onColumnResize?.(column.key, next)
  }

  return (
    <div
      className={cx('ml-table', className, {
        'ml-table--striped': striped,
        'ml-table--dense': dense,
        'ml-table--loading': loading,
        'ml-table--hover-paw': hoverPaw,
        'ml-table--sticky': maxHeight !== undefined,
        'ml-table--scrolled-left': edge.left,
        'ml-table--scrolled-right': edge.right,
        'ml-table--resizing': resizing,
      })}
    >
      <div ref={scroller} className="ml-table__scroll" style={maxHeightCss ? { maxHeight: maxHeightCss } : undefined} onScroll={onScroll}>
        <table className="ml-table__table" aria-busy={loading || undefined} role={isTree ? 'treegrid' : undefined}>
          {caption && <caption className="ml-table__caption">{caption}</caption>}
          <thead>
            <tr ref={headRow}>
              {hasExpand && (
                <th className={cx('ml-table__expand-col', { 'ml-table__fixed': hasFixedLeft })} style={leadStyle(0)} scope="col">
                  <span className="ml-visually-hidden">{loc.table.expand}</span>
                </th>
              )}
              {selectable && (
                <th className={cx('ml-table__select', { 'ml-table__fixed': hasFixedLeft })} style={leadStyle(hasExpand ? 1 : 0)} scope="col">
                  <Checkbox paw aria-label={loc.table.selectAll} checked={allSelected} indeterminate={someSelected} disabled={!view.length} onChange={toggleAll} />
                </th>
              )}
              {columns.map((column) => {
                const title = renderHeader?.(column) ?? column.title
                return (
                  <th
                    key={column.key}
                    scope="col"
                    style={{ ...widthStyle(column, widths), ...stickyStyle(column) }}
                    className={cx(`ml-table__cell--${column.align ?? 'left'}`, {
                      'ml-table__th--sorted': sort?.key === column.key,
                      'ml-table__th--resizable': column.resizable,
                      ...fixedClass(column),
                    })}
                    aria-sort={ariaSort(column)}
                  >
                    {column.sortable ? (
                      <button type="button" className="ml-table__sort" onClick={() => toggleSort(column)}>
                        {title}
                        <span className="ml-table__sort-icon" data-order={sort?.key === column.key ? sort.order : undefined} aria-hidden="true">
                          <svg viewBox="0 0 10 14">
                            <path d="M5 1L9 5.5H1z" />
                            <path d="M5 13L1 8.5h8z" />
                          </svg>
                        </span>
                      </button>
                    ) : (
                      title
                    )}
                    {column.resizable && (
                      <span
                        role="separator"
                        className={cx('ml-table__resizer', { 'ml-table__resizer--active': resizing === column.key })}
                        tabIndex={0}
                        aria-orientation="vertical"
                        aria-label={loc.table.resize(column.title)}
                        aria-valuenow={ariaWidth(column)}
                        aria-valuemin={resizeBounds(column).min}
                        aria-valuemax={resizeBounds(column).max}
                        onPointerDown={(e) => startResize(e, column)}
                        onKeyDown={(e) => onResizeKey(e, column)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {view.map((item, index) => {
              const open = expandedSet.has(item.key)
              return (
                <Fragment key={item.key}>
                  <tr
                    className={cx({ 'ml-table__row--selected': selectedSet.has(item.key), 'ml-table__row--open': open, 'ml-table__row--child': item.level > 0 })}
                    aria-level={isTree ? item.level + 1 : undefined}
                    aria-expanded={isTree && item.hasChildren ? treeOpenSet.has(item.key) : undefined}
                    onClick={() => onRowClick?.(item.row)}
                  >
                    {hasExpand && (
                      <td className={cx('ml-table__expand-col', { 'ml-table__fixed': hasFixedLeft })} style={leadStyle(0)} onClick={(e) => e.stopPropagation()}>
                        {canExpand(item.row) && (
                          <button type="button" className="ml-table__expander" aria-expanded={open} aria-label={loc.table.expandRow(index + 1)} onClick={() => toggleExpand(item.key)}>
                            <Icon name="chevronRight" />
                          </button>
                        )}
                      </td>
                    )}
                    {selectable && (
                      <td className={cx('ml-table__select', { 'ml-table__fixed': hasFixedLeft })} style={leadStyle(hasExpand ? 1 : 0)} onClick={(e) => e.stopPropagation()}>
                        <Checkbox paw aria-label={loc.table.selectRow(index + 1)} checked={selectedSet.has(item.key)} onChange={(checked) => toggleRow(item.key, checked)} />
                      </td>
                    )}
                    {columns.map((column, c) => {
                      const editor = editorOf(column)
                      const active = isEditing(item, column)
                      const custom = active ? undefined : renderCell?.({ column, row: item.row, value: item.row[column.key], index, level: item.level })
                      return (
                        <td
                          key={column.key}
                          style={stickyStyle(column)}
                          title={column.ellipsis && !active ? display(column, item.row) : undefined}
                          tabIndex={editor && !active ? 0 : undefined}
                          data-ml-cell={editor ? cellId(item.key, column.key) : undefined}
                          aria-keyshortcuts={editor && !active ? 'Enter F2' : undefined}
                          className={cx(`ml-table__cell--${column.align ?? 'left'}`, {
                            'ml-table__cell--mono': column.mono,
                            'ml-table__cell--ellipsis': column.ellipsis,
                            'ml-table__cell--editable': editor,
                            'ml-table__cell--editing': active,
                            ...fixedClass(column),
                          })}
                          onDoubleClick={() => startEdit(item, column)}
                          onKeyDown={(e) => onCellKey(e, item, column)}
                        >
                          {hoverPaw && c === 0 && <Paw tone="current" className="ml-table__paw" />}
                          {isTree && c === 0 && (
                            <span className="ml-table__tree" style={{ '--_level': item.level } as CSSProperties}>
                              {item.hasChildren ? (
                                <button
                                  type="button"
                                  className="ml-table__tree-toggle"
                                  aria-label={treeOpenSet.has(item.key) ? loc.table.collapse : loc.table.expand}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleTree(item.key)
                                  }}
                                >
                                  <Icon name="chevronRight" />
                                </button>
                              ) : (
                                <span className="ml-table__tree-leaf" aria-hidden="true" />
                              )}
                            </span>
                          )}
                          {active ? (
                            <>
                              <div
                                className={cx('ml-input', 'ml-input--sm', 'ml-table__editor', { 'ml-input--error': editError })}
                                onClick={(e) => e.stopPropagation()}
                                onDoubleClick={(e) => e.stopPropagation()}
                              >
                                {editor === 'select' ? (
                                  <select
                                    className="ml-input__control"
                                    value={draft}
                                    aria-label={loc.table.edit(column.title)}
                                    aria-invalid={editError ? true : undefined}
                                    aria-describedby={editError ? editErrorId : undefined}
                                    onChange={(e) => setDraft(e.target.value)}
                                    onKeyDown={(e) => onEditorKey(e, item, c)}
                                    onBlur={() => onEditorBlur(item, column)}
                                  >
                                    {column.options?.map((option) => (
                                      <option key={option.value} value={String(option.value)}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    className="ml-input__control"
                                    type="text"
                                    inputMode={editor === 'number' ? 'decimal' : undefined}
                                    value={draft}
                                    aria-label={loc.table.edit(column.title)}
                                    aria-invalid={editError ? true : undefined}
                                    aria-describedby={editError ? editErrorId : undefined}
                                    onChange={(e) => setDraft(e.target.value)}
                                    onKeyDown={(e) => onEditorKey(e, item, c)}
                                    onBlur={() => onEditorBlur(item, column)}
                                  />
                                )}
                                {editor === 'select' && <Icon name="chevronDown" className="ml-input__chevron" />}
                              </div>
                              {editError && (
                                <p id={editErrorId} className="ml-field__error ml-table__edit-error" role="alert">
                                  <Icon name="warning" />
                                  {editError}
                                </p>
                              )}
                            </>
                          ) : (
                            (custom ?? display(column, item.row))
                          )}
                        </td>
                      )
                    })}
                  </tr>
                  {hasExpand && open && (
                    <tr className="ml-table__detail-row">
                      <td colSpan={columnCount}>
                        <div className="ml-table__detail">{renderExpand({ row: item.row, index })}</div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
            {!view.length && !loading && (
              <tr className="ml-table__empty-row">
                <td colSpan={columnCount}>
                  {empty ?? (
                    <div className="ml-table__empty">
                      <span className="ml-table__empty-trail" aria-hidden="true">
                        {[1, 2, 3, 4].map((n) => (
                          <Paw key={n} tone="current" />
                        ))}
                      </span>
                      <p>{emptyText ?? loc.table.empty}</p>
                    </div>
                  )}
                </td>
              </tr>
            )}
            {!view.length && loading && (
              <tr className="ml-table__empty-row">
                <td colSpan={columnCount}>
                  <div className="ml-table__empty" />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {!!pageSize && pageCount > 1 && (
        <footer className="ml-table__footer">
          <span className="ml-table__count">{loc.table.total(sortedTop.length)}</span>
          <Pagination page={Math.min(page, pageCount)} total={pageCount} onChange={setPage} />
        </footer>
      )}
      {loading && (
        <div className="ml-table__overlay">
          <Loader variant="paws" size={40} label={loc.common.loading} />
        </div>
      )}
    </div>
  )
}
