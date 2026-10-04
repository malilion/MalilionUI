// 注音 helpers, MlZhuyin and MlIndexBar.
import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { MlIndexBar, MlZhuyin, annotateZhuyin, zhuyinPieces, clearZhuyin, formatZhuyin, groupIndexItems, indexKey, parseZhuyin, pinyinToZhuyin, registerZhuyin } from '../src'
import { activeGroup, railKeyAt } from '../src/components/index-bar'

let wrapper: VueWrapper | undefined
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
  clearZhuyin()
})

describe('zhuyin syllables', () => {
  it('parses and writes tones, light tone first', () => {
    expect(parseZhuyin('ㄌㄧㄤˊ')).toEqual({ symbols: 'ㄌㄧㄤ', tone: 2 })
    expect(parseZhuyin('ㄉㄜ˙')).toEqual({ symbols: 'ㄉㄜ', tone: 5 })
    expect(parseZhuyin('˙ㄉㄜ')).toEqual({ symbols: 'ㄉㄜ', tone: 5 })
    expect(parseZhuyin('ㄕ')).toEqual({ symbols: 'ㄕ', tone: 1 })
    expect(parseZhuyin('shi')).toBeNull()
    expect(formatZhuyin({ symbols: 'ㄉㄜ', tone: 5 })).toBe('˙ㄉㄜ')
    expect(formatZhuyin({ symbols: 'ㄇㄚ', tone: 3 })).toBe('ㄇㄚˇ')
  })

  it.each([
    ['shī', 'ㄕ'],
    ['shi1', 'ㄕ'],
    ['zhi4', 'ㄓˋ'],
    ['ri4', 'ㄖˋ'],
    ['sì', 'ㄙˋ'],
    ['liáng', 'ㄌㄧㄤˊ'],
    ['lüè', 'ㄌㄩㄝˋ'],
    ['lve4', 'ㄌㄩㄝˋ'],
    ['nü3', 'ㄋㄩˇ'],
    ['jiong3', 'ㄐㄩㄥˇ'],
    ['qu4', 'ㄑㄩˋ'],
    ['xué', 'ㄒㄩㄝˊ'],
    ['yuan2', 'ㄩㄢˊ'],
    ['yong3', 'ㄩㄥˇ'],
    ['ying1', 'ㄧㄥ'],
    ['you3', 'ㄧㄡˇ'],
    ['wei4', 'ㄨㄟˋ'],
    ['weng1', 'ㄨㄥ'],
    ['dong1', 'ㄉㄨㄥ'],
    ['gui4', 'ㄍㄨㄟˋ'],
    ['liu2', 'ㄌㄧㄡˊ'],
    ['er2', 'ㄦˊ'],
    ['de', '˙ㄉㄜ'],
    ['ma5', '˙ㄇㄚ'],
    ['ng2', 'ㄫˊ'],
    ['Lǎo', 'ㄌㄠˇ'],
  ])('pinyin %s → %s', (py, zy) => {
    expect(pinyinToZhuyin(py)).toBe(zy)
  })

  it('rejects things that are not pinyin', () => {
    expect(pinyinToZhuyin('hello')).toBe('')
    expect(pinyinToZhuyin('yx')).toBe('')
    expect(pinyinToZhuyin('')).toBe('')
  })
})

describe('annotateZhuyin', () => {
  it('gives explicit readings to Han characters only', () => {
    const units = annotateZhuyin('碼力獅，Go！', 'ㄇㄚˇ lì shī')
    expect(units.map((u) => u.zhuyin)).toEqual(['ㄇㄚˇ', 'ㄌㄧˋ', 'ㄕ', '', '', '', ''])
  })

  it('"_" leaves a character bare; extra readings are ignored', () => {
    expect(annotateZhuyin('一二', ['_', 'ㄦˋ', 'ㄙㄢ']).map((u) => u.zhuyin)).toEqual(['', 'ㄦˋ'])
  })

  it('uses registered words before single characters (破音字)', () => {
    registerZhuyin({ 行: 'ㄒㄧㄥˊ', 銀行: 'yín háng', 走: 'zǒu', 不對: 'ㄅㄨˊ' })
    expect(annotateZhuyin('走去銀行，行！').map((u) => u.zhuyin)).toEqual(['ㄗㄡˇ', '', 'ㄧㄣˊ', 'ㄏㄤˊ', '', 'ㄒㄧㄥˊ', ''])
    // A word whose reading count doesn't match is skipped.
    expect(annotateZhuyin('不對')[0].zhuyin).toBe('')
  })
})

describe('zhuyinPieces', () => {
  it('glues closing punctuation to the character before it', () => {
    const pieces = zhuyinPieces('好，「走」。', 'ㄏㄠˇ ㄗㄡˇ')
    expect(pieces.map((p) => [p.char, p.tail])).toEqual([
      ['好', '，'],
      ['「', ''],
      ['走', '」。'],
    ])
    expect(pieces[0]).toMatchObject({ symbols: ['ㄏ', 'ㄠ'], tone: 3 })
  })
})

describe('indexKey', () => {
  it('files common surnames under the right 注音 initial', () => {
    const expected: Record<string, string> = {
      陳: 'ㄔ', 林: 'ㄌ', 黃: 'ㄏ', 張: 'ㄓ', 李: 'ㄌ', 王: 'ㄨ', 吳: 'ㄨ', 劉: 'ㄌ', 蔡: 'ㄘ', 楊: 'ㄧ', 許: 'ㄒ', 鄭: 'ㄓ',
      郭: 'ㄍ', 邱: 'ㄑ', 蘇: 'ㄙ', 潘: 'ㄆ', 彭: 'ㄆ', 白: 'ㄅ', 馬: 'ㄇ', 范: 'ㄈ', 戴: 'ㄉ', 柯: 'ㄎ', 施: 'ㄕ', 江: 'ㄐ',
      安: 'ㄢ', 歐: 'ㄡ', 艾: 'ㄞ', 阿: 'ㄚ', 恩: 'ㄣ', 余: 'ㄩ', 二: 'ㄦ', 牛: 'ㄋ', 唐: 'ㄊ', 任: 'ㄖ', 鄒: 'ㄗ',
      // 破音字 surnames read as names
      曾: 'ㄗ', 沈: 'ㄕ', 單: 'ㄕ', 仇: 'ㄑ', 區: 'ㄡ',
    }
    for (const [name, key] of Object.entries(expected)) expect(`${name}${indexKey(`${name}小明`)}`).toBe(`${name}${key}`)
  })

  it('alphabet mode files Chinese by pinyin', () => {
    expect(['陳', '林', '黃', '張', '王', '阿', '歐', '曾', '沈'].map((n) => indexKey(n, 'alphabet')).join('')).toBe('CLHZWAOZS')
  })

  it('Latin names by letter (accents folded), everything else under #', () => {
    expect(indexKey('leo')).toBe('L')
    expect(indexKey('Émile')).toBe('E')
    expect(indexKey('ㄅㄆㄇ')).toBe('ㄅ')
    expect(indexKey('ㄅ', 'alphabet')).toBe('#')
    expect(indexKey('123')).toBe('#')
    expect(indexKey('  ')).toBe('#')
  })
})

describe('groupIndexItems', () => {
  const people = ['王小明', 'Leo', '陳大文', '林美玲', '曾國城', '#hashtag', '陳一'].map((label) => ({ label }))

  it('orders 注音 groups, then A–Z, then #, sorting inside each group', () => {
    const groups = groupIndexItems(people, 'zhuyin')
    expect(groups.map((g) => g.key)).toEqual(['ㄌ', 'ㄔ', 'ㄗ', 'ㄨ', 'L', '#'])
    // 大 (ㄉ) comes before 一 (ㄧ) in 注音 order.
    expect(groups[1].items.map((i) => i.label)).toEqual(['陳大文', '陳一'])
  })

  it('sort=false keeps your order; explicit index wins', () => {
    const groups = groupIndexItems([{ label: '陳大文' }, { label: '陳一' }, { label: '王', index: 'ㄅ' }], 'zhuyin', false)
    expect(groups.map((g) => [g.key, g.items.map((i) => i.label)])).toEqual([
      ['ㄅ', ['王']],
      ['ㄔ', ['陳大文', '陳一']],
    ])
  })

  it('custom indexes limit the buckets; strays go to # or the last one', () => {
    expect(groupIndexItems(people, 'zhuyin', true, ['ㄔ', 'ㄨ', '#']).map((g) => [g.key, g.items.length])).toEqual([
      ['ㄔ', 2],
      ['ㄨ', 1],
      ['#', 4],
    ])
    expect(groupIndexItems(people, 'alphabet', true, ['C', 'W', 'Other']).map((g) => g.key)).toEqual(['C', 'W', 'Other'])
  })

  it('rail helpers', () => {
    expect(activeGroup([0, 120, 300], 0)).toBe(0)
    expect(activeGroup([0, 120, 300], 119.5)).toBe(1)
    expect(activeGroup([0, 120, 300], 900)).toBe(2)
    expect(railKeyAt([10, 30, 50], 44)).toBe(2)
    expect(railKeyAt([10, 30, 50], -100)).toBe(0)
  })
})

describe('MlZhuyin', () => {
  it('renders ruby with stacked symbols and a tone mark', () => {
    wrapper = mount(MlZhuyin, { props: { text: '獅子吼', zhuyin: 'ㄕ ˙ㄗ ㄏㄡˇ' } })
    const units = wrapper.findAll('.ml-zhuyin__unit')
    expect(units).toHaveLength(3)
    expect(units[0].findAll('.ml-zhuyin__sym').map((s) => s.text())).toEqual(['ㄕ'])
    expect(units[0].find('.ml-zhuyin__tone').exists()).toBe(false)
    expect(units[1].find('.ml-zhuyin__light').exists()).toBe(true)
    expect(units[2].findAll('.ml-zhuyin__sym').map((s) => s.text())).toEqual(['ㄏ', 'ㄡ'])
    expect(units[2].find('.ml-zhuyin__tone').text()).toBe('ˇ')
    expect(wrapper.classes()).toContain('ml-zhuyin--right')
    expect(wrapper.attributes('lang')).toBe('zh-Hant-TW')
  })

  it('keeps punctuation and unknown characters as plain text; top position', () => {
    wrapper = mount(MlZhuyin, { props: { text: '你好！Hi', zhuyin: 'nǐ', position: 'top' } })
    expect(wrapper.findAll('.ml-zhuyin__unit')).toHaveLength(1)
    expect(wrapper.text().replace(/\s/g, '')).toBe('你(ㄋㄧˇ)好！Hi')
    expect(wrapper.classes()).toContain('ml-zhuyin--top')
  })

  it('falls back to the registered dictionary', () => {
    registerZhuyin({ 碼: 'ㄇㄚˇ', 力: 'ㄌㄧˋ' })
    wrapper = mount(MlZhuyin, { props: { text: '碼力獅' } })
    expect(wrapper.findAll('.ml-zhuyin__unit')).toHaveLength(2)
  })
})

describe('MlIndexBar', () => {
  const contacts = [
    { label: '陳大文', desc: '0912-345-678' },
    { label: '林美玲' },
    { label: '王小明' },
    { label: 'Leo' },
  ]

  it('renders groups, rail keys and items', () => {
    wrapper = mount(MlIndexBar, { props: { items: contacts } })
    expect(wrapper.findAll('.ml-indexbar__header').map((h) => h.text())).toEqual(['ㄌ', 'ㄔ', 'ㄨ', 'L'])
    expect(wrapper.findAll('.ml-indexbar__key').map((k) => k.text())).toEqual(['ㄌ', 'ㄔ', 'ㄨ', 'L'])
    expect(wrapper.find('.ml-indexbar__key--active').text()).toBe('ㄌ')
    expect(wrapper.find('.ml-indexbar__desc').text()).toBe('0912-345-678')
    expect(wrapper.find('nav').attributes('aria-label')).toBe('索引')
  })

  it('clicking a rail key scrolls to its group and emits change', async () => {
    wrapper = mount(MlIndexBar, { props: { items: contacts }, attachTo: document.body })
    const list = wrapper.find('.ml-indexbar__list').element as HTMLElement
    const sections = wrapper.findAll('.ml-indexbar__group')
    sections.forEach((s, i) => Object.defineProperty(s.element, 'offsetTop', { value: i * 100, configurable: true }))
    await wrapper.findAll('.ml-indexbar__key')[2].trigger('click')
    expect(list.scrollTop).toBe(200)
    expect(wrapper.emitted('change')?.[0]).toEqual(['ㄨ'])
    expect(wrapper.find('.ml-indexbar__key--active').text()).toBe('ㄨ')

    list.scrollTop = 120
    await wrapper.find('.ml-indexbar__list').trigger('scroll')
    expect(wrapper.emitted('change')?.at(-1)).toEqual(['ㄔ'])
  })

  it('arrow keys move along the rail', async () => {
    wrapper = mount(MlIndexBar, { props: { items: contacts }, attachTo: document.body })
    const rail = wrapper.find('nav')
    await rail.trigger('keydown', { key: 'ArrowDown' })
    await rail.trigger('keydown', { key: 'ArrowDown' })
    expect(wrapper.find('.ml-indexbar__key--active').text()).toBe('ㄨ')
    await rail.trigger('keydown', { key: 'End' })
    expect(wrapper.find('.ml-indexbar__key--active').text()).toBe('L')
    await nextTick()
    expect(document.activeElement?.textContent?.trim()).toBe('L')
  })

  it('full index list marks empty keys disabled; item-click and slots', async () => {
    wrapper = mount(MlIndexBar, {
      props: { items: contacts, indexes: ['ㄅ', 'ㄌ', 'ㄔ', 'ㄨ', '#'], height: '50vh' },
      slots: { header: '<template #header="{ index }">【{{ index }}】</template>' },
    })
    const keys = wrapper.findAll('.ml-indexbar__key')
    expect(keys[0].attributes('disabled')).toBeDefined()
    expect(keys[0].classes()).toContain('ml-indexbar__key--empty')
    expect(wrapper.findAll('.ml-indexbar__header')[0].text()).toBe('【ㄌ】')
    expect(wrapper.attributes('style')).toContain('--ml-indexbar-h: 50vh')
    await wrapper.find('.ml-indexbar__item').trigger('click')
    expect((wrapper.emitted('item-click')?.[0][0] as { label: string }).label).toBe('林美玲')
  })

  it('empty state', () => {
    wrapper = mount(MlIndexBar, { props: { items: [] } })
    expect(wrapper.find('.ml-indexbar__empty').text()).toBe('沒有資料')
    expect(wrapper.find('nav').exists()).toBe(false)
  })
})
