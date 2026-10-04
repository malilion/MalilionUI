import { useEffect, useRef, useState } from 'react'

/**
 * A ref and the element's width in px, following the container. Starts at
 * `initial` (so server and first client render agree); updates wait for the
 * next frame so a re-layout can't trigger "ResizeObserver loop" errors.
 */
export function useChartWidth<T extends HTMLElement>(initial = 600) {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(initial)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (el.clientWidth) setWidth(el.clientWidth)
    if (typeof ResizeObserver === 'undefined') return
    let frame = 0
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.max(80, Math.round(entry.contentRect.width))
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setWidth(next))
    })
    observer.observe(el)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [])
  return [ref, width] as const
}
