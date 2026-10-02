<script setup lang="ts">
import { pawBurst, type PawBurstOptions } from '../pawStamp'
import type { MlPawTone } from '../types'

const props = withDefaults(
  defineProps<{
    count?: number
    tones?: Exclude<MlPawTone, 'current'>[]
    /** Fan angle in degrees; 360 bursts in every direction. */
    spread?: number
    power?: number
    /** Burst from the pointer ("pointer") or the centre of the trigger ("center"). */
    origin?: 'pointer' | 'center'
    disabled?: boolean
  }>(),
  { count: 16, spread: 140, power: 180, origin: 'center' },
)

const emit = defineEmits<{ burst: [] }>()

function options(): PawBurstOptions {
  return { count: props.count, tones: props.tones, spread: props.spread, power: props.power }
}

function onClick(event: MouseEvent) {
  if (props.disabled) return
  const target = event.currentTarget as HTMLElement
  let x = event.clientX
  let y = event.clientY
  // Keyboard clicks report 0,0 — always use the centre for those.
  if (props.origin === 'center' || (x === 0 && y === 0)) {
    const rect = target.getBoundingClientRect()
    x = rect.left + rect.width / 2
    y = rect.top + rect.height / 2
  }
  pawBurst(x, y, options())
  emit('burst')
}

/** Fire a burst from a viewport point (or the trigger's centre). */
function fire(x?: number, y?: number) {
  pawBurst(x ?? window.innerWidth / 2, y ?? window.innerHeight / 2, options())
  emit('burst')
}

defineExpose({ fire })
</script>

<template>
  <span class="ml-pawburst" @click="onClick">
    <slot />
  </span>
</template>
