// MlJsonViewer: the framework-free core (src/components/json.ts), then the Vue component.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { MlConfigProvider, MlJsonViewer, en, flattenJson, formatJsonPath, parseJson, searchJson, stringifyJson, jsonSafeUrl, jsonIsDate } from '../src'
import { jsonDefaultOpen, type JsonNodeRow } from '../src/components/json'

const api = {
  total: 2,
  users: [
    { id: 1, name: 'Nala', email: 'nala@pride.rock', tags: ['admin'] },
    { id: 2, name: 'Simba', email: 'simba@pride.rock', tags: [] },
  ],
  meta: { next: null, ok: true },
}

/* ── Core ──────────────────────────────────────────────── */
describe('json core', () => {
  it('parseJson reports line / column / found character', () => {
    expect(parseJson('{"a": [1, 2]}')).toEqual({ ok: true, value: { a: [1, 2] } })
    const bad = parseJson('{\n  "a": 1,\n  "b": [1, 2,]\n}')
    expect(bad.ok).toBe(false)
    if (bad.ok) return
    expect(bad.error).toMatchObject({ line: 3, column: 14, found: ']', lineText: '  "b": [1, 2,]' })
    const end = parseJson('{"a": "unterminated')
    expect(!end.ok && end.error.found).toBeUndefined()
    const trailing = parseJson('[1] x')
    expect(!trailing.ok && trailing.error).toMatchObject({ line: 1, column: 5, found: 'x' })
    const single = parseJson("{'a': 1}")
    expect(!single.ok && single.error).toMatchObject({ column: 2, found: "'" })
  })

  it('formats paths in both styles', () => {
    expect(formatJsonPath(['users', 3, 'name'])).toBe('$.users[3].name')
    expect(formatJsonPath(['users', 3, 'name'], 'dot')).toBe('users.3.name')
    expect(formatJsonPath(['first name', '0'])).toBe('$["first name"]["0"]')
    expect(formatJsonPath([])).toBe('$')
  })

  it('stringifyJson survives cycles and bigints', () => {
    const a: Record<string, unknown> = { n: 10n }
    a.self = a
    a.list = [a]
    expect(JSON.parse(stringifyJson(a))).toEqual({ n: '10', self: '[Circular]', list: ['[Circular]'] })
    const m = new Map<string, unknown>()
    m.set('me', m)
    expect(JSON.parse(stringifyJson({ m }))).toEqual({ m: { me: '[Circular]' } })
    // Shared (non-circular) references are kept.
    const shared = { x: 1 }
    expect(JSON.parse(stringifyJson([shared, shared]))).toEqual([{ x: 1 }, { x: 1 }])
  })

  it('only http(s) URLs become links; ISO dates are detected', () => {
    expect(jsonSafeUrl('https://malilion.dev/a?b=1')).toBe('https://malilion.dev/a?b=1')
    expect(jsonSafeUrl('javascript:alert(1)')).toBeUndefined()
    expect(jsonSafeUrl('data:text/html,hi')).toBeUndefined()
    expect(jsonSafeUrl('https://x.dev "><script>')).toBeUndefined()
    expect(jsonIsDate('2026-10-04')).toBe(true)
    expect(jsonIsDate('2026-10-04T09:30:00+08:00')).toBe(true)
    expect(jsonIsDate('2026-13-45')).toBe(false)
    expect(jsonIsDate('hello')).toBe(false)
  })

  it('search finds keys and values, records ancestors and how far to page', () => {
    const big = { list: Array.from({ length: 250 }, (_, i) => ({ i })) }
    big.list[230] = { i: 230, needle: 'here' } as never
    const s = searchJson(big, 'NEEDLE')!
    expect([...s.hits.keys()]).toEqual(['$.list[230].needle'])
    expect([...s.ancestors]).toEqual(expect.arrayContaining(['$', '$.list', '$.list[230]']))
    expect(s.reveal.get('$.list')).toBe(231)
    expect(searchJson(big, '  ')).toBeNull()
    const v = searchJson(api, 'simba')!
    expect([...v.hits.keys()]).toEqual(['$.users[1].name', '$.users[1].email'])
  })

  it('flattens with chunking, close rows and circular guards', () => {
    const data: Record<string, unknown> = { arr: Array.from({ length: 250 }, (_, i) => i) }
    data.loop = data
    const rows = flattenJson(data, { open: new Set(['$', '$.arr', '$.loop']), chunkSize: 100 })
    const arrItems = rows.filter((r) => r.kind === 'node' && r.parentId === '$.arr')
    expect(arrItems).toHaveLength(100)
    const more = rows.find((r) => r.kind === 'more')!
    expect(more).toMatchObject({ parentId: '$.arr', next: 100, rest: 150, posinset: 101, setsize: 101 })
    const loop = rows.find((r) => r.id === '$.loop') as JsonNodeRow
    expect(loop).toMatchObject({ type: 'circular', circular: '$' })
    expect(rows.filter((r) => r.kind === 'close').map((r) => r.id)).toEqual(['$.arr#close', '$#close'])
    const paged = flattenJson(data, { open: new Set(['$', '$.arr']), shown: new Map([['$.arr', 300]]), chunkSize: 100 })
    expect(paged.some((r) => r.kind === 'more')).toBe(false)
  })

  it('default open honours the depth', () => {
    expect([...jsonDefaultOpen(api, 2)]).toEqual(['$', '$.users', '$.meta'])
    expect([...jsonDefaultOpen(api, 0)]).toEqual([])
  })
})

/* ── Vue ───────────────────────────────────────────────── */
let writeText: ReturnType<typeof vi.fn>
beforeEach(() => {
  writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
})
afterEach(() => {
  document.body.innerHTML = ''
})

const items = (w: VueWrapper) => w.findAll('[role=treeitem]')
const rowByKey = (w: VueWrapper, key: string) => items(w).find((r) => r.find('.ml-json__key').exists() && r.get('.ml-json__key').text() === key)!

describe('MlJsonViewer', () => {
  it('renders a coloured tree with counts on collapsed nodes', () => {
    const w = mount(MlJsonViewer, { props: { data: api } })
    expect(w.get('[role=tree]').attributes('aria-label')).toBe('JSON 檢視器')
    // depth 2: root and its children open, the users' objects collapsed
    const user0 = rowByKey(w, '0')
    expect(user0.attributes('aria-expanded')).toBe('false')
    expect(user0.attributes('aria-level')).toBe('3')
    expect(user0.get('.ml-json__value--collapsed').text()).toBe('{…}')
    expect(user0.get('.ml-json__count').text()).toBe('4 個鍵')
    expect(rowByKey(w, 'total').get('.ml-json__value--number').text()).toBe('2')
    expect(rowByKey(w, 'ok').get('.ml-json__value--boolean').text()).toBe('true')
    expect(rowByKey(w, 'next').get('.ml-json__value--null').text()).toBe('null')
    expect(w.html()).not.toContain('v-html')
  })

  it('arrays say items; English locale', () => {
    const w = mount({ render: () => h(MlConfigProvider, { locale: en }, () => h(MlJsonViewer, { data: { list: [1, 2, 3] }, expandDepth: 1 })) })
    const list = w.findAll('[role=treeitem]').find((r) => r.find('.ml-json__key').exists())!
    expect(list.get('.ml-json__value--collapsed').text()).toBe('[…]')
    expect(list.get('.ml-json__count').text()).toBe('3 items')
    expect(w.get('.ml-json__search-input').attributes('placeholder')).toBe('Search keys or values…')
  })

  it('parse errors are friendly (line, column, caret) and render no tree', () => {
    const w = mount(MlJsonViewer, { props: { source: '{\n  "a": 1,\n}' } })
    expect(w.find('[role=tree]').exists()).toBe(false)
    expect(w.get('[role=alert]').text()).toContain('JSON 格式錯誤：第 3 行第 1 欄')
    expect(w.get('.ml-json__error-detail').text()).toBe('這裡出現了意外的「}」')
    expect(w.get('.ml-json__error-caret').text()).toBe('^')
    expect(w.classes()).toContain('ml-json--error')
  })

  it('source is parsed when valid', () => {
    const w = mount(MlJsonViewer, { props: { source: '{"lion": "Nala"}' } })
    expect(rowByKey(w, 'lion').get('.ml-json__value--string').text()).toBe('"Nala"')
  })

  it('chunks large arrays: 100 at a time with 再顯示 100 項', async () => {
    const w = mount(MlJsonViewer, { props: { data: Array.from({ length: 250 }, (_, i) => i), toolbar: false } })
    expect(items(w)).toHaveLength(1 + 100 + 1)
    const more = w.get('.ml-json__row--more')
    expect(more.text()).toBe('再顯示 100 項（還有 150 項）')
    await more.trigger('click')
    expect(items(w)).toHaveLength(1 + 200 + 1)
    await w.get('.ml-json__row--more').trigger('keydown', { key: 'Enter' })
    expect(items(w)).toHaveLength(1 + 250)
    expect(w.find('.ml-json__row--more').exists()).toBe(false)
  })

  it('search highlights keys and values and auto-expands the way to them', async () => {
    const w = mount(MlJsonViewer, { props: { data: api, expandDepth: 1 } })
    expect(w.find('.ml-json__hit').exists()).toBe(false)
    await w.get('.ml-json__search-input').setValue('SIMBA')
    expect(w.emitted('update:search')?.at(-1)).toEqual(['SIMBA'])
    expect(w.get('.ml-json__matches').text()).toBe('2 筆相符')
    const hits = w.findAll('mark.ml-json__hit').map((m) => m.text())
    expect(hits).toEqual(['Simba', 'simba'])
    expect(rowByKey(w, 'name').exists()).toBe(true)
    expect(w.findAll('.ml-json__row--match')).toHaveLength(2)
    // keys match too
    await w.setProps({ search: 'email' })
    expect(w.findAll('mark.ml-json__hit').every((m) => m.text() === 'email')).toBe(true)
    expect(w.get('.ml-json__matches').text()).toBe('2 筆相符')
  })

  it('filter hides unrelated rows; no matches shows the empty note', async () => {
    const w = mount(MlJsonViewer, { props: { data: api, filter: true, search: 'nala' } })
    const keys = w.findAll('.ml-json__key').map((k) => k.text())
    expect(keys).toEqual(['users', '0', 'name', 'email'])
    await w.setProps({ search: 'zzz' })
    expect(w.get('.ml-json__matches').text()).toBe('沒有相符')
    expect(w.get('.ml-json__empty').text()).toBe('沒有符合的內容')
  })

  it('search reveals matches beyond the first chunk and inside long strings', () => {
    const list = Array.from({ length: 300 }, (_, i) => `item ${i}`)
    list[250] = 'golden mane'
    const long = `${'x'.repeat(200)}needle`
    const w = mount(MlJsonViewer, { props: { data: { list, long }, search: 'golden', toolbar: false } })
    expect(w.findAll('mark.ml-json__hit').map((m) => m.text())).toEqual(['golden'])
    const w2 = mount(MlJsonViewer, { props: { data: { long }, search: 'needle', toolbar: false } })
    expect(w2.get('mark.ml-json__hit').text()).toBe('needle')
  })

  it('click a key to copy its path (both styles), a value to copy the value', async () => {
    const onCopy = vi.fn()
    const w = mount(MlJsonViewer, { props: { data: api, expandDepth: 3, onCopy }, attachTo: document.body })
    const name = items(w).filter((r) => r.find('.ml-json__key').exists() && r.get('.ml-json__key').text() === 'name')[1]
    await name.get('.ml-json__key').trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenLastCalledWith('$.users[1].name')
    expect(onCopy).toHaveBeenLastCalledWith({ kind: 'path', text: '$.users[1].name', path: ['users', 1, 'name'] })
    expect(w.get('[role=status]').text()).toBe('已複製路徑 $.users[1].name')
    expect(name.classes()).toContain('ml-json__row--copied')

    await name.get('.ml-json__value').trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenLastCalledWith('Simba')

    await w.setProps({ pathStyle: 'dot' })
    await name.get('.ml-json__key').trigger('click')
    await flushPromises()
    expect(writeText).toHaveBeenLastCalledWith('users.1.name')
    w.unmount()
  })

  it('copyable=false copies nothing', async () => {
    const w = mount(MlJsonViewer, { props: { data: { a: 1 }, copyable: false } })
    await rowByKey(w, 'a').get('.ml-json__key').trigger('click')
    await flushPromises()
    expect(writeText).not.toHaveBeenCalled()
  })

  it('long strings are cut with a toggle; URLs become safe links, dates <time>', async () => {
    const w = mount(MlJsonViewer, {
      props: {
        data: { bio: 'a'.repeat(150), site: 'https://malilion.dev', evil: 'javascript:alert(1)', at: '2026-10-04T09:30:00Z' },
        maxStringLength: 100,
      },
    })
    const bio = rowByKey(w, 'bio')
    expect(bio.get('.ml-json__value').text()).toBe(`"${'a'.repeat(100)}…"`)
    expect(bio.get('.ml-json__toggle-text').text()).toBe('展開（還有 50 字）')
    await bio.get('.ml-json__toggle-text').trigger('click')
    expect(rowByKey(w, 'bio').get('.ml-json__value').text()).toBe(`"${'a'.repeat(150)}"`)
    expect(rowByKey(w, 'bio').get('.ml-json__toggle-text').text()).toBe('收起')
    const link = rowByKey(w, 'site').get('a')
    expect(link.attributes()).toMatchObject({ href: 'https://malilion.dev/', target: '_blank', rel: 'noopener noreferrer' })
    expect(rowByKey(w, 'evil').find('a').exists()).toBe(false)
    expect(rowByKey(w, 'at').get('time').attributes('datetime')).toBe('2026-10-04T09:30:00Z')
  })

  it('circular references are shown, not followed', () => {
    const data: Record<string, unknown> = { name: 'pride' }
    data.self = data
    const w = mount(MlJsonViewer, { props: { data, expandDepth: 5 } })
    expect(rowByKey(w, 'self').get('.ml-json__value--circular').text()).toBe('循環參照 → $')
  })

  it('keyboard: arrows move / expand / collapse, Home / End, Enter toggles, c and p copy', async () => {
    const w = mount(MlJsonViewer, { props: { data: api, expandDepth: 1, toolbar: false }, attachTo: document.body })
    const focused = () => document.activeElement as HTMLElement
    const press = async (key: string) => {
      focused().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
      await nextTick()
      await nextTick()
    }
    const rootRow = items(w)[0]
    expect(rootRow.attributes('tabindex')).toBe('0')
    ;(rootRow.element as HTMLElement).focus()
    await press('ArrowDown')
    expect(focused().querySelector('.ml-json__key')?.textContent).toBe('total')
    await press('ArrowDown')
    expect(focused().getAttribute('aria-expanded')).toBe('false')
    await press('ArrowRight')
    expect(focused().getAttribute('aria-expanded')).toBe('true')
    await press('ArrowRight')
    expect(focused().querySelector('.ml-json__key')?.textContent).toBe('0')
    await press('ArrowLeft')
    expect(focused().querySelector('.ml-json__key')?.textContent).toBe('users')
    await press('ArrowLeft')
    expect(focused().getAttribute('aria-expanded')).toBe('false')
    await press('Enter')
    expect(focused().getAttribute('aria-expanded')).toBe('true')
    await press('End')
    expect(focused().querySelector('.ml-json__key')?.textContent).toBe('meta')
    await press('Home')
    expect(focused()).toBe(rootRow.element)
    await press('ArrowDown')
    await press('c')
    await flushPromises()
    expect(writeText).toHaveBeenLastCalledWith('2')
    await press('p')
    await flushPromises()
    expect(writeText).toHaveBeenLastCalledWith('$.total')
    // only one tab stop
    expect(items(w).filter((r) => r.attributes('tabindex') === '0')).toHaveLength(1)
    w.unmount()
  })

  it('expand all / collapse all (toolbar and exposed)', async () => {
    const w = mount(MlJsonViewer, { props: { data: api, expandDepth: 1 } })
    const [expand, collapse] = w.findAll('.ml-json__tools button')
    await expand.trigger('click')
    expect(items(w).filter((r) => r.attributes('aria-expanded') === 'false')).toHaveLength(0)
    expect(w.findAll('.ml-json__key').map((k) => k.text())).toContain('tags')
    await collapse.trigger('click')
    expect(items(w)).toHaveLength(1)
    ;(w.vm as unknown as { expandAll: () => void }).expandAll()
    await nextTick()
    expect(items(w).length).toBeGreaterThan(10)
  })

  it('resets expansion when the data changes', async () => {
    const w = mount(MlJsonViewer, { props: { data: { a: { b: 1 } }, expandDepth: 1 } })
    expect(items(w)).toHaveLength(2)
    await w.setProps({ data: { x: { y: { z: 1 } } }, expandDepth: 2 })
    expect(w.findAll('.ml-json__key').map((k) => k.text())).toEqual(['x', 'y'])
  })
})
