<script setup lang="ts">
import { computed } from 'vue'
import MlIcon from './MlIcon.vue'
import MlMascot from './MlMascot.vue'
import MlPaw from './MlPaw.vue'
import type { IconName } from './icons'
import type { MlResultStatus } from '../types'
import { useLocale } from '../locale'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    status?: MlResultStatus
    title?: string
    subtitle?: string
    /** Hide the lion on the error-code pages. */
    hideMascot?: boolean
  }>(),
  { status: 'info' },
)

const icons: Partial<Record<MlResultStatus, IconName>> = { success: 'success', info: 'info', warning: 'warning', error: 'danger' }

/** Default copy comes from the locale; the icon from the status. */
const preset = computed(() => ({ ...loc.value.result[props.status], icon: icons[props.status] }))
const isCode = computed(() => /^\d+$/.test(props.status))
/** The digits of an error code, with every 0 drawn as a paw print. */
const digits = computed(() => (isCode.value ? [...props.status] : []))
</script>

<template>
  <section :class="['ml-result', `ml-result--${status}`, { 'ml-result--code': isCode }]">
    <div class="ml-result__art" aria-hidden="true">
      <slot name="art">
        <template v-if="isCode">
          <div class="ml-result__code">
            <template v-for="(d, i) in digits" :key="i">
              <span v-if="d === '0'" class="ml-result__zero" :style="{ '--_i': i }"><MlPaw tone="gold" /></span>
              <span v-else class="ml-result__digit ml-metal-text" :style="{ '--_i': i }">{{ d }}</span>
            </template>
          </div>
          <MlMascot v-if="!hideMascot" pose="full" :size="132" title="" class="ml-result__lion" />
        </template>
        <span v-else class="ml-result__emblem">
          <MlIcon :name="preset.icon!" />
        </span>
      </slot>
    </div>
    <h2 class="ml-result__title"><slot name="title">{{ title ?? preset.title }}</slot></h2>
    <p class="ml-result__subtitle"><slot name="subtitle">{{ subtitle ?? preset.subtitle }}</slot></p>
    <div v-if="$slots.default" class="ml-result__content"><slot /></div>
    <div v-if="$slots.actions" class="ml-result__actions"><slot name="actions" /></div>
  </section>
</template>
