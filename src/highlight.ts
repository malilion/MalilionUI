// Small syntax colouring for Vue / TS / JS / CSS / HTML / shell snippets.
// One regex pass; every token and every gap is HTML-escaped before it's wrapped.
//
// The pass stays linear on hostile input: no alternative can fail after
// scanning far ahead. Block comments and template strings run to the end of
// the input when unclosed; the scanner then shows just the opener as text and
// switches to a pattern without that construct (nothing later can close it
// either). Quoted strings run to the line end when unclosed and show as text.

/** Constructs that can be switched off once one is found unclosed. */
const NO_BLOCK = 1
const NO_HTML_COMMENT = 2
const NO_TEMPLATE = 4

const END = '(?![\\s\\S])'
const patterns = new Map<number, RegExp>()

function tokenRe(shell: boolean, off: number): RegExp {
  const key = off * 2 + (shell ? 1 : 0)
  let re = patterns.get(key)
  if (re) return re
  const comments = [
    off & NO_HTML_COMMENT ? '' : `<!--[\\s\\S]*?(?:-->|${END})`,
    off & NO_BLOCK ? '' : `\\/\\*[\\s\\S]*?(?:\\*\\/|${END})`,
    /\/\/[^\n]*/.source,
    // Shell-style # comments only for shell snippets.
    shell ? /(?<=^|\s)#[^\n]*/.source : '',
  ]
  const strings = [
    /"(?:[^"\\\n]|\\.)*"?/.source,
    // Not right after a letter: that's an apostrophe ("don't"), not a string.
    /(?<!\w)'(?:[^'\\\n]|\\.)*'?/.source,
    off & NO_TEMPLATE ? '' : `\`(?:[^\`\\\\]|\\\\[\\s\\S])*(?:\`|${END})`,
  ]
  re = new RegExp(
    [
      `(${comments.filter(Boolean).join('|')})`, // 1 comment
      `(${strings.filter(Boolean).join('|')})`, // 2 string
      /(<\/?[A-Za-z][\w-]*)/.source, // 3 tag open
      /(\/?>)/.source, // 4 tag close
      /((?<=\s)[:@#]?[A-Za-z_][\w.:-]*(?==)|--[\w-]+(?=\s*:))/.source, // 5 attribute name / CSS custom property
      /\b(import|from|export|default|const|let|var|function|return|if|else|for|of|in|new|await|async|type|interface|as|true|false|null|undefined|npm|npx|pnpm|yarn)\b/
        .source, // 6 keyword
      /\b(\d+(?:\.\d+)?)\b/.source, // 7 number
    ].join('|'),
    'gm',
  )
  patterns.set(key, re)
  return re
}

const SHELL = new Set(['bash', 'sh', 'shell', 'zsh', 'console', 'terminal'])

const CLASSES = ['', 'tok-comment', 'tok-string', 'tok-tag', 'tok-punct', 'tok-attr', 'tok-keyword', 'tok-number']

/** Whether a token ends with its own (unescaped) closing `close`. */
function closedBy(token: string, close: string): boolean {
  if (token.length < close.length + 1 || !token.endsWith(close)) return false
  // `"abc\"` ends on an escaped quote.
  let slashes = 0
  for (let k = token.length - close.length - 1; k > 0 && token[k] === '\\'; k--) slashes++
  return slashes % 2 === 0
}

/** Each source run and its token group (0 = plain text), in order. */
function scan(code: string, lang: string, push: (text: string, group: number) => void) {
  const shell = SHELL.has(lang.toLowerCase())
  let off = 0
  let last = 0
  let from = 0
  for (;;) {
    const re = tokenRe(shell, off)
    re.lastIndex = from
    const match = re.exec(code)
    if (!match) break
    const index = match.index
    const token = match[0]
    let group = match.findIndex((value, i) => i > 0 && value !== undefined)
    let length = token.length
    if (group === 1 && token.startsWith('/*') && !closedBy(token, '*/')) {
      // `dist/*` in a shell line, or a comment still being typed.
      ;[group, length, off] = [0, 2, off | NO_BLOCK]
    } else if (group === 1 && token.startsWith('<!--') && !closedBy(token, '-->')) {
      ;[group, length, off] = [0, 4, off | NO_HTML_COMMENT]
    } else if (group === 2 && token[0] === '`' && !closedBy(token, '`')) {
      ;[group, length, off] = [0, 1, off | NO_TEMPLATE]
    } else if (group === 2 && !closedBy(token, token[0])) group = 0
    if (length === 0) {
      // An empty match (can't happen with these patterns, but never loop on one).
      from = index + 1
      continue
    }
    push(code.slice(last, index), 0)
    push(code.slice(index, index + length), group)
    last = from = index + length
  }
  push(code.slice(last), 0)
}

function escape(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Highlighted HTML, one string per source line. Tokens that span lines
 * (block comments, template strings) are closed and reopened on each line,
 * so every line is valid markup on its own.
 */
export function highlightLines(code: string, lang = ''): string[] {
  const lines: string[] = ['']
  scan(code, lang, (text, group) => {
    const cls = CLASSES[group]
    text.split('\n').forEach((part, i) => {
      if (i > 0) lines.push('')
      if (part) lines[lines.length - 1] += cls ? `<span class="${cls}">${escape(part)}</span>` : escape(part)
    })
  })
  return lines
}

/** Highlighted HTML for the whole snippet. */
export function highlight(code: string, lang = ''): string {
  return highlightLines(code, lang).join('\n')
}

/** One coloured run of a line: `cls` is a `tok-*` class, or '' for plain text. */
export interface HighlightToken {
  text: string
  cls: string
}

/**
 * The same colouring as `highlightLines`, as raw tokens per source line
 * (nothing escaped), for renderers that build real elements instead of HTML.
 */
export function highlightTokens(code: string, lang = ''): HighlightToken[][] {
  const lines: HighlightToken[][] = [[]]
  scan(code, lang, (text, group) => {
    text.split('\n').forEach((part, i) => {
      if (i > 0) lines.push([])
      if (!part) return
      const line = lines[lines.length - 1]
      const prev = line[line.length - 1]
      if (prev && prev.cls === CLASSES[group]) prev.text += part
      else line.push({ text: part, cls: CLASSES[group] })
    })
  })
  return lines
}
