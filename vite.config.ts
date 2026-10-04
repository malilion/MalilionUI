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
      entry: {
        'malilion-ui': fileURLToPath(new URL('./src/entry.ts', import.meta.url)),
        resolver: fileURLToPath(new URL('./src/resolver.ts', import.meta.url)),
        nuxt: fileURLToPath(new URL('./src/nuxt.ts', import.meta.url)),
        react: fileURLToPath(new URL('./src/react/index.ts', import.meta.url)),
      },
      formats: ['es'],
      fileName: (_format, name) => `${name}.js`,
      cssFileName: 'style',
    },
    rollupOptions: {
      external: ['vue', '@nuxt/kit', '@nuxt/schema', 'react', 'react-dom', 'react/jsx-runtime'],
      output: {
        // Next.js App Router: the React entry uses hooks, so it's a client module.
        banner: (chunk) => (chunk.name === 'react' ? "'use client';" : ''),
        // Framework-free code both entries share (QR encoder, locale strings, mascot images…).
        chunkFileNames: 'chunks/[name]-[hash].js',
        // The 368-district Taiwan table gets its own chunk, so it is only fetched (and
        // only kept by a bundler) when something actually imports it.
        // Same for the 縣市 outlines of MlTaiwanMap / TaiwanMap and the land mask of MlGlobe / Globe,
        // the bank-code table of MlBankPicker and the 農曆 / 節氣 tables of MlLunarCalendar.
        manualChunks: (id) =>
          /\/src\/(taiwan-regions|components\/region)\.ts$/.test(id)
            ? 'taiwan-regions'
            : /\/src\/(taiwan-map-data|components\/taiwan-map)\.ts$/.test(id)
              ? 'taiwan-map'
              : /\/src\/(globe-data|components\/globe)\.ts$/.test(id)
                ? 'globe'
                : /\/src\/(tw-banks|components\/bank)\.ts$/.test(id)
                  ? 'tw-banks'
                  : /\/src\/(tw-calendar|components\/lunar-calendar)\.ts$/.test(id)
                    ? 'tw-calendar'
                    : undefined,
      },
    },
  },
  // Tests (e.g. the SSR render of every docs example) import '@malilion/ui' like the docs do.
  resolve: {
    alias: {
      '@malilion/ui': fileURLToPath(new URL('./src/index.ts', import.meta.url)),
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.{ts,tsx}'],
  },
})
