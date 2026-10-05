// Full Taiwanese address logic (framework-free, shared by MlTaiwanAddress /
// <TaiwanAddress>): the 路段巷弄號樓 parts, assembling them in Chinese or in
// Chunghwa Post's English order, splitting a pasted address back into parts,
// and checking a 3+3 postal code against the 鄉鎮市區.
import { findTaiwanDistrict, getTaiwanCounties, normalizeTaiwanName } from '../taiwan-regions'

export interface MlTaiwanAddressValue {
  county: string
  district: string
  /** 3, 5 (3+2) or 6 (3+3) digits; the first 3 follow the 鄉鎮市區. */
  zip: string
  /** 路 / 街 / 大道, e.g. 重慶南路. */
  road: string
  /** 段 as a number, e.g. "1" for 一段. */
  section?: string
  lane?: string
  alley?: string
  /** 號, may include 之, e.g. "122" or "122之1". */
  number: string
  /** 樓, e.g. "5" or "B1". */
  floor?: string
  /** 之 / 室 after the floor, e.g. "3" for 5樓之3. */
  room?: string
}

export const emptyTaiwanAddress = (): MlTaiwanAddressValue => ({ county: '', district: '', zip: '', road: '', number: '' })

const DIGITS = '零一二三四五六七八九'

/** 1 → 一, 10 → 十, 12 → 十二, 25 → 二十五 (段 numbers). Other input comes back as is. */
export function chineseNumeral(value: string | number) {
  const n = Number(value)
  if (!Number.isInteger(n) || n < 1 || n > 99) return String(value)
  if (n < 10) return DIGITS[n]
  const tens = Math.floor(n / 10)
  return `${tens > 1 ? DIGITS[tens] : ''}十${n % 10 ? DIGITS[n % 10] : ''}`
}

/** 一 → 1, 十二 → 12, 二十五 → 25; digits pass through. NaN when it isn't a numeral. */
export function fromChineseNumeral(text: string) {
  if (/^\d+$/.test(text)) return Number(text)
  const m = /^([一二三四五六七八九])?(十)?([一二三四五六七八九])?$/.exec(text)
  if (!m || (!m[1] && !m[2] && !m[3])) return NaN
  const d = (c?: string) => (c ? DIGITS.indexOf(c) : 0)
  if (!m[2]) return m[3] ? NaN : d(m[1])
  return (m[1] ? d(m[1]) : 1) * 10 + d(m[3])
}

const has = (v?: string) => !!v && v.trim() !== ''

/** The street part only: 重慶南路一段12巷3弄45號5樓之3. */
export function formatStreet(v: Pick<MlTaiwanAddressValue, 'road' | 'section' | 'lane' | 'alley' | 'number' | 'floor' | 'room'>) {
  return [
    v.road?.trim() ?? '',
    has(v.section) ? `${chineseNumeral(v.section!.trim())}段` : '',
    has(v.lane) ? `${v.lane!.trim()}巷` : '',
    has(v.alley) ? `${v.alley!.trim()}弄` : '',
    has(v.number) ? `${v.number!.trim()}號` : '',
    has(v.floor) ? `${v.floor!.trim()}樓` : '',
    has(v.room) ? `之${v.room!.trim()}` : '',
  ].join('')
}

/**
 * One address line. Chinese: 「100-603臺北市中正區重慶南路一段122號5樓」.
 * English, in Chunghwa Post order: 「5F., No. 122, Sec. 1, Chongqing S. Rd., Zhongzheng Dist., Taipei City 100-603」
 * — the road is used as typed (give it in English for an English line).
 */
export function formatTwAddress(v: MlTaiwanAddressValue, options: { lang?: 'zh' | 'en'; zip?: boolean } = {}) {
  const d = has(v.county) && has(v.district) ? findTaiwanDistrict(v.county, v.district) : undefined
  const zip = options.zip === false ? '' : v.zip?.trim() || d?.zip || ''
  if (options.lang === 'en') {
    const floor = has(v.floor) ? `${v.floor!.trim().toUpperCase()}F.${has(v.room) ? `-${v.room!.trim()}` : ''}` : ''
    const road = v.road?.trim() ?? ''
    const parts = [
      floor,
      has(v.number) ? `No. ${v.number!.trim().replace('之', '-')}` : '',
      has(v.alley) ? `Aly. ${v.alley!.trim()}` : '',
      has(v.lane) ? `Ln. ${v.lane!.trim()}` : '',
      has(v.section) ? `Sec. ${Number.isNaN(fromChineseNumeral(v.section!.trim())) ? v.section!.trim() : fromChineseNumeral(v.section!.trim())}` : '',
      road,
      d?.en ?? v.district,
      `${d?.countyEn ?? v.county}${zip ? ` ${zip}` : ''}`,
    ]
    return parts.filter((p) => p && p.trim()).join(', ')
  }
  const county = d?.county ?? normalizeTaiwanName(v.county ?? '')
  const district = d?.name ?? normalizeTaiwanName(v.district ?? '')
  return `${zip}${county}${district}${formatStreet(v)}`
}

export interface ParsedTaiwanAddress extends Partial<MlTaiwanAddressValue> {
  /** Whatever couldn't be placed (村里鄰, building names…), in order. */
  rest: string
}

const NUM = '(?:[0-9０-９]+|[一二三四五六七八九十]+)'

/** Full-width digits and spaces to plain ones. */
function plain(text: string) {
  return text.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).replace(/\s+/g, '')
}

/**
 * Split a pasted Chinese address into parts:
 * 「100台北市中正區重慶南路一段122號5樓」 → { zip: '100', county: '臺北市', district: '中正區',
 * road: '重慶南路', section: '1', number: '122', floor: '5' }. Parts it can't find are left out.
 */
export function parseTwAddress(text: string): ParsedTaiwanAddress {
  let s = plain(text)
  const out: ParsedTaiwanAddress = { rest: '' }
  const zip = /^(\d{3})(?:-?(\d{2,3}))?/.exec(s)
  if (zip) {
    out.zip = zip[2] ? `${zip[1]}-${zip[2]}` : zip[1]
    s = s.slice(zip[0].length)
  }
  s = s.replace(/^(臺灣|台灣|台湾)/, '')
  const county = getTaiwanCounties({ includeIslands: true }).find((c) => normalizeTaiwanName(s).startsWith(c.name))
  if (county) {
    out.county = county.name
    s = s.slice(county.name.length)
    const district = county.districts.find((d) => normalizeTaiwanName(s).startsWith(d.name))
    if (district) {
      out.district = district.name
      s = s.slice(district.name.length)
      if (!out.zip) out.zip = district.zip
    }
  }
  const take = (re: RegExp) => {
    const m = re.exec(s)
    if (!m) return undefined
    out.rest += s.slice(0, m.index)
    s = s.slice(m.index + m[0].length)
    return m
  }
  // Lazy up to the first 路 / 街 / 大道, so 中山一路 and 重慶南路 both work; a leading 村里鄰 goes to rest.
  const road = take(/^(.+?(?:大道|路|街))/)
  if (road) {
    const village = /^(?:[^\d]+?[村里])?(?:\d+鄰)?/.exec(road[1])![0]
    out.rest += village
    out.road = road[1].slice(village.length)
  }
  const section = take(new RegExp(`^(${NUM})段`))
  if (section) out.section = String(fromChineseNumeral(section[1]) || section[1])
  const lane = take(new RegExp(`^(${NUM})巷`))
  if (lane) out.lane = String(Number.isNaN(fromChineseNumeral(lane[1])) ? lane[1] : fromChineseNumeral(lane[1]))
  const alley = take(new RegExp(`^(${NUM})弄`))
  if (alley) out.alley = String(Number.isNaN(fromChineseNumeral(alley[1])) ? alley[1] : fromChineseNumeral(alley[1]))
  const number = take(/^(\d+(?:之\d+)?)號/)
  if (number) {
    out.number = number[1]
    // 「45號之1」 is house number 45之1, not a room, unless a floor follows.
    const sub = /^之(\d+)(?![\d]*[樓F])/i.exec(s)
    if (sub && !out.number.includes('之')) {
      out.number += `之${sub[1]}`
      s = s.slice(sub[0].length)
    }
  }
  const floor = take(new RegExp(`^(?:(B\\d+)(?:樓|F)?|(地下${NUM}|${NUM})(?:樓|F))`, 'i'))
  if (floor) {
    const f = floor[1] ?? floor[2]
    const under = /^地下(.+)$/.exec(f)
    out.floor = under ? `B${fromChineseNumeral(under[1]) || under[1]}` : Number.isNaN(fromChineseNumeral(f)) ? f.toUpperCase() : String(fromChineseNumeral(f))
  }
  const room = take(/^(?:之(\d+)|(\d+)室)/)
  if (room) out.room = room[1] ?? room[2]
  out.rest = (out.rest + s).trim()
  return out
}

export type TwZipStatus = 'empty' | 'partial' | 'ok' | 'mismatch' | 'invalid'

/**
 * How a postal code fits the chosen 鄉鎮市區: 'partial' is just the 3-digit
 * prefix, 'ok' a complete 3+2 or 3+3 code, 'mismatch' a prefix that belongs
 * elsewhere, 'invalid' anything not shaped like a code.
 */
export function twZipStatus(zip: string, county: string, district: string): TwZipStatus {
  const digits = (zip ?? '').replace(/[-\s]/g, '')
  if (!digits) return 'empty'
  if (!/^\d{3}(\d{2}|\d{3})?$/.test(digits)) return 'invalid'
  const d = county && district ? findTaiwanDistrict(county, district) : undefined
  if (d && d.zip !== digits.slice(0, 3)) return 'mismatch'
  return digits.length === 3 ? 'partial' : 'ok'
}

/** Keep the typed suffix but swap in a new 3-digit prefix (when the 鄉鎮市區 changes). */
export function rebaseZip(zip: string, prefix: string) {
  const suffix = (zip ?? '').replace(/[-\s]/g, '').slice(3)
  return prefix ? (suffix ? `${prefix}-${suffix}` : prefix) : ''
}

/** The address is usable: a 鄉鎮市區, a road and a number. */
export function isTwAddressComplete(v: MlTaiwanAddressValue) {
  return has(v.county) && has(v.district) && has(v.road) && has(v.number)
}
