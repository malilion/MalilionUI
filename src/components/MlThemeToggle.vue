<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId } from 'vue'
import MlSegmented from './MlSegmented.vue'
import { themeIcons, type ThemeIconName } from './theme-icons'
import { useLocale } from '../locale'
import { useTheme } from '../useTheme'
import { getServerThemeState, type MlThemeMode, type MlThemeOrigin } from '../theme'
import type { MlSegmentedOption, MlSize } from '../types'

const props = withDefaults(
  defineProps<{
    /** switch: a metal toggle; segmented: dark / light / system; icon: a compact button. */
    variant?: 'switch' | 'segmented' | 'icon'
    /** Visible label (switch) or accessible name (segmented / icon). */
    label?: string
    /** Offer "follow the OS" in the segmented variant. */
    system?: boolean
    /** Animate the switch; defaults to the store's `smooth` option. */
    smooth?: boolean
    size?: MlSize
    disabled?: boolean
    id?: string
  }>(),
  { variant: 'switch', system: true, size: 'md', smooth: undefined },
)

const emit = defineEmits<{ change: [mode: MlThemeMode] }>()

const loc = useLocale()
const theme = useTheme()
const autoId = useId()
const controlId = computed(() => props.id ?? `ml-theme-toggle-${autoId}`)
const root = ref<HTMLElement>()

// The server can't know the stored choice: render its guess until mounted (CSS
// follows <html data-ml-theme> meanwhile), and skip transitions while settling.
const mounted = ref(false)
const ready = ref(false)
let frame = 0
onMounted(() => {
  mounted.value = true
  frame = requestAnimationFrame(() => (frame = requestAnimationFrame(() => (ready.value = true))))
})
onBeforeUnmount(() => cancelAnimationFrame(frame))

const server = getServerThemeState()
const shownMode = computed(() => (mounted.value ? theme.mode.value : server.mode))
const shown = computed(() => (mounted.value ? theme.resolved.value : server.resolved))

/* Reveal origin: where the pointer pressed, else the focused control's centre. */
let pressed: { x: number; y: number; t: number } | undefined
function onPointerdown(event: PointerEvent) {
  pressed = { x: event.clientX, y: event.clientY, t: Date.now() }
}
function origin(): MlThemeOrigin | undefined {
  if (pressed && Date.now() - pressed.t < 1500) return { x: pressed.x, y: pressed.y }
  const active = typeof document !== 'undefined' ? document.activeElement : null
  return active && root.value?.contains(active) ? active : root.value
}

function choose(mode: MlThemeMode) {
  if (props.disabled || mode === theme.mode.value) return
  theme.setTheme(mode, { origin: origin(), smooth: props.smooth })
  pressed = undefined
  emit('change', mode)
}

const flip = () => choose(theme.resolved.value === 'dark' ? 'light' : 'dark')

const options = computed<MlSegmentedOption[]>(() => [
  { value: 'dark', label: loc.value.theme.dark },
  { value: 'light', label: loc.value.theme.light },
  ...(props.system ? [{ value: 'system', label: loc.value.theme.system }] : []),
])
const glyphOf: Record<MlThemeMode, ThemeIconName> = { dark: 'moon', light: 'sun', system: 'system' }
const segmentValue = computed(() => (!props.system && shownMode.value === 'system' ? shown.value : shownMode.value))
</script>

<template>
  <div
    ref="root"
    :class="[
      'ml-theme-toggle',
      `ml-theme-toggle--${variant}`,
      `ml-theme-toggle--${size}`,
      mounted ? `ml-theme-toggle--${shown}` : 'ml-theme-toggle--pending',
      { 'ml-theme-toggle--ready': ready, 'ml-theme-toggle--disabled': disabled },
    ]"
    @pointerdown.capture="onPointerdown"
  >
    <template v-if="variant === 'segmented'">
      <MlSegmented
        :model-value="segmentValue"
        :options="options"
        :size="size"
        :disabled="disabled"
        :label="label ?? loc.theme.label"
        @update:model-value="(v) => choose(v as MlThemeMode)"
      >
        <template #option="{ option }">
          <svg class="ml-segmented__icon ml-theme-toggle__icon" viewBox="0 0 24 24" aria-hidden="true">
            <path :d="themeIcons[glyphOf[option.value as MlThemeMode] ?? 'system']" />
          </svg>
          <span>{{ option.label }}</span>
        </template>
      </MlSegmented>
    </template>

    <button
      v-else-if="variant === 'icon'"
      :id="controlId"
      type="button"
      class="ml-theme-toggle__button"
      :aria-label="label ?? (shown === 'dark' ? loc.theme.toLight : loc.theme.toDark)"
      :title="label ?? (shown === 'dark' ? loc.theme.toLight : loc.theme.toDark)"
      :disabled="disabled"
      @click="flip"
    >
      <span class="ml-theme-toggle__orb" aria-hidden="true">
        <svg class="ml-theme-toggle__glyph ml-theme-toggle__glyph--moon" viewBox="0 0 24 24" aria-hidden="true"><path :d="themeIcons.moon" /></svg>
        <svg class="ml-theme-toggle__glyph ml-theme-toggle__glyph--sun" viewBox="0 0 24 24" aria-hidden="true"><path :d="themeIcons.sun" /></svg>
      </span>
    </button>

    <template v-else>
      <button
        :id="controlId"
        type="button"
        role="switch"
        class="ml-theme-toggle__control"
        :aria-checked="shown === 'light'"
        :aria-label="label ? undefined : loc.theme.switch"
        :disabled="disabled"
        @click="flip"
      >
        <span class="ml-theme-toggle__track" aria-hidden="true">
          <svg class="ml-theme-toggle__mark ml-theme-toggle__mark--moon" viewBox="0 0 24 24" aria-hidden="true"><path :d="themeIcons.moon" /></svg>
          <svg class="ml-theme-toggle__mark ml-theme-toggle__mark--sun" viewBox="0 0 24 24" aria-hidden="true"><path :d="themeIcons.sun" /></svg>
          <span class="ml-theme-toggle__knob">
            <svg class="ml-theme-toggle__glyph ml-theme-toggle__glyph--moon" viewBox="0 0 24 24" aria-hidden="true"><path :d="themeIcons.moon" /></svg>
            <svg class="ml-theme-toggle__glyph ml-theme-toggle__glyph--sun" viewBox="0 0 24 24" aria-hidden="true"><path :d="themeIcons.sun" /></svg>
          </span>
        </span>
      </button>
      <label v-if="label" :for="controlId" class="ml-theme-toggle__label">{{ label }}</label>
    </template>
  </div>
</template>
