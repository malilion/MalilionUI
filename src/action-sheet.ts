import { createApp, reactive } from 'vue'
import type { MlActionSheetOptions } from './types'

export interface MlActionSheetRequest extends MlActionSheetOptions {
  id: number
  resolve: (value: string | number | null) => void
}

// One queue for the whole app; <MlActionSheetHost> shows the first request. If
// the app never rendered a host, the first call mounts one on <body> by itself.
const state = reactive({ queue: [] as MlActionSheetRequest[], hosts: 0 })
let seed = 0
let autoHost: Promise<unknown> | null = null

async function ensureHost() {
  if (state.hosts > 0 || typeof document === 'undefined') return
  autoHost ??= import('./components/MlActionSheetHost.vue').then(({ default: Host }) => {
    if (state.hosts > 0) return
    const el = document.createElement('div')
    el.setAttribute('data-ml-action-sheet-host', '')
    document.body.appendChild(el)
    createApp(Host).mount(el)
  })
  await autoHost
}

/**
 * `await actionSheet({ title: '分享', actions: [{ label: '複製連結', value: 'copy' }] })`
 * → the picked action's value (its label when it has none), or null when cancelled.
 */
export function actionSheet(options: MlActionSheetOptions): Promise<string | number | null> {
  return new Promise((resolve) => {
    state.queue.push({ ...options, id: ++seed, resolve })
    ensureHost()
  })
}

export function useActionSheet() {
  return actionSheet
}

/** @internal used by <MlActionSheetHost> */
export const actionSheetState = state

/** @internal settle a request and show the next one. */
export function settleActionSheet(id: number, value: string | number | null) {
  const index = state.queue.findIndex((r) => r.id === id)
  if (index === -1) return
  const [request] = state.queue.splice(index, 1)
  request.resolve(value)
}
