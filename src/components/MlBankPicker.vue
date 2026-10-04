<script setup lang="ts">
import { computed, useId } from 'vue'
import MlCombobox from './MlCombobox.vue'
import MlField from './MlField.vue'
import MlIcon from './MlIcon.vue'
import { describedBy, useSplitAttrs } from '../composables'
import { useLocale } from '../locale'
import { getTwBank, normalizeTwBankAccount, type TwBank, type TwBankKind } from '../tw-banks'
import type { MlSize } from '../types'
import { BANK_ACCOUNT_MAX, bankAccountInput, bankFilter, bankLang, bankOptions, type BankLang } from './bank'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** Which institutions to offer. Default: banks, foreign bank branches, 信用合作社 and 中華郵政. */
    kinds?: TwBankKind[]
    /** Show the common short name (中國信託) instead of the registered one (中國信託商業銀行). */
    short?: boolean
    /** Names in Chinese or English. Default: follows the locale (zh-* → Chinese). */
    lang?: BankLang
    /** Add an account-number field (v-model:account, digits only). */
    withAccount?: boolean
    clearable?: boolean
    label?: string
    hint?: string
    error?: string
    index?: string
    size?: MlSize
    required?: boolean
    disabled?: boolean
    id?: string
    placeholder?: string
    noMatchText?: string
    /** `name` of the hidden input posting the bank code. */
    name?: string
    accountLabel?: string
    accountPlaceholder?: string
    /** Replaces the digit-count hint under the account field. */
    accountHint?: string
    accountError?: string
    /** `name` of the hidden input posting the account digits. */
    accountName?: string
    /** Most digits accepted. */
    accountMaxLength?: number
  }>(),
  { size: 'md', accountMaxLength: BANK_ACCOUNT_MAX },
)

const emit = defineEmits<{ change: [code: string | null, bank: TwBank | null] }>()
const model = defineModel<string | null>('value', { default: null })
const account = defineModel<string>('account', { default: '' })

const loc = useLocale()
const { rootAttrs, controlAttrs } = useSplitAttrs()
const autoId = useId()
const accountId = computed(() => (props.id ? `${props.id}-account` : `ml-bank-account-${autoId}`))
const lang = computed(() => bankLang(loc.value.name, props.lang))
const options = computed(() => bankOptions(props.kinds, lang.value, props.short))

function onPick(value: unknown) {
  const bank = typeof value === 'string' ? (getTwBank(value) ?? null) : null
  model.value = bank?.code ?? null
  emit('change', bank?.code ?? null, bank)
}

const digits = computed(() => normalizeTwBankAccount(account.value ?? ''))
const display = computed(() => bankAccountInput(digits.value, null, props.accountMaxLength).display)
const accountHintText = computed(() => props.accountHint ?? loc.value.bank.accountHint(digits.value.length))

function onAccountInput(event: Event) {
  const el = event.target as HTMLInputElement
  const next = bankAccountInput(el.value, el.selectionStart, props.accountMaxLength)
  el.value = next.display
  el.setSelectionRange?.(next.caret, next.caret)
  account.value = next.digits
}
</script>

<template>
  <div v-if="withAccount" v-bind="rootAttrs()" :class="['ml-bank-picker', `ml-bank-picker--${size}`]">
    <MlCombobox
      v-bind="controlAttrs()"
      :id="id"
      class="ml-bank-picker__bank"
      :model-value="model"
      :options="options"
      :filter="bankFilter"
      searchable
      :clearable="clearable"
      :label="label ?? loc.bank.label"
      :hint="hint"
      :error="error"
      :index="index"
      :size="size"
      :required="required"
      :disabled="disabled"
      :placeholder="placeholder ?? loc.bank.search"
      :no-match-text="noMatchText"
      :name="name"
      @update:model-value="onPick"
    >
      <template v-if="$slots.label" #label><slot name="label" /></template>
      <template #prefix><MlIcon name="search" /></template>
    </MlCombobox>
    <MlField
      class="ml-bank-picker__account"
      :control-id="accountId"
      :label="accountLabel ?? loc.bank.account"
      :hint="accountHintText"
      :error="accountError"
    >
      <div :class="['ml-input', `ml-input--${size}`, { 'ml-input--error': accountError, 'ml-input--disabled': disabled }]">
        <input
          :id="accountId"
          class="ml-input__control ml-bank-picker__account-input"
          type="text"
          inputmode="numeric"
          autocomplete="off"
          :value="display"
          :placeholder="accountPlaceholder ?? loc.bank.accountPlaceholder"
          :disabled="disabled"
          :aria-invalid="accountError ? true : undefined"
          :aria-describedby="describedBy(accountId, accountHintText, accountError)"
          @input="onAccountInput"
        />
      </div>
      <input v-if="accountName" type="hidden" :name="accountName" :value="digits" />
    </MlField>
  </div>
  <MlCombobox
    v-else
    v-bind="$attrs"
    :id="id"
    class="ml-bank-picker__bank"
    :model-value="model"
    :options="options"
    :filter="bankFilter"
    searchable
    :clearable="clearable"
    :label="label"
    :hint="hint"
    :error="error"
    :index="index"
    :size="size"
    :required="required"
    :disabled="disabled"
    :placeholder="placeholder ?? loc.bank.search"
    :no-match-text="noMatchText"
    :name="name"
    @update:model-value="onPick"
  >
    <template v-if="$slots.label" #label><slot name="label" /></template>
    <template #prefix><MlIcon name="search" /></template>
  </MlCombobox>
</template>
