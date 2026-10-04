import { useId, useState, type ReactNode } from 'react'
import {
  appendNode,
  changeRuleField,
  changeRuleOperator,
  clearFilter,
  createGroup,
  createRule,
  filterChips,
  isEmptyFilter,
  isQueryGroup,
  operatorArity,
  operatorsFor,
  queryToText,
  rangeInput,
  replaceNode,
  type MlFilterField,
  type MlFilterValue,
  type MlQueryField,
  type MlQueryGroup,
  type MlQueryNode,
  type MlQueryOperator,
  type MlQueryRule,
} from '../components/filter'
import type { MlDateRange, MlSize } from '../types'
import { Button, Icon } from './basic'
import { Field, Input } from './form'
import { useLocale } from './locale'
import { DatePicker, DateRangePicker } from './pickers'
import { Combobox, Select } from './select'
import { cx, useControllable } from './utils'

/* ── FilterBar ─────────────────────────────────────────── */

export interface FilterBarProps {
  fields?: MlFilterField[]
  value?: MlFilterValue
  defaultValue?: MlFilterValue
  onChange?: (value: MlFilterValue) => void
  onSearch?: (value: MlFilterValue) => void
  onReset?: () => void
  /** Fields shown before "More filters"; the rest fold away. */
  collapse?: number
  /** Chips of the applied filters, each with its own ×. */
  chips?: boolean
  /** Search on every change instead of waiting for the button. */
  immediate?: boolean
  size?: MlSize
  /** A custom control for some fields; return undefined to keep the built-in one. */
  renderField?: (field: MlFilterField, value: unknown, update: (value: unknown) => void) => ReactNode
  actions?: ReactNode
  /** Accessible name of the search region. Default "篩選". */
  label?: string
  className?: string
}

const NO_FIELDS: MlFilterField[] = []
const EMPTY: MlFilterValue = {}

export function FilterBar({
  fields = NO_FIELDS,
  value,
  defaultValue = EMPTY,
  onChange,
  onSearch,
  onReset,
  collapse = Infinity,
  chips = true,
  immediate = false,
  size = 'md',
  renderField,
  actions,
  label,
  className,
}: FilterBarProps) {
  const loc = useLocale()
  const [model, setModel] = useControllable(value, defaultValue, onChange)
  const [expanded, setExpanded] = useState(false)
  const autoId = useId().replace(/[^\w-]/g, '')
  const visible = expanded ? fields : fields.slice(0, collapse)
  const folded = Math.max(0, fields.length - collapse)
  const applied = chips ? filterChips(fields, model, loc.name.toLowerCase().startsWith('zh') ? '、' : ', ') : []
  const count = fields.filter((f) => !isEmptyFilter(model[f.key])).length

  const commit = (next: MlFilterValue, search: boolean) => {
    setModel(next)
    if (search) onSearch?.(next)
  }
  const update = (key: string, v: unknown) => commit(isEmptyFilter(v) ? clearFilter(model, key) : { ...model, [key]: v }, immediate)
  const reset = () => {
    setModel({})
    onReset?.()
    onSearch?.({})
  }
  const rangeOf = (key: string) => (model[key] as [number | null, number | null] | undefined) ?? [null, null]
  const setRange = (key: string, end: 0 | 1, text: string) => {
    const next = [...rangeOf(key)] as [number | null, number | null]
    next[end] = rangeInput(text)
    update(key, next)
  }

  const control = (f: MlFilterField) => {
    const custom = renderField?.(f, model[f.key], (v) => update(f.key, v))
    if (custom !== undefined) return custom
    switch (f.type) {
      case 'text':
        return <Input value={(model[f.key] as string | undefined) ?? ''} label={f.label} placeholder={f.placeholder} size={size} onChange={(v) => update(f.key, v)} />
      case 'select':
        return (
          <Select
            value={(model[f.key] as string | number | undefined) ?? ''}
            options={[{ value: '', label: loc.filter.all }, ...(f.options ?? [])]}
            label={f.label}
            size={size}
            onChange={(v) => update(f.key, v)}
          />
        )
      case 'multi':
        return (
          <Combobox
            value={(model[f.key] as (string | number)[] | undefined) ?? []}
            options={f.options ?? []}
            label={f.label}
            placeholder={f.placeholder ?? loc.filter.all}
            size={size}
            multiple
            clearable
            onChange={(v) => update(f.key, v)}
          />
        )
      case 'date':
        return <DatePicker value={(model[f.key] as Date | undefined) ?? null} label={f.label} placeholder={f.placeholder} clearable onChange={(v) => update(f.key, v)} />
      case 'date-range':
        return <DateRangePicker value={(model[f.key] as MlDateRange | undefined) ?? [null, null]} label={f.label} clearable onChange={(v) => update(f.key, v)} />
      case 'number-range': {
        const id = `ml-filter-${autoId}-${f.key}`
        const [lo, hi] = rangeOf(f.key)
        return (
          <Field label={f.label} controlId={id}>
            <div className="ml-filter__range">
              <div className={cx('ml-input', `ml-input--${size}`)}>
                <input
                  id={id}
                  key={`lo-${lo ?? ''}`}
                  className="ml-input__control"
                  type="number"
                  inputMode="decimal"
                  placeholder={loc.filter.min}
                  aria-label={`${f.label} ${loc.filter.min}`}
                  defaultValue={lo ?? ''}
                  onBlur={(e) => setRange(f.key, 0, e.currentTarget.value)}
                  onKeyDown={(e) => e.key === 'Enter' && setRange(f.key, 0, e.currentTarget.value)}
                />
              </div>
              <span className="ml-filter__dash" aria-hidden="true">
                –
              </span>
              <div className={cx('ml-input', `ml-input--${size}`)}>
                <input
                  key={`hi-${hi ?? ''}`}
                  className="ml-input__control"
                  type="number"
                  inputMode="decimal"
                  placeholder={loc.filter.max}
                  aria-label={`${f.label} ${loc.filter.max}`}
                  defaultValue={hi ?? ''}
                  onBlur={(e) => setRange(f.key, 1, e.currentTarget.value)}
                  onKeyDown={(e) => e.key === 'Enter' && setRange(f.key, 1, e.currentTarget.value)}
                />
              </div>
            </div>
          </Field>
        )
      }
    }
  }

  return (
    <form
      className={cx('ml-filter', `ml-filter--${size}`, className)}
      role="search"
      aria-label={label ?? loc.filter.label}
      onSubmit={(e) => {
        e.preventDefault()
        onSearch?.(model)
      }}
    >
      <div className="ml-filter__fields">
        {visible.map((f) => (
          <div key={f.key} className={cx('ml-filter__item', `ml-filter__item--${f.type}`)}>
            {control(f)}
          </div>
        ))}
        <div className="ml-filter__actions">
          <Button type="submit" size={size}>
            <Icon name="search" />
            {loc.filter.search}
          </Button>
          <Button variant="ghost" size={size} onClick={reset}>
            {loc.filter.reset}
          </Button>
          {folded > 0 && (
            <button type="button" className="ml-filter__more" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
              {expanded ? loc.filter.less : loc.filter.more(folded)}
              <Icon name="chevronDown" className={cx({ 'ml-filter__chevron--up': expanded })} />
            </button>
          )}
          {actions}
        </div>
      </div>
      {applied.length > 0 && (
        <div className="ml-filter__chips">
          <span className="ml-filter__count">{loc.filter.applied(count)}</span>
          {applied.map((c) => (
            <span key={c.field.key} className="ml-filter__chip">
              <span className="ml-filter__chip-label">{c.field.label}</span>
              <span className="ml-filter__chip-value">{c.text}</span>
              <button type="button" className="ml-filter__chip-x" aria-label={loc.filter.clear(c.field.label)} onClick={() => commit(clearFilter(model, c.field.key), true)}>
                <Icon name="close" />
              </button>
            </span>
          ))}
          {applied.length > 1 && (
            <button type="button" className="ml-filter__clear" onClick={reset}>
              {loc.filter.clearAll}
            </button>
          )}
        </div>
      )}
    </form>
  )
}

/* ── QueryBuilder ──────────────────────────────────────── */

export interface QueryBuilderProps {
  fields?: MlQueryField[]
  value?: MlQueryGroup
  defaultValue?: MlQueryGroup
  onChange?: (query: MlQueryGroup) => void
  /** Levels of nesting allowed, the top group included. */
  maxDepth?: number
  size?: MlSize
  disabled?: boolean
  /** Read the query back in words under the builder. */
  showText?: boolean
  /** Accessible name. Default "查詢條件". */
  label?: string
  className?: string
}

interface GroupProps {
  group: MlQueryGroup
  depth: number
  fields: MlQueryField[]
  maxDepth: number
  size: MlSize
  disabled: boolean
  replace: (id: string, next: MlQueryNode | null) => void
  append: (groupId: string, kind: 'rule' | 'group') => void
}

function QueryGroupView(props: GroupProps) {
  const { group, depth, fields, maxDepth, size, disabled, replace, append } = props
  const loc = useLocale()
  const fieldOf = (rule: MlQueryRule) => fields.find((f) => f.key === rule.field)
  const inputType = (rule: MlQueryRule) => (fieldOf(rule)?.type === 'number' ? 'number' : fieldOf(rule)?.type === 'date' ? 'date' : 'text')
  const parse = (rule: MlQueryRule, text: string) => {
    if (inputType(rule) !== 'number' || text === '') return text
    const n = Number(text)
    return Number.isFinite(n) ? n : text
  }
  const setValue = (rule: MlQueryRule, value: unknown) => replace(rule.id, { ...rule, value })
  const pairOf = (rule: MlQueryRule) => (Array.isArray(rule.value) ? rule.value : [null, null])
  const setEnd = (rule: MlQueryRule, end: 0 | 1, text: string) => {
    const pair = [...pairOf(rule)]
    pair[end] = text === '' ? null : parse(rule, text)
    setValue(rule, pair)
  }
  // Inputs commit on change (blur / Enter), like the Vue twin's @change.
  const textInput = (rule: MlQueryRule, current: unknown, onCommit: (text: string) => void, aria: string, placeholder: string) => (
    <div className={cx('ml-input', `ml-input--${size}`)}>
      <input
        key={`${rule.id}-${String(current ?? '')}`}
        className="ml-input__control"
        type={inputType(rule)}
        defaultValue={(current as string | number | null | undefined) ?? ''}
        aria-label={aria}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(e) => inputType(rule) === 'date' && onCommit(e.currentTarget.value)}
        onBlur={(e) => e.currentTarget.value !== String(current ?? '') && onCommit(e.currentTarget.value)}
        onKeyDown={(e) => e.key === 'Enter' && onCommit(e.currentTarget.value)}
      />
    </div>
  )

  return (
    <div className={cx('ml-query__group', { 'ml-query__group--root': depth === 0 })} role="group" aria-label={depth === 0 ? undefined : loc.query.label}>
      <div className="ml-query__head">
        <div className="ml-query__combinator" role="radiogroup" aria-label={loc.query.combinator}>
          {(['and', 'or'] as const).map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={group.combinator === c}
              className={cx('ml-query__toggle', { 'ml-query__toggle--on': group.combinator === c })}
              disabled={disabled}
              onClick={() => c !== group.combinator && replace(group.id, { ...group, combinator: c })}
            >
              {loc.query[c]}
            </button>
          ))}
        </div>
        <span className="ml-query__spacer" />
        {depth > 0 && (
          <button type="button" className="ml-query__icon" aria-label={loc.query.removeGroup} disabled={disabled} onClick={() => replace(group.id, null)}>
            <Icon name="close" />
          </button>
        )}
      </div>
      {group.rules.length ? (
        <ul className="ml-query__list">
          {group.rules.map((node) => (
            <li key={node.id} className={cx('ml-query__item', { 'ml-query__item--group': isQueryGroup(node) })}>
              {isQueryGroup(node) ? (
                <QueryGroupView {...props} group={node} depth={depth + 1} />
              ) : (
                <div className="ml-query__rule">
                  <Select
                    className="ml-query__field"
                    value={node.field}
                    options={fields.map((f) => ({ value: f.key, label: f.label }))}
                    size={size}
                    disabled={disabled}
                    aria-label={loc.query.field}
                    onChange={(v) => replace(node.id, changeRuleField(node, fields, String(v)))}
                  />
                  <Select
                    className="ml-query__operator"
                    value={node.operator}
                    options={operatorsFor(fieldOf(node)).map((op) => ({ value: op, label: loc.query.ops[op] }))}
                    size={size}
                    disabled={disabled}
                    aria-label={loc.query.operator}
                    onChange={(v) => replace(node.id, changeRuleOperator(node, v as MlQueryOperator))}
                  />
                  {operatorArity(node.operator) !== 0 && (
                    <div className="ml-query__value">
                      {operatorArity(node.operator) === 'list' ? (
                        <Combobox
                          value={(node.value as (string | number)[]) ?? []}
                          options={fieldOf(node)?.options ?? []}
                          size={size}
                          disabled={disabled}
                          placeholder={loc.query.value}
                          multiple
                          onChange={(v) => setValue(node, v)}
                        />
                      ) : fieldOf(node)?.type === 'select' && operatorArity(node.operator) === 1 ? (
                        <Select
                          value={(node.value as string | number) ?? ''}
                          options={fieldOf(node)?.options ?? []}
                          placeholder={loc.query.value}
                          size={size}
                          disabled={disabled}
                          aria-label={loc.query.value}
                          onChange={(v) => setValue(node, v)}
                        />
                      ) : operatorArity(node.operator) === 2 ? (
                        <div className="ml-query__pair">
                          {textInput(node, pairOf(node)[0], (t) => setEnd(node, 0, t), `${loc.query.value} ${loc.query.from}`, loc.query.from)}
                          <span className="ml-query__dash" aria-hidden="true">
                            –
                          </span>
                          {textInput(node, pairOf(node)[1], (t) => setEnd(node, 1, t), `${loc.query.value} ${loc.query.to}`, loc.query.to)}
                        </div>
                      ) : (
                        textInput(node, node.value, (t) => setValue(node, parse(node, t)), loc.query.value, loc.query.value)
                      )}
                    </div>
                  )}
                  <button type="button" className="ml-query__icon" aria-label={loc.query.removeRule} disabled={disabled} onClick={() => replace(node.id, null)}>
                    <Icon name="close" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="ml-query__empty">{loc.query.empty}</p>
      )}
      <div className="ml-query__foot">
        <button type="button" className="ml-query__add" disabled={disabled || !fields.length} onClick={() => append(group.id, 'rule')}>
          <Icon name="plus" />
          {loc.query.addRule}
        </button>
        {depth + 1 < maxDepth && (
          <button type="button" className="ml-query__add" disabled={disabled || !fields.length} onClick={() => append(group.id, 'group')}>
            <Icon name="plus" />
            {loc.query.addGroup}
          </button>
        )}
      </div>
    </div>
  )
}

const NO_QUERY_FIELDS: MlQueryField[] = []

export function QueryBuilder({ fields = NO_QUERY_FIELDS, value, defaultValue, onChange, maxDepth = 3, size = 'sm', disabled = false, showText = false, label, className }: QueryBuilderProps) {
  const loc = useLocale()
  const [initial] = useState(() => defaultValue ?? createGroup([], 'and', false))
  const [query, setQuery] = useControllable(value, initial, onChange)
  const replace = (id: string, next: MlQueryNode | null) => setQuery(replaceNode(query, id, next))
  const append = (groupId: string, kind: 'rule' | 'group') => setQuery(appendNode(query, groupId, kind === 'rule' ? createRule(fields) : createGroup(fields)))
  const text = queryToText(query, fields, loc.query)
  return (
    <div className={cx('ml-query', `ml-query--${size}`, className, { 'ml-query--disabled': disabled })} role="group" aria-label={label ?? loc.query.label}>
      <QueryGroupView group={query} depth={0} fields={fields} maxDepth={maxDepth} size={size} disabled={disabled} replace={replace} append={append} />
      {showText && (
        <p className="ml-query__text" aria-live="polite">
          {text || loc.query.empty}
        </p>
      )}
    </div>
  )
}
