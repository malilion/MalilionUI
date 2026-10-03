<script setup lang="ts">
import { computed } from 'vue'
import MlIcon from './MlIcon.vue'
import MlMascot from './MlMascot.vue'
import MlPaw from './MlPaw.vue'
import type { IconName } from './icons'
import type { MlResultStatus } from '../types'

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

const presets: Record<MlResultStatus, { title: string; subtitle: string; icon?: IconName }> = {
  success: { title: '完成了！', subtitle: '一切順利，獅群為你歡呼。', icon: 'success' },
  info: { title: '提醒你一下', subtitle: '這裡有些資訊值得留意。', icon: 'info' },
  warning: { title: '請再確認一次', subtitle: '有些地方看起來不太對勁。', icon: 'warning' },
  error: { title: '出了點問題', subtitle: '動作沒有完成，請稍後再試。', icon: 'danger' },
  '403': { title: '這裡是獅王的領地', subtitle: '你沒有權限進入這個頁面。' },
  '404': { title: '找不到這個頁面', subtitle: '小獅子把它叼走了，或是它從來不存在。' },
  '500': { title: '伺服器打了個盹', subtitle: '我們的工程獅正在搶修，請稍後再回來。' },
}

const preset = computed(() => presets[props.status])
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
