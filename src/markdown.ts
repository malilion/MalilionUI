// Markdown → a small, framework-free tree that MlMarkdown (Vue) and Markdown
// (React) turn into real elements. Nothing here ever produces an HTML string:
// raw HTML in the source stays text, and every href / src goes through
// sanitizeUrl, so the output is XSS-safe by construction.
//
// CommonMark-flavoured with the GFM bits chat models use (tables, task lists,
// ~~strike~~, bare URLs). Not supported: link reference definitions, footnotes,
// HTML blocks (shown as text).
//
// Built for streaming: a parser made by createMarkdownParser() remembers the
// top-level blocks it built, keyed by their source, so while an answer streams
// in only the last block is rebuilt and every earlier block keeps its identity
// (so the renderers can skip it). With `streaming: true` the unfinished tail is
// rendered gracefully: a dangling `**` is treated as already closed, an open
// `code span` or ``` fence runs to the end, a half-typed link shows its text.

/* ── Tree ──────────────────────────────────────────────── */

export type MdAlign = 'left' | 'center' | 'right' | null

export type MdInline =
  | { type: 'text'; text: string }
  | { type: 'strong' | 'em' | 'del'; children: MdInline[] }
  | { type: 'code'; text: string }
  | { type: 'link'; href: string; title?: string; external: boolean; children: MdInline[] }
  | { type: 'image'; src: string; alt: string; title?: string }
  | { type: 'br' }

export interface MdHeading {
  type: 'heading'
  level: 1 | 2 | 3 | 4 | 5 | 6
  /** GitHub-style slug of the text (before de-duplication, see headingIds). */
  slug: string
  children: MdInline[]
}

export interface MdCode {
  type: 'code'
  /** First word of the fence info string, '' when none. */
  lang: string
  code: string
  /** false while a fence is still open (streaming, or never closed). */
  closed: boolean
}

export interface MdListItem {
  /** A GFM task item: `- [ ]` / `- [x]`. */
  task: boolean
  checked: boolean
  children: MdBlock[]
}

export interface MdList {
  type: 'list'
  ordered: boolean
  start: number
  /** Loose lists wrap item text in paragraphs; tight ones don't. */
  loose: boolean
  items: MdListItem[]
}

export interface MdTable {
  type: 'table'
  align: MdAlign[]
  head: MdInline[][]
  rows: MdInline[][][]
}

export type MdBlock =
  | MdHeading
  | { type: 'paragraph'; children: MdInline[] }
  | MdCode
  | { type: 'blockquote'; children: MdBlock[] }
  | MdList
  | MdTable
  | { type: 'hr' }

/** Props of MlMarkdown's #code slot (React: components.code). */
export interface MlMarkdownCodeSlot {
  code: string
  /** Fence language, '' when none. */
  lang: string
  /** false while the fence is still open (streaming). */
  closed: boolean
}

/** Props of MlMarkdown's #link slot (React adds the rendered children). */
export interface MlMarkdownLinkSlot {
  /** Already sanitised. */
  href: string
  title?: string
  /** http(s) / protocol-relative: opens in a new tab by default. */
  external: boolean
  /** The link's text content. */
  text: string
}

/** Props of MlMarkdown's #image slot (React: components.image). */
export interface MlMarkdownImageSlot {
  /** Already sanitised. */
  src: string
  alt: string
  title?: string
}

export interface MdParseOptions {
  /** The source is still arriving: finish the open tail gracefully. */
  streaming?: boolean
  /** Treat single newlines inside a paragraph as line breaks. */
  breaks?: boolean
}

/* ── URLs ──────────────────────────────────────────────── */

const SAFE_SCHEMES = new Set(['http', 'https', 'mailto'])

/**
 * The URL when it's safe to put in href / src, else null. Allowed: http(s),
 * mailto (links only), protocol-relative, relative paths, ?query and #hash.
 * Everything else — javascript:, data:, vbscript:, file:… — is refused.
 */
export function sanitizeUrl(url: string, kind: 'link' | 'image' = 'link'): string | null {
  // Control characters and whitespace are ignored by URL parsers inside the scheme.
  const clean = url.trim()
  const probe = clean.replace(/[\u0000- \u007f-\u009f]/g, '')
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(probe)
  if (scheme) {
    const name = scheme[1].toLowerCase()
    if (!SAFE_SCHEMES.has(name)) return null
    if (kind === 'image' && name === 'mailto') return null
    return clean
  }
  // A colon before any / ? # means the browser would still read a scheme;
  // so might an entity there (`javascript&colon;` once something decodes it).
  if (/^[^/?#]*(?::|&#?\w+;)/.test(probe)) return null
  return clean
}

/** Opens somewhere else: http(s) or protocol-relative. */
export const isExternalUrl = (url: string) => /^(https?:)?\/\//i.test(url.trim())

/* ── Slugs ─────────────────────────────────────────────── */

/** GitHub-style heading slug; keeps CJK and other letters. */
export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, '')
      .replace(/\s/g, '-') || 'section'
  )
}

/** Plain text of some inline nodes (for slugs, alt text, slot props). */
export function inlineText(nodes: MdInline[]): string {
  let out = ''
  for (const n of nodes) {
    if (n.type === 'text' || n.type === 'code') out += n.text
    else if (n.type === 'image') out += n.alt
    else if (n.type === 'br') out += '\n'
    else out += inlineText(n.children)
  }
  return out
}

/** Unique ids for every heading in the tree: repeats get -1, -2… like GitHub. */
export function headingIds(blocks: MdBlock[], prefix = ''): Map<MdHeading, string> {
  const ids = new Map<MdHeading, string>()
  const seen = new Map<string, number>()
  const walk = (list: MdBlock[]) => {
    for (const b of list) {
      if (b.type === 'heading') {
        const n = seen.get(b.slug) ?? 0
        seen.set(b.slug, n + 1)
        ids.set(b, prefix + (n ? `${b.slug}-${n}` : b.slug))
      } else if (b.type === 'blockquote') walk(b.children)
      else if (b.type === 'list') b.items.forEach((item) => walk(item.children))
    }
  }
  walk(blocks)
  return ids
}

/* ── Entities ──────────────────────────────────────────── */

const NAMED: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  copy: '©',
  reg: '®',
  trade: '™',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  middot: '·',
  times: '×',
  larr: '←',
  rarr: '→',
  colon: ':',
  tab: '\t',
  newline: '\n',
}

function decodeEntities(text: string): string {
  if (!text.includes('&')) return text
  return text.replace(/&(?:#(\d{1,7})|#[xX]([\da-fA-F]{1,6})|([a-zA-Z]+));/g, (m, dec, hex, name) => {
    if (name) return NAMED[name] ?? m
    const code = dec ? parseInt(dec, 10) : parseInt(hex, 16)
    return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : '�'
  })
}

/* ── Inline ────────────────────────────────────────────── */

const PUNCT = /[!-/:-@[-`{-~\p{P}\p{S}]/u
const SPACE = /\s/u
const ESCAPABLE = /[!-/:-@[-`{-~]/

type Tok =
  | { kind: 'text'; text: string }
  | { kind: 'node'; node: MdInline }
  | { kind: 'delim'; char: string; count: number; orig: number; canOpen: boolean; canClose: boolean }
  | { kind: 'bracket'; image: boolean; active: boolean }

function pushText(out: MdInline[], text: string) {
  if (!text) return
  const last = out[out.length - 1]
  if (last && last.type === 'text') last.text += text
  else out.push({ type: 'text', text })
}

/** Turn processed tokens into nodes; anything unmatched becomes literal text. */
function toNodes(toks: Tok[]): MdInline[] {
  const out: MdInline[] = []
  for (const t of toks) {
    if (t.kind === 'text') pushText(out, t.text)
    else if (t.kind === 'delim') pushText(out, t.char.repeat(t.count))
    else if (t.kind === 'bracket') pushText(out, t.image ? '![' : '[')
    else if (t.node.type === 'text') pushText(out, t.node.text)
    else out.push(t.node)
  }
  return out
}

/**
 * Deepest inline nesting kept (`*_*_…` or links in emphasis). Anything deeper
 * is flattened to text, so hostile input can't build a tree that overflows
 * the stack of whatever walks it.
 */
const MAX_INLINE_DEPTH = 32
// Nesting depth of the container nodes made by the current parseInline call.
let depths = new Map<MdInline, number>()

/** A container node; past MAX_INLINE_DEPTH its children collapse to plain text. */
function wrap<T extends 'strong' | 'em' | 'del'>(type: T, children: MdInline[]): MdInline {
  let deepest = 0
  for (const c of children) deepest = Math.max(deepest, depths.get(c) ?? 0)
  if (deepest + 1 > MAX_INLINE_DEPTH) children = [{ type: 'text', text: inlineText(children) }]
  const node: MdInline = { type, children }
  depths.set(node, deepest + 1 > MAX_INLINE_DEPTH ? 1 : deepest + 1)
  return node
}

/** Replace toks[from..] with `items` (no spread, so huge arrays can't blow the call stack). */
function replaceTail(toks: Tok[], from: number, items: Tok[]) {
  toks.length = from
  for (const t of items) toks.push(t)
}

/**
 * CommonMark's "process emphasis" over toks[bottom..]; mutates toks.
 * One left-to-right pass with an opener stack and the spec's openers_bottom
 * table, so it stays linear however many delimiter runs there are.
 */
function processEmphasis(toks: Tok[], bottom: number) {
  type Delim = Extract<Tok, { kind: 'delim' }>
  const out: Tok[] = []
  // Indexes into `out` of delimiters that may still open.
  const openers: number[] = []
  // Per closer kind: below this many openers, searching again is pointless.
  const floor = new Map<string, number>()
  for (let k = bottom; k < toks.length; k++) {
    const closer = toks[k]
    if (closer.kind !== 'delim' || closer.count === 0) {
      out.push(closer)
      continue
    }
    const key = closer.char === '~' ? `~${closer.count}` : `${closer.char}${closer.canOpen ? 1 : 0}${closer.orig % 3}`
    while (closer.canClose && closer.count > 0) {
      let s = openers.length - 1
      const stop = Math.min(floor.get(key) ?? 0, openers.length)
      for (; s >= stop; s--) {
        const o = out[openers[s]] as Delim
        if (o.char !== closer.char) continue
        if (closer.char === '~') {
          if (o.count === closer.count && o.count <= 2) break
          continue
        }
        // The "rule of 3" for runs that can both open and close.
        if ((o.canClose || closer.canOpen) && (o.orig + closer.orig) % 3 === 0 && !(o.orig % 3 === 0 && closer.orig % 3 === 0)) continue
        break
      }
      if (s < stop) {
        floor.set(key, openers.length)
        break
      }
      const at = openers[s]
      const opener = out[at] as Delim
      const use = closer.char === '~' ? closer.count : opener.count >= 2 && closer.count >= 2 ? 2 : 1
      const node = wrap(closer.char === '~' ? 'del' : use === 2 ? 'strong' : 'em', toNodes(out.slice(at + 1)))
      opener.count -= use
      closer.count -= use
      // Delimiters between the pair can't match anything any more.
      openers.length = opener.count ? s + 1 : s
      out.length = opener.count ? at + 1 : at
      out.push({ kind: 'node', node })
    }
    if (closer.count === 0) continue
    if (closer.canOpen) openers.push(out.length)
    out.push(closer)
  }
  replaceTail(toks, bottom, out)
}

/** Streaming: close every opener still waiting, innermost first. */
function autoClose(toks: Tok[], bottom: number) {
  for (let i = toks.length - 1; i >= bottom; i--) {
    const t = toks[i]
    if (t.kind !== 'delim' || !t.canOpen || t.count === 0) continue
    let node: MdInline
    const children = toNodes(toks.slice(i + 1))
    if (t.char === '~') node = wrap('del', children)
    else if (t.count >= 3) node = wrap('em', [wrap('strong', children)])
    else node = wrap(t.count === 2 ? 'strong' : 'em', children)
    replaceTail(toks, i, [{ kind: 'node', node }])
  }
}

/**
 * Memoised look-aheads over one inline source. A `](`, `<` or backtick run
 * that never finds its closer would otherwise rescan to the end of the text
 * every time — quadratic on input like `[a](` × 10 000. Each scan here is
 * answered from the previous one whenever the answer can't have changed.
 */
class Lookahead {
  private memo = new Map<string, { from: number; at: number }>()
  private stops?: Int32Array

  readonly src: string

  constructor(src: string) {
    this.src = src
  }

  /**
   * First result of `scan(from)`, reusing the last answer for `key`: valid
   * when `scan` returns the first position ≥ from that matches something
   * independent of `from` (or -1 for "none").
   */
  private find(key: string, from: number, scan: (from: number) => number): number {
    const hit = this.memo.get(key)
    if (hit && from >= hit.from && (hit.at === -1 || from <= hit.at)) return hit.at
    const at = scan(from)
    // An immediate answer was cheap; keep the remembered (costly) one instead.
    if (at !== from) this.memo.set(key, { from, at })
    return at
  }

  indexOf(needle: string, from: number): number {
    return this.find(`i${needle}`, from, (f) => this.src.indexOf(needle, f))
  }

  /** First position ≥ from that isn't a space, tab or newline. */
  skipSpace(from: number): number {
    return this.find('s', from, (f) => {
      let i = f
      while (i < this.src.length && (this.src[i] === ' ' || this.src[i] === '\t' || this.src[i] === '\n')) i++
      return i
    })
  }

  /** A run of exactly n backticks starting at or after `from`, or -1. */
  backticks(n: number, from: number): number {
    return this.find(`b${n}`, from, (f) => {
      const src = this.src
      const fence = '`'.repeat(n)
      let k = f
      while ((k = src.indexOf(fence, k)) !== -1) {
        if (src[k + n] !== '`' && src[k - 1] !== '`') return k
        while (src[k] === '`') k++
      }
      return -1
    })
  }

  /** The unescaped `end` closing a link title that opened just before `from`, or -1. */
  titleEnd(end: string, from: number): number {
    return this.find(`t${end}`, from, (f) => {
      let k = f
      while (k < this.src.length && this.src[k] !== end) k += this.src[k] === '\\' ? 2 : 1
      return k < this.src.length ? k : -1
    })
  }

  /**
   * Where a bare link destination starting at `from` stops: the first space or
   * control character, or the first `)` that would unbalance its parentheses.
   * Worked out for every start at once (prefix paren balance, read right to
   * left), so each lookup is O(1).
   */
  destinationEnd(from: number): number {
    if (!this.stops) {
      const src = this.src
      const n = src.length
      const esc = new Uint8Array(n + 1)
      for (let k = 0; k + 1 < n; k++) if (!esc[k] && src[k] === '\\' && ESCAPABLE.test(src[k + 1])) esc[k + 1] = 1
      const bal = new Int32Array(n + 1)
      for (let k = 0; k < n; k++) bal[k + 1] = bal[k] + (esc[k] ? 0 : src[k] === '(' ? 1 : src[k] === ')' ? -1 : 0)
      const stops = new Int32Array(n + 1)
      stops[n] = n
      // Nearest unescaped `)` to the right, per paren balance before it.
      const closeAt = new Map<number, number>()
      let space = n
      for (let k = n - 1; k >= 0; k--) {
        if (!esc[k] && src[k] === ')') closeAt.set(bal[k], k)
        if (src.charCodeAt(k) <= 0x20) space = k
        stops[k] = Math.min(space, closeAt.get(bal[k]) ?? n)
      }
      this.stops = stops
    }
    return this.stops[from]
  }
}

/** Link destination and optional title after `](`. Returns the index after `)`. */
function linkTail(la: Lookahead, start: number): { href: string; title?: string; end: number } | null {
  const src = la.src
  let i = la.skipSpace(start)
  let href = ''
  if (src[i] === '<') {
    const close = la.indexOf('>', i + 1)
    if (close < 0) return null
    const nl = la.indexOf('\n', i + 1)
    if (nl !== -1 && nl < close) return null
    href = src.slice(i + 1, close)
    i = close + 1
  } else {
    const from = i
    i = la.destinationEnd(from)
    href = src.slice(from, i)
  }
  i = la.skipSpace(i)
  let title: string | undefined
  const q = src[i]
  if (q === '"' || q === "'" || q === '(') {
    const k = la.titleEnd(q === '(' ? ')' : q, i + 1)
    if (k === -1) return null
    title = unescape(src.slice(i + 1, k))
    i = la.skipSpace(k + 1)
  }
  if (src[i] !== ')') return null
  return { href: unescape(href), title, end: i + 1 }
}

const unescape = (s: string) => decodeEntities(s.replace(/\\([!-/:-@[-`{-~])/g, '$1'))

const AUTOLINK = /^<([a-zA-Z][a-zA-Z0-9+.-]{1,31}:[^\s<>]*)>/
const EMAIL_AUTOLINK = /^<([a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)>/
// The lookaheads reject `http:///` or a lone `www.` before the run is scanned:
// a rejected match must not cost the length of the rest of the line.
const BARE_URL = /^(?:https?:\/\/(?=[^\s</])|www\.(?=[^\s<.]+\.))[^\s<]*/i
const BR_TAG = /^<br\s*\/?>/i

/** End of `s` once trailing characters in `set` are dropped (a loop, not `/[…]+$/`, which backtracks quadratically). */
function trimEndIndex(s: string, set: string, end = s.length): number {
  while (end > 0 && set.includes(s[end - 1])) end--
  return end
}

const URL_TRAIL = `?!.,:*_~'"`

/** Trim the trailing punctuation GFM leaves out of bare URLs. */
function trimUrl(url: string): string {
  let end = trimEndIndex(url, URL_TRAIL)
  let open = 0
  let close = 0
  for (let k = 0; k < end; k++) {
    if (url[k] === '(') open++
    else if (url[k] === ')') close++
  }
  // Unbalanced closing parens are punctuation too.
  while (url[end - 1] === ')' && open < close) {
    close--
    end = trimEndIndex(url, URL_TRAIL, end - 1)
  }
  return url.slice(0, end)
}

/** Links can't nest: a bare URL inside link text stays text. */
function unlink(nodes: MdInline[]): MdInline[] {
  return nodes.flatMap((n): MdInline[] => {
    if (n.type === 'link') return unlink(n.children)
    if (!('children' in n)) return [n]
    const copy = { ...n, children: unlink(n.children) }
    depths.set(copy, depths.get(n) ?? 0)
    return [copy]
  })
}

function linkNode(href: string, children: MdInline[], title?: string): MdInline[] {
  const safe = sanitizeUrl(href, 'link')
  // An unsafe link keeps its text and loses the link.
  if (safe === null) return children
  return [{ type: 'link', href: safe, title, external: isExternalUrl(safe), children }]
}

interface InlineOptions {
  /** This text ends where the streamed source currently ends. */
  tail?: boolean
  breaks?: boolean
}

/** Parse inline Markdown into nodes. */
export function parseInline(src: string, opts: InlineOptions = {}): MdInline[] {
  let text = src
  if (opts.tail) {
    // A delimiter run still being typed (`**`, a half closer `*`, `~~`) is
    // dropped instead of flashing on screen as a literal.
    let end = trimEndIndex(text, '*_~')
    // `\*` at the end is a literal star: keep it.
    if (end < text.length && text[end - 1] === '\\') end++
    text = text.slice(0, end)
  }
  const la = new Lookahead(text)
  depths = new Map()
  const toks: Tok[] = []
  const brackets: number[] = []
  let buf = ''
  // Spaces not yet added to buf: a newline drops them without touching buf,
  // which is built by concatenation and costs O(length) to inspect.
  let spaces = 0
  const add = (s: string) => {
    if (spaces) buf += ' '.repeat(spaces)
    spaces = 0
    buf += s
  }
  const flush = () => {
    add('')
    if (buf) toks.push({ kind: 'text', text: decodeEntities(buf) })
    buf = ''
  }
  const node = (n: MdInline) => {
    flush()
    toks.push({ kind: 'node', node: n })
  }

  let i = 0
  // Whether a bare URL may start here (not mid-word).
  const atWordStart = () => i === 0 || /[\s*_~(]/.test(text[i - 1])
  while (i < text.length) {
    const c = text[i]

    if (c === '\\') {
      const next = text[i + 1]
      if (next === '\n') {
        flush()
        toks.push({ kind: 'node', node: { type: 'br' } })
        i += 2
        continue
      }
      if (next !== undefined && ESCAPABLE.test(next)) {
        // Pushed raw so `\&amp;` stays literal.
        flush()
        toks.push({ kind: 'text', text: next })
        i += 2
        continue
      }
      add(c)
      i++
      continue
    }

    if (c === '\n') {
      // Two or more trailing spaces make a hard break.
      const hard = spaces >= 2
      spaces = 0
      if (hard || opts.breaks) node({ type: 'br' })
      else add('\n')
      i++
      while (text[i] === ' ') i++
      continue
    }

    if (c === '`') {
      let n = 1
      while (text[i + n] === '`') n++
      const fence = '`'.repeat(n)
      const close = la.backticks(n, i + n)
      if (close === -1 && !opts.tail) {
        add(fence)
        i += n
        continue
      }
      let code = (close === -1 ? text.slice(i + n) : text.slice(i + n, close)).replace(/\n/g, ' ')
      if (code.length > 2 && code.startsWith(' ') && code.endsWith(' ') && code.trim()) code = code.slice(1, -1)
      if (close === -1 && !code) {
        // Just the opening backticks so far: show nothing yet.
        i = text.length
        continue
      }
      node({ type: 'code', text: code })
      i = close === -1 ? text.length : close + n
      continue
    }

    if (c === '<') {
      const rest = text.slice(i)
      let m = AUTOLINK.exec(rest)
      if (m) {
        flush()
        const safe = sanitizeUrl(m[1])
        if (safe === null) add(m[0])
        else toks.push({ kind: 'node', node: { type: 'link', href: safe, external: isExternalUrl(safe), children: [{ type: 'text', text: m[1] }] } })
        i += m[0].length
        continue
      }
      m = EMAIL_AUTOLINK.exec(rest)
      if (m) {
        node({ type: 'link', href: `mailto:${m[1]}`, external: false, children: [{ type: 'text', text: m[1] }] })
        i += m[0].length
        continue
      }
      m = BR_TAG.exec(rest)
      if (m) {
        node({ type: 'br' })
        i += m[0].length
        continue
      }
      // Any other HTML is just text.
      add(c)
      i++
      continue
    }

    if ((c === 'h' || c === 'H' || c === 'w' || c === 'W') && atWordStart()) {
      const m = BARE_URL.exec(text.slice(i))
      if (m) {
        const url = trimUrl(m[0])
        const isWww = /^www\./i.test(url)
        // Something after the scheme / www. (and a dot for www).
        if (isWww ? /^www\.[^.]+\./i.test(url) : /^https?:\/\/[^/]/i.test(url)) {
          const href = isWww ? `https://${url}` : url
          const safe = sanitizeUrl(href)
          if (safe !== null) {
            node({ type: 'link', href: safe, external: true, children: [{ type: 'text', text: url }] })
            i += url.length
            continue
          }
        }
      }
    }

    if (c === '*' || c === '_' || c === '~') {
      let n = 1
      while (text[i + n] === c) n++
      const before = i === 0 ? '\n' : text[i - 1]
      const after = i + n >= text.length ? '\n' : text[i + n]
      const left = !SPACE.test(after) && (!PUNCT.test(after) || SPACE.test(before) || PUNCT.test(before))
      const right = !SPACE.test(before) && (!PUNCT.test(before) || SPACE.test(after) || PUNCT.test(after))
      let canOpen = left
      let canClose = right
      if (c === '_') {
        canOpen = left && (!right || PUNCT.test(before))
        canClose = right && (!left || PUNCT.test(after))
      }
      if (c === '~' && n > 2) {
        add(text.slice(i, i + n))
        i += n
        continue
      }
      flush()
      toks.push({ kind: 'delim', char: c, count: n, orig: n, canOpen, canClose })
      i += n
      continue
    }

    if (c === '!' && text[i + 1] === '[') {
      flush()
      brackets.push(toks.length)
      toks.push({ kind: 'bracket', image: true, active: true })
      i += 2
      continue
    }

    if (c === '[') {
      flush()
      brackets.push(toks.length)
      toks.push({ kind: 'bracket', image: false, active: true })
      i++
      continue
    }

    if (c === ']' && brackets.length) {
      flush()
      const at = brackets.pop() as number
      const opener = toks[at] as Extract<Tok, { kind: 'bracket' }>
      if (!opener.active || text[i + 1] !== '(') {
        // Not a link: the brackets are just text.
        toks[at] = { kind: 'text', text: opener.image ? '![' : '[' }
        add(']')
        i++
        continue
      }
      const tail = linkTail(la, i + 2)
      if (!tail) {
        if (opts.tail && la.indexOf(')', i + 2) === -1) {
          // Streaming a half-typed `[text](http…`: show the text alone.
          processEmphasis(toks, at + 1)
          const inner = toNodes(toks.slice(at + 1))
          replaceTail(toks, at, opener.image ? [] : inner.map((n): Tok => ({ kind: 'node', node: n })))
          i = text.length
          brackets.length = 0
          continue
        }
        toks[at] = { kind: 'text', text: opener.image ? '![' : '[' }
        add(']')
        i++
        continue
      }
      processEmphasis(toks, at + 1)
      const inner = toNodes(toks.slice(at + 1))
      let made: MdInline[]
      if (opener.image) {
        const safe = sanitizeUrl(tail.href, 'image')
        const alt = inlineText(inner)
        made = safe === null ? (alt ? [{ type: 'text', text: alt }] : []) : [{ type: 'image', src: safe, alt, title: tail.title }]
      } else {
        made = linkNode(tail.href, unlink(inner), tail.title)
        // No links inside links: earlier `[` openers can't become links now.
        for (const b of brackets) {
          const t = toks[b]
          if (t.kind === 'bracket' && !t.image) t.active = false
        }
      }
      replaceTail(toks, at, made.map((n): Tok => ({ kind: 'node', node: n })))
      i = tail.end
      continue
    }

    if (c === ' ') spaces++
    else add(c)
    i++
  }
  flush()
  processEmphasis(toks, 0)
  if (opts.tail) autoClose(toks, 0)
  const out = toNodes(toks)
  depths = new Map()
  // Soft line break at the very end / start never matters.
  const last = out[out.length - 1]
  if (last?.type === 'text') last.text = last.text.trimEnd()
  if (last?.type === 'text' && !last.text) out.pop()
  return out
}

/* ── Blocks ────────────────────────────────────────────── */

const RE_BLANK = /^[ \t]*$/
const RE_FENCE = /^( {0,3})(`{3,}|~{3,})(.*)$/
// Content is taken whole and trimmed in code: `(.*?)[ \t]*$` backtracks quadratically on long runs of spaces.
const RE_ATX = /^ {0,3}(#{1,6})(?:[ \t]+(.*))?$/
const RE_HR = /^ {0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$/
const RE_QUOTE = /^ {0,3}> ?/
const RE_BULLET = /^( {0,3})([-+*])(?:([ \t]+)(.*)|$)/
const RE_ORDERED = /^( {0,3})(\d{1,9})([.)])(?:([ \t]+)(.*)|$)/
const RE_SETEXT = /^ {0,3}(=+|-+)[ \t]*$/
const RE_DELIM_ROW = /^ {0,3}\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/

const isBlank = (line: string) => RE_BLANK.test(line)
const indentOf = (line: string) => line.length - line.trimStart().length

/** Expand leading tabs to spaces (tab stop 4) so indentation is countable. */
function expandTabs(line: string): string {
  if (!line.includes('\t')) return line
  let out = ''
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '\t') out += ' '.repeat(4 - (out.length % 4))
    else if (c === ' ') out += c
    else return out + line.slice(i)
  }
  return out
}

/** Split a table row into cell sources on unescaped pipes. */
function splitRow(line: string): string[] {
  let s = line.trim()
  if (s.startsWith('|')) s = s.slice(1)
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1)
  const cells: string[] = []
  let cur = ''
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\' && s[i + 1] === '|') {
      cur += '|'
      i++
    } else if (s[i] === '|') {
      cells.push(cur.trim())
      cur = ''
    } else cur += s[i]
  }
  cells.push(cur.trim())
  return cells
}

/** ATX heading content without trailing blanks or a closing `###` sequence. */
function stripClosingHashes(content: string): string {
  const end = trimEndIndex(content, ' \t')
  const hashes = trimEndIndex(content, '#', end)
  if (hashes === end) return content.slice(0, end)
  if (hashes > 0 && content[hashes - 1] !== ' ' && content[hashes - 1] !== '\t') return content.slice(0, end)
  return content.slice(0, trimEndIndex(content, ' \t', hashes))
}

function parseAlign(row: string): MdAlign[] {
  return splitRow(row).map((cell) => {
    const l = cell.startsWith(':')
    const r = cell.endsWith(':') && cell.length > 1
    return l && r ? 'center' : r ? 'right' : l ? 'left' : null
  })
}

interface ListMarker {
  ordered: boolean
  /** Bullet char or `.` / `)` — a different one starts a new list. */
  mark: string
  start: number
  /** Column where the item's content starts. */
  width: number
  /** First line's content (after the marker). */
  first: string
  empty: boolean
}

function listMarker(line: string): ListMarker | null {
  if (RE_HR.test(line)) return null
  const b = RE_BULLET.exec(line)
  const o = b ? null : RE_ORDERED.exec(line)
  const m = b ?? o
  if (!m) return null
  const markerEnd = m[1].length + m[2].length + (o ? 1 : 0)
  const gap = (o ? m[4] : m[3]) ?? ''
  const content = (o ? m[5] : m[4]) ?? ''
  const empty = !content.trim()
  // 5+ spaces after the marker: the content is indented code, width is marker + 1.
  const width = empty || gap.length > 4 ? markerEnd + 1 : markerEnd + gap.length
  return {
    ordered: !!o,
    mark: o ? m[3] : m[2],
    start: o ? parseInt(m[2], 10) : 1,
    width,
    first: empty ? '' : gap.length > 4 ? ' '.repeat(gap.length - 1) + content : content,
    empty,
  }
}

interface Ctx {
  /** The block ending last in this container sits at the streamed tail. */
  tail: boolean
  breaks: boolean
  streaming: boolean
  /** How many quotes / lists this container sits in. */
  depth: number
}

/** Deeper quotes and lists are read as plain paragraphs, so nesting can't overflow the stack. */
const MAX_BLOCK_DEPTH = 32

/** Does this line start a block that can interrupt a paragraph? */
function interrupts(line: string): boolean {
  if (RE_FENCE.test(line) || RE_ATX.test(line) || RE_HR.test(line) || RE_QUOTE.test(line)) return true
  const m = listMarker(line)
  return !!m && !m.empty && (!m.ordered || m.start === 1)
}

/** A paragraph line followed by a delimiter row with as many cells. */
function tableAt(lines: string[], i: number): boolean {
  const head = lines[i]
  const delim = lines[i + 1]
  if (head === undefined || delim === undefined || !head.includes('|') || !RE_DELIM_ROW.test(delim)) return false
  return splitRow(head).length === splitRow(delim).length
}

interface Span {
  end: number
  /** Cache key prefix: the kind of block. */
  kind: string
  build: (lines: string[], ctx: Ctx) => MdBlock
}

function fenceSpan(lines: string[], i: number, m: RegExpExecArray): Span {
  const indent = m[1].length
  const fence = m[2]
  let j = i + 1
  let closed = false
  for (; j < lines.length; j++) {
    const c = /^ {0,3}(`{3,}|~{3,})[ \t]*$/.exec(lines[j])
    if (c && c[1][0] === fence[0] && c[1].length >= fence.length) {
      closed = true
      break
    }
  }
  return {
    end: closed ? j + 1 : j,
    kind: 'fence',
    build: (ls) => {
      const info = /^( {0,3})(`{3,}|~{3,})(.*)$/.exec(ls[0])?.[3] ?? ''
      const body = ls.slice(1, closed ? -1 : undefined).map((l) => l.replace(new RegExp(`^ {0,${indent}}`), ''))
      return { type: 'code', lang: unescape(info.trim().split(/\s+/)[0] ?? ''), code: body.join('\n'), closed }
    },
  }
}

function listSpan(lines: string[], i: number, first: ListMarker): Span {
  let j = i
  let marker: ListMarker | null = first
  let prevBlank = false
  // Each item: [start line, end line).
  while (j < lines.length && marker) {
    j++
    let lastContent = j
    prevBlank = false
    let lazyOk = !marker.empty
    for (; j < lines.length; j++) {
      const line = lines[j]
      if (isBlank(line)) {
        prevBlank = true
        continue
      }
      if (indentOf(line) >= marker.width) {
        prevBlank = false
        lastContent = j + 1
        lazyOk = true
        continue
      }
      // Lazy continuation of a paragraph.
      if (!prevBlank && lazyOk && !interrupts(line) && !listMarker(line) && !RE_SETEXT.test(line)) {
        lastContent = j + 1
        continue
      }
      break
    }
    const next = j < lines.length ? listMarker(lines[j]) : null
    if (next && next.ordered === first.ordered && next.mark === first.mark) {
      marker = next
      continue
    }
    j = lastContent
    break
  }
  return { end: j, kind: 'list', build: buildList }
}

function buildList(ls: string[], ctx: Ctx): MdList {
  const items: MdListItem[] = []
  let loose = false
  let first: ListMarker | null = null
  let k = 0
  while (k < ls.length) {
    const m = listMarker(ls[k]) as ListMarker
    first ??= m
    const body: string[] = [m.first]
    let n = k + 1
    let prevBlank = false
    for (; n < ls.length; n++) {
      const line = ls[n]
      if (isBlank(line)) {
        body.push('')
        prevBlank = true
        continue
      }
      if (indentOf(line) >= m.width) {
        body.push(line.slice(m.width))
        prevBlank = false
        continue
      }
      if (!prevBlank && !listMarker(line) && !interrupts(line)) {
        body.push(line.trimStart())
        continue
      }
      break
    }
    // Trailing blank lines belong between items: that makes the list loose.
    let trailing = 0
    while (body.length > 1 && isBlank(body[body.length - 1])) {
      body.pop()
      trailing++
    }
    if (trailing && n < ls.length) loose = true
    if (m.empty && body[0] === '') body.shift()
    let task = false
    let checked = false
    const t = /^\[([ xX])\](?:[ \t]+|$)/.exec(body[0] ?? '')
    if (t) {
      task = true
      checked = t[1] !== ' '
      body[0] = body[0].slice(t[0].length)
    }
    const isLast = n >= ls.length
    const { blocks, gaps } = parseBlocks(body, { ...ctx, tail: ctx.tail && isLast, depth: ctx.depth + 1 })
    if (gaps.slice(1).some(Boolean)) loose = true
    items.push({ task, checked, children: blocks })
    k = n
  }
  return { type: 'list', ordered: first?.ordered ?? false, start: first?.start ?? 1, loose, items }
}

function tableSpan(lines: string[], i: number, headerOnly: boolean): Span {
  let j = headerOnly ? i + 1 : i + 2
  if (!headerOnly) {
    for (; j < lines.length; j++) {
      const line = lines[j]
      if (isBlank(line) || interrupts(line)) break
    }
  }
  return {
    end: j,
    kind: 'table',
    build: (ls, ctx) => {
      const head = splitRow(ls[0])
      const cols = head.length
      const align = ls[1] ? parseAlign(ls[1]) : []
      const fit = (cells: string[]) => Array.from({ length: cols }, (_, c) => cells[c] ?? '')
      const cell = (s: string, last: boolean) => parseInline(s, { tail: last, breaks: false })
      const bodyRows = ls.slice(2)
      return {
        type: 'table',
        align: Array.from({ length: cols }, (_, c) => align[c] ?? null),
        head: head.map((h, c) => cell(h, ctx.tail && !bodyRows.length && c === cols - 1)),
        rows: bodyRows.map((r, ri) => {
          const cells = fit(splitRow(r))
          const lastRow = ctx.tail && ri === bodyRows.length - 1
          return cells.map((s, c) => cell(s, lastRow && c === cols - 1))
        }),
      }
    },
  }
}

function paragraphSpan(lines: string[], i: number): Span {
  let j = i + 1
  let setext = 0
  for (; j < lines.length; j++) {
    const line = lines[j]
    if (isBlank(line)) break
    const s = RE_SETEXT.exec(line)
    if (s) {
      setext = s[1][0] === '=' ? 1 : 2
      break
    }
    if (interrupts(line) || tableAt(lines, j)) break
  }
  if (setext) {
    return {
      end: j + 1,
      kind: `setext${setext}`,
      build: (ls, c) => {
        const children = parseInline(
          ls
            .slice(0, -1)
            .map((l) => l.trim())
            .join('\n'),
          { tail: false, breaks: c.breaks },
        )
        return { type: 'heading', level: setext as 1 | 2, slug: slugify(inlineText(children)), children }
      },
    }
  }
  return {
    end: j,
    kind: 'p',
    build: (ls, c) => ({
      type: 'paragraph',
      children: parseInline(ls.map((l) => l.replace(/^[ \t]+/, '')).join('\n'), { tail: c.tail, breaks: c.breaks }),
    }),
  }
}

/** Where the block starting at line i ends, and how to build it. */
function spanAt(lines: string[], i: number, ctx: Ctx): Span {
  const line = lines[i]
  let m: RegExpExecArray | null

  if ((m = RE_FENCE.exec(line)) && !(m[2][0] === '`' && m[3].includes('`'))) return fenceSpan(lines, i, m)

  if (indentOf(line) >= 4) {
    let j = i + 1
    let last = j
    for (; j < lines.length; j++) {
      if (isBlank(lines[j])) continue
      if (indentOf(lines[j]) < 4) break
      last = j + 1
    }
    return {
      end: last,
      kind: 'indent',
      build: (ls) => ({ type: 'code', lang: '', code: ls.map((l) => (isBlank(l) ? '' : l.slice(4))).join('\n'), closed: true }),
    }
  }

  if ((m = RE_ATX.exec(line))) {
    return {
      end: i + 1,
      kind: 'atx',
      build: (ls, c) => {
        const a = RE_ATX.exec(ls[0]) as RegExpExecArray
        const raw = stripClosingHashes(a[2] ?? '')
        const children = parseInline(raw, { tail: c.tail })
        return { type: 'heading', level: a[1].length as MdHeading['level'], slug: slugify(inlineText(children)), children }
      },
    }
  }

  if (RE_HR.test(line)) return { end: i + 1, kind: 'hr', build: () => ({ type: 'hr' }) }

  const nest = ctx.depth < MAX_BLOCK_DEPTH
  if (nest && RE_QUOTE.test(line)) {
    let j = i + 1
    let prevText = !isBlank(line.replace(RE_QUOTE, ''))
    for (; j < lines.length; j++) {
      const l = lines[j]
      if (RE_QUOTE.test(l)) {
        prevText = !isBlank(l.replace(RE_QUOTE, ''))
        continue
      }
      // Lazy continuation: plain text right after quoted text.
      if (prevText && !isBlank(l) && !interrupts(l)) continue
      break
    }
    return {
      end: j,
      kind: 'quote',
      build: (ls, c) => ({ type: 'blockquote', children: parseBlocks(ls.map((l) => l.replace(RE_QUOTE, '')), { ...c, depth: c.depth + 1 }).blocks }),
    }
  }

  const marker = nest ? listMarker(line) : null
  if (marker) return listSpan(lines, i, marker)

  if (tableAt(lines, i)) return tableSpan(lines, i, false)
  // Streaming: a header row whose delimiter row hasn't arrived (or is half typed).
  if (ctx.tail && ctx.streaming && line.trimStart().startsWith('|') && line.trim().length > 1) {
    const next = lines[i + 1]
    if (next === undefined) return tableSpan(lines, i, true)
    if (i + 2 === lines.length && /^ {0,3}\|?[ \t:|-]*$/.test(next) && next.includes('-')) {
      return { ...tableSpan(lines, i, true), end: i + 2 }
    }
  }

  return paragraphSpan(lines, i)
}

/** Parse lines into blocks; `gaps[k]` says blank lines came before block k. */
function parseBlocks(lines: string[], ctx: Ctx, cache?: BlockCache): { blocks: MdBlock[]; gaps: boolean[] } {
  const blocks: MdBlock[] = []
  const gaps: boolean[] = []
  let i = 0
  let gap = false
  while (i < lines.length) {
    if (isBlank(lines[i])) {
      gap = true
      i++
      continue
    }
    const span = spanAt(lines, i, ctx)
    const end = Math.max(span.end, i + 1)
    // Only blank lines may follow: this block sits at the tail.
    let rest = end
    while (rest < lines.length && isBlank(lines[rest])) rest++
    const atTail = ctx.tail && rest >= lines.length
    const slice = lines.slice(i, end)
    const c: Ctx = atTail === ctx.tail ? ctx : { ...ctx, tail: atTail }
    let block: MdBlock
    const key = cache && `${span.kind}${atTail ? '\u0001' : '\u0000'}${slice.join('\n')}`
    if (cache && key && !cache.next.has(key)) {
      // Reuse last parse's block; a repeat within this document gets its own object.
      block = cache.prev.get(key) ?? span.build(slice, c)
      cache.next.set(key, block)
    } else block = span.build(slice, c)
    blocks.push(block)
    gaps.push(gap && blocks.length > 1)
    gap = false
    i = end
  }
  return { blocks, gaps }
}

interface BlockCache {
  prev: Map<string, MdBlock>
  next: Map<string, MdBlock>
}

function prepare(src: string): string[] {
  return src
    .replace(/\r\n?/g, '\n')
    .replace(/\u0000/g, '�')
    .split('\n')
    .map(expandTabs)
}

const ctxOf = (o: MdParseOptions): Ctx => ({ tail: !!o.streaming, streaming: !!o.streaming, breaks: !!o.breaks, depth: 0 })

/** Parse a Markdown document into blocks. */
export function parseMarkdown(src: string, options: MdParseOptions = {}): MdBlock[] {
  return parseBlocks(prepare(src), ctxOf(options)).blocks
}

/**
 * A parser that remembers its top-level blocks between calls: a block whose
 * source didn't change comes back as the very same object, so renderers can
 * skip it. Use one per component instance.
 */
export function createMarkdownParser(): (src: string, options?: MdParseOptions) => MdBlock[] {
  let prev = new Map<string, MdBlock>()
  let prevBreaks = false
  return (src, options = {}) => {
    if (!!options.breaks !== prevBreaks) {
      prev = new Map()
      prevBreaks = !!options.breaks
    }
    const cache: BlockCache = { prev, next: new Map() }
    const { blocks } = parseBlocks(prepare(src), ctxOf(options), cache)
    prev = cache.next
    return blocks
  }
}

/* ── Rendering helpers shared by Vue and React ─────────── */

/** The paragraph / heading the streaming caret goes in; null puts it after everything. */
export function caretTarget(blocks: MdBlock[]): MdBlock | null {
  const last = blocks[blocks.length - 1]
  if (!last) return null
  if (last.type === 'paragraph' || last.type === 'heading') return last
  if (last.type === 'blockquote') return caretTarget(last.children)
  if (last.type === 'list') {
    const item = last.items[last.items.length - 1]
    return item ? caretTarget(item.children) : null
  }
  return null
}

/** Whether `target` sits somewhere inside `block`. */
export function containsBlock(block: MdBlock, target: MdBlock | null): boolean {
  if (!target) return false
  if (block === target) return true
  if (block.type === 'blockquote') return block.children.some((b) => containsBlock(b, target))
  if (block.type === 'list') return block.items.some((it) => it.children.some((b) => containsBlock(b, target)))
  return false
}

/** Code fences without a language (or "text") skip syntax colouring. */
export const isPlainLang = (lang: string) => !lang || /^(text|txt|plain|plaintext)$/i.test(lang)

/** The ids of every heading inside a block, joined — a cheap "did its anchors change" key. */
export function headingKey(block: MdBlock, ids: Map<MdHeading, string>): string {
  if (block.type === 'heading') return ids.get(block) ?? ''
  if (block.type === 'blockquote') return block.children.map((b) => headingKey(b, ids)).join(' ')
  if (block.type === 'list') return block.items.map((it) => it.children.map((b) => headingKey(b, ids)).join(' ')).join(' ')
  return ''
}
