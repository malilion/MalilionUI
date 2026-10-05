// Markup parity for MlSchemaForm ↔ <SchemaForm> and MlWizard ↔ <Wizard>.
import { describe, expect, it } from 'vitest'
import { createSSRApp, h, type Component } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { renderToStaticMarkup } from 'react-dom/server'
import * as V from '../../src'
import MlConfigProvider from '../../src/components/MlConfigProvider.vue'
import * as R from '../../src/react'
import { ConfigProvider } from '../../src/react/locale'
import { en } from '../../src/locale-data'
import { react, signature, vue } from './parity-utils'

const options = [
  { value: 'a', label: '甲' },
  { value: 'b', label: '乙', hint: '第二個' },
]

const every: V.MlSchemaField[] = [
  { field: 'name', label: '姓名', required: true, placeholder: '王小明', help: '真實姓名' },
  { field: 'bio', label: '簡介', type: 'textarea', span: 'full' },
  { field: 'age', label: '年齡', type: 'number', props: { min: 0 } },
  { field: 'salary', label: '月薪', type: 'amount', props: { currency: 'NT$' } },
  { field: 'phone', label: '手機', type: 'mask', props: { preset: 'mobile' }, required: true },
  { field: 'kind', label: '類型', type: 'select', options, placeholder: '請選擇' },
  { field: 'tags', label: '標籤', type: 'combobox', options, props: { multiple: true } },
  { field: 'plan', label: '方案', type: 'radio', options, help: '可隨時更換', required: true },
  { field: 'agree', label: '同意條款', type: 'checkbox', help: '必讀' },
  { field: 'skills', label: '技能', type: 'checkbox-group', options },
  { field: 'vip', label: 'VIP', type: 'switch', help: '開啟後有專人服務' },
  { field: 'birthday', label: '生日', type: 'date' },
  { field: 'region', label: '地區', type: 'region' },
  { field: 'address', label: '地址', type: 'address', span: 2 },
  { field: 'hidden', label: '隱藏', hidden: true },
  { field: 'vipNote', label: 'VIP 備註', visible: (m) => m.vip === true },
  { field: 'locked', label: '鎖定', disabled: true, default: '不能改' },
]

const filled = { name: '碼力獅', kind: 'b', tags: ['a'], plan: 'a', agree: true, skills: ['b'], vip: true, age: 3, salary: 52000 }

const steps: V.MlWizardStep[] = [
  { key: 'who', title: '身分', description: '基本資料', schema: [{ field: 'id', label: '身分證字號', required: true }] },
  { key: 'contact', title: '聯絡', schema: [{ field: 'mobile', label: '手機', type: 'mask', props: { preset: 'mobile' } }] },
  { key: 'done', title: '確認' },
]

async function vueSlots(component: Component, props: Record<string, unknown>, slots: Record<string, () => unknown>) {
  return signature(await renderToString(createSSRApp({ render: () => h(component, props, slots) })))
}

const cases: [string, () => Promise<string>, () => string][] = [
  ['SchemaForm: every field type', () => vue(V.MlSchemaForm, { schema: every, columns: 2 }), () => react(<R.SchemaForm schema={every} columns={2} />)],
  ['SchemaForm: filled, conditional field shown', () => vue(V.MlSchemaForm, { schema: every, modelValue: filled }), () => react(<R.SchemaForm schema={every} value={filled} />)],
  [
    'SchemaForm: label left, small, disabled, loading, texts',
    () => vue(V.MlSchemaForm, { schema: every.slice(0, 6), labelPosition: 'left', labelWidth: '6em', size: 'sm', disabled: true, loading: true, submitText: '儲存', resetText: '清除' }),
    () => react(<R.SchemaForm schema={every.slice(0, 6)} labelPosition="left" labelWidth="6em" size="sm" disabled loading submitText="儲存" resetText="清除" />),
  ],
  ['SchemaForm: no actions', () => vue(V.MlSchemaForm, { schema: every.slice(0, 2), actions: false }), () => react(<R.SchemaForm schema={every.slice(0, 2)} actions={false} />)],
  [
    'SchemaForm: field slot, extra content and custom actions',
    () =>
      vueSlots(V.MlSchemaForm, { schema: every.slice(0, 2) }, {
        'field-name': () => h('em', 'custom'),
        default: () => h('p', '附註'),
        actions: () => h('span', '自己的按鈕'),
      }),
    () =>
      react(
        <R.SchemaForm schema={every.slice(0, 2)} renderField={(f) => (f.field === 'name' ? <em>custom</em> : undefined)} renderActions={() => <span>自己的按鈕</span>}>
          <p>附註</p>
        </R.SchemaForm>,
      ),
  ],
  ['Wizard: first step', () => vue(V.MlWizard, { steps }), () => react(<R.Wizard steps={steps} />)],
  ['Wizard: middle step', () => vue(V.MlWizard, { steps, current: 1, linear: false }), () => react(<R.Wizard steps={steps} current={1} linear={false} />)],
  [
    'Wizard: last step with slot content, custom texts, loading',
    () =>
      vueSlots(V.MlWizard, { steps, current: 2, loading: true, submitText: '完成', prevText: '返回' }, {
        'step-done': () => h('p', '確認內容'),
        default: () => h('small', '共用'),
      }),
    () =>
      react(
        <R.Wizard steps={steps} current={2} loading submitText="完成" prevText="返回" renderStep={({ step }) => (step.key === 'done' ? <p>確認內容</p> : undefined)}>
          <small>共用</small>
        </R.Wizard>,
      ),
  ],
  [
    'English locale',
    async () =>
      signature(
        await renderToString(
          createSSRApp({
            render: () => h(MlConfigProvider, { locale: en }, () => [h(V.MlWizard, { steps, current: 1 }), h(V.MlSchemaForm, { schema: every.slice(0, 1) })]),
          }),
        ),
      ),
    () =>
      signature(
        renderToStaticMarkup(
          <ConfigProvider locale={en}>
            <R.Wizard steps={steps} current={1} />
            <R.SchemaForm schema={every.slice(0, 1)} />
          </ConfigProvider>,
        ),
      ),
  ],
]

describe('React ↔ Vue markup parity: SchemaForm, Wizard', () => {
  for (const [name, fromVue, fromReact] of cases) {
    it(name, async () => {
      expect(fromReact()).toBe(await fromVue())
    })
  }
})
