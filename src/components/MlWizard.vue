<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import MlButton from './MlButton.vue'
import MlForm from './MlForm.vue'
import MlIcon from './MlIcon.vue'
import MlPaw from './MlPaw.vue'
import MlSchemaFields from './MlSchemaFields.vue'
import { FOCUSABLE } from '../composables'
import type { MlFormRules } from '../form'
import { useLocale } from '../locale'
import type { MlSize } from '../types'
import {
  applySchemaDefaults,
  canJumpToStep,
  cloneSchemaValue,
  setSchemaValue,
  wizardCheckResult,
  wizardSchemaFields,
  wizardStepKey,
  wizardStepState,
  type MlSchemaField,
  type MlSchemaModel,
  type MlWizardStep,
} from './schema-form'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    steps: MlWizardStep[]
    /** Rules by path, for fields written by hand in the step slots. */
    rules?: MlFormRules
    /** Only let the header jump forward to steps already reached. false: every step is open. */
    linear?: boolean
    /** Runs after a step's fields pass, before moving on (also before submit). Return false to stay. */
    beforeNext?: (step: number, model: MlSchemaModel) => boolean | void | Promise<boolean | void>
    /** Runs on submit, e.g. saving to the server: the button spins until it settles; false or a throw stays on the step. */
    action?: (model: MlSchemaModel) => unknown
    /** Spinner on the main button, and both buttons locked. */
    loading?: boolean
    /** Layout of schema steps (see MlSchemaForm). */
    columns?: number
    labelPosition?: 'top' | 'left'
    labelWidth?: string
    size?: MlSize
    /** Accessible name of the step list. */
    label?: string
    prevText?: string
    nextText?: string
    submitText?: string
  }>(),
  { linear: true, loading: false, columns: 1, labelPosition: 'top', size: 'md' },
)
const emit = defineEmits<{
  /** The current step changed. */
  change: [current: number, previous: number]
  /** The last step passed. */
  submit: [model: MlSchemaModel]
  /** Submitted and `action` (if any) succeeded. */
  finish: [model: MlSchemaModel]
}>()

interface StepApi {
  step: MlWizardStep
  index: number
  model: MlSchemaModel
  update: (path: string, value: unknown) => void
  next: () => Promise<void>
  prev: () => void
}
const slots = defineSlots<{
  /** Content of one step, by its `key` (or index): `#step-account="{ model, update }"`. */
  [name: `step-${string}`]: (props: StepApi) => unknown
  /** A custom control for one schema field (see MlSchemaForm). */
  [name: `field-${string}`]: (props: {
    field: MlSchemaField
    value: unknown
    update: (value: unknown) => void
    model: MlSchemaModel
    disabled: boolean
  }) => unknown
  /** Shown under every step's own content. */
  default?: (props: StepApi) => unknown
  /** Replaces the form once finished. */
  finish?: (props: { model: MlSchemaModel; reset: () => void }) => unknown
}>()
const fieldSlots = computed(() => Object.keys(slots).filter((name) => name.startsWith('field-')) as `field-${string}`[])

const model = defineModel<MlSchemaModel>({ default: () => ({}) })
const current = defineModel<number>('current', { default: 0 })

const filled = computed(() => applySchemaDefaults(wizardSchemaFields(props.steps), model.value))
const initial = cloneSchemaValue(filled.value)
onMounted(() => {
  if (filled.value !== model.value) model.value = filled.value
})

/** Furthest step reached by passing the ones before it. */
const reached = ref(current.value)
watch(current, (v) => (reached.value = Math.max(reached.value, v)))

/** A step check is running: buttons ignore clicks, without a spinner flashing by. */
const checking = ref(false)
/** `action` is running. */
const saving = ref(false)
const stepError = ref<string>()
const finished = ref(false)
const form = ref<InstanceType<typeof MlForm>>()
const panel = ref<HTMLElement>()

const step = computed(() => props.steps[current.value])
const last = computed(() => current.value >= props.steps.length - 1)
const locked = computed(() => checking.value || saving.value || props.loading)
const spinning = computed(() => saving.value || props.loading)
const stateOf = (i: number) => (finished.value ? 'done' : wizardStepState(i, current.value))
const canJump = (i: number) => !finished.value && canJumpToStep(i, current.value, reached.value, props.linear)

function update(path: string, value: unknown) {
  model.value = setSchemaValue(filled.value, path, value)
}

async function focusFirstError() {
  await nextTick()
  const item = panel.value?.querySelector<HTMLElement>('.ml-form-item--error')
  const control = item?.querySelector<HTMLElement>('[aria-invalid="true"]') ?? item?.querySelector<HTMLElement>(FOCUSABLE)
  control?.focus({ preventScroll: true })
  item?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
}

/** Validate the current step: its fields, then its `validate`, then `beforeNext`. */
async function validateStep(): Promise<boolean> {
  const s = step.value
  if (!s || !form.value) return false
  stepError.value = undefined
  checking.value = true
  try {
    const ok = s.fields
      ? (await Promise.all(s.fields.map((p) => form.value!.validateField(p)))).every((m) => !m)
      : await form.value.validate()
    if (!ok) {
      focusFirstError()
      return false
    }
    if (s.validate) {
      const result = wizardCheckResult(await s.validate(filled.value))
      if (!result.ok) {
        stepError.value = result.message
        return false
      }
    }
    return !props.beforeNext || (await props.beforeNext(current.value, filled.value)) !== false
  } finally {
    checking.value = false
  }
}

function move(to: number) {
  const from = current.value
  stepError.value = undefined
  current.value = to
  reached.value = Math.max(reached.value, to)
  emit('change', to, from)
  nextTick(() => {
    // The new step's fields start clean: no errors until touched or submitted.
    form.value?.clearValidation()
    panel.value?.focus({ preventScroll: true })
  })
}

async function submit() {
  emit('submit', filled.value)
  if (props.action) {
    saving.value = true
    try {
      if ((await props.action(filled.value)) === false) return
    } finally {
      saving.value = false
    }
  }
  finished.value = true
  emit('finish', filled.value)
}

/** Validate the current step and move on (or submit on the last one). */
async function next() {
  if (locked.value || finished.value) return
  if (!(await validateStep())) return
  if (last.value) await submit()
  else move(current.value + 1)
}

/** Back one step. Never validates. */
function prev() {
  if (locked.value || current.value === 0) return
  move(current.value - 1)
}

/** Jump to a step from the header: back freely, forward only after the current step passes. */
async function goTo(index: number) {
  if (locked.value || !canJump(index)) return
  if (index > current.value && props.linear && !(await validateStep())) return
  move(index)
}

/** Back to the first step with the first values. */
function reset() {
  finished.value = false
  stepError.value = undefined
  model.value = cloneSchemaValue(initial)
  reached.value = 0
  if (current.value !== 0) move(0)
  else nextTick(() => form.value?.clearValidation())
}

const api = computed<StepApi>(() => ({ step: step.value, index: current.value, model: filled.value, update, next, prev }))

defineExpose({ next, prev, goTo, validateStep, reset })
</script>

<template>
  <div :class="['ml-wizard', { 'ml-wizard--finished': finished }]" @submit.capture.prevent.stop="next">
    <ol class="ml-steps ml-wizard__steps" :aria-label="label ?? loc.wizard.label">
      <li
        v-for="(s, i) in steps"
        :key="wizardStepKey(s, i)"
        :class="['ml-steps__item', `ml-steps__item--${stateOf(i)}`, { 'ml-wizard__item--open': canJump(i) }]"
        :aria-current="i === current && !finished ? 'step' : undefined"
      >
        <button type="button" class="ml-wizard__step" :disabled="locked || !canJump(i)" @click="goTo(i)">
          <span class="ml-steps__marker">
            <MlPaw v-if="stateOf(i) === 'done'" tone="current" />
            <template v-else>{{ i + 1 }}</template>
          </span>
          <span class="ml-steps__text">
            <span class="ml-steps__title">{{ s.title }}</span>
            <span v-if="s.description" class="ml-steps__desc">{{ s.description }}</span>
            <span class="ml-visually-hidden">
              {{ stateOf(i) === 'done' ? loc.nav.stepDone : stateOf(i) === 'current' ? loc.nav.stepCurrent : '' }}
            </span>
          </span>
        </button>
      </li>
    </ol>
    <div v-if="finished && $slots.finish" class="ml-wizard__finish">
      <slot name="finish" :model="filled" :reset="reset" />
    </div>
    <MlForm v-else ref="form" :model="filled" :rules="rules" class="ml-wizard__form">
      <section
        v-if="step"
        :key="current"
        ref="panel"
        class="ml-wizard__panel"
        role="group"
        :aria-label="loc.wizard.stepOf(current + 1, steps.length, step.title)"
        tabindex="-1"
      >
        <slot :name="`step-${wizardStepKey(step, current)}`" v-bind="api">
          <MlSchemaFields
            v-if="step.schema"
            :fields="step.schema"
            :model="filled"
            :columns="columns"
            :label-position="labelPosition"
            :label-width="labelWidth"
            :size="size"
            @update="update"
          >
            <template v-for="name in fieldSlots" :key="name" #[name]="slotProps">
              <slot :name="name" v-bind="slotProps" />
            </template>
          </MlSchemaFields>
        </slot>
        <slot v-bind="api" />
      </section>
      <p v-if="stepError" class="ml-wizard__error" role="alert"><MlIcon name="warning" />{{ stepError }}</p>
      <div class="ml-wizard__actions">
        <MlButton v-if="current > 0" variant="ghost" :size="size" :disabled="locked" @click="prev">
          <MlIcon name="chevronLeft" />{{ prevText ?? loc.wizard.prev }}
        </MlButton>
        <MlButton type="submit" :size="size" :loading="spinning">
          {{ last ? (submitText ?? loc.wizard.submit) : (nextText ?? loc.wizard.next) }}<MlIcon v-if="!last" name="chevronRight" />
        </MlButton>
      </div>
    </MlForm>
  </div>
</template>
