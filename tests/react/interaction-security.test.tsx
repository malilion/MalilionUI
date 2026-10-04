// React side of tests/security.test.ts: code renders as text, links never run script,
// and hostile Markdown neither hangs nor crashes the render.
import { afterEach, describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { Breadcrumb, Button } from '../../src/react/basic'
import { CodeBlock } from '../../src/react/charts'
import { ListItem } from '../../src/react/layout'
import { Markdown } from '../../src/react/markdown'
import { safeHref } from '../../src/react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined
let host: HTMLElement
function render(el: React.ReactElement) {
  if (!root) {
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
  }
  act(() => root!.render(el))
  return host
}
afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
})

describe('<CodeBlock> renders text, not HTML', () => {
  it('shows markup as text with no injected elements', () => {
    const code = '<img src=x onerror="alert(1)"> <script>alert(2)</script>'
    for (const plain of [true, false]) {
      render(<CodeBlock code={code} plain={plain} lang="html" />)
      expect(host.querySelector('img')).toBeNull()
      expect(host.querySelector('script')).toBeNull()
      expect(host.querySelector('.ml-code__text')!.textContent).toBe(code)
    }
  })

  it('trims a huge run of spaces quickly', () => {
    const t = performance.now()
    renderToStaticMarkup(<CodeBlock code={`a${' '.repeat(50_000)}b`} plain />)
    expect(performance.now() - t).toBeLessThan(3000)
  })
})

describe('links from props', () => {
  it('safeHref is exported from the React entry', () => {
    expect(safeHref('javascript:alert(1)')).toBeUndefined()
    expect(safeHref('/pride')).toBe('/pride')
  })

  it('components never render a javascript: href', () => {
    const evil = 'javascript:alert(1)'
    const html = [
      renderToStaticMarkup(<Button href={evil}>Go</Button>),
      renderToStaticMarkup(<ListItem href={evil} title="Go" />),
      renderToStaticMarkup(<Breadcrumb items={[{ label: 'Home', href: evil }, { label: 'Here' }]} />),
    ]
    for (const h of html) expect(h).not.toContain('javascript:')
    expect(renderToStaticMarkup(<Button href="/pride">Go</Button>)).toContain('href="/pride"')
  })
})

describe('<Markdown> with hostile input', () => {
  it('renders deep nesting without throwing', () => {
    render(<Markdown source={`${'> '.repeat(5000)}${'*_'.repeat(3000)}roar`} />)
    expect(host.textContent).toContain('roar')
  })
})
