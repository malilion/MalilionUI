<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import MlActionSheet from './MlActionSheet.vue'
import { actionSheetState, settleActionSheet, type MlActionSheetRequest } from '../action-sheet'
import type { MlActionSheetAction } from '../types'

actionSheetState.hosts++
onBeforeUnmount(() => actionSheetState.hosts--)

const current = computed<MlActionSheetRequest | undefined>(() => actionSheetState.queue[0])
const open = ref(false)
/** The request on screen, kept while the sheet animates out. */
const shown = ref<MlActionSheetRequest>()

watch(
  current,
  async (request) => {
    if (!request) return
    if (open.value) {
      // Let the previous sheet finish leaving before the next one comes up.
      open.value = false
      await new Promise((r) => setTimeout(r, 300))
    }
    shown.value = request
    open.value = true
  },
  { immediate: true },
)

function answer(value: string | number | null) {
  const request = shown.value
  if (!request || !open.value) return
  open.value = false
  settleActionSheet(request.id, value)
}

const pick = (action: MlActionSheetAction) => answer(action.value ?? action.label)
</script>

<template>
  <MlActionSheet
    :open="open"
    :actions="shown?.actions"
    :title="shown?.title"
    :description="shown?.description"
    :cancel-text="shown?.cancelText"
    @select="pick"
    @cancel="answer(null)"
  />
</template>
