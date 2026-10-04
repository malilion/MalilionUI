// Hostile input must neither hang the page (super-linear parsing) nor crash it
// (unbounded nesting), and links built from props must not run script.
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { MlBreadcrumb, MlButton, MlCodeBlock, MlListItem, MlMarkdown, highlightLines, highlightTokens, parseInline, parseMarkdown, safeHref } from '../src'
import type { MdBlock, MdInline } from '../src'

const N = 50_000

/**
 * A quadratic parser takes tens of seconds on these at 50 KB; a linear one a
 * few hundred ms. The budget is loose so slow CI machines don't flake.
 */
const BUDGET_MS = 3000

function timed(run: () => void): number {
  const t = performance.now()
  run()
  return performance.now() - t
}

const markdownAttacks: Record<string, string> = {
  'spaces inside a line': `a${' '.repeat(N)}b`,
  'spaces before a newline': `a${' '.repeat(N)}b\nc`,
  'heading with inner spaces': `# a${' '.repeat(N)}b`,
  'heading with closing hashes': `# a${' #'.repeat(N / 2)}x`,
  'unclosed link tails': '[a]('.repeat(N / 4),
  'unclosed link tails before spaces': `${'[a]('.repeat(N / 8)}${' '.repeat(N / 2)}z`,
  'balanced parens in link tails': '[a](()'.repeat(N / 6),
  'unclosed angle destinations': '[a](<'.repeat(N / 5),
  'unclosed titles': '[a](x "'.repeat(N / 7),
  'unclosed images': '![x]('.repeat(N / 5),
  'emphasis runs': '**a'.repeat(N / 3),
  'mixed emphasis': '*_'.repeat(N / 2),
  'emphasis that never closes': '_a *b '.repeat(N / 6),
  'soft line breaks': 'a\n'.repeat(N / 2),
  'single trailing spaces': 'a \n'.repeat(N / 3),
  'nested brackets': `${'['.repeat(N / 2)}${']'.repeat(N / 2)}`,
  'backtick runs': Array.from({ length: 300 }, (_, i) => `${'`'.repeat(i + 1)}a`).join(''),
  'bare URLs with parens': `http://x.y${')'.repeat(N)}`,
  'bare URL punctuation': `http://x.y${'.,'.repeat(N / 2)}a`,
  'trailing delimiters while streaming': `a${'*'.repeat(N)}`,
}

describe('markdown parsing stays linear', () => {
  for (const [name, src] of Object.entries(markdownAttacks)) {
    it(name, () => {
      expect(timed(() => parseMarkdown(src))).toBeLessThan(BUDGET_MS)
      expect(timed(() => parseMarkdown(src, { streaming: true }))).toBeLessThan(BUDGET_MS)
    })
  }
})

describe('nesting is bounded', () => {
  function depth(blocks: MdBlock[]): number {
    let max = 0
    for (const b of blocks) {
      if (b.type === 'blockquote') max = Math.max(max, 1 + depth(b.children))
      if (b.type === 'list') for (const it of b.items) max = Math.max(max, 1 + depth(it.children))
    }
    return max
  }
  function inlineDepth(nodes: MdInline[]): number {
    let max = 0
    for (const n of nodes) if ('children' in n) max = Math.max(max, 1 + inlineDepth(n.children))
    return max
  }

  it('deep block quotes', () => {
    const blocks = parseMarkdown('> '.repeat(20_000) + 'roar')
    expect(depth(blocks)).toBeLessThanOrEqual(32)
  })

  it('deep lists', () => {
    const src = Array.from({ length: 200 }, (_, i) => `${'  '.repeat(i)}- level ${i}`).join('\n')
    expect(depth(parseMarkdown(src))).toBeLessThanOrEqual(32)
  })

  it('deep emphasis keeps its text', () => {
    const src = `${'*a '.repeat(5000)}x${' a*'.repeat(5000)}`
    const nodes = parseInline(src)
    expect(inlineDepth(nodes)).toBeLessThanOrEqual(34)
    const flat = (ns: MdInline[]): string => ns.map((n) => ('text' in n ? n.text : 'children' in n ? flat(n.children) : '')).join('')
    expect(flat(nodes).replace(/\s+/g, '')).toBe(src.replace(/[*\s]/g, ''))
  })

  it('MlMarkdown renders hostile nesting without throwing', () => {
    const wrapper = mount(MlMarkdown, { props: { source: `${'> '.repeat(5000)}${'*_'.repeat(3000)}roar` } })
    expect(wrapper.text()).toContain('roar')
    wrapper.unmount()
  })

  it('shallow nesting is untouched', () => {
    const blocks = parseMarkdown('> > - **_a_**')
    expect(depth(blocks)).toBe(3)
  })
})

describe('syntax colouring stays linear', () => {
  const attacks: Record<string, string> = {
    'unclosed block comments': '/*'.repeat(N / 2),
    'unclosed html comments': '<!--'.repeat(N / 4),
    'unclosed template strings': '`a\\`'.repeat(N / 4),
    'escaped double quotes': '"a\\"'.repeat(N / 4),
    'single quotes': " 'a".repeat(N / 3),
    'attribute-like words': ' a'.repeat(N / 2),
  }
  for (const [name, src] of Object.entries(attacks)) {
    it(name, () => {
      for (const lang of ['ts', 'bash']) {
        expect(timed(() => highlightLines(src, lang))).toBeLessThan(BUDGET_MS)
        expect(timed(() => highlightTokens(src, lang))).toBeLessThan(BUDGET_MS)
      }
    })
  }

  it('MlCodeBlock trims a huge run of spaces quickly', () => {
    const code = `a${' '.repeat(N)}b`
    expect(timed(() => mount(MlCodeBlock, { props: { code, plain: true } }).unmount())).toBeLessThan(BUDGET_MS)
  })

  it('a shell glob is not an unclosed comment', () => {
    const [line] = highlightTokens('cp dist/* out/ # copy', 'bash')
    expect(line.find((t) => t.cls === 'tok-comment')?.text).toBe('# copy')
    expect(line.some((t) => t.cls === 'tok-comment' && t.text.includes('/*'))).toBe(false)
  })

  it('an apostrophe does not open a string', () => {
    const [line] = highlightTokens("<p>Don't do it, it's fine</p>", 'vue')
    expect(line.some((t) => t.cls === 'tok-string')).toBe(false)
    expect(line.filter((t) => t.cls === 'tok-tag').map((t) => t.text)).toEqual(['<p', '</p'])
  })

  it('closed comments and strings still colour', () => {
    const [line] = highlightTokens("const a = 'x' /* c */ `t`", 'ts')
    expect(line.filter((t) => t.cls === 'tok-string').map((t) => t.text)).toEqual(["'x'", '`t`'])
    expect(line.find((t) => t.cls === 'tok-comment')?.text).toBe('/* c */')
  })
})

describe('MlCodeBlock renders text, not HTML', () => {
  it('shows markup as text with no injected elements', () => {
    const code = '<img src=x onerror="alert(1)"> <script>alert(2)</script>'
    for (const plain of [true, false]) {
      const wrapper = mount(MlCodeBlock, { props: { code, plain, lang: 'html' } })
      expect(wrapper.find('img').exists()).toBe(false)
      expect(wrapper.find('script').exists()).toBe(false)
      expect(wrapper.find('.ml-code__text').text()).toBe(code)
      wrapper.unmount()
    }
  })

  it('keeps blank lines', () => {
    const wrapper = mount(MlCodeBlock, { props: { code: 'a\n\nb' } })
    expect(wrapper.findAll('.ml-code__line')).toHaveLength(3)
    wrapper.unmount()
  })
})

describe('safeHref', () => {
  it('drops script-running schemes, however they are disguised', () => {
    for (const bad of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', ' javascript:alert(1)', 'java\tscript:alert(1)', 'java\nscript:x', '\u0000javascript:x', 'vbscript:msgbox', 'data:text/html,<script>alert(1)</script>']) {
      expect(safeHref(bad)).toBeUndefined()
    }
  })

  it('keeps ordinary links', () => {
    for (const ok of ['/docs', 'docs/intro', '#top', '?q=1', 'https://malilion.dev', '//cdn.example.com/x', 'mailto:hi@example.com', 'tel:+886212345678', 'myapp://open', 'javascript-guide.html']) {
      expect(safeHref(ok)).toBe(ok)
    }
    expect(safeHref(undefined)).toBeUndefined()
    expect(safeHref('')).toBeUndefined()
  })

  it('components never render a javascript: href', () => {
    const evil = 'javascript:alert(1)'
    const wrappers = [
      mount(MlButton, { props: { href: evil }, slots: { default: 'Go' } }),
      mount(MlListItem, { props: { href: evil, title: 'Go' } }),
      mount(MlBreadcrumb, { props: { items: [{ label: 'Home', href: evil }, { label: 'Here' }] } }),
    ]
    for (const w of wrappers) {
      expect(w.html()).not.toContain('javascript:')
      w.unmount()
    }
    const ok = mount(MlButton, { props: { href: '/pride' }, slots: { default: 'Go' } })
    expect(ok.find('a').attributes('href')).toBe('/pride')
    ok.unmount()
  })
})
