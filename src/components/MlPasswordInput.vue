<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import MlField from './MlField.vue'
import MlIcon from './MlIcon.vue'
import { checkPasswordRules, resolvePasswordRules, scorePassword, type MlPasswordRules } from './password'
import { describedBy, useSplitAttrs } from '../composables'
import { useFormField } from '../form'
import { useLocale } from '../locale'
import type { MlSize } from '../types'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
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
    /** "new-password" for sign-up / reset forms, "current-password" for sign-in. */
    autocomplete?: 'new-password' | 'current-password' | (string & {})
    /** Show the show/hide button. */
    toggle?: boolean
    /** Show the 4-bar strength meter. */
    strength?: boolean
    /** Checklist under the field; `true` = 8+ chars, upper, lower, digit, symbol. */
    rules?: boolean | MlPasswordRules
    /** Warn while Caps Lock is on. */
    capsLock?: boolean
  }>(),
  { size: 'md', autocomplete: 'current-password', toggle: true, capsLock: true },
)
const { fieldError, fieldRequired } = useFormField(props)
const model = defineModel<string>({ default: '' })
/** Plain-text mode. v-model:visible to control it from outside. */
const visible = defineModel<boolean>('visible', { default: false })
const { rootAttrs, controlAttrs } = useSplitAttrs()
const loc = useLocale()
const autoId = useId()
const controlId = computed(() => props.id ?? `ml-password-${autoId}`)

const score = computed(() => scorePassword(model.value ?? ''))
const ruleSet = computed(() => resolvePasswordRules(props.rules))
const ruleResults = computed(() => (ruleSet.value ? checkPasswordRules(model.value ?? '', ruleSet.value) : []))
const ruleLabel = (key: string, min?: number) => {
  const p = loc.value.password
  return key === 'length' ? p.minLength(min ?? 0) : p[key as 'upper' | 'lower' | 'digit' | 'symbol']
}

const capsOn = ref(false)
function onKey(event: KeyboardEvent) {
  if (props.capsLock && typeof event.getModifierState === 'function') capsOn.value = event.getModifierState('CapsLock')
}

const describedIds = computed(() => {
  const ids = [
    describedBy(controlId.value, props.hint, fieldError.value),
    capsOn.value ? `${controlId.value}-caps` : undefined,
    props.strength ? `${controlId.value}-strength` : undefined,
    ruleSet.value ? `${controlId.value}-rules` : undefined,
  ].filter(Boolean)
  return ids.length ? ids.join(' ') : undefined
})

function toggleVisible() {
  visible.value = !visible.value
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
    <template v-if="$slots.label" #label><slot name="label" /></template>
    <div
      :class="[
        'ml-input',
        'ml-password',
        `ml-input--${size}`,
        { 'ml-input--error': fieldError, 'ml-input--disabled': disabled },
      ]"
    >
      <span v-if="$slots.prefix" class="ml-input__affix"><slot name="prefix" /></span>
      <input
        :id="controlId"
        v-model="model"
        v-bind="controlAttrs()"
        class="ml-input__control"
        :type="visible ? 'text' : 'password'"
        :autocomplete="autocomplete"
        autocapitalize="off"
        spellcheck="false"
        :placeholder="placeholder"
        :required="fieldRequired"
        :disabled="disabled"
        :readonly="readonly"
        :aria-invalid="fieldError ? true : undefined"
        :aria-describedby="describedIds"
        @keydown="onKey"
        @keyup="onKey"
        @blur="capsOn = false"
      />
      <button
        v-if="toggle"
        type="button"
        class="ml-password__toggle"
        :aria-pressed="visible"
        :aria-label="visible ? loc.password.hide : loc.password.show"
        :aria-controls="controlId"
        :disabled="disabled"
        @click="toggleVisible"
      >
        <MlIcon :name="visible ? 'eyeOff' : 'eye'" />
      </button>
    </div>
    <p v-if="capsOn" :id="`${controlId}-caps`" class="ml-password__caps" role="status">
      <MlIcon name="warning" />{{ loc.password.capsLock }}
    </p>
    <div v-if="strength" :id="`${controlId}-strength`" :class="['ml-password__meter', `ml-password__meter--${score}`]">
      <span class="ml-password__bars" aria-hidden="true">
        <span
          v-for="n in 4"
          :key="n"
          :class="['ml-password__bar', { 'ml-password__bar--on': model && n <= score }]"
        />
      </span>
      <span class="ml-password__level">
        {{ loc.password.strength }}<span class="ml-password__score">{{ model ? loc.password.levels[score] : '—' }}</span>
      </span>
    </div>
    <ul v-if="ruleSet" :id="`${controlId}-rules`" class="ml-password__rules" :aria-label="loc.password.rules">
      <li
        v-for="rule in ruleResults"
        :key="rule.key"
        :class="['ml-password__rule', { 'ml-password__rule--ok': rule.ok }]"
      >
        <MlIcon :name="rule.ok ? 'check' : 'minus'" />{{ ruleLabel(rule.key, rule.min) }}<span class="ml-visually-hidden">（{{ rule.ok ? loc.password.met : loc.password.unmet }}）</span>
      </li>
    </ul>
  </MlField>
</template>
