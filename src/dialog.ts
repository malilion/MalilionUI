import { createApp, reactive } from 'vue'
import type { MlConfirmOptions } from './types'

export interface MlDialogRequest extends MlConfirmOptions {
  id: number
  kind: 'confirm' | 'alert' | 'prompt'
  resolve: (value: unknown) => void
}

type Input = string | MlConfirmOptions

// One queue for the whole app; <MlDialogHost> shows the first request. If the
// app never rendered a host, the first call mounts one on <body> by itself.
const state = reactive({ queue: [] as MlDialogRequest[], hosts: 0 })
let seed = 0
let autoHost: Promise<unknown> | null = null

async function ensureHost() {
  if (state.hosts > 0 || typeof document === 'undefined') return
  autoHost ??= import('./components/MlDialogHost.vue').then(({ default: Host }) => {
    if (state.hosts > 0) return
    const el = document.createElement('div')
    el.setAttribute('data-ml-dialog-host', '')
    document.body.appendChild(el)
    createApp(Host).mount(el)
  })
  await autoHost
}

function open<T>(kind: MlDialogRequest['kind'], input: Input): Promise<T> {
  const options = typeof input === 'string' ? { message: input } : input
  return new Promise<T>((resolve) => {
    state.queue.push({ ...options, id: ++seed, kind, resolve: resolve as (value: unknown) => void })
    ensureHost()
  })
}

/**
 * `await confirm('刪除這個獅群？')` → true / false.
 * `await confirm.prompt({ title: '重新命名' })` → the text, or null if cancelled.
 * `await confirm.alert('已儲存')` → resolves once dismissed.
 */
export const confirm = Object.assign((input: Input) => open<boolean>('confirm', input), {
  danger: (input: Input) =>
    open<boolean>('confirm', { ...(typeof input === 'string' ? { message: input } : input), danger: true }),
  alert: (input: Input) => open<void>('alert', input),
  prompt: (input: Input) => {
    const options = typeof input === 'string' ? { title: input } : input
    return open<string | null>('prompt', { ...options, prompt: options.prompt ?? {} })
  },
})

export function useConfirm() {
  return confirm
}

/** @internal used by <MlDialogHost> */
export const dialogState = state

/** @internal settle the front request and show the next one. */
export function settleDialog(id: number, value: unknown) {
  const index = state.queue.findIndex((r) => r.id === id)
  if (index === -1) return
  const [request] = state.queue.splice(index, 1)
  request.resolve(value)
}
