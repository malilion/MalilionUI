<script setup lang="ts">
import { computed } from 'vue'
import MlToastCard from './MlToastCard.vue'
import { toast, toastState } from '../toast'
import type { MlToastPlacement } from '../types'

const props = withDefaults(
  defineProps<{
    placement?: MlToastPlacement
    /** Older toasts beyond this are hidden until newer ones leave. */
    max?: number
  }>(),
  { placement: 'bottom-right', max: 5 },
)

const visible = computed(() => toastState.items.slice(-props.max))
</script>

<template>
  <Teleport to="body">
    <section :class="['ml-toast-host', `ml-toast-host--${placement}`]" aria-label="通知">
      <TransitionGroup tag="ol" name="ml-toast" class="ml-toast-host__list" aria-live="polite" aria-relevant="additions">
        <MlToastCard v-for="item in visible" :key="item.id" :item="item" @close="toast.dismiss(item.id)" />
      </TransitionGroup>
    </section>
  </Teleport>
</template>
