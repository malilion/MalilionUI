import { h, render, type Directive } from 'vue'
import MlLoader from './components/MlLoader.vue'
import { getLocale } from './locale'

export interface MlLoadingOptions {
  loading: boolean
  /** Caption under the loader; defaults to the locale's "loading". */
  text?: string
  /** "reactor": the spinning mane. "paws": a cub walking across. */
  variant?: 'reactor' | 'paws'
}

type LoadingValue = boolean | MlLoadingOptions | undefined

interface LoadingState {
  mask: HTMLElement
  /** The element's inline `position` before we made it relative. */
  position: string
  shown: boolean
  fullscreen: boolean
}

type LoadingElement = HTMLElement & { __mlLoading?: LoadingState }

const normalise = (value: LoadingValue): MlLoadingOptions =>
  typeof value === 'object' && value ? value : { loading: !!value }

function paint(el: LoadingElement, options: MlLoadingOptions) {
  const state = el.__mlLoading!
  render(
    h(MlLoader, {
      variant: options.variant ?? 'reactor',
      size: state.fullscreen ? 64 : 44,
      label: options.text,
      srLabel: options.text ? undefined : getLocale().common.loading,
    }),
    state.mask,
  )
}

function update(el: LoadingElement, value: LoadingValue) {
  const state = el.__mlLoading!
  const options = normalise(value)
  if (options.loading) {
    paint(el, options)
    if (!state.shown) {
      state.shown = true
      const host = state.fullscreen ? document.body : el
      host.appendChild(state.mask)
      // Next frame so the fade-in transition runs.
      requestAnimationFrame(() => state.mask.classList.add('ml-loading--in'))
    }
    el.setAttribute('aria-busy', 'true')
  } else if (state.shown) {
    state.shown = false
    el.removeAttribute('aria-busy')
    const mask = state.mask
    mask.classList.remove('ml-loading--in')
    const done = () => {
      if (!state.shown) mask.remove()
    }
    mask.addEventListener('transitionend', done, { once: true })
    setTimeout(done, 400) // in case transitions are off
  }
}

/**
 * `v-loading="busy"` — covers the element with a dimmed glass mask and the
 * lion's spinning mane. Object form: `{ loading, text, variant }`.
 * `v-loading.fullscreen` covers the whole viewport instead.
 */
export const vLoading: Directive<LoadingElement, LoadingValue> = {
  mounted(el, binding) {
    const fullscreen = !!binding.modifiers.fullscreen
    const mask = document.createElement('div')
    mask.className = `ml-loading${fullscreen ? ' ml-loading--fullscreen' : ''}`
    const position = el.style.position
    const computed = getComputedStyle(el).position
    if (!fullscreen && (!computed || computed === 'static')) el.style.position = 'relative'
    el.__mlLoading = { mask, position, shown: false, fullscreen }
    update(el, binding.value)
  },
  updated(el, binding) {
    if (binding.value !== binding.oldValue || typeof binding.value === 'object') update(el, binding.value)
  },
  unmounted(el) {
    const state = el.__mlLoading
    if (!state) return
    render(null, state.mask)
    state.mask.remove()
    el.style.position = state.position
    delete el.__mlLoading
  },
}
