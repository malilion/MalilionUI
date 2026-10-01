// Minimal syntax colouring for the Vue / TS / CSS snippets on this site.
// One regex pass; every token and every gap is HTML-escaped before it's wrapped.
const TOKEN = new RegExp(
  [
    /(<!--[\s\S]*?-->|\/\*[\s\S]*?\*\/|\/\/[^\n]*)/.source, // 1 comment
    /("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)/.source, // 2 string
    /(<\/?[A-Za-z][\w-]*)/.source, // 3 tag open
    /(\/?>)/.source, // 4 tag close
    /((?<=\s)[:@#]?[A-Za-z_][\w.:-]*(?==))/.source, // 5 attribute name
    /\b(import|from|export|default|const|let|function|return|if|else|new|await|async|type|interface|as|true|false|null|undefined)\b/
      .source, // 6 keyword
    /\b(\d+(?:\.\d+)?)\b/.source, // 7 number
  ].join('|'),
  'g',
)

const CLASSES = ['', 'tok-comment', 'tok-string', 'tok-tag', 'tok-punct', 'tok-attr', 'tok-keyword', 'tok-number']

function escape(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function highlight(code: string): string {
  let out = ''
  let last = 0
  for (const match of code.matchAll(TOKEN)) {
    const index = match.index ?? 0
    out += escape(code.slice(last, index))
    const group = match.findIndex((value, i) => i > 0 && value !== undefined)
    out += `<span class="${CLASSES[group]}">${escape(match[0])}</span>`
    last = index + match[0].length
  }
  return out + escape(code.slice(last))
}
