<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import MlField from './MlField.vue'
import { amountInChinese, amountSignificant, formatAmount, formatAmountInput, reformat } from './mask'
import { describedBy, useSplitAttrs } from '../composables'
import { useFormField } from '../form'
import { useLocale } from '../locale'
import type { MlSize } from '../types'

const loc = useLocale()

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** Digits after the decimal point. 0 = whole numbers. */
    decimals?: number
    /** Thousands separator. '' turns grouping off. */
    separator?: string
    allowNegative?: boolean
    /** Applied when the field loses focus, so typing "1" toward "100" isn't fought. */
    min?: number
    max?: number
    /** Shown before the number, e.g. "NT$". The prefix slot replaces it. */
    currency?: string
    /** Spell the amount out below the field in 中文大寫 (壹萬貳仟元整). */
    capital?: boolean
    label?: string
    hint?: string
    error?: string
    index?: string
    placeholder?: string
    size?: MlSize
    required?: boolean
    disabled?: boolean
    readonly?: boolean
    id?: string
  }>(),
  { decimals: 0, separator: ',', min: -Infinity, max: Infinity, size: 'md' },
)
const { fieldError, fieldRequired } = useFormField(props)

/** null while the field is empty. */
const model = defineModel<number | null>({ default: null })
const { rootAttrs, controlAttrs } = useSplitAttrs()
const autoId = useId()
const controlId = computed(() => props.id ?? `ml-amount-${autoId}`)

const options = computed(() => ({ decimals: props.decimals, separator: props.separator, allowNegative: props.allowNegative }))
const text = ref(formatAmount(model.value, options.value))
// Outside changes (a reset, another field) replace the text; our own echoes don't.
watch([model, options], () => {
  if (formatAmountInput(text.value, options.value).value !== model.value) text.value = formatAmount(model.value, options.value)
})
const words = computed(() => (props.capital ? amountInChinese(model.value) : ''))

function onInput(event: Event) {
  const el = event.target as HTMLInputElement
  const { text: next, caret } = reformat(
    { value: el.value, caret: el.selectionStart ?? el.value.length, inputType: (event as InputEvent).inputType, previous: text.value },
    (t) => formatAmountInput(t, options.value).display,
    amountSignificant,
  )
  el.value = next
  if (el.ownerDocument.activeElement === el) el.setSelectionRange(caret, caret)
  text.value = next
  model.value = formatAmountInput(next, options.value).value
}

function onBlur() {
  const value = model.value === null ? null : Math.min(props.max, Math.max(props.min, model.value))
  model.value = value
  text.value = formatAmount(value, options.value)
}
</script>

<template>
  <MlField
    v-bind="rootAttrs()"
    :control-id="controlId"
    :label="label"
    :hint="hint"
    :error="fieldError"
    :index="index"
    :required="fieldRequired"
  >
    <div :class="['ml-input', `ml-input--${size}`, 'ml-amount', { 'ml-input--error': fieldError, 'ml-input--disabled': disabled }]">
      <span v-if="$slots.prefix || currency" class="ml-input__affix ml-amount__currency"><slot name="prefix">{{ currency }}</slot></span>
      <input
        :id="controlId"
        v-bind="controlAttrs()"
        class="ml-input__control ml-amount__control"
        type="text"
        :inputmode="allowNegative ? 'text' : decimals > 0 ? 'decimal' : 'numeric'"
        autocomplete="off"
        :value="text"
        :placeholder="placeholder"
        :required="fieldRequired"
        :disabled="disabled"
        :readonly="readonly"
        :aria-invalid="fieldError ? true : undefined"
        :aria-describedby="describedBy(controlId, hint, fieldError)"
        @input="onInput"
        @blur="onBlur"
      />
      <span v-if="$slots.suffix" class="ml-input__affix"><slot name="suffix" /></span>
    </div>
    <p v-if="capital" class="ml-amount__capital" aria-live="polite">
      <span class="ml-amount__capital-label">{{ loc.amount.capital }}</span>
      <span class="ml-amount__words">{{ words || '—' }}</span>
    </p>
  </MlField>
</template>
