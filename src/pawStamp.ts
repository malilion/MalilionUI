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

export interface PawBurstOptions {
  /** How many paws fly out. */
  count?: number
  /** Tones to pick from at random. */
  tones?: Exclude<MlPawTone, 'current'>[]
  /** Fan angle in degrees, centred straight up; 360 bursts in every direction. */
  spread?: number
  /** Launch speed in px — roughly how far they travel. */
  power?: number
  /** ms */
  duration?: number
}

/**
 * Celebrate! Fling a fan of paw prints from a viewport point; they arc under
 * gravity, spin and fade. Does nothing under prefers-reduced-motion.
 */
export function pawBurst(x: number, y: number, options: PawBurstOptions = {}) {
  if (typeof window === 'undefined') return
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  const { count = 16, tones = ['gold', 'bean', 'tech'], spread = 140, power = 180, duration = 1100 } = options
  for (let i = 0; i < count; i++) {
    const tone = tones[Math.floor(Math.random() * tones.length)] ?? 'gold'
    const paw = document.createElement('span')
    paw.className = `ml-paw-burst ml-paw-stamp--${tone}`
    paw.style.left = `${x}px`
    paw.style.top = `${y}px`
    const size = 12 + Math.random() * 14
    paw.style.width = paw.style.height = `${size}px`
    paw.style.margin = `${-size / 2}px 0 0 ${-size / 2}px`
    paw.appendChild(createPawSvg())
    document.body.appendChild(paw)

    // Angle measured from straight up; -spread/2 … +spread/2.
    const angle = ((Math.random() - 0.5) * spread * Math.PI) / 180
    const v = power * (0.55 + Math.random() * 0.6)
    const vx = Math.sin(angle) * v
    const vy = -Math.cos(angle) * v
    const gravity = power * 1.6
    const spin = (Math.random() - 0.5) * 540
    const steps = 8
    const frames: Keyframe[] = []
    for (let s = 0; s <= steps; s++) {
      const t = s / steps
      frames.push({
        transform: `translate(${(vx * t).toFixed(1)}px, ${(vy * t + gravity * t * t * 0.5).toFixed(1)}px) rotate(${(spin * t).toFixed(0)}deg) scale(${s === 0 ? 0.3 : 1})`,
        opacity: t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3,
      })
    }
    const remove = () => paw.remove()
    if (typeof paw.animate === 'function') {
      const anim = paw.animate(frames, { duration: duration * (0.8 + Math.random() * 0.4), easing: 'linear', fill: 'forwards' })
      anim.onfinish = remove
    }
    setTimeout(remove, duration * 1.4)
  }
}
