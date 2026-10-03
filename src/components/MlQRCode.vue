<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import { mascotImages } from '../mascot'
import { encodeQr, type QrLevel } from '../qrcode'
import { useLocale } from '../locale'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    value: string
    /** Rendered width/height in px. */
    size?: number
    /** Error correction; a centre logo forces at least Q. */
    level?: QrLevel
    /** Module shape. rounded softens only the outer corners, so scanning stays reliable. */
    shape?: 'square' | 'rounded'
    /** Centre badge: a paw print, the lion, or nothing. */
    logo?: 'paw' | 'lion' | 'none'
    /** Quiet zone around the code, in modules. */
    margin?: number
    /** Module and background colours. Keep strong contrast or phones can't read it. */
    color?: string
    background?: string
    /** Corner "eyes" colour. */
    eyeColor?: string
    /** Accessible description; defaults to the encoded text. */
    title?: string
  }>(),
  {
    size: 200,
    level: 'M',
    shape: 'rounded',
    logo: 'none',
    margin: 2,
    color: '#12151c',
    background: '#f4f6f9',
    eyeColor: '#a96c0e',
  },
)

const uid = `ml-qr-${useId()}`
const svg = ref<SVGSVGElement>()

const level = computed<QrLevel>(() => (props.logo !== 'none' && (props.level === 'L' || props.level === 'M') ? 'Q' : props.level))
const matrix = computed(() => {
  try {
    return encodeQr(props.value, level.value)
  } catch {
    return null // longer than a version-40 code can hold
  }
})

const total = computed(() => (matrix.value?.size ?? 21) + props.margin * 2)

/** Square hole in the middle for the logo (about a fifth of the code). */
const hole = computed(() => {
  const m = matrix.value
  if (!m || props.logo === 'none') return null
  const span = Math.round(m.size * 0.22) | 1 // odd, so it centres on a module
  const start = (m.size - span) / 2
  return { start, end: start + span, span }
})

const inHole = (x: number, y: number) => {
  const h = hole.value
  return !!h && x >= h.start - 0.5 && x < h.end + 0.5 && y >= h.start - 0.5 && y < h.end + 0.5
}

/** Every dark data module as one path (finder eyes are drawn separately). */
const dataPath = computed(() => {
  const m = matrix.value
  if (!m) return ''
  const o = props.margin
  const out: string[] = []
  const finder = (x: number, y: number) =>
    (x < 7 && y < 7) || (x >= m.size - 7 && y < 7) || (x < 7 && y >= m.size - 7)
  const dark = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < m.size && y < m.size && m.modules[y][x] && !finder(x, y) && !inHole(x, y)
  const r = 0.38
  for (let y = 0; y < m.size; y++) {
    for (let x = 0; x < m.size; x++) {
      if (!dark(x, y)) continue
      const px = x + o
      const py = y + o
      if (props.shape === 'square') {
        out.push(`M${px} ${py}h1v1h-1z`)
        continue
      }
      // Round a corner only where both neighbours on that side are light, so
      // touching modules merge into solid shapes (much easier to scan).
      const up = dark(x, y - 1)
      const down = dark(x, y + 1)
      const left = dark(x - 1, y)
      const right = dark(x + 1, y)
      const tl = !up && !left ? r : 0
      const tr = !up && !right ? r : 0
      const br = !down && !right ? r : 0
      const bl = !down && !left ? r : 0
      out.push(
        `M${px + tl} ${py}h${1 - tl - tr}` +
          (tr ? `a${tr} ${tr} 0 0 1 ${tr} ${tr}` : '') +
          `v${1 - tr - br}` +
          (br ? `a${br} ${br} 0 0 1 -${br} ${br}` : '') +
          `h-${1 - br - bl}` +
          (bl ? `a${bl} ${bl} 0 0 1 -${bl} -${bl}` : '') +
          `v-${1 - bl - tl}` +
          (tl ? `a${tl} ${tl} 0 0 1 ${tl} -${tl}` : '') +
          'z',
      )
    }
  }
  return out.join('')
})

/** The three corner eyes: an outer ring and an inner pupil each. */
const eyes = computed(() => {
  const m = matrix.value
  if (!m) return []
  const o = props.margin
  return [
    [0, 0],
    [m.size - 7, 0],
    [0, m.size - 7],
  ].map(([x, y]) => ({ x: x + o, y: y + o }))
})

const radius = computed(() => (props.shape === 'square' ? { outer: 0, inner: 0 } : { outer: 1.8, inner: 0.9 }))

/** The SVG markup, e.g. to save as a file. */
function toSVG() {
  return svg.value ? new XMLSerializer().serializeToString(svg.value) : ''
}

/** A PNG data URL at `scale`× the rendered size. */
function toDataURL(scale = 2): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const px = props.size * scale
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = px
      canvas.getContext('2d')!.drawImage(img, 0, 0, px, px)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = reject
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(toSVG())}`
  })
}

defineExpose({ toSVG, toDataURL })
</script>

<template>
  <figure class="ml-qr" :style="{ '--_size': `${size}px` }">
    <svg
      v-if="matrix"
      ref="svg"
      xmlns="http://www.w3.org/2000/svg"
      :viewBox="`0 0 ${total} ${total}`"
      :width="size"
      :height="size"
      role="img"
      :aria-label="title ?? loc.qrcode.label(value)"
      shape-rendering="geometricPrecision"
    >
      <rect :width="total" :height="total" :fill="background" rx="1" />
      <path :d="dataPath" :fill="color" />
      <g v-for="(eye, i) in eyes" :key="i" :fill="eyeColor">
        <path
          :d="`M${eye.x} ${eye.y}m${radius.outer} 0h${7 - radius.outer * 2}a${radius.outer} ${radius.outer} 0 0 1 ${radius.outer} ${radius.outer}v${7 - radius.outer * 2}a${radius.outer} ${radius.outer} 0 0 1 -${radius.outer} ${radius.outer}h-${7 - radius.outer * 2}a${radius.outer} ${radius.outer} 0 0 1 -${radius.outer} -${radius.outer}v-${7 - radius.outer * 2}a${radius.outer} ${radius.outer} 0 0 1 ${radius.outer} -${radius.outer}z
             M${eye.x + 1} ${eye.y + 1}v5h5v-5z`"
          fill-rule="evenodd"
        />
        <rect :x="eye.x + 2" :y="eye.y + 2" width="3" height="3" :rx="radius.inner" />
      </g>
      <g v-if="hole && logo !== 'none'">
        <rect
          :x="hole.start + margin - 0.5"
          :y="hole.start + margin - 0.5"
          :width="hole.span + 1"
          :height="hole.span + 1"
          :rx="1.2"
          :fill="background"
        />
        <template v-if="logo === 'paw'">
          <g :transform="`translate(${hole.start + margin + hole.span / 2} ${hole.start + margin + hole.span / 2}) scale(${hole.span / 24})`" :fill="eyeColor">
            <ellipse cx="0" cy="3.4" rx="5.4" ry="4.4" />
            <ellipse cx="-6.6" cy="-2.4" rx="2.1" ry="2.6" transform="rotate(-20 -6.6 -2.4)" />
            <ellipse cx="-2.4" cy="-6" rx="2.1" ry="2.7" transform="rotate(-6 -2.4 -6)" />
            <ellipse cx="2.4" cy="-6" rx="2.1" ry="2.7" transform="rotate(6 2.4 -6)" />
            <ellipse cx="6.6" cy="-2.4" rx="2.1" ry="2.6" transform="rotate(20 6.6 -2.4)" />
          </g>
        </template>
        <template v-else>
          <clipPath :id="`${uid}-clip`">
            <circle
              :cx="hole.start + margin + hole.span / 2"
              :cy="hole.start + margin + hole.span / 2"
              :r="hole.span / 2"
            />
          </clipPath>
          <image
            :href="mascotImages.avatar"
            :x="hole.start + margin"
            :y="hole.start + margin"
            :width="hole.span"
            :height="hole.span"
            :clip-path="`url(#${uid}-clip)`"
            preserveAspectRatio="xMidYMid slice"
          />
        </template>
      </g>
    </svg>
    <p v-else class="ml-qr__error" role="alert">{{ loc.qrcode.tooLong }}</p>
    <figcaption v-if="$slots.default" class="ml-qr__caption"><slot /></figcaption>
  </figure>
</template>
