<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue'
import MlField from './MlField.vue'
import MlIcon from './MlIcon.vue'
import { hexToHsva, hsvaToHex, parseHex, type HSVA } from './color'
import { describedBy, useOutsidePointer } from '../composables'
import { useFormField } from '../form'

const props = withDefaults(
  defineProps<{
    label?: string
    hint?: string
    error?: string
    index?: string
    /** Add an opacity slider; v-model may become #rrggbbaa. */
    alpha?: boolean
    /** Quick-pick swatches. */
    presets?: string[]
    clearable?: boolean
    required?: boolean
    disabled?: boolean
    placeholder?: string
    placement?: 'bottom-start' | 'bottom-end'
    id?: string
  }>(),
  {
    presets: () => ['#f0ad2f', '#cd7631', '#3eeed0', '#52e38a', '#ff5c48', '#ff8fa8', '#9ea7b5', '#12151c'],
    placeholder: '選擇顏色',
    placement: 'bottom-start',
  },
)

/** Lower-case hex; null when empty. */
const model = defineModel<string | null>({ default: null })
const { fieldError, fieldRequired } = useFormField(props)

const autoId = useId()
const controlId = computed(() => props.id ?? `ml-colorpicker-${autoId}`)
const panelId = computed(() => `${controlId.value}-panel`)
const root = ref<HTMLElement>()
const trigger = ref<HTMLButtonElement>()
const area = ref<HTMLElement>()
const open = ref(false)

// Working colour in HSV, so hue survives when saturation or value hit 0.
const hsva = ref<HSVA>(hexToHsva(model.value) ?? { h: 38, s: 0.8, v: 0.94, a: 1 })
const hexInput = ref(model.value ?? '')

watch(model, (hex) => {
  const parsed = hexToHsva(hex)
  if (parsed && hsvaToHex(parsed, props.alpha) !== hsvaToHex(hsva.value, props.alpha)) {
    // Keep the old hue for greys, where it isn't recoverable from hex.
    hsva.value = parsed.s === 0 ? { ...parsed, h: hsva.value.h } : parsed
  }
  hexInput.value = hex ?? ''
})

function commit(next: HSVA) {
  hsva.value = next
  model.value = hsvaToHex(next, props.alpha)
}

const pureHue = computed(() => hsvaToHex({ h: hsva.value.h, s: 1, v: 1, a: 1 }))
const solid = computed(() => hsvaToHex({ ...hsva.value, a: 1 }))
const swatch = computed(() => model.value ?? 'transparent')

/* ── Saturation / value area ─────────────────────────────── */
function fromPointer(event: PointerEvent) {
  const rect = area.value!.getBoundingClientRect()
  const s = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width))
  const v = Math.min(1, Math.max(0, 1 - (event.clientY - rect.top) / rect.height))
  commit({ ...hsva.value, s, v })
}

let dragging = false
function onAreaDown(event: PointerEvent) {
  dragging = true
  area.value?.setPointerCapture?.(event.pointerId)
  area.value?.focus()
  fromPointer(event)
}
function onAreaMove(event: PointerEvent) {
  if (dragging) fromPointer(event)
}
function onAreaUp() {
  dragging = false
}

function onAreaKey(event: KeyboardEvent) {
  const d = event.shiftKey ? 0.1 : 0.01
  const { s, v } = hsva.value
  const moves: Record<string, [number, number]> = {
    ArrowLeft: [s - d, v],
    ArrowRight: [s + d, v],
    ArrowUp: [s, v + d],
    ArrowDown: [s, v - d],
  }
  const m = moves[event.key]
  if (!m) return
  event.preventDefault()
  commit({ ...hsva.value, s: Math.min(1, Math.max(0, m[0])), v: Math.min(1, Math.max(0, m[1])) })
}

/* ── Text input & presets ────────────────────────────────── */
function onHexChange() {
  const raw = hexInput.value.trim()
  if (!raw && props.clearable) {
    model.value = null
    return
  }
  const parsed = hexToHsva(raw.startsWith('#') ? raw : `#${raw}`)
  if (parsed) commit(props.alpha ? parsed : { ...parsed, a: 1 })
  else hexInput.value = model.value ?? ''
}

function pickPreset(hex: string) {
  const parsed = hexToHsva(hex)
  if (parsed) commit(parsed)
}

async function show() {
  if (props.disabled) return
  open.value = true
  await nextTick()
  area.value?.focus()
}

function hide(returnFocus = true) {
  if (!open.value) return
  open.value = false
  if (returnFocus) trigger.value?.focus()
}

function clear() {
  model.value = null
  trigger.value?.focus()
}

function onPanelKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    hide()
  }
}

useOutsidePointer(root, () => open.value, () => hide(false))

const valid = computed(() => !!parseHex(model.value))
const areaText = computed(
  () => `飽和度 ${Math.round(hsva.value.s * 100)}%，亮度 ${Math.round(hsva.value.v * 100)}%`,
)
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
    <div ref="root" class="ml-datepicker ml-colorpicker">
      <div :class="['ml-input', { 'ml-input--error': fieldError, 'ml-input--disabled': disabled }]">
        <span class="ml-colorpicker__chip" :style="{ '--_c': swatch }" aria-hidden="true" />
        <button
          :id="controlId"
          ref="trigger"
          type="button"
          class="ml-input__control ml-datepicker__trigger ml-colorpicker__trigger"
          aria-haspopup="dialog"
          :aria-expanded="open"
          :aria-controls="open ? panelId : undefined"
          :aria-invalid="fieldError ? true : undefined"
          :aria-describedby="describedBy(controlId, hint, fieldError)"
          :disabled="disabled"
          @click="open ? hide() : show()"
        >
          <span v-if="valid">{{ model }}</span>
          <span v-else class="ml-datepicker__placeholder">{{ placeholder }}</span>
        </button>
        <button
          v-if="clearable && model && !disabled"
          type="button"
          class="ml-datepicker__clear"
          aria-label="清除顏色"
          @click="clear"
        >
          <MlIcon name="close" />
        </button>
      </div>

      <Transition name="ml-dropdown">
        <div
          v-if="open"
          :id="panelId"
          role="dialog"
          aria-label="選擇顏色"
          :class="['ml-datepicker__panel', `ml-datepicker__panel--${placement}`, 'ml-colorpicker__panel']"
          @keydown="onPanelKeydown"
        >
          <div
            ref="area"
            class="ml-colorpicker__area"
            role="slider"
            tabindex="0"
            aria-label="飽和度與亮度"
            :aria-valuetext="areaText"
            :aria-valuenow="Math.round(hsva.s * 100)"
            aria-valuemin="0"
            aria-valuemax="100"
            :style="{ '--_hue': pureHue }"
            @pointerdown="onAreaDown"
            @pointermove="onAreaMove"
            @pointerup="onAreaUp"
            @pointercancel="onAreaUp"
            @keydown="onAreaKey"
          >
            <span
              class="ml-colorpicker__handle"
              :style="{ left: `${hsva.s * 100}%`, top: `${(1 - hsva.v) * 100}%`, '--_c': solid }"
            />
          </div>

          <label class="ml-colorpicker__slider ml-colorpicker__slider--hue">
            <span class="ml-visually-hidden">色相</span>
            <input
              type="range"
              min="0"
              max="359"
              :value="Math.round(hsva.h)"
              @input="commit({ ...hsva, h: Number(($event.target as HTMLInputElement).value) })"
            />
          </label>
          <label v-if="alpha" class="ml-colorpicker__slider ml-colorpicker__slider--alpha" :style="{ '--_c': solid }">
            <span class="ml-visually-hidden">不透明度</span>
            <input
              type="range"
              min="0"
              max="100"
              :value="Math.round(hsva.a * 100)"
              @input="commit({ ...hsva, a: Number(($event.target as HTMLInputElement).value) / 100 })"
            />
          </label>

          <div class="ml-colorpicker__row">
            <span class="ml-colorpicker__preview" :style="{ '--_c': swatch }" aria-hidden="true" />
            <label class="ml-colorpicker__hex">
              <span class="ml-visually-hidden">色碼</span>
              <input
                v-model="hexInput"
                type="text"
                spellcheck="false"
                maxlength="9"
                @change="onHexChange"
                @keydown.enter.prevent="onHexChange"
              />
            </label>
          </div>

          <div v-if="presets.length" class="ml-colorpicker__presets" role="group" aria-label="預設顏色">
            <button
              v-for="c in presets"
              :key="c"
              type="button"
              :class="['ml-colorpicker__preset', { 'ml-colorpicker__preset--on': model === c.toLowerCase() }]"
              :style="{ '--_c': c }"
              :aria-label="c"
              :aria-pressed="model === c.toLowerCase()"
              @click="pickPreset(c)"
            />
          </div>
        </div>
      </Transition>
    </div>
  </MlField>
</template>
