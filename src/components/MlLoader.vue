<script setup lang="ts">
import MlPaw from './MlPaw.vue'

withDefaults(
  defineProps<{
    size?: number
    /** "reactor": the spinning mane. "paws": a cub walking across. */
    variant?: 'reactor' | 'paws'
    tone?: 'gold' | 'tech' | 'bean'
    /** Visible caption under the reactor. */
    label?: string
    /** Screen-reader text when there is no visible label. */
    srLabel?: string
  }>(),
  { size: 48, variant: 'reactor', tone: 'gold', srLabel: '載入中' },
)

// Twelve mane spikes; opacity ramps so the ticking rotation reads as a sweep.
const spikes = Array.from({ length: 12 }, (_, i) => ({
  rotate: i * 30,
  opacity: 0.18 + (0.82 * (i + 1)) / 12,
}))
</script>

<template>
  <span :class="['ml-loader', `ml-loader--${tone}`, `ml-loader--${variant}`]" role="status" :style="{ '--_size': `${size}px` }">
    <span v-if="variant === 'paws'" class="ml-loader__trail" aria-hidden="true">
      <MlPaw v-for="i in 4" :key="i" tone="current" class="ml-loader__step" :style="{ '--i': i - 1 }" />
    </span>
    <svg v-else class="ml-loader__svg" viewBox="0 0 64 64" aria-hidden="true">
      <g class="ml-loader__mane">
        <polygon
          v-for="spike in spikes"
          :key="spike.rotate"
          points="32,3 36.2,15 27.8,15"
          fill="currentColor"
          :opacity="spike.opacity"
          :transform="`rotate(${spike.rotate} 32 32)`"
        />
      </g>
      <circle
        class="ml-loader__ring"
        cx="32"
        cy="32"
        r="13"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-dasharray="3 4"
        opacity="0.55"
      />
      <g class="ml-loader__core">
        <polygon points="32,24 38.9,28 38.9,36 32,40 25.1,36 25.1,28" fill="currentColor" />
        <polygon points="32,28.5 35,30.25 35,33.75 32,35.5 29,33.75 29,30.25" fill="#fff" opacity="0.85" />
      </g>
    </svg>
    <span v-if="label" class="ml-loader__label">{{ label }}</span>
    <span v-else class="ml-visually-hidden">{{ srLabel }}</span>
  </span>
</template>
