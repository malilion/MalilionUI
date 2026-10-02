<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    /** Pin when the element's top reaches this many px from the top. */
    offsetTop?: number
    /** Pin to the bottom instead, this many px up. Overrides offsetTop. */
    offsetBottom?: number
    /** Scroll container to watch; defaults to the window. */
    target?: string | HTMLElement
    zIndex?: number
  }>(),
  { offsetTop: 0, zIndex: 100 },
)

const emit = defineEmits<{ change: [fixed: boolean] }>()

const holder = ref<HTMLElement>()
const fixed = ref(false)
const box = ref({ width: 0, height: 0, left: 0, top: 0 })
let container: HTMLElement | Window | null = null
let frame = 0

function resolveTarget(): HTMLElement | Window {
  if (!props.target) return window
  if (typeof props.target === 'string') return document.querySelector<HTMLElement>(props.target) ?? window
  return props.target
}

function update() {
  frame = 0
  const el = holder.value
  if (!el || !container) return
  const rect = el.getBoundingClientRect()
  const area =
    container === window
      ? { top: 0, bottom: window.innerHeight }
      : (container as HTMLElement).getBoundingClientRect()

  let pin = false
  let top = 0
  if (props.offsetBottom !== undefined) {
    const limit = area.bottom - props.offsetBottom
    pin = rect.bottom > limit
    top = limit - rect.height
  } else {
    const limit = area.top + props.offsetTop
    pin = rect.top < limit
    top = limit
  }
  box.value = { width: rect.width, height: rect.height, left: rect.left, top }
  if (pin !== fixed.value) {
    fixed.value = pin
    emit('change', pin)
  }
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(update)
}

function bind() {
  container?.removeEventListener('scroll', schedule)
  container = resolveTarget()
  container.addEventListener('scroll', schedule, { passive: true })
  update()
}

onMounted(() => {
  bind()
  window.addEventListener('resize', schedule)
})
watch(() => props.target, bind)
watch(() => [props.offsetTop, props.offsetBottom], schedule)
onBeforeUnmount(() => {
  container?.removeEventListener('scroll', schedule)
  window.removeEventListener('resize', schedule)
  cancelAnimationFrame(frame)
})

defineExpose({ update })
</script>

<template>
  <div ref="holder" class="ml-affix" :style="fixed ? { height: `${box.height}px` } : undefined">
    <div
      :class="['ml-affix__inner', { 'ml-affix__inner--fixed': fixed }]"
      :style="
        fixed
          ? { position: 'fixed', top: `${box.top}px`, left: `${box.left}px`, width: `${box.width}px`, zIndex }
          : undefined
      "
    >
      <slot :fixed="fixed" />
    </div>
  </div>
</template>
