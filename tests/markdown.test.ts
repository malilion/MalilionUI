import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { MlMarkdown, createMarkdownParser, headingIds, parseInline, parseMarkdown, sanitizeUrl, slugify } from '../src'
import type { MdBlock, MdInline } from '../src'

const p = (src: string, streaming = false) => parseMarkdown(src, { streaming })
const inl = (src: string, tail = false) => parseInline(src, { tail })
const text = (t: string): MdInline => ({ type: 'text', text: t })

/** Every href / src anywhere in the tree. */
function urls(blocks: MdBlock[]): string[] {
  const out: string[] = []
  const walkInline = (ns: MdInline[]) =>
    ns.forEach((n) => {
      if (n.type === 'link') {
        out.push(n.href)
        walkInline(n.children)
      } else if (n.type === 'image') out.push(n.src)
      else if ('children' in n) walkInline(n.children)
    })
  const walk = (bs: MdBlock[]) =>
    bs.forEach((b) => {
      if (b.type === 'paragraph' || b.type === 'heading') walkInline(b.children)
      else if (b.type === 'blockquote') walk(b.children)
      else if (b.type === 'list') b.items.forEach((i) => walk(i.children))
      else if (b.type === 'table') [...b.head, ...b.rows.flat()].forEach(walkInline)
    })
  walk(blocks)
  return out
}

describe('markdown: inline', () => {
  it('emphasis, strong, strike and code', () => {
    expect(inl('a **b** *c* _d_ ~~e~~ `f`')).toEqual([
      text('a '),
      { type: 'strong', children: [text('b')] },
      text(' '),
      { type: 'em', children: [text('c')] },
      text(' '),
      { type: 'em', children: [text('d')] },
      text(' '),
      { type: 'del', children: [text('e')] },
      text(' '),
      { type: 'code', text: 'f' },
    ])
  })

  it('nests and follows the delimiter rules', () => {
    expect(inl('***x***')).toEqual([{ type: 'em', children: [{ type: 'strong', children: [text('x')] }] }])
    expect(inl('**a *b* c**')).toEqual([{ type: 'strong', children: [text('a '), { type: 'em', children: [text('b')] }, text(' c')] }])
    expect(inl('snake_case_name')).toEqual([text('snake_case_name')])
    expect(inl('2 * 3 * 4')).toEqual([text('2 * 3 * 4')])
    expect(inl('**unclosed')).toEqual([text('**unclosed')])
  })

  it('code spans keep their content literal', () => {
    expect(inl('`` a ` b ``')).toEqual([{ type: 'code', text: 'a ` b' }])
    expect(inl('`**not bold**`')).toEqual([{ type: 'code', text: '**not bold**' }])
    expect(inl('`open')).toEqual([text('`open')])
  })

  it('links, titles, images, autolinks and bare URLs', () => {
    expect(inl('[a](https://x.dev "T")')).toEqual([{ type: 'link', href: 'https://x.dev', title: 'T', external: true, children: [text('a')] }])
    expect(inl('[in](/docs#x)')).toEqual([{ type: 'link', href: '/docs#x', title: undefined, external: false, children: [text('in')] }])
    expect(inl('![lion](/lion.png)')).toEqual([{ type: 'image', src: '/lion.png', alt: 'lion', title: undefined }])
    expect(inl('<https://a.b/c>')).toEqual([{ type: 'link', href: 'https://a.b/c', external: true, children: [text('https://a.b/c')] }])
    expect(inl('<roar@lion.dev>')).toEqual([{ type: 'link', href: 'mailto:roar@lion.dev', external: false, children: [text('roar@lion.dev')] }])
    expect(inl('see https://a.dev/x. ok')).toEqual([text('see '), { type: 'link', href: 'https://a.dev/x', external: true, children: [text('https://a.dev/x')] }, text('. ok')])
    expect(inl('www.lion.dev')).toEqual([{ type: 'link', href: 'https://www.lion.dev', external: true, children: [text('www.lion.dev')] }])
    expect(inl('[https://a.dev](https://b.dev)')).toEqual([{ type: 'link', href: 'https://b.dev', title: undefined, external: true, children: [text('https://a.dev')] }])
  })

  it('escapes, entities, hard breaks and <br>', () => {
    expect(inl('\\*not\\* \\[x\\]')).toEqual([text('*not* [x]')])
    expect(inl('&lt;b&gt; &amp; &#169; &#x1F43E;')).toEqual([text('<b> & © 🐾')])
    expect(inl('a  \nb\\\nc<br>d')).toEqual([text('a'), { type: 'br' }, text('b'), { type: 'br' }, text('c'), { type: 'br' }, text('d')])
    expect(inl('a\nb')).toEqual([text('a\nb')])
    expect(parseInline('a\nb', { breaks: true })).toEqual([text('a'), { type: 'br' }, text('b')])
  })
})

describe('markdown: blocks', () => {
  it('headings (ATX and setext) with slugs', () => {
    expect(p('# Hi there #\n\nTitle\n===\n\nSub\n---')).toEqual([
      { type: 'heading', level: 1, slug: 'hi-there', children: [text('Hi there')] },
      { type: 'heading', level: 1, slug: 'title', children: [text('Title')] },
      { type: 'heading', level: 2, slug: 'sub', children: [text('Sub')] },
    ])
    expect(p('#hashtag')[0].type).toBe('paragraph')
    expect(slugify('碼力獅 Quick Start!')).toBe('碼力獅-quick-start')
  })

  it('unique heading ids', () => {
    const blocks = p('# A\n## A\n> # A')
    expect([...headingIds(blocks, 'x-').values()]).toEqual(['x-a', 'x-a-1', 'x-a-2'])
  })

  it('paragraphs, hr and blockquotes with lazy lines', () => {
    expect(p('one\ntwo\n\n***\n\n> q\nlazy\n> > deep')).toEqual([
      { type: 'paragraph', children: [text('one\ntwo')] },
      { type: 'hr' },
      {
        type: 'blockquote',
        children: [{ type: 'paragraph', children: [text('q\nlazy')] }, { type: 'blockquote', children: [{ type: 'paragraph', children: [text('deep')] }] }],
      },
    ])
  })

  it('fenced and indented code', () => {
    expect(p('```ts title\nconst a = 1\n\n```\n\n    raw\n    code')).toEqual([
      { type: 'code', lang: 'ts', code: 'const a = 1\n', closed: true },
      { type: 'code', lang: '', code: 'raw\ncode', closed: true },
    ])
    expect(p('~~~\n```\n~~~')).toEqual([{ type: 'code', lang: '', code: '```', closed: true }])
    expect(p('```js\nopen')).toEqual([{ type: 'code', lang: 'js', code: 'open', closed: false }])
  })

  it('nested, ordered, task and loose lists', () => {
    const [list] = p('- a\n- [x] done\n  - nested\n    1. deep\n- [ ] todo') as [Extract<MdBlock, { type: 'list' }>]
    expect(list).toMatchObject({ type: 'list', ordered: false, loose: false })
    expect(list.items.map((i) => [i.task, i.checked])).toEqual([[false, false], [true, true], [true, false]])
    const nested = list.items[1].children[1] as Extract<MdBlock, { type: 'list' }>
    expect(nested.type).toBe('list')
    expect(nested.items[0].children[1]).toMatchObject({ type: 'list', ordered: true, start: 1 })
    expect(p('3. c\n4. d')[0]).toMatchObject({ type: 'list', ordered: true, start: 3 })
    expect(p('1. a\n\n2. b')[0]).toMatchObject({ type: 'list', ordered: true, loose: true, start: 1 })
    // A different bullet starts a new list.
    expect(p('- a\n* b').map((b) => b.type)).toEqual(['list', 'list'])
    // Only "1." may interrupt a paragraph.
    expect(p('year\n2024. was good').map((b) => b.type)).toEqual(['paragraph'])
  })

  it('GFM tables with alignment, escaped pipes and ragged rows', () => {
    expect(p('| a | b | c |\n|:--|:-:|--:|\n| 1 | x\\|y |\n| 4 | 5 | 6 | 7 |')).toEqual([
      {
        type: 'table',
        align: ['left', 'center', 'right'],
        head: [[text('a')], [text('b')], [text('c')]],
        rows: [
          [[text('1')], [text('x|y')], []],
          [[text('4')], [text('5')], [text('6')]],
        ],
      },
    ])
    // A paragraph line right before a header row ends the paragraph.
    expect(p('intro\n| a |\n| - |').map((b) => b.type)).toEqual(['paragraph', 'table'])
  })

  it('normalises CRLF and tabs', () => {
    expect(p('-\tone\r\n-\ttwo')[0]).toMatchObject({ type: 'list', items: [{ children: [{ type: 'paragraph' }] }, {}] })
  })
})

describe('markdown: XSS', () => {
  const evil = [
    '[x](javascript:alert(1))',
    '[x](JaVaScRiPt:alert(1))',
    '[x]( javascript:alert(1))',
    '[x](java\tscript:alert(1))',
    '[x](&#106;avascript:alert(1))',
    '[x](javascript&colon;alert(1))',
    '[x](vbscript:msgbox(1))',
    '[x](data:text/html;base64,PHNjcmlwdD4=)',
    '![x](javascript:alert(1))',
    '![x](data:image/svg+xml,<svg onload=alert(1)>)',
    '<javascript:alert(1)>',
    '[x](<javascript:alert(1)>)',
  ]
  for (const src of evil) {
    it(`drops ${src}`, () => {
      const out = urls(p(src))
      expect(out.filter((u) => /script|data:/i.test(u))).toEqual([])
    })
  }

  it('keeps raw HTML as text', () => {
    expect(p('<script>alert(1)</script>')).toEqual([{ type: 'paragraph', children: [text('<script>alert(1)</script>')] }])
    expect(inl('<img src=x onerror=alert(1)>')).toEqual([text('<img src=x onerror=alert(1)>')])
  })

  it('sanitizeUrl', () => {
    expect(sanitizeUrl('https://a.dev')).toBe('https://a.dev')
    expect(sanitizeUrl('mailto:a@b.c')).toBe('mailto:a@b.c')
    expect(sanitizeUrl('mailto:a@b.c', 'image')).toBeNull()
    expect(sanitizeUrl('/x?y=1#z')).toBe('/x?y=1#z')
    expect(sanitizeUrl('#top')).toBe('#top')
    expect(sanitizeUrl('//cdn.dev/a.png')).toBe('//cdn.dev/a.png')
    expect(sanitizeUrl('a/b:c')).toBe('a/b:c')
    expect(sanitizeUrl('javascript:1')).toBeNull()
    expect(sanitizeUrl('\u0001javascript:1')).toBeNull()
    expect(sanitizeUrl('file:///etc/passwd')).toBeNull()
  })

  it('renders evil input without any live markup (Vue)', async () => {
    const src = '<script>window.pwned=1</script>\n\n[x](javascript:alert(1)) ![y](javascript:1) <img src=x onerror=alert(1)>\n\n| <b onmouseover=1> |\n| - |'
    const html = await renderToString(createSSRApp({ render: () => h(MlMarkdown, { source: src }) }))
    expect(html).not.toMatch(/<script|<img src="x"|<b |javascript:/i)
    expect(html).toContain('&lt;script&gt;')
  })
})

describe('markdown: streaming', () => {
  const s = (src: string) => p(src, true)

  it('a dangling ** never flashes', () => {
    expect(s('Hello **')).toEqual([{ type: 'paragraph', children: [text('Hello')] }])
    expect(s('Hello **wor')).toEqual([{ type: 'paragraph', children: [text('Hello '), { type: 'strong', children: [text('wor')] }] }])
    expect(s('Hello **world*')).toEqual(s('Hello **world**'))
    expect(s('a ~~gone')).toEqual([{ type: 'paragraph', children: [text('a '), { type: 'del', children: [text('gone')] }] }])
    expect(s('- item *it')).toMatchObject([{ type: 'list', items: [{ children: [{ type: 'paragraph', children: [text('item '), { type: 'em' }] }] }] }])
  })

  it('only the tail is finished gracefully', () => {
    const [first] = s('keep **literal\n\nnow **bold')
    expect(first).toEqual({ type: 'paragraph', children: [text('keep **literal')] })
  })

  it('open code spans, fences and links', () => {
    expect(s('run `npm i')).toEqual([{ type: 'paragraph', children: [text('run '), { type: 'code', text: 'npm i' }] }])
    expect(s('run `')).toEqual([{ type: 'paragraph', children: [text('run')] }])
    expect(s('```py\nprint(1)')).toEqual([{ type: 'code', lang: 'py', code: 'print(1)', closed: false }])
    expect(s('see [docs](https://exa')).toEqual([{ type: 'paragraph', children: [text('see docs')] }])
    expect(s('see ![img](https://exa')).toEqual([{ type: 'paragraph', children: [text('see')] }])
  })

  it('partial tables', () => {
    expect(s('| a | b |')).toMatchObject([{ type: 'table', head: [[text('a')], [text('b')]], rows: [] }])
    expect(s('| a | b |\n| -')).toMatchObject([{ type: 'table', rows: [] }])
    expect(s('| a | b |\n|---|---|\n| 1')).toMatchObject([{ type: 'table', rows: [[[text('1')], []]] }])
    // Without streaming a lone pipe line is just text.
    expect(p('| a | b |')[0].type).toBe('paragraph')
  })

  it('the parser reuses unchanged blocks, so only the tail rebuilds', () => {
    const parse = createMarkdownParser()
    const doc = '# Title\n\nFirst paragraph.\n\n```ts\nconst a = 1\n```\n\nStreaming **tail'
    const a = parse(doc.slice(0, -2), { streaming: true })
    const b = parse(doc, { streaming: true })
    expect(b[0]).toBe(a[0])
    expect(b[1]).toBe(a[1])
    expect(b[2]).toBe(a[2])
    expect(b[3]).not.toBe(a[3])
    // Identical blocks in one document stay distinct objects (heading ids rely on it).
    const twice = parse('# A\n\n# A')
    expect(twice[0]).not.toBe(twice[1])
    expect(parse('# A\n\n# A')[0]).toBe(twice[0])
  })
})

describe('MlMarkdown (Vue)', () => {
  it('renders real elements with the brand classes', () => {
    const w = mount(MlMarkdown, {
      props: { source: '## Hi\n\nA [link](https://x.dev) and [in](/a).\n\n- [x] done\n\n| a |\n|--:|\n| 1 |\n\n```ts\nconst a = 1\n```\n\n---' },
    })
    expect(w.get('h2').classes()).toEqual(['ml-markdown__h', 'ml-markdown__h--2'])
    const [ext, internal] = w.findAll('a.ml-markdown__link')
    expect(ext.attributes()).toMatchObject({ href: 'https://x.dev', target: '_blank', rel: 'noopener noreferrer' })
    expect(internal.attributes('target')).toBeUndefined()
    expect(internal.attributes('rel')).toBeUndefined()
    expect((w.get('input.ml-markdown__check').element as HTMLInputElement).checked).toBe(true)
    expect(w.get('td').classes()).toContain('ml-markdown__cell--right')
    expect(w.find('.ml-code').exists()).toBe(true)
    expect(w.find('.ml-code__lang').text()).toBe('ts')
    expect(w.find('hr.ml-markdown__hr').exists()).toBe(true)
  })

  it('link-target and heading anchors', () => {
    const w = mount(MlMarkdown, { props: { source: '# Roar\n\n# Roar\n\n[x](https://x.dev)', headingAnchors: true, anchorPrefix: 'p-', linkTarget: '' } })
    expect(w.findAll('h1').map((x) => x.attributes('id'))).toEqual(['p-roar', 'p-roar-1'])
    expect(w.get('.ml-markdown__anchor').attributes('href')).toBe('#p-roar')
    expect(w.get('.ml-markdown__link').attributes('target')).toBeUndefined()
  })

  it('streaming shows a caret at the end of the last text, then removes it', async () => {
    const w = mount(MlMarkdown, { props: { source: '- one\n- two **bo', streaming: true } })
    expect(w.attributes('aria-busy')).toBe('true')
    const caret = w.get('.ml-markdown__caret')
    expect(caret.element.parentElement?.tagName).toBe('LI')
    expect(caret.attributes('aria-label')).toBe('正在產生回覆…')
    expect(w.findAll('li')[1].text()).toBe('two bo')
    await w.setProps({ source: '```js\nlet a' })
    // After a code block the caret sits on its own.
    expect(w.get('.ml-markdown__caret').element.parentElement).toBe(w.element)
    await w.setProps({ streaming: false, caret: 'paw' })
    expect(w.find('.ml-markdown__caret').exists()).toBe(false)
    expect(w.attributes('aria-busy')).toBeUndefined()
  })

  it('paw caret', () => {
    const w = mount(MlMarkdown, { props: { source: '', streaming: true, caret: 'paw' } })
    expect(w.find('.ml-markdown__caret--paw .ml-paw').exists()).toBe(true)
  })

  it('keeps finished blocks while streaming', async () => {
    const w = mount(MlMarkdown, { props: { source: 'First.\n\nSecond', streaming: true } })
    const first = w.get('p').element
    await w.setProps({ source: 'First.\n\nSecond line' })
    await nextTick()
    expect(w.get('p').element).toBe(first)
    expect(w.findAll('p')[1].text()).toBe('Second line')
  })

  it('custom #code / #link / #image slots', () => {
    const w = mount(MlMarkdown, {
      props: { source: '```lion\nroar\n```\n\n[x](https://x.dev) ![a](/a.png)' },
      slots: {
        code: ({ code, lang }: { code: string; lang: string }) => h('pre', { class: 'mine' }, `${lang}:${code}`),
        link: ({ href, text }: { href: string; text: string }) => h('b', { 'data-href': href }, text),
        image: ({ src, alt }: { src: string; alt: string }) => h('i', { 'data-src': src }, alt),
      },
    })
    expect(w.get('pre.mine').text()).toBe('lion:roar')
    expect(w.find('.ml-code').exists()).toBe(false)
    expect(w.get('b').attributes('data-href')).toBe('https://x.dev')
    expect(w.get('i').text()).toBe('a')
  })

  it('forwards copy from code blocks', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.resolve() }, configurable: true })
    const w = mount(MlMarkdown, { props: { source: '```sh\nnpm i\n```' } })
    await w.get('.ml-code button').trigger('click')
    await new Promise((r) => setTimeout(r))
    expect(w.emitted('copy')).toEqual([['npm i']])
  })
})
