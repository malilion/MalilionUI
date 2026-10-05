// Shared logic of MlTabs / <Tabs>: closing, reordering and the scrolling strip.
import type { MlTabItem } from '../types'

/**
 * Which tab to select after `value` is closed: the nearest enabled tab to the
 * right, else to the left; `undefined` when nothing is left. Apps call it in
 * their `close` handler before removing the tab, and select the result when
 * the closed tab was the active one.
 */
export function nextTabAfterClose(items: readonly MlTabItem[], value: string): string | undefined {
  const at = items.findIndex((item) => item.value === value)
  if (at < 0) return undefined
  const right = items.slice(at + 1).find((item) => !item.disabled)
  if (right) return right.value
  return [...items.slice(0, at)].reverse().find((item) => !item.disabled)?.value
}

/** @internal `values` with `value` moved to index `to` (clamped), counted after it is taken out. */
export function moveTab(values: readonly string[], value: string, to: number): string[] {
  const rest = values.filter((v) => v !== value)
  if (rest.length === values.length) return [...values]
  rest.splice(Math.max(0, Math.min(to, rest.length)), 0, value)
  return rest
}

/**
 * @internal Insertion slot (0 … boxes.length) for a pointer at `x`: before the
 * first tab whose midpoint is past it. Boxes are the tabs' left / width, in order.
 */
export function tabDropSlot(boxes: readonly { left: number; width: number }[], x: number): number {
  const i = boxes.findIndex((box) => x < box.left + box.width / 2)
  return i < 0 ? boxes.length : i
}

/** @internal The order after dropping `value` into `slot` (a slot counted before it is taken out). */
export function dropTab(values: readonly string[], value: string, slot: number): string[] {
  const from = values.indexOf(value)
  return moveTab(values, value, slot > from ? slot - 1 : slot)
}

/** @internal Whether the strip has hidden tabs to either side. */
export function tabOverflow(el: { scrollLeft: number; clientWidth: number; scrollWidth: number }) {
  return { start: el.scrollLeft > 1, end: el.scrollLeft + el.clientWidth < el.scrollWidth - 1 }
}

/**
 * @internal scrollLeft that brings a tab at `left` / `width` into view, with
 * `pad` px to spare (room for the scroll buttons); `undefined` when it already is.
 */
export function scrollToReveal(view: { scrollLeft: number; clientWidth: number }, left: number, width: number, pad = 32): number | undefined {
  if (left - pad < view.scrollLeft) return Math.max(0, left - pad)
  if (left + width + pad > view.scrollLeft + view.clientWidth) return left + width + pad - view.clientWidth
  return undefined
}
