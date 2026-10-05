import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { h, nextTick, ref } from 'vue'
import { MlButton, MlButtonGroup, MlHighlight, MlToggleGroup } from '../src'
import { foldWidth, splitHighlight } from '../src/components/highlight-text'
import { nextToggleValue, toggleFocusTarget, toggleSelection, toggleTabStop } from '../src/components/toggle-group'

const marks = (text: string, keywords: string | string[], options = {}) =>
  splitHighlight(text, keywords, options)
    .filter((c) => c.match)
    .map((c) => c.text)

describe('splitHighlight', () => {
  it('finds keywords inside Chinese text with no word boundaries', () => {
    expect(splitHighlight('碼力獅子座的獅子', '獅子')).toEqual([
      { text: '碼力', match: false },
      { text: '獅子', match: true },
      { text: '座的', match: false },
      { text: '獅子', match: true },
    ])
  })

  it('returns one plain chunk without keywords and nothing for empty text', () => {
    expect(splitHighlight('碼力獅', [])).toEqual([{ text: '碼力獅', match: false }])
    expect(splitHighlight('碼力獅', ['', '  '])).toEqual([{ text: '碼力獅', match: false }])
    expect(splitHighlight('碼力獅', undefined)).toEqual([{ text: '碼力獅', match: false }])
    expect(splitHighlight('', '獅')).toEqual([])
  })

  it('merges overlapping and touching matches; the longest keyword wins', () => {
    expect(marks('abcdef', ['abc', 'cde'])).toEqual(['abcde'])
    expect(marks('abcdef', ['ab', 'cd'])).toEqual(['abcd'])
    expect(marks('獅子王', ['獅', '獅子王'])).toEqual(['獅子王'])
    expect(marks('aaaa', 'aa')).toEqual(['aaaa'])
  })

  it('treats regex specials as plain text', () => {
    expect(marks('C++ 與 C#、(a|b) 和 .*', ['C++', '(a|b)', '.*'])).toEqual(['C++', '(a|b)', '.*'])
    expect(marks('a.c abc', '.')).toEqual(['.'])
    expect(marks('$1 ^ \\d', ['$1', '\\d'])).toEqual(['$1', '\\d'])
  })

  it('ignores case unless asked, and folds full-width forms by default', () => {
    expect(marks('Malilion UI', 'malilion')).toEqual(['Malilion'])
    expect(marks('Malilion UI', 'malilion', { caseSensitive: true })).toEqual([])
    expect(marks('型號 ＡＢＣ－１２３', 'abc-123')).toEqual(['ＡＢＣ－１２３'])
    expect(marks('型號 ABC-123', 'ＡＢＣ')).toEqual(['ABC'])
    expect(marks('型號 ＡＢＣ', 'abc', { ignoreWidth: false })).toEqual([])
    expect(foldWidth('Ｈｉ　１２３！')).toBe('Hi 123!')
  })

  it('never splits astral characters, emoji or flags', () => {
    expect(marks('𠮷野家的𠮷', '𠮷')).toEqual(['𠮷', '𠮷'])
    expect(marks('家人 👨‍👩‍👧 合照', '👨‍👩‍👧')).toEqual(['👨‍👩‍👧'])
    // A lone person is not part of the family cluster.
    expect(marks('家人 👨‍👩‍👧', '👨')).toEqual([])
    expect(marks('🇹🇼🇯🇵', '🇯🇵')).toEqual(['🇯🇵'])
    expect(splitHighlight('a😀b', '😀').map((c) => c.text)).toEqual(['a', '😀', 'b'])
  })

  it('matches composed and decomposed accents alike', () => {
    expect(marks('Café', 'café')).toEqual(['Café'])
  })
})

describe('MlHighlight', () => {
  it('renders text nodes and <mark>s, never HTML', () => {
    const w = mount(MlHighlight, { props: { text: '<b>獅</b> 碼力獅', keywords: ['獅', ''] } })
    expect(w.findAll('mark.ml-highlight__mark').map((m) => m.text())).toEqual(['獅', '獅'])
    expect(w.find('b').exists()).toBe(false)
    expect(w.text()).toBe('<b>獅</b> 碼力獅')
    expect(w.classes()).toEqual(['ml-highlight', 'ml-highlight--gold'])
  })

  it('takes a custom tag, class and tone', async () => {
    const w = mount(MlHighlight, { props: { text: 'Lion Pride', keywords: 'pride', tag: 'strong', highlightClass: 'hit', tone: 'tech' } })
    expect(w.find('strong.ml-highlight__mark.hit').text()).toBe('Pride')
    expect(w.classes()).toContain('ml-highlight--tech')
    await w.setProps({ caseSensitive: true })
    expect(w.find('strong').exists()).toBe(false)
  })
})

describe('toggle-group logic', () => {
  const options = [{ value: 'b' }, { value: 'i' }, { value: 'u' }]

  it('single mode presses, switches and releases', () => {
    expect(nextToggleValue(null, 'b')).toBe('b')
    expect(nextToggleValue('b', 'i')).toBe('i')
    expect(nextToggleValue('b', 'b')).toBe(null)
    expect(nextToggleValue('b', 'b', { allowEmpty: false })).toBeUndefined()
  })

  it('multiple mode keeps the options order', () => {
    expect(nextToggleValue([], 'u', { multiple: true, options })).toEqual(['u'])
    expect(nextToggleValue(['u'], 'b', { multiple: true, options })).toEqual(['b', 'u'])
    expect(nextToggleValue(['b', 'u'], 'b', { multiple: true, options })).toEqual(['u'])
    expect(nextToggleValue(['u'], 'u', { multiple: true, options, allowEmpty: false })).toBeUndefined()
    expect(nextToggleValue(['zz'], 'i', { multiple: true, options })).toEqual(['i', 'zz'])
  })

  it('reads any model shape and moves the roving tab stop', () => {
    expect(toggleSelection(undefined)).toEqual([])
    expect(toggleSelection(0)).toEqual([0])
    expect(toggleFocusTarget('ArrowRight', 2, 3)).toBe(0)
    expect(toggleFocusTarget('ArrowUp', 0, 3)).toBe(2)
    expect(toggleFocusTarget('End', 0, 3)).toBe(2)
    expect(toggleFocusTarget('a', 0, 3)).toBe(-1)
    expect(toggleTabStop(['a', 'b'], ['b'], undefined)).toBe('b')
    expect(toggleTabStop(['a', 'b'], ['b'], 'a')).toBe('a')
    expect(toggleTabStop(['a', 'b'], ['x'], 'x')).toBe('a')
  })
})

describe('MlToggleGroup', () => {
  const options = [
    { value: 'bold', label: '粗體' },
    { value: 'italic', label: '斜體' },
    { value: 'strike', icon: 'close' as const, title: '刪除線' },
    { value: 'code', label: '程式碼', disabled: true },
  ]

  it('single mode can release the pressed item', async () => {
    const model = ref<string | null>('bold')
    const w = mount(() => h(MlToggleGroup, { options, label: '文字樣式', modelValue: model.value, 'onUpdate:modelValue': (v: unknown) => (model.value = v as string | null) }))
    const items = w.findAll('button')
    expect(w.find('[role=group]').attributes('aria-label')).toBe('文字樣式')
    expect(items.map((b) => b.attributes('aria-pressed'))).toEqual(['true', 'false', 'false', 'false'])
    expect(items[2].attributes('aria-label')).toBe('刪除線')
    await items[1].trigger('click')
    expect(model.value).toBe('italic')
    await items[1].trigger('click')
    expect(model.value).toBe(null)
    await items[3].trigger('click')
    expect(model.value).toBe(null)
  })

  it('multiple mode toggles an array and emits change', async () => {
    const w = mount(MlToggleGroup, { props: { options, multiple: true, modelValue: ['italic'] } })
    await w.findAll('button')[0].trigger('click')
    expect(w.emitted('update:modelValue')![0]).toEqual([['bold', 'italic']])
    expect(w.emitted('change')![0]).toEqual([['bold', 'italic']])
  })

  it('arrow keys move one roving tab stop past disabled items', async () => {
    const w = mount(MlToggleGroup, { props: { options, modelValue: 'italic' }, attachTo: document.body })
    const tabs = () => w.findAll('button').map((b) => b.attributes('tabindex'))
    expect(tabs()).toEqual(['-1', '0', '-1', '-1'])
    await w.find('[role=group]').trigger('keydown', { key: 'ArrowRight' })
    expect(document.activeElement).toBe(w.findAll('button')[2].element)
    expect(tabs()).toEqual(['-1', '-1', '0', '-1'])
    await w.find('[role=group]').trigger('keydown', { key: 'ArrowRight' })
    expect(document.activeElement).toBe(w.findAll('button')[0].element)
    expect(w.emitted('update:modelValue')).toBeUndefined()
    w.unmount()
  })

  it('allowEmpty false keeps one pressed; disabled stops everything', async () => {
    const w = mount(MlToggleGroup, { props: { options, modelValue: 'bold', allowEmpty: false } })
    await w.findAll('button')[0].trigger('click')
    expect(w.emitted('update:modelValue')).toBeUndefined()
    await w.setProps({ disabled: true })
    expect(w.classes()).toContain('ml-toggle-group--disabled')
    expect(w.findAll('button').every((b) => b.attributes('disabled') !== undefined)).toBe(true)
  })
})

describe('MlButtonGroup', () => {
  it('hands size, variant and disabled to buttons that do not set their own', async () => {
    const disabled = ref(false)
    const w = mount(() =>
      h(MlButtonGroup, { size: 'sm', variant: 'outline', label: '對齊', vertical: true, disabled: disabled.value }, () => [
        h(MlButton, null, () => '左'),
        h(MlButton, { variant: 'primary', size: 'lg' }, () => '中'),
      ]),
    )
    const root = w.find('.ml-btn-group')
    expect(root.attributes('role')).toBe('group')
    expect(root.attributes('aria-label')).toBe('對齊')
    expect(root.classes()).toContain('ml-btn-group--vertical')
    const [a, b] = w.findAll('button')
    expect(a.classes()).toEqual(expect.arrayContaining(['ml-btn--outline', 'ml-btn--sm']))
    expect(b.classes()).toEqual(expect.arrayContaining(['ml-btn--primary', 'ml-btn--lg']))
    disabled.value = true
    await nextTick()
    expect(w.findAll('button').every((x) => x.attributes('disabled') !== undefined)).toBe(true)
  })

  it('leaves buttons outside a group on their defaults', () => {
    const w = mount(MlButton, { slots: { default: 'Go' } })
    expect(w.classes()).toEqual(expect.arrayContaining(['ml-btn--primary', 'ml-btn--md']))
  })
})
