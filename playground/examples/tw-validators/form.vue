<script setup lang="ts">
import { reactive, ref } from 'vue'
import {
  formatTwMobile,
  formatTwPhone,
  normalizeTwBusinessId,
  normalizeTwCarrier,
  normalizeTwId,
  toast,
  twRules,
  type MlFormRules,
} from '@malilion/ui'

const model = reactive({
  id: '',
  ubn: '',
  mobile: '',
  tel: '',
  carrier: '',
})

// 空值一律通過，必填另外加 { required: true }；錯誤訊息跟著 MlConfigProvider 的語系。
const rules: MlFormRules = {
  id: [{ required: true }, twRules.personalId()],
  ubn: twRules.businessId(),
  mobile: [{ required: true }, twRules.mobile()],
  tel: twRules.landline(),
  carrier: twRules.mobileBarcode(),
}

const form = ref<{ clearValidation: () => void }>()

// 失焦時整理成標準寫法；無效的輸入原樣留著，讓使用者看得到哪裡打錯。
const tidy = {
  id: () => (model.id = normalizeTwId(model.id)),
  ubn: () => (model.ubn = normalizeTwBusinessId(model.ubn)),
  mobile: () => (model.mobile = formatTwMobile(model.mobile)),
  tel: () => (model.tel = formatTwPhone(model.tel)),
  carrier: () => (model.carrier = normalizeTwCarrier(model.carrier)),
}

function onSubmit() {
  toast({ tone: 'success', title: '資料格式正確', message: `${model.id}・${model.mobile}` })
}

function fillSample() {
  // 範例值：A123456789 為教科書常見的檢查碼範例，04595257 取自財政部說明文件。
  Object.assign(model, { id: 'A123456789', ubn: '04595257', mobile: '0912-345-678', tel: '(02) 2345-6789 #123', carrier: '/ABC+123' })
}

function reset() {
  Object.assign(model, { id: '', ubn: '', mobile: '', tel: '', carrier: '' })
  form.value?.clearValidation()
}
</script>

<template>
  <MlForm ref="form" :model="model" :rules="rules" class="demo" @submit="onSubmit">
    <MlFormItem prop="id">
      <MlInput v-model="model.id" index="01" label="身分證字號／居留證號" placeholder="A123456789" autocomplete="off" @blur="tidy.id" />
    </MlFormItem>
    <MlFormItem prop="ubn">
      <MlInput v-model="model.ubn" index="02" label="統一編號" hint="選填，8 碼；採 2023 年起「可被 5 整除」的新制" inputmode="numeric" @blur="tidy.ubn" />
    </MlFormItem>
    <div class="pair">
      <MlFormItem prop="mobile">
        <MlInput v-model="model.mobile" index="03" label="手機" placeholder="0912-345-678" type="tel" autocomplete="tel-national" @blur="tidy.mobile" />
      </MlFormItem>
      <MlFormItem prop="tel">
        <MlInput v-model="model.tel" index="04" label="市話" placeholder="(02) 2345-6789 #123" type="tel" hint="選填，可加分機" @blur="tidy.tel" />
      </MlFormItem>
    </div>
    <MlFormItem prop="carrier">
      <MlInput v-model="model.carrier" index="05" label="電子發票手機條碼" placeholder="/ABC+123" hint="選填，「/」加 7 碼" autocomplete="off" @blur="tidy.carrier" />
    </MlFormItem>
    <div class="actions">
      <MlButton variant="ghost" type="button" @click="reset">重設</MlButton>
      <MlButton variant="ghost" type="button" @click="fillSample">填入範例</MlButton>
      <MlButton type="submit" stamp>送出</MlButton>
    </div>
  </MlForm>
</template>

<style scoped>
.demo {
  max-width: 560px;
}

.pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  align-items: start;
}

@media (max-width: 520px) {
  .pair {
    grid-template-columns: 1fr;
  }
}

.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}
</style>
