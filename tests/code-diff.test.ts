import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { MlCodeDiff, decorateDiff, diffFile, diffLines, diffWords, foldRanges, highlightTokens, layoutDiff, parsePatch, splitLines } from '../src'
import type { DiffLine } from '../src'

const sig = (lines: DiffLine[]) => lines.map((l) => `${l.type === 'add' ? '+' : l.type === 'del' ? '-' : ' '}${l.text}`).join('|')

/** Apply a diff's lines back: old side and new side must reproduce the inputs. */
function sides(lines: DiffLine[]) {
  return {
    old: lines.filter((l) => l.type !== 'add').map((l) => l.text),
    new: lines.filter((l) => l.type !== 'del').map((l) => l.text),
  }
}

describe('diffLines', () => {
  it('empty and identical inputs', () => {
    expect(diffLines('', '')).toEqual([])
    const same = diffLines('a\nb\n', 'a\nb\n')
    expect(same.every((l) => l.type === 'context')).toBe(true)
    expect(same.map((l) => [l.oldNo, l.newNo])).toEqual([
      [1, 1],
      [2, 2],
    ])
  })

  it('all added / all removed', () => {
    expect(sig(diffLines('', 'x\ny\n'))).toBe('+x|+y')
    expect(sig(diffLines('x\ny\n', ''))).toBe('-x|-y')
    expect(sig(diffLines('a\nb', 'c\nd'))).toBe('-a|-b|+c|+d')
  })

  it('finds a shortest script, removals before additions', () => {
    const lines = diffLines('a\nb\nc\nd\ne\n', 'a\nc\nd\nX\ne\nf\n')
    expect(sig(lines)).toBe(' a|-b| c| d|+X| e|+f')
    expect(lines.find((l) => l.text === 'X')).toEqual({ type: 'add', text: 'X', newNo: 4 })
    expect(lines.find((l) => l.text === 'e')).toMatchObject({ oldNo: 5, newNo: 5 })
  })

  it('round-trips random edits with a minimal edit count', () => {
    let seed = 7
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
    for (let t = 0; t < 60; t++) {
      const a = Array.from({ length: Math.floor(rnd() * 30) }, () => 'abcde'[Math.floor(rnd() * 5)])
      const b = Array.from({ length: Math.floor(rnd() * 30) }, () => 'abcde'[Math.floor(rnd() * 5)])
      const lines = diffLines(a.join('\n'), b.join('\n'))
      expect(sides(lines)).toEqual({ old: a, new: b })
      // Optimal: edits = |a| + |b| - 2·LCS.
      const L = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))
      for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1])
      expect(lines.filter((l) => l.type !== 'context').length).toBe(a.length + b.length - 2 * L[0][0])
    }
  })

  it('treats CRLF like LF', () => {
    expect(diffLines('a\r\nb\r\n', 'a\nb\n').every((l) => l.type === 'context')).toBe(true)
    expect(splitLines('a\r\nb\rc\n')).toEqual({ lines: ['a', 'b', 'c'], eol: true })
  })

  it('a missing trailing newline is a change, flagged on the line', () => {
    const lines = diffLines('a\nb\n', 'a\nb')
    expect(sig(lines)).toBe(' a|-b|+b')
    expect(lines[2].noNewline).toBe(true)
    expect(lines[1].noNewline).toBeUndefined()
    const both = diffLines('a\nb', 'a\nb')
    expect(both.every((l) => l.type === 'context')).toBe(true)
    expect(both[1].noNewline).toBe(true)
    expect(diffLines('a\n', 'a', { ignoreWhitespace: true }).every((l) => l.type === 'context')).toBe(true)
  })

  it('ignores whitespace on request', () => {
    expect(sig(diffLines('if (a) {\n  go()\n}', 'if (a) {\n    go( )\n}', { ignoreWhitespace: true }))).toBe(' if (a) {|     go( )| }')
    expect(sig(diffLines('a b', 'ab'))).toBe('-a b|+ab')
  })

  it('falls back past maxEdits but stays correct', () => {
    const a = Array.from({ length: 400 }, (_, i) => `old ${i}`).join('\n')
    const b = Array.from({ length: 400 }, (_, i) => `new ${i}`).join('\n')
    const lines = diffLines(`head\n${a}\ntail`, `head\n${b}\ntail`, { maxEdits: 10 })
    expect(lines[0].type).toBe('context')
    expect(lines[lines.length - 1].type).toBe('context')
    expect(lines.filter((l) => l.type === 'del').length).toBe(400)
    expect(lines.slice(1, 401).every((l) => l.type === 'del')).toBe(true)
  })

  it('handles large inputs quickly', () => {
    const a = Array.from({ length: 5000 }, (_, i) => `const v${i} = ${i}`)
    const b = a.map((l, i) => (i % 50 === 0 ? `${l} // changed` : l))
    b.splice(2500, 0, 'inserted()')
    const t = performance.now()
    const lines = diffLines(a.join('\n'), b.join('\n'))
    expect(performance.now() - t).toBeLessThan(1500)
    expect(lines.filter((l) => l.type === 'add').length).toBe(101)
  })
})

describe('diffWords', () => {
  it('marks only the changed words', () => {
    const r = diffWords('const roar = 1', 'const roar = 2')!
    expect(r.old).toEqual([[13, 14]])
    expect(r.new).toEqual([[13, 14]])
  })

  it('joins changes separated by whitespace only', () => {
    const r = diffWords('let a = foo bar', 'let a = baz qux')!
    expect(r.old).toEqual([[8, 15]])
    expect(r.new).toEqual([[8, 15]])
    // Barely alike: no word marks at all.
    expect(diffWords('import x from "y"', 'return total * 2')).toBeNull()
    const r2 = diffWords('hello big wide world here', 'hello small tiny world here')!
    expect(r2.new).toEqual([[6, 16]])
  })

  it('splits CJK by character', () => {
    const r = diffWords('碼力獅很可愛', '碼力獅超可愛')!
    expect(r.old).toEqual([[3, 4]])
    expect(r.new).toEqual([[3, 4]])
  })

  it('ignores whitespace-only token changes when asked', () => {
    const r = diffWords('a  =  1', 'a = 2', { ignoreWhitespace: true })!
    expect(r.new).toEqual([[4, 5]])
  })
})

const PATCH = `From 1a2b Mon Sep 17 00:00:00 2001
Subject: [PATCH] roar louder

diff --git a/src/lion.ts b/src/lion.ts
index 83db48f..bf269f4 100644
--- a/src/lion.ts
+++ b/src/lion.ts
@@ -1,4 +1,4 @@ export function roar() {
 const a = 1
-const b = 2
+const b = 3
 const c = 4
--- old dashes
@@ -10,2 +10,3 @@
 x
+y
 z
\\ No newline at end of file
diff --git a/old.txt b/new.txt
similarity index 90%
rename from old.txt
rename to new.txt
diff --git a/logo.png b/logo.png
new file mode 100644
Binary files /dev/null and b/logo.png differ
diff --git a/gone.md b/gone.md
deleted file mode 100644
--- a/gone.md
+++ /dev/null
@@ -1 +0,0 @@
-bye
`

describe('parsePatch', () => {
  it('reads files, hunks, numbers and statuses', () => {
    const files = parsePatch(PATCH)
    expect(files.map((f) => [f.oldName, f.newName, f.status, f.binary])).toEqual([
      ['src/lion.ts', 'src/lion.ts', 'modified', false],
      ['old.txt', 'new.txt', 'renamed', false],
      ['logo.png', 'logo.png', 'added', true],
      ['gone.md', null, 'deleted', false],
    ])
    const [lion] = files
    expect(lion.added).toBe(2)
    expect(lion.removed).toBe(2)
    expect(lion.lines[0]).toMatchObject({ type: 'hunk', hunk: { oldStart: 1, oldLines: 4, newStart: 1, newLines: 4, section: 'export function roar() {' } })
    // "--- old dashes" inside a hunk is a removed line, not a file header.
    expect(lion.lines[5]).toMatchObject({ type: 'del', text: '-- old dashes', oldNo: 4 })
    expect(lion.lines.find((l) => l.text === 'y')).toMatchObject({ type: 'add', newNo: 11 })
    expect(lion.lines[lion.lines.length - 1]).toMatchObject({ text: 'z', noNewline: true, oldNo: 11, newNo: 12 })
    expect(files[3].lines[1]).toMatchObject({ type: 'del', text: 'bye', oldNo: 1 })
  })

  it('handles plain diff -u output and CRLF patches', () => {
    const files = parsePatch('--- a.txt\t2024-01-01\r\n+++ b.txt\t2024-01-02\r\n@@ -1 +1 @@\r\n-a\r\n+b\r\n')
    expect(files).toHaveLength(1)
    expect(files[0]).toMatchObject({ oldName: 'a.txt', newName: 'b.txt', status: 'renamed', added: 1, removed: 1 })
    expect(parsePatch('')).toEqual([])
  })

  it('whitespace-only edits become context with ignoreWhitespace', () => {
    const p = '--- a/x\n+++ b/x\n@@ -1,2 +1,2 @@\n-  a\n-b\n+a\n+c\n'
    const f = parsePatch(p, { ignoreWhitespace: true })[0]
    expect(sig(f.lines.slice(1))).toBe(' a|-b|+c')
    expect(f.lines[1]).toMatchObject({ oldNo: 1, newNo: 1 })
  })
})

describe('view model', () => {
  it('folds unchanged runs beyond the context', () => {
    const a = Array.from({ length: 20 }, (_, i) => `l${i}`)
    const b = [...a]
    b[10] = 'changed'
    const lines = diffLines(a.join('\n'), b.join('\n'))
    expect(foldRanges(lines, 3)).toEqual([
      [0, 7],
      [15, 21],
    ])
    expect(foldRanges(lines, -1)).toEqual([])
    // Identical files fold entirely.
    expect(foldRanges(diffLines('a\nb\nc', 'a\nb\nc'), 3)).toEqual([[0, 3]])
  })

  it('pairs removed and added lines in split view', () => {
    const f = diffFile('a\nb\nc\n', 'a\nB\nC\nD\nc\n')
    const rows = layoutDiff(decorateDiff(f), { view: 'split', context: -1 })
    expect(rows.map((r) => (r.kind === 'pair' ? `${r.left?.line.text ?? '_'}/${r.right?.line.text ?? '_'}` : r.kind))).toEqual(['a/a', 'b/B', '_/C', '_/D', 'c/c'])
    expect(rows.filter((r) => r.kind === 'pair' && r.start)).toHaveLength(1)
  })

  it('combines syntax tokens with word marks, never as HTML', () => {
    const f = diffFile('const a = "<b>"\n', 'const a = "<i>"\n')
    const [del, add] = decorateDiff(f, { lang: 'ts' })
    expect(del.segs.map((s) => s.text).join('')).toBe('const a = "<b>"')
    expect(add.segs.find((s) => s.mark)).toMatchObject({ cls: 'tok-string', mark: true })
    expect(add.segs.filter((s) => s.mark).map((s) => s.text).join('')).toBe('i')
    expect(highlightTokens('a // <x>', 'ts')[0]).toEqual([
      { text: 'a ', cls: '' },
      { text: '// <x>', cls: 'tok-comment' },
    ])
  })
})

const OLD = Array.from({ length: 30 }, (_, i) => `line ${i + 1}`).join('\n')
const NEW = OLD.replace('line 5', 'line five').replace('line 25', 'line 25 (lion)')

describe('MlCodeDiff', () => {
  it('renders a table with screen-reader markers and stats', () => {
    const w = mount(MlCodeDiff, { props: { oldCode: OLD, newCode: NEW, filename: 'roar.ts' } })
    expect(w.find('table.ml-diff__table').exists()).toBe(true)
    expect(w.find('caption').text()).toBe('roar.ts 的差異')
    expect(w.find('.ml-diff__name').text()).toBe('roar.ts')
    expect(w.find('.ml-diff__lang').text()).toBe('ts')
    expect(w.find('.ml-diff__stat--add').text()).toBe('+2')
    expect(w.find('.ml-diff__stat--del').text()).toBe('−2')
    expect(w.findAll('.ml-diff__sr').map((e) => e.text())).toEqual(['刪除', '新增', '刪除', '新增'])
    expect(w.find('.ml-diff__cell--add .ml-diff__word').text()).toBe('five')
    expect(w.findAll('th').map((t) => t.text())).toEqual(['舊行號', '舊版本', '新行號', '新版本'])
  })

  it('expands folds', async () => {
    const w = mount(MlCodeDiff, { props: { oldCode: OLD, newCode: NEW } })
    const folds = w.findAll('.ml-diff__expand')
    expect(folds.map((f) => f.text())).toEqual(['展開 13 行', '展開 2 行'])
    const before = w.findAll('tbody tr.ml-diff__row').length
    await folds[0].trigger('click')
    expect(w.findAll('.ml-diff__expand')).toHaveLength(1)
    expect(w.findAll('tbody tr.ml-diff__row').length).toBe(before + 13)
    ;(w.vm as unknown as { expandAll: () => void }).expandAll()
    await nextTick()
    expect(w.findAll('.ml-diff__expand')).toHaveLength(0)
    expect(w.findAll('tbody tr.ml-diff__row')).toHaveLength(30)
  })

  it('toggles the view', async () => {
    const w = mount(MlCodeDiff, { props: { oldCode: OLD, newCode: NEW, 'onUpdate:view': (v: string) => w.setProps({ view: v as 'split' }) } })
    expect(w.classes()).toContain('ml-diff--split')
    const [split, unified] = w.findAll('.ml-diff__view')
    expect(split.attributes('aria-pressed')).toBe('true')
    await unified.trigger('click')
    expect(w.emitted('update:view')?.[0]).toEqual(['unified'])
    expect(w.classes()).toContain('ml-diff--unified')
    expect(w.findAll('tr.ml-diff__row--add')).toHaveLength(2)
    expect(w.findAll('th').map((t) => t.text())).toEqual(['舊行號', '新行號', '內容'])
  })

  it('jumps between changes with buttons and n / p', async () => {
    const w = mount(MlCodeDiff, { props: { oldCode: OLD, newCode: NEW }, attachTo: document.body })
    expect(w.find('.ml-diff__pos').text()).toBe('2 處變更')
    const [prev, next] = w.findAll('.ml-diff__btn')
    await next.trigger('click')
    await nextTick()
    expect(w.find('.ml-diff__pos').text()).toBe('1 / 2')
    expect(document.activeElement?.getAttribute('data-ml-diff-change')).toBe('0')
    await w.trigger('keydown', { key: 'n' })
    await nextTick()
    expect(w.find('.ml-diff__pos').text()).toBe('2 / 2')
    expect(document.activeElement?.getAttribute('data-ml-diff-change')).toBe('1')
    expect(w.find('[data-ml-diff-change="1"]').classes()).toContain('ml-diff__row--current')
    await w.trigger('keydown', { key: 'n' })
    expect(w.find('.ml-diff__pos').text()).toBe('1 / 2')
    await prev.trigger('click')
    await w.trigger('keydown', { key: 'p' })
    expect(w.emitted('navigate')?.at(-1)).toEqual([0, 2])
    w.unmount()
  })

  it('renders patches as stacked files without v-html', () => {
    const w = mount(MlCodeDiff, { props: { patch: PATCH + 'diff --git a/x.vue b/x.vue\n--- a/x.vue\n+++ b/x.vue\n@@ -1 +1 @@\n-<b>a</b>\n+<script>alert(1)</script>\n' } })
    expect(w.findAll('.ml-diff__file')).toHaveLength(5)
    expect(w.find('.ml-diff__bar .ml-diff__name').text()).toBe('5 個檔案')
    expect(w.findAll('.ml-diff__file-head .ml-diff__name').map((e) => e.text())).toEqual(['src/lion.ts', 'old.txt → new.txt', 'logo.png', 'gone.md', 'x.vue'])
    expect(w.findAll('.ml-diff__hunk')[0].text()).toBe('@@ -1,4 +1,4 @@ export function roar() {')
    expect(w.text()).toContain('二進位檔案已變更')
    expect(w.text()).toContain('檔案結尾沒有換行')
    expect(w.html()).not.toContain('<script>')
    expect(w.text()).toContain('<script>alert(1)</script>')
  })

  it('shows "no changes" for identical input', () => {
    const w = mount(MlCodeDiff, { props: { oldCode: 'a\nb\nc', newCode: 'a\nb\nc' } })
    expect(w.find('.ml-diff__note').text()).toBe('沒有差異')
    expect(w.find('.ml-diff__nav').exists()).toBe(false)
  })
})
