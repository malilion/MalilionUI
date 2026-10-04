<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { motionGate } from './ambient'
import { auroraPalette, auroraVars, type MlAuroraPalette } from './aurora'

const props = withDefaults(
  defineProps<{
    /** Brand palette, or your own colours (cycled over the four lights). */
    palette?: MlAuroraPalette | string[]
    /** 0–1: how strongly the lights show. */
    intensity?: number
    /** Speed multiplier (2 = twice as fast). */
    speed?: number
    /** Film grain over the light. */
    grain?: boolean
    /** HUD scanlines over the light. */
    scanlines?: boolean
    /** Hold the lights still. */
    paused?: boolean
    tag?: string
  }>(),
  { palette: 'pride', intensity: 0.7, speed: 1, grain: true, scanlines: false, tag: 'div' },
)

const kind = computed(() => auroraPalette(props.palette))
const vars = computed(() =>
  auroraVars({ intensity: props.intensity, speed: props.speed, colors: Array.isArray(props.palette) ? props.palette : undefined }),
)

// CSS does the motion; JS only pauses it off screen / in a hidden tab.
const running = ref(true)
const root = ref<HTMLElement>()
let stop: (() => void) | undefined
onMounted(() => {
  if (root.value) stop = motionGate(root.value, (s) => (running.value = s.inView && s.visible))
})
onBeforeUnmount(() => stop?.())
</script>

<template>
  <component
    :is="tag"
    ref="root"
    :class="[
      'ml-aurora',
      `ml-aurora--${kind}`,
      { 'ml-aurora--grain': grain, 'ml-aurora--scanlines': scanlines, 'ml-aurora--paused': paused || !running },
    ]"
    :style="vars"
  >
    <div class="ml-aurora__sky" aria-hidden="true">
      <span class="ml-aurora__blob ml-aurora__blob--1" />
      <span class="ml-aurora__blob ml-aurora__blob--2" />
      <span class="ml-aurora__blob ml-aurora__blob--3" />
      <span class="ml-aurora__blob ml-aurora__blob--4" />
    </div>
    <div v-if="$slots.default" class="ml-aurora__content"><slot /></div>
  </component>
</template>
