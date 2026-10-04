// MlJsonViewer / <JsonViewer> core, framework-free: parsing with line / column
// errors, paths, search, and flattening the (expanded part of the) value into
// rows. The Vue and React components only render these rows.

export type JsonSegment = string | number
export type JsonPathStyle = 'jsonpath' | 'dot'
export type JsonValueType =
  | 'object'
  | 'array'
  | 'string'
  | 'number'
  | 'boolean'
  | 'null'
  | 'undefined'
  | 'bigint'
  | 'function'
  | 'symbol'
  | 'date'
  | 'circular'

/* ── Parsing ───────────────────────────────────────────── */

export interface JsonParseError {
  /** 0-based offset into the source. */
  position: number
  /** 1-based. */
  line: number
  /** 1-based. */
  column: number
  /** The offending character, or undefined when the input ended too early. */
  found?: string
  /** The source line the error is on (for a caret display). */
  lineText: string
}

export type JsonParseResult = { ok: true; value: unknown } | { ok: false; error: JsonParseError }

/** Find where a JSON text first goes wrong (engine-independent, unlike JSON.parse messages). */
function locateError(src: string): number {
  let i = 0
  const n = src.length
  const fail = (at: number): never => {
    throw at
  }
  const ws = () => {
    while (i < n && (src[i] === ' ' || src[i] === '\t' || src[i] === '\n' || src[i] === '\r')) i++
  }
  const string = () => {
    i++
    while (i < n) {
      const ch = src[i]
      if (ch === '"') {
        i++
        return
      }
      if (ch === '\\') {
        const next = src[i + 1]
        if (next !== undefined && '"\\/bfnrt'.includes(next)) i += 2
        else if (next === 'u' && /^[0-9a-fA-F]{4}$/.test(src.slice(i + 2, i + 6))) i += 6
        else fail(i + 1)
        continue
      }
      if (ch < ' ') fail(i)
      i++
    }
    fail(i)
  }
  const NUM = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y
  const value = (): void => {
    ws()
    if (i >= n) fail(i)
    const ch = src[i]
    if (ch === '{') {
      i++
      ws()
      if (src[i] === '}') {
        i++
        return
      }
      for (;;) {
        ws()
        if (src[i] !== '"') fail(i)
        string()
        ws()
        if (src[i] !== ':') fail(i)
        i++
        value()
        ws()
        if (src[i] === ',') {
          i++
          continue
        }
        if (src[i] === '}') {
          i++
          return
        }
        fail(i)
      }
    }
    if (ch === '[') {
      i++
      ws()
      if (src[i] === ']') {
        i++
        return
      }
      for (;;) {
        value()
        ws()
        if (src[i] === ',') {
          i++
          continue
        }
        if (src[i] === ']') {
          i++
          return
        }
        fail(i)
      }
    }
    if (ch === '"') return string()
    if (ch === '-' || (ch >= '0' && ch <= '9')) {
      NUM.lastIndex = i
      const m = NUM.exec(src)
      if (!m) fail(ch === '-' ? i + 1 : i)
      i += m![0].length
      return
    }
    for (const lit of ['true', 'false', 'null']) {
      if (src.startsWith(lit, i)) {
        i += lit.length
        return
      }
    }
    fail(i)
  }
  try {
    value()
    ws()
    if (i < n) fail(i)
  } catch (at) {
    if (typeof at === 'number') return at
    throw at
  }
  return -1
}

/** Line / column (1-based) and the line's text for an offset. */
export function jsonPosition(src: string, position: number): Omit<JsonParseError, 'found'> {
  const before = src.slice(0, position)
  const line = before.split('\n').length
  const lineStart = before.lastIndexOf('\n') + 1
  const lineEnd = src.indexOf('\n', position)
  const lineText = src.slice(lineStart, lineEnd < 0 ? undefined : lineEnd).replace(/\r$/, '')
  return { position, line, column: position - lineStart + 1, lineText }
}

/** JSON.parse with a friendly, engine-independent error position. */
export function parseJson(source: string): JsonParseResult {
  try {
    return { ok: true, value: JSON.parse(source) }
  } catch {
    let at = locateError(source)
    if (at < 0) at = 0
    const found = at < source.length ? source[at] : undefined
    return { ok: false, error: { ...jsonPosition(source, at), found } }
  }
}

/* ── Values & paths ────────────────────────────────────── */

export function jsonType(value: unknown): Exclude<JsonValueType, 'circular'> {
  if (value === null) return 'null'
  if (Array.isArray(value) || value instanceof Set) return 'array'
  if (value instanceof Date) return 'date'
  const t = typeof value
  if (t === 'object') return 'object'
  return t as Exclude<JsonValueType, 'circular'>
}

const isContainerType = (t: JsonValueType) => t === 'object' || t === 'array'

/** Children of an object / array (Maps and Sets read like objects / arrays). */
export function jsonEntries(value: unknown): [JsonSegment, unknown][] {
  if (Array.isArray(value)) return value.map((v, i) => [i, v])
  if (value instanceof Set) return [...value].map((v, i) => [i, v])
  if (value instanceof Map) return [...value].map(([k, v]) => [String(k), v])
  if (value && typeof value === 'object') return Object.keys(value).map((k) => [k, (value as Record<string, unknown>)[k]])
  return []
}

const IDENT = /^[A-Za-z_$][\w$]*$/

/** `$.users[3].name` (jsonpath) or `users.3.name` (dot). */
export function formatJsonPath(path: readonly JsonSegment[], style: JsonPathStyle = 'jsonpath'): string {
  if (style === 'dot') return path.map(String).join('.')
  return `$${path.map((s) => (typeof s === 'number' ? `[${s}]` : IDENT.test(s) ? `.${s}` : `[${JSON.stringify(s)}]`)).join('')}`
}

/** The row id for a path: its jsonpath, which is unambiguous. */
const childId = (parent: string, key: JsonSegment) =>
  `${parent}${typeof key === 'number' ? `[${key}]` : IDENT.test(key) ? `.${key}` : `[${JSON.stringify(key)}]`}`

/** JSON.stringify that survives cycles and bigints. */
export function stringifyJson(value: unknown, indent = 2): string {
  // Holders as JSON.stringify sees them (Maps / Sets converted) and the originals, in step.
  const holders: unknown[] = []
  const originals: unknown[] = []
  const out = JSON.stringify(
    value,
    function (this: unknown, _key, v: unknown) {
      if (typeof v === 'bigint') return v.toString()
      if (!v || typeof v !== 'object') return v
      // `this` is the object holding v; trim the path back to it.
      while (holders.length && holders[holders.length - 1] !== this) {
        holders.pop()
        originals.pop()
      }
      if (originals.includes(v)) return '[Circular]'
      const original = v
      if (v instanceof Map) v = Object.fromEntries(v)
      else if (v instanceof Set) v = [...v]
      holders.push(v)
      originals.push(original)
      return v
    },
    indent,
  )
  return out ?? String(value)
}

/** How a primitive reads on screen (strings without quotes). */
export function jsonDisplayText(value: unknown): string {
  switch (jsonType(value)) {
    case 'string':
      return value as string
    case 'date':
      return Number.isNaN((value as Date).getTime()) ? 'Invalid Date' : (value as Date).toISOString()
    case 'bigint':
      return `${value}n`
    case 'function':
      return `ƒ ${(value as { name?: string }).name || 'anonymous'}()`
    case 'symbol':
      return String(value)
    default:
      return String(value)
  }
}

/** What "copy value" puts on the clipboard: raw strings, pretty JSON for containers. */
export function jsonCopyText(value: unknown): string {
  const t = jsonType(value)
  return isContainerType(t) ? stringifyJson(value) : jsonDisplayText(value)
}

/** http(s) URLs only — anything else (javascript:, data:…) stays text. */
export function jsonSafeUrl(text: string): string | undefined {
  if (!/^https?:\/\/[^\s<>"]+$/i.test(text)) return undefined
  try {
    const url = new URL(text)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : undefined
  } catch {
    return undefined
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/

/** ISO-8601 dates / date-times. */
export function jsonIsDate(text: string): boolean {
  return ISO_DATE.test(text) && !Number.isNaN(Date.parse(text.replace(' ', 'T')))
}

/* ── Search ────────────────────────────────────────────── */

export interface JsonHit {
  key: boolean
  value: boolean
}

export interface JsonSearch {
  query: string
  /** Matching rows by id. */
  hits: Map<string, JsonHit>
  /** Containers that hold a match somewhere below. */
  ancestors: Set<string>
  /** Per container: how many children must be shown to reveal every match. */
  reveal: Map<string, number>
  /** Number of matching rows. */
  count: number
}

/** Case-insensitive search through keys and primitive values. */
export function searchJson(root: unknown, query: string): JsonSearch | null {
  const q = query.trim().toLowerCase()
  if (!q) return null
  const hits = new Map<string, JsonHit>()
  const ancestors = new Set<string>()
  const reveal = new Map<string, number>()
  const stack: unknown[] = []
  const trail: [string, number][] = []
  const walk = (value: unknown, id: string, key: JsonSegment | undefined) => {
    const t = jsonType(value)
    const container = isContainerType(t)
    const keyHit = key !== undefined && typeof key === 'string' && key.toLowerCase().includes(q)
    const valueHit = !container && jsonDisplayText(value).toLowerCase().includes(q)
    if (keyHit || valueHit) {
      hits.set(id, { key: keyHit, value: valueHit })
      for (const [anc, index] of trail) {
        ancestors.add(anc)
        reveal.set(anc, Math.max(reveal.get(anc) ?? 0, index + 1))
      }
    }
    if (!container || stack.includes(value)) return
    stack.push(value)
    jsonEntries(value).forEach(([k, v], index) => {
      trail.push([id, index])
      walk(v, childId(id, k), k)
      trail.pop()
    })
    stack.pop()
  }
  walk(root, '$', undefined)
  return { query: q, hits, ancestors, reveal, count: hits.size }
}

/** Split text into plain / highlighted runs for a (lower-cased) query. */
export function jsonHighlight(text: string, query: string | undefined): { text: string; hit: boolean }[] {
  if (!query) return [{ text, hit: false }]
  const lower = text.toLowerCase()
  const out: { text: string; hit: boolean }[] = []
  let at = 0
  for (;;) {
    const found = lower.indexOf(query, at)
    if (found < 0) break
    if (found > at) out.push({ text: text.slice(at, found), hit: false })
    out.push({ text: text.slice(found, found + query.length), hit: true })
    at = found + query.length
  }
  if (at < text.length) out.push({ text: text.slice(at), hit: false })
  return out.length ? out : [{ text, hit: false }]
}

/** A string as shown: possibly truncated, with highlighted runs. */
export function jsonStringView(text: string, options: { max: number; expanded: boolean; query?: string }) {
  const { max, query } = options
  const long = text.length > max
  // A match past the cut forces the whole string open.
  const forced = !!query && long && text.toLowerCase().indexOf(query) >= 0 && text.toLowerCase().indexOf(query) + query.length > max
  const full = !long || options.expanded || forced
  const shown = full ? text : text.slice(0, max)
  return { parts: jsonHighlight(shown, query), long, truncated: !full, hidden: text.length - shown.length, forced }
}

/* ── Expansion & rows ──────────────────────────────────── */

/** Containers to open initially: those at level ≤ depth (the root is level 1). */
export function jsonDefaultOpen(root: unknown, depth: number): Set<string> {
  const open = new Set<string>()
  const stack: unknown[] = []
  const walk = (value: unknown, id: string, level: number) => {
    if (level > depth || !isContainerType(jsonType(value)) || stack.includes(value)) return
    open.add(id)
    stack.push(value)
    for (const [k, v] of jsonEntries(value)) walk(v, childId(id, k), level + 1)
    stack.pop()
  }
  walk(root, '$', 1)
  return open
}

/** Every container id (for "expand all"). */
export function jsonAllContainers(root: unknown): Set<string> {
  return jsonDefaultOpen(root, Infinity)
}

/** Open the containers holding search matches and page far enough to show them. */
export function jsonReveal(
  open: ReadonlySet<string>,
  shown: ReadonlyMap<string, number>,
  search: JsonSearch | null,
  chunkSize: number,
): { open: Set<string>; shown: Map<string, number> } {
  const nextOpen = new Set(open)
  const nextShown = new Map(shown)
  if (search) {
    for (const id of search.ancestors) nextOpen.add(id)
    for (const [id, need] of search.reveal) {
      const have = nextShown.get(id) ?? chunkSize
      if (need > have) nextShown.set(id, Math.ceil(need / chunkSize) * chunkSize)
    }
  }
  return { open: nextOpen, shown: nextShown }
}

export interface JsonNodeRow {
  kind: 'node'
  id: string
  parentId: string | null
  path: JsonSegment[]
  /** Property name / index; undefined for the root. */
  key?: JsonSegment
  level: number
  type: JsonValueType
  value: unknown
  /** Object / array with at least one child. */
  expandable: boolean
  expanded: boolean
  /** Number of children (containers). */
  size: number
  posinset: number
  setsize: number
  /** Last among its siblings (no trailing comma). */
  last: boolean
  /** For circular references: the id of the ancestor it points back to. */
  circular?: string
  hit?: JsonHit
}

export interface JsonCloseRow {
  kind: 'close'
  id: string
  parentId: string | null
  level: number
  type: 'object' | 'array'
  last: boolean
}

export interface JsonMoreRow {
  kind: 'more'
  id: string
  /** The container being paged. */
  parentId: string
  level: number
  /** How many the button adds. */
  next: number
  /** How many are still hidden. */
  rest: number
  posinset: number
  setsize: number
}

export type JsonRow = JsonNodeRow | JsonCloseRow | JsonMoreRow

export interface JsonFlattenOptions {
  open: ReadonlySet<string>
  shown?: ReadonlyMap<string, number>
  chunkSize?: number
  search?: JsonSearch | null
  /** With a search: drop rows that neither match nor lead to a match. */
  filter?: boolean
}

/** The visible rows, in order, with tree semantics (level / posinset / setsize). */
export function flattenJson(root: unknown, options: JsonFlattenOptions): JsonRow[] {
  const { open, shown, chunkSize = 100, search, filter } = options
  const rows: JsonRow[] = []
  const stack: unknown[] = []
  const stackIds: string[] = []
  const filtering = !!(filter && search)

  const walk = (
    value: unknown,
    id: string,
    path: JsonSegment[],
    key: JsonSegment | undefined,
    level: number,
    parentId: string | null,
    posinset: number,
    setsize: number,
    last: boolean,
    insideHit: boolean,
  ) => {
    const base = { kind: 'node' as const, id, parentId, path, key, level, posinset, setsize, last, hit: search?.hits.get(id) }
    let type: JsonValueType = jsonType(value)
    const cycle = isContainerType(type) ? stack.indexOf(value) : -1
    if (cycle >= 0) {
      rows.push({ ...base, type: 'circular', value, expandable: false, expanded: false, size: 0, circular: stackIds[cycle] })
      return
    }
    if (!isContainerType(type)) {
      rows.push({ ...base, type, value, expandable: false, expanded: false, size: 0 })
      return
    }
    let entries = jsonEntries(value)
    const size = entries.length
    const selfHit = insideHit || !!search?.hits.get(id)
    if (filtering && !selfHit) {
      entries = entries.filter(([k]) => {
        const cid = childId(id, k)
        return search!.hits.has(cid) || search!.ancestors.has(cid)
      })
    }
    const expanded = size > 0 && open.has(id)
    type = type as 'object' | 'array'
    rows.push({ ...base, type, value, expandable: size > 0, expanded, size })
    if (!expanded) return
    const limit = Math.max(1, shown?.get(id) ?? chunkSize)
    const visible = entries.slice(0, limit)
    const rest = entries.length - visible.length
    const childSet = visible.length + (rest > 0 ? 1 : 0)
    stack.push(value)
    stackIds.push(id)
    visible.forEach(([k, v], i) => {
      walk(v, childId(id, k), [...path, k], k, level + 1, id, i + 1, childSet, i === entries.length - 1, selfHit)
    })
    stack.pop()
    stackIds.pop()
    if (rest > 0) {
      rows.push({ kind: 'more', id: `${id}#more`, parentId: id, level: level + 1, next: Math.min(chunkSize, rest), rest, posinset: childSet, setsize: childSet })
    }
    rows.push({ kind: 'close', id: `${id}#close`, parentId, level, type: type as 'object' | 'array', last })
  }
  walk(root, '$', [], undefined, 1, null, 1, 1, true, false)
  return rows
}
