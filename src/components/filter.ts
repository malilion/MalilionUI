// Filter logic (framework-free, shared by MlFilterBar / MlQueryBuilder and their
// React twins): field definitions, chips for applied filters, local matching,
// and a nested AND / OR query tree with an evaluator.
import type { MlSelectOption } from '../types'

/* ── FilterBar ───────────────────────────────────────── */

export type MlFilterFieldType = 'text' | 'select' | 'multi' | 'date' | 'date-range' | 'number-range'

export interface MlFilterField {
  key: string
  label: string
  type: MlFilterFieldType
  /** For select / multi. */
  options?: MlSelectOption[]
  placeholder?: string
}

export type MlFilterValue = Record<string, unknown>

type Range<T> = [T | null | undefined, T | null | undefined]

/** Nothing chosen: '', null, [], or a range with neither end. */
export function isEmptyFilter(value: unknown): boolean {
  if (value === undefined || value === null || value === '') return true
  if (Array.isArray(value)) return value.length === 0 || value.every((v) => v === null || v === undefined || v === '')
  return false
}

const pad = (n: number) => String(n).padStart(2, '0')

/** 2026/10/04 — short and unambiguous in every locale we ship. */
export function filterDate(d: Date) {
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`
}

const optionLabel = (field: MlFilterField, v: unknown) => field.options?.find((o) => o.value === v)?.label ?? String(v)

function rangeText<T>([a, b]: Range<T>, show: (v: T) => string) {
  const has = (v: T | null | undefined): v is T => v !== null && v !== undefined && (v as unknown) !== ''
  if (has(a) && has(b)) return `${show(a)} – ${show(b)}`
  if (has(a)) return `≥ ${show(a)}`
  if (has(b)) return `≤ ${show(b)}`
  return ''
}

/** How an applied filter reads on its chip. */
export function filterText(field: MlFilterField, value: unknown, separator = '、') {
  if (isEmptyFilter(value)) return ''
  switch (field.type) {
    case 'select':
      return optionLabel(field, value)
    case 'multi':
      return (value as unknown[]).map((v) => optionLabel(field, v)).join(separator)
    case 'date':
      return value instanceof Date ? filterDate(value) : String(value)
    case 'date-range':
      return rangeText(value as Range<Date>, filterDate)
    case 'number-range':
      return rangeText(value as Range<number>, (n) => n.toLocaleString())
    default:
      return String(value)
  }
}

export interface FilterChip {
  field: MlFilterField
  text: string
}

/** One chip per field that has a value, in field order. */
export function filterChips(fields: MlFilterField[], value: MlFilterValue, separator?: string): FilterChip[] {
  return fields.filter((f) => !isEmptyFilter(value[f.key])).map((field) => ({ field, text: filterText(field, value[field.key], separator) }))
}

/** The same filters without one key. */
export function clearFilter(value: MlFilterValue, key: string): MlFilterValue {
  const next = { ...value }
  delete next[key]
  return next
}

const dayOf = (d: unknown) => {
  const date = d instanceof Date ? d : typeof d === 'string' || typeof d === 'number' ? new Date(d) : null
  return date && !Number.isNaN(date.getTime()) ? new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() : NaN
}

/**
 * Whether a record passes every filter, for filtering a list in the browser.
 * Text matches case-insensitively; a multi filter passes when the record's
 * value (or any of its values) is chosen; ranges include both ends.
 */
export function matchFilters(record: Record<string, unknown>, value: MlFilterValue, fields: MlFilterField[]) {
  return fields.every((field) => {
    const want = value[field.key]
    if (isEmptyFilter(want)) return true
    const got = record[field.key]
    switch (field.type) {
      case 'text':
        return String(got ?? '').toLowerCase().includes(String(want).trim().toLowerCase())
      case 'select':
        return got === want || String(got) === String(want)
      case 'multi': {
        const chosen = (want as unknown[]).map(String)
        return (Array.isArray(got) ? got : [got]).some((g) => chosen.includes(String(g)))
      }
      case 'date':
        return dayOf(got) === dayOf(want)
      case 'date-range': {
        const [a, b] = want as Range<Date>
        const t = dayOf(got)
        return !Number.isNaN(t) && (!a || t >= dayOf(a)) && (!b || t <= dayOf(b))
      }
      case 'number-range': {
        const [a, b] = want as Range<number>
        const n = Number(got)
        return Number.isFinite(n) && (a === null || a === undefined || n >= a) && (b === null || b === undefined || n <= b)
      }
      default:
        return true
    }
  })
}

/** Parse a number-range input: '' clears that end. */
export function rangeInput(text: string): number | null {
  if (text.trim() === '') return null
  const n = Number(text)
  return Number.isFinite(n) ? n : null
}

/* ── QueryBuilder ────────────────────────────────────── */

export type MlQueryFieldType = 'text' | 'number' | 'select' | 'date' | 'boolean'

export type MlQueryOperator =
  | 'contains'
  | 'notContains'
  | 'eq'
  | 'neq'
  | 'startsWith'
  | 'endsWith'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'in'
  | 'notIn'
  | 'before'
  | 'after'
  | 'empty'
  | 'notEmpty'
  | 'isTrue'
  | 'isFalse'

export interface MlQueryField {
  key: string
  label: string
  type: MlQueryFieldType
  /** For select fields. */
  options?: MlSelectOption[]
  /** Limit (and order) the operators offered for this field. */
  operators?: MlQueryOperator[]
}

export interface MlQueryRule {
  id: string
  field: string
  operator: MlQueryOperator
  /** One value; [from, to] for between; a list for in / notIn; nothing for empty / notEmpty / isTrue / isFalse. */
  value?: unknown
}

export interface MlQueryGroup {
  id: string
  combinator: 'and' | 'or'
  rules: MlQueryNode[]
}

export type MlQueryNode = MlQueryRule | MlQueryGroup

export const QUERY_OPERATORS: Record<MlQueryFieldType, MlQueryOperator[]> = {
  text: ['contains', 'notContains', 'eq', 'neq', 'startsWith', 'endsWith', 'empty', 'notEmpty'],
  number: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'between', 'empty', 'notEmpty'],
  select: ['eq', 'neq', 'in', 'notIn', 'empty', 'notEmpty'],
  date: ['eq', 'before', 'after', 'between', 'empty', 'notEmpty'],
  boolean: ['isTrue', 'isFalse'],
}

/** How many values an operator takes. */
export function operatorArity(op: MlQueryOperator): 0 | 1 | 2 | 'list' {
  if (op === 'empty' || op === 'notEmpty' || op === 'isTrue' || op === 'isFalse') return 0
  if (op === 'between') return 2
  if (op === 'in' || op === 'notIn') return 'list'
  return 1
}

export const isQueryGroup = (node: MlQueryNode): node is MlQueryGroup => 'rules' in node

let seq = 0
/** Ids for new rules and groups; unique within the page. */
export function queryId(prefix = 'q') {
  return `${prefix}${(++seq).toString(36)}`
}

export function operatorsFor(field: MlQueryField | undefined) {
  if (!field) return []
  return field.operators?.length ? field.operators : QUERY_OPERATORS[field.type]
}

/** A fresh value slot that fits the operator. */
export function emptyValue(op: MlQueryOperator): unknown {
  const arity = operatorArity(op)
  return arity === 0 ? undefined : arity === 2 ? [null, null] : arity === 'list' ? [] : ''
}

export function createRule(fields: MlQueryField[], key = fields[0]?.key): MlQueryRule {
  const field = fields.find((f) => f.key === key) ?? fields[0]
  const operator = operatorsFor(field)[0] ?? 'eq'
  return { id: queryId('r'), field: field?.key ?? '', operator, value: emptyValue(operator) }
}

export function createGroup(fields: MlQueryField[], combinator: 'and' | 'or' = 'and', withRule = true): MlQueryGroup {
  return { id: queryId('g'), combinator, rules: withRule && fields.length ? [createRule(fields)] : [] }
}

/** Copy the tree with one node replaced (or removed when `next` is null). */
export function replaceNode(group: MlQueryGroup, id: string, next: MlQueryNode | null): MlQueryGroup {
  if (group.id === id) return next && isQueryGroup(next) ? next : group
  let changed = false
  const rules: MlQueryNode[] = []
  for (const node of group.rules) {
    if (node.id === id) {
      changed = true
      if (next) rules.push(next)
    } else if (isQueryGroup(node)) {
      const child = replaceNode(node, id, next)
      if (child !== node) changed = true
      rules.push(child)
    } else rules.push(node)
  }
  return changed ? { ...group, rules } : group
}

/** Copy the tree with a node appended to a group. */
export function appendNode(group: MlQueryGroup, groupId: string, node: MlQueryNode): MlQueryGroup {
  if (group.id === groupId) return { ...group, rules: [...group.rules, node] }
  let changed = false
  const rules = group.rules.map((n) => {
    if (!isQueryGroup(n)) return n
    const child = appendNode(n, groupId, node)
    if (child !== n) changed = true
    return child
  })
  return changed ? { ...group, rules } : group
}

/** Change a rule's field: the operator and value reset when they no longer fit. */
export function changeRuleField(rule: MlQueryRule, fields: MlQueryField[], key: string): MlQueryRule {
  const field = fields.find((f) => f.key === key)
  const ops = operatorsFor(field)
  const operator = ops.includes(rule.operator) ? rule.operator : (ops[0] ?? 'eq')
  const sameType = fields.find((f) => f.key === rule.field)?.type === field?.type
  return { ...rule, field: key, operator, value: sameType && operator === rule.operator ? rule.value : emptyValue(operator) }
}

/** Change a rule's operator, reshaping the value if the arity changes. */
export function changeRuleOperator(rule: MlQueryRule, operator: MlQueryOperator): MlQueryRule {
  const keep = operatorArity(operator) === operatorArity(rule.operator)
  return { ...rule, operator, value: keep ? rule.value : emptyValue(operator) }
}

/** A rule is used only once it has what its operator needs. */
export function isRuleComplete(rule: MlQueryRule) {
  const arity = operatorArity(rule.operator)
  if (arity === 0) return true
  if (arity === 2) return Array.isArray(rule.value) && rule.value.some((v) => v !== null && v !== undefined && v !== '')
  if (arity === 'list') return Array.isArray(rule.value) && rule.value.length > 0
  return rule.value !== undefined && rule.value !== null && rule.value !== ''
}

export function countRules(group: MlQueryGroup): number {
  return group.rules.reduce((n, node) => n + (isQueryGroup(node) ? countRules(node) : 1), 0)
}

export function queryDepth(group: MlQueryGroup): number {
  return 1 + Math.max(0, ...group.rules.filter(isQueryGroup).map(queryDepth))
}

const blank = (v: unknown) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)

function compare(a: unknown, b: unknown, type: MlQueryFieldType | undefined) {
  if (type === 'number') return Number(a) - Number(b)
  if (type === 'date') return dayOf(a) - dayOf(b)
  return String(a).localeCompare(String(b))
}

function testRule(rule: MlQueryRule, record: Record<string, unknown>, field: MlQueryField | undefined): boolean {
  const got = record[rule.field]
  const want = rule.value
  const type = field?.type
  const text = (v: unknown) => String(v ?? '').toLowerCase()
  const equal = (a: unknown, b: unknown) => (type === 'date' ? dayOf(a) === dayOf(b) : type === 'number' ? Number(a) === Number(b) : String(a) === String(b))
  switch (rule.operator) {
    case 'contains':
      return text(got).includes(text(want))
    case 'notContains':
      return !text(got).includes(text(want))
    case 'startsWith':
      return text(got).startsWith(text(want))
    case 'endsWith':
      return text(got).endsWith(text(want))
    case 'eq':
      return !blank(got) && equal(got, want)
    case 'neq':
      return blank(got) || !equal(got, want)
    case 'gt':
    case 'after':
      return !blank(got) && compare(got, want, type) > 0
    case 'gte':
      return !blank(got) && compare(got, want, type) >= 0
    case 'lt':
    case 'before':
      return !blank(got) && compare(got, want, type) < 0
    case 'lte':
      return !blank(got) && compare(got, want, type) <= 0
    case 'between': {
      const [a, b] = (want as unknown[]) ?? []
      if (blank(got)) return false
      return (blank(a) || compare(got, a, type) >= 0) && (blank(b) || compare(got, b, type) <= 0)
    }
    case 'in':
      return (want as unknown[]).some((w) => equal(got, w))
    case 'notIn':
      return !(want as unknown[]).some((w) => equal(got, w))
    case 'empty':
      return blank(got)
    case 'notEmpty':
      return !blank(got)
    case 'isTrue':
      return got === true || got === 'true' || got === 1
    case 'isFalse':
      return !(got === true || got === 'true' || got === 1)
  }
}

/**
 * Whether a record satisfies the query. Unfinished rules and empty groups
 * don't filter anything out.
 */
export function evaluateQuery(group: MlQueryGroup, record: Record<string, unknown>, fields: MlQueryField[] = []): boolean {
  const results: boolean[] = []
  for (const node of group.rules) {
    if (isQueryGroup(node)) {
      if (countRules(node)) results.push(evaluateQuery(node, record, fields))
    } else if (isRuleComplete(node)) results.push(testRule(node, record, fields.find((f) => f.key === node.field)))
  }
  if (!results.length) return true
  return group.combinator === 'and' ? results.every(Boolean) : results.some(Boolean)
}

export interface QueryWords {
  and: string
  or: string
  yes: string
  no: string
  ops: Record<MlQueryOperator, string>
}

/** The query in words, e.g. "城市 等於 台北 且 (年齡 大於 18 或 VIP 是)". */
export function queryToText(group: MlQueryGroup, fields: MlQueryField[], words: QueryWords, nested = false): string {
  const parts = group.rules
    .map((node) => {
      if (isQueryGroup(node)) return countRules(node) ? queryToText(node, fields, words, true) : ''
      if (!isRuleComplete(node)) return ''
      const field = fields.find((f) => f.key === node.field)
      const name = field?.label ?? node.field
      const show = (v: unknown) => (field?.type === 'select' ? (field.options?.find((o) => String(o.value) === String(v))?.label ?? String(v)) : String(v))
      const arity = operatorArity(node.operator)
      const value =
        arity === 0 ? '' : arity === 2 ? (node.value as unknown[]).map((v) => (blank(v) ? '…' : show(v))).join(' – ') : arity === 'list' ? (node.value as unknown[]).map(show).join('、') : show(node.value)
      return [name, words.ops[node.operator], value].filter(Boolean).join(' ')
    })
    .filter(Boolean)
  const text = parts.join(` ${group.combinator === 'and' ? words.and : words.or} `)
  return nested && parts.length > 1 ? `(${text})` : text
}
