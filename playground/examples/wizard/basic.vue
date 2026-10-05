<script setup lang="ts">
import { ref } from 'vue'
import { formatTwAddress, twRules, type MlSchemaModel, type MlTaiwanAddressValue, type MlWizardStep } from '@malilion/ui'

const steps: MlWizardStep[] = [
  {
    key: 'identity',
    title: '身分驗證',
    description: '本人資料',
    schema: [
      { field: 'name', label: '姓名', required: true },
      { field: 'nationalId', label: '身分證字號', required: true, rules: [twRules.nationalId()], placeholder: 'A123456789' },
      { field: 'mobile', label: '手機', type: 'mask', props: { preset: 'mobile' }, required: true, rules: [twRules.mobile()], span: 'full' },
    ],
  },
  {
    key: 'shop',
    title: '商店設定',
    description: '收款與地址',
    schema: [
      { field: 'shop', label: '商店名稱', required: true },
      { field: 'businessId', label: '統一編號', rules: [twRules.businessId()], help: '個人賣家可留空' },
      { field: 'address', label: '營業地址', type: 'address', required: true, span: 'full', props: { preview: false } },
    ],
  },
  { key: 'confirm', title: '確認送出' },
]

const model = ref<MlSchemaModel>({})
const current = ref(0)

// Pretend to save; the 送出 button spins until this settles.
const save = () => new Promise((resolve) => setTimeout(resolve, 900))
</script>

<template>
  <MlWizard v-model="model" v-model:current="current" :steps="steps" :columns="2" :action="save">
    <template #step-confirm>
      <MlDescriptions
        :columns="1"
        horizontal
        :items="[
          { label: '姓名', value: String(model.name ?? '') },
          { label: '身分證字號', value: String(model.nationalId ?? '') },
          { label: '手機', value: String(model.mobile ?? '') },
          { label: '商店', value: String(model.shop ?? '') },
          { label: '地址', value: formatTwAddress(model.address as MlTaiwanAddressValue) },
        ]"
      />
    </template>
    <template #finish="{ reset }">
      <MlResult status="success" title="開店申請已送出" subtitle="審核結果會在 3 個工作天內以簡訊通知。">
        <template #actions>
          <MlButton variant="ghost" @click="reset">再填一份</MlButton>
        </template>
      </MlResult>
    </template>
  </MlWizard>
</template>
