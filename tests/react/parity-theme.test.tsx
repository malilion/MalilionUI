// Markup parity for MlThemeToggle ↔ <ThemeToggle> (see parity.test.tsx).
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { renderToStaticMarkup } from 'react-dom/server'
import * as V from '../../src'
import { ThemeToggle } from '../../src/react/theme'
import { ConfigProvider } from '../../src/react/locale'
import { en } from '../../src/locale-data'
import { react, vue } from './parity-utils'

const cases: [string, () => Promise<string>, () => string][] = [
  ['ThemeToggle switch', () => vue(V.MlThemeToggle), () => react(<ThemeToggle />)],
  ['ThemeToggle switch label', () => vue(V.MlThemeToggle, { label: '日光模式', size: 'lg' }), () => react(<ThemeToggle label="日光模式" size="lg" />)],
  ['ThemeToggle switch disabled', () => vue(V.MlThemeToggle, { disabled: true }), () => react(<ThemeToggle disabled />)],
  ['ThemeToggle segmented', () => vue(V.MlThemeToggle, { variant: 'segmented' }), () => react(<ThemeToggle variant="segmented" />)],
  ['ThemeToggle segmented two-way sm', () => vue(V.MlThemeToggle, { variant: 'segmented', system: false, size: 'sm' }), () => react(<ThemeToggle variant="segmented" system={false} size="sm" />)],
  ['ThemeToggle segmented disabled', () => vue(V.MlThemeToggle, { variant: 'segmented', disabled: true }), () => react(<ThemeToggle variant="segmented" disabled />)],
  ['ThemeToggle icon', () => vue(V.MlThemeToggle, { variant: 'icon' }), () => react(<ThemeToggle variant="icon" />)],
  ['ThemeToggle icon labelled', () => vue(V.MlThemeToggle, { variant: 'icon', label: '換主題', size: 'sm' }), () => react(<ThemeToggle variant="icon" label="換主題" size="sm" />)],
]

describe('React ↔ Vue markup parity: ThemeToggle', () => {
  for (const [name, fromVue, fromReact] of cases) {
    it(name, async () => {
      expect(fromReact()).toBe(await fromVue())
    })
  }

  it('matches attributes that carry meaning (aria, disabled, tabindex, paths), in English too', async () => {
    const strip = (html: string) => {
      const root = document.createElement('div')
      root.innerHTML = html.replace(/<!--[\s\S]*?-->/g, '')
      const out: string[] = []
      for (const el of root.querySelectorAll('*')) {
        for (const name of ['role', 'aria-label', 'aria-checked', 'aria-hidden', 'aria-disabled', 'title', 'disabled', 'tabindex', 'type', 'd', 'viewBox']) {
          const v = el.getAttribute(name)
          if (v !== null) out.push(`${el.tagName.toLowerCase()} ${name}=${v === '' ? 'true' : v}`)
        }
      }
      return out.join('\n')
    }
    for (const variant of ['switch', 'segmented', 'icon'] as const) {
      const v = strip(await renderToString(createSSRApp({ render: () => h(V.MlConfigProvider, { locale: en }, () => h(V.MlThemeToggle, { variant })) })))
      const r = strip(renderToStaticMarkup(<ConfigProvider locale={en}><ThemeToggle variant={variant} /></ConfigProvider>))
      expect(r).toBe(v)
    }
  })
})
