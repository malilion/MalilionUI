import type { Directive } from 'vue'
import { createPawSvg } from './components/paw'
import type { MlPawTone } from './types'

type StampValue = boolean | MlPawTone | undefined
type StampedElement = HTMLElement & { __mlPawStamp?: { tone: StampValue; handler: (e: PointerEvent) => void } }

function isInactive(el: HTMLElement) {
  return (el as HTMLButtonElement).disabled || el.getAttribute('aria-disabled') === 'true'
}

/** Pop a paw print at a viewport point. It floats up, fades and removes itself. */
export function pawStamp(x: number, y: number, tone: MlPawTone = 'gold') {
  if (typeof window === 'undefined') return
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  const stamp = document.createElement('span')
  stamp.className = `ml-paw-stamp ml-paw-stamp--${tone}`
  stamp.style.left = `${x}px`
  stamp.style.top = `${y}px`
  stamp.style.setProperty('--_tilt', `${Math.round(Math.random() * 40 - 20)}deg`)
  stamp.appendChild(createPawSvg())
  stamp.addEventListener('animationend', () => stamp.remove(), { once: true })
  document.body.appendChild(stamp)
  // Safety net if animations are disabled some other way.
  setTimeout(() => stamp.remove(), 1200)
}

/**
 * `v-paw-stamp` — every press leaves a little paw print.
 * Value: true / a tone ('gold' | 'bean' | 'steel' | 'tech'); false turns it off.
 */
export const vPawStamp: Directive<StampedElement, StampValue> = {
  mounted(el, binding) {
    const state = {
      tone: binding.value,
      handler: (event: PointerEvent) => {
        if (state.tone === false || isInactive(el)) return
        const tone = typeof state.tone === 'string' && state.tone !== 'current' ? state.tone : 'gold'
        pawStamp(event.clientX, event.clientY, tone)
      },
    }
    el.__mlPawStamp = state
    el.addEventListener('pointerdown', state.handler)
  },
  updated(el, binding) {
    if (el.__mlPawStamp) el.__mlPawStamp.tone = binding.value
  },
  unmounted(el) {
    if (el.__mlPawStamp) el.removeEventListener('pointerdown', el.__mlPawStamp.handler)
    delete el.__mlPawStamp
  },
}
