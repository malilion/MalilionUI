// Vue binding for the clipboard core (src/clipboard.ts).
import { getCurrentInstance, getCurrentScope, onMounted, onScopeDispose, ref, shallowRef, type Ref } from 'vue'
import { copySource, isClipboardSupported, type MlCopySource } from './clipboard'

export interface UseClipboardOptions {
  /** How long `copied` stays true, in ms. Default 1500. */
  timeout?: number
}

export interface UseClipboardReturn {
  /** Copy a string, a `{ text, html }` pair or the result of a (possibly async) getter. Resolves `true` on success. */
  copy: (source: MlCopySource) => Promise<boolean>
  /** True for `timeout` ms after a successful copy. */
  copied: Ref<boolean>
  /** The last failure (cleared by the next successful copy). */
  error: Ref<Error | null>
  /** Whether this page can copy at all. `false` during SSR, settled once mounted. */
  isSupported: Ref<boolean>
}

/**
 * `const { copy, copied } = useClipboard()` — copy with automatic fallback for
 * non-secure contexts, plus a self-resetting `copied` flag for feedback.
 */
export function useClipboard(options: UseClipboardOptions = {}): UseClipboardReturn {
  const { timeout = 1500 } = options
  const copied = ref(false)
  const error = shallowRef<Error | null>(null)
  // In a component, stay `false` until mounted so SSR and hydration agree.
  const isSupported = ref(getCurrentInstance() ? false : isClipboardSupported())
  if (getCurrentInstance()) onMounted(() => (isSupported.value = isClipboardSupported()))
  let timer: ReturnType<typeof setTimeout> | undefined

  async function copy(source: MlCopySource): Promise<boolean> {
    let ok = false
    try {
      ok = (await copySource(source)).ok
      error.value = ok ? null : new Error('Copy to clipboard failed')
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e))
    }
    clearTimeout(timer)
    copied.value = ok
    if (ok) timer = setTimeout(() => (copied.value = false), timeout)
    return ok
  }

  if (getCurrentScope()) onScopeDispose(() => clearTimeout(timer))
  return { copy, copied, error, isSupported }
}
