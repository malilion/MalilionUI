// Taiwan extras: bank codes (MlBankPicker), 農曆 / 節氣 / 國定假日 (MlLunarCalendar) and
// 統一發票對獎 (MlInvoiceChecker) — the framework-free data first, then the Vue components.
import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick, reactive } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import {
  MlBankPicker,
  MlConfigProvider,
  MlForm,
  MlFormItem,
  MlInvoiceChecker,
  MlLunarCalendar,
  en,
  formatTwBank,
  formatTwBankAccount,
  getTwBank,
  getTwBanks,
  isKnownTwBankCode,
  isTwBankAccount,
  searchTwBanks,
  twBankCodeRule,
  twRules,
  validateValue,
  checkInvoice,
  parseInvoiceNumber,
  quickCheckInvoice,
  fromLunar,
  ganZhiYear,
  lunarLeapMonth,
  solarTermOn,
  solarTerms,
  toLunar,
  twHolidays,
  type MlInvoiceDraw,
} from '../src'
import { bankAccountInput } from '../src/components/bank'
import { lunarCells, lunarHolidayMap } from '../src/components/lunar-calendar'

let wrapper: VueWrapper | undefined
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  document.body.innerHTML = ''
})

const ymd = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/* ── Bank codes ─────────────────────────────────────────── */
describe('tw-banks', () => {
  it('has the domestic banks, 郵局 and the internet-only banks', () => {
    expect(getTwBank('822')?.name).toBe('中國信託商業銀行')
    expect(getTwBank(700)?.short).toBe('中華郵政')
    expect(getTwBank('004')?.name).toBe('臺灣銀行')
    for (const code of ['823', '824', '826']) expect(getTwBank(code)?.kind).toBe('bank')
    expect(getTwBank('013')?.en).toBe('Cathay United Bank')
    expect(getTwBank('999')).toBeUndefined()
    // Codes are unique and sorted.
    const codes = getTwBanks({ kinds: ['bank', 'foreign', 'coop', 'post', 'epay'] }).map((b) => b.code)
    expect(new Set(codes).size).toBe(codes.length)
    expect([...codes].sort()).toEqual(codes)
  })

  it('e-payment institutions are opt-in', () => {
    expect(getTwBanks().some((b) => b.code === '396')).toBe(false)
    expect(getTwBanks({ kinds: ['epay'] }).map((b) => b.code)).toContain('396')
    expect(isKnownTwBankCode('396')).toBe(true)
    expect(isKnownTwBankCode('396', { kinds: ['bank'] })).toBe(false)
  })

  it('searches by code, Chinese (台 / 臺), English and abbreviations', () => {
    expect(searchTwBanks('822')[0].code).toBe('822')
    expect(searchTwBanks('82').map((b) => b.code)).toEqual(expect.arrayContaining(['822', '823', '824', '826']))
    expect(searchTwBanks('中信')[0].code).toBe('822')
    expect(searchTwBanks('國泰')[0].code).toBe('013')
    expect(searchTwBanks('cathay')[0].code).toBe('013')
    expect(searchTwBanks('CTBC')[0].code).toBe('822')
    expect(searchTwBanks('郵局')[0].code).toBe('700')
    expect(searchTwBanks('台灣銀行')[0].code).toBe('004')
    expect(searchTwBanks('臺北富邦')[0].code).toBe('012')
    expect(searchTwBanks('line')[0].code).toBe('824')
    expect(searchTwBanks('')).toEqual([])
    expect(searchTwBanks('zzz')).toEqual([])
  })

  it('formats names and grouped account numbers', () => {
    const ctbc = getTwBank('822')!
    expect(formatTwBank(ctbc)).toBe('822 中國信託商業銀行')
    expect(formatTwBank(ctbc, { short: true })).toBe('822 中國信託')
    expect(formatTwBank(ctbc, { lang: 'en' })).toBe('822 CTBC Bank')
    expect(formatTwBank(getTwBank('114')!, { lang: 'en' })).toBe('114 基隆第一信用合作社')
    expect(formatTwBankAccount('12345678901234')).toBe('1234 5678 9012 34')
    expect(formatTwBankAccount('１２３４-５６７８')).toBe('1234 5678')
  })

  it('account input keeps the caret after the same digit', () => {
    expect(bankAccountInput('12345', 5, 16)).toEqual({ digits: '12345', display: '1234 5', caret: 6 })
    // A digit typed in the middle of 「1234 5678」 (caret after it).
    expect(bankAccountInput('12934 5678', 3, 16)).toEqual({ digits: '129345678', display: '1293 4567 8', caret: 3 })
    expect(bankAccountInput('1234567890123456789', 19, 16).digits).toHaveLength(16)
    expect(bankAccountInput('abc', 3, 16)).toEqual({ digits: '', display: '', caret: 0 })
  })

  it('form rules: account shape and known bank codes', async () => {
    expect(isTwBankAccount('1234 5678 9012')).toBe(true)
    expect(isTwBankAccount('123456789')).toBe(false)
    expect(isTwBankAccount('12345678', { min: 8 })).toBe(true)
    expect(isTwBankAccount('1234abcd5678')).toBe(false)
    expect(await validateValue('12345', [twRules.bankAccount()])).toBe('帳號格式不正確')
    expect(await validateValue('', [twRules.bankAccount()])).toBeUndefined()
    expect(await validateValue('999', [twBankCodeRule()])).toBe('查無此銀行代碼')
    expect(await validateValue('822', [twBankCodeRule()])).toBeUndefined()
    expect(await validateValue('82', [twBankCodeRule()])).toBe('查無此銀行代碼')
  })
})

/* ── Lunar calendar ─────────────────────────────────────── */

// 正月初一 (MMDD) of every lunar year 1900–2100 and every 閏月, from lunar-javascript (壽星天文曆).
const NEW_YEARS =
  '013102190208012902160204012502130202012202100130021802060126021402030123021102010220020801280216020501240213020201230210013002170206012602140204012402110131021902080127021502050125021302020122021001290217020601270214020301240212013102180208012802150205012502130202012102090130021702060127021502030123021101310218020701280216020501250213020202200209012902170206012702150204012302100131021902070128021602050124021202010122020901290218020701260214020301230210013102190208012802160205012502120201012202100129021702060126021302030123021101310219020801280215020401240212020101220210013002170206012602140202012302110201021902080128021502040124021202020121020901290217020501260214020301230211013102190207012702150205012402120202012202090129021702060126021402030124021001300218020701270215020501250212020101210209'
const LEAPS =
  '1900:8 1903:5 1906:4 1909:2 1911:6 1914:5 1917:2 1919:7 1922:5 1925:4 1928:2 1930:6 1933:5 1936:3 1938:7 1941:6 1944:4 1947:2 1949:7 1952:5 1955:3 1957:8 1960:6 1963:4 1966:3 1968:7 1971:5 1974:4 1976:8 1979:6 1982:4 1984:10 1987:6 1990:5 1993:3 1995:8 1998:5 2001:4 2004:2 2006:7 2009:5 2012:4 2014:9 2017:6 2020:4 2023:2 2025:6 2028:5 2031:3 2033:11 2036:6 2039:5 2042:2 2044:7 2047:5 2050:3 2052:8 2055:6 2058:4 2061:3 2063:7 2066:5 2069:4 2071:8 2074:6 2077:4 2080:3 2082:7 2085:5 2088:4 2090:8 2093:6 2096:4 2099:2'
const SAMPLES =
  '1900-02-03=1900/1/4 2084-02-10=2084/1/5 1957-11-22=1957/10/1 1942-03-02=1942/1/16 2045-11-10=2045/10/2 2006-07-22=2006/6/27 1965-11-25=1965/11/3 2050-05-23=2050/4/3 2050-12-30=2050/11/17 2008-07-31=2008/6/29 2036-11-22=2036/10/5 2027-03-07=2027/1/30 2063-04-29=2063/4/2 1948-06-14=1948/5/8 1974-11-17=1974/10/4 2041-07-26=2041/6/29 2039-08-07=2039/6/18 1910-11-08=1910/10/7 2036-10-09=2036/8/20 1993-08-07=1993/6/20 2084-06-09=2084/5/7 2061-06-15=2061/4/28 1924-08-20=1924/7/20 2002-08-17=2002/7/9 2084-08-04=2084/7/3 2037-09-09=2037/7/30 2028-09-30=2028/8/12 2015-06-29=2015/5/14 2082-05-11=2082/4/14 2081-08-17=2081/7/13 1974-06-25=1974/5/6 1967-02-12=1967/1/4 2067-05-28=2067/4/16 1966-06-28=1966/5/10 1930-07-30=1930/-6/5 1959-07-28=1959/6/23 1985-09-20=1985/8/6 1959-01-07=1958/11/28 2087-05-30=2087/4/28 2011-06-26=2011/5/25 2045-11-02=2045/9/24 2075-07-15=2075/6/3 1911-10-20=1911/8/29 1954-09-29=1954/9/3 2012-02-18=2012/1/27 2001-10-10=2001/8/24 1984-04-25=1984/3/25 1938-08-25=1938/-7/1 2081-10-02=2081/8/30 1911-01-20=1910/12/20 1973-02-15=1973/1/13 1968-11-10=1968/9/20 2032-11-16=2032/10/14 2084-10-29=2084/10/1 2002-12-26=2002/11/23 1933-03-04=1933/2/9 1981-02-25=1981/1/21 1956-10-06=1956/9/3 1972-12-04=1972/10/29 1984-10-25=1984/10/2'

describe('tw-calendar: 農曆', () => {
  it('known 正月初一 and 生肖', () => {
    expect(toLunar(ymd('2024-02-10'))).toMatchObject({ year: 2024, month: 1, day: 1, leap: false, ganZhi: '甲辰', zodiac: '龍', monthName: '正月', dayName: '初一' })
    expect(toLunar(ymd('2025-01-29'))).toMatchObject({ year: 2025, month: 1, day: 1, ganZhi: '乙巳', zodiac: '蛇' })
    expect(toLunar(ymd('2026-02-17'))).toMatchObject({ year: 2026, month: 1, day: 1, ganZhi: '丙午', zodiac: '馬' })
    // The day before is still the old year: 除夕 2026 = 乙巳年十二月廿九 (a short month).
    expect(toLunar(ymd('2026-02-16'))).toMatchObject({ year: 2025, month: 12, day: 29, dayName: '廿九', ganZhi: '乙巳' })
  })

  it('2023 had 閏二月, 2025 閏六月', () => {
    expect(lunarLeapMonth(2023)).toBe(2)
    expect(toLunar(ymd('2023-03-22'))).toMatchObject({ month: 2, day: 1, leap: true, monthName: '閏二月' })
    expect(toLunar(ymd('2023-04-20'))).toMatchObject({ month: 3, day: 1, leap: false })
    expect(lunarLeapMonth(2025)).toBe(6)
    expect(fromLunar(2025, 6, 1, true)).toEqual(ymd('2025-07-25'))
    expect(fromLunar(2024, 6, 1, true)).toBeNull()
  })

  it('every 正月初一 and 閏月 1900–2100 matches the reference', () => {
    for (let y = 1900; y <= 2100; y++) {
      const mmdd = NEW_YEARS.slice((y - 1900) * 4, (y - 1900) * 4 + 4)
      const d = new Date(y, Number(mmdd.slice(0, 2)) - 1, Number(mmdd.slice(2)))
      expect(key(fromLunar(y, 1, 1)!), String(y)).toBe(key(d))
      expect(toLunar(d)).toMatchObject({ year: y, month: 1, day: 1 })
    }
    const leaps = Object.fromEntries(LEAPS.split(' ').map((s) => s.split(':').map(Number)))
    for (let y = 1900; y <= 2100; y++) expect(lunarLeapMonth(y), String(y)).toBe(leaps[y] ?? 0)
  })

  it('random days match the reference and round-trip', () => {
    for (const s of SAMPLES.split(' ')) {
      const [date, ans] = s.split('=')
      const [y, m, d] = ans.split('/').map(Number)
      const l = toLunar(ymd(date))!
      expect([l.year, l.leap ? -l.month : l.month, l.day], date).toEqual([y, m, d])
      expect(key(fromLunar(l.year, l.month, l.day, l.leap)!)).toBe(date)
    }
  })

  it('range and 干支', () => {
    expect(toLunar(ymd('1900-01-30'))).toBeNull()
    expect(toLunar(ymd('1900-01-31'))).toMatchObject({ year: 1900, month: 1, day: 1, ganZhi: '庚子' })
    expect(toLunar(ymd('2100-12-31'))).toMatchObject({ year: 2100 })
    expect(toLunar(ymd('2101-01-01'))).toBeNull()
    expect(ganZhiYear(1984)).toBe('甲子')
    expect(ganZhiYear(2044)).toBe('甲子')
  })
})

describe('tw-calendar: 節氣', () => {
  const rows: Record<number, string> = {
    1900: '6,20,4,19,6,21,5,20,6,21,6,22,7,23,8,23,8,23,9,24,8,23,7,22',
    // 1979 大寒 falls at 23:59 on 1/20 (UTC+8).
    1979: '6,20,4,19,6,21,5,21,6,21,6,22,8,23,8,24,8,23,9,24,8,23,8,22',
    2000: '6,21,4,19,5,20,4,20,5,21,5,21,7,22,7,23,7,23,8,23,7,22,7,21',
    2024: '6,20,4,19,5,20,4,19,5,20,5,21,6,22,7,22,7,22,8,23,7,22,6,21',
    2025: '5,20,3,18,5,20,4,20,5,21,5,21,7,22,7,23,7,23,8,23,7,22,7,21',
    2100: '5,20,4,18,5,20,5,20,5,21,5,21,7,23,7,23,7,23,8,23,7,22,7,22',
  }
  it('whole years against astronomy-engine', () => {
    for (const [y, row] of Object.entries(rows)) {
      const terms = solarTerms(Number(y))
      expect(terms.map((t) => t.date.getDate()).join(','), y).toBe(row)
      terms.forEach((t, i) => expect(t.date.getMonth()).toBe(i >> 1))
    }
  })

  it('named days', () => {
    expect(solarTermOn(ymd('2025-02-03'))).toBe('立春')
    expect(solarTermOn(ymd('2026-04-05'))).toBe('清明')
    expect(solarTermOn(ymd('2024-04-04'))).toBe('清明')
    expect(solarTermOn(ymd('2024-12-21'))).toBe('冬至')
    expect(solarTermOn(ymd('2024-12-22'))).toBeUndefined()
    expect(solarTerms(1899)).toEqual([])
  })
})

describe('tw-calendar: 國定假日', () => {
  const offDays = (y: number) => twHolidays(y).filter((h) => h.off).map((h) => `${h.date.slice(5)} ${h.short ?? h.name}`)

  it('2026 under the 2025 紀念日及節日實施條例', () => {
    expect(offDays(2026)).toEqual([
      '01-01 元旦',
      '02-15 小年夜',
      '02-16 除夕',
      '02-17 春節',
      '02-18 初二',
      '02-19 初三',
      '02-28 二二八',
      '04-04 兒童節',
      '04-05 清明節',
      '05-01 勞動節',
      '06-19 端午節',
      '09-25 中秋節',
      '09-28 教師節',
      '10-10 國慶日',
      '10-25 光復節',
      '12-25 行憲紀念',
    ])
  })

  it("2027 matches the named days off of 人事行政總處's 116 年辦公日曆表 (補假 aside)", () => {
    expect(twHolidays(2027).filter((h) => h.off).map((h) => h.date.slice(5))).toEqual([
      '01-01', '02-04', '02-05', '02-06', '02-07', '02-08', '02-28', '04-04', '04-05', '05-01', '06-09', '09-15', '09-28', '10-10', '10-25', '12-25',
    ])
  })

  it('2024 under the old rules: 兒童節 on the 清明 Thursday moves to Friday', () => {
    expect(offDays(2024)).toEqual([
      '01-01 元旦',
      '02-09 除夕',
      '02-10 春節',
      '02-11 初二',
      '02-12 初三',
      '02-28 二二八',
      '04-04 清明節',
      '04-05 兒童節',
      '06-10 端午節',
      '09-17 中秋節',
      '10-10 國慶日',
    ])
    expect(twHolidays(2024).find((h) => h.date === '2024-05-01')).toMatchObject({ name: '勞動節', off: false })
  })

  it('2025 switches mid-year: no 勞動節 off in May, the new 紀念日 from September', () => {
    const off = offDays(2025)
    expect(off).not.toContain('05-01 勞動節')
    expect(off).toEqual(expect.arrayContaining(['09-28 教師節', '10-25 光復節', '12-25 行憲紀念']))
    expect(off).not.toContain('01-27 小年夜')
  })

  it('兒童節 on 清明 (not Thursday) moves to the day before', () => {
    // 2029: 清明 is 4/4, a Wednesday.
    expect(solarTermOn(ymd('2029-04-04'))).toBe('清明')
    expect(offDays(2029)).toEqual(expect.arrayContaining(['04-03 兒童節', '04-04 清明節']))
  })

  it('observances can be left out', () => {
    expect(twHolidays(2026).some((h) => h.name === '中元節')).toBe(true)
    expect(twHolidays(2026, { observances: false }).every((h) => h.off)).toBe(true)
  })

  it('app entries override and add', () => {
    const map = lunarHolidayMap([2026], {
      builtinHolidays: true,
      observances: true,
      holidays: { '2026-02-20': '調整放假', '2026-02-27': { name: '補假', off: true }, '2026-01-01': { off: false } },
    })
    expect(map.get('2026-02-20')).toEqual({ names: ['調整放假'], off: true })
    expect(map.get('2026-02-27')).toEqual({ names: ['補假'], off: true })
    expect(map.get('2026-01-01')).toEqual({ names: ['元旦'], off: false })
    expect(lunarHolidayMap([2026], { builtinHolidays: false, observances: true }).size).toBe(0)
  })

  it('cells: labels prefer holiday > 節氣 > 農曆, 初一 shows the month', () => {
    const cells = lunarCells(2026, 1, {
      weekStartsOn: 0,
      showLunar: true,
      showSolarTerms: true,
      showHolidays: true,
      builtinHolidays: true,
      observances: true,
      holidays: { '2026-02-21': { name: '補行上班', off: false } },
    })
    const at = (s: string) => cells.find((c) => c.key === s)!
    expect(at('2026-02-17')).toMatchObject({ label: '春節', labelKind: 'holiday', info: { off: true } })
    expect(at('2026-02-04')).toMatchObject({ label: '立春', labelKind: 'term' })
    expect(at('2026-02-10')).toMatchObject({ label: '廿三', labelKind: 'day' })
    const march = lunarCells(2026, 2, { weekStartsOn: 1, showLunar: true, showSolarTerms: true, showHolidays: false, builtinHolidays: true, observances: true })
    expect(march.find((c) => c.key === '2026-03-19')).toMatchObject({ label: '二月', labelKind: 'month' })
    expect(march[0].key).toBe('2026-02-23') // a Monday
    expect(at('2026-02-21')).toMatchObject({ weekend: true, info: { workday: true, off: false } })
  })
})

/* ── Invoice ────────────────────────────────────────────── */

// 財政部 115 年 7–8 月 統一發票中獎號碼 (https://invoice.etax.nat.gov.tw/).
const draw: MlInvoiceDraw = { period: '115年 7–8月', special: '89996565', grand: '91098182', first: ['54348835', '44991397', '06595111'] }
const older: MlInvoiceDraw = { period: '舊期', special: '12345678', grand: ['22222222'], first: ['33333333'], extraSixth: ['456', '789'] }

describe('invoice rules', () => {
  it('full numbers: every tier, the highest wins', () => {
    const tier = (n: string, d = draw) => [checkInvoice(n, d).tier, checkInvoice(n, d).amount]
    expect(tier('89996565')).toEqual(['special', 10_000_000])
    expect(tier('91098182')).toEqual(['grand', 2_000_000])
    expect(tier('54348835')).toEqual(['first', 200_000])
    expect(tier('14348835')).toEqual(['second', 40_000])
    expect(tier('10348835')).toEqual(['third', 10_000])
    expect(tier('10048835')).toEqual(['fourth', 4_000])
    expect(tier('10008835')).toEqual(['fifth', 1_000])
    expect(tier('10000835')).toEqual(['sixth', 200])
    expect(tier('10000565')).toEqual([null, 0]) // 特別獎 needs all 8 digits
    expect(tier('AB-06595111')).toEqual(['first', 200_000])
    expect(tier('11111456', older)).toEqual(['extraSixth', 200])
    expect(checkInvoice('10000835', draw)).toMatchObject({ status: 'win', candidates: [{ tier: 'first', number: '54348835' }] })
    expect(checkInvoice('1234', draw).status).toBe('none')
  })

  it('末三碼: none / maybe with the numbers to check / sure 增開六獎', () => {
    expect(quickCheckInvoice('000', draw)).toMatchObject({ status: 'none', candidates: [] })
    expect(quickCheckInvoice('835', draw)).toMatchObject({ status: 'maybe', amount: 200, candidates: [{ tier: 'first', number: '54348835' }] })
    expect(quickCheckInvoice('565', draw)).toMatchObject({ status: 'maybe', amount: 0, candidates: [{ tier: 'special', number: '89996565' }] })
    expect(quickCheckInvoice('789', older)).toMatchObject({ status: 'win', tier: 'extraSixth', amount: 200 })
  })

  it('parses invoice numbers', () => {
    expect(parseInvoiceNumber('AB-12345678')).toEqual({ track: 'AB', number: '12345678' })
    expect(parseInvoiceNumber('ab 1234 5678')).toEqual({ track: 'AB', number: '12345678' })
    expect(parseInvoiceNumber('ＡＢ１２３４５６７８')).toEqual({ track: 'AB', number: '12345678' })
    expect(parseInvoiceNumber('12345678')).toEqual({ track: '', number: '12345678' })
    expect(parseInvoiceNumber('A12345678')).toBeNull()
    expect(parseInvoiceNumber('1234567')).toBeNull()
  })
})

/* ── Vue components ─────────────────────────────────────── */
describe('MlBankPicker', () => {
  it('search and pick a bank', async () => {
    wrapper = mount(MlBankPicker, { props: { label: '銀行' }, attachTo: document.body })
    const input = wrapper.find('input.ml-combobox__search')
    await input.setValue('中信')
    const options = wrapper.findAll('[role="option"]')
    expect(options.map((o) => o.text())).toEqual(['822 中國信託商業銀行'])
    await options[0].trigger('click')
    expect(wrapper.emitted('update:value')![0]).toEqual(['822'])
    expect(wrapper.emitted('change')![0][1]).toMatchObject({ code: '822', short: '中國信託' })
  })

  it('English names follow the locale; short names on request', async () => {
    wrapper = mount(() => h(MlConfigProvider, { locale: en }, () => h(MlBankPicker, { value: '013' })))
    expect((wrapper.find('input.ml-combobox__search').element as HTMLInputElement).value).toBe('013 Cathay United Bank')
    wrapper.unmount()
    wrapper = mount(MlBankPicker, { props: { value: '013', short: true } })
    expect((wrapper.find('input.ml-combobox__search').element as HTMLInputElement).value).toBe('013 國泰世華')
  })

  it('account field: digits only, grouped, with a length hint', async () => {
    wrapper = mount(MlBankPicker, { props: { withAccount: true, value: '700', accountName: 'acct' } })
    const field = wrapper.find('.ml-bank-picker__account-input')
    await field.setValue('0012-3456 7890 12')
    expect(wrapper.emitted('update:account')!.at(-1)).toEqual(['00123456789012'])
    await wrapper.setProps({ account: '00123456789012' })
    expect((field.element as HTMLInputElement).value).toBe('0012 3456 7890 12')
    expect(wrapper.find('.ml-bank-picker__account .ml-field__hint').text()).toContain('14')
    expect((wrapper.find('input[type="hidden"][name="acct"]').element as HTMLInputElement).value).toBe('00123456789012')
    expect(wrapper.find('.ml-bank-picker .ml-field__label').text()).toBe('銀行')
  })

  it('works inside MlForm / MlFormItem', async () => {
    const model = reactive({ bank: null as string | null })
    wrapper = mount(
      () =>
        h(MlForm, { model, rules: { bank: [{ required: true }, twBankCodeRule()] } }, () =>
          h(MlFormItem, { prop: 'bank' }, () => h(MlBankPicker, { value: model.bank, 'onUpdate:value': (v: string | null) => (model.bank = v), label: '收款銀行' })),
        ),
      { attachTo: document.body },
    )
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.find('.ml-field__error').text()).toContain('此欄位為必填')
    model.bank = '808'
    await flushPromises()
    await nextTick()
    expect(wrapper.find('.ml-field__error').exists()).toBe(false)
  })
})

describe('MlLunarCalendar', () => {
  it('shows 農曆, 節氣, holidays and the 干支 year', () => {
    wrapper = mount(MlLunarCalendar, { props: { today: ymd('2026-02-17') } })
    expect(wrapper.find('.ml-lunar-cal__year').text()).toBe('乙巳年（蛇） / 丙午年（馬）')
    const day = (k: string) => wrapper!.find(`[data-day="${k}"]`)
    expect(day('2026-02-17').classes()).toEqual(expect.arrayContaining(['ml-lunar-cal__day--today', 'ml-lunar-cal__day--off']))
    expect(day('2026-02-17').find('.ml-lunar-cal__label').text()).toBe('春節')
    expect(day('2026-02-16').find('.ml-lunar-cal__label').text()).toBe('除夕')
    expect(day('2026-02-04').find('.ml-lunar-cal__label').classes()).toContain('ml-lunar-cal__label--term')
    expect(day('2026-02-10').find('.ml-lunar-cal__label').text()).toBe('廿三')
    expect(day('2026-02-17').attributes('aria-label')).toContain('農曆正月初一，春節（放假）')
    expect(day('2026-02-14').classes()).toContain('ml-lunar-cal__day--weekend')
  })

  it('holidays prop adds days off and working Saturdays; toggles hide labels', async () => {
    wrapper = mount(MlLunarCalendar, {
      props: { today: ymd('2026-02-01'), holidays: { '2026-02-20': '調整放假', '2026-02-07': { name: '補行上班', off: false } } },
    })
    const day = (k: string) => wrapper!.find(`[data-day="${k}"]`)
    expect(day('2026-02-20').classes()).toContain('ml-lunar-cal__day--off')
    expect(day('2026-02-20').text()).toContain('調整放假')
    expect(day('2026-02-07').classes()).toContain('ml-lunar-cal__day--workday')
    await wrapper.setProps({ showHolidays: false, showSolarTerms: false, showLunar: false })
    expect(wrapper.findAll('.ml-lunar-cal__label')).toHaveLength(0)
    expect(day('2026-02-17').classes()).not.toContain('ml-lunar-cal__day--off')
  })

  it('keyboard moves and selects; months change', async () => {
    wrapper = mount(MlLunarCalendar, { props: { today: ymd('2026-02-27') }, attachTo: document.body })
    const grid = wrapper.find('[role="grid"]')
    await grid.trigger('keydown', { key: 'ArrowRight' })
    await grid.trigger('keydown', { key: 'ArrowRight' })
    await nextTick()
    expect(wrapper.find('.ml-lunar-cal__title').text()).toContain('3')
    expect(wrapper.emitted('month-change')![0]).toEqual([2026, 2])
    await grid.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update:modelValue')![0][0]).toEqual(ymd('2026-03-01'))
    expect(wrapper.emitted('select')![0][1]).toMatchObject({ key: '2026-03-01', lunar: { month: 1, day: 13 } })
    await wrapper.findAll('.ml-lunar-cal__nav')[0].trigger('click')
    expect(wrapper.find('[data-day="2026-02-01"]').exists()).toBe(true)
  })
})

describe('MlInvoiceChecker', () => {
  const draws: MlInvoiceDraw[] = [
    draw,
    { period: '115年 5–6月', special: '38548029', grand: '10138845', first: ['24121106', '28589937', '83663333'] },
  ]
  const type = async (w: VueWrapper, digits: string) => {
    await w.find('.ml-pin__box').setValue(digits)
    await flushPromises()
  }

  it('末三碼: maybe, then none, with history', async () => {
    wrapper = mount(MlInvoiceChecker, { props: { draws }, attachTo: document.body })
    expect(wrapper.find('.ml-invoice__message').text()).toBe('輸入號碼後馬上對獎')
    expect(wrapper.findAll('.ml-pin__box')).toHaveLength(3)
    await type(wrapper, '835')
    expect(wrapper.find('.ml-invoice__result').classes()).toContain('ml-invoice__result--maybe')
    expect(wrapper.find('.ml-invoice__message').text()).toBe('可能中獎，請核對完整號碼')
    expect(wrapper.find('.ml-invoice__detail').text()).toContain('200 元')
    expect(wrapper.find('.ml-invoice__candidate').text()).toBe('頭獎54348835')
    expect(wrapper.find('.ml-invoice__hit').text()).toBe('835')
    expect(wrapper.emitted('check')![0][0]).toMatchObject({ mode: 'quick', status: 'maybe' })
    // The boxes are emptied for the next number.
    expect((wrapper.find('.ml-pin__box').element as HTMLInputElement).value).toBe('')
    await type(wrapper, '123')
    expect(wrapper.find('.ml-invoice__message').text()).toBe('沒中，下次再接再厲')
    expect(wrapper.findAll('.ml-invoice__log-item').map((li) => li.find('.ml-invoice__log-verdict').text())).toEqual(['沒中', '待核對'])
    await wrapper.find('.ml-invoice__clear').trigger('click')
    expect(wrapper.find('.ml-invoice__history').exists()).toBe(false)
  })

  it('full number: a win with the prize, highlighted digits and trophy', async () => {
    wrapper = mount(MlInvoiceChecker, { props: { draws, mode: 'full' }, attachTo: document.body })
    expect(wrapper.findAll('.ml-pin__box')).toHaveLength(8)
    await type(wrapper, '14348835')
    expect(wrapper.find('.ml-invoice__result').classes()).toContain('ml-invoice__result--win')
    expect(wrapper.find('.ml-invoice__message').text()).toBe('恭喜中二獎！獎金 4 萬元')
    expect(wrapper.find('.ml-invoice__badge').exists()).toBe(true)
    expect(wrapper.find('.ml-invoice__row--first .ml-invoice__hit').text()).toBe('4348835')
    expect(wrapper.find('.ml-invoice__log-verdict').text()).toBe('二獎 4 萬元')
  })

  it('mode switch, period switch, exposed check()', async () => {
    wrapper = mount(MlInvoiceChecker, { props: { draws }, attachTo: document.body })
    const radios = wrapper.findAll('[role="radio"]')
    await radios[0].trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.emitted('update:mode')![0]).toEqual(['full'])
    await wrapper.setProps({ mode: 'full' })
    await wrapper.find('select').setValue('115年 5–6月')
    expect(wrapper.emitted('update:period')![0]).toEqual(['115年 5–6月'])
    await wrapper.setProps({ period: '115年 5–6月' })
    const vm = wrapper.vm as unknown as { check: (n: string) => { tier: string } | null }
    expect(vm.check('38548029')?.tier).toBe('special')
    await nextTick()
    expect(wrapper.find('.ml-invoice__message').text()).toBe('恭喜中特別獎！獎金 1,000 萬元')
  })

  it('no draws', () => {
    wrapper = mount(MlInvoiceChecker, { props: { draws: [] } })
    expect(wrapper.find('.ml-invoice__empty').text()).toBe('尚未提供中獎號碼')
    expect(wrapper.find('.ml-pin').exists()).toBe(false)
  })
})
