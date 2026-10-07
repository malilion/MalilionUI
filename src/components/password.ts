// Password strength + rule checks. Framework-free (shared by Vue and React) and
// deliberately small: a rough entropy estimate that discounts the patterns people
// actually use — common passwords, sequences (abc / 123 / qwerty) and repeats.
// It is guidance for the user, not a security guarantee.

export type MlPasswordScore = 0 | 1 | 2 | 3 | 4

/** Rules shown as a checklist under the field. `true` on the component means all of them, 8 chars min. */
export interface MlPasswordRules {
  /** Minimum length; 0 / undefined skips the rule. */
  minLength?: number
  upper?: boolean
  lower?: boolean
  digit?: boolean
  symbol?: boolean
}

export type MlPasswordRuleKey = 'length' | 'upper' | 'lower' | 'digit' | 'symbol'

export interface MlPasswordRuleResult {
  key: MlPasswordRuleKey
  ok: boolean
  /** Only on `length`: the required minimum. */
  min?: number
}

export const DEFAULT_PASSWORD_RULES: Required<MlPasswordRules> = {
  minLength: 8,
  upper: true,
  lower: true,
  digit: true,
  symbol: true,
}

const COMMON = new Set(
  (
    'password passw0rd 123456 1234567 12345678 123456789 1234567890 qwerty qwertyuiop iloveyou admin ' +
    'administrator welcome letmein monkey dragon football baseball sunshine princess abc123 111111 ' +
    '000000 666666 888888 master superman batman trustno1 starwars whatever hello freedom shadow ' +
    'michael login azerty 1q2w3e4r zaq12wsx qazwsx asdfgh asdfghjkl secret changeme default root ' +
    'test guest user pass a123456 aa123456 a12345678 qwe123 iloveu lovely'
  ).split(' '),
)
/** Words worth discounting when they show up inside a longer password. */
const COMMON_WORDS = ['password', 'passw0rd', 'qwerty', 'iloveyou', 'admin', 'welcome', 'letmein', 'monkey', 'dragon', 'sunshine', 'princess', 'master', 'superman', 'starwars', 'football', 'baseball']

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', $: 's', '!': 'i' }
const ROWS = ['1234567890', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm']

const isUpper = (c: string) => /[A-Z]/.test(c)
const isLower = (c: string) => /[a-z]/.test(c)
const isDigit = (c: string) => /[0-9]/.test(c)
/** Anything that isn't an ASCII letter or digit — including spaces and CJK. */
const isSymbol = (c: string) => /[^A-Za-z0-9]/.test(c)

/** Keyboard position of a char (row, column), for qwerty walks. */
function keyPos(c: string): [number, number] | undefined {
  for (let r = 0; r < ROWS.length; r++) {
    const col = ROWS[r].indexOf(c)
    if (col >= 0) return [r, col]
  }
  return undefined
}

/** Ways two chars continue a pattern: 0 = repeat, ±1 = alphabet / digit sequence, ±1000 = keyboard walk. */
function steps(a: string, b: string): number[] {
  if (a === b) return [0]
  const out: number[] = []
  const d = b.charCodeAt(0) - a.charCodeAt(0)
  if (d === 1 || d === -1) out.push(d)
  const pa = keyPos(a)
  const pb = keyPos(b)
  if (pa && pb && pa[0] === pb[0] && Math.abs(pb[1] - pa[1]) === 1) out.push((pb[1] - pa[1]) * 1000)
  return out
}

/**
 * Length after collapsing patterns: a run of 3+ chars that repeat, count up/down
 * or walk along a keyboard row counts as 2, a whole-string repeat ("abcabc")
 * counts as one copy, and an embedded common word counts as 1.
 */
export function effectiveLength(password: string): number {
  let s = [...password.toLowerCase()]
  const chunk = /^(.+?)\1+$/su.exec(password.toLowerCase())
  if (chunk) s = [...chunk[1]]
  let eff = 0
  let i = 0
  while (i < s.length) {
    let j = i
    // Extend while some pattern (repeat / sequence / walk) holds for every step so far.
    let live = j + 1 < s.length ? steps(s[j], s[j + 1]) : []
    while (live.length && j + 1 < s.length) {
      const next = steps(s[j], s[j + 1])
      const both = live.filter((x) => next.includes(x))
      if (!both.length) break
      live = both
      j++
    }
    const run = j - i + 1
    if (run >= 3) {
      eff += 2
      i = j + 1
    } else {
      eff += 1
      i += 1
    }
  }
  if (chunk) eff += 1
  const plain = deLeet(password.toLowerCase())
  for (const word of COMMON_WORDS) {
    if (plain.includes(word)) {
      eff -= word.length - 1
      break
    }
  }
  return Math.max(0, eff)
}

function deLeet(s: string) {
  return [...s].map((c) => LEET[c] ?? c).join('')
}

/** Drop trailing non-a-z without `/[^a-z]+$/u` (polynomial ReDoS on long non-letter runs). */
function stripTrailingNonLetters(s: string): string {
  let end = s.length
  while (end > 0) {
    const c = s.charCodeAt(end - 1)
    if (c >= 97 && c <= 122) break // a-z
    end--
  }
  return s.slice(0, end)
}

/** True when the password is (a light disguise of) a well-known password. */
export function isCommonPassword(password: string): boolean {
  const lower = password.toLowerCase()
  if (COMMON.has(lower)) return true
  // "Password1!", "p@ssw0rd2024" — strip trailing digits / symbols, undo leetspeak.
  const base = stripTrailingNonLetters(lower)
  if (base.length >= 4 && (COMMON.has(base) || COMMON.has(deLeet(base)))) return true
  return COMMON.has(deLeet(lower))
}

/** Size of the character pool the password draws from. */
function poolSize(password: string): number {
  const chars = [...password]
  let pool = 0
  if (chars.some(isLower)) pool += 26
  if (chars.some(isUpper)) pool += 26
  if (chars.some(isDigit)) pool += 10
  if (chars.some(isSymbol)) pool += 33
  return pool
}

/** Rough entropy in bits, after discounting patterns. */
export function passwordEntropy(password: string): number {
  if (!password) return 0
  return effectiveLength(password) * Math.log2(Math.max(poolSize(password), 1))
}

/**
 * 0 (very weak) … 4 (very strong). Common passwords score 0; short ones are
 * capped (under 6 chars → at most 1, under 8 → at most 2).
 */
export function scorePassword(password: string): MlPasswordScore {
  if (!password) return 0
  if (isCommonPassword(password)) return 0
  const bits = passwordEntropy(password)
  let score: MlPasswordScore = bits < 25 ? 0 : bits < 40 ? 1 : bits < 60 ? 2 : bits < 80 ? 3 : 4
  const length = [...password].length
  if (length < 6) score = Math.min(score, 1) as MlPasswordScore
  else if (length < 8) score = Math.min(score, 2) as MlPasswordScore
  return score
}

/** Normalise the component's `rules` prop. */
export function resolvePasswordRules(rules: boolean | MlPasswordRules | undefined): MlPasswordRules | undefined {
  if (!rules) return undefined
  return rules === true ? DEFAULT_PASSWORD_RULES : rules
}

/** Which of the requested rules the password meets, in a fixed order. */
export function checkPasswordRules(password: string, rules: MlPasswordRules): MlPasswordRuleResult[] {
  const chars = [...password]
  const out: MlPasswordRuleResult[] = []
  if (rules.minLength) out.push({ key: 'length', ok: chars.length >= rules.minLength, min: rules.minLength })
  if (rules.upper) out.push({ key: 'upper', ok: chars.some(isUpper) })
  if (rules.lower) out.push({ key: 'lower', ok: chars.some(isLower) })
  if (rules.digit) out.push({ key: 'digit', ok: chars.some(isDigit) })
  if (rules.symbol) out.push({ key: 'symbol', ok: chars.some(isSymbol) })
  return out
}
