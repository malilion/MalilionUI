<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import MlButton from './MlButton.vue'
import MlForm from './MlForm.vue'
import MlSchemaFields from './MlSchemaFields.vue'
import { getPath, type MlFormErrors, type MlFormRules } from '../form'
import { useLocale } from '../locale'
import type { MlSize } from '../types'
import { applySchemaDefaults, cloneSchemaValue, setSchemaValue, type MlSchemaField, type MlSchemaModel } from './schema-form'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    /** The fields, in order. */
    schema: MlSchemaField[]
    /** Extra rules by path, on top of each field's own. */
    rules?: MlFormRules
    /** Grid columns; fields take `span` of them. Collapses to one column on narrow screens. */
    columns?: number
    labelPosition?: 'top' | 'left'
    /** Width of the label column when labels sit on the left, e.g. "8em". */
    labelWidth?: string
    size?: MlSize
    /** Disable every field (they then skip validation). */
    disabled?: boolean
    /** Show the submit / reset buttons. */
    actions?: boolean
    /** Spinner on the submit button, e.g. while saving. */
    loading?: boolean
    submitText?: string
    resetText?: string
  }>(),
  { columns: 1, labelPosition: 'top', size: 'md', disabled: false, actions: true, loading: false },
)
const emit = defineEmits<{
  /** Every visible field passed. */
  submit: [model: MlSchemaModel]
  /** At least one field failed; focus has moved to the first one. */
  invalid: [errors: MlFormErrors]
  /** resetFields() ran (also the reset button). */
  reset: [model: MlSchemaModel]
}>()
const slots = defineSlots<{
  /** A custom control for one field: `#field-city="{ field, value, update, model, disabled }"`. */
  [name: `field-${string}`]: (props: {
    field: MlSchemaField
    value: unknown
    update: (value: unknown) => void
    model: MlSchemaModel
    disabled: boolean
  }) => unknown
  /** Extra content after the fields. */
  default?: () => unknown
  /** Replaces the buttons. */
  actions?: (props: { reset: () => void; loading: boolean }) => unknown
}>()

/** Field slots, passed through to the grid. */
const fieldSlots = computed(() => Object.keys(slots).filter((name) => name.startsWith('field-')) as `field-${string}`[])

const model = defineModel<MlSchemaModel>({ default: () => ({}) })
/** The model with every field's default filled in — what is shown and validated. */
const filled = computed(() => applySchemaDefaults(props.schema, model.value))
const initial = cloneSchemaValue(filled.value)

// Hand the defaults back to v-model once, so the parent's object matches the screen.
onMounted(() => {
  if (filled.value !== model.value) model.value = filled.value
})

const form = ref<InstanceType<typeof MlForm>>()

function update(path: string, value: unknown) {
  model.value = setSchemaValue(filled.value, path, value)
}

/** Validate every visible field. Resolves true when all pass. */
const validate = () => form.value?.validate() ?? Promise.resolve(true)
/** Validate one field by its path. Resolves to its error message, if any. */
const validateField = (path: string) => form.value?.validateField(path) ?? Promise.resolve(undefined)
/** Clear error messages (all, or just the given paths) without touching values. */
const clearValidation = (paths?: string[]) => form.value?.clearValidation(paths)

/** Put fields (all, or just the given paths) back to their first values and clear their errors. */
function resetFields(paths?: string[]) {
  // Clear first, so the value change below doesn't re-validate.
  clearValidation(paths)
  const next = paths
    ? paths.reduce((m, p) => setSchemaValue(m, p, cloneSchemaValue(getPath(initial, p))), filled.value)
    : cloneSchemaValue(initial)
  model.value = next
  emit('reset', next)
}

defineExpose({ validate, validateField, clearValidation, clearValidate: clearValidation, resetFields })
</script>

<template>
  <MlForm
    ref="form"
    :model="filled"
    :rules="rules"
    class="ml-schema-form"
    @submit="emit('submit', filled)"
    @invalid="emit('invalid', $event)"
  >
    <MlSchemaFields
      :fields="schema"
      :model="filled"
      :columns="columns"
      :label-position="labelPosition"
      :label-width="labelWidth"
      :size="size"
      :disabled="disabled"
      @update="update"
    >
      <template v-for="name in fieldSlots" :key="name" #[name]="slotProps">
        <slot :name="name" v-bind="slotProps" />
      </template>
    </MlSchemaFields>
    <slot />
    <div v-if="actions" class="ml-schema-form__actions">
      <slot name="actions" :reset="() => resetFields()" :loading="loading">
        <MlButton variant="ghost" :size="size" :disabled="disabled || loading" @click="resetFields()">
          {{ resetText ?? loc.schemaForm.reset }}
        </MlButton>
        <MlButton type="submit" :size="size" :disabled="disabled" :loading="loading">
          {{ submitText ?? loc.schemaForm.submit }}
        </MlButton>
      </slot>
    </div>
  </MlForm>
</template>
