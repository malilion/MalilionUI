// AvatarGroup, Typography (Title / Text / Link), Barcode and 民國 dates.
import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import {
  MlAvatarGroup,
  MlBarcode,
  MlCalendar,
  MlDatePicker,
  MlDateRangePicker,
  MlLink,
  MlText,
  MlTitle,
  barcodeLayout,
  ean13CheckDigit,
  encodeBarcode,
  formatRocDate,
  parseRocDate,
  splitAvatars,
  toRocYear,
} from '../src'
import { CODE128_PATTERNS, CODE39_PATTERNS, code128Symbols } from '../src/barcode'
import { hiddenNames } from '../src/components/avatar-group'
import { decadeStart, formatDecade, formatPeriod, periodPage, yearCellText } from '../src/components/dates'
import { zhTW, en } from '../src/locale-data'

let wrapper: VueWrapper | undefined
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
})

/* ── Barcode encoders ─────────────────────────────────── */

/** Expand runs back to a 0/1 module string. */
const bits = (runs: number[]) => runs.map((w, i) => (i % 2 ? '0' : '1').repeat(w)).join('')

describe('Code 128', () => {
  it('has 106 well-formed symbols (11 modules, even bar total)', () => {
    expect(CODE128_PATTERNS).toHaveLength(106)
    expect(new Set(CODE128_PATTERNS).size).toBe(106)
    for (const p of CODE128_PATTERNS) {
      const w = p.split('').map(Number)
      expect(w.reduce((a, b) => a + b)).toBe(11)
      expect((w[0] + w[2] + w[4]) % 2).toBe(0)
    }
  })

  it('uses set B for text and checks with the weighted mod-103 sum', () => {
    // Start B, the letters, then check: (104 + 55·1 + 73·2 + … + 65·9) mod 103 = 88.
    expect(code128Symbols('Wikipedia')).toEqual([104, 55, 73, 75, 73, 80, 69, 68, 73, 65, 88])
  })

  it('packs digit runs into set C', () => {
    expect(code128Symbols('1234567890')).toEqual([105, 12, 34, 56, 78, 90, 85])
    // Odd run: first digit in B, the rest paired in C.
    expect(code128Symbols('12345').slice(0, 4)).toEqual([104, 17, 99, 23])
    // A short run in the middle stays in B.
    expect(code128Symbols('AB12345CD')[0]).toBe(104)
    expect(code128Symbols('AB12345CD')).not.toContain(99)
    // A long run in the middle switches to C and back.
    const mixed = code128Symbols('AB123456CD')
    expect(mixed).toContain(99)
    expect(mixed).toContain(100)
  })

  it('ends with the stop pattern and rejects non-ASCII', () => {
    const enc = encodeBarcode('ABC')
    expect(bits(enc.runs).endsWith('1100011101011')).toBe(true)
    expect(enc.width).toBe(11 * 5 + 13)
    expect(() => encodeBarcode('中文')).toThrow(RangeError)
    expect(() => encodeBarcode('')).toThrow(RangeError)
  })
})

describe('Code 39', () => {
  it('follows the symbology structure (2 wide bars + 1 wide space, or 3 wide spaces)', () => {
    const groups = ['1AKU', '2BLV', '3CMW', '4DNX', '5EOY', '6FPZ', '7GQ-', '8HR.', '9IS ', '0JT*']
    for (const g of groups) {
      const bars = [...g].map((c) => [0, 2, 4, 6, 8].map((i) => CODE39_PATTERNS[c][i]).join(''))
      expect(new Set(bars).size).toBe(1)
      expect(bars[0].replace(/n/g, '')).toHaveLength(2)
      const spaces = [...g].map((c) => [1, 3, 5, 7].map((i) => CODE39_PATTERNS[c][i]).join(''))
      expect(spaces).toEqual(['nwnn', 'nnwn', 'nnnw', 'wnnn'])
    }
    for (const c of '$/+%') expect(CODE39_PATTERNS[c].replace(/n/g, '')).toBe('www')
  })

  it('encodes a 手機條碼 with * start / stop', () => {
    const enc = encodeBarcode('/abc+123', 'code39')
    expect(enc.text).toBe('/ABC+123')
    // 10 characters × (6 narrow + 3 wide × 3) + 9 gaps.
    expect(enc.width).toBe(10 * 15 + 9)
    expect(() => encodeBarcode('a*b', 'code39')).toThrow(RangeError)
    expect(() => encodeBarcode('ä', 'code39')).toThrow(RangeError)
  })
})

describe('EAN-13', () => {
  // Independent bit tables (L / G / R) to decode against.
  const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011']
  const R = L.map((p) => p.replace(/./g, (b) => (b === '0' ? '1' : '0')))
  const G = R.map((p) => p.split('').reverse().join(''))
  const PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGGL', 'LGLGLG', 'LGGLGL']

  function decode(b: string) {
    expect(b).toHaveLength(95)
    expect(b.slice(0, 3)).toBe('101')
    expect(b.slice(45, 50)).toBe('01010')
    expect(b.slice(92)).toBe('101')
    let left = ''
    let parity = ''
    for (let i = 0; i < 6; i++) {
      const chunk = b.slice(3 + i * 7, 10 + i * 7)
      const l = L.indexOf(chunk)
      left += l >= 0 ? l : G.indexOf(chunk)
      parity += l >= 0 ? 'L' : 'G'
    }
    let right = ''
    for (let i = 0; i < 6; i++) right += R.indexOf(b.slice(50 + i * 7, 57 + i * 7))
    return `${PARITY.indexOf(parity)}${left}${right}`
  }

  it('computes the check digit', () => {
    expect(ean13CheckDigit('400638133393')).toBe(1)
    expect(ean13CheckDigit('471008843012')).toBe(0)
  })

  it('round-trips through an independent decoder', () => {
    for (const code of ['4006381333931', '4710088430120', '9780201379624', '0123456789012']) {
      expect(decode(bits(encodeBarcode(code, 'ean13').runs))).toBe(code)
    }
  })

  it('adds a missing check digit and rejects a wrong one', () => {
    expect(encodeBarcode('400638133393', 'ean13').text).toBe('4006381333931')
    expect(() => encodeBarcode('4006381333932', 'ean13')).toThrow(RangeError)
    expect(() => encodeBarcode('12345', 'ean13')).toThrow(RangeError)
  })

  it('lays out the retail text and taller guard bars', () => {
    const box = barcodeLayout(encodeBarcode('4006381333931', 'ean13'), { module: 2, height: 50, margin: 10, showText: true, fontSize: 14 })
    expect(box.width).toBe(115 * 2)
    expect(box.texts.map((t) => t.text)).toEqual(['4', '006381', '333931'])
    expect(box.path).toContain('v57') // guards: 50 + 7
    expect(box.path).toContain('v50')
  })
})

describe('MlBarcode', () => {
  it('draws an accessible SVG and exposes toSVG()', () => {
    wrapper = mount(MlBarcode, { props: { value: 'MALILION' }, slots: { default: '說明' } })
    const svg = wrapper.get('svg')
    expect(svg.attributes('role')).toBe('img')
    expect(svg.attributes('aria-label')).toBe('條碼：MALILION')
    expect(wrapper.get('text').text()).toBe('MALILION')
    expect(wrapper.get('.ml-barcode__caption').text()).toBe('說明')
    expect((wrapper.vm as unknown as { toSVG(): string }).toSVG()).toContain('<path')
  })

  it('shows an error for values the format cannot hold', async () => {
    wrapper = mount(MlBarcode, { props: { value: '中文', format: 'code128' } })
    expect(wrapper.find('svg').exists()).toBe(false)
    expect(wrapper.get('[role="alert"]').text()).toBe('這個格式無法編碼此內容')
    await wrapper.setProps({ value: '/ABC+123', format: 'code39' })
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('can hide the text', () => {
    wrapper = mount(MlBarcode, { props: { value: 'A1', showText: false } })
    expect(wrapper.find('text').exists()).toBe(false)
  })
})

/* ── AvatarGroup ──────────────────────────────────────── */

const people = ['碼力獅', 'Leo', 'Nala', '小虎', 'Simba', '阿金'].map((name) => ({ name }))

describe('splitAvatars', () => {
  it('caps at max and counts the rest', () => {
    const s = splitAvatars(people, 3)
    expect(s.shown.map((p) => p.name)).toEqual(['碼力獅', 'Leo', 'Nala'])
    expect(s.more).toBe(3)
    expect(hiddenNames(s)).toBe('小虎、Simba、阿金')
    expect(hiddenNames(s, ', ')).toBe('小虎, Simba, 阿金')
  })

  it('adds people counted by total but not loaded', () => {
    const s = splitAvatars(people.slice(0, 2), undefined, 50)
    expect(s.shown).toHaveLength(2)
    expect(s.more).toBe(48)
    expect(hiddenNames(splitAvatars(people, 4, 10))).toBe('Simba、阿金…')
  })

  it('shows everyone when expanded or without max', () => {
    expect(splitAvatars(people, 3, undefined, true).more).toBe(0)
    expect(splitAvatars(people).more).toBe(0)
  })
})

describe('MlAvatarGroup', () => {
  it('renders a labelled group with a +N chip', () => {
    wrapper = mount(MlAvatarGroup, { props: { items: people, max: 4 } })
    expect(wrapper.get('[role="group"]').attributes('aria-label')).toBe('成員')
    expect(wrapper.findAll('.ml-avatar')).toHaveLength(5)
    const chip = wrapper.get('.ml-avatar-group__more')
    expect(chip.element.tagName).toBe('SPAN')
    expect(chip.attributes('aria-label')).toBe('還有 2 位')
    expect(chip.attributes('title')).toBe('Simba、阿金')
    expect(chip.text()).toBe('+2')
  })

  it('expands and collapses when expandable', async () => {
    wrapper = mount(MlAvatarGroup, { props: { items: people, max: 2, expandable: true, total: 8 } })
    const more = wrapper.get('button.ml-avatar-group__more')
    expect(more.attributes('aria-expanded')).toBe('false')
    expect(more.attributes('aria-label')).toBe('顯示其他 4 位')
    expect(more.text()).toBe('+6')
    await more.trigger('click')
    expect(wrapper.emitted('update:expanded')?.[0]).toEqual([true])
    expect(wrapper.findAll('.ml-avatar:not(.ml-avatar-group__more)')).toHaveLength(6)
    // The two people never loaded stay behind a plain chip.
    expect(wrapper.get('span.ml-avatar-group__more').text()).toBe('+2')
    await wrapper.get('.ml-avatar-group__less').trigger('click')
    expect(wrapper.findAll('.ml-avatar:not(.ml-avatar-group__more)')).toHaveLength(2)
  })

  it('stacks slot avatars when there are no items', () => {
    wrapper = mount(MlAvatarGroup, { props: { spacing: 'tight' }, slots: { default: '<span class="mine" />' } })
    expect(wrapper.find('.mine').exists()).toBe(true)
    expect(wrapper.classes()).toContain('ml-avatar-group--tight')
  })
})

/* ── Typography ───────────────────────────────────────── */

describe('MlTitle', () => {
  it('renders the heading level, or another tag at that size', () => {
    wrapper = mount(MlTitle, { props: { level: 3, accent: true }, slots: { default: '標題' } })
    expect(wrapper.element.tagName).toBe('H3')
    expect(wrapper.classes()).toEqual(expect.arrayContaining(['ml-title', 'ml-title--h3', 'ml-title--accent']))
    wrapper.unmount()
    wrapper = mount(MlTitle, { props: { level: 1, as: 'div', metal: true }, slots: { default: '金' } })
    expect(wrapper.element.tagName).toBe('DIV')
    expect(wrapper.get('.ml-title__text').text()).toBe('金')
  })
})

describe('MlText', () => {
  it('picks a semantic tag from its flags', () => {
    const tag = (props: Record<string, unknown>) => {
      const w = mount(MlText, { props, slots: { default: 'x' } })
      const name = w.element.tagName.toLowerCase()
      w.unmount()
      return name
    }
    expect(tag({})).toBe('span')
    expect(tag({ strong: true })).toBe('strong')
    expect(tag({ delete: true, strong: true })).toBe('del')
    expect(tag({ mark: true })).toBe('mark')
    expect(tag({ code: true, mark: true })).toBe('code')
    expect(tag({ code: true, as: 'p' })).toBe('p')
  })

  it('maps props to classes and clamps lines', () => {
    wrapper = mount(MlText, { props: { tone: 'danger', size: 'sm', italic: true, mono: true, ellipsis: 3 }, slots: { default: 'x' } })
    expect(wrapper.classes()).toEqual(['ml-text', 'ml-text--danger', 'ml-text--sm', 'ml-text--italic', 'ml-text--mono', 'ml-text--clamp'])
    expect(wrapper.attributes('style')).toContain('--ml-text-lines: 3')
  })

  it('copies the shown text, or the given string', async () => {
    const copied: string[] = []
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (t: string) => void copied.push(t) }, configurable: true })
    wrapper = mount(MlText, { props: { copyable: true }, slots: { default: ' ORD-42 ' }, attachTo: document.body })
    await wrapper.get('button').trigger('click')
    await flushPromises()
    wrapper.unmount()
    wrapper = mount(MlText, { props: { copyable: '24536806' }, slots: { default: '2453-6806' }, attachTo: document.body })
    await wrapper.get('button').trigger('click')
    await flushPromises()
    expect(copied).toEqual(['ORD-42', '24536806'])
  })
})

describe('MlLink', () => {
  it('opens external links safely and announces it', () => {
    wrapper = mount(MlLink, { props: { href: 'https://example.com', external: true }, slots: { default: 'GitHub' } })
    expect(wrapper.attributes('target')).toBe('_blank')
    expect(wrapper.attributes('rel')).toBe('noopener noreferrer')
    expect(wrapper.get('.ml-visually-hidden').text()).toBe('（另開新視窗）')
    expect(wrapper.find('svg[aria-hidden="true"]').exists()).toBe(true)
  })

  it('treats target=_blank as external but keeps a custom rel', () => {
    wrapper = mount(MlLink, { props: { href: '/a', target: '_blank', rel: 'noopener' } })
    expect(wrapper.attributes('rel')).toBe('noopener')
    expect(wrapper.find('.ml-link__icon').exists()).toBe(true)
  })

  it('drops script URLs and disabled hrefs', () => {
    wrapper = mount(MlLink, { props: { href: 'javascript:alert(1)' } })
    expect(wrapper.attributes('href')).toBeUndefined()
    wrapper.unmount()
    wrapper = mount(MlLink, { props: { href: '/docs', disabled: true } })
    expect(wrapper.attributes('href')).toBeUndefined()
    expect(wrapper.attributes('aria-disabled')).toBe('true')
    expect(wrapper.attributes('role')).toBe('link')
  })
})

/* ── 民國 ─────────────────────────────────────────────── */

describe('民國 helpers', () => {
  it('converts years', () => {
    expect(toRocYear(2026)).toBe(115)
    expect(yearCellText(2026, 'roc')).toBe('115')
    expect(yearCellText(1911, 'roc')).toBe('前1')
    expect(yearCellText(2026)).toBe('2026')
  })

  it('formats and parses dates', () => {
    const d = new Date(2026, 9, 4)
    expect(formatRocDate(d)).toBe('115/10/04')
    expect(formatRocDate(d, '-')).toBe('115-10-04')
    expect(formatRocDate(d, '')).toBe('1151004')
    expect(formatRocDate(new Date(2010, 11, 31), '')).toBe('0991231')
    expect(formatRocDate(new Date(1900, 0, 1))).toBe('')
    for (const s of ['115/10/04', '115-10-4', '115.10.04', '1151004', '民國115年10月4日', ' 民國 115 年 10 月 4 日 ']) {
      expect(parseRocDate(s)?.getTime(), s).toBe(d.getTime())
    }
    expect(parseRocDate('0991231')?.getFullYear()).toBe(2010)
    expect(parseRocDate('115/02/30')).toBeNull()
    expect(parseRocDate('0/01/01')).toBeNull()
    expect(parseRocDate('hello')).toBeNull()
  })

  it('pages decades by 民國 and labels periods', () => {
    expect(decadeStart(2026, 'roc')).toBe(2021) // 民國 110
    expect(periodPage(new Date(2030, 0, 1), 'year', 'roc')).toBe(2021) // 民國 119
    expect(periodPage(new Date(2031, 0, 1), 'year', 'roc')).toBe(2031) // 民國 120
    expect(formatDecade(2021, zhTW.date.period, zhTW.date.roc)).toBe('民國 110 – 119 年')
    expect(formatPeriod(new Date(2026, 9, 1), 'month', zhTW.date.period, zhTW.date.roc)).toBe('民國 115 年 10 月')
    expect(formatPeriod(new Date(2026, 9, 1), 'quarter', zhTW.date.period, zhTW.date.roc)).toBe('民國 115 年第 4 季')
    expect(formatPeriod(new Date(1911, 0, 1), 'year', zhTW.date.period, zhTW.date.roc)).toBe('民國前 1 年')
    expect(formatPeriod(new Date(2026, 0, 1), 'year', en.date.period, en.date.roc)).toBe('ROC 115')
  })
})

describe('calendar="roc"', () => {
  it('shows 民國 in the field and the calendar title', async () => {
    wrapper = mount(MlDatePicker, { props: { modelValue: new Date(2026, 9, 4), calendar: 'roc' }, attachTo: document.body })
    expect(wrapper.get('.ml-datepicker__trigger').text()).toContain('民國115/10/04')
    await wrapper.get('.ml-datepicker__trigger').trigger('click')
    await nextTick()
    expect(wrapper.get('.ml-calendar__title').text()).toBe('民國115年10月')
  })

  it('uses 民國 in the year panel', async () => {
    wrapper = mount(MlDatePicker, { props: { modelValue: new Date(2026, 0, 1), type: 'year', calendar: 'roc' }, attachTo: document.body })
    expect(wrapper.get('.ml-datepicker__trigger').text()).toBe('民國 115 年')
    await wrapper.get('.ml-datepicker__trigger').trigger('click')
    await nextTick()
    expect(wrapper.get('.ml-calendar__title').text()).toBe('民國 110 – 119 年')
    const cells = wrapper.findAll('[data-period]').map((c) => c.text())
    expect(cells[0]).toBe('109')
    expect(cells.at(-1)).toBe('120')
  })

  it('works in MlCalendar and MlDateRangePicker', () => {
    wrapper = mount(MlCalendar, { props: { modelValue: new Date(2026, 9, 4), calendar: 'roc' } })
    expect(wrapper.get('.ml-calendar__title').text()).toBe('民國115年10月')
    wrapper.unmount()
    wrapper = mount(MlDateRangePicker, { props: { modelValue: [new Date(2026, 9, 1), new Date(2026, 9, 4)], calendar: 'roc' } })
    expect(wrapper.text()).toContain('民國115/10/01')
    expect(wrapper.text()).toContain('民國115/10/04')
  })
})
