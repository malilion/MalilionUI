// Vue binding for the theme store (src/theme.ts): one reactive copy shared by
// every caller, wired up the first time useTheme() runs in a browser.
import { computed, shallowRef, type ComputedRef, type WritableComputedRef } from 'vue'
import {
  getServerThemeState,
  getThemeState,
  setTheme,
  subscribeTheme,
  toggleTheme,
  type MlSetThemeOptions,
  type MlThemeMode,
  type MlThemeState,
} from './theme'

const state = shallowRef<MlThemeState>(getServerThemeState())
let bound = false

function bind() {
  if (bound || typeof window === 'undefined') return
  bound = true
  state.value = getThemeState()
  subscribeTheme(() => {
    state.value = getThemeState()
  })
}

export interface UseThemeReturn {
  /** The chosen mode; assigning it switches (smoothly, from the page centre). */
  mode: WritableComputedRef<MlThemeMode>
  /** The applied theme ('system' resolved). */
  resolved: ComputedRef<'dark' | 'light'>
  /** The OS preference. */
  system: ComputedRef<'dark' | 'light'>
  isDark: ComputedRef<boolean>
  setTheme: (mode: MlThemeMode, options?: MlSetThemeOptions) => void
  toggle: (options?: MlSetThemeOptions) => void
}

/**
 * Night Pride / Daylight / follow-the-OS, shared app-wide and remembered in
 * localStorage. During SSR it reports the default mode and never touches the DOM.
 */
export function useTheme(): UseThemeReturn {
  bind()
  return {
    mode: computed({
      get: () => state.value.mode,
      set: (m) => setTheme(m),
    }),
    resolved: computed(() => state.value.resolved),
    system: computed(() => state.value.system),
    isDark: computed(() => state.value.resolved === 'dark'),
    setTheme,
    toggle: toggleTheme,
  }
}

/** @internal tests: re-sync the shared copy after the store was reset. */
export function _rebindThemeForTests() {
  bound = false
  state.value = getServerThemeState()
}
