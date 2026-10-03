<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import MlButton from './MlButton.vue'
import MlIcon from './MlIcon.vue'
import MlModal from './MlModal.vue'
import { dialogState, settleDialog, type MlDialogRequest } from '../dialog'

dialogState.hosts++
onBeforeUnmount(() => dialogState.hosts--)

const current = computed<MlDialogRequest | undefined>(() => dialogState.queue[0])
const open = ref(false)
const text = ref('')
const input = ref<HTMLInputElement>()
/** The request currently on screen, kept while the modal animates out. */
const shown = ref<MlDialogRequest>()

watch(
  current,
  async (request) => {
    if (!request) return
    if (open.value) {
      // Let the previous dialog finish leaving before the next one enters.
      open.value = false
      await new Promise((r) => setTimeout(r, 240))
    }
    shown.value = request
    text.value = request.prompt?.defaultValue ?? ''
    open.value = true
    if (request.kind === 'prompt') {
      // After MlModal has moved focus onto its panel.
      await nextTick()
      await new Promise((r) => setTimeout(r, 30))
      input.value?.focus()
      input.value?.select()
    }
  },
  { immediate: true },
)

function answer(value: unknown) {
  const request = shown.value
  if (!request) return
  open.value = false
  settleDialog(request.id, value)
}

const cancelValue = () => (shown.value?.kind === 'prompt' ? null : shown.value?.kind === 'alert' ? undefined : false)
const confirmValue = () => (shown.value?.kind === 'prompt' ? text.value : shown.value?.kind === 'alert' ? undefined : true)

// Closing with ×, Esc or the backdrop counts as "cancel".
function onModalOpen(value: boolean) {
  if (!value && open.value) answer(cancelValue())
}

const eyebrow = computed(() => shown.value?.eyebrow ?? (shown.value?.danger ? 'Danger Zone' : undefined))
const icon = computed(() => (shown.value?.danger ? 'warning' : shown.value?.kind === 'alert' ? 'info' : null))
</script>

<template>
  <MlModal
    :open="open"
    :eyebrow="eyebrow"
    :title="shown?.title"
    :width="shown?.width ?? 440"
    class="ml-dialog"
    @update:open="onModalOpen"
  >
    <div :class="['ml-dialog__body', { 'ml-dialog__body--danger': shown?.danger }]">
      <MlIcon v-if="icon" :name="icon" class="ml-dialog__icon" />
      <div class="ml-dialog__content">
        <p v-if="shown?.message" class="ml-dialog__message">{{ shown.message }}</p>
        <form v-if="shown?.kind === 'prompt'" class="ml-dialog__form" @submit.prevent="answer(confirmValue())">
          <label v-if="shown.prompt?.label" class="ml-field__label" for="ml-dialog-input">{{ shown.prompt.label }}</label>
          <div class="ml-input">
            <input
              id="ml-dialog-input"
              ref="input"
              v-model="text"
              class="ml-input__control"
              type="text"
              autocomplete="off"
              :placeholder="shown.prompt?.placeholder"
            />
          </div>
        </form>
      </div>
    </div>
    <template #footer>
      <MlButton v-if="shown?.kind !== 'alert'" variant="ghost" @click="answer(cancelValue())">
        {{ shown?.cancelText ?? '取消' }}
      </MlButton>
      <MlButton :variant="shown?.danger ? 'danger' : 'primary'" stamp @click="answer(confirmValue())">
        {{ shown?.confirmText ?? (shown?.kind === 'alert' ? '知道了' : '確定') }}
      </MlButton>
    </template>
  </MlModal>
</template>
