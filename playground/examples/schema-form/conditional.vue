<script setup lang="ts">
import { computed, ref } from 'vue'
import { stripHiddenFields, twRules, type MlSchemaField, type MlSchemaModel } from '@malilion/ui'

const schema: MlSchemaField[] = [
  { field: 'title', label: '商品名稱', required: true },
  {
    field: 'category',
    label: '分類',
    type: 'select',
    placeholder: '請選擇',
    required: true,
    options: [
      { value: 'food', label: '食品' },
      { value: 'goods', label: '周邊' },
    ],
  },
  { field: 'price', label: '售價', type: 'amount', props: { currency: 'NT$' }, required: true },
  { field: 'stock', label: '庫存', type: 'number', props: { min: 0 } },
  { field: 'expiry', label: '有效期限', type: 'date', visible: (m) => m.category === 'food', required: true },
  { field: 'invoice', label: '開立公司發票', type: 'switch' },
  { field: 'businessId', label: '統一編號', visible: (m) => m.invoice === true, required: true, rules: [twRules.businessId()] },
  { field: 'sku', label: 'SKU', disabled: true, help: '儲存後自動產生' },
  { field: 'color', label: '主色' },
]

const product = ref<MlSchemaModel>({ sku: 'ML-0001' })
const payload = computed(() => JSON.stringify(stripHiddenFields(schema, product.value)))
</script>

<template>
  <div class="stack">
    <MlSchemaForm v-model="product" :schema="schema" label-position="left" label-width="7em" size="sm" submit-text="儲存">
      <template #field-color="{ value, update, field }">
        <MlField :label="field.label">
          <MlSegmented
            :model-value="(value as string) || 'gold'"
            :label="field.label"
            size="sm"
            :options="[
              { value: 'gold', label: '金' },
              { value: 'steel', label: '鋼' },
              { value: 'tech', label: '藍' },
            ]"
            @update:model-value="update"
          />
        </MlField>
      </template>
    </MlSchemaForm>
    <code class="payload">{{ payload }}</code>
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 12px;
  max-width: 560px;
}

.payload {
  color: var(--ml-text-dim);
  font-size: 0.75rem;
  overflow-wrap: anywhere;
}
</style>
