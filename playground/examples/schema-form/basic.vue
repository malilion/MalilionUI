<script setup lang="ts">
import { ref } from 'vue'
import { toast, twRules, type MlSchemaField, type MlSchemaModel } from '@malilion/ui'

const schema: MlSchemaField[] = [
  { field: 'name', label: '姓名', required: true, placeholder: '王小明' },
  { field: 'nationalId', label: '身分證字號', required: true, rules: [twRules.nationalId()], placeholder: 'A123456789' },
  { field: 'mobile', label: '手機', type: 'mask', props: { preset: 'mobile' }, required: true, rules: [twRules.mobile()] },
  { field: 'email', label: 'Email', props: { type: 'email' }, rules: [{ type: 'email' }], help: '選填，收電子發票用' },
  {
    field: 'level',
    label: '會員等級',
    type: 'radio',
    options: [
      { value: 'cub', label: '幼獅' },
      { value: 'lion', label: '雄獅' },
      { value: 'king', label: '獅王' },
    ],
    default: 'cub',
  },
  { field: 'birthday', label: '生日', type: 'date', props: { calendar: 'roc' } },
  { field: 'address', label: '通訊地址', type: 'address', span: 'full', required: true },
  { field: 'agree', label: '我同意會員條款', type: 'checkbox', span: 'full', rules: { required: true, message: '請先同意會員條款' } },
]

const member = ref<MlSchemaModel>({})

function onSubmit(model: MlSchemaModel) {
  toast({ tone: 'success', title: '已建立會員', message: `歡迎，${model.name}！` })
}
</script>

<template>
  <MlSchemaForm v-model="member" :schema="schema" :columns="2" submit-text="建立會員" @submit="onSubmit" />
</template>
