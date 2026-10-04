<script setup lang="ts">
import { computed, ref } from 'vue'
import MlCopyButton from './MlCopyButton.vue'
import { textClasses, textTag } from './typography'
import type { MlTextSize, MlTextTone } from '../types'

const props = withDefaults(
  defineProps<{
    /** Element to render. Defaults to code / mark / del / strong from the flags, else span. */
    as?: string
    tone?: MlTextTone
    size?: MlTextSize
    strong?: boolean
    italic?: boolean
    underline?: boolean
    /** Struck through (renders <del>). */
    delete?: boolean
    /** Highlighted (renders <mark>). */
    mark?: boolean
    /** Inline code chip (renders <code>). */
    code?: boolean
    /** Monospace digits and letters, e.g. order numbers. */
    mono?: boolean
    /** true cuts to one line with "…"; a number clamps to that many lines. */
    ellipsis?: boolean | number
    /** Adds a copy button; true copies the text shown, a string copies that instead. */
    copyable?: boolean | string
  }>(),
  { tone: 'default' },
)

const body = ref<HTMLElement>()
const tag = computed(() => textTag(props))
const classes = computed(() => textClasses(props))
const lines = computed(() => (typeof props.ellipsis === 'number' && props.ellipsis > 1 ? props.ellipsis : undefined))
const copyValue = () => (typeof props.copyable === 'string' ? props.copyable : (body.value?.textContent ?? '').trim())
</script>

<template>
  <component :is="tag" :class="classes" :style="lines ? { '--ml-text-lines': lines } : undefined">
    <template v-if="copyable">
      <span ref="body" class="ml-text__body"><slot /></span>
      <MlCopyButton class="ml-text__copy" :value="copyValue" size="sm" :stamp="false" />
    </template>
    <slot v-else />
  </component>
</template>
