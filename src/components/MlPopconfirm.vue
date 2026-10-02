<script setup lang="ts">
import { nextTick, ref, useId, watch } from 'vue'
import MlButton from './MlButton.vue'
import MlIcon from './MlIcon.vue'
import MlPopover from './MlPopover.vue'
import type { MlPlacement } from '../types'

const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    /** "danger" paints the confirm button red (deleting, revoking…). */
    tone?: 'warning' | 'danger' | 'info'
    confirmText?: string
    cancelText?: string
    placement?: MlPlacement
    disabled?: boolean
  }>(),
  { tone: 'warning', confirmText: '確定', cancelText: '取消', placement: 'top' },
)

const emit = defineEmits<{ confirm: []; cancel: [] }>()
const open = defineModel<boolean>('open', { default: false })

const descId = `ml-popconfirm-${useId()}-desc`
const popover = ref<InstanceType<typeof MlPopover>>()
const cancelBtn = ref<InstanceType<typeof MlButton>>()

// Land on "cancel", so a stray Enter never confirms something destructive.
watch(open, async (isOpen) => {
  if (!isOpen) return
  await nextTick()
  const el = (cancelBtn.value?.$el as HTMLElement | undefined) ?? popover.value?.panel
  el?.focus()
})

function confirm() {
  emit('confirm')
  popover.value?.hide(true)
}

function cancel() {
  emit('cancel')
  popover.value?.hide(true)
}
</script>

<template>
  <MlPopover
    ref="popover"
    v-model:open="open"
    :placement="placement"
    :disabled="disabled"
    trigger="click"
    :describedby="description || $slots.description ? descId : undefined"
    :class="['ml-popconfirm', `ml-popconfirm--${tone}`]"
  >
    <template #default="slotProps"><slot v-bind="slotProps" /></template>
    <template #title>
      <MlIcon :name="tone" class="ml-popconfirm__icon" />
      <span>{{ title }}</span>
    </template>
    <template #content>
      <p v-if="description || $slots.description" :id="descId" class="ml-popconfirm__desc">
        <slot name="description">{{ description }}</slot>
      </p>
      <div class="ml-popconfirm__actions">
        <MlButton ref="cancelBtn" size="sm" variant="ghost" @click="cancel">{{ cancelText }}</MlButton>
        <MlButton size="sm" :variant="tone === 'danger' ? 'danger' : 'primary'" @click="confirm">
          {{ confirmText }}
        </MlButton>
      </div>
    </template>
  </MlPopover>
</template>
