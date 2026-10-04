<script setup lang="ts">
import { computed, useId } from 'vue'
import MlField from './MlField.vue'
import { applyMask, maskInputMode, maskPlaceholder, maskSignificant, reformat, resolveMask, type MlMaskPreset, type MlMaskToken } from './mask'
import { describedBy, useSplitAttrs } from '../composables'
import { useFormField } from '../form'
import type { MlSize } from '../types'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** `9` digit · `a` letter · `A` letter → uppercase · `*` letter/digit · `X` letter/digit → uppercase; `\` escapes. */
    mask?: string
    /** A ready-made Taiwan format. `mask` wins when both are set. */
    preset?: MlMaskPreset
    /** Extra or replacement slot characters. */
    tokens?: Record<string, MlMaskToken>
    /** v-model gets just the typed characters (0912345678). false: the formatted text (0912-345-678). */
    unmask?: boolean
    label?: string
    hint?: string
    error?: string
    index?: string
    /** Defaults to the mask with "_" in every slot. */
    placeholder?: string
    size?: MlSize
    required?: boolean
    disabled?: boolean
    readonly?: boolean
    id?: string
  }>(),
  { unmask: true, size: 'md' },
)
const emit = defineEmits<{ complete: [raw: string, formatted: string] }>()
const { fieldError, fieldRequired } = useFormField(props)

const model = defineModel<string>({ default: '' })
const { rootAttrs, controlAttrs } = useSplitAttrs()
const autoId = useId()
const controlId = computed(() => props.id ?? `ml-mask-${autoId}`)

const parts = computed(() => resolveMask(props.mask, props.preset, props.tokens))
const significant = computed(() => maskSignificant(parts.value))
const display = computed(() => applyMask(model.value ?? '', parts.value).formatted)

function onInput(event: Event) {
  // An IME (注音, 倉頡…) is still composing: format once compositionend fires.
  if ((event as InputEvent).isComposing) return
  update(event.target as HTMLInputElement, (event as InputEvent).inputType)
}

function update(el: HTMLInputElement, inputType?: string) {
  const before = display.value
  const { text, caret } = reformat(
    { value: el.value, caret: el.selectionStart ?? el.value.length, inputType, previous: before },
    (t) => applyMask(t, parts.value).formatted,
    significant.value,
  )
  el.value = text
  if (el.ownerDocument.activeElement === el) el.setSelectionRange(caret, caret)
  const result = applyMask(text, parts.value)
  model.value = props.unmask ? result.raw : result.formatted
  if (result.complete && text !== before) emit('complete', result.raw, result.formatted)
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
    <div :class="['ml-input', `ml-input--${size}`, 'ml-mask', { 'ml-input--error': fieldError, 'ml-input--disabled': disabled }]">
      <span v-if="$slots.prefix" class="ml-input__affix"><slot name="prefix" /></span>
      <input
        :id="controlId"
        v-bind="controlAttrs()"
        class="ml-input__control ml-mask__control"
        type="text"
        :inputmode="maskInputMode(parts)"
        :value="display"
        :placeholder="placeholder ?? maskPlaceholder(parts)"
        :required="fieldRequired"
        :disabled="disabled"
        :readonly="readonly"
        :aria-invalid="fieldError ? true : undefined"
        :aria-describedby="describedBy(controlId, hint, fieldError)"
        @input="onInput"
        @compositionend="update($event.target as HTMLInputElement, 'insertText')"
      />
      <span v-if="$slots.suffix" class="ml-input__affix"><slot name="suffix" /></span>
    </div>
  </MlField>
</template>
