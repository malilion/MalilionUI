// @vitest-environment node
// The Nuxt module with @nuxt/kit stubbed: theme auto-import + no-flash head script.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const calls = vi.hoisted(() => ({ imports: [] as { name: string; as?: string }[], plugins: [] as string[] }))
vi.mock('@nuxt/kit', () => ({
  defineNuxtModule: (def: unknown) => def,
  addComponent: () => {},
  addImports: (list: { name: string; as?: string }[]) => calls.imports.push(...list),
  addPluginTemplate: (t: { getContents: () => string }) => calls.plugins.push(t.getContents()),
  addVitePlugin: () => {},
}))

type Head = { script?: { innerHTML: string; key?: string }[] }
const fakeNuxt = () => ({ options: { css: [] as string[], app: { head: {} as Head }, build: { transpile: [] as string[] } } })

async function setup(options: Record<string, unknown>) {
  const mod = (await import('../src/nuxt')).default as unknown as {
    defaults: Record<string, unknown>
    setup: (o: Record<string, unknown>, n: ReturnType<typeof fakeNuxt>) => void
  }
  const nuxt = fakeNuxt()
  mod.setup({ ...mod.defaults, ...options }, nuxt)
  return nuxt
}

beforeEach(() => {
  calls.imports.length = 0
  calls.plugins.length = 0
})

describe('nuxt module: theme', () => {
  it('auto-imports useTheme as useMlTheme next to the existing composables', async () => {
    await setup({})
    expect(calls.imports).toEqual(
      expect.arrayContaining([
        { name: 'useTheme', as: 'useMlTheme', from: '@malilion/ui' },
        { name: 'useLocale', as: 'useMlLocale', from: '@malilion/ui' },
        { name: 'useToast', from: '@malilion/ui' },
      ]),
    )
  })

  it('puts the no-flash script in <head> and configures the store when asked', async () => {
    const nuxt = await setup({ theme: { storageKey: 'site-theme', defaultMode: 'system' }, locale: 'en' })
    const script = nuxt.options.app.head.script![0]
    expect(script.key).toBe('malilion-theme')
    expect(script.innerHTML).toContain('"site-theme"')
    expect(script.innerHTML).toContain('"system"')
    expect(calls.plugins[0]).toContain('configureTheme({"storageKey":"site-theme","defaultMode":"system"})')
    expect(calls.plugins[0]).toContain('setLocale(en)')
  })

  it('by default injects the script but leaves the plugin unchanged; theme: false opts out', async () => {
    const nuxt = await setup({})
    expect(nuxt.options.app.head.script).toHaveLength(1)
    expect(calls.plugins[0]).not.toContain('configureTheme')
    const off = await setup({ theme: false })
    expect(off.options.app.head.script).toBeUndefined()
  })
})
