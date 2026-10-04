<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  mountParticles,
  type MlParticlesInteraction,
  type MlParticlesShape,
  type MlParticlesTone,
  type ParticlesController,
  type ParticlesOptions,
} from './particles'

const props = withDefaults(
  defineProps<{
    tone?: MlParticlesTone
    /** Particles per 100×100 px. */
    density?: number
    /** Upper bound on the particle count, whatever the area. */
    max?: number
    /** Dots, or tiny paw prints. */
    shape?: MlParticlesShape
    /** Particles closer than this (px) are linked by a line; 0 turns lines off. */
    linkDistance?: number
    /** What the pointer does to nearby particles. */
    interaction?: MlParticlesInteraction
    /** Click (outside links / buttons) to burst. */
    burst?: boolean
    /** Drift speed multiplier. */
    speed?: number
    /** Frame-rate cap. */
    fps?: number
    paused?: boolean
    /** Same seed, same starting layout. */
    seed?: number
    tag?: string
  }>(),
  {
    tone: 'gold',
    density: 1.2,
    max: 220,
    shape: 'dot',
    linkDistance: 110,
    interaction: 'repel',
    burst: true,
    speed: 1,
    fps: 60,
    paused: false,
    seed: 7,
    tag: 'div',
  },
)

const root = ref<HTMLElement>()
const canvas = ref<HTMLCanvasElement>()
let ctl: ParticlesController | undefined

const options = (): ParticlesOptions => ({
  density: props.density,
  max: props.max,
  shape: props.shape,
  linkDistance: props.linkDistance,
  interaction: props.interaction,
  burst: props.burst,
  speed: props.speed,
  fps: props.fps,
  paused: props.paused,
  seed: props.seed,
})

onMounted(() => {
  if (root.value && canvas.value) ctl = mountParticles(root.value, canvas.value, options())
})
watch(options, (o) => ctl?.update(o))
onBeforeUnmount(() => ctl?.destroy())

defineExpose({
  /** Burst at (x, y), in px from the element's top-left corner. */
  burst: (x: number, y: number) => ctl?.burst(x, y),
})
</script>

<template>
  <component
    :is="tag"
    ref="root"
    :class="['ml-particles', `ml-particles--${tone}`, { 'ml-particles--burst': burst }]"
  >
    <canvas ref="canvas" class="ml-particles__canvas" aria-hidden="true" />
    <div v-if="$slots.default" class="ml-particles__content"><slot /></div>
  </component>
</template>
