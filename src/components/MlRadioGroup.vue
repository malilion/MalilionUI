<script setup lang="ts">
import { computed, provide, toRef, useId } from 'vue'
import MlRadio from './MlRadio.vue'
import { radioGroupKey } from './radioGroup'
import type { MlRadioOption } from '../types'

const props = withDefaults(
  defineProps<{
    /** Shortcut for rendering one <MlRadio> per option. Or use the default slot. */
    options?: MlRadioOption[]
    label?: string
    name?: string
    disabled?: boolean
    /** "card" turns each option into a selectable plate. */
    variant?: 'default' | 'card'
    direction?: 'row' | 'column'
  }>(),
  { variant: 'default', direction: 'row' },
)

const model = defineModel<string | number>()
const autoName = `ml-radio-${useId()}`

provide(radioGroupKey, {
  name: props.name ?? autoName,
  model,
  disabled: computed(() => props.disabled),
  variant: toRef(props, 'variant'),
  select: (value) => {
    model.value = value
  },
})
</script>

<template>
  <fieldset
    :class="['ml-radio-group', `ml-radio-group--${variant}`, `ml-radio-group--${direction}`]"
    :disabled="disabled"
  >
    <legend v-if="label" class="ml-radio-group__label">{{ label }}</legend>
    <div class="ml-radio-group__items">
      <slot>
        <MlRadio
          v-for="option in options"
          :key="option.value"
          :value="option.value"
          :label="option.label"
          :hint="option.hint"
          :disabled="option.disabled"
        />
      </slot>
    </div>
  </fieldset>
</template>
