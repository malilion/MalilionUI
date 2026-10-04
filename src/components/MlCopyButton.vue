<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import MlPaw from './MlPaw.vue'
import { COPY_ICON, COPIED_ICON, copyButtonClasses, copySourceText } from './copy'
import type { MlCopySource } from '../clipboard'
import { useClipboard } from '../useClipboard'
import { pawStamp } from '../pawStamp'
import { useLocale } from '../locale'
import type { MlCopyButtonVariant, MlPawTone, MlSize } from '../types'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    /** What to copy: a string, `{ text, html }`, or a (possibly async) getter. */
    value: MlCopySource
    /** icon: a ghost icon button; button: icon + text; inline: the text with a small button after it. */
    variant?: MlCopyButtonVariant
    size?: MlSize
    /** Label / tooltip before copying. Default "複製". */
    label?: string
    /** Label / tooltip after copying. Default "已複製！". */
    copiedLabel?: string
    /** How long the copied state lasts, in ms. */
    timeout?: number
    /** Pop a paw print on success; true = gold, or pick a tone. */
    stamp?: boolean | MlPawTone
    /** Hover / focus tooltip for the icon and inline variants. */
    tooltip?: boolean
    placement?: 'top' | 'bottom'
    disabled?: boolean
  }>(),
  { variant: 'icon', size: 'md', timeout: 1500, stamp: true, tooltip: true, placement: 'top' },
)

const emit = defineEmits<{ copy: [text: string]; error: [error: Error] }>()

const { copy, copied, error } = useClipboard({ timeout: props.timeout })
const failed = ref(false)
let failTimer: ReturnType<typeof setTimeout> | undefined
onBeforeUnmount(() => clearTimeout(failTimer))

const idle = computed(() => props.label ?? loc.value.copy.copy)
const done = computed(() => props.copiedLabel ?? loc.value.copy.copied)
const current = computed(() => (copied.value ? done.value : failed.value ? loc.value.copy.failed : idle.value))
const inlineText = computed(() => copySourceText(props.value))
const classes = computed(() => copyButtonClasses(props.variant, props.size))

async function onClick(event: MouseEvent) {
  if (props.disabled) return
  const button = event.currentTarget as HTMLElement | null
  let text = ''
  const ok = await copy(async () => {
    const v = typeof props.value === 'function' ? await props.value() : props.value
    text = typeof v === 'string' ? v : (v?.text ?? '')
    return v
  })
  clearTimeout(failTimer)
  failed.value = !ok
  if (!ok) {
    failTimer = setTimeout(() => (failed.value = false), props.timeout)
    emit('error', error.value ?? new Error('Copy to clipboard failed'))
    return
  }
  emit('copy', text)
  if (props.stamp !== false) {
    const tone = typeof props.stamp === 'string' && props.stamp !== 'current' ? props.stamp : 'gold'
    // Pointer: where it was pressed. Keyboard (detail 0): the button's centre.
    if (event.detail > 0 && (event.clientX || event.clientY)) pawStamp(event.clientX, event.clientY, tone)
    else if (button) {
      const r = button.getBoundingClientRect()
      pawStamp(r.left + r.width / 2, r.top + r.height / 2, tone)
    }
  }
}

defineExpose({ copy: () => copy(props.value), copied })
</script>

<template>
  <span
    :class="[
      'ml-copy',
      `ml-copy--${variant}`,
      `ml-copy--${size}`,
      `ml-copy--tip-${placement}`,
      { 'ml-copy--copied': copied, 'ml-copy--failed': failed },
    ]"
  >
    <span v-if="variant === 'inline'" class="ml-copy__text"><slot>{{ inlineText }}</slot></span>
    <button
      type="button"
      :class="classes"
      :disabled="disabled"
      :aria-label="variant === 'button' ? undefined : current"
      @click="onClick"
    >
      <span class="ml-copy__icon" aria-hidden="true">
        <svg
          class="ml-copy__glyph"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="square"
          stroke-linejoin="miter"
        >
          <path :d="copied ? COPIED_ICON : COPY_ICON" />
        </svg>
        <MlPaw v-if="copied" class="ml-copy__paw" />
      </span>
      <span v-if="variant === 'button'" class="ml-copy__label">{{ current }}</span>
    </button>
    <span v-if="tooltip && variant !== 'button'" class="ml-copy__tip" aria-hidden="true">{{ current }}</span>
    <span class="ml-visually-hidden" role="status" aria-live="polite">{{ copied ? done : failed ? loc.copy.failed : '' }}</span>
  </span>
</template>
