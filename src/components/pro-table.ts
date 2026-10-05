// ProTable logic (framework-free, shared by MlProTable and the React <ProTable>):
// columns → table / filter / form fields, the local query pipeline
// (filter → sort → paginate), remote request params and a stale-response guard.
import { isEmptyFilter, matchFilters, type MlFilterField, type MlFilterFieldType, type MlFilterValue } from './filter'
import { toRuleList, type MlFormRule, type MlFormRules } from '../form-rules'
import type { MlSelectOption, MlTableColumn, MlTableSort } from '../types'

type Key = string | number

export type MlProTableMode = 'create' | 'edit'

export type MlProFormFieldType = 'text' | 'number' | 'select' | 'date' | 'switch' | 'textarea'

export interface MlProFormConfig {
  /** Default: 'select' when the column has options, else 'text'. */
  type?: MlProFormFieldType
  /** Default: the column title. */
  label?: string
  options?: MlSelectOption[]
  placeholder?: string
  hint?: string
  /** Shorthand for a `{ required: true }` rule. */
  required?: boolean
  /** Rules from the form rule system — `twRules.mobile()` and friends drop straight in. */
  rules?: MlFormRule | MlFormRule[]
  /** Value for a new record (a function is called per form open). */
  default?: unknown
  /** Disable the control, always or per mode (e.g. ids: `(mode) => mode === 'edit'`). */
  disabled?: boolean | ((mode: MlProTableMode) => boolean)
  /** For number fields. */
  min?: number
  max?: number
  step?: number
  /** For textarea fields. */
  rows?: number
  /** Take the whole row of the two-column form (textareas do by default). */
  wide?: boolean
}

export interface MlProFilterConfig {
  /** Default: 'select' when the column has options, else 'text'. */
  type?: MlFilterFieldType
  /** Default: the column title. */
  label?: string
  options?: MlSelectOption[]
  placeholder?: string
}

export interface MlProTableColumn<Row = Record<string, unknown>> extends MlTableColumn<Row> {
  /** Shared by the filter, the form's select and the cell text (value → label). */
  options?: MlSelectOption[]
  /** Put this column in the filter bar. */
  filter?: boolean | MlProFilterConfig
  /** Put this column in the create / edit form. */
  form?: boolean | MlProFormConfig
  hideInTable?: boolean
  hideInFilter?: boolean
  hideInForm?: boolean
}

/** A form field, resolved from its column. */
export interface MlProFormField {
  key: string
  label: string
  type: MlProFormFieldType
  options: MlSelectOption[]
  placeholder?: string
  hint?: string
  rules: MlFormRule[]
  required: boolean
  default?: unknown
  disabled?: boolean | ((mode: MlProTableMode) => boolean)
  min?: number
  max?: number
  step?: number
  rows?: number
  wide: boolean
}

export interface MlProTableAction<Row = Record<string, unknown>> {
  key: string
  label: string
  /** Paints the action red. */
  danger?: boolean
  hidden?: (row: Row) => boolean
  disabled?: (row: Row) => boolean
  /** 'edit' and 'delete' run the built-in behaviour when this is left out. */
  onClick?: (row: Row) => void
}

export interface MlProTableRequestParams {
  page: number
  pageSize: number
  /** Only the filters that have a value. */
  filters: MlFilterValue
  sort: MlTableSort | null
}

export interface MlProTableResult<Row> {
  data: Row[]
  total: number
}

export type MlProTableRequest<Row> = (params: MlProTableRequestParams) => Promise<MlProTableResult<Row>>

const optionsOf = <Row>(c: MlProTableColumn<Row>, own?: MlSelectOption[]) => own ?? c.options

/** Columns the table shows; columns with options show the option's label. */
export function proTableColumns<Row>(columns: MlProTableColumn<Row>[]): MlTableColumn<Row>[] {
  return columns
    .filter((c) => !c.hideInTable)
    .map((c) => {
      const { options, filter: _f, form: _m, hideInTable: _t, hideInFilter: _hf, hideInForm: _hm, ...column } = c
      if (column.format || !options?.length) return column
      return { ...column, format: (value: unknown) => optionLabel(options, value) }
    })
}

/** The option label for a value (lists join with "、"); '—' when empty. */
export function optionLabel(options: MlSelectOption[], value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  const one = (v: unknown) => options.find((o) => o.value === v || String(o.value) === String(v))?.label ?? String(v)
  return Array.isArray(value) ? value.map(one).join('、') : one(value)
}

/** FilterBar fields from the columns that ask for one. */
export function proFilterFields<Row>(columns: MlProTableColumn<Row>[]): MlFilterField[] {
  return columns
    .filter((c) => c.filter && !c.hideInFilter)
    .map((c) => {
      const own = typeof c.filter === 'object' ? c.filter : {}
      const options = optionsOf(c, own.options)
      const field: MlFilterField = { key: c.key, label: own.label ?? c.title, type: own.type ?? (options?.length ? 'select' : 'text') }
      if (options) field.options = options
      if (own.placeholder) field.placeholder = own.placeholder
      return field
    })
}

/** Form fields from the columns that ask for one. */
export function proFormFields<Row>(columns: MlProTableColumn<Row>[]): MlProFormField[] {
  return columns
    .filter((c) => c.form && !c.hideInForm)
    .map((c) => {
      const own = typeof c.form === 'object' ? c.form : {}
      const options = optionsOf(c, own.options) ?? []
      const type = own.type ?? (options.length ? 'select' : 'text')
      const rules = [...(own.required ? [{ required: true }] : []), ...toRuleList(own.rules)]
      return {
        key: c.key,
        label: own.label ?? c.title,
        type,
        options,
        placeholder: own.placeholder,
        hint: own.hint,
        rules,
        required: rules.some((r) => r.required),
        default: own.default,
        disabled: own.disabled,
        min: own.min,
        max: own.max,
        step: own.step,
        rows: own.rows,
        wide: own.wide ?? type === 'textarea',
      }
    })
}

/** MlForm `rules` for the fields. */
export function proFormRules(fields: MlProFormField[]): MlFormRules {
  return Object.fromEntries(fields.filter((f) => f.rules.length).map((f) => [f.key, f.rules]))
}

export function isFieldDisabled(field: MlProFormField, mode: MlProTableMode) {
  return typeof field.disabled === 'function' ? field.disabled(mode) : !!field.disabled
}

const blankFor = (type: MlProFormFieldType): unknown => (type === 'number' ? 0 : type === 'switch' ? false : type === 'date' ? null : '')

const copy = (v: unknown) => (v instanceof Date ? new Date(v) : Array.isArray(v) ? [...v] : v)

/**
 * The form's starting values: the row's (copied, so cancelling leaves it
 * untouched) when editing, else each field's default or an empty value.
 */
export function proFormValues(fields: MlProFormField[], row?: object | null): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const f of fields) {
    if (row) out[f.key] = copy((row as Record<string, unknown>)[f.key] ?? blankFor(f.type))
    else out[f.key] = typeof f.default === 'function' ? (f.default as () => unknown)() : f.default !== undefined ? copy(f.default) : blankFor(f.type)
  }
  return out
}

/* ── Local query pipeline ──────────────────────────────── */

const isEmpty = (value: unknown) => value === null || value === undefined || value === ''

/** Same order MlTable uses: numbers, dates, then natural text; empty cells last. */
export function sortRows<Row extends object>(rows: Row[], sort: MlTableSort | null | undefined, collator: Intl.Collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })): Row[] {
  if (!sort) return rows
  const direction = sort.order === 'asc' ? 1 : -1
  const compare = (a: unknown, b: unknown) => {
    if (typeof a === 'number' && typeof b === 'number') return a - b
    if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime()
    return collator.compare(String(a), String(b))
  }
  return [...rows].sort((rowA, rowB) => {
    const a = (rowA as Record<string, unknown>)[sort.key]
    const b = (rowB as Record<string, unknown>)[sort.key]
    if (isEmpty(a) || isEmpty(b)) return Number(isEmpty(a)) - Number(isEmpty(b))
    return compare(a, b) * direction
  })
}

export function pageCount(total: number, pageSize: number) {
  return Math.max(1, Math.ceil(total / Math.max(1, pageSize)))
}

/** A page that exists: 1 … last. */
export function clampPage(page: number, total: number, pageSize: number) {
  return Math.min(Math.max(1, Math.floor(page) || 1), pageCount(total, pageSize))
}

export interface LocalQuery {
  page: number
  pageSize: number
  filters: MlFilterValue
  sort: MlTableSort | null
}

/** Filter → sort → paginate in the browser. `page` in the result is clamped. */
export function localQuery<Row extends object>(rows: Row[], query: LocalQuery, fields: MlFilterField[], collator?: Intl.Collator) {
  const filtered = rows.filter((r) => matchFilters(r as Record<string, unknown>, query.filters, fields))
  const sorted = sortRows(filtered, query.sort, collator)
  const page = clampPage(query.page, sorted.length, query.pageSize)
  const start = (page - 1) * query.pageSize
  return { data: sorted.slice(start, start + query.pageSize), total: sorted.length, page }
}

/** What a remote `request` receives: empty filters dropped, page at least 1. */
export function proRequestParams(query: LocalQuery): MlProTableRequestParams {
  const filters: MlFilterValue = {}
  for (const [k, v] of Object.entries(query.filters)) if (!isEmptyFilter(v)) filters[k] = v
  return { page: Math.max(1, Math.floor(query.page) || 1), pageSize: query.pageSize, filters, sort: query.sort ? { ...query.sort } : null }
}

/**
 * Hands out a ticket per request; only the newest ticket is current, so a
 * slow earlier response can be told apart and dropped.
 */
export function createRequestGuard() {
  let latest = 0
  return {
    next: () => ++latest,
    isLatest: (ticket: number) => ticket === latest,
    /** Invalidate whatever is in flight (e.g. on unmount). */
    cancel: () => void ++latest,
  }
}

export function rowKeyOf<Row>(row: Row, rowKey: string | ((row: Row) => Key)): Key {
  return typeof rowKey === 'function' ? rowKey(row) : ((row as Record<string, unknown>)[rowKey] as Key)
}

/** Selected rows from their keys, looked up in the rows we know about. */
export function rowsByKeys<Row>(keys: Key[], known: Iterable<Row>, rowKey: string | ((row: Row) => Key)): Row[] {
  const map = new Map<Key, Row>()
  for (const row of known) map.set(rowKeyOf(row, rowKey), row)
  return keys.flatMap((k) => (map.has(k) ? [map.get(k)!] : []))
}

/** The row actions to show: built-in edit / delete, or the given list. */
export function resolveRowActions<Row>(actions: MlProTableAction<Row>[] | undefined, builtIn: { edit?: string; delete?: string }): MlProTableAction<Row>[] {
  if (actions) return actions
  const out: MlProTableAction<Row>[] = []
  if (builtIn.edit) out.push({ key: 'edit', label: builtIn.edit })
  if (builtIn.delete) out.push({ key: 'delete', label: builtIn.delete, danger: true })
  return out
}

/** A thrown value as text for the error line. */
export function errorText(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error) return error
  return fallback
}
