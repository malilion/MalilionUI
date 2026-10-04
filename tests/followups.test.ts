// Follow-ups to the 0.13 components: partial locales, official 辦公日曆表, 雲端發票專屬獎,
// registered banks, Sankey's ignored links and the sticker panel's theme.
import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { MlConfigProvider, MlLunarCalendar, MlPuzzle, MlSankey, MlStickerPicker, completeLocale, en, zhTW } from '../src'
import { TW_HOLIDAY_VERIFIED_FROM, TW_OFFICIAL_YEARS, twHolidays, twOfficialDays } from '../src/tw-calendar'
import { lunarHolidayMap } from '../src/components/lunar-calendar'
import { checkInvoice, invoiceDrawNumbers, quickCheckInvoice, type MlInvoiceDraw } from '../src/invoice'
import { getTwBank, getTwBanks, isKnownTwBankCode, registerTwBanks, searchTwBanks } from '../src/tw-banks'

let wrapper: VueWrapper | undefined
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
})

describe('partial locales', () => {
  it('fills missing strings from zhTW, or en for English names', () => {
    const mine = completeLocale({ name: 'zh-TW', puzzle: { shuffle: '洗牌' } })
    expect(mine.puzzle.shuffle).toBe('洗牌')
    expect(mine.puzzle.moves(2)).toBe('2 步')
    expect(mine.globe.label).toBe(zhTW.globe.label)
    const english = completeLocale({ name: 'en-GB', common: { close: 'Shut' } })
    expect(english.common.close).toBe('Shut')
    expect(english.lottery.draw).toBe(en.lottery.draw)
    // Cached, and the built-ins pass straight through.
    const input = { name: 'ja' }
    expect(completeLocale(input)).toBe(completeLocale(input))
    expect(completeLocale(en)).toBe(en)
  })

  it('MlConfigProvider accepts an old-style locale without the new keys', () => {
    const { puzzle: _drop, ...old } = zhTW
    void _drop
    wrapper = mount({ render: () => h(MlConfigProvider, { locale: { ...old, name: 'zh-TW' } }, () => h(MlPuzzle, { seed: 1 })) })
    expect(wrapper.get('.ml-puzzle__shuffle').text()).toBe('重新打亂')
  })
})

describe('official calendar (人事行政總處)', () => {
  it('ships 2024–2027 with 補假 and 補行上班', () => {
    expect(TW_OFFICIAL_YEARS).toEqual([2024, 2025, 2026, 2027])
    const y2026 = twOfficialDays(2026)!
    expect(y2026).toContainEqual({ date: '2026-02-20', name: '補假', off: true })
    expect(y2026).toContainEqual({ date: '2026-10-26', name: '補假', off: true })
    const y2025 = twOfficialDays(2025)!
    expect(y2025).toContainEqual({ date: '2025-02-08', name: '補行上班', off: false })
    // The 2025 amendment: 9/29 and 10/24 補假, 12/25 off.
    expect(y2025.map((d) => d.date)).toEqual(expect.arrayContaining(['2025-09-29', '2025-10-24', '2025-12-25']))
    expect(twOfficialDays(2030)).toBeUndefined()
  })

  it('the calendar applies it by default, keeping the shorter built-in names', () => {
    const map = lunarHolidayMap([2026], { builtinHolidays: true, official: true, observances: true })
    expect(map.get('2026-02-20')).toMatchObject({ names: ['補假'], off: true })
    expect(map.get('2026-02-18')?.names).toEqual(['初二'])
    const work = lunarHolidayMap([2025], { builtinHolidays: true, official: true, observances: true }).get('2025-02-08')
    expect(work).toMatchObject({ names: ['補行上班'], off: false })
    const without = lunarHolidayMap([2026], { builtinHolidays: true, official: false, observances: true })
    expect(without.has('2026-02-20')).toBe(false)
  })

  it('MlLunarCalendar shows the 補假 on the plate; official=false hides it', async () => {
    wrapper = mount(MlLunarCalendar, { props: { today: new Date(2026, 1, 10) } })
    expect(wrapper.text()).toContain('補假')
    await wrapper.setProps({ official: false })
    expect(wrapper.text()).not.toContain('補假')
  })

  it('built-in rules start at the verified year', () => {
    expect(TW_HOLIDAY_VERIFIED_FROM).toBe(2012)
    expect(twHolidays(2005)).toEqual([])
    expect(twHolidays(2005, { unverified: true }).length).toBeGreaterThan(5)
    expect(twHolidays(2012).length).toBeGreaterThan(5)
  })
})

describe('雲端發票專屬獎', () => {
  const draw: MlInvoiceDraw = {
    period: '測試期',
    special: '12345678',
    grand: '87654321',
    first: ['11112222', '33334444', '55556666'],
    cloud: [
      { number: 'AB-90901234', amount: 2000 },
      { number: '70700777', amount: 1_000_000 },
    ],
  }

  it('a full match wins the published amount', () => {
    expect(checkInvoice('CD90901234', draw)).toMatchObject({ status: 'win', tier: 'cloud', amount: 2000 })
    expect(checkInvoice('70700777', draw)).toMatchObject({ status: 'win', tier: 'cloud', amount: 1_000_000 })
    expect(checkInvoice('90901235', draw).status).toBe('none')
  })

  it('quick mode lists it as a number to check; the board shows it', () => {
    const q = quickCheckInvoice('234', draw)
    expect(q.status).toBe('maybe')
    expect(q.candidates).toContainEqual({ tier: 'cloud', number: '90901234', amount: 2000 })
    expect(invoiceDrawNumbers(draw).filter((c) => c.tier === 'cloud')).toHaveLength(2)
  })
})

describe('registerTwBanks', () => {
  it('adds 農會 / 漁會 with longer codes; lookups and search see them', () => {
    registerTwBanks([{ code: '6020011', name: '宜蘭縣頭城區漁會', short: '頭城漁會', aliases: ['頭城'] }])
    expect(getTwBank('6020011')).toMatchObject({ name: '宜蘭縣頭城區漁會', kind: 'farm' })
    expect(isKnownTwBankCode('6020011')).toBe(true)
    expect(searchTwBanks('頭城').map((b) => b.code)).toContain('6020011')
    expect(getTwBanks().some((b) => b.code === '6020011')).toBe(true)
    expect(getTwBanks({ kinds: ['bank'] }).some((b) => b.code === '6020011')).toBe(false)
    expect(() => registerTwBanks([{ code: '12', name: 'x' }])).toThrow()
    // A built-in code can be corrected.
    registerTwBanks([{ code: '6020011', name: '頭城區漁會', kind: 'farm' }, { code: '822', name: '中國信託商業銀行', short: '中信', kind: 'bank' }])
    expect(getTwBank('822')?.short).toBe('中信')
    expect(getTwBank('6020011')?.name).toBe('頭城區漁會')
  })
})

describe('MlSankey ignored links', () => {
  it('reports a link that would close a cycle', async () => {
    wrapper = mount(MlSankey, {
      props: {
        nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
        links: [
          { source: 'a', target: 'b', value: 5 },
          { source: 'b', target: 'a', value: 2 },
        ],
      },
    })
    await nextTick()
    expect(wrapper.emitted('ignored')).toEqual([[[{ source: 'b', target: 'a', value: 2 }]]])
    await wrapper.setProps({ links: [{ source: 'a', target: 'b', value: 5 }] })
    expect(wrapper.emitted('ignored')).toHaveLength(1)
  })
})

describe('MlStickerPicker panel theme', () => {
  it('carries the theme around the trigger onto the portalled panel', async () => {
    wrapper = mount({ render: () => h(MlConfigProvider, { theme: 'light' }, () => h(MlStickerPicker, { trigger: true })) }, { attachTo: document.body })
    await wrapper.get('.ml-sticker-picker__trigger').trigger('click')
    await nextTick()
    await nextTick()
    const panel = document.body.querySelector('.ml-sticker-picker__panel')!
    expect(panel.parentElement).toBe(document.body)
    expect(panel.getAttribute('data-ml-theme')).toBe('light')
  })
})
