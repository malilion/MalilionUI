// Small syntax colouring for Vue / TS / JS / CSS / HTML / shell snippets.
// One regex pass; every token and every gap is HTML-escaped before it's wrapped.
const tokenRe = (hashComments: boolean) => new RegExp(
  [
    // 1 comment (shell-style # comments only for shell snippets)
    (hashComments ? /(<!--[\s\S]*?-->|\/\*[\s\S]*?\*\/|\/\/[^\n]*|(?<=^|\s)#[^\n]*)/ : /(<!--[\s\S]*?-->|\/\*[\s\S]*?\*\/|\/\/[^\n]*)/).source,
    /("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)/.source, // 2 string
    /(<\/?[A-Za-z][\w-]*)/.source, // 3 tag open
    /(\/?>)/.source, // 4 tag close
    /((?<=\s)[:@#]?[A-Za-z_][\w.:-]*(?==)|--[\w-]+(?=\s*:))/.source, // 5 attribute name / CSS custom property
    /\b(import|from|export|default|const|let|var|function|return|if|else|for|of|in|new|await|async|type|interface|as|true|false|null|undefined|npm|npx|pnpm|yarn)\b/
      .source, // 6 keyword
    /\b(\d+(?:\.\d+)?)\b/.source, // 7 number
  ].join('|'),
  'gm',
)
const TOKEN = tokenRe(false)
const SHELL_TOKEN = tokenRe(true)
const SHELL = new Set(['bash', 'sh', 'shell', 'zsh', 'console', 'terminal'])

const CLASSES = ['', 'tok-comment', 'tok-string', 'tok-tag', 'tok-punct', 'tok-attr', 'tok-keyword', 'tok-number']

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
  const push = (text: string, cls?: string) => {
    text.split('\n').forEach((part, i) => {
      if (i > 0) lines.push('')
      if (part) lines[lines.length - 1] += cls ? `<span class="${cls}">${escape(part)}</span>` : escape(part)
    })
  }
  let last = 0
  for (const match of code.matchAll(SHELL.has(lang.toLowerCase()) ? SHELL_TOKEN : TOKEN)) {
    const index = match.index ?? 0
    push(code.slice(last, index))
    const group = match.findIndex((value, i) => i > 0 && value !== undefined)
    push(match[0], CLASSES[group])
    last = index + match[0].length
  }
  push(code.slice(last))
  return lines
}

/** Highlighted HTML for the whole snippet. */
export function highlight(code: string, lang = ''): string {
  return highlightLines(code, lang).join('\n')
}
