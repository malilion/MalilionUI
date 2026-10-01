<script setup lang="ts">
import { useId } from 'vue'

withDefaults(
  defineProps<{
    size?: number
    glow?: boolean
    /** Breathing mane and a periodic blink. */
    animated?: boolean
    /** Accessible name. Without it the mark is treated as decoration. */
    title?: string
  }>(),
  { size: 64 },
)

/** Points of an n-spike star around (cx, cy), as an SVG points string. */
function star(n: number, outer: number, inner: number, offsetDeg: number, cx = 32, cy = 32.5) {
  const points: string[] = []
  for (let k = 0; k < n * 2; k++) {
    const r = k % 2 === 0 ? outer : inner
    const a = ((-90 + offsetDeg + (k * 180) / n) * Math.PI) / 180
    points.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`)
  }
  return points.join(' ')
}

const maneBack = star(16, 31, 21, 11.25)
const maneFront = star(16, 27.5, 19.5, 0)

// Each instance needs its own gradient ids, or two marks on a page share one.
const uid = useId()
const ids = {
  gold: `ml-lion-gold-${uid}`,
  bronze: `ml-lion-bronze-${uid}`,
  face: `ml-lion-face-${uid}`,
  eye: `ml-lion-eye-${uid}`,
}
</script>

<template>
  <svg
    :class="['ml-lion-mark', { 'ml-lion-mark--glow': glow, 'ml-lion-mark--animated': animated }]"
    :style="{ '--_size': `${size}px` }"
    viewBox="0 0 64 64"
    :role="title ? 'img' : undefined"
    :aria-label="title"
    :aria-hidden="title ? undefined : 'true'"
  >
    <defs>
      <linearGradient :id="ids.gold" x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#fff4cc" />
        <stop offset="0.2" stop-color="#ffd56a" />
        <stop offset="0.45" stop-color="#e8a527" />
        <stop offset="0.6" stop-color="#b7780f" />
        <stop offset="0.8" stop-color="#f2bd4a" />
        <stop offset="1" stop-color="#8d5a0c" />
      </linearGradient>
      <linearGradient :id="ids.bronze" x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#e9a066" />
        <stop offset="0.5" stop-color="#a85a1e" />
        <stop offset="1" stop-color="#4a2409" />
      </linearGradient>
      <linearGradient :id="ids.face" x1="0" y1="13" x2="0" y2="50" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#2b3341" />
        <stop offset="1" stop-color="#0f131a" />
      </linearGradient>
      <radialGradient :id="ids.eye" cx="0.5" cy="0.5" r="0.6">
        <stop offset="0" stop-color="#e6fffb" />
        <stop offset="0.45" stop-color="#3eeed0" />
        <stop offset="1" stop-color="#0a9f89" />
      </radialGradient>
    </defs>

    <title v-if="title">{{ title }}</title>

    <!-- Mane: two offset rings of spikes, bronze behind gold -->
    <g class="ml-lion-mark__mane">
      <polygon :points="maneBack" :fill="`url(#${ids.bronze})`" />
      <polygon :points="maneFront" :fill="`url(#${ids.gold})`" />
    </g>

    <!-- Ears -->
    <polygon
      points="14.5,9.5 26.5,14.8 18.5,23.5"
      :fill="`url(#${ids.bronze})`"
      :stroke="`url(#${ids.gold})`"
      stroke-width="0.9"
      stroke-linejoin="bevel"
    />
    <polygon
      points="49.5,9.5 37.5,14.8 45.5,23.5"
      :fill="`url(#${ids.bronze})`"
      :stroke="`url(#${ids.gold})`"
      stroke-width="0.9"
      stroke-linejoin="bevel"
    />
    <polygon points="17.4,13.2 23.6,16 19.4,20.4" fill="#1a1f29" />
    <polygon points="46.6,13.2 40.4,16 44.6,20.4" fill="#1a1f29" />

    <!-- Face: a faceted gunmetal plate with a gold rim -->
    <polygon
      points="32,13 40,15.5 45.5,21 47,29 44.5,38 38.5,46 32,49.5 25.5,46 19.5,38 17,29 18.5,21 24,15.5"
      :fill="`url(#${ids.face})`"
      :stroke="`url(#${ids.gold})`"
      stroke-width="1.1"
      stroke-linejoin="bevel"
    />
    <polygon points="32,13 40,15.5 45.5,21 32,25 18.5,21 24,15.5" fill="#fff" opacity="0.06" />
    <polygon points="32,25 45.5,21 47,29 44.5,38 38.5,46 32,49.5" fill="#000" opacity="0.18" />

    <!-- Forehead code mark: < > -->
    <path
      d="M29.6 17.6 L27.8 19.4 L29.6 21.2 M34.4 17.6 L36.2 19.4 L34.4 21.2"
      fill="none"
      stroke="#3eeed0"
      stroke-width="0.9"
      stroke-linecap="square"
      opacity="0.9"
    />

    <!-- Brows -->
    <path
      d="M20.5 26 L29.5 27.6 M43.5 26 L34.5 27.6"
      fill="none"
      :stroke="`url(#${ids.gold})`"
      stroke-width="1.6"
      stroke-linecap="square"
    />

    <!-- Eyes -->
    <polygon class="ml-lion-mark__eye" points="21.8,29.6 29,30.6 28,33.2 23.4,32.3" :fill="`url(#${ids.eye})`" />
    <polygon class="ml-lion-mark__eye" points="42.2,29.6 35,30.6 36,33.2 40.6,32.3" :fill="`url(#${ids.eye})`" />

    <!-- Muzzle, nose, mouth -->
    <polygon points="26.5,37 32,35 37.5,37 38.5,42.5 32,47.6 25.5,42.5" fill="#2a3240" />
    <polygon points="28.4,36.6 35.6,36.6 32,40.6" :fill="`url(#${ids.gold})`" />
    <path
      d="M32 40.6 V43 M32 43 L28.4 45.2 M32 43 L35.6 45.2"
      fill="none"
      :stroke="`url(#${ids.gold})`"
      stroke-width="1.1"
      stroke-linecap="square"
    />
  </svg>
</template>
