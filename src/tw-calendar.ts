// 農曆、節氣與台灣國定假日 — framework-free, shared by MlLunarCalendar (Vue) and LunarCalendar
// (React). Covers Gregorian 1900-01-31 (農曆 1900 正月初一) to 2100-12-31. Nothing runs at
// import time, and the build gives this file its own chunk (vite.config.ts `manualChunks`).
//
// Lunar months — one 5-hex-digit word per lunar year 1900–2100 (the layout of the well-known
// 「lunarInfo」 table): bits 15…4 = months 1…12 have 30 days, bits 3…0 = 閏月 (0 = none),
// bit 16 = the 閏月 has 30 days. Generated from lunar-javascript 1.7 (6tail, based on 壽星天文曆,
// https://github.com/6tail/lunar-javascript) and cross-checked against jjonline/calendar.js'
// lunarInfo (https://github.com/jjonline/calendar.js): the two agree on every year except 2057,
// where the new moon falls within minutes of midnight (UTC+8) and the published tables
// disagree — this table follows lunar-javascript (and ICU): 八月 has 30 days, 九月初一 is
// 2057-09-29. Dates are for UTC+8 (中原標準時間), which is what 中央氣象署 uses.
//
// 24 節氣 — the day (UTC+8) on which the sun reaches each 15° of ecliptic longitude, from
// astronomy-engine 2.1 (VSOP87, https://github.com/cosinekitty/astronomy) and identical, for all
// 4,824 terms of 1900–2100, to lunar-javascript. Stored as a 2-bit offset per term from that
// term's earliest day. (jjonline's table differs on 6 days before 1980, all within 10 minutes
// of midnight.)
//
// Holidays — 紀念日及節日實施條例 (公布 2025-05-28 起施行, https://law.moj.gov.tw/LawClass/
// LawAll.aspx?pcode=D0020095): 第4條 days-off 紀念日 (開國紀念日、和平紀念日、孔子誕辰紀念日、
// 國慶日、臺灣光復暨金門古寧頭大捷紀念日、行憲紀念日) and 第6條 節日 days off (小年夜–初三 five
// days, 兒童節、清明節、勞動節、端午節、教師節、中秋節; 兒童節 on the 清明 day moves to the day
// before, or the day after when that day is a Thursday). Before 2025-05-28 the earlier
// 紀念日及節日實施辦法 applied: 除夕–初三, no 小年夜, and 勞動節 / 教師節 / 光復節 / 行憲紀念日 were
// not days off for everyone. 補假 and 調整放假 / 補行上班 are announced every year by 行政院人事行政
// 總處 and are NOT computed here — feed the official list to the component's `holidays` prop.
// Checked against 行政院人事行政總處「中華民國政府行政機關辦公日曆表」(政府資料開放平臺 dataset 14718,
// https://data.gov.tw/dataset/14718) for 2024–2027: every named day off there is in this list, except the
// 小年夜 of 2024 and 2025, which were 調整放假 before the 條例 made 小年夜 statutory.

/* ── tables ───────────────────────────────────────────── */

// <generated-data>
const LUNAR = 
  '04bd804ae00a570054d50d2600d95016554056a009ad0055d204ae00a5b60a4d00d2501d2550b5400d6a00ada2095b014977' +
  '049700a4b00b4b506a5006d401ab5402b6009570052f204970065660d4a00ea5016a9505ad002b60186e3092e01c8d70c950' +
  '0d4a01d8a60b550056a01a5b4025d0092d00d2b20a9500b55706ca00b5501535504da00a5b014573052b00a9a80e95006aa0' +
  '0aea60ab5004b600aae40a570052600f2630d95005b57056a0096d004dd504ad00a4d00d4d40d2500d5580b5400b6a0195a6' +
  '095b0049b00a9740a4b00b27a06a5006d400af460ab600957004af504970064b0074a30ea5006b5805ac00ab60096d5092e0' +
  '0c9600d9540d4a00da5007552056a00abb7025d0092d00cab50a9500b4a00baa40ad50055d904ba00a5b015176052b00a930' +
  '0795406aa00ad5005b5204b600a6e60a4e00d2600ea650d53005aa0076a3096d004afb04ad00a4d01d0b60d2500d5200dd45' +
  '0b5a0056d0055b2049b00a5770a4b00aa501b25506d200ada014b6309370049f804970064b0168a60ea5006b201a6c40aae0' +
  '092e00d2e30c9600d5570d4a00da5005d55056a00a6d0055d4052d00a9b80a9500b4a00b6a60ad50055a00aba40a5b0052b0' +
  '0b273069300733706aa00ad5014b5504b600a570054e40d1600e9680d5200daa016aa6056d004ae00a9d40a2d00d1500f252' +
  '0d520'
/** Earliest day-of-month of each term (小寒 … 冬至). */
const TERM_BASE = [4, 19, 3, 18, 4, 19, 4, 19, 4, 20, 4, 20, 6, 22, 6, 22, 6, 22, 7, 22, 6, 21, 6, 21]
const TERMS = 
  '5aa665a65a566aaaa6aa9a5aaaaaaabaaa6aaaabbabbafaa5aa665a65aab6aaaa6aa9a5aaaaaaaaaaa6aaaabbabbafaa5aa665a65aab6aaaa6aa9a5a' +
  'aaaaaaaaaa6aaaabbabbafaa56a665a65aab6aa6a6aa9a56aaaaaaaa9a5aaaabaabaaeaa569665a65aaa6aa6a6a69a566aaaaaaa9a5aaaabaabaaeaa' +
  '569665a65aaa5aa6a6a65a566aaaaaaa9a5aaaabaabaaa6a569665a65aaa5aa6a6a65a566aaaa6aa9a5aaaabaabaaa6a555665a65aaa5aa665a65a56' +
  '6aaaa6aa9a5aaaaaaabaaa6a555665665aaa5aa665a65a566aaaa6aa9a5aaaaaaaaaaa6a555665665aaa5aa665a65a566aaaa6aa9a5aaaaaaaaaaa6a' +
  '555665665aaa5aa665a65a566aaaa6aa9a5aaaaaaaaaaa6a555665655aaa569665a65a566aa6a6aa9a56aaaaaaaa9a5a5556556559aa569665a65a55' +
  '6aa6a6a65a56aaaaaaaa9a5a5556556559aa569665a65a555aa6a6a65a566aaaa6aa9a5a5556556555aa569665a65a555aa665a65a566aaaa6aa9a5a' +
  '55555565556a555665665a555aa665a65a566aaaa6aa9a5a55555565556a555665665a555aa665a65a566aaaa6aa9a5a55555555556a555665665a55' +
  '5aa665a65a566aaaa6aa9a5a55555555556a555665655a555aa665a65a566aa6a6aa9a5a55555555456a555655655a555a9665a65a566aa6a6a69a56' +
  '55555555456a555655655a55569665a65a566aa6a6a65a5655555155455a555655655955569665a65a555aa6a5a65a5615555155455a555555655555' +
  '569665665a555aa665a65a5615555155455a555555655515555665665a555aa665a65a5615555155455a555555555515555665665a555aa665a65a56' +
  '15555155455a555555555515555665665a555aa665a65a5615555155455a555555555515555655655a555aa665a65a5615515155455a555555554515' +
  '555655655a555a9665a65a5615515151455a555551554515555655655a55569665a65a56155151510556555551554505555655655955569665665a55' +
  '155110510556155551554505555555655555569665665a55055110510556155551554505555555555515555665665a55055110510556155551554505' +
  '555555555515555665665a55055110510556155551554505555555555515555655655a55055110510556155551554505555555555515555655655a55' +
  '055110510556155151514505555555554515555655655a55054110510556155151510505555551554515555655655a55014110110556155110510501' +
  '555551554505555555655555014110110555155110510501555551554505555555555555014110110555055110510501155551554505555555555555' +
  '000110110555055110510501155551554505555555555515000110110555055110510501155551554505555555555515000100100555055110510501' +
  '155151514505555555555515000100100555054110510501155151514505555551554515000100100555054110510501155150510505555551554515' +
  '000100100555014110110501155110510505555551554505000000100055014110110500155110510501555551554505000000000055014110110500' +
  '055110510501155551554505000000000055000110110500055110510501155551554505000000000015000100110500055110510501155551554505' +
  '555555555515'
// </generated-data>

export const LUNAR_MIN_YEAR = 1900
export const LUNAR_MAX_YEAR = 2100

export const SOLAR_TERMS = [
  '小寒', '大寒', '立春', '雨水', '驚蟄', '春分', '清明', '穀雨', '立夏', '小滿', '芒種', '夏至',
  '小暑', '大暑', '立秋', '處暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至',
] as const
export type SolarTermName = (typeof SOLAR_TERMS)[number]

export const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const
export const EARTHLY_BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const
export const ZODIAC = ['鼠', '牛', '虎', '兔', '龍', '蛇', '馬', '羊', '猴', '雞', '狗', '豬'] as const
export const ZODIAC_EN = ['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig'] as const

const MONTH_NAMES = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二']
const DIGITS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十']

/* ── lunar months ─────────────────────────────────────── */

const DAY_MS = 86400000
/** UTC day number of 1900-01-31 = 農曆 1900 正月初一. */
const EPOCH = Date.UTC(1900, 0, 31) / DAY_MS
const LAST = Date.UTC(2100, 11, 31) / DAY_MS

const info = (year: number) => parseInt(LUNAR.substr((year - LUNAR_MIN_YEAR) * 5, 5), 16)

/** 閏月 of a lunar year (1–12), or 0. */
export function lunarLeapMonth(year: number): number {
  return year < LUNAR_MIN_YEAR || year > LUNAR_MAX_YEAR ? 0 : info(year) & 0xf
}

/** Days in a lunar month (29 or 30); `leap` for the 閏月. 0 when it doesn't exist. */
export function lunarMonthDays(year: number, month: number, leap = false): number {
  if (year < LUNAR_MIN_YEAR || year > LUNAR_MAX_YEAR || month < 1 || month > 12) return 0
  const v = info(year)
  if (leap) return (v & 0xf) === month ? (v & 0x10000 ? 30 : 29) : 0
  return v & (0x8000 >> (month - 1)) ? 30 : 29
}

function yearDays(year: number) {
  let days = 0
  for (let m = 1; m <= 12; m++) days += lunarMonthDays(year, m)
  const leap = lunarLeapMonth(year)
  return leap ? days + lunarMonthDays(year, leap, true) : days
}

let starts: number[] | undefined
/** Day offset (from EPOCH) of each lunar year's 正月初一, 1900 … 2101. */
function yearStarts() {
  if (starts) return starts
  starts = [0]
  for (let y = LUNAR_MIN_YEAR; y <= LUNAR_MAX_YEAR; y++) starts.push(starts[starts.length - 1] + yearDays(y))
  return starts
}

/** The months of a lunar year in order, 閏月 right after its month. */
function monthsOf(year: number) {
  const leap = lunarLeapMonth(year)
  const out: { month: number; leap: boolean; days: number }[] = []
  for (let m = 1; m <= 12; m++) {
    out.push({ month: m, leap: false, days: lunarMonthDays(year, m) })
    if (m === leap) out.push({ month: m, leap: true, days: lunarMonthDays(year, m, true) })
  }
  return out
}

const dayNumber = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS

export interface LunarDate {
  /** Lunar year (the Gregorian year its 正月初一 falls in). */
  year: number
  /** 1–12. */
  month: number
  /** 1–30. */
  day: number
  /** In the 閏月. */
  leap: boolean
  /** 29 or 30. */
  monthDays: number
  /** 「正月」「閏二月」「十二月」. */
  monthName: string
  /** 「初一」「十五」「廿三」「三十」. */
  dayName: string
  /** 干支 year, e.g. 丙午 (changes at 正月初一, not 立春). */
  ganZhi: string
  /** 生肖, e.g. 馬. */
  zodiac: string
  /** 0 = 鼠 … 11 = 豬. */
  zodiacIndex: number
}

/** 「初一」…「初十」「十一」…「二十」「廿一」…「三十」. */
export function lunarDayName(day: number): string {
  if (day <= 10) return `初${DIGITS[day]}`
  if (day < 20) return `十${DIGITS[day - 10]}`
  if (day === 20) return '二十'
  if (day < 30) return `廿${DIGITS[day - 20]}`
  return '三十'
}

/** 「正月」「二月」…「十二月」, with 「閏」 for the leap month. */
export function lunarMonthName(month: number, leap = false): string {
  return `${leap ? '閏' : ''}${MONTH_NAMES[month - 1]}月`
}

/** 干支 of a (lunar) year: 2026 → 丙午. */
export function ganZhiYear(year: number): string {
  const i = (((year - 4) % 60) + 60) % 60
  return HEAVENLY_STEMS[i % 10] + EARTHLY_BRANCHES[i % 12]
}

/** 生肖 index of a (lunar) year: 0 = 鼠 … 11 = 豬. */
export const zodiacIndex = (year: number) => ((((year - 4) % 12) + 12) % 12)

/** Gregorian → 農曆 (local calendar day). `null` outside 1900-01-31 … 2100-12-31. */
export function toLunar(date: Date): LunarDate | null {
  const n = dayNumber(date)
  if (!(n >= EPOCH && n <= LAST)) return null
  let offset = n - EPOCH
  const list = yearStarts()
  let i = 0
  while (list[i + 1] <= offset) i++
  const year = LUNAR_MIN_YEAR + i
  offset -= list[i]
  for (const m of monthsOf(year)) {
    if (offset < m.days) {
      const z = zodiacIndex(year)
      return {
        year,
        month: m.month,
        day: offset + 1,
        leap: m.leap,
        monthDays: m.days,
        monthName: lunarMonthName(m.month, m.leap),
        dayName: lunarDayName(offset + 1),
        ganZhi: ganZhiYear(year),
        zodiac: ZODIAC[z],
        zodiacIndex: z,
      }
    }
    offset -= m.days
  }
  return null
}

/** 農曆 → Gregorian (local midnight). `null` when that day doesn't exist (no such 閏月, day 30 of a short month…). */
export function fromLunar(year: number, month: number, day: number, leap = false): Date | null {
  if (year < LUNAR_MIN_YEAR || year > LUNAR_MAX_YEAR) return null
  if (day < 1 || day > lunarMonthDays(year, month, leap)) return null
  let offset = yearStarts()[year - LUNAR_MIN_YEAR]
  for (const m of monthsOf(year)) {
    if (m.month === month && m.leap === leap) break
    offset += m.days
  }
  const t = (EPOCH + offset + day - 1) * DAY_MS
  const d = new Date(t)
  const out = new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  return dayNumber(out) <= LAST ? out : null
}

/* ── 24 節氣 ──────────────────────────────────────────── */

export interface SolarTerm {
  name: SolarTermName
  /** 0 = 小寒 … 23 = 冬至 (calendar order within a Gregorian year). */
  index: number
  date: Date
}

function termDay(year: number, index: number) {
  const word = parseInt(TERMS.substr((year - LUNAR_MIN_YEAR) * 12, 12), 16)
  return TERM_BASE[index] + (Math.floor(word / 4 ** index) % 4)
}

/** The 24 節氣 of a Gregorian year (1900–2100; empty otherwise), in date order. */
export function solarTerms(year: number): SolarTerm[] {
  if (year < LUNAR_MIN_YEAR || year > LUNAR_MAX_YEAR) return []
  return SOLAR_TERMS.map((name, index) => ({ name, index, date: new Date(year, index >> 1, termDay(year, index)) }))
}

/** The 節氣 that falls on this day, if any. */
export function solarTermOn(date: Date): SolarTermName | undefined {
  const year = date.getFullYear()
  if (year < LUNAR_MIN_YEAR || year > LUNAR_MAX_YEAR) return undefined
  const month = date.getMonth()
  for (const index of [month * 2, month * 2 + 1]) {
    if (termDay(year, index) === date.getDate()) return SOLAR_TERMS[index]
  }
  return undefined
}

/* ── 台灣國定假日 ─────────────────────────────────────── */

export interface TwHoliday {
  /** 'YYYY-MM-DD' (local). */
  date: string
  /** Official name, e.g. 臺灣光復暨金門古寧頭大捷紀念日. */
  name: string
  /** Short label for small cells, e.g. 光復節. Defaults to `name`. */
  short?: string
  /** A statutory day off for everyone. */
  off: boolean
  /** `memorial` 紀念日 · `festival` 節日 · `observance` named day without a day off. */
  kind: 'memorial' | 'festival' | 'observance'
}

export interface TwHolidayOptions {
  /** Also list named days that are not days off (元宵、中元、重陽、母親節、父親節…). Default true. */
  observances?: boolean
}

/** The day 紀念日及節日實施條例 took effect. */
export const TW_HOLIDAY_ACT_DATE = '2025-05-28'

const pad = (n: number) => String(n).padStart(2, '0')
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/**
 * Taiwan's statutory 紀念日 / 節日 of a Gregorian year (no 補假 or 調整放假 — those are announced
 * by 人事行政總處 each year). Uses the 2025 條例 from 2025-05-28 and the earlier 辦法 before it;
 * years before 2012 follow the same old rules and are not verified.
 */
export function twHolidays(year: number, options: TwHolidayOptions = {}): TwHoliday[] {
  const observances = options.observances ?? true
  const out: TwHoliday[] = []
  const add = (date: Date | null, name: string, off: boolean, kind: TwHoliday['kind'], short?: string) => {
    if (!date || date.getFullYear() !== year) return
    if (!off && !observances) return
    const h: TwHoliday = { date: keyOf(date), name, off, kind }
    if (short && short !== name) h.short = short
    out.push(h)
  }
  const solar = (m: number, d: number) => new Date(year, m - 1, d)
  const lunar = (m: number, d: number) => fromLunar(year, m, d)
  const actIn = (d: Date | null) => !!d && keyOf(d) >= TW_HOLIDAY_ACT_DATE

  add(solar(1, 1), '中華民國開國紀念日', true, 'memorial', '元旦')

  // 除夕 = the last day of 十二月, i.e. the day before 正月初一.
  const newYear = lunar(1, 1)
  if (newYear) {
    const eve = new Date(year, newYear.getMonth(), newYear.getDate() - 1)
    const before = new Date(year, newYear.getMonth(), newYear.getDate() - 2)
    if (actIn(before)) add(before, '小年夜', true, 'festival')
    add(eve, '除夕', true, 'festival')
    add(newYear, '春節', true, 'festival')
    add(new Date(year, newYear.getMonth(), newYear.getDate() + 1), '春節', true, 'festival', '初二')
    add(new Date(year, newYear.getMonth(), newYear.getDate() + 2), '春節', true, 'festival', '初三')
  }
  add(lunar(1, 15), '元宵節', false, 'observance')
  add(solar(2, 28), '和平紀念日', true, 'memorial', '二二八')

  const children = solar(4, 4)
  const qingming = solarTerms(year).find((t) => t.name === '清明')?.date ?? null
  if (qingming && qingming.getDate() === 4) {
    // Same day: 兒童節 is taken the day before — or the day after when 4/4 is a Thursday.
    add(qingming, '清明節', true, 'festival')
    add(solar(4, children.getDay() === 4 ? 5 : 3), '兒童節', true, 'festival')
  } else {
    add(children, '兒童節', true, 'festival')
    add(qingming, '清明節', true, 'festival')
  }

  const labour = solar(5, 1)
  add(labour, '勞動節', actIn(labour), actIn(labour) ? 'festival' : 'observance')
  // 母親節: the second Sunday of May.
  const may1 = solar(5, 1)
  add(solar(5, 1 + ((7 - may1.getDay()) % 7) + 7), '母親節', false, 'observance')
  add(lunar(5, 5), '端午節', true, 'festival')
  add(lunar(7, 15), '中元節', false, 'observance')
  add(solar(8, 8), '父親節', false, 'observance')
  add(lunar(8, 15), '中秋節', true, 'festival')
  add(lunar(9, 9), '重陽節', false, 'observance')

  const teachers = solar(9, 28)
  if (actIn(teachers)) add(teachers, '孔子誕辰紀念日（教師節）', true, 'memorial', '教師節')
  else add(teachers, '教師節', false, 'observance')
  add(solar(10, 10), '國慶日', true, 'memorial')
  const retro = solar(10, 25)
  if (actIn(retro)) add(retro, '臺灣光復暨金門古寧頭大捷紀念日', true, 'memorial', '光復節')
  else add(retro, '臺灣光復節', false, 'observance', '光復節')
  const constitution = solar(12, 25)
  add(constitution, '行憲紀念日', actIn(constitution), actIn(constitution) ? 'memorial' : 'observance', '行憲紀念')

  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}
