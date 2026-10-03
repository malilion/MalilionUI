import { cpSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import type { Plugin } from 'vite'

const src = (path: string) => fileURLToPath(new URL(`./src/${path}`, import.meta.url))

// Lib mode always inlines url() assets as base64, which would bloat style.css by
// ~400 KB and defeat unicode-range lazy loading. So the bundle skips fonts.css,
// then gets it prepended back with the woff2 files copied to dist/fonts/.
function brandFonts(): Plugin {
  const outDir = fileURLToPath(new URL('./dist', import.meta.url))
  return {
    name: 'malilion-brand-fonts',
    apply: 'build',
    enforce: 'pre',
    transform(code, id) {
      if (id.endsWith('/src/styles/index.css')) return code.replace("@import './fonts.css';", '')
    },
    closeBundle() {
      cpSync(src('fonts'), `${outDir}/fonts`, { recursive: true })
      const faces = readFileSync(src('styles/fonts.css'), 'utf8').replaceAll('../fonts/', './fonts/')
      const css = `${outDir}/style.css`
      writeFileSync(css, faces + readFileSync(css, 'utf8'))
    },
  }
}

// Library build: one ESM bundle + one stylesheet. Vue stays a peer dependency.
export default defineConfig({
  plugins: [vue(), brandFonts()],
  build: {
    lib: {
      entry: fileURLToPath(new URL('./src/entry.ts', import.meta.url)),
      formats: ['es'],
      fileName: 'malilion-ui',
      cssFileName: 'style',
    },
    rollupOptions: {
      external: ['vue'],
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts'],
  },
})
