import { reactive } from 'vue'
import type { MlToastOptions, MlToastTone } from './types'

export interface MlToastItem extends MlToastOptions {
  id: number
  tone: MlToastTone
  duration: number
  closable: boolean
}

type ToastInput = string | MlToastOptions

// One queue for the whole app, so toast() works from anywhere — components,
// stores, plain modules. <MlToastHost> renders it.
const state = reactive({ items: [] as MlToastItem[] })
let seed = 0

function normalise(input: ToastInput, tone?: MlToastTone): MlToastOptions {
  const options = typeof input === 'string' ? { message: input } : input
  return tone ? { ...options, tone } : options
}

function show(input: ToastInput): number {
  const options = normalise(input)
  const item: MlToastItem = {
    ...options,
    id: ++seed,
    tone: options.tone ?? 'paw',
    duration: options.duration ?? 4000,
    closable: options.closable ?? true,
  }
  state.items.push(item)
  return item.id
}

function dismiss(id: number) {
  const index = state.items.findIndex((item) => item.id === id)
  if (index !== -1) state.items.splice(index, 1)
}

function clear() {
  state.items.splice(0)
}

const withTone = (tone: MlToastTone) => (input: ToastInput) => show(normalise(input, tone))

/**
 * `toast('Saved')`, `toast.success({ title, message })`, `toast.dismiss(id)`…
 * Every call returns the toast's id.
 */
export const toast = Object.assign(show, {
  show,
  paw: withTone('paw'),
  info: withTone('info'),
  success: withTone('success'),
  warning: withTone('warning'),
  danger: withTone('danger'),
  dismiss,
  clear,
})

export function useToast() {
  return toast
}

/** @internal read by <MlToastHost> */
export const toastState = state
