import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import {
  PickerColumn,
  pickValues,
  resolvePicker,
  rowHidden,
  rowTransform,
  sameValues,
  wheelGeometry,
  type MlPickerColumns,
  type MlPickerOption,
  type MlPickerValue,
  type PickerResolved,
  type PickerSource,
} from '../components/picker-wheel'
import { useLocale } from './locale'
import { cx } from './utils'

export type { MlPickerOption, MlPickerValue, MlPickerColumns, PickerDateOptions, PickerTimeOptions } from '../components/picker-wheel'
export {
  datePickerColumns,
  timePickerColumns,
  dateToPickerValue,
  pickerValueToDate,
  daysInMonth,
  isLeapYear,
  resolvePicker as resolvePickerView,
} from '../components/picker-wheel'

// useLayoutEffect warns during SSR; there is nothing to drive there anyway.
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

export interface PickerViewProps {
  /** Independent columns — or a function of the current values (see datePickerColumns). */
  columns?: MlPickerColumns
  /** Cascading tree: each column holds the children of the previous pick. Wins over `columns`. */
  options?: MlPickerOption[]
  /** One value per column. */
  value?: MlPickerValue[]
  defaultValue?: MlPickerValue[]
  /** Every value update — a settled column, a cascade reset or an out-of-range fix (Vue's v-model). */
  onChange?: (values: MlPickerValue[], selected: MlPickerOption[]) => void
  /** A column came to rest on a new row (Vue's `change` event). */
  onSettle?: (values: MlPickerValue[], selected: MlPickerOption[], column: number) => void
  onConfirm?: (values: MlPickerValue[], selected: MlPickerOption[]) => void
  onCancel?: () => void
  /** Rows in view (odd, ≥ 3). */
  visibleCount?: number
  /** Row height in px. */
  itemHeight?: number
  /** Accessible name of each column, e.g. ['年', '月', '日']. */
  labels?: string[]
  /** Accessible name of the whole picker. */
  label?: string
  /** Toolbar title; giving one shows the toolbar. */
  title?: ReactNode
  /** Show the 取消 / 確定 toolbar. */
  toolbar?: boolean
  cancelText?: string
  confirmText?: string
  disabled?: boolean
  /** Custom row content (Vue's `option` slot). */
  renderOption?: (option: MlPickerOption, column: number, index: number) => ReactNode
  className?: string
}

export interface PickerViewHandle {
  /** Stop any motion, then call onConfirm with the values in the band. */
  confirm: () => void
  /** The options currently in the band. */
  getSelectedOptions: () => MlPickerOption[]
}

const selectedOf = (r: PickerResolved) => r.selected.filter((o): o is MlPickerOption => !!o)

const sameList = (a: MlPickerOption[] | undefined, b: MlPickerOption[]) =>
  a === b || (!!a && a.length === b.length && a.every((o, i) => o.value === b[i].value && !!o.disabled === !!b[i].disabled))

export const PickerView = forwardRef<PickerViewHandle, PickerViewProps>(function PickerView(props, ref) {
  const { columns, options, value, defaultValue, visibleCount = 5, itemHeight = 44, labels, label, title, toolbar, cancelText, confirmText, disabled, renderOption, className } = props
  const t = useLocale()
  const [inner, setInner] = useState<MlPickerValue[]>(defaultValue ?? [])
  const controlled = value !== undefined
  const current = (controlled ? value : inner) ?? []

  const geo = useMemo(() => wheelGeometry(itemHeight, visibleCount), [itemHeight, visibleCount])
  const hints = useRef<number[]>([])
  const resolved = useMemo(() => resolvePicker({ columns, options }, current, hints.current), [columns, options, current])
  const latest = useRef(resolved)
  const seen = useRef(resolved)
  if (seen.current !== resolved) {
    seen.current = resolved
    latest.current = resolved
    hints.current = resolved.indexes
  }
  const [announce, setAnnounce] = useState('')

  // Everything the wheel callbacks need, always current.
  const live = useRef({ props, t, controlled })
  live.current = { props, t, controlled }

  function commit(next: PickerResolved) {
    latest.current = next
    hints.current = next.indexes
    if (!live.current.controlled) setInner(next.values)
    live.current.props.onChange?.(next.values, selectedOf(next))
  }

  function onSelect(column: number, index: number, from: PickerSource) {
    const { props: p, t: loc } = live.current
    const before = latest.current
    const next = pickValues({ columns: p.columns, options: p.options }, before, column, index)
    commit(next)
    p.onSettle?.(next.values, selectedOf(next), column)
    const cascaded = next.values.some((v, c) => c > column && v !== before.values[c]) || next.values.length !== before.values.length
    if (from !== 'keyboard' || cascaded) setAnnounce(loc.pickerView.selected(selectedOf(next).map((o) => o.label)))
  }

  // Out-of-range / vanished values snap to a real row; tell the parent.
  useEffect(() => {
    if (current.length > 0 && !sameValues(resolved.values, current)) commit(resolved)
  }, [resolved])

  const columnEls = useRef<(HTMLDivElement | null)[]>([])
  const controllers = useRef<PickerColumn[]>([])
  const shown = useRef<MlPickerOption[][]>([])

  useIsoLayoutEffect(() => {
    const r = resolved
    const list = controllers.current
    while (list.length > r.columns.length) list.pop()!.destroy()
    for (let c = 0; c < r.columns.length; c++) {
      const el = columnEls.current[c]
      if (!el) continue
      const rows = r.columns[c]
      const cfg = {
        itemHeight: geo.itemHeight,
        visibleCount: geo.count,
        labels: rows.map((o) => o.label),
        isDisabled: (i: number) => !!rows[i]?.disabled,
        disabled,
      }
      if (!list[c] || list[c].el !== el) {
        list[c]?.destroy()
        list[c] = new PickerColumn(el, cfg, r.indexes[c], (i, from) => onSelect(c, i, from))
        continue
      }
      const animate = sameList(shown.current[c], rows)
      list[c].update(cfg)
      list[c].sync(r.indexes[c], animate)
    }
    shown.current = r.columns
  }, [resolved, disabled, geo])

  useEffect(
    () => () => {
      for (const ctl of controllers.current) ctl.destroy()
      controllers.current = []
    },
    [],
  )

  function confirm() {
    for (const ctl of controllers.current) ctl.finish()
    live.current.props.onConfirm?.([...latest.current.values], selectedOf(latest.current))
  }

  useImperativeHandle(ref, () => ({ confirm, getSelectedOptions: () => selectedOf(latest.current) }))

  const showToolbar = toolbar || !!title
  const groupLabel = label ?? (typeof title === 'string' ? title : undefined) ?? t.pickerView.label

  return (
    <div className={cx('ml-picker-view', { 'ml-picker-view--disabled': disabled }, className)} role="group" aria-label={groupLabel}>
      {showToolbar && (
        <div className="ml-picker-view__toolbar">
          <button type="button" className="ml-picker-view__action ml-picker-view__action--cancel" onClick={() => props.onCancel?.()}>
            {cancelText ?? t.pickerView.cancel}
          </button>
          <div className="ml-picker-view__title">{title}</div>
          <button type="button" className="ml-picker-view__action ml-picker-view__action--confirm" disabled={disabled} onClick={confirm}>
            {confirmText ?? t.pickerView.confirm}
          </button>
        </div>
      )}
      <div className="ml-picker-view__wheels" style={{ '--_item': `${geo.itemHeight}px`, '--_rows': geo.count, '--_radius': `${geo.radius}px` } as CSSProperties}>
        <div className="ml-picker-view__band" aria-hidden="true" />
        {resolved.columns.map((list, c) => {
          const index = resolved.indexes[c]
          return (
            <div
              key={c}
              ref={(el) => {
                columnEls.current[c] = el
              }}
              className="ml-picker-view__column"
              role="spinbutton"
              tabIndex={disabled ? -1 : 0}
              aria-label={labels?.[c] ?? t.pickerView.column(c + 1)}
              aria-valuemin={list.length ? 1 : undefined}
              aria-valuemax={list.length || undefined}
              aria-valuenow={index >= 0 ? index + 1 : undefined}
              aria-valuetext={list[index]?.label}
              aria-disabled={disabled || undefined}
            >
              <ul className="ml-picker-view__track" aria-hidden="true">
                {list.map((option, i) => (
                  <li
                    key={`${i}:${option.value}`}
                    className={cx('ml-picker-view__item', { 'ml-picker-view__item--selected': i === index, 'ml-picker-view__item--disabled': option.disabled })}
                    style={{ transform: rowTransform(i, geo), visibility: rowHidden(i, Math.max(0, index), geo) ? 'hidden' : undefined }}
                  >
                    {renderOption ? renderOption(option, c, i) : option.label}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
      <span className="ml-visually-hidden" aria-live="polite">
        {announce}
      </span>
    </div>
  )
})
