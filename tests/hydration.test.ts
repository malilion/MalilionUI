// Server-render every docs example, then hydrate it in a DOM: the client must
// adopt the server HTML without mismatches.
import { describe, expect, it } from 'vitest'
import { createSSRApp, nextTick, type Component } from 'vue'
import { renderToString } from 'vue/server-renderer'
import MalilionUI from '../src'

const examples = import.meta.glob<{ default: Component }>('../playground/examples/**/*.vue', { eager: true })

describe('hydration', () => {
  for (const [path, mod] of Object.entries(examples)) {
    const name = path.replace('../playground/examples/', '').replace('.vue', '')
    it(`hydrates ${name}`, async () => {
      const server = createSSRApp(mod.default).use(MalilionUI)
      const ctx: { teleports?: Record<string, string> } = {}
      const html = await renderToString(server, ctx)
      // Teleported markup goes where the server put it, like a real SSR page.
      document.body.innerHTML = `<div id="app">${html}</div>${ctx.teleports?.body ?? ''}`
      const client = createSSRApp(mod.default).use(MalilionUI)
      const messages: string[] = []
      client.config.warnHandler = (msg) => messages.push(msg)
      const origError = console.error
      console.error = (...args: unknown[]) => messages.push(args.map(String).join(' '))
      try {
        client.mount('#app')
        await nextTick()
      } finally {
        console.error = origError
        client.unmount()
      }
      expect(messages.filter((m) => /hydrat|mismatch/i.test(m))).toEqual([])
      // Server render + hydration of the bigger examples (a long diff, charts) can take
      // a few seconds on a busy CI runner.
    }, 20_000)
  }
})
