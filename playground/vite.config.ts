import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin, type ViteDevServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { themeInitScript } from '../src/theme'
import { docsTheme } from './theme'
import { collectReactApi, collectReactComponents, collectReactHandles } from '../scripts/react-api.mjs'
import { vueToReact, type ConvertOptions } from './convert/vue-to-react'

const REACT_API = '\0virtual:react-api'
const REACT_EXAMPLES = '\0virtual:react-examples'
const examplesDir = fileURLToPath(new URL('./examples/', import.meta.url))
const verifiedFile = fileURLToPath(new URL('./convert/verified.json', import.meta.url))

/**
 * The docs' React mode: the components' real props (virtual:react-api) and the
 * examples converted to React (virtual:react-examples) — only those
 * tests/react/examples.test.tsx verified.
 */
function reactDocs(): Plugin {
  const reload = (server: ViteDevServer, id: string) => {
    const mod = server.moduleGraph.getModuleById(id)
    if (mod) server.reloadModule(mod)
  }
  // Reading src/react takes a TypeScript program: do it once, again only when it changes.
  let api: { props: ReturnType<typeof collectReactApi>; components: string[]; handles: string[] } | undefined
  const reactApi = () => (api ??= { props: collectReactApi(), components: collectReactComponents(), handles: collectReactHandles() })
  return {
    name: 'docs-react',
    resolveId: (id) => (id === 'virtual:react-api' ? REACT_API : id === 'virtual:react-examples' ? REACT_EXAMPLES : undefined),
    load(id) {
      if (id === REACT_API) return `export default ${JSON.stringify({ props: reactApi().props, components: reactApi().components })}`
      if (id !== REACT_EXAMPLES) return
      const { props, components, handles } = reactApi()
      const ctx = { props, components: new Set(components), handles: new Set(handles) }
      const verified = JSON.parse(readFileSync(verifiedFile, 'utf8')) as Record<string, ConvertOptions>
      const out: Record<string, { tsx: string; css: string }> = {}
      for (const [file, options] of Object.entries(verified)) {
        this.addWatchFile(`${examplesDir}${file}.vue`)
        try {
          out[file] = vueToReact(readFileSync(`${examplesDir}${file}.vue`, 'utf8'), file, ctx, options)
        } catch {
          // Edited since it was verified: show the Vue code until the test re-verifies it.
        }
      }
      return `export default ${JSON.stringify(out)}`
    },
    handleHotUpdate({ file, server }) {
      if (file.includes('/src/react/')) {
        api = undefined
        reload(server, REACT_API)
        reload(server, REACT_EXAMPLES)
      }
    },
  }
}

// Docs / showcase site. Imports the library straight from source.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  plugins: [
    vue(),
    {
      // Dogfood the no-flash script: apply the remembered theme before first paint.
      name: 'docs-theme-init',
      transformIndexHtml: (html, ctx) =>
        ctx.filename.endsWith('index.html') ? html.replace('</title>', `</title>\n    <script>${themeInitScript(docsTheme)}</script>`) : html,
    },
    reactDocs(),
  ],
  resolve: {
    alias: [
      { find: /^@malilion\/ui\/editor$/, replacement: fileURLToPath(new URL('../src/editor.ts', import.meta.url)) },
      { find: /^@malilion\/ui\/react\/editor$/, replacement: fileURLToPath(new URL('../src/react/editor.tsx', import.meta.url)) },
      { find: /^@malilion\/ui\/react$/, replacement: fileURLToPath(new URL('../src/react/index.ts', import.meta.url)) },
      { find: /^@malilion\/ui$/, replacement: fileURLToPath(new URL('../src/index.ts', import.meta.url)) },
    ],
  },
  server: {
    host: '127.0.0.1',
    port: 5287,
  },
  build: {
    outDir: fileURLToPath(new URL('../dist-playground', import.meta.url)),
    emptyOutDir: true,
  },
})
