// @vitest-environment node
// Server-side render every docs example: no window / document may be touched
// during setup or render (Nuxt, Vite SSR, VitePress…).
import { describe, expect, it } from 'vitest'
import { createSSRApp, type Component } from 'vue'
import { renderToString } from 'vue/server-renderer'
import MalilionUI from '../src'

const examples = import.meta.glob<{ default: Component }>('../playground/examples/**/*.vue', { eager: true })

describe('SSR', () => {
  it('runs without a DOM', () => {
    expect(typeof window).toBe('undefined')
    expect(typeof document).toBe('undefined')
  })

  for (const [path, mod] of Object.entries(examples)) {
    const name = path.replace('../playground/examples/', '').replace('.vue', '')
    it(`renders ${name}`, async () => {
      const app = createSSRApp(mod.default).use(MalilionUI)
      const warnings: string[] = []
      app.config.warnHandler = (msg) => warnings.push(msg)
      const html = await renderToString(app)
      expect(html.length).toBeGreaterThan(0)
      expect(warnings.filter((w) => !w.includes('Teleport'))).toEqual([])
    })
  }
})
