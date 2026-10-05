import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState, type ForwardedRef, type ReactElement, type ReactNode, type Ref } from 'react'
import type { MlFilterField, MlFilterValue } from '../components/filter'
import {
  clampPage,
  createRequestGuard,
  errorText,
  isFieldDisabled,
  localQuery,
  pageCount as countPages,
  proFilterFields,
  proFormFields,
  proFormRules,
  proFormValues,
  proRequestParams,
  proTableColumns,
  resolveRowActions,
  rowKeyOf,
  rowsByKeys,
  type MlProFormField,
  type MlProTableAction,
  type MlProTableColumn,
  type MlProTableMode,
  type MlProTableRequest,
  type MlProTableResult,
} from '../components/pro-table'
import type { MlTableColumn, MlTableSort } from '../types'
import { Alert, Button, Icon } from './basic'
import { FilterBar } from './filter'
import { Input, Pagination, Switch, Textarea } from './form'
import { NumberInput } from './inputs'
import { useLocale } from './locale'
import { Modal } from './overlay'
import { DatePicker } from './pickers'
import { confirm } from './popups'
import { Select } from './select'
import { Table, type TableCellContext } from './table'
import { cx, useControllable } from './utils'
import { Form, FormItem, type FormHandle } from './validation'

type Key = string | number

export interface ProTableFormFieldContext {
  field: MlProFormField
  model: Record<string, unknown>
  value: unknown
  update: (value: unknown) => void
  mode: MlProTableMode
}

export interface ProTableHandle<Row = Record<string, unknown>> {
  /** Fetch again (remote) — local data is always current. */
  reload(): Promise<void>
  openCreate(): void
  openEdit(row: Row): void
  /** Delete rows (asks first unless confirmDelete is off). */
  remove(rows: Row[]): Promise<void>
  clearSelection(): void
  selectedRows: Row[]
}

export interface ProTableProps<Row extends Record<string, any>> {
  columns: MlProTableColumn<Row>[]
  /** Local mode: every record; filtered, sorted and paged in the browser. */
  data?: Row[]
  /** Remote mode: fetch one page. Older responses that arrive late are ignored. */
  request?: MlProTableRequest<Row>
  /** Field name or function giving each row a stable key. */
  rowKey?: string | ((row: Row) => Key)
  title?: string
  /** Page-size choices; one entry hides the picker. */
  pageSizes?: number[]
  /** Checkbox column (default: on when rows can be deleted). */
  selectable?: boolean
  /** Ask before deleting. */
  confirmDelete?: boolean
  /** Replaces the built-in 編輯 / 刪除 row actions; `false` hides the column. */
  rowActions?: MlProTableAction<Row>[] | false
  /** Fields shown in the filter bar before "More filters". */
  filterCollapse?: number
  /** Width of the create / edit dialog. */
  formWidth?: number | string
  striped?: boolean
  dense?: boolean
  emptyText?: string
  /** Save a new record. Reject to keep the dialog open with the error. */
  onCreate?: (values: Record<string, unknown>) => unknown
  /** Save changes to a record. Reject to keep the dialog open with the error. */
  onUpdate?: (row: Row, values: Record<string, unknown>) => unknown
  /** Delete records (one, or the selection). */
  onDelete?: (rows: Row[]) => unknown
  onCreated?: (values: Record<string, unknown>) => void
  onUpdated?: (row: Row, values: Record<string, unknown>) => void
  onDeleted?: (rows: Row[]) => void
  /** A remote page arrived. */
  onLoad?: (result: MlProTableResult<Row>) => void
  /** Loading, saving or deleting failed. */
  onError?: (error: unknown) => void
  page?: number
  defaultPage?: number
  onPageChange?: (page: number) => void
  pageSize?: number
  defaultPageSize?: number
  onPageSizeChange?: (size: number) => void
  /** The applied filters (the bar's draft is applied on 搜尋). */
  filters?: MlFilterValue
  defaultFilters?: MlFilterValue
  onFiltersChange?: (filters: MlFilterValue) => void
  sort?: MlTableSort | null
  defaultSort?: MlTableSort | null
  onSortChange?: (sort: MlTableSort | null) => void
  selected?: Key[]
  defaultSelected?: Key[]
  onSelectedChange?: (keys: Key[]) => void
  /** Extra toolbar buttons, before the built-in ones (Vue's #toolbar). */
  renderToolbar?: (api: { selectedRows: Row[]; reload: () => Promise<void> }) => ReactNode
  /** Replaces the row actions (Vue's #actions). */
  renderActions?: (api: { row: Row; edit: () => void; remove: () => Promise<void> }) => ReactNode
  /** Custom cell (Vue's #cell-<key>); return undefined to keep the default text. */
  renderCell?: (ctx: TableCellContext<Row>) => ReactNode
  /** Custom header (Vue's #header-<key>). */
  renderHeader?: (column: MlTableColumn<Row>) => ReactNode
  /** Detail panel under a row (Vue's #expand). */
  renderExpand?: (ctx: { row: Row; index: number }) => ReactNode
  /** Custom filter control (Vue's #filter-<key>); return undefined to keep the built-in one. */
  renderFilterField?: (field: MlFilterField, value: unknown, update: (value: unknown) => void) => ReactNode
  /** Custom form control (Vue's #form-<key>); return undefined to keep the built-in one. */
  renderFormField?: (ctx: ProTableFormFieldContext) => ReactNode
  /** Replaces the empty state (Vue's #empty). */
  empty?: ReactNode
  className?: string
}

const NO_FILTERS: MlFilterValue = {}
const NO_KEYS: Key[] = []
const PAGE_SIZES = [10, 20, 50]

function ProTableInner<Row extends Record<string, any>>(
  {
    columns,
    data,
    request,
    rowKey = 'id',
    title,
    pageSizes = PAGE_SIZES,
    selectable,
    confirmDelete = true,
    rowActions,
    filterCollapse = 3,
    formWidth = 600,
    striped,
    dense,
    emptyText,
    onCreate,
    onUpdate,
    onDelete,
    onCreated,
    onUpdated,
    onDeleted,
    onLoad,
    onError,
    page: pageProp,
    defaultPage = 1,
    onPageChange,
    pageSize: pageSizeProp,
    defaultPageSize = 10,
    onPageSizeChange,
    filters: filtersProp,
    defaultFilters = NO_FILTERS,
    onFiltersChange,
    sort: sortProp,
    defaultSort = null,
    onSortChange,
    selected: selectedProp,
    defaultSelected = NO_KEYS,
    onSelectedChange,
    renderToolbar,
    renderActions,
    renderCell,
    renderHeader,
    renderExpand,
    renderFilterField,
    renderFormField,
    empty,
    className,
  }: ProTableProps<Row>,
  ref: ForwardedRef<ProTableHandle<Row>>,
) {
  const loc = useLocale()
  const [page, setPage] = useControllable(pageProp, defaultPage, onPageChange)
  const [pageSize, setPageSize] = useControllable(pageSizeProp, defaultPageSize, onPageSizeChange)
  const [filters, setFilters] = useControllable(filtersProp, defaultFilters, onFiltersChange)
  const [sort, setSort] = useControllable(sortProp, defaultSort, onSortChange)
  const [selected, setSelected] = useControllable(selectedProp, defaultSelected, onSelectedChange)

  const remote = !!request
  const filterFields = useMemo(() => proFilterFields(columns), [columns])
  const formFields = useMemo(() => proFormFields(columns), [columns])
  const formRules = useMemo(() => proFormRules(formFields), [formFields])
  const canCreate = !!onCreate && formFields.length > 0
  const canEdit = !!onUpdate && formFields.length > 0
  const canDelete = !!onDelete
  const isSelectable = selectable ?? canDelete

  const actions = rowActions === false ? [] : resolveRowActions(rowActions, { edit: canEdit ? loc.proTable.edit : undefined, delete: canDelete ? loc.proTable.delete : undefined })
  const hasActions = !!renderActions || actions.length > 0
  const tableColumns: MlTableColumn<Row>[] = [...proTableColumns(columns), ...(hasActions ? [{ key: '__actions', title: loc.proTable.actions, align: 'right' as const }] : [])]

  /* ── Rows: local pipeline or the last remote page ── */
  const collator = useMemo(() => new Intl.Collator(loc.name, { numeric: true, sensitivity: 'base' }), [loc.name])
  const local = localQuery(data ?? [], { page, pageSize, filters, sort }, filterFields, collator)
  const [remoteRows, setRemoteRows] = useState<Row[]>([])
  const [remoteTotal, setRemoteTotal] = useState(0)
  const rows = remote ? remoteRows : local.data
  const total = remote ? remoteTotal : local.total
  const pages = countPages(total, pageSize)
  // Fewer rows (a filter, a delete) can leave us past the last page.
  useEffect(() => {
    if (!remote && local.page !== page) setPage(local.page)
  }, [remote, local.page, page, setPage])

  /* ── Remote loading ── */
  const [loading, setLoading] = useState(remote)
  const [loadError, setLoadError] = useState<string>()
  const [actionError, setActionError] = useState<string>()
  const guard = useRef(createRequestGuard()).current
  /** Rows seen on any page, so a selection can span pages. */
  const known = useRef(new Map<Key, Row>()).current
  const latest = useRef({ request, page, pageSize, filters, sort, rowKey, onLoad, onError, setPage, loc })
  latest.current = { request, page, pageSize, filters, sort, rowKey, onLoad, onError, setPage, loc }

  const load = useRef(async () => {
    setActionError(undefined)
    const now = latest.current
    if (!now.request) return
    const ticket = guard.next()
    setLoading(true)
    setLoadError(undefined)
    try {
      const result = await now.request(proRequestParams({ page: now.page, pageSize: now.pageSize, filters: now.filters, sort: now.sort }))
      if (!guard.isLatest(ticket)) return
      setRemoteRows(result.data)
      setRemoteTotal(result.total)
      for (const row of result.data) known.set(rowKeyOf(row, latest.current.rowKey), row)
      latest.current.onLoad?.(result)
      // The last rows of the last page were deleted: step back a page.
      const last = clampPage(now.page, result.total, now.pageSize)
      if (!result.data.length && last !== now.page) latest.current.setPage(last)
    } catch (error) {
      if (!guard.isLatest(ticket)) return
      setLoadError(errorText(error, latest.current.loc.proTable.loadError))
      latest.current.onError?.(error)
    } finally {
      if (guard.isLatest(ticket)) setLoading(false)
    }
  }).current
  const reload = () => load()

  // The request itself is read from a ref: an inline function must not refetch on every render.
  const filtersKey = JSON.stringify(filters)
  const sortKey = JSON.stringify(sort)
  useEffect(() => {
    load()
  }, [load, page, pageSize, filtersKey, sortKey])
  useEffect(() => guard.cancel, [guard])

  /* ── Filters ── */
  const [draft, setDraft] = useState<MlFilterValue>(() => ({ ...filters }))
  useEffect(() => setDraft({ ...filters }), [filters])
  const onSearch = (value: MlFilterValue) => {
    setFilters({ ...value })
    setPage(1)
  }
  const onSort = (value: MlTableSort | null) => {
    setSort(value)
    setPage(1)
  }
  const onPageSize = (value: string | number) => {
    setPageSize(Number(value))
    setPage(1)
  }
  const sizeOptions = pageSizes.map((n) => ({ value: n, label: loc.proTable.perPage(n) }))

  /* ── Selection ── */
  const selectedRows = rowsByKeys(selected, remote ? known.values() : (data ?? []), rowKey)
  const clearSelection = () => setSelected([])

  /* ── Create / edit ── */
  const [formOpen, setFormOpen] = useState(false)
  const [mode, setMode] = useState<MlProTableMode>('create')
  const [editing, setEditing] = useState<Row | null>(null)
  const [formModel, setFormModel] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string>()
  const form = useRef<FormHandle>(null)
  const savingRef = useRef(false)

  const openForm = (next: MlProTableMode, row: Row | null) => {
    setMode(next)
    setEditing(row)
    setFormModel(proFormValues(formFields, row))
    setSaveError(undefined)
    setSaving(false)
    setFormOpen(true)
  }
  const openCreate = () => openForm('create', null)
  const openEdit = (row: Row) => openForm('edit', row)
  const update = (key: string, value: unknown) => setFormModel((m) => ({ ...m, [key]: value }))

  async function save() {
    if (savingRef.current || !(await form.current?.validate())) return
    const values = { ...formModel }
    savingRef.current = true
    setSaving(true)
    setSaveError(undefined)
    try {
      if (mode === 'edit' && editing) {
        await onUpdate?.(editing, values)
        onUpdated?.(editing, values)
      } else {
        await onCreate?.(values)
        onCreated?.(values)
      }
      setFormOpen(false)
      await load()
    } catch (error) {
      setSaveError(errorText(error, loc.proTable.saveError))
      onError?.(error)
    } finally {
      savingRef.current = false
      setSaving(false)
    }
  }

  /* ── Delete ── */
  async function remove(list: Row[]) {
    if (!list.length || !onDelete) return
    if (confirmDelete) {
      const ok = await confirm.danger({ title: loc.proTable.deleteTitle, message: loc.proTable.confirmDelete(list.length), confirmText: loc.proTable.delete })
      if (!ok) return
    }
    setActionError(undefined)
    try {
      await onDelete(list)
      const gone = new Set(list.map((row) => rowKeyOf(row, rowKey)))
      if (selected.some((k) => gone.has(k))) setSelected(selected.filter((k) => !gone.has(k)))
      for (const k of gone) known.delete(k)
      onDeleted?.(list)
      await load()
    } catch (error) {
      setActionError(errorText(error, loc.proTable.deleteError))
      onError?.(error)
    }
  }

  const runAction = (action: MlProTableAction<Row>, row: Row) => {
    if (action.onClick) action.onClick(row)
    else if (action.key === 'edit') openEdit(row)
    else if (action.key === 'delete') remove([row])
  }

  useImperativeHandle(ref, () => ({ reload, openCreate, openEdit, remove, clearSelection, selectedRows }))

  const cell = (ctx: TableCellContext<Row>) => {
    if (ctx.column.key !== '__actions') return renderCell?.(ctx)
    const row = ctx.row
    return (
      renderActions?.({ row, edit: () => openEdit(row), remove: () => remove([row]) }) ?? (
        <span className="ml-pro-table__row-actions">
          {actions.map((a) =>
            a.hidden?.(row) ? null : (
              <button
                key={a.key}
                type="button"
                className={cx('ml-pro-table__action', { 'ml-pro-table__action--danger': a.danger })}
                disabled={a.disabled?.(row)}
                onClick={(e) => {
                  e.stopPropagation()
                  runAction(a, row)
                }}
              >
                {a.label}
              </button>
            ),
          )}
        </span>
      )
    )
  }

  const control = (f: MlProFormField) => {
    const value = formModel[f.key]
    const custom = renderFormField?.({ field: f, model: formModel, value, update: (v) => update(f.key, v), mode })
    if (custom !== undefined) return custom
    const disabled = isFieldDisabled(f, mode)
    switch (f.type) {
      case 'number':
        return <NumberInput value={Number(value ?? 0)} label={f.label} hint={f.hint} min={f.min} max={f.max} step={f.step} disabled={disabled} onChange={(v) => update(f.key, v)} />
      case 'select':
        return (
          <Select
            value={(value as string | number | undefined) ?? ''}
            options={f.options}
            label={f.label}
            hint={f.hint}
            placeholder={f.placeholder ?? loc.common.choose}
            disabled={disabled}
            onChange={(v) => update(f.key, v)}
          />
        )
      case 'date':
        return <DatePicker value={(value as Date | null | undefined) ?? null} label={f.label} hint={f.hint} placeholder={f.placeholder} disabled={disabled} clearable onChange={(v) => update(f.key, v)} />
      case 'switch':
        return <Switch checked={!!value} label={f.label} disabled={disabled} onChange={(v) => update(f.key, v)} />
      case 'textarea':
        return <Textarea value={String(value ?? '')} label={f.label} hint={f.hint} placeholder={f.placeholder} rows={f.rows ?? 3} disabled={disabled} onChange={(v) => update(f.key, v)} />
      default:
        return <Input value={String(value ?? '')} label={f.label} hint={f.hint} placeholder={f.placeholder} disabled={disabled} onChange={(v) => update(f.key, v)} />
    }
  }

  return (
    <section className={cx('ml-pro-table', className, { 'ml-pro-table--loading': loading })}>
      {filterFields.length > 0 && (
        <FilterBar
          className="ml-pro-table__filter"
          value={draft}
          onChange={setDraft}
          fields={filterFields}
          collapse={filterCollapse}
          size="sm"
          renderField={renderFilterField}
          onSearch={onSearch}
        />
      )}
      <div className="ml-pro-table__panel">
        <header className="ml-pro-table__toolbar">
          <div className="ml-pro-table__heading">
            {title && <h3 className="ml-pro-table__title">{title}</h3>}
            {selected.length > 0 && (
              <span className="ml-pro-table__selection">
                {loc.proTable.selected(selected.length)}
                <button type="button" className="ml-pro-table__clear" onClick={clearSelection}>
                  {loc.proTable.clearSelection}
                </button>
              </span>
            )}
          </div>
          <div className="ml-pro-table__actions">
            {renderToolbar?.({ selectedRows, reload })}
            {canDelete && selected.length > 0 && (
              <Button variant="danger" size="sm" onClick={() => remove(selectedRows)}>
                {loc.proTable.batchDelete(selected.length)}
              </Button>
            )}
            <Button variant="ghost" size="sm" square aria-label={loc.proTable.reload} disabled={loading} onClick={reload}>
              <Icon name="rotate" />
            </Button>
            {canCreate && (
              <Button size="sm" onClick={openCreate}>
                <Icon name="plus" />
                {loc.proTable.create}
              </Button>
            )}
          </div>
        </header>
        {(loadError || actionError) && (
          <div className="ml-pro-table__error">
            <Alert tone="danger" title={loadError ? loc.proTable.loadError : loc.proTable.deleteError}>
              {loadError ?? actionError}
              {loadError && (
                <button type="button" className="ml-pro-table__retry" onClick={reload}>
                  {loc.proTable.retry}
                </button>
              )}
            </Alert>
          </div>
        )}
        <Table
          columns={tableColumns}
          rows={rows}
          rowKey={rowKey}
          selectable={isSelectable}
          loading={loading}
          striped={striped}
          dense={dense}
          emptyText={emptyText}
          manualSort
          sort={sort}
          onSortChange={onSort}
          selected={selected}
          onSelectedChange={setSelected}
          renderCell={cell}
          renderHeader={renderHeader}
          renderExpand={renderExpand}
          empty={empty}
        />
        <footer className="ml-pro-table__footer">
          <span className="ml-pro-table__total">{loc.proTable.total(total)}</span>
          <div className="ml-pro-table__pager">
            {pageSizes.length > 1 && <Select value={pageSize} options={sizeOptions} aria-label={loc.proTable.pageSize} size="sm" onChange={onPageSize} />}
            <Pagination page={Math.min(page, pages)} total={pages} onChange={setPage} />
          </div>
        </footer>
      </div>
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={mode === 'edit' ? loc.proTable.editTitle : loc.proTable.createTitle}
        width={formWidth}
        footer={
          <>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>
              {loc.proTable.cancel}
            </Button>
            <Button loading={saving} stamp onClick={save}>
              {loc.proTable.save}
            </Button>
          </>
        }
      >
        <Form ref={form} className="ml-pro-table__form" model={formModel} rules={formRules} onSubmit={save}>
          {saveError && (
            <p className="ml-pro-table__form-error" role="alert">
              <Icon name="warning" />
              {saveError}
            </p>
          )}
          {formFields.map((f) => (
            <FormItem key={f.key} prop={f.key} className={cx('ml-pro-table__field', `ml-pro-table__field--${f.type}`, { 'ml-pro-table__field--wide': f.wide })}>
              {control(f)}
            </FormItem>
          ))}
          {/* Enter in a text field submits. */}
          <button type="submit" hidden tabIndex={-1} aria-hidden="true" />
        </Form>
      </Modal>
    </section>
  )
}

/**
 * A whole CRUD page: FilterBar + Table + Pagination, with a create / edit
 * dialog built from the columns. Local (`data`) or remote (`request`) rows.
 */
export const ProTable = forwardRef(ProTableInner) as <Row extends Record<string, any>>(props: ProTableProps<Row> & { ref?: Ref<ProTableHandle<Row>> }) => ReactElement | null
