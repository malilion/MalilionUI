import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { themeInitScript } from '../src/theme'
import { docsTheme } from './theme'

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
  ],
  resolve: {
    alias: [
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
