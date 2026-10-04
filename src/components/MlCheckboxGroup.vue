<script setup lang="ts">
import { computed, provide, shallowReactive, toRef, useId } from 'vue'
import MlCheckbox from './MlCheckbox.vue'
import MlField from './MlField.vue'
import { checkboxGroupKey, type CheckboxValue } from './checkboxGroup'
import { describedBy } from '../composables'
import { useFormField } from '../form'
import { useLocale } from '../locale'
import type { MlCheckboxOption } from '../types'

const props = withDefaults(
  defineProps<{
    /** Shortcut for rendering one <MlCheckbox> per option. Or use the default slot. */
    options?: MlCheckboxOption[]
    label?: string
    hint?: string
    error?: string
    /** HUD prefix shown before the label, e.g. "01". */
    index?: string
    required?: boolean
    disabled?: boolean
    /** Native name given to every box, for plain form posts. */
    name?: string
    /** "card" turns each option into a selectable plate. */
    variant?: 'default' | 'card'
    direction?: 'row' | 'column'
    /** At least this many must stay checked (checked boxes lock at the limit). */
    min?: number
    /** At most this many; the unchecked rest disable once reached. */
    max?: number
    /** Add a "select all" box with an indeterminate state. A string replaces its label. */
    checkAll?: boolean | string
    /** Stamp paw prints instead of check marks. */
    paw?: boolean
    id?: string
  }>(),
  { variant: 'default', direction: 'row' },
)

const model = defineModel<CheckboxValue[]>({ default: () => [] })
const { fieldError, fieldRequired } = useFormField(props)
const loc = useLocale()
const autoId = useId()
const controlId = computed(() => props.id ?? `ml-checkbox-group-${autoId}`)

/** Values announced by mounted children (slot mode) and whether each is disabled. */
const registered = shallowReactive(new Map<CheckboxValue, () => boolean>())

/** The values "select all" acts on: every enabled option. */
const enabledValues = computed<CheckboxValue[]>(() => {
  if (props.options) return props.options.filter((o) => !o.disabled).map((o) => o.value)
  return [...registered].filter(([, disabled]) => !disabled()).map(([value]) => value)
})

const count = computed(() => model.value.length)
const atMax = computed(() => props.max !== undefined && count.value >= props.max)
const atMin = computed(() => props.min !== undefined && count.value <= props.min)

function toggle(value: CheckboxValue, on: boolean) {
  const has = model.value.includes(value)
  if (on && !has) {
    if (atMax.value) return
    model.value = [...model.value, value]
  } else if (!on && has) {
    if (atMin.value) return
    model.value = model.value.filter((v) => v !== value)
  }
}

provide(checkboxGroupKey, {
  name: toRef(props, 'name'),
  isChecked: (value) => model.value.includes(value),
  isLocked: (value) => {
    if (props.disabled) return true
    const has = model.value.includes(value)
    return has ? atMin.value : atMax.value
  },
  toggle,
  register: (value, disabled) => {
    registered.set(value, disabled)
    return () => registered.delete(value)
  },
})

const allChecked = computed(() => enabledValues.value.length > 0 && enabledValues.value.every((v) => model.value.includes(v)))
const someChecked = computed(() => !allChecked.value && enabledValues.value.some((v) => model.value.includes(v)))

function toggleAll(on: boolean) {
  const enabled = new Set(enabledValues.value)
  if (on) {
    // Keep what's already checked, then fill in enabled values in order, up to max.
    const next = [...model.value]
    for (const v of enabledValues.value) {
      if (props.max !== undefined && next.length >= props.max) break
      if (!next.includes(v)) next.push(v)
    }
    model.value = next
  } else {
    // Disabled options keep their state; never drop below min.
    const keep = model.value.filter((v) => !enabled.has(v))
    const min = props.min ?? 0
    const refill = model.value.filter((v) => enabled.has(v)).slice(0, Math.max(0, min - keep.length))
    model.value = [...keep, ...refill]
  }
}

const checkAllLabel = computed(() => (typeof props.checkAll === 'string' ? props.checkAll : loc.value.checkboxGroup.all))
/** "Select all" can't do anything more in the direction a click would take it. */
const checkAllLocked = computed(() => {
  if (props.disabled || enabledValues.value.length === 0) return true
  return allChecked.value ? atMin.value : atMax.value
})
</script>

<template>
  <MlField
    :control-id="controlId"
    :label="label"
    :hint="hint"
    :error="fieldError"
    :index="index"
    :required="fieldRequired"
  >
    <template v-if="$slots.label" #label><slot name="label" /></template>
    <div
      :id="controlId"
      role="group"
      :class="[
        'ml-check-group',
        `ml-check-group--${variant}`,
        `ml-check-group--${direction}`,
        { 'ml-check-group--error': fieldError, 'ml-check-group--disabled': disabled },
      ]"
      :aria-labelledby="label || $slots.label ? `${controlId}-label` : undefined"
      :aria-describedby="describedBy(controlId, hint, fieldError)"
    >
      <MlCheckbox
        v-if="checkAll"
        class="ml-check-group__all"
        :model-value="allChecked"
        :indeterminate="someChecked"
        :label="checkAllLabel"
        :paw="paw"
        :disabled="checkAllLocked"
        @update:model-value="toggleAll"
      />
      <div class="ml-check-group__items">
        <slot>
          <MlCheckbox
            v-for="option in options"
            :key="option.value"
            :value="option.value"
            :label="option.label"
            :hint="option.hint"
            :disabled="option.disabled"
            :paw="paw"
          />
        </slot>
      </div>
    </div>
  </MlField>
</template>
