<script setup lang="ts">
import { computed, useId } from 'vue'
import { PAW_PAD, PAW_SHINE, PAW_TOES } from './paw'
import type { MlPawTone } from '../types'

const props = withDefaults(
  defineProps<{
    /** px number or any CSS length. Defaults to 1em so it sits in text. */
    size?: number | string
    /** 'current' follows the text colour. */
    tone?: MlPawTone
    /** Glossy highlights on the beans. Ignored for tone="current". */
    shine?: boolean
    /** Accessible name. Without it the paw is decoration. */
    title?: string
  }>(),
  { size: '1em', tone: 'gold', shine: true },
)

const gradientId = `ml-paw-${useId()}`
const length = computed(() => (typeof props.size === 'number' ? `${props.size}px` : props.size))
const fill = computed(() => (props.tone === 'current' ? 'currentColor' : `url(#${gradientId})`))

const stops: Record<Exclude<MlPawTone, 'current'>, [string, string, string]> = {
  gold: ['#ffe9a6', '#f0ad2f', '#a96c0e'],
  bean: ['#ffe3ea', '#ff8fa8', '#c94d6c'],
  steel: ['#f4f6f9', '#9ea7b5', '#414956'],
  tech: ['#d9fff8', '#3eeed0', '#0a8f7b'],
}
</script>

<template>
  <svg
    :class="['ml-paw', `ml-paw--${tone}`]"
    viewBox="0 0 24 24"
    :width="length"
    :height="length"
    :role="title ? 'img' : undefined"
    :aria-label="title"
    :aria-hidden="title ? undefined : 'true'"
    focusable="false"
  >
    <defs v-if="tone !== 'current'">
      <linearGradient :id="gradientId" x1="0" y1="2" x2="0" y2="22" gradientUnits="userSpaceOnUse">
        <stop offset="0" :stop-color="stops[tone][0]" />
        <stop offset="0.5" :stop-color="stops[tone][1]" />
        <stop offset="1" :stop-color="stops[tone][2]" />
      </linearGradient>
    </defs>
    <g :fill="fill">
      <ellipse
        v-for="toe in PAW_TOES"
        :key="toe.cx"
        :cx="toe.cx"
        :cy="toe.cy"
        :rx="toe.rx"
        :ry="toe.ry"
        :transform="`rotate(${toe.rotate} ${toe.cx} ${toe.cy})`"
      />
      <path :d="PAW_PAD" />
    </g>
    <g v-if="shine && tone !== 'current'" fill="#fff" opacity="0.6">
      <ellipse
        v-for="dot in PAW_SHINE"
        :key="dot.cx"
        :cx="dot.cx"
        :cy="dot.cy"
        :rx="dot.rx"
        :ry="dot.ry"
        :transform="`rotate(${dot.rotate} ${dot.cx} ${dot.cy})`"
      />
    </g>
  </svg>
</template>
