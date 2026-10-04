/**
 * 1-D barcode encoders for <MlBarcode>: Code 128 (auto B / C), Code 39 (the
 * 財政部 手機條碼載具 and 自然人憑證 use it) and EAN-13 (retail, 471… in Taiwan).
 * Output is a run-length list of module widths, bar first, ready to draw.
 */

export type MlBarcodeFormat = 'code128' | 'code39' | 'ean13'

export interface BarcodeEncoding {
  /** Alternating bar / space widths in modules, starting with a bar. */
  runs: number[]
  /** Total width in modules (without quiet zone). */
  width: number
  /** Human-readable line under the bars. */
  text: string
  /** EAN-13 guard bars (start, centre, end) that run down into the text, as module x ranges. */
  guards?: [number, number][]
}

/* ── Code 128 ──────────────────────────────────────────── */

// Symbol widths bar-space-bar-space-bar-space; index = symbol value. 103–105 are Start A/B/C.
const C128 = (
  '212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 ' +
  '123122 123221 223211 221132 221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 ' +
  '232121 111323 131123 131321 112313 132113 132311 211313 231113 231311 112133 112331 132131 113123 113321 133121 ' +
  '313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 314111 221411 431111 111224 ' +
  '111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 ' +
  '111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 ' +
  '114311 411113 411311 113141 114131 311141 411131 211412 211214 211232'
).split(' ')
const C128_STOP = '2331112'
const START_B = 104
const START_C = 105
const CODE_B = 100
const CODE_C = 99

/** Code 128 symbol widths, exported for tests. */
export const CODE128_PATTERNS: readonly string[] = C128

const digitRun = (s: string, from: number) => {
  let n = 0
  while (from + n < s.length && s.charCodeAt(from + n) >= 48 && s.charCodeAt(from + n) <= 57) n++
  return n
}

/**
 * Symbol values for `value` (start, data, check — no stop). Uses code set C for
 * digit runs long enough to save space (4+ at the ends, 6+ in the middle) and
 * code set B for the rest. Throws on characters outside printable ASCII.
 */
export function code128Symbols(value: string): number[] {
  if (!value) throw new RangeError('empty')
  for (const ch of value) {
    const c = ch.charCodeAt(0)
    if (ch.length > 1 || c < 32 || c > 126) throw new RangeError(`unsupported character "${ch}"`)
  }
  const out: number[] = []
  let set: 'B' | 'C' | null = null
  const use = (next: 'B' | 'C') => {
    if (set !== next) out.push(set === null ? (next === 'B' ? START_B : START_C) : next === 'B' ? CODE_B : CODE_C)
    set = next
  }
  let i = 0
  while (i < value.length) {
    let run = digitRun(value, i)
    const atEdge = i === 0 || i + run === value.length
    if (run >= (atEdge ? 4 : 6)) {
      // An odd run sends its first digit in set B so the rest pairs up.
      if (run % 2) {
        use('B')
        out.push(value.charCodeAt(i++) - 32)
        run--
      }
      use('C')
      for (const end = i + run; i < end; i += 2) out.push(Number(value.slice(i, i + 2)))
      continue
    }
    use('B')
    // Short digit runs (and everything else) go out as set B characters.
    for (const end = i + Math.max(run, 1); i < end; i++) out.push(value.charCodeAt(i) - 32)
  }
  const check = out.reduce((sum, v, idx) => sum + v * Math.max(idx, 1), 0) % 103
  out.push(check)
  return out
}

function encode128(value: string): BarcodeEncoding {
  const widths = code128Symbols(value).map((v) => C128[v]).join('') + C128_STOP
  return finish(widths, value)
}

/* ── Code 39 ───────────────────────────────────────────── */

// n = narrow, w = wide; bar, space, bar, … (9 elements, 3 wide).
const C39: Record<string, string> = {
  '0': 'nnnwwnwnn', '1': 'wnnwnnnnw', '2': 'nnwwnnnnw', '3': 'wnwwnnnnn', '4': 'nnnwwnnnw',
  '5': 'wnnwwnnnn', '6': 'nnwwwnnnn', '7': 'nnnwnnwnw', '8': 'wnnwnnwnn', '9': 'nnwwnnwnn',
  A: 'wnnnnwnnw', B: 'nnwnnwnnw', C: 'wnwnnwnnn', D: 'nnnnwwnnw', E: 'wnnnwwnnn',
  F: 'nnwnwwnnn', G: 'nnnnnwwnw', H: 'wnnnnwwnn', I: 'nnwnnwwnn', J: 'nnnnwwwnn',
  K: 'wnnnnnnww', L: 'nnwnnnnww', M: 'wnwnnnnwn', N: 'nnnnwnnww', O: 'wnnnwnnwn',
  P: 'nnwnwnnwn', Q: 'nnnnnnwww', R: 'wnnnnnwwn', S: 'nnwnnnwwn', T: 'nnnnwnwwn',
  U: 'wwnnnnnnw', V: 'nwwnnnnnw', W: 'wwwnnnnnn', X: 'nwnnwnnnw', Y: 'wwnnwnnnn',
  Z: 'nwwnwnnnn', '-': 'nwnnnnwnw', '.': 'wwnnnnwnn', ' ': 'nwwnnnwnn', '*': 'nwnnwnwnn',
  $: 'nwnwnwnnn', '/': 'nwnwnnnwn', '+': 'nwnnnwnwn', '%': 'nnnwnwnwn',
}

/** Code 39 element patterns, exported for tests. */
export const CODE39_PATTERNS: Readonly<Record<string, string>> = C39

/** Wide elements are 3 modules (ratio 3:1 reads well on phone cameras and POS scanners). */
const WIDE = '3'

function encode39(value: string): BarcodeEncoding {
  const text = value.toUpperCase()
  if (!text || text.includes('*')) throw new RangeError('empty or contains *')
  const chars = `*${text}*`.split('').map((ch) => {
    const p = C39[ch]
    if (!p) throw new RangeError(`unsupported character "${ch}"`)
    return p.replace(/n/g, '1').replace(/w/g, WIDE)
  })
  // One narrow space between characters.
  return finish(chars.join('1'), text)
}

/* ── EAN-13 ────────────────────────────────────────────── */

// Left-hand odd (L) widths space-bar-space-bar; R is the same starting with a bar; G is R reversed.
const EAN_L = ['3211', '2221', '2122', '1411', '1132', '1231', '1114', '1312', '1213', '3112']
const EAN_PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGGL', 'LGLGLG', 'LGGLGL']

/** EAN-13 / GTIN check digit of the first 12 digits. */
export function ean13CheckDigit(digits12: string) {
  let sum = 0
  for (let i = 0; i < 12; i++) sum += Number(digits12[i]) * (i % 2 ? 3 : 1)
  return (10 - (sum % 10)) % 10
}

function encodeEan13(value: string): BarcodeEncoding {
  const v = value.replace(/[\s-]/g, '')
  if (!/^\d{12,13}$/.test(v)) throw new RangeError('EAN-13 needs 12 or 13 digits')
  const check = ean13CheckDigit(v)
  if (v.length === 13 && Number(v[12]) !== check) throw new RangeError('wrong check digit')
  const digits = v.slice(0, 12) + check
  const parity = EAN_PARITY[Number(digits[0])]
  // Runs start with a bar, so the leading space of each left-hand digit is merged as needed.
  let modules = '101'
  for (let i = 1; i <= 6; i++) {
    const l = EAN_L[Number(digits[i])]
    modules += toBits(parity[i - 1] === 'L' ? l : l.split('').reverse().join(''), '0')
  }
  modules += '01010'
  for (let i = 7; i <= 12; i++) modules += toBits(EAN_L[Number(digits[i])], '1')
  modules += '101'
  const enc = fromBits(modules)
  return { ...enc, text: digits, guards: [[0, 3], [45, 50], [92, 95]] }
}

const toBits = (widths: string, first: '0' | '1') =>
  widths
    .split('')
    .map((w, i) => ((i % 2 === 0) === (first === '1') ? '1' : '0').repeat(Number(w)))
    .join('')

function fromBits(bits: string): Omit<BarcodeEncoding, 'text'> {
  const runs: number[] = []
  for (let i = 0; i < bits.length; ) {
    let n = 1
    while (bits[i + n] === bits[i]) n++
    runs.push(n)
    i += n
  }
  return { runs, width: bits.length }
}

function finish(widths: string, text: string): BarcodeEncoding {
  const runs = widths.split('').map(Number)
  return { runs, width: runs.reduce((a, b) => a + b, 0), text }
}

/**
 * Encodes `value`; throws RangeError when the format can't hold it
 * (non-ASCII for Code 128, lowercase-insensitive A–Z 0–9 - . space $ / + % for
 * Code 39, 12–13 digits with a valid check digit for EAN-13).
 */
export function encodeBarcode(value: string, format: MlBarcodeFormat = 'code128'): BarcodeEncoding {
  if (format === 'code39') return encode39(value)
  if (format === 'ean13') return encodeEan13(value)
  return encode128(value)
}

export interface BarcodeLayoutOptions {
  /** Width of the narrowest bar in px. */
  module: number
  /** Bar height in px. */
  height: number
  /** Quiet zone each side, in modules. */
  margin: number
  /** Print the human-readable line under the bars. */
  showText: boolean
  /** Text size in px. */
  fontSize: number
}

export interface BarcodeLayout {
  width: number
  height: number
  /** Bars in px, one subpath per bar. */
  path: string
  texts: { x: number; y: number; anchor: 'start' | 'middle' | 'end'; text: string }[]
}

/**
 * Pixel geometry shared by the Vue and React components. EAN-13 gets the
 * retail look: guard bars run into the text, the first digit sits in the
 * left quiet zone and the other twelve split under each half.
 */
export function barcodeLayout(enc: BarcodeEncoding, o: BarcodeLayoutOptions): BarcodeLayout {
  const m = o.module
  const gap = Math.round(o.fontSize * 0.3)
  const textBand = o.showText ? o.fontSize + gap : 0
  const guardExtra = enc.guards && o.showText ? Math.round(o.fontSize / 2) : 0
  let x = o.margin
  let path = ''
  enc.runs.forEach((w, i) => {
    if (i % 2 === 0) {
      const at = x - o.margin
      const tall = enc.guards?.some(([from, to]) => at >= from && at < to)
      path += `M${x * m} 0h${w * m}v${o.height + (tall ? guardExtra : 0)}h${-w * m}z`
    }
    x += w
  })
  const width = (enc.width + o.margin * 2) * m
  const baseline = o.height + gap + o.fontSize * 0.8
  let texts: BarcodeLayout['texts'] = []
  if (o.showText) {
    if (enc.guards && enc.text.length === 13) {
      const left = o.margin * m
      texts = [
        { x: left - m * 2, y: baseline, anchor: 'end', text: enc.text[0] },
        { x: left + 24 * m, y: baseline, anchor: 'middle', text: enc.text.slice(1, 7) },
        { x: left + 71 * m, y: baseline, anchor: 'middle', text: enc.text.slice(7) },
      ]
    } else {
      texts = [{ x: width / 2, y: baseline, anchor: 'middle', text: enc.text }]
    }
  }
  return { width, height: o.height + textBand, path, texts }
}
