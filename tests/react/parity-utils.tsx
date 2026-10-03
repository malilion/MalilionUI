// Shared helpers for the React ↔ Vue parity suites: each pair is server-rendered
// and compared as a tree of tag + classes + role + text (ids and inline styles aside).
import { createSSRApp, h, type Component } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactElement } from 'react'

export function signature(html: string): string {
  const root = document.createElement('div')
  root.innerHTML = html.replace(/<!--[\s\S]*?-->/g, '')
  const walk = (el: Element, depth: number): string[] => {
    const cls = [...el.classList].sort().join('.')
    const role = el.getAttribute('role')
    const text = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent?.trim())
      .filter(Boolean)
      .join(' ')
    const line = `${'  '.repeat(depth)}${el.tagName.toLowerCase()}${cls ? `.${cls}` : ''}${role ? `[role=${role}]` : ''}${text ? ` "${text}"` : ''}`
    return [line, ...[...el.children].flatMap((c) => walk(c, depth + 1))]
  }
  // React 19 adds <link rel=preload> for images during SSR; not part of the component.
  return [...root.children].filter((c) => c.tagName !== 'LINK').flatMap((c) => walk(c, 0)).join('\n')
}

export async function vue(component: Component, props: Record<string, unknown> = {}, slot?: string) {
  const app = createSSRApp({ render: () => h(component, props, slot === undefined ? undefined : () => slot) })
  return signature(await renderToString(app))
}
export const react = (el: ReactElement) => signature(renderToStaticMarkup(el))

