// 注音符號 — framework-free helpers shared by MlZhuyin and MlIndexBar (Vue and React):
// reading syllables, pinyin → 注音, word dictionaries for 破音字, and sorting
// names into ㄅㄆㄇ / A–Z buckets with the browser's own Intl collation (no
// dictionary needed for that part).

/** The 37 symbols in dictionary order: 21 initials, then the finals. */
export const ZHUYIN_SYMBOLS = 'ㄅㄆㄇㄈㄉㄊㄋㄌㄍㄎㄏㄐㄑㄒㄓㄔㄕㄖㄗㄘㄙㄚㄛㄜㄝㄞㄟㄠㄡㄢㄣㄤㄥㄦㄧㄨㄩ'
export const ZHUYIN_INITIALS = [...ZHUYIN_SYMBOLS.slice(0, 21)]
export const ZHUYIN_INDEXES = [...ZHUYIN_SYMBOLS]
export const ALPHABET_INDEXES = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ']

/** 1–4, or 5 for the light tone (輕聲 ˙). */
export type ZhuyinTone = 1 | 2 | 3 | 4 | 5

export interface ZhuyinSyllable {
  /** The symbols without the tone mark, e.g. "ㄕ" or "ㄌㄧㄤ". */
  symbols: string
  tone: ZhuyinTone
}

const TONE_MARKS: Record<string, ZhuyinTone> = { 'ˉ': 1, 'ˊ': 2, 'ˇ': 3, 'ˋ': 4, '˙': 5 }
export const TONE_MARK: Record<ZhuyinTone, string> = { 1: '', 2: 'ˊ', 3: 'ˇ', 4: 'ˋ', 5: '˙' }
const SYMBOL_RE = /[\u3105-\u312f\u31a0-\u31bf]/

/** "ㄌㄧㄤˊ" → { symbols: "ㄌㄧㄤ", tone: 2 }. The light-tone dot may come first or last. */
export function parseZhuyin(text: string): ZhuyinSyllable | null {
  let symbols = ''
  let tone: ZhuyinTone = 1
  for (const c of text.trim()) {
    if (TONE_MARKS[c]) tone = TONE_MARKS[c]
    else if (SYMBOL_RE.test(c)) symbols += c
    else return null
  }
  return symbols ? { symbols, tone } : null
}

/** Write a syllable back out; the light tone goes in front, as in textbooks. */
export function formatZhuyin({ symbols, tone }: ZhuyinSyllable) {
  return tone === 5 ? `˙${symbols}` : symbols + TONE_MARK[tone]
}

/* ── Pinyin → 注音 ───────────────────────────────────── */

const INITIALS: [string, string][] = [
  ['zh', 'ㄓ'], ['ch', 'ㄔ'], ['sh', 'ㄕ'],
  ['b', 'ㄅ'], ['p', 'ㄆ'], ['m', 'ㄇ'], ['f', 'ㄈ'], ['d', 'ㄉ'], ['t', 'ㄊ'], ['n', 'ㄋ'], ['l', 'ㄌ'],
  ['g', 'ㄍ'], ['k', 'ㄎ'], ['h', 'ㄏ'], ['j', 'ㄐ'], ['q', 'ㄑ'], ['x', 'ㄒ'], ['r', 'ㄖ'], ['z', 'ㄗ'], ['c', 'ㄘ'], ['s', 'ㄙ'],
]

const FINALS: Record<string, string> = {
  a: 'ㄚ', o: 'ㄛ', e: 'ㄜ', ê: 'ㄝ', ai: 'ㄞ', ei: 'ㄟ', ao: 'ㄠ', ou: 'ㄡ', an: 'ㄢ', en: 'ㄣ', ang: 'ㄤ', eng: 'ㄥ', er: 'ㄦ', ong: 'ㄨㄥ',
  i: 'ㄧ', ia: 'ㄧㄚ', io: 'ㄧㄛ', ie: 'ㄧㄝ', iai: 'ㄧㄞ', iao: 'ㄧㄠ', iu: 'ㄧㄡ', iou: 'ㄧㄡ', ian: 'ㄧㄢ', in: 'ㄧㄣ', iang: 'ㄧㄤ', ing: 'ㄧㄥ', iong: 'ㄩㄥ',
  u: 'ㄨ', ua: 'ㄨㄚ', uo: 'ㄨㄛ', uai: 'ㄨㄞ', ui: 'ㄨㄟ', uei: 'ㄨㄟ', uan: 'ㄨㄢ', un: 'ㄨㄣ', uen: 'ㄨㄣ', uang: 'ㄨㄤ', ueng: 'ㄨㄥ',
  ü: 'ㄩ', üe: 'ㄩㄝ', üan: 'ㄩㄢ', ün: 'ㄩㄣ',
}

/** y- and w- spellings, which stand for a medial rather than an initial. */
const Y_W: Record<string, string> = {
  yi: 'i', ya: 'ia', yo: 'io', ye: 'ie', yai: 'iai', yao: 'iao', you: 'iu', yan: 'ian', yin: 'in', yang: 'iang', ying: 'ing', yong: 'iong',
  yu: 'ü', yue: 'üe', yuan: 'üan', yun: 'ün',
  wu: 'u', wa: 'ua', wo: 'uo', wai: 'uai', wei: 'ui', wan: 'uan', wen: 'un', wang: 'uang', weng: 'ueng',
}

/** Syllables that are only an initial: zhi → ㄓ, si → ㄙ. */
const BARE = new Set(['zh', 'ch', 'sh', 'r', 'z', 'c', 's'])

const MARKED: Record<string, [string, ZhuyinTone]> = {}
for (const [base, marks] of Object.entries({ a: 'āáǎà', e: 'ēéěè', i: 'īíǐì', o: 'ōóǒò', u: 'ūúǔù', ü: 'ǖǘǚǜ', ê: 'ê̄ếê̌ề' })) {
  ;[...marks].forEach((m, i) => (MARKED[m] = [base, (i + 1) as ZhuyinTone]))
}

/**
 * One pinyin syllable to 注音: "shī" / "shi1" → "ㄕ", "liáng" → "ㄌㄧㄤˊ",
 * "lüè" / "lve4" → "ㄌㄩㄝˋ", "de" / "de5" → "˙ㄉㄜ". Returns '' when it isn't pinyin.
 */
export function pinyinToZhuyin(syllable: string) {
  let s = syllable.trim().toLowerCase().normalize('NFC')
  let tone: ZhuyinTone = 5
  const digit = /([0-5])$/.exec(s)
  if (digit) {
    tone = (+digit[1] || 5) as ZhuyinTone
    s = s.slice(0, -1)
  }
  let plain = ''
  for (const c of s) {
    const marked = MARKED[c]
    if (marked) {
      plain += marked[0]
      tone = marked[1]
    } else plain += c
  }
  plain = plain.replace(/v/g, 'ü').replace(/u:/g, 'ü')
  if (!/^[a-zêü]+$/.test(plain)) return ''

  const interjection = ({ m: 'ㄇ', n: 'ㄋ', ng: 'ㄫ', hm: 'ㄏㄇ', hng: 'ㄏㄫ' } as Record<string, string>)[plain]
  if (interjection) return formatZhuyin({ symbols: interjection, tone })

  let initial = ''
  let rest = plain
  if (Y_W[plain]) rest = Y_W[plain]
  else if (/^[yw]/.test(plain)) return ''
  else {
    const found = INITIALS.find(([p]) => plain.startsWith(p))
    if (found) {
      initial = found[1]
      rest = plain.slice(found[0].length)
      if (rest === 'i' && BARE.has(found[0])) rest = ''
      // After j / q / x a written u is ü.
      else if (/^[jqx]$/.test(found[0]) && rest.startsWith('u')) rest = `ü${rest.slice(1)}`
    }
  }
  const final = rest ? FINALS[rest] : ''
  if (final === undefined) return ''
  const symbols = initial + final
  return symbols ? formatZhuyin({ symbols, tone }) : ''
}

/* ── Dictionaries ─────────────────────────────────────── */

const dictionary = new Map<string, string[]>()
let longestWord = 1

/**
 * Teach MlZhuyin readings: single characters, or whole words for 破音字
 * ("銀行": "ㄧㄣˊ ㄏㄤˊ" beats "行": "ㄒㄧㄥˊ"). Readings may be 注音 or pinyin.
 * Later calls override earlier ones.
 */
export function registerZhuyin(entries: Record<string, string>) {
  for (const [word, reading] of Object.entries(entries)) {
    const syllables = splitReadings(reading)
    if (!word || syllables.length !== [...word].length) continue
    dictionary.set(word, syllables)
    longestWord = Math.max(longestWord, [...word].length)
  }
}

/** Forget every registered reading. */
export function clearZhuyin() {
  dictionary.clear()
  longestWord = 1
}

/** Readings separated by spaces or commas; pinyin syllables are converted. '' keeps a slot empty. */
export function splitReadings(readings: string | string[]) {
  const list = Array.isArray(readings) ? readings : readings.trim() ? readings.trim().split(/[\s,，、]+/) : []
  return list.map((r) => (r === '_' || r === '-' ? '' : parseZhuyin(r) ? formatZhuyin(parseZhuyin(r)!) : pinyinToZhuyin(r)))
}

export function isHan(char: string) {
  return /\p{Script=Han}/u.test(char)
}

export interface ZhuyinUnit {
  char: string
  /** '' for punctuation, Latin text and characters without a known reading. */
  zhuyin: string
}

/**
 * Pair each character with its reading. Explicit readings go to the Han
 * characters in order; anything left over is looked up in the registered
 * dictionary, longest word first.
 */
export function annotateZhuyin(text: string, readings?: string | string[]): ZhuyinUnit[] {
  const chars = [...text]
  const units: ZhuyinUnit[] = chars.map((char) => ({ char, zhuyin: '' }))
  if (readings !== undefined && (Array.isArray(readings) ? readings.length : readings.trim())) {
    const list = splitReadings(readings)
    let k = 0
    for (const u of units) if (isHan(u.char) && k < list.length) u.zhuyin = list[k++]
    return units
  }
  for (let i = 0; i < chars.length; ) {
    let matched = 0
    for (let len = Math.min(longestWord, chars.length - i); len > 0; len--) {
      const hit = dictionary.get(chars.slice(i, i + len).join(''))
      if (hit) {
        hit.forEach((z, k) => (units[i + k].zhuyin = z))
        matched = len
        break
      }
    }
    i += matched || 1
  }
  return units
}

export interface ZhuyinPiece {
  char: string
  /** Each symbol on its own, for the stacked 直式 column. Empty: plain text. */
  symbols: string[]
  tone: ZhuyinTone
  /** Closing punctuation that must stay on the same line as this character. */
  tail: string
}

const CLOSING = /^[，。、；：？！）」』〉》】…—,.;:?!)\]]$/u

/** What MlZhuyin renders: annotated characters (with any trailing punctuation glued on) and plain text. */
export function zhuyinPieces(text: string, readings?: string | string[]): ZhuyinPiece[] {
  const pieces: ZhuyinPiece[] = []
  for (const u of annotateZhuyin(text, readings)) {
    const last = pieces[pieces.length - 1]
    if (!u.zhuyin && last?.symbols.length && CLOSING.test(u.char) && last.tail.length < 2) {
      last.tail += u.char
      continue
    }
    const s = u.zhuyin ? parseZhuyin(u.zhuyin) : null
    pieces.push({ char: u.char, symbols: s ? [...s.symbols] : [], tone: s?.tone ?? 1, tail: '' })
  }
  return pieces
}

/* ── ㄅㄆㄇ / A–Z buckets ─────────────────────────────── */

// The first character of each bucket in CLDR's zhuyin / pinyin collation,
// picked among characters with a single reading so every ICU version agrees
// on where they sort. ㄝ and ㄟ have no reliable single-reading character and
// share the bucket before them.
const ZHUYIN_BOUNDS = 'ㄅ八ㄆ妑ㄇ呣ㄈ发ㄉ咑ㄊ他ㄋ拏ㄌ拉ㄍ旮ㄎ咔ㄏ哈ㄐ讥ㄑ七ㄒ夕ㄓ之ㄔ吃ㄕ尸ㄖ日ㄗ孜ㄘ疵ㄙ丝ㄚ阿ㄛ噢ㄜ妸ㄞ哀ㄠ凹ㄡ讴ㄢ安ㄣ恩ㄤ肮ㄥ鞥ㄦ儿ㄧ一ㄨ乌ㄩ纡'
const PINYIN_BOUNDS = 'A吖B八C擦D咑E妸F发G旮H哈J讥K咔L拉M呣N拏O噢P妑Q七R呥S仨T他W屲X夕Y丫Z帀'

interface Buckets {
  collator: Intl.Collator
  bounds: [label: string, char: string][]
}
const bucketCache = new Map<string, Buckets | null>()

function buckets(kind: 'zhuyin' | 'pinyin'): Buckets | null {
  if (bucketCache.has(kind)) return bucketCache.get(kind)!
  let result: Buckets | null = null
  try {
    const collator = new Intl.Collator(kind === 'zhuyin' ? 'zh-TW-u-co-zhuyin' : 'zh-u-co-pinyin')
    if (collator.resolvedOptions().collation === kind) {
      const table = [...(kind === 'zhuyin' ? ZHUYIN_BOUNDS : PINYIN_BOUNDS)]
      const pairs: [string, string][] = []
      for (let i = 0; i < table.length; i += 2) pairs.push([table[i], table[i + 1]])
      // A boundary an unusual ICU sorts out of order is dropped (its bucket merges
      // into the one before), instead of mis-filing everything after it.
      const bounds = pairs.filter(([, c], i) => {
        const prev = pairs[i - 1]?.[1]
        const next = pairs[i + 1]?.[1]
        return (!prev || collator.compare(prev, c) < 0) && (!next || collator.compare(c, next) < 0)
      })
      result = { collator, bounds }
    }
  } catch {
    result = null
  }
  bucketCache.set(kind, result)
  return result
}

/** Which bucket a Han character falls in, or '' when this runtime can't tell. */
function hanBucket(char: string, kind: 'zhuyin' | 'pinyin') {
  const b = buckets(kind)
  if (!b) return ''
  let lo = 0
  let hi = b.bounds.length - 1
  if (b.collator.compare(char, b.bounds[0][1]) < 0) return b.bounds[0][0]
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1
    if (b.collator.compare(b.bounds[mid][1], char) <= 0) lo = mid
    else hi = mid - 1
  }
  return b.bounds[lo][0]
}

/**
 * 破音字 surnames, which collation files under their everyday reading
 * (曾經 ㄘㄥˊ, 沈 ㄔㄣˊ) instead of the name's (曾 ㄗㄥ, 沈 ㄕㄣˇ).
 * Value: [注音 bucket, pinyin bucket].
 */
const SURNAMES: Record<string, [string, string]> = {
  曾: ['ㄗ', 'Z'], 沈: ['ㄕ', 'S'], 單: ['ㄕ', 'S'], 单: ['ㄕ', 'S'], 仇: ['ㄑ', 'Q'], 解: ['ㄒ', 'X'], 區: ['ㄡ', 'O'], 区: ['ㄡ', 'O'],
  查: ['ㄓ', 'Z'], 樂: ['ㄩ', 'Y'], 乐: ['ㄩ', 'Y'], 繆: ['ㄇ', 'M'], 缪: ['ㄇ', 'M'], 朴: ['ㄆ', 'P'], 覃: ['ㄑ', 'Q'], 种: ['ㄔ', 'C'],
  蓋: ['ㄍ', 'G'], 盖: ['ㄍ', 'G'], 秘: ['ㄅ', 'B'], 翟: ['ㄓ', 'Z'], 召: ['ㄕ', 'S'], 祭: ['ㄓ', 'Z'], 尉: ['ㄨ', 'W'], 万: ['ㄨ', 'W'],
}

export type MlIndexMode = 'zhuyin' | 'alphabet'

/**
 * The index a name files under. 注音 mode: ㄅ…ㄩ for Chinese, then A–Z for
 * Latin names. Alphabet mode: A–Z, Chinese by pinyin. Anything else is "#".
 */
export function indexKey(label: string, mode: MlIndexMode = 'zhuyin') {
  const first = [...label.trim()][0] ?? ''
  if (!first) return '#'
  if (/[a-z]/i.test(first.normalize('NFD')[0])) return first.normalize('NFD')[0].toUpperCase()
  if (SYMBOL_RE.test(first)) {
    if (mode === 'zhuyin') return ZHUYIN_SYMBOLS.includes(first) ? first : '#'
    return '#'
  }
  if (isHan(first)) {
    const surname = SURNAMES[first]
    if (surname) return mode === 'zhuyin' ? surname[0] : surname[1]
    return hanBucket(first, mode === 'zhuyin' ? 'zhuyin' : 'pinyin') || '#'
  }
  return '#'
}

/** Sort names the way a 注音 (or pinyin) phone book does. */
export function indexCollator(mode: MlIndexMode = 'zhuyin') {
  return buckets(mode === 'zhuyin' ? 'zhuyin' : 'pinyin')?.collator ?? new Intl.Collator(mode === 'zhuyin' ? 'zh-TW' : 'zh')
}
