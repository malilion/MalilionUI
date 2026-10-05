// Keyword highlighting for search results: MlHighlight / <Highlight>.
// (Not the code highlighter — that's src/highlight.ts.)
//
// Matching is plain substring search, because Chinese has no word boundaries:
// "獅子" is found inside "碼力獅子座". It runs on grapheme clusters, so an emoji,
// a flag or a 𠮷-style astral character is never cut in half, and no regular
// expression is built from the keywords — "C++" or "(a|b)" are just text.

export interface HighlightChunk {
  text: string
  /** True for the parts that matched a keyword. */
  match: boolean
}

export interface HighlightOptions {
  /** Match upper and lower case exactly. Default false. */
  caseSensitive?: boolean
  /** Treat full-width ＡＢＣ / １２３ / ＃ and the ideographic space like their half-width forms. Default true. */
  ignoreWidth?: boolean
}

const segmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : undefined

/** User-perceived characters; code points where Intl.Segmenter is missing. */
function graphemes(text: string): string[] {
  return segmenter ? Array.from(segmenter.segment(text), (s) => s.segment) : Array.from(text)
}

/** Full-width ASCII (U+FF01–FF5E) and U+3000 → their half-width forms; everything else as is. */
export function foldWidth(text: string): string {
  return text.replace(/[！-～　]/g, (c) => (c === '　' ? ' ' : String.fromCharCode(c.charCodeAt(0) - 0xfee0)))
}

/**
 * Split `text` into plain and matched chunks. Every occurrence of every
 * keyword is marked; overlapping or touching matches merge into one chunk.
 * Empty and whitespace-only keywords are ignored.
 *
 *   splitHighlight('碼力獅 UI', '獅') → [{ text: '碼力', match: false }, { text: '獅', match: true }, { text: ' UI', match: false }]
 */
export function splitHighlight(text: string, keywords: string | readonly string[] | null | undefined, options: HighlightOptions = {}): HighlightChunk[] {
  if (!text) return []
  const { caseSensitive = false, ignoreWidth = true } = options
  const fold = (g: string) => {
    let s = g.normalize('NFC')
    if (ignoreWidth) s = foldWidth(s)
    return caseSensitive ? s : s.toLowerCase()
  }

  const units = graphemes(text)
  const folded = units.map(fold)
  // Keywords as folded grapheme lists, grouped by their first grapheme.
  const byFirst = new Map<string, string[][]>()
  const seen = new Set<string>()
  for (const k of typeof keywords === 'string' ? [keywords] : (keywords ?? [])) {
    if (typeof k !== 'string' || !k.trim()) continue
    const key = graphemes(k).map(fold)
    const id = key.join('\u0000')
    if (seen.has(id)) continue
    seen.add(id)
    const list = byFirst.get(key[0]) ?? []
    list.push(key)
    byFirst.set(key[0], list)
  }
  if (!byFirst.size) return [{ text, match: false }]

  // Mark every grapheme covered by some match, then read off the runs.
  const hit = new Uint8Array(units.length)
  for (let i = 0; i < units.length; i++) {
    const candidates = byFirst.get(folded[i])
    if (!candidates) continue
    let longest = 0
    for (const key of candidates) {
      if (key.length <= longest || i + key.length > units.length) continue
      let j = 1
      while (j < key.length && key[j] === folded[i + j]) j++
      if (j === key.length) longest = key.length
    }
    hit.fill(1, i, i + longest)
  }

  const chunks: HighlightChunk[] = []
  for (let i = 0; i < units.length; ) {
    const match = hit[i] === 1
    let end = i + 1
    while (end < units.length && (hit[end] === 1) === match) end++
    chunks.push({ text: units.slice(i, end).join(''), match })
    i = end
  }
  return chunks
}
