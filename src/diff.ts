// Framework-free diff engine for MlCodeDiff / CodeDiff: a Myers O(ND) line diff,
// a word-level diff for changed line pairs, a git unified-patch parser, and the
// view model (syntax tokens + change marks, folding, split / unified rows) that
// the Vue and React components both render, so their markup can't drift.
import { highlightTokens } from './highlight'

export type DiffLineType = 'context' | 'add' | 'del' | 'hunk'

export interface DiffHunkHeader {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  /** The text after the second `@@` (usually the enclosing function). */
  section: string
}

export interface DiffLine {
  type: DiffLineType
  /** Line content without its newline; for `hunk` rows the `@@ … @@` header. */
  text: string
  /** 1-based line number in the old file (context and deleted lines). */
  oldNo?: number
  /** 1-based line number in the new file (context and added lines). */
  newNo?: number
  /** The file ends here without a trailing newline. */
  noNewline?: boolean
  hunk?: DiffHunkHeader
}

export type DiffFileStatus = 'modified' | 'added' | 'deleted' | 'renamed'

export interface DiffFile {
  oldName: string | null
  newName: string | null
  status: DiffFileStatus
  binary: boolean
  lines: DiffLine[]
  added: number
  removed: number
  /** Every line of both files is present (computed diffs), so folds can expand. */
  complete: boolean
}

export interface DiffOptions {
  /** Ignore all whitespace when comparing lines (like `git diff -w`). */
  ignoreWhitespace?: boolean
  /**
   * Give up on an optimal diff past this many edits and report the rest as
   * removed-then-added, keeping huge, very different inputs fast. Default 1500.
   */
  maxEdits?: number
}

export interface DiffWordRanges {
  /** [start, end) character ranges changed in the old line. */
  old: [number, number][]
  /** [start, end) character ranges changed in the new line. */
  new: [number, number][]
}

const EQ = 0
const DEL = 1
const ADD = 2
type Op = 0 | 1 | 2

/* ── Myers O(ND) ───────────────────────────────────────── */

/** Shortest edit script between two id arrays, or null past `maxD` edits. */
function myers(a: ArrayLike<number>, b: ArrayLike<number>, maxD: number): Op[] | null {
  const n = a.length
  const m = b.length
  const max = n + m
  if (max === 0) return []
  const off = max + 1
  const v = new Int32Array(2 * max + 3)
  const trace: Int32Array[] = []
  const limit = Math.min(max, maxD)
  for (let d = 0; d <= limit; d++) {
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && v[off + k - 1] < v[off + k + 1]) ? v[off + k + 1] : v[off + k - 1] + 1
      let y = x - k
      while (x < n && y < m && a[x] === b[y]) {
        x++
        y++
      }
      v[off + k] = x
      if (x >= n && y >= m) {
        trace.push(v.slice(off - d, off + d + 1))
        return backtrack(trace, n, m)
      }
    }
    trace.push(v.slice(off - d, off + d + 1))
  }
  return null
}

function backtrack(trace: Int32Array[], n: number, m: number): Op[] {
  const ops: Op[] = []
  let x = n
  let y = m
  for (let d = trace.length - 1; d > 0; d--) {
    const prev = trace[d - 1]
    const k = x - y
    const at = (kk: number) => prev[kk + d - 1]
    const down = k === -d || (k !== d && at(k - 1) < at(k + 1))
    const prevK = down ? k + 1 : k - 1
    const prevX = at(prevK)
    const prevY = prevX - prevK
    while (x > prevX && y > prevY) {
      ops.push(EQ)
      x--
      y--
    }
    ops.push(down ? ADD : DEL)
    x = prevX
    y = prevY
  }
  while (x > 0 && y > 0) {
    ops.push(EQ)
    x--
    y--
  }
  return ops.reverse()
}

/** Edit script with the common prefix / suffix trimmed first, and a cap fallback. */
function diffIds(a: number[], b: number[], maxD: number): Op[] {
  let pre = 0
  while (pre < a.length && pre < b.length && a[pre] === b[pre]) pre++
  let suf = 0
  while (suf < a.length - pre && suf < b.length - pre && a[a.length - 1 - suf] === b[b.length - 1 - suf]) suf++
  const midA = a.slice(pre, a.length - suf)
  const midB = b.slice(pre, b.length - suf)
  const mid = myers(midA, midB, maxD) ?? [...midA.map((): Op => DEL), ...midB.map((): Op => ADD)]
  const ops: Op[] = new Array(pre).fill(EQ)
  // Inside each changed region, removals first, then additions.
  let dels = 0
  let adds = 0
  const flush = () => {
    for (; dels; dels--) ops.push(DEL)
    for (; adds; adds--) ops.push(ADD)
  }
  for (const op of mid) {
    if (op === DEL) dels++
    else if (op === ADD) adds++
    else {
      flush()
      ops.push(EQ)
    }
  }
  flush()
  for (let i = 0; i < suf; i++) ops.push(EQ)
  return ops
}

function idsOf(keys: string[], table: Map<string, number>) {
  return keys.map((key) => {
    let id = table.get(key)
    if (id === undefined) table.set(key, (id = table.size))
    return id
  })
}

/* ── Lines ─────────────────────────────────────────────── */

/** Split on \n, \r\n or \r; a trailing newline doesn't make an extra line. */
export function splitLines(text: string): { lines: string[]; eol: boolean } {
  if (!text) return { lines: [], eol: false }
  const lines = text.split(/\r\n|\r|\n/)
  const eol = lines[lines.length - 1] === ''
  if (eol) lines.pop()
  return { lines, eol }
}

const wsKey = (s: string) => s.replace(/\s+/g, '')

/**
 * Line diff of two texts (Myers). Line endings are normalised, so CRLF vs LF
 * alone is no change; a missing final newline is (unless whitespace is ignored).
 */
export function diffLines(oldText: string, newText: string, options: DiffOptions = {}): DiffLine[] {
  const { ignoreWhitespace = false, maxEdits = 1500 } = options
  const A = splitLines(oldText)
  const B = splitLines(newText)
  const keyOf = ignoreWhitespace ? wsKey : (s: string) => s
  const ka = A.lines.map(keyOf)
  const kb = B.lines.map(keyOf)
  if (!ignoreWhitespace && A.eol !== B.eol) {
    if (!A.eol && ka.length) ka[ka.length - 1] += '\u0000'
    if (!B.eol && kb.length) kb[kb.length - 1] += '\u0000'
  }
  const table = new Map<string, number>()
  const ops = diffIds(idsOf(ka, table), idsOf(kb, table), maxEdits)
  const out: DiffLine[] = []
  let i = 0
  let j = 0
  const lastA = A.eol ? -1 : A.lines.length - 1
  const lastB = B.eol ? -1 : B.lines.length - 1
  for (const op of ops) {
    if (op === EQ) {
      const line: DiffLine = { type: 'context', text: B.lines[j], oldNo: i + 1, newNo: j + 1 }
      if (i === lastA || j === lastB) line.noNewline = true
      out.push(line)
      i++
      j++
    } else if (op === DEL) {
      const line: DiffLine = { type: 'del', text: A.lines[i], oldNo: i + 1 }
      if (i === lastA) line.noNewline = true
      out.push(line)
      i++
    } else {
      const line: DiffLine = { type: 'add', text: B.lines[j], newNo: j + 1 }
      if (j === lastB) line.noNewline = true
      out.push(line)
      j++
    }
  }
  return out
}

function count(file: DiffFile) {
  file.added = file.lines.reduce((n, l) => n + (l.type === 'add' ? 1 : 0), 0)
  file.removed = file.lines.reduce((n, l) => n + (l.type === 'del' ? 1 : 0), 0)
  return file
}

/** A whole-file diff of two texts, ready for the components. */
export function diffFile(oldText: string, newText: string, options: DiffOptions & { filename?: string } = {}): DiffFile {
  const name = options.filename ?? null
  const status: DiffFileStatus = !oldText && newText ? 'added' : oldText && !newText ? 'deleted' : 'modified'
  return count({
    oldName: name,
    newName: name,
    status,
    binary: false,
    lines: diffLines(oldText, newText, options),
    added: 0,
    removed: 0,
    complete: true,
  })
}

/* ── Unified patches ───────────────────────────────────── */

function cleanName(raw: string): string | null {
  let name = raw.replace(/\t.*$/, '').trim()
  if (name.startsWith('"') && name.endsWith('"')) name = name.slice(1, -1)
  if (name === '/dev/null') return null
  return name.replace(/^[ab]\//, '')
}

/** Within each run of removed + added lines, whitespace-only edits become context. */
function relaxWhitespace(lines: DiffLine[]): DiffLine[] {
  const out: DiffLine[] = []
  let i = 0
  while (i < lines.length) {
    if (lines[i].type !== 'del' && lines[i].type !== 'add') {
      out.push(lines[i++])
      continue
    }
    const dels: DiffLine[] = []
    const adds: DiffLine[] = []
    while (i < lines.length && (lines[i].type === 'del' || lines[i].type === 'add')) {
      ;(lines[i].type === 'del' ? dels : adds).push(lines[i])
      i++
    }
    const table = new Map<string, number>()
    const ops = diffIds(idsOf(dels.map((l) => wsKey(l.text)), table), idsOf(adds.map((l) => wsKey(l.text)), table), 500)
    let a = 0
    let b = 0
    for (const op of ops) {
      if (op === EQ) {
        const d = dels[a++]
        const n = adds[b++]
        out.push({ type: 'context', text: n.text, oldNo: d.oldNo, newNo: n.newNo, noNewline: n.noNewline || d.noNewline || undefined })
      } else if (op === DEL) out.push(dels[a++])
      else out.push(adds[b++])
    }
  }
  return out
}

/**
 * Parse a git-style unified diff (`git diff`, `diff -u`, a `.patch` file),
 * one entry per file. Unknown lines (commit messages, `index …`) are skipped.
 */
export function parsePatch(patch: string, options: Pick<DiffOptions, 'ignoreWhitespace'> = {}): DiffFile[] {
  const files: DiffFile[] = []
  let file: DiffFile | null = null
  let sawOld = false
  let oldLeft = 0
  let newLeft = 0
  let oldNo = 0
  let newNo = 0
  const start = () => {
    file = { oldName: null, newName: null, status: 'modified', binary: false, lines: [], added: 0, removed: 0, complete: false }
    files.push(file)
    sawOld = false
    return file
  }
  const markEof = () => {
    const last = file?.lines[file.lines.length - 1]
    if (last && last.type !== 'hunk') last.noNewline = true
  }

  for (const row of patch.split(/\r?\n/)) {
    if (file && (oldLeft > 0 || newLeft > 0)) {
      const f: DiffFile = file
      const c = row[0]
      if (c === '\\') {
        markEof()
        continue
      }
      if (c === '+' && newLeft > 0) {
        f.lines.push({ type: 'add', text: row.slice(1), newNo: newNo++ })
        newLeft--
        continue
      }
      if (c === '-' && oldLeft > 0) {
        f.lines.push({ type: 'del', text: row.slice(1), oldNo: oldNo++ })
        oldLeft--
        continue
      }
      if ((c === ' ' || row === '') && oldLeft > 0 && newLeft > 0) {
        f.lines.push({ type: 'context', text: row.slice(1), oldNo: oldNo++, newNo: newNo++ })
        oldLeft--
        newLeft--
        continue
      }
      // A short hunk: fall through and read this row as a header.
      oldLeft = newLeft = 0
    }
    if (row.startsWith('\\')) {
      markEof()
      continue
    }
    if (row.startsWith('diff --git ')) {
      const f = start()
      const m = /^diff --git "?a\/(.+?)"? "?b\/(.+?)"?$/.exec(row)
      if (m) {
        f.oldName = m[1]
        f.newName = m[2]
      }
      continue
    }
    if (row.startsWith('--- ')) {
      const f: DiffFile = !file || sawOld || (file as DiffFile).lines.length ? start() : file
      const name = cleanName(row.slice(4))
      f.oldName = name
      if (name === null) f.status = 'added'
      sawOld = true
      continue
    }
    if (row.startsWith('+++ ') && file) {
      const f: DiffFile = file
      const name = cleanName(row.slice(4))
      f.newName = name
      if (name === null) f.status = 'deleted'
      continue
    }
    const hunk = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@ ?(.*)$/.exec(row)
    if (hunk) {
      const f: DiffFile = file ?? start()
      const header: DiffHunkHeader = {
        oldStart: +hunk[1],
        oldLines: hunk[2] === undefined ? 1 : +hunk[2],
        newStart: +hunk[3],
        newLines: hunk[4] === undefined ? 1 : +hunk[4],
        section: hunk[5] ?? '',
      }
      f.lines.push({ type: 'hunk', text: row, hunk: header })
      oldNo = header.oldStart || 1
      newNo = header.newStart || 1
      oldLeft = header.oldLines
      newLeft = header.newLines
      continue
    }
    if (!file) continue
    const f: DiffFile = file
    if (row.startsWith('new file mode')) f.status = 'added'
    else if (row.startsWith('deleted file mode')) f.status = 'deleted'
    else if (row.startsWith('rename from ')) f.oldName = row.slice(12)
    else if (row.startsWith('rename to ')) f.newName = row.slice(10)
    else if (/^Binary files .* differ$/.test(row) || row === 'GIT binary patch') f.binary = true
  }

  for (const f of files) {
    if (f.status === 'modified' && f.oldName && f.newName && f.oldName !== f.newName) f.status = 'renamed'
    if (options.ignoreWhitespace) f.lines = relaxWhitespace(f.lines)
    count(f)
  }
  return files
}

/* ── Words ─────────────────────────────────────────────── */

const WORD = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]|[\p{L}\p{N}_$]+|\s+|[^\s\p{L}\p{N}_$]/gu

/**
 * Character ranges that differ between a removed and an added line, by words
 * (CJK by character). Null when the lines are too long or barely alike, in
 * which case marking words would only add noise.
 */
export function diffWords(oldLine: string, newLine: string, options: Pick<DiffOptions, 'ignoreWhitespace'> = {}): DiffWordRanges | null {
  if (oldLine.length > 2000 || newLine.length > 2000) return null
  const ta = oldLine.match(WORD) ?? []
  const tb = newLine.match(WORD) ?? []
  const table = new Map<string, number>()
  const key = (t: string) => (options.ignoreWhitespace && /^\s/.test(t) ? ' ' : t)
  const ops = diffIds(idsOf(ta.map(key), table), idsOf(tb.map(key), table), 200)
  const out: DiffWordRanges = { old: [], new: [] }
  let pa = 0
  let pb = 0
  let i = 0
  let j = 0
  let same = 0
  const blank = (t: string) => /^\s+$/.test(t)
  const add = (list: [number, number][], text: string, from: number, len: number) => {
    if (options.ignoreWhitespace && blank(text.slice(from, from + len))) return
    const last = list[list.length - 1]
    // Only whitespace between two changes: one mark.
    if (last && (last[1] === from || blank(text.slice(last[1], from)))) last[1] = from + len
    else list.push([from, from + len])
  }
  for (const op of ops) {
    if (op === EQ) {
      if (!blank(ta[i])) same += ta[i].length
      pa += ta[i++].length
      pb += tb[j++].length
    } else if (op === DEL) {
      add(out.old, oldLine, pa, ta[i].length)
      pa += ta[i++].length
    } else {
      add(out.new, newLine, pb, tb[j].length)
      pb += tb[j++].length
    }
  }
  const solid = (s: string) => s.replace(/\s+/g, '').length
  const longest = Math.max(solid(oldLine), solid(newLine))
  if (longest && same / longest < 0.4) return null
  return out
}

/* ── View model ────────────────────────────────────────── */

export type MlCodeDiffView = 'split' | 'unified'

export interface DiffSegment {
  text: string
  /** `tok-*` syntax class, or ''. */
  cls: string
  /** Part of the exact change inside a modified line. */
  mark: boolean
}

export interface DiffViewLine {
  line: DiffLine
  index: number
  segs: DiffSegment[]
  /** Change block this line belongs to (file-local, from 0), or -1. */
  block: number
}

export interface DiffDecorateOptions {
  lang?: string
  /** Skip syntax colouring. */
  plain?: boolean
  /** Mark the changed words inside modified lines. Default true. */
  wordDiff?: boolean
  ignoreWhitespace?: boolean
}

function mergeSegments(tokens: { text: string; cls: string }[], marks: [number, number][]): DiffSegment[] {
  const out: DiffSegment[] = []
  const push = (text: string, cls: string, mark: boolean) => {
    if (!text) return
    const last = out[out.length - 1]
    if (last && last.cls === cls && last.mark === mark) last.text += text
    else out.push({ text, cls, mark })
  }
  let pos = 0
  let m = 0
  for (const tok of tokens) {
    let at = 0
    while (at < tok.text.length) {
      while (m < marks.length && marks[m][1] <= pos) m++
      const range = marks[m]
      const inside = !!range && range[0] <= pos
      const stop = inside ? range[1] : range ? range[0] : Infinity
      const take = Math.min(tok.text.length - at, stop - pos)
      push(tok.text.slice(at, at + take), tok.cls, inside)
      at += take
      pos += take
    }
  }
  return out
}

/** Syntax tokens, word marks and change-block ids for every line of a file. */
export function decorateDiff(file: DiffFile, options: DiffDecorateOptions = {}): DiffViewLine[] {
  const { lang = '', plain = false, wordDiff = true, ignoreWhitespace = false } = options
  const lines = file.lines
  const tokens: { text: string; cls: string }[][] = new Array(lines.length)

  // Colour each hunk's old and new side as whole text, so comments and
  // template strings spanning lines are coloured right.
  let from = 0
  const colour = (to: number) => {
    const oldIdx: number[] = []
    const newIdx: number[] = []
    for (let i = from; i < to; i++) {
      const t = lines[i].type
      if (t === 'del') oldIdx.push(i)
      else if (t === 'add' || t === 'context') newIdx.push(i)
      if (t === 'context') oldIdx.push(i)
    }
    for (const side of [oldIdx, newIdx]) {
      const own = side === oldIdx ? (i: number) => lines[i].type === 'del' : (i: number) => lines[i].type !== 'del'
      const toks = plain ? side.map((i) => [{ text: lines[i].text, cls: '' }]) : highlightTokens(side.map((i) => lines[i].text).join('\n'), lang)
      side.forEach((i, k) => {
        if (own(i)) tokens[i] = toks[k] ?? []
      })
    }
  }
  lines.forEach((l, i) => {
    if (l.type === 'hunk') {
      colour(i)
      tokens[i] = [{ text: l.text, cls: '' }]
      from = i + 1
    }
  })
  colour(lines.length)

  const marks: [number, number][][] = lines.map(() => [])
  const blocks = new Int32Array(lines.length).fill(-1)
  let block = -1
  let i = 0
  while (i < lines.length) {
    if (lines[i].type !== 'del' && lines[i].type !== 'add') {
      i++
      continue
    }
    block++
    const dels: number[] = []
    const adds: number[] = []
    while (i < lines.length && (lines[i].type === 'del' || lines[i].type === 'add')) {
      ;(lines[i].type === 'del' ? dels : adds).push(i)
      blocks[i] = block
      i++
    }
    if (wordDiff) {
      for (let k = 0; k < Math.min(dels.length, adds.length); k++) {
        const ranges = diffWords(lines[dels[k]].text, lines[adds[k]].text, { ignoreWhitespace })
        if (!ranges) continue
        marks[dels[k]] = ranges.old
        marks[adds[k]] = ranges.new
      }
    }
  }
  return lines.map((line, index) => ({ line, index, segs: mergeSegments(tokens[index] ?? [], marks[index]), block: blocks[index] }))
}

export type DiffRow =
  | { kind: 'line'; key: string; line: DiffViewLine; start: boolean }
  | { kind: 'pair'; key: string; left: DiffViewLine | null; right: DiffViewLine | null; block: number; start: boolean }
  | { kind: 'fold'; key: string; start: number; count: number }
  | { kind: 'hunk'; key: string; text: string }

export interface DiffLayoutOptions {
  view?: MlCodeDiffView
  /** Unchanged lines kept around each change; the rest fold. Negative: never fold. */
  context?: number
  /** Whether the fold starting at this line index has been opened. */
  expanded?: (start: number) => boolean
}

/** Which lines fold away: runs of unchanged lines far from any change. */
export function foldRanges(lines: DiffLine[], context = 3): [number, number][] {
  if (context < 0 || !Number.isFinite(context)) return []
  const n = lines.length
  const dist = new Float64Array(n).fill(Infinity)
  let last = -Infinity
  for (let i = 0; i < n; i++) {
    const t = lines[i].type
    if (t === 'add' || t === 'del') last = i
    if (t === 'hunk') last = -Infinity
    dist[i] = i - last
  }
  last = Infinity
  for (let i = n - 1; i >= 0; i--) {
    const t = lines[i].type
    if (t === 'add' || t === 'del') last = i
    if (t === 'hunk') last = Infinity
    dist[i] = Math.min(dist[i], last - i)
  }
  const out: [number, number][] = []
  let i = 0
  while (i < n) {
    if (lines[i].type !== 'context' || dist[i] <= context) {
      i++
      continue
    }
    const s = i
    while (i < n && lines[i].type === 'context' && dist[i] > context) i++
    // Folding a single line would save nothing.
    if (i - s >= 2) out.push([s, i])
  }
  return out
}

/** Table rows for one file in the chosen view, with folds applied. */
export function layoutDiff(lines: DiffViewLine[], options: DiffLayoutOptions = {}): DiffRow[] {
  const { view = 'split', context = 3, expanded = () => false } = options
  const folds = new Map(foldRanges(lines.map((l) => l.line), context).map(([s, e]) => [s, e]))
  const rows: DiffRow[] = []
  let i = 0
  while (i < lines.length) {
    const end = folds.get(i)
    if (end !== undefined && !expanded(i)) {
      rows.push({ kind: 'fold', key: `f${i}`, start: i, count: end - i })
      i = end
      continue
    }
    const vl = lines[i]
    const t = vl.line.type
    if (t === 'hunk') {
      rows.push({ kind: 'hunk', key: `h${i}`, text: vl.line.text })
      i++
    } else if (view === 'unified' || t === 'context') {
      if (view === 'unified') rows.push({ kind: 'line', key: `l${i}`, line: vl, start: vl.block >= 0 && (i === 0 || lines[i - 1].block !== vl.block) })
      else rows.push({ kind: 'pair', key: `l${i}`, left: vl, right: vl, block: -1, start: false })
      i++
    } else {
      const dels: DiffViewLine[] = []
      const adds: DiffViewLine[] = []
      const first = i
      while (i < lines.length && lines[i].block === vl.block) {
        ;(lines[i].line.type === 'del' ? dels : adds).push(lines[i])
        i++
      }
      for (let k = 0; k < Math.max(dels.length, adds.length); k++) {
        rows.push({ kind: 'pair', key: `p${first}-${k}`, left: dels[k] ?? null, right: adds[k] ?? null, block: vl.block, start: k === 0 })
      }
    }
  }
  return rows
}

/** Display name of a file: `old → new` when renamed. */
export function diffFileName(file: DiffFile, fallback = ''): string {
  if (file.status === 'renamed' && file.oldName && file.newName) return `${file.oldName} → ${file.newName}`
  return file.newName ?? file.oldName ?? fallback
}

const LANGS: Record<string, string> = {
  mjs: 'js',
  cjs: 'js',
  jsx: 'js',
  mts: 'ts',
  cts: 'ts',
  tsx: 'ts',
  sh: 'bash',
  zsh: 'zsh',
  htm: 'html',
  scss: 'css',
  less: 'css',
  yml: 'yaml',
  md: 'markdown',
}

/** A highlighter language guessed from a file name's extension ('' if none). */
export function diffLangOf(name: string | null | undefined): string {
  const ext = /\.([\w]+)$/.exec(name ?? '')?.[1]?.toLowerCase() ?? ''
  return LANGS[ext] ?? ext
}

export interface DiffModelInput extends DiffOptions {
  oldCode?: string
  newCode?: string
  patch?: string
  filename?: string
}

/** The files to show: parsed from `patch`, or one file diffed from old / new code. */
export function diffModel(input: DiffModelInput): DiffFile[] {
  if (input.patch !== undefined && input.patch !== null && input.patch.trim()) return parsePatch(input.patch, input)
  return [diffFile(input.oldCode ?? '', input.newCode ?? '', input)]
}
