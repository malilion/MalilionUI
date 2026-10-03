// Markup parity for Markdown (see parity.test.tsx).
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import * as V from '../../src'
import * as R from '../../src/react/markdown'
import { react, vue } from './parity-utils'

const gallery = `# Title

Some **bold**, *em*, ~~del~~, \`code\`, [ext](https://x.dev "T"), [in](/a), <https://a.b>, www.lion.dev, ![img](/i.png)
line
break and <script>alert(1)</script>

## List

- one
- [x] done
  1. nested
  2. more
- [ ] todo

3. three

4. four

> quote
> > deep

| a | b | c |
|:--|:-:|--:|
| 1 | **2** | 3 |
| x |

\`\`\`ts
const a = 1
\`\`\`

\`\`\`
plain
\`\`\`

---

Setext
------`

const cases: [string, Record<string, unknown>, () => string][] = [
  ['gallery', { source: gallery }, () => react(<R.Markdown source={gallery} />)],
  ['empty', { source: '' }, () => react(<R.Markdown source="" />)],
  ['anchors', { source: gallery, headingAnchors: true, anchorPrefix: 'p-' }, () => react(<R.Markdown source={gallery} headingAnchors anchorPrefix="p-" />)],
  ['code options', { source: '```js\nlet a\n```', lineNumbers: true, copyable: false }, () => react(<R.Markdown source={'```js\nlet a\n```'} lineNumbers copyable={false} />)],
  ['breaks', { source: 'a\nb', breaks: true }, () => react(<R.Markdown source={'a\nb'} breaks />)],
  ['streaming paragraph', { source: 'Hello **wor', streaming: true }, () => react(<R.Markdown source="Hello **wor" streaming />)],
  ['streaming list', { source: '- a\n- b `co', streaming: true, caret: 'paw' }, () => react(<R.Markdown source={'- a\n- b `co'} streaming caret="paw" />)],
  ['streaming fence', { source: 'x\n\n```py\nprint(', streaming: true }, () => react(<R.Markdown source={'x\n\n```py\nprint('} streaming />)],
  ['streaming table', { source: '| a | b |\n|--|--|\n| 1', streaming: true }, () => react(<R.Markdown source={'| a | b |\n|--|--|\n| 1'} streaming />)],
  ['streaming empty', { source: '', streaming: true }, () => react(<R.Markdown source="" streaming />)],
  ['streaming quote heading', { source: '> ## Hea', streaming: true }, () => react(<R.Markdown source="> ## Hea" streaming />)],
]

describe('React ↔ Vue markup parity: markdown', () => {
  for (const [name, props, fromReact] of cases) {
    it(name, async () => {
      expect(fromReact()).toBe(await vue(V.MlMarkdown, props))
    })
  }

  it('same attributes on links, images, cells and anchors', async () => {
    const { createSSRApp, h } = await import('vue')
    const { renderToString } = await import('vue/server-renderer')
    const src = '# Hi\n\n[e](https://x.dev "T") [i](/a) ![m](/m.png "M")\n\n| a |\n|:-:|\n| 1 |\n\n3. x'
    const v = await renderToString(createSSRApp({ render: () => h(V.MlMarkdown, { source: src, headingAnchors: true }) }))
    const r = renderToStaticMarkup(<R.Markdown source={src} headingAnchors />)
    const attrs = (html: string) =>
      [...html.matchAll(/<(a|img|th|td|h1|ol)\b([^>]*)>/g)].map(([, tag, rest]) => `${tag} ${[...rest.matchAll(/(href|target|rel|src|alt|title|id|start|class)="([^"]*)"/g)].map((m) => `${m[1]}=${m[2]}`).sort().join(' ')}`)
    expect(attrs(r)).toEqual(attrs(v))
    expect(r).toContain('rel="noopener noreferrer"')
    expect(r).toContain('start="3"')
  })

  it('custom components replace code, link and image', () => {
    const html = renderToStaticMarkup(
      <R.Markdown
        source={'```lion\nroar\n```\n\n[x](https://x.dev) ![a](/a.png)'}
        components={{
          code: ({ code, lang }) => <pre className="mine">{`${lang}:${code}`}</pre>,
          link: ({ href, children }) => <b data-href={href}>{children}</b>,
          image: ({ src, alt }) => <i data-src={src}>{alt}</i>,
        }}
      />,
    )
    expect(html).toContain('<pre class="mine">lion:roar</pre>')
    expect(html).toContain('<b data-href="https://x.dev">x</b>')
    expect(html).toContain('<i data-src="/a.png">a</i>')
    expect(html).not.toContain('ml-code')
  })

  it('never emits live markup from evil input', () => {
    const html = renderToStaticMarkup(<R.Markdown source={'<script>x()</script> [a](javascript:alert(1)) ![b](data:image/svg+xml,x) <img onerror=alert(1)>'} />)
    expect(html).not.toMatch(/<script|<img|javascript:|data:/i)
  })
})
