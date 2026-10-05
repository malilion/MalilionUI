// MlFilterBar, MlQueryBuilder and the filter / query logic.
import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { MlFilterBar, MlQueryBuilder, clearFilter, countRules, createGroup, createRule, evaluateQuery, filterChips, isEmptyFilter, matchFilters, queryToText, type MlFilterField, type MlQueryField, type MlQueryGroup } from '../src'
import { appendNode, changeRuleField, changeRuleOperator, isRuleComplete, operatorArity, queryDepth, replaceNode } from '../src/components/filter'
import { zhTW } from '../src/locale-data'

let wrapper: VueWrapper | undefined
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
})
const prop = (key: string) => (wrapper!.props() as Record<string, unknown>)[key]

const fields: MlFilterField[] = [
  { key: 'q', label: '關鍵字', type: 'text' },
  { key: 'status', label: '狀態', type: 'select', options: [{ value: 'paid', label: '已付款' }, { value: 'refund', label: '退款' }] },
  { key: 'city', label: '縣市', type: 'multi', options: [{ value: 'tpe', label: '台北' }, { value: 'khh', label: '高雄' }] },
  { key: 'day', label: '日期', type: 'date' },
  { key: 'when', label: '期間', type: 'date-range' },
  { key: 'amount', label: '金額', type: 'number-range' },
]

describe('filter helpers', () => {
  it('knows what empty means', () => {
    expect([undefined, null, '', [], [null, null], [undefined, '']].every(isEmptyFilter)).toBe(true)
    expect([0, 'a', [1], [null, 5], new Date()].some(isEmptyFilter)).toBe(false)
  })

  it('writes chips for applied filters only', () => {
    const chips = filterChips(fields, {
      q: '獅',
      status: 'paid',
      city: ['tpe', 'khh'],
      day: new Date(2026, 9, 4),
      when: [new Date(2026, 9, 1), null],
      amount: [null, 5000],
    })
    expect(chips.map((c) => `${c.field.key}=${c.text}`)).toEqual(['q=獅', 'status=已付款', 'city=台北、高雄', 'day=2026/10/04', 'when=≥ 2026/10/01', 'amount=≤ 5,000'])
    expect(filterChips(fields, { amount: [100, 200] })[0].text).toBe('100 – 200')
    expect(clearFilter({ a: 1, b: 2 }, 'a')).toEqual({ b: 2 })
  })

  it('matches records in the browser', () => {
    const rec = { q: 'ML-1001 碼力獅', status: 'paid', city: 'tpe', day: '2026-10-04T10:00', when: new Date(2026, 9, 3), amount: 1200 }
    expect(matchFilters(rec, {}, fields)).toBe(true)
    expect(matchFilters(rec, { q: 'ml-1001' }, fields)).toBe(true)
    expect(matchFilters(rec, { q: 'x' }, fields)).toBe(false)
    expect(matchFilters(rec, { status: 'paid', city: ['khh', 'tpe'] }, fields)).toBe(true)
    expect(matchFilters(rec, { city: ['khh'] }, fields)).toBe(false)
    expect(matchFilters({ ...rec, city: ['khh', 'tpe'] }, { city: ['tpe'] }, fields)).toBe(true)
    expect(matchFilters(rec, { day: new Date(2026, 9, 4) }, fields)).toBe(true)
    expect(matchFilters(rec, { when: [new Date(2026, 9, 1), new Date(2026, 9, 3)] }, fields)).toBe(true)
    expect(matchFilters(rec, { when: [new Date(2026, 9, 4), null] }, fields)).toBe(false)
    expect(matchFilters(rec, { amount: [1000, null] }, fields)).toBe(true)
    expect(matchFilters(rec, { amount: [null, 1199] }, fields)).toBe(false)
  })
})

const qFields: MlQueryField[] = [
  { key: 'name', label: '姓名', type: 'text' },
  { key: 'age', label: '年齡', type: 'number' },
  { key: 'city', label: '縣市', type: 'select', options: [{ value: 'tpe', label: '台北' }, { value: 'khh', label: '高雄' }] },
  { key: 'joined', label: '加入', type: 'date' },
  { key: 'vip', label: 'VIP', type: 'boolean' },
]
const query: MlQueryGroup = {
  id: 'root',
  combinator: 'and',
  rules: [
    { id: 'a', field: 'city', operator: 'in', value: ['tpe', 'khh'] },
    {
      id: 'g',
      combinator: 'or',
      rules: [
        { id: 'b', field: 'age', operator: 'between', value: [30, 40] },
        { id: 'c', field: 'vip', operator: 'isTrue' },
      ],
    },
  ],
}

describe('query helpers', () => {
  it('evaluates nested AND / OR groups', () => {
    expect(evaluateQuery(query, { city: 'tpe', age: 35, vip: false }, qFields)).toBe(true)
    expect(evaluateQuery(query, { city: 'tpe', age: 25, vip: true }, qFields)).toBe(true)
    expect(evaluateQuery(query, { city: 'tpe', age: 25, vip: false }, qFields)).toBe(false)
    expect(evaluateQuery(query, { city: 'tch', age: 35 }, qFields)).toBe(false)
  })

  it('covers every operator', () => {
    const t = (field: string, operator: string, value: unknown, rec: Record<string, unknown>) =>
      evaluateQuery({ id: 'x', combinator: 'and', rules: [{ id: 'r', field, operator: operator as never, value }] }, rec, qFields)
    expect(t('name', 'contains', '獅', { name: '碼力獅' })).toBe(true)
    expect(t('name', 'notContains', '獅', { name: '碼力獅' })).toBe(false)
    expect(t('name', 'startsWith', 'ml', { name: 'ML-1' })).toBe(true)
    expect(t('name', 'endsWith', '1', { name: 'ML-1' })).toBe(true)
    expect(t('name', 'eq', 'a', { name: 'a' })).toBe(true)
    expect(t('name', 'neq', 'a', {})).toBe(true)
    expect(t('age', 'gt', 30, { age: 31 })).toBe(true)
    expect(t('age', 'gte', 30, { age: 30 })).toBe(true)
    expect(t('age', 'lt', 30, { age: 30 })).toBe(false)
    expect(t('age', 'lte', 30, { age: 30 })).toBe(true)
    expect(t('age', 'gt', 30, {})).toBe(false)
    expect(t('age', 'between', [null, 10], { age: 9 })).toBe(true)
    expect(t('city', 'notIn', ['tpe'], { city: 'khh' })).toBe(true)
    expect(t('joined', 'before', '2026-01-01', { joined: '2025-12-31' })).toBe(true)
    expect(t('joined', 'after', '2026-01-01', { joined: new Date(2026, 0, 2) })).toBe(true)
    expect(t('joined', 'eq', '2026-01-01', { joined: new Date(2026, 0, 1, 15) })).toBe(true)
    expect(t('name', 'empty', undefined, { name: '' })).toBe(true)
    expect(t('name', 'notEmpty', undefined, { name: 'x' })).toBe(true)
    expect(t('vip', 'isFalse', undefined, { vip: false })).toBe(true)
  })

  it('ignores unfinished rules and empty groups', () => {
    const q: MlQueryGroup = { id: 'r', combinator: 'and', rules: [{ id: 'x', field: 'age', operator: 'gt', value: '' }, { id: 'g', combinator: 'or', rules: [] }] }
    expect(evaluateQuery(q, {}, qFields)).toBe(true)
    expect(isRuleComplete({ id: 'x', field: 'age', operator: 'between', value: [null, 3] })).toBe(true)
    expect(isRuleComplete({ id: 'x', field: 'city', operator: 'in', value: [] })).toBe(false)
  })

  it('reads the query in words', () => {
    expect(queryToText(query, qFields, zhTW.query)).toBe('縣市 是其中之一 台北、高雄 且 (年齡 介於 30 – 40 或 VIP 是)')
  })

  it('edits the tree immutably', () => {
    const added = appendNode(query, 'g', { id: 'd', field: 'name', operator: 'contains', value: 'x' })
    expect(countRules(added)).toBe(4)
    expect(countRules(query)).toBe(3)
    const removed = replaceNode(added, 'g', null)
    expect(countRules(removed)).toBe(1)
    expect(replaceNode(query, 'nope', null)).toBe(query)
    expect(queryDepth(query)).toBe(2)
  })

  it('field and operator changes keep or reset values sensibly', () => {
    const rule = { id: 'r', field: 'age', operator: 'between' as const, value: [1, 2] }
    expect(changeRuleField(rule, qFields, 'name')).toMatchObject({ field: 'name', operator: 'contains', value: '' })
    expect(changeRuleOperator(rule, 'gt')).toMatchObject({ operator: 'gt', value: '' })
    expect(changeRuleOperator({ ...rule, operator: 'gt', value: 5 }, 'lt')).toMatchObject({ value: 5 })
    expect(operatorArity('in')).toBe('list')
    expect(createRule(qFields, 'vip')).toMatchObject({ field: 'vip', operator: 'isTrue', value: undefined })
    expect(createGroup(qFields).rules).toHaveLength(1)
  })
})

describe('MlFilterBar', () => {
  it('renders a control per field and folds the rest', async () => {
    wrapper = mount(MlFilterBar, { props: { fields, collapse: 2 } })
    expect(wrapper.findAll('.ml-filter__item')).toHaveLength(2)
    const more = wrapper.find('.ml-filter__more')
    expect(more.text()).toContain('更多篩選（4）')
    await more.trigger('click')
    expect(wrapper.findAll('.ml-filter__item')).toHaveLength(6)
    expect(more.attributes('aria-expanded')).toBe('true')
    expect(wrapper.attributes('role')).toBe('search')
  })

  it('updates the model, searches on submit, chips clear one filter', async () => {
    wrapper = mount(MlFilterBar, { props: { fields, modelValue: {}, 'onUpdate:modelValue': (v: object) => wrapper!.setProps({ modelValue: v }) } })
    await wrapper.find('.ml-filter__item--text input').setValue('獅')
    await wrapper.find('.ml-filter__item--select select').setValue('paid')
    expect(prop('modelValue')).toEqual({ q: '獅', status: 'paid' })
    expect(wrapper.emitted('search')).toBeUndefined()
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('search')?.[0]).toEqual([{ q: '獅', status: 'paid' }])
    expect(wrapper.findAll('.ml-filter__chip').map((c) => c.text())).toEqual(['關鍵字獅', '狀態已付款'])
    await wrapper.find('[aria-label="清除「狀態」"]').trigger('click')
    expect(prop('modelValue')).toEqual({ q: '獅' })
    expect(wrapper.emitted('search')?.at(-1)).toEqual([{ q: '獅' }])
    // Choosing "全部" clears the field.
    await wrapper.find('.ml-filter__item--select select').setValue('')
    expect(prop('modelValue')).toEqual({ q: '獅' })
  })

  it('number range, reset and immediate mode', async () => {
    wrapper = mount(MlFilterBar, { props: { fields, immediate: true, modelValue: {}, 'onUpdate:modelValue': (v: object) => wrapper!.setProps({ modelValue: v }) } })
    const [min, max] = wrapper.findAll('.ml-filter__range input')
    await min.setValue('100')
    await max.setValue('500')
    expect(prop('modelValue')).toEqual({ amount: [100, 500] })
    expect(wrapper.emitted('search')).toHaveLength(2)
    expect(wrapper.find('.ml-filter__chip').text()).toContain('100 – 500')
    await wrapper.findAll('button').find((b) => b.text() === '重設')!.trigger('click')
    expect(prop('modelValue')).toEqual({})
    expect(wrapper.emitted('reset')).toHaveLength(1)
  })

  it('custom field slots', () => {
    wrapper = mount(MlFilterBar, {
      props: { fields: fields.slice(0, 1), chips: false },
      slots: { 'field-q': '<template #field-q="{ field }"><span class="mine">{{ field.label }}</span></template>' },
    })
    expect(wrapper.find('.mine').text()).toBe('關鍵字')
    expect(wrapper.find('.ml-filter__item--text input').exists()).toBe(false)
  })
})

describe('MlQueryBuilder', () => {
  it('renders nested groups with their combinators', () => {
    wrapper = mount(MlQueryBuilder, { props: { fields: qFields, modelValue: query, showText: true } })
    expect(wrapper.findAll('.ml-query__group')).toHaveLength(2)
    expect(wrapper.findAll('.ml-query__rule')).toHaveLength(3)
    const toggles = wrapper.findAll('.ml-query__toggle--on').map((t) => t.text())
    expect(toggles).toEqual(['且', '或'])
    expect(wrapper.find('.ml-query__text').text()).toBe('縣市 是其中之一 台北、高雄 且 (年齡 介於 30 – 40 或 VIP 是)')
    // between shows two inputs; isTrue shows none
    expect(wrapper.findAll('.ml-query__pair input')).toHaveLength(2)
  })

  it('adds, edits and removes rules and groups', async () => {
    wrapper = mount(MlQueryBuilder, {
      props: { fields: qFields, modelValue: { id: 'root', combinator: 'and', rules: [] }, 'onUpdate:modelValue': (v: MlQueryGroup) => wrapper!.setProps({ modelValue: v }) },
    })
    expect(wrapper.find('.ml-query__empty').exists()).toBe(true)
    const root = () => prop('modelValue') as MlQueryGroup
    await wrapper.findAll('.ml-query__add')[0].trigger('click')
    expect(root().rules).toHaveLength(1)
    await wrapper.find('.ml-query__field select').setValue('age')
    expect(root().rules[0]).toMatchObject({ field: 'age', operator: 'eq' })
    await wrapper.find('.ml-query__operator select').setValue('gt')
    const input = wrapper.find('.ml-query__value input')
    await input.setValue('18')
    await input.trigger('change')
    expect(root().rules[0]).toMatchObject({ operator: 'gt', value: 18 })
    await wrapper.findAll('.ml-query__toggle')[1].trigger('click')
    expect(root().combinator).toBe('or')
    await wrapper.findAll('.ml-query__add')[1].trigger('click')
    expect(countRules(root())).toBe(2)
    await nextTick()
    await wrapper.find('[aria-label="移除群組"]').trigger('click')
    expect(countRules(root())).toBe(1)
    await wrapper.find('[aria-label="移除條件"]').trigger('click')
    expect(root().rules).toHaveLength(0)
  })

  it('max depth hides "add group"; disabled locks everything', () => {
    wrapper = mount(MlQueryBuilder, { props: { fields: qFields, modelValue: query, maxDepth: 2 } })
    expect(wrapper.findAll('.ml-query__add').filter((b) => b.text() === '新增群組')).toHaveLength(1)
    wrapper.unmount()
    wrapper = mount(MlQueryBuilder, { props: { fields: qFields, modelValue: query, disabled: true } })
    expect(wrapper.findAll('button').every((b) => b.attributes('disabled') !== undefined)).toBe(true)
  })
})
