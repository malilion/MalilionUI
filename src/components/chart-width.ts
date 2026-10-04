import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

/**
 * The element's width in px, following the container. Starts at `initial` (so
 * server and first client render agree); updates wait for the next frame so a
 * re-layout can't trigger "ResizeObserver loop" errors.
 */
export function useChartWidth(el: Ref<HTMLElement | undefined>, initial = 600) {
  const width = ref(initial)
  let observer: ResizeObserver | undefined
  let frame = 0
  onMounted(() => {
    if (!el.value) return
    width.value = el.value.clientWidth || width.value
    if (typeof ResizeObserver === 'undefined') return
    observer = new ResizeObserver(([entry]) => {
      const next = Math.max(80, Math.round(entry.contentRect.width))
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => (width.value = next))
    })
    observer.observe(el.value)
  })
  onBeforeUnmount(() => {
    observer?.disconnect()
    cancelAnimationFrame(frame)
  })
  return width
}
