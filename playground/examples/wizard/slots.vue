<script setup lang="ts">
import { reactive } from 'vue'
import { toast, type MlFormRules, type MlSchemaModel, type MlWizardStep } from '@malilion/ui'

const steps: MlWizardStep[] = [
  { key: 'plan', title: '選方案' },
  {
    key: 'addons',
    title: '加購',
    // A check of the whole step; a string is shown under the fields.
    validate: (m) => ((m.addons as string[]).length <= 2 ? true : '加購最多選兩項'),
  },
  { key: 'contact', title: '聯絡方式' },
]

const rules: MlFormRules = {
  plan: { required: true, message: '請選一個方案' },
  email: [{ required: true }, { type: 'email' }],
}

// Hand-written steps can bind straight into a reactive object, like MlForm.
const order = reactive({ plan: '', addons: [] as string[], email: '' })

// Runs after the fields pass; return false to stay. Here: a pretend server check.
async function beforeNext(step: number, model: MlSchemaModel) {
  if (step !== 2) return true
  await new Promise((r) => setTimeout(r, 400))
  if (String(model.email).endsWith('@example.com')) {
    toast({ tone: 'warning', title: '這個 Email 不能用', message: '請換一個信箱' })
    return false
  }
  return true
}

function onFinish(model: MlSchemaModel) {
  toast({ tone: 'success', title: '訂單成立', message: `方案：${model.plan}` })
}
</script>

<template>
  <MlWizard :model-value="order" :steps="steps" :rules="rules" :before-next="beforeNext" @finish="onFinish">
    <template #step-plan>
      <MlFormItem prop="plan">
        <MlRadioGroup
          v-model="order.plan"
          label="方案"
          variant="card"
          :options="[
            { value: 'cub', label: '幼獅方案', hint: 'NT$ 99／月' },
            { value: 'lion', label: '雄獅方案', hint: 'NT$ 299／月' },
          ]"
        />
      </MlFormItem>
    </template>
    <template #step-addons>
      <MlCheckboxGroup
        v-model="order.addons"
        label="加購項目"
        :options="[
          { value: 'domain', label: '自訂網域' },
          { value: 'backup', label: '每日備份' },
          { value: 'support', label: '專人客服' },
        ]"
      />
    </template>
    <template #step-contact>
      <MlFormItem prop="email">
        <MlInput v-model="order.email" label="Email" type="email" placeholder="試試 lion@example.com" />
      </MlFormItem>
    </template>
  </MlWizard>
</template>
