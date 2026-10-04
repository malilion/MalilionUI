<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { formatTaiwanAddress, toast, type MlFormRules, type MlTaiwanRegionValue } from '@malilion/ui'

const model = reactive({
  region: null as MlTaiwanRegionValue | null,
  road: '',
})

const rules: MlFormRules = {
  region: { required: true, message: '請選擇縣市與鄉鎮市區' },
  road: [{ required: true, message: '請填寫路名與門牌' }, { max: 60 }],
}

const full = computed(() =>
  model.region ? formatTaiwanAddress(model.region, { address: model.road }) : '',
)

const form = ref<{ clearValidation: () => void }>()

function onSubmit() {
  toast({ tone: 'success', title: '地址已儲存', message: full.value })
}

function reset() {
  Object.assign(model, { region: null, road: '' })
  form.value?.clearValidation()
}
</script>

<template>
  <MlForm ref="form" :model="model" :rules="rules" class="demo" @submit="onSubmit">
    <div class="address">
      <MlInput
        class="zip"
        index="01"
        label="郵遞區號"
        :model-value="model.region?.zip ?? ''"
        readonly
        placeholder="—"
      />
      <MlFormItem prop="region" class="region">
        <MlTaiwanRegion v-model="model.region" index="02" label="縣市／鄉鎮市區" />
      </MlFormItem>
    </div>
    <MlFormItem prop="road">
      <MlInput v-model="model.road" index="03" label="路名與門牌" placeholder="重慶南路一段 122 號" autocomplete="address-line1" />
    </MlFormItem>
    <p class="preview">{{ full || '完整地址會顯示在這裡' }}</p>
    <div class="actions">
      <MlButton variant="ghost" type="button" @click="reset">重設</MlButton>
      <MlButton type="submit" stamp>儲存地址</MlButton>
    </div>
  </MlForm>
</template>

<style scoped>
.demo {
  max-width: 560px;
}

.address {
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 12px;
  align-items: start;
}

@media (max-width: 520px) {
  .address {
    grid-template-columns: 1fr;
  }
}

.preview {
  margin: 0;
  padding: 10px 14px;
  background: var(--ml-surface-inset);
  box-shadow: inset 0 0 0 1px var(--ml-line-steel);
  font-size: var(--ml-text-sm);
  color: var(--ml-text-muted);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
