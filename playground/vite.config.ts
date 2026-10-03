import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Docs / showcase site. Imports the library straight from source.
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  plugins: [vue()],
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
