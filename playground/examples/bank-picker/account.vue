<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { formatTwBank, getTwBank, toast, twBankCodeRule, twRules, validateValue, type MlFormRules } from '@malilion/ui'

const model = reactive({ bank: null as string | null, account: '' })

// The bank code goes through MlFormItem; the account has its own rule and error line.
const rules: MlFormRules = {
  bank: [{ required: true, message: '請選擇收款銀行' }, twBankCodeRule()],
}
const accountRules = [{ required: true, message: '請填寫帳號' }, twRules.bankAccount()]
const accountError = ref<string>()
const submitted = ref(false)

async function checkAccount() {
  accountError.value = await validateValue(model.account, accountRules)
  return !accountError.value
}
watch(
  () => model.account,
  () => submitted.value && checkAccount(),
)

const form = ref<{ clearValidation: () => void }>()

async function onSubmit() {
  submitted.value = true
  if (!(await checkAccount())) return
  const bank = getTwBank(model.bank!)!
  toast({ tone: 'success', title: '收款帳戶已儲存', message: `${formatTwBank(bank, { short: true })}・${model.account}` })
}

function onInvalid() {
  submitted.value = true
  checkAccount()
}

function reset() {
  Object.assign(model, { bank: null, account: '' })
  submitted.value = false
  accountError.value = undefined
  form.value?.clearValidation()
}
</script>

<template>
  <MlForm ref="form" :model="model" :rules="rules" class="demo" @submit="onSubmit" @invalid="onInvalid">
    <MlFormItem prop="bank">
      <MlBankPicker
        v-model:value="model.bank"
        v-model:account="model.account"
        with-account
        index="01"
        label="收款銀行"
        short
        :account-error="accountError"
      />
    </MlFormItem>
    <div class="actions">
      <MlButton variant="ghost" type="button" @click="reset">重設</MlButton>
      <MlButton type="submit" stamp>儲存</MlButton>
    </div>
  </MlForm>
</template>

<style scoped>
.demo {
  max-width: 620px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
