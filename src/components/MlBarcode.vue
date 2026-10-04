<script setup lang="ts">
import { computed, ref } from 'vue'
import { barcodeLayout, encodeBarcode, type MlBarcodeFormat } from '../barcode'
import { useLocale } from '../locale'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    value: string
    /** code128 for general text, code39 for 手機條碼載具 / 自然人憑證, ean13 for retail. */
    format?: MlBarcodeFormat
    /** Width of the narrowest bar in px. Keep ≥ 2 for phone cameras. */
    module?: number
    /** Bar height in px. */
    height?: number
    /** Quiet zone each side, in modules (scanners need ~10). */
    margin?: number
    /** Print the human-readable line under the bars. */
    showText?: boolean
    fontSize?: number
    /** Bar and background colours. Keep dark on light or scanners can't read it. */
    color?: string
    background?: string
    /** Accessible description; defaults to the encoded text. */
    title?: string
  }>(),
  {
    format: 'code128',
    module: 2,
    height: 64,
    margin: 10,
    showText: true,
    fontSize: 14,
    color: '#12151c',
    background: '#f4f6f9',
  },
)

const svg = ref<SVGSVGElement>()

const encoding = computed(() => {
  try {
    return encodeBarcode(props.value, props.format)
  } catch {
    return null
  }
})

const layout = computed(() =>
  encoding.value
    ? barcodeLayout(encoding.value, {
        module: props.module,
        height: props.height,
        margin: props.margin,
        showText: props.showText,
        fontSize: props.fontSize,
      })
    : null,
)

/** The SVG markup, e.g. to save as a file. */
function toSVG() {
  return svg.value ? new XMLSerializer().serializeToString(svg.value) : ''
}

/** A PNG data URL at `scale`× the rendered size. */
function toDataURL(scale = 2): Promise<string> {
  return new Promise((resolve, reject) => {
    const box = layout.value
    if (!box) return reject(new Error('nothing to draw'))
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = box.width * scale
      canvas.height = box.height * scale
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = reject
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(toSVG())}`
  })
}

defineExpose({ toSVG, toDataURL })
</script>

<template>
  <figure :class="['ml-barcode', `ml-barcode--${format}`]">
    <svg
      v-if="layout && encoding"
      ref="svg"
      xmlns="http://www.w3.org/2000/svg"
      :viewBox="`0 0 ${layout.width} ${layout.height}`"
      :width="layout.width"
      :height="layout.height"
      role="img"
      :aria-label="title ?? loc.barcode.label(encoding.text)"
      shape-rendering="crispEdges"
    >
      <rect :width="layout.width" :height="layout.height" :fill="background" />
      <path :d="layout.path" :fill="color" />
      <text
        v-for="(t, i) in layout.texts"
        :key="i"
        :x="t.x"
        :y="t.y"
        :text-anchor="t.anchor"
        :font-size="fontSize"
        :fill="color"
        font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
        letter-spacing="0.08em"
      >{{ t.text }}</text>
    </svg>
    <p v-else class="ml-barcode__error" role="alert">{{ loc.barcode.invalid }}</p>
    <figcaption v-if="$slots.default" class="ml-barcode__caption"><slot /></figcaption>
  </figure>
</template>
