// Test helper: a controllable window.matchMedia for the theme store.
import { vi } from 'vitest'

export function mockMedia(initial: { dark?: boolean; reduce?: boolean } = {}) {
  const prefs = { dark: initial.dark ?? true, reduce: initial.reduce ?? false }
  const listeners = new Set<(e: { matches: boolean }) => void>()
  const matchMedia = (query: string) => ({
    media: query,
    get matches() {
      return query.includes('reduce') ? prefs.reduce : query.includes('dark') ? prefs.dark : false
    },
    addEventListener: (_: string, fn: (e: { matches: boolean }) => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: (e: { matches: boolean }) => void) => listeners.delete(fn),
  })
  vi.stubGlobal('matchMedia', matchMedia)
  return {
    prefs,
    /** Flip the OS colour scheme and notify listeners. */
    setDark(dark: boolean) {
      prefs.dark = dark
      for (const fn of [...listeners]) fn({ matches: dark })
    },
  }
}
