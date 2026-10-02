<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    /** One line per string. */
    content?: string | string[]
    /** Image instead of (or with) text; drawn above it. Needs CORS for remote URLs. */
    image?: string
    imageWidth?: number
    imageHeight?: number
    fontSize?: number
    fontWeight?: number | string
    /** CSS colour. Defaults to a faint gold. */
    color?: string
    /** Degrees. */
    rotate?: number
    /** [x, y] gap between marks, px. */
    gap?: [number, number]
    zIndex?: number
  }>(),
  {
    content: '',
    imageWidth: 64,
    imageHeight: 64,
    fontSize: 14,
    fontWeight: 600,
    color: 'rgb(240 173 47 / 0.14)',
    rotate: -22,
    gap: () => [120, 100],
    zIndex: 9,
  },
)

const layer = ref<HTMLElement>()
const url = ref('')
const tile = ref({ w: 0, h: 0 })

const lines = computed(() => (Array.isArray(props.content) ? props.content : props.content ? [props.content] : []))

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

async function draw() {
  if (typeof document === 'undefined') return
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const ratio = window.devicePixelRatio || 1
  const font = `${props.fontWeight} ${props.fontSize}px ${getComputedStyle(document.body).getPropertyValue('--ml-font-mono') || 'monospace'}`
  ctx.font = font
  const lineH = props.fontSize * 1.5
  const textW = Math.max(0, ...lines.value.map((l) => ctx.measureText(l).width))
  const img = props.image ? await loadImage(props.image) : null
  const contentW = Math.max(textW, img ? props.imageWidth : 0)
  const contentH = lines.value.length * lineH + (img ? props.imageHeight + (lines.value.length ? 8 : 0) : 0)
  if (!contentW || !contentH) {
    url.value = ''
    return
  }

  const w = contentW + props.gap[0]
  const h = contentH + props.gap[1]
  canvas.width = w * ratio
  canvas.height = h * ratio
  ctx.scale(ratio, ratio)
  ctx.translate(w / 2, h / 2)
  ctx.rotate((props.rotate * Math.PI) / 180)
  let y = -contentH / 2
  if (img) {
    ctx.drawImage(img, -props.imageWidth / 2, y, props.imageWidth, props.imageHeight)
    y += props.imageHeight + (lines.value.length ? 8 : 0)
  }
  ctx.font = font
  ctx.fillStyle = props.color
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  for (const line of lines.value) {
    ctx.fillText(line, 0, y + (lineH - props.fontSize) / 2)
    y += lineH
  }
  tile.value = { w, h }
  try {
    url.value = canvas.toDataURL()
  } catch {
    url.value = '' // tainted by a non-CORS image
  }
}

const layerStyle = computed(() =>
  url.value
    ? {
        backgroundImage: `url("${url.value}")`,
        backgroundSize: `${tile.value.w}px ${tile.value.h}px`,
        zIndex: props.zIndex,
      }
    : { display: 'none' },
)

// Put the mark back if someone deletes or restyles it in devtools.
let observer: MutationObserver | undefined
let host: HTMLElement | null = null
function guard() {
  observer?.disconnect()
  host = layer.value?.parentElement ?? null
  if (!host || typeof MutationObserver === 'undefined') return
  observer = new MutationObserver((records) => {
    const tampered = records.some(
      (r) =>
        (r.type === 'childList' && [...r.removedNodes].includes(layer.value!)) ||
        (r.type === 'attributes' && r.target === layer.value),
    )
    if (!tampered || !layer.value || !host) return
    observer?.disconnect()
    if (!host.contains(layer.value)) host.appendChild(layer.value)
    layer.value.removeAttribute('hidden')
    layer.value.setAttribute('style', Object.entries(layerStyle.value).map(([k, v]) => `${k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}:${v}`).join(';'))
    guard()
  })
  observer.observe(host, { childList: true })
  if (layer.value) observer.observe(layer.value, { attributes: true, attributeFilter: ['style', 'class', 'hidden'] })
}

onMounted(async () => {
  await draw()
  guard()
})
watch(() => [props.content, props.image, props.fontSize, props.fontWeight, props.color, props.rotate, props.gap, props.imageWidth, props.imageHeight], async () => {
  observer?.disconnect()
  await draw()
  guard()
}, { deep: true })
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div class="ml-watermark">
    <slot />
    <div ref="layer" class="ml-watermark__layer" :style="layerStyle" aria-hidden="true" />
  </div>
</template>
