// Shared logic of MlTable / <Table>: inline cell editing and column resizing.
import type { MlTableColumn } from '../types'

export type TableEditorKind = 'text' | 'number' | 'select'

/** Which editor a column uses, or null when it isn't editable. */
export function editorOf(column: MlTableColumn<any>): TableEditorKind | null {
  if (!column.editable) return null
  return column.editable === true ? 'text' : column.editable
}

/** The editor's starting text for a cell value. */
export function editString(value: unknown): string {
  return value === null || value === undefined ? '' : String(value)
}

/** Cell text: format() wins, then a select column's option label, then the raw value. */
export function cellText<Row>(column: MlTableColumn<Row>, value: unknown, row: Row): string {
  if (column.format) return column.format(value, row)
  const option = column.options?.find((o) => String(o.value) === editString(value))
  if (option) return option.label
  return value === null || value === undefined ? '—' : String(value)
}

export type EditResult =
  /** Nothing changed: just close the editor. */
  | { kind: 'same' }
  | { kind: 'ok'; value: unknown }
  | { kind: 'error'; message: string }

/**
 * Turn the editor's text back into a value and run the column's validator.
 * Number editors give a number (or null when cleared); select editors give the
 * option's own value, so numeric option values stay numbers.
 */
export function parseEdit<Row>(
  column: MlTableColumn<Row>,
  row: Row,
  oldValue: unknown,
  raw: string,
  messages: { invalidNumber: string },
): EditResult {
  if (raw === editString(oldValue)) return { kind: 'same' }
  const kind = editorOf(column) ?? 'text'
  let value: unknown = raw
  if (kind === 'number') {
    const text = raw.trim()
    value = text === '' ? null : Number(text)
    if (typeof value === 'number' && !Number.isFinite(value)) return { kind: 'error', message: messages.invalidNumber }
    if (value === oldValue) return { kind: 'same' }
  } else if (kind === 'select') {
    const option = column.options?.find((o) => String(o.value) === raw)
    value = option ? option.value : raw
  }
  const message = column.validate?.(value, row)
  return message ? { kind: 'error', message } : { kind: 'ok', value }
}

/** Index of the next (step 1) or previous (step -1) editable column, or -1. */
export function nextEditable(columns: MlTableColumn<any>[], from: number, step: 1 | -1): number {
  for (let i = from + step; i >= 0 && i < columns.length; i += step) {
    if (editorOf(columns[i])) return i
  }
  return -1
}

/* ── Column resizing ── */

export const RESIZE_MIN = 48
export const RESIZE_STEP = 10
export const RESIZE_STEP_BIG = 50

export function resizeBounds(column: MlTableColumn<any>) {
  const min = column.minWidth ?? RESIZE_MIN
  return { min, max: column.maxWidth !== undefined ? Math.max(min, column.maxWidth) : undefined }
}

export function clampWidth(column: MlTableColumn<any>, width: number): number {
  const { min, max } = resizeBounds(column)
  return Math.round(Math.max(min, max === undefined ? width : Math.min(max, width)))
}

/** A `width: '120px'` column option as a number, for the handle's starting value. */
export function pxOf(width?: string): number | undefined {
  const m = width?.trim().match(/^(\d+(?:\.\d+)?)px$/)
  return m ? Number(m[1]) : undefined
}

/** The width a column is drawn at: a resized width, else its `width` option in px. */
export function columnWidth(column: MlTableColumn<any>, widths: Record<string, number>): number | undefined {
  return widths[column.key] ?? pxOf(column.width)
}

/** Header style for a column's width: resized widths are exact, `width` stays a minimum. */
export function widthStyle(column: MlTableColumn<any>, widths: Record<string, number>) {
  const w = widths[column.key]
  if (w !== undefined) return { width: `${w}px`, minWidth: `${w}px`, maxWidth: `${w}px` }
  return column.width ? { width: column.width, minWidth: column.width } : {}
}

/**
 * New width for a key on the resize handle, or null for keys it ignores.
 * ←/→ step 10px (Shift: 50px); Home / End jump to the min / max.
 */
export function resizeByKey(column: MlTableColumn<any>, current: number, key: string, shift: boolean): number | null {
  const step = shift ? RESIZE_STEP_BIG : RESIZE_STEP
  const { min, max } = resizeBounds(column)
  if (key === 'ArrowLeft') return clampWidth(column, current - step)
  if (key === 'ArrowRight') return clampWidth(column, current + step)
  if (key === 'Home') return min
  if (key === 'End' && max !== undefined) return max
  return null
}
