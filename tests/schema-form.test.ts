// MlSchemaForm, MlWizard and the schema helpers.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, ref } from 'vue'
import {
  MlSchemaForm,
  MlWizard,
  applySchemaDefaults,
  schemaDefaults,
  schemaRules,
  setSchemaValue,
  stripHiddenFields,
  twRules,
  validateValue,
  visibleSchemaFields,
  type MlSchemaField,
  type MlSchemaModel,
  type MlWizardStep,
} from '../src'
import { canJumpToStep, schemaControlProps, schemaFieldRules, schemaSpan, wizardCheckResult } from '../src/components/schema-form'

let wrapper: VueWrapper | undefined
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
})

const schema: MlSchemaField[] = [
  { field: 'name', label: '姓名', required: true },
  { field: 'id', label: '身分證字號', rules: [twRules.nationalId()] },
  { field: 'kind', label: '類型', type: 'select', options: [{ value: 'a', label: 'A' }], default: 'a' },
  { field: 'vip', label: 'VIP', type: 'switch' },
  { field: 'note', label: '備註', type: 'textarea', visible: (m) => m.vip === true },
  { field: 'contact.phone', label: '手機', type: 'mask', props: { preset: 'mobile' } },
]

describe('schema helpers', () => {
  it('fills defaults without touching what is there', () => {
    expect(schemaDefaults(schema)).toEqual({ name: '', id: '', kind: 'a', vip: false, note: '', contact: { phone: '' } })
    const model = { name: 'Leo', kind: 'a', vip: true, id: '', note: '', contact: { phone: '0912' } }
    expect(applySchemaDefaults(schema, model)).toBe(model)
    expect(applySchemaDefaults([{ field: 'tags', type: 'combobox', props: { multiple: true } }], {})).toEqual({ tags: [] })
    expect(applySchemaDefaults([{ field: 'list', default: () => [1] }], {})).toEqual({ list: [1] })
  })

  it('sets nested paths immutably', () => {
    const model = { a: { b: 1, c: 2 } }
    const next = setSchemaValue(model, 'a.b', 9)
    expect(next).toEqual({ a: { b: 9, c: 2 } })
    expect(model.a.b).toBe(1)
  })

  it('works out visibility and strips hidden values', () => {
    expect(visibleSchemaFields(schema, { vip: false }).map((f) => f.field)).not.toContain('note')
    expect(visibleSchemaFields(schema, { vip: true }).map((f) => f.field)).toContain('note')
    expect(visibleSchemaFields([{ field: 'x', hidden: true }], {})).toEqual([])
    expect(stripHiddenFields(schema, { name: 'Leo', vip: false, note: 'x' })).toEqual({ name: 'Leo', vip: false })
    expect(stripHiddenFields([{ field: 'a.b', hidden: true }], { a: { b: 1, c: 2 } })).toEqual({ a: { c: 2 } })
  })

  it('builds rules, with twRules and address completeness', async () => {
    expect(schemaRules(schema)).toHaveProperty('name')
    expect(schemaRules(schema)).not.toHaveProperty('kind')
    const id = schemaFieldRules(schema[1])
    expect(await validateValue('A123456788', id)).toBe('身分證字號格式不正確')
    expect(await validateValue('A123456789', id)).toBeUndefined()
    const address = schemaFieldRules({ field: 'addr', type: 'address', required: true })
    expect(await validateValue({ county: '臺北市', district: '', road: '', number: '' }, address)).toBe('此欄位為必填')
    expect(await validateValue({ county: '臺北市', district: '中正區', road: '重慶南路', number: '1' }, address)).toBeUndefined()
  })

  it('spans, control props and wizard bookkeeping', () => {
    expect(schemaSpan({ field: 'a', span: 'full' }, 3)).toBe(3)
    expect(schemaSpan({ field: 'a', span: 5 }, 2)).toBe(2)
    expect(schemaSpan({ field: 'a' }, 2)).toBe(1)
    expect(schemaControlProps(schema[2], { size: 'sm' })).toEqual({ label: '類型', options: schema[2].options, size: 'sm' })
    expect(schemaControlProps(schema[3], { disabled: true })).toEqual({ disabled: true })
    expect([0, 1, 2, 3].map((i) => canJumpToStep(i, 1, 2))).toEqual([true, false, true, false])
    expect(canJumpToStep(3, 1, 1, false)).toBe(true)
    expect(wizardCheckResult('no')).toEqual({ ok: false, message: 'no' })
    expect(wizardCheckResult(undefined)).toEqual({ ok: true })
    expect(wizardCheckResult(false)).toEqual({ ok: false })
  })
})

describe('MlSchemaForm', () => {
  it('renders the schema, hands defaults to v-model and validates on submit', async () => {
    const model = ref<MlSchemaModel>({})
    const onSubmit = vi.fn()
    wrapper = mount(
      defineComponent(() => () =>
        h(MlSchemaForm, {
          schema,
          columns: 2,
          modelValue: model.value,
          'onUpdate:modelValue': (v: MlSchemaModel) => (model.value = v),
          onSubmit,
        }),
      ),
      { attachTo: document.body },
    )
    await flushPromises()
    expect(model.value).toMatchObject({ name: '', kind: 'a', vip: false, contact: { phone: '' } })
    expect(wrapper.findAll('.ml-schema-form__item')).toHaveLength(5)
    expect(wrapper.find('.ml-field__required').exists()).toBe(true)

    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(onSubmit).not.toHaveBeenCalled()
    expect(wrapper.find('[data-prop="name"] .ml-field__error').text()).toContain('必填')
    expect(document.activeElement).toBe(wrapper.find('[data-prop="name"] input').element)

    await wrapper.find('[data-prop="name"] input').setValue('碼力獅')
    await wrapper.find('[data-prop="id"] input').setValue('A123456788')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('[data-prop="id"] .ml-field__error').text()).toContain('身分證字號')

    await wrapper.find('[data-prop="id"] input').setValue('A123456789')
    await wrapper.find('[role="switch"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-prop="note"]').exists()).toBe(true)
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ name: '碼力獅', id: 'A123456789', vip: true }))
  })

  it('resetFields() restores the first values and clears errors; disabled fields skip validation', async () => {
    const form = ref<InstanceType<typeof MlSchemaForm>>()
    const model = ref<MlSchemaModel>({ name: 'Leo' })
    const onReset = vi.fn()
    wrapper = mount(
      defineComponent(() => () =>
        h(MlSchemaForm, {
          ref: form,
          schema: [...schema, { field: 'locked', label: '鎖住', required: true, disabled: true }],
          modelValue: model.value,
          'onUpdate:modelValue': (v: MlSchemaModel) => (model.value = v),
          onReset,
        }),
      ),
      { attachTo: document.body },
    )
    await flushPromises()
    await wrapper.find('[data-prop="name"] input').setValue('')
    expect(await form.value!.validate()).toBe(false)
    await flushPromises()
    expect(wrapper.find('[data-prop="locked"] .ml-field__error').exists()).toBe(false)
    expect(wrapper.find('[data-prop="locked"] input').attributes('disabled')).toBeDefined()

    await wrapper.find('.ml-schema-form__actions .ml-btn--ghost').trigger('click')
    await flushPromises()
    expect(model.value.name).toBe('Leo')
    expect(onReset).toHaveBeenCalled()
    expect(wrapper.find('.ml-field__error').exists()).toBe(false)
  })

  it('takes custom components and field slots', async () => {
    const Custom = defineComponent({
      props: { modelValue: String, label: String },
      emits: ['update:modelValue'],
      setup: (props, { emit }) => () => h('button', { type: 'button', class: 'custom', onClick: () => emit('update:modelValue', 'clicked') }, props.label),
    })
    const model = ref<MlSchemaModel>({})
    wrapper = mount(
      defineComponent(() => () =>
        h(
          MlSchemaForm,
          {
            schema: [
              { field: 'c', label: '自訂', component: Custom },
              { field: 's', label: '插槽' },
            ],
            actions: false,
            modelValue: model.value,
            'onUpdate:modelValue': (v: MlSchemaModel) => (model.value = v),
          },
          { 'field-s': ({ update }: { update: (v: unknown) => void }) => h('button', { type: 'button', class: 'slot', onClick: () => update('from slot') }) },
        ),
      ),
    )
    await wrapper.find('.custom').trigger('click')
    await wrapper.find('.slot').trigger('click')
    expect(model.value).toEqual({ c: 'clicked', s: 'from slot' })
    expect(wrapper.find('.custom').text()).toBe('自訂')
    expect(wrapper.find('.ml-schema-form__actions').exists()).toBe(false)
  })
})

describe('MlSchemaForm address field', () => {
  it('shows a required address error once, for the whole address', async () => {
    wrapper = mount(MlSchemaForm, { props: { schema: [{ field: 'addr', label: '地址', type: 'address', required: true }] }, attachTo: document.body })
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.findAll('[data-prop="addr"] .ml-field__error')).toHaveLength(1)
    expect(wrapper.find('[data-prop="addr"] legend .ml-field__required').exists()).toBe(true)
  })
})

describe('MlWizard', () => {
  const steps: MlWizardStep[] = [
    { key: 'who', title: '身分', schema: [{ field: 'id', label: '身分證字號', required: true, rules: [twRules.nationalId()] }] },
    { key: 'contact', title: '聯絡', schema: [{ field: 'mobile', label: '手機', required: true, rules: [twRules.mobile()] }] },
    { key: 'done', title: '確認' },
  ]

  function mountWizard(extra: Record<string, unknown> = {}) {
    const model = ref<MlSchemaModel>({})
    const current = ref(0)
    const onChange = vi.fn()
    const onSubmit = vi.fn()
    const onFinish = vi.fn()
    wrapper = mount(
      defineComponent(() => () =>
        h(
          MlWizard,
          {
            steps,
            modelValue: model.value,
            'onUpdate:modelValue': (v: MlSchemaModel) => (model.value = v),
            current: current.value,
            'onUpdate:current': (v: number) => (current.value = v),
            onChange,
            onSubmit,
            onFinish,
            ...extra,
          },
          { 'step-done': ({ model: m }: { model: MlSchemaModel }) => h('p', { class: 'summary' }, String(m.id)) },
        ),
      ),
      { attachTo: document.body },
    )
    return { model, current, onChange, onSubmit, onFinish }
  }
  const nextBtn = () => wrapper!.find('.ml-wizard__actions button[type="submit"]')
  const headerBtns = () => wrapper!.findAll('.ml-wizard__step')

  it('validates only the current step, never on the way back, and submits from the last one', async () => {
    const { model, current, onChange, onSubmit, onFinish } = mountWizard()
    await flushPromises()
    expect(wrapper!.find('.ml-steps__item--current').text()).toContain('身分')
    expect(headerBtns()[1].attributes('disabled')).toBeDefined()

    await nextBtn().trigger('click')
    await wrapper!.find('form').trigger('submit')
    await flushPromises()
    expect(current.value).toBe(0)
    expect(wrapper!.find('[data-prop="id"] .ml-field__error').exists()).toBe(true)

    await wrapper!.find('[data-prop="id"] input').setValue('A123456789')
    await wrapper!.find('form').trigger('submit')
    await flushPromises()
    expect(current.value).toBe(1)
    expect(onChange).toHaveBeenLastCalledWith(1, 0)
    // The new step starts clean.
    expect(wrapper!.find('.ml-field__error').exists()).toBe(false)
    expect(document.activeElement?.classList.contains('ml-wizard__panel')).toBe(true)

    // Back never validates; forward to a reached step is open from the header.
    await wrapper!.find('.ml-wizard__actions .ml-btn--ghost').trigger('click')
    await flushPromises()
    expect(current.value).toBe(0)
    expect(headerBtns()[1].attributes('disabled')).toBeUndefined()
    expect(headerBtns()[2].attributes('disabled')).toBeDefined()
    await headerBtns()[1].trigger('click')
    await flushPromises()
    expect(current.value).toBe(1)

    await wrapper!.find('[data-prop="mobile"] input').setValue('0912345678')
    await wrapper!.find('form').trigger('submit')
    await flushPromises()
    expect(current.value).toBe(2)
    expect(wrapper!.find('.summary').text()).toBe('A123456789')
    expect(nextBtn().text()).toBe('送出')
    expect(onSubmit).not.toHaveBeenCalled()

    await wrapper!.find('form').trigger('submit')
    await flushPromises()
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ id: 'A123456789', mobile: '0912345678' }))
    expect(onFinish).toHaveBeenCalled()
    expect(model.value.mobile).toBe('0912345678')
  })

  it('beforeNext, step validate messages and async action', async () => {
    let release!: (v: unknown) => void
    const beforeNext = vi.fn(() => false)
    const action = vi.fn(() => new Promise((r) => (release = r)))
    const { onFinish } = mountWizard({ beforeNext, action, current: 2 })
    await flushPromises()
    await wrapper!.find('form').trigger('submit')
    await flushPromises()
    expect(beforeNext).toHaveBeenCalledWith(2, expect.any(Object))
    expect(action).not.toHaveBeenCalled()

    beforeNext.mockReturnValue(true as never)
    await wrapper!.find('form').trigger('submit')
    await flushPromises()
    expect(action).toHaveBeenCalled()
    expect(nextBtn().classes()).toContain('ml-btn--loading')
    release(true)
    await flushPromises()
    expect(onFinish).toHaveBeenCalled()
    expect(wrapper!.findAll('.ml-steps__item--done')).toHaveLength(3)
  })

  it('shows a step validate() message', async () => {
    wrapper = mount(MlWizard, {
      props: { steps: [{ title: 'A', validate: () => '請至少選一項' }, { title: 'B' }] },
      attachTo: document.body,
    })
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('.ml-wizard__error').text()).toContain('請至少選一項')
    expect(wrapper.find('[aria-current="step"]').text()).toContain('A')
  })
})
