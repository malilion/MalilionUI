// Test harness for scripts/check-on-demand.mjs: renders one docs example with
// NO stylesheet from JS, so the check can load the full stylesheet, record
// computed styles, swap in core.css + the on-demand files, and compare.
import { createApp, type Component } from 'vue'
import MalilionUI from '@malilion/ui'

const modules = import.meta.glob<{ default: Component }>('./examples/**/*.vue', { eager: true })
const sources = import.meta.glob<string>('./examples/**/*.vue', { eager: true, query: '?raw', import: 'default' })

const file = new URLSearchParams(location.search).get('ex') ?? 'button/variants'
const mod = modules[`./examples/${file}.vue`]
const source = sources[`./examples/${file}.vue`] ?? ''

/** Component tags (PascalCase or kebab-case) and v-directives used by the example. */
const used = new Set<string>()
for (const m of source.matchAll(/<(Ml[A-Z]\w*)/g)) used.add(m[1])
for (const m of source.matchAll(/<ml-([a-z-]+)/g)) used.add(`Ml${m[1].replace(/(^|-)(\w)/g, (_, __, c: string) => c.toUpperCase())}`)
if (/v-paw-stamp|\bstamp\b/.test(source)) used.add('v-paw-stamp')
if (/v-loading/.test(source)) used.add('v-loading')
;(window as unknown as { __used: string[] }).__used = [...used]

// Only the library's stylesheets — the example's own <style scoped> must stay.
const styleTags = () => [...document.querySelectorAll<HTMLStyleElement>('style[data-vite-dev-id*="/src/styles/"]')]
const settle = () => new Promise((r) => setTimeout(r, 120))

/** The whole stylesheet, the way `import '@malilion/ui/style.css'` loads it. */
;(window as unknown as { __full: () => Promise<void> }).__full = async () => {
  await import('../src/styles/index.css')
  await settle()
}

/** Drop the full stylesheet, then load each used component's on-demand entry in `order`. */
const lean = import.meta.glob('../src/styles/on-demand/*.js')
;(window as unknown as { __lean: (names: string[]) => Promise<void> }).__lean = async (names) => {
  styleTags().forEach((tag) => tag.remove())
  // A real app always has core.css once any component is used; examples with no components still need it.
  await import('../src/styles/core.css')
  for (const name of names) await lean[`../src/styles/on-demand/${name}.js`]?.()
  await settle()
}

if (mod) createApp(mod.default).use(MalilionUI).mount('#app')
