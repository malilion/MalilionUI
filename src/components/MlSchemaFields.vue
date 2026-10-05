<script setup lang="ts">
// The field grid of MlSchemaForm, also used by MlWizard's schema steps.
// It renders inside a surrounding MlForm, so each field's MlFormItem registers there.
import { computed, useId, type Component } from 'vue'
import MlAmountInput from './MlAmountInput.vue'
import MlCheckbox from './MlCheckbox.vue'
import MlCheckboxGroup from './MlCheckboxGroup.vue'
import MlCombobox from './MlCombobox.vue'
import MlDatePicker from './MlDatePicker.vue'
import MlField from './MlField.vue'
import MlFormItem from './MlFormItem.vue'
import MlInput from './MlInput.vue'
import MlInputMask from './MlInputMask.vue'
import MlNumberInput from './MlNumberInput.vue'
import MlRadioGroup from './MlRadioGroup.vue'
import MlSelect from './MlSelect.vue'
import MlSwitch from './MlSwitch.vue'
import MlTaiwanAddress from './MlTaiwanAddress.vue'
import MlTaiwanRegion from './MlTaiwanRegion.vue'
import MlTextarea from './MlTextarea.vue'
import { getPath } from '../form'
import type { MlSize } from '../types'
import {
  isSchemaFieldDisabled,
  schemaControlProps,
  schemaFieldRules,
  schemaFieldType,
  schemaSpan,
  visibleSchemaFields,
  type MlSchemaField,
  type MlSchemaFieldType,
  type MlSchemaModel,
} from './schema-form'

const props = withDefaults(
  defineProps<{
    fields: MlSchemaField[]
    model: MlSchemaModel
    columns?: number
    labelPosition?: 'top' | 'left'
    /** Width of the label column when labels sit on the left. */
    labelWidth?: string
    size?: MlSize
    disabled?: boolean
  }>(),
  { columns: 1, labelPosition: 'top', size: 'md', disabled: false },
)
const emit = defineEmits<{ update: [path: string, value: unknown] }>()
defineSlots<{
  [name: `field-${string}`]: (props: {
    field: MlSchemaField
    value: unknown
    update: (value: unknown) => void
    model: MlSchemaModel
    disabled: boolean
  }) => unknown
}>()

const CONTROLS: Partial<Record<MlSchemaFieldType, Component>> = {
  text: MlInput,
  textarea: MlTextarea,
  number: MlNumberInput,
  amount: MlAmountInput,
  mask: MlInputMask,
  select: MlSelect,
  combobox: MlCombobox,
  checkbox: MlCheckbox,
  'checkbox-group': MlCheckboxGroup,
  date: MlDatePicker,
  region: MlTaiwanRegion,
  address: MlTaiwanAddress,
}

const autoId = useId()
const shown = computed(() => visibleSchemaFields(props.fields, props.model))
const cols = computed(() => Math.max(1, Math.floor(props.columns) || 1))

const idOf = (f: MlSchemaField) => `ml-schema-${autoId}-${f.field.replace(/\W/g, '-')}`
const valueOf = (f: MlSchemaField) => getPath(props.model, f.field)
const disabledOf = (f: MlSchemaField) => isSchemaFieldDisabled(f, props.model, props.disabled)
// Disabled fields can't be fixed by the user, so they aren't validated.
const rulesOf = (f: MlSchemaField) => (disabledOf(f) ? [] : schemaFieldRules(f))
const controlOf = (f: MlSchemaField) => (schemaFieldType(f) === 'custom' ? (f.component as Component | undefined) : CONTROLS[schemaFieldType(f)])
const controlProps = (f: MlSchemaField) => schemaControlProps(f, { size: props.size, disabled: disabledOf(f) })
const update = (f: MlSchemaField, value: unknown) => emit('update', f.field, value)
</script>

<template>
  <div
    :class="['ml-schema-form__grid', `ml-schema-form__grid--label-${labelPosition}`]"
    :style="{ '--ml-schema-columns': cols, '--ml-schema-label-width': labelWidth }"
  >
    <div
      v-for="f in shown"
      :key="f.field"
      :class="['ml-schema-form__item', `ml-schema-form__item--${schemaFieldType(f)}`]"
      :style="{ '--ml-schema-span': schemaSpan(f, cols) }"
    >
      <MlFormItem :prop="f.field" :rules="rulesOf(f)">
        <slot
          :name="`field-${f.field}`"
          :field="f"
          :value="valueOf(f)"
          :update="(v: unknown) => update(f, v)"
          :model="model"
          :disabled="disabledOf(f)"
        >
          <MlField
            v-if="schemaFieldType(f) === 'switch'"
            :control-id="idOf(f)"
            :label="f.label"
            :hint="f.help"
            :required="rulesOf(f).some((r) => r.required)"
          >
            <MlSwitch
              v-bind="controlProps(f)"
              :id="idOf(f)"
              :model-value="valueOf(f) as boolean"
              @update:model-value="update(f, $event)"
            />
          </MlField>
          <MlField
            v-else-if="schemaFieldType(f) === 'radio'"
            :control-id="idOf(f)"
            :label="f.label"
            :hint="f.help"
            :required="rulesOf(f).some((r) => r.required)"
          >
            <MlRadioGroup
              v-bind="controlProps(f)"
              :aria-labelledby="f.label ? `${idOf(f)}-label` : undefined"
              :model-value="valueOf(f) as string | number"
              @update:model-value="update(f, $event)"
            />
          </MlField>
          <component
            :is="controlOf(f)"
            v-else-if="controlOf(f)"
            v-bind="controlProps(f)"
            :model-value="valueOf(f)"
            @update:model-value="update(f, $event)"
          />
        </slot>
      </MlFormItem>
    </div>
  </div>
</template>
