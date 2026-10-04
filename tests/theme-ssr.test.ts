// @vitest-environment node
// The theme store and toggle on a server: no window, nothing mutated across requests.
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createElement } from 'react'
import { renderToString as renderReact } from 'react-dom/server'
import { getServerThemeState, getThemeState, setTheme, subscribeTheme, themeInitScript, toggleTheme } from '../src/theme'
import MalilionUI, { MlThemeToggle, useTheme } from '../src'
import { ThemeToggle } from '../src/react/theme'

describe('theme on the server', () => {
  it('imports and reads without a DOM', () => {
    expect(typeof window).toBe('undefined')
    expect(getThemeState()).toEqual({ mode: 'dark', resolved: 'dark', system: 'dark' })
    expect(getThemeState()).toBe(getServerThemeState())
  })

  it('setTheme / toggle / subscribe are no-ops (state is shared across requests)', () => {
    const off = subscribeTheme(() => {})
    setTheme('light')
    toggleTheme()
    off()
    expect(getThemeState().mode).toBe('dark')
  })

  it('builds the head script', () => {
    expect(themeInitScript()).toContain('k="ml-theme"')
  })

  it('renders every variant (Vue + React) in the pending state', async () => {
    for (const variant of ['switch', 'segmented', 'icon'] as const) {
      const app = createSSRApp({
        setup() {
          const theme = useTheme()
          return () => h('div', [h(MlThemeToggle, { variant }), h('span', theme.resolved.value)])
        },
      }).use(MalilionUI)
      const html = await renderToString(app)
      expect(html).toContain('ml-theme-toggle--pending')
      expect(html).toContain('<span>dark</span>')
      expect(renderReact(createElement(ThemeToggle, { variant }))).toContain('ml-theme-toggle--pending')
    }
  })
})
