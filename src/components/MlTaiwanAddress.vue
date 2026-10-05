<script setup lang="ts">
import { computed, provide, ref, useId } from 'vue'
import MlIcon from './MlIcon.vue'
import MlInput from './MlInput.vue'
import MlInputMask from './MlInputMask.vue'
import MlTaiwanRegion from './MlTaiwanRegion.vue'
import { emptyTaiwanAddress, formatTwAddress, parseTwAddress, rebaseZip, twZipStatus, type MlTaiwanAddressValue } from './address'
import type { RegionLang } from './region'
import { fieldKey, useFormField, type FieldContext } from '../form'
import { useLocale } from '../locale'
import type { MlTaiwanRegionValue } from '../taiwan-regions'
import type { MlSize } from '../types'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    label?: string
    hint?: string
    error?: string
    size?: MlSize
    required?: boolean
    disabled?: boolean
    /** Show the postal code field (3+3). */
    zip?: boolean
    /** The assembled address under the fields. */
    preview?: boolean
    /** Also show the address in Chunghwa Post's English order. */
    english?: boolean
    /** 縣市 / 鄉鎮市區 names in Chinese or English. Default: follows the locale. */
    lang?: RegionLang
    includeIslands?: boolean
  }>(),
  { size: 'md', zip: true, preview: true, english: false },
)
const emit = defineEmits<{ paste: [parts: ReturnType<typeof parseTwAddress>] }>()

const model = defineModel<MlTaiwanAddressValue>({ default: emptyTaiwanAddress })
const { fieldError, fieldRequired } = useFormField(props)
// The parts are separate controls, but an MlFormItem's error belongs to the whole
// address: shown once below, not under every part.
provide(fieldKey, null as unknown as FieldContext)
const autoId = useId()
const errorId = `ml-address-${autoId}-error`

const region = computed<MlTaiwanRegionValue | null>(() =>
  model.value.county && model.value.district ? { county: model.value.county, district: model.value.district, zip: model.value.zip.slice(0, 3) } : null,
)
const zipStatus = computed(() => twZipStatus(model.value.zip, model.value.county, model.value.district))
const zipError = computed(() => (zipStatus.value === 'mismatch' ? loc.value.address.zipMismatch : zipStatus.value === 'invalid' ? loc.value.address.zipInvalid : undefined))
const full = computed(() => (model.value.county && model.value.district ? formatTwAddress(model.value) : ''))
const fullEn = computed(() => (props.english && full.value ? formatTwAddress(model.value, { lang: 'en' }) : ''))
const pasted = ref(false)

function set<K extends keyof MlTaiwanAddressValue>(key: K, value: MlTaiwanAddressValue[K]) {
  pasted.value = false
  model.value = { ...model.value, [key]: value }
}

function setRegion(value: MlTaiwanRegionValue | null) {
  pasted.value = false
  model.value = { ...model.value, county: value?.county ?? '', district: value?.district ?? '', zip: rebaseZip(model.value.zip, value?.zip ?? '') }
}

/** Pasting a whole address into the road field fills every part it can find. */
function onPaste(event: ClipboardEvent) {
  const text = event.clipboardData?.getData('text') ?? ''
  const parts = parseTwAddress(text)
  if (!parts.county && !(parts.road && parts.number)) return
  event.preventDefault()
  const next = { ...model.value }
  for (const [k, v] of Object.entries(parts)) if (k !== 'rest' && v) (next as Record<string, string>)[k] = v
  model.value = next
  pasted.value = true
  emit('paste', parts)
}

const fields = [
  ['section', 'ml-address__short'],
  ['lane', 'ml-address__short'],
  ['alley', 'ml-address__short'],
  ['number', 'ml-address__number'],
  ['floor', 'ml-address__short'],
  ['room', 'ml-address__short'],
] as const
</script>

<template>
  <fieldset
    :class="['ml-address', `ml-address--${size}`, { 'ml-address--error': fieldError }]"
    :disabled="disabled"
    :aria-describedby="fieldError ? errorId : undefined"
  >
    <legend v-if="label" class="ml-field__label">
      {{ label }}<span v-if="fieldRequired" class="ml-field__required" aria-hidden="true">*</span>
    </legend>
    <div class="ml-address__row">
      <MlTaiwanRegion
        class="ml-address__region"
        :model-value="region"
        :zip="true"
        :lang="lang"
        :include-islands="includeIslands"
        :size="size"
        :disabled="disabled"
        :required="fieldRequired"
        @update:model-value="setRegion"
      />
      <MlInputMask
        v-if="zip"
        class="ml-address__zip"
        :model-value="model.zip"
        preset="zip"
        :unmask="false"
        :label="loc.address.zip"
        :error="zipError"
        :size="size"
        :disabled="disabled"
        @update:model-value="set('zip', $event)"
      />
    </div>
    <div class="ml-address__row ml-address__row--street">
      <MlInput
        class="ml-address__road"
        :model-value="model.road"
        :label="loc.address.road"
        :placeholder="loc.address.roadPlaceholder"
        :size="size"
        :disabled="disabled"
        :required="fieldRequired"
        @update:model-value="set('road', String($event ?? ''))"
        @paste="onPaste"
      />
      <MlInput
        v-for="[key, cls] in fields"
        :key="key"
        :class="cls"
        :model-value="model[key] ?? ''"
        :aria-label="loc.address[key]"
        inputmode="text"
        :size="size"
        :disabled="disabled"
        :required="fieldRequired && key === 'number'"
        @update:model-value="set(key, String($event ?? ''))"
      >
        <template #suffix>{{ loc.address[key] }}</template>
      </MlInput>
    </div>
    <p v-if="preview && full" class="ml-address__preview" aria-live="polite">
      <span class="ml-address__preview-label">{{ loc.address.preview }}</span>
      <span class="ml-address__line">{{ full }}</span>
      <template v-if="fullEn">
        <span class="ml-address__preview-label">{{ loc.address.english }}</span>
        <span class="ml-address__line ml-address__line--en">{{ fullEn }}</span>
      </template>
    </p>
    <p v-if="pasted" class="ml-address__note" role="status">{{ loc.address.pasteHint }}</p>
    <p v-if="fieldError" :id="errorId" class="ml-field__error"><MlIcon name="warning" />{{ fieldError }}</p>
    <p v-else-if="hint" class="ml-field__hint">{{ hint }}</p>
    <p v-else-if="zip && zipStatus === 'partial'" class="ml-field__hint">{{ loc.address.zipHint }}</p>
  </fieldset>
</template>
