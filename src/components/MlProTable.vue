<script setup lang="ts" generic="Row extends Record<string, any>">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, useSlots, watch } from 'vue'
import MlAlert from './MlAlert.vue'
import MlButton from './MlButton.vue'
import MlDatePicker from './MlDatePicker.vue'
import MlFilterBar from './MlFilterBar.vue'
import MlForm from './MlForm.vue'
import MlFormItem from './MlFormItem.vue'
import MlIcon from './MlIcon.vue'
import MlInput from './MlInput.vue'
import MlModal from './MlModal.vue'
import MlNumberInput from './MlNumberInput.vue'
import MlPagination from './MlPagination.vue'
import MlSelect from './MlSelect.vue'
import MlSwitch from './MlSwitch.vue'
import MlTable from './MlTable.vue'
import MlTextarea from './MlTextarea.vue'
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
} from './pro-table'
import type { MlFilterField, MlFilterValue } from './filter'
import { confirm } from '../dialog'
import { useLocale } from '../locale'
import type { MlTableColumn, MlTableSort } from '../types'

type Key = string | number

const loc = useLocale()

const props = withDefaults(
  defineProps<{
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
  }>(),
  { rowKey: 'id', pageSizes: () => [10, 20, 50], selectable: undefined, rowActions: undefined, confirmDelete: true, filterCollapse: 3, formWidth: 600 },
)

const emit = defineEmits<{
  created: [values: Record<string, unknown>]
  updated: [row: Row, values: Record<string, unknown>]
  deleted: [rows: Row[]]
  /** A remote page arrived. */
  load: [result: MlProTableResult<Row>]
  /** Loading, saving or deleting failed. */
  error: [error: unknown]
}>()

defineSlots<
  {
    /** Extra toolbar buttons, before the built-in ones. */
    toolbar?: (props: { selectedRows: Row[]; reload: () => Promise<void> }) => unknown
    /** Replaces the row actions: `#actions="{ row, edit, remove }"`. */
    actions?: (props: { row: Row; edit: () => void; remove: () => Promise<void> }) => unknown
    /** Detail panel under a row, as in MlTable. */
    expand?: (props: { row: Row; index: number }) => unknown
    empty?: () => unknown
  } & {
    /** Custom cell, as in MlTable. */
    [name: `cell-${string}`]: ((props: { row: Row; value: unknown; index: number; level: number }) => unknown) | undefined
    /** Custom header, as in MlTable. */
    [name: `header-${string}`]: ((props: { column: MlTableColumn<Row> }) => unknown) | undefined
    /** Custom filter control, as MlFilterBar's #field-{key}. */
    [name: `filter-${string}`]: ((props: { field: MlFilterField; value: unknown; update: (value: unknown) => void }) => unknown) | undefined
    /** Custom form control. */
    [name: `form-${string}`]: ((props: { field: MlProFormField; model: Record<string, unknown>; value: unknown; update: (value: unknown) => void; mode: MlProTableMode }) => unknown) | undefined
  }
>()

const page = defineModel<number>('page', { default: 1 })
const pageSize = defineModel<number>('pageSize', { default: 10 })
/** The applied filters (the bar's draft is applied on 搜尋). */
const filters = defineModel<MlFilterValue>('filters', { default: () => ({}) })
const sort = defineModel<MlTableSort | null>('sort', { default: null })
const selected = defineModel<Key[]>('selected', { default: () => [] })

const slots = useSlots()

const remote = computed(() => !!props.request)
const filterFields = computed(() => proFilterFields(props.columns))
const formFields = computed(() => proFormFields(props.columns))
const formRules = computed(() => proFormRules(formFields.value))
const canCreate = computed(() => !!props.onCreate && formFields.value.length > 0)
const canEdit = computed(() => !!props.onUpdate && formFields.value.length > 0)
const canDelete = computed(() => !!props.onDelete)
const isSelectable = computed(() => props.selectable ?? canDelete.value)

const actions = computed(() =>
  props.rowActions === false
    ? []
    : resolveRowActions(props.rowActions, { edit: canEdit.value ? loc.value.proTable.edit : undefined, delete: canDelete.value ? loc.value.proTable.delete : undefined }),
)
const hasActions = computed(() => !!slots.actions || actions.value.length > 0)
const tableColumns = computed<MlTableColumn<Row>[]>(() => [
  ...proTableColumns(props.columns),
  ...(hasActions.value ? [{ key: '__actions', title: loc.value.proTable.actions, align: 'right' as const }] : []),
])

/* ── Rows: local pipeline or the last remote page ── */
const collator = computed(() => new Intl.Collator(loc.value.name, { numeric: true, sensitivity: 'base' }))
const local = computed(() =>
  localQuery(props.data ?? [], { page: page.value, pageSize: pageSize.value, filters: filters.value, sort: sort.value }, filterFields.value, collator.value),
)
const remoteRows = shallowRef<Row[]>([])
const remoteTotal = ref(0)
const rows = computed<Row[]>(() => (remote.value ? remoteRows.value : local.value.data))
const total = computed(() => (remote.value ? remoteTotal.value : local.value.total))
const pages = computed(() => countPages(total.value, pageSize.value))
// Fewer rows (a filter, a delete) can leave us past the last page.
watch(
  () => [local.value.page, page.value] as const,
  ([clamped, current]) => {
    if (!remote.value && clamped !== current) page.value = clamped
  },
  { immediate: true },
)

/* ── Remote loading ── */
const loading = ref(remote.value)
const loadError = ref<string>()
const actionError = ref<string>()
const guard = createRequestGuard()
/** Rows seen on any page, so a selection can span pages. */
const known = new Map<Key, Row>()

async function load() {
  actionError.value = undefined
  if (!props.request) return
  const ticket = guard.next()
  loading.value = true
  loadError.value = undefined
  try {
    const result = await props.request(proRequestParams({ page: page.value, pageSize: pageSize.value, filters: filters.value, sort: sort.value }))
    if (!guard.isLatest(ticket)) return
    remoteRows.value = result.data
    remoteTotal.value = result.total
    for (const row of result.data) known.set(rowKeyOf(row, props.rowKey), row)
    emit('load', result)
    // The last rows of the last page were deleted: step back a page.
    const last = clampPage(page.value, result.total, pageSize.value)
    if (!result.data.length && last !== page.value) page.value = last
  } catch (error) {
    if (!guard.isLatest(ticket)) return
    loadError.value = errorText(error, loc.value.proTable.loadError)
    emit('error', error)
  } finally {
    if (guard.isLatest(ticket)) loading.value = false
  }
}

watch([page, pageSize, filters, sort, () => props.request], () => load(), { deep: true })
onMounted(load)
onBeforeUnmount(guard.cancel)

/** Fetch again (remote) — local data is always current. */
function reload() {
  return load()
}

/* ── Filters ── */
const draft = ref<MlFilterValue>({ ...filters.value })
watch(filters, (value) => (draft.value = { ...value }))
function onSearch(value: MlFilterValue) {
  filters.value = { ...value }
  page.value = 1
}

function onSort(value: MlTableSort | null) {
  sort.value = value
  page.value = 1
}

function onPageSize(value: string | number | undefined) {
  pageSize.value = Number(value)
  page.value = 1
}
const sizeOptions = computed(() => props.pageSizes.map((n) => ({ value: n, label: loc.value.proTable.perPage(n) })))

/* ── Selection ── */
const selectedRows = computed<Row[]>(() =>
  // Reading remoteRows keeps this fresh as pages arrive (`known` itself isn't reactive).
  rowsByKeys(selected.value, remote.value && remoteRows.value ? known.values() : (props.data ?? []), props.rowKey),
)
function clearSelection() {
  selected.value = []
}

/* ── Create / edit ── */
const formOpen = ref(false)
const mode = ref<MlProTableMode>('create')
const editing = shallowRef<Row | null>(null)
const formModel = ref<Record<string, unknown>>({})
const saving = ref(false)
const saveError = ref<string>()
const form = ref<InstanceType<typeof MlForm>>()

function openForm(next: MlProTableMode, row: Row | null) {
  mode.value = next
  editing.value = row
  formModel.value = proFormValues(formFields.value, row)
  saveError.value = undefined
  saving.value = false
  formOpen.value = true
}
const openCreate = () => openForm('create', null)
const openEdit = (row: Row) => openForm('edit', row)

function update(key: string, value: unknown) {
  formModel.value = { ...formModel.value, [key]: value }
}

async function save() {
  if (saving.value || !(await form.value?.validate())) return
  const values = { ...formModel.value }
  const row = editing.value
  saving.value = true
  saveError.value = undefined
  try {
    if (mode.value === 'edit' && row) {
      await props.onUpdate?.(row, values)
      emit('updated', row, values)
    } else {
      await props.onCreate?.(values)
      emit('created', values)
    }
    formOpen.value = false
    await load()
  } catch (error) {
    saveError.value = errorText(error, loc.value.proTable.saveError)
    emit('error', error)
  } finally {
    saving.value = false
  }
}

/* ── Delete ── */
async function remove(list: Row[]) {
  if (!list.length || !props.onDelete) return
  if (props.confirmDelete) {
    const ok = await confirm.danger({ title: loc.value.proTable.deleteTitle, message: loc.value.proTable.confirmDelete(list.length), confirmText: loc.value.proTable.delete })
    if (!ok) return
  }
  actionError.value = undefined
  try {
    await props.onDelete(list)
    const gone = new Set(list.map((row) => rowKeyOf(row, props.rowKey)))
    if (selected.value.some((k) => gone.has(k))) selected.value = selected.value.filter((k) => !gone.has(k))
    for (const k of gone) known.delete(k)
    emit('deleted', list)
    await load()
  } catch (error) {
    actionError.value = errorText(error, loc.value.proTable.deleteError)
    emit('error', error)
  }
}
const removeSelected = () => remove(selectedRows.value)

function runAction(action: MlProTableAction<Row>, row: Row) {
  if (action.onClick) action.onClick(row)
  else if (action.key === 'edit') openEdit(row)
  else if (action.key === 'delete') remove([row])
}

/** Slots handed straight to MlTable. */
const passSlots = computed(() => Object.keys(slots).filter((name) => /^(cell|header)-/.test(name) || name === 'expand' || name === 'empty') as `cell-${string}`[])
/** #filter-{key} → MlFilterBar's #field-{key}. */
const filterSlots = computed(() =>
  Object.keys(slots)
    .filter((name) => name.startsWith('filter-'))
    .map((name) => ({ name: name as `filter-${string}`, target: `field-${name.slice(7)}` })),
)

defineExpose({ reload, openCreate, openEdit, selectedRows, clearSelection, remove })
</script>

<template>
  <section :class="['ml-pro-table', { 'ml-pro-table--loading': loading }]">
    <MlFilterBar
      v-if="filterFields.length"
      v-model="draft"
      class="ml-pro-table__filter"
      :fields="filterFields"
      :collapse="filterCollapse"
      size="sm"
      @search="onSearch"
    >
      <template v-for="s in filterSlots" #[s.target]="scope">
        <slot :name="s.name" v-bind="scope" />
      </template>
    </MlFilterBar>
    <div class="ml-pro-table__panel">
      <header class="ml-pro-table__toolbar">
        <div class="ml-pro-table__heading">
          <h3 v-if="title" class="ml-pro-table__title">{{ title }}</h3>
          <span v-if="selected.length" class="ml-pro-table__selection">
            {{ loc.proTable.selected(selected.length) }}
            <button type="button" class="ml-pro-table__clear" @click="clearSelection">{{ loc.proTable.clearSelection }}</button>
          </span>
        </div>
        <div class="ml-pro-table__actions">
          <slot name="toolbar" :selected-rows="selectedRows" :reload="reload" />
          <MlButton v-if="canDelete && selected.length" variant="danger" size="sm" @click="removeSelected">
            {{ loc.proTable.batchDelete(selected.length) }}
          </MlButton>
          <MlButton variant="ghost" size="sm" square :aria-label="loc.proTable.reload" :disabled="loading" @click="reload">
            <MlIcon name="rotate" />
          </MlButton>
          <MlButton v-if="canCreate" size="sm" @click="openCreate"><MlIcon name="plus" />{{ loc.proTable.create }}</MlButton>
        </div>
      </header>
      <div v-if="loadError || actionError" class="ml-pro-table__error">
        <MlAlert tone="danger" :title="loadError ? loc.proTable.loadError : loc.proTable.deleteError">
          {{ loadError ?? actionError }}
          <button v-if="loadError" type="button" class="ml-pro-table__retry" @click="reload">{{ loc.proTable.retry }}</button>
        </MlAlert>
      </div>
      <MlTable
        :columns="tableColumns"
        :rows="rows"
        :row-key="rowKey"
        :selectable="isSelectable"
        :loading="loading"
        :striped="striped"
        :dense="dense"
        :empty-text="emptyText"
        manual-sort
        :sort="sort"
        :selected="selected"
        @update:sort="onSort"
        @update:selected="selected = $event"
      >
        <template v-for="name in passSlots" #[name]="scope">
          <slot :name="name" v-bind="scope" />
        </template>
        <template #cell-__actions="{ row }">
          <slot name="actions" :row="row" :edit="() => openEdit(row)" :remove="() => remove([row])">
            <span class="ml-pro-table__row-actions">
              <template v-for="a in actions" :key="a.key">
                <button
                  v-if="!a.hidden?.(row)"
                  type="button"
                  :class="['ml-pro-table__action', { 'ml-pro-table__action--danger': a.danger }]"
                  :disabled="a.disabled?.(row)"
                  @click.stop="runAction(a, row)"
                >
                  {{ a.label }}
                </button>
              </template>
            </span>
          </slot>
        </template>
      </MlTable>
      <footer class="ml-pro-table__footer">
        <span class="ml-pro-table__total">{{ loc.proTable.total(total) }}</span>
        <div class="ml-pro-table__pager">
          <MlSelect
            v-if="pageSizes.length > 1"
            :model-value="pageSize"
            :options="sizeOptions"
            :aria-label="loc.proTable.pageSize"
            size="sm"
            @update:model-value="onPageSize"
          />
          <MlPagination :page="Math.min(page, pages)" :total="pages" @update:page="page = $event" />
        </div>
      </footer>
    </div>
    <MlModal v-model:open="formOpen" :title="mode === 'edit' ? loc.proTable.editTitle : loc.proTable.createTitle" :width="formWidth">
      <MlForm ref="form" class="ml-pro-table__form" :model="formModel" :rules="formRules" @submit="save">
        <p v-if="saveError" class="ml-pro-table__form-error" role="alert"><MlIcon name="warning" />{{ saveError }}</p>
        <MlFormItem
          v-for="f in formFields"
          :key="f.key"
          :prop="f.key"
          :class="['ml-pro-table__field', `ml-pro-table__field--${f.type}`, { 'ml-pro-table__field--wide': f.wide }]"
        >
          <slot :name="(`form-${f.key}` as `form-${string}`)" :field="f" :model="formModel" :value="formModel[f.key]" :update="(v: unknown) => update(f.key, v)" :mode="mode">
            <MlNumberInput
              v-if="f.type === 'number'"
              :model-value="Number(formModel[f.key] ?? 0)"
              :label="f.label"
              :hint="f.hint"
              :min="f.min"
              :max="f.max"
              :step="f.step"
              :disabled="isFieldDisabled(f, mode)"
              @update:model-value="update(f.key, $event)"
            />
            <MlSelect
              v-else-if="f.type === 'select'"
              :model-value="(formModel[f.key] as string | number | undefined) ?? ''"
              :options="f.options"
              :label="f.label"
              :hint="f.hint"
              :placeholder="f.placeholder ?? loc.common.choose"
              :disabled="isFieldDisabled(f, mode)"
              @update:model-value="update(f.key, $event)"
            />
            <MlDatePicker
              v-else-if="f.type === 'date'"
              :model-value="(formModel[f.key] as Date | null | undefined) ?? null"
              :label="f.label"
              :hint="f.hint"
              :placeholder="f.placeholder"
              :disabled="isFieldDisabled(f, mode)"
              clearable
              @update:model-value="update(f.key, $event)"
            />
            <MlSwitch
              v-else-if="f.type === 'switch'"
              :model-value="!!formModel[f.key]"
              :label="f.label"
              :disabled="isFieldDisabled(f, mode)"
              @update:model-value="update(f.key, $event)"
            />
            <MlTextarea
              v-else-if="f.type === 'textarea'"
              :model-value="String(formModel[f.key] ?? '')"
              :label="f.label"
              :hint="f.hint"
              :placeholder="f.placeholder"
              :rows="f.rows ?? 3"
              :disabled="isFieldDisabled(f, mode)"
              @update:model-value="update(f.key, $event)"
            />
            <MlInput
              v-else
              :model-value="String(formModel[f.key] ?? '')"
              :label="f.label"
              :hint="f.hint"
              :placeholder="f.placeholder"
              :disabled="isFieldDisabled(f, mode)"
              @update:model-value="update(f.key, $event)"
            />
          </slot>
        </MlFormItem>
        <!-- Enter in a text field submits. -->
        <button type="submit" hidden tabindex="-1" aria-hidden="true" />
      </MlForm>
      <template #footer>
        <MlButton variant="ghost" @click="formOpen = false">{{ loc.proTable.cancel }}</MlButton>
        <MlButton :loading="saving" stamp @click="save">{{ loc.proTable.save }}</MlButton>
      </template>
    </MlModal>
  </section>
</template>
