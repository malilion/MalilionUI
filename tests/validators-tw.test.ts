// Taiwan validators: checksums, phone numbering plan, e-invoice carriers, postal codes,
// the ready-made form rules, and the rules inside a Vue MlForm.
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, reactive, ref } from 'vue'
import { MlForm, MlFormItem, MlInput, en, validateValue, zhTW } from '../src'
import MlConfigProvider from '../src/components/MlConfigProvider.vue'
import {
  formatTwMobile,
  formatTwPhone,
  isKnownTwPostalCode,
  isTwBusinessId,
  isTwCitizenCert,
  isTwLandline,
  isTwMobile,
  isTwMobileBarcode,
  isTwNationalId,
  isTwPersonalId,
  isTwPhone,
  isTwPostalCode,
  isTwResidentId,
  normalizeTwBusinessId,
  normalizeTwCarrier,
  normalizeTwId,
  normalizeTwPhone,
  normalizeTwPostalCode,
  parseTwPhone,
  twKnownPostalCodeRule,
  twRules,
} from '../src/validators-tw'
import * as vueEntry from '../src'

/* ── test-data generators (independent re-statement of the published algorithms) ── */

// Letter codes from the 內政部 table: A=10 … H=17, I=34, J=18 … N=22, O=35, P=23 … V=29, W=32, X=30, Y=31, Z=33.
const CODES: Record<string, number> = {
  A: 10, B: 11, C: 12, D: 13, E: 14, F: 15, G: 16, H: 17, I: 34, J: 18, K: 19, L: 20, M: 21,
  N: 22, O: 35, P: 23, Q: 24, R: 25, S: 26, T: 27, U: 28, V: 29, W: 32, X: 30, Y: 31, Z: 33,
}

/** Append the check digit to letter + 2nd value + 7 serial digits. */
function withCheck(letter: string, second: string, serial: string, secondValue = Number(second)) {
  const code = CODES[letter]
  let sum = Math.floor(code / 10) + (code % 10) * 9 + secondValue * 8
  for (let i = 0; i < 7; i++) sum += Number(serial[i]) * (7 - i)
  return `${letter}${second}${serial}${(10 - (sum % 10)) % 10}`
}
const nationalId = (letter: string, gender: '1' | '2', serial: string) => withCheck(letter, gender, serial)
const newResident = (letter: string, gender: '8' | '9', serial: string) => withCheck(letter, gender, serial)
const oldResident = (letter: string, second: 'A' | 'B' | 'C' | 'D', serial: string) =>
  withCheck(letter, second, serial, CODES[second] % 10)

/** Flip the last digit to something else → wrong checksum. */
const breakCheck = (id: string) => id.slice(0, -1) + ((Number(id.slice(-1)) + 1) % 10)

/** Every 8th digit that completes a 統編 under the 10 or 5 rule. */
function ubnCompletions(seven: string, divisor: 5 | 10) {
  const w = [1, 2, 1, 2, 1, 2, 4, 1]
  const out: string[] = []
  for (let d = 0; d <= 9; d++) {
    const id = seven + d
    const sums = [0, 0]
    for (let i = 0; i < 8; i++) {
      const p = Number(id[i]) * w[i]
      if (i === 6 && id[i] === '7') {
        sums[0] += 1 // 28 → 10 → 1
        sums[1] += 0 // … or 0
      } else {
        const s = Math.floor(p / 10) + (p % 10)
        sums[0] += s
        sums[1] += s
      }
    }
    if (sums.some((s) => s % divisor === 0)) out.push(id)
  }
  return out
}

/* ── 身分證字號 / 統一證號 ─────────────────────────────────── */

describe('isTwNationalId', () => {
  it('accepts generated IDs for every letter (incl. the I/O/W/Z quirks) and both genders', () => {
    for (const letter of Object.keys(CODES)) {
      for (const gender of ['1', '2'] as const) {
        for (const serial of ['0000000', '2345678', '9999999', '1357924']) {
          const id = nationalId(letter, gender, serial)
          expect(isTwNationalId(id), id).toBe(true)
          expect(isTwNationalId(breakCheck(id)), breakCheck(id)).toBe(false)
        }
      }
    }
  })

  it('pins the letter table with hand-computed IDs', () => {
    // A123456789 is the classic textbook example: 1 + 0·9 + 1·8 + 2·7 + … + 8·1 + 9 = 130.
    expect(isTwNationalId('A123456789')).toBe(true)
    // I=34, O=35, W=32, Z=33 are the out-of-order letters.
    expect(nationalId('I', '1', '2345678')).toBe('I123456781')
    expect(nationalId('O', '1', '2345678')).toBe('O123456782')
    expect(nationalId('W', '1', '2345678')).toBe('W123456789')
    expect(nationalId('Z', '1', '2345678')).toBe('Z123456780')
    // Using the naive A=10…Z=35 order would make these invalid.
    expect(isTwNationalId('I123456781')).toBe(true)
    expect(isTwNationalId('W123456789')).toBe(true)
    expect(isTwNationalId('I123456786')).toBe(false)
  })

  it('normalizes case, spaces, dashes and full-width characters', () => {
    expect(isTwNationalId(' a123456789 ')).toBe(true)
    expect(isTwNationalId('A123-456-789')).toBe(true)
    expect(isTwNationalId('Ａ１２３４５６７８９')).toBe(true)
    expect(normalizeTwId(' ａ123 456 789')).toBe('A123456789')
  })

  it('rejects bad shapes', () => {
    for (const bad of ['', 'A12345678', 'A1234567890', 'A323456789', 'A823456789', '1123456789', 'AA23456789', 'A12345678X']) {
      expect(isTwNationalId(bad), bad).toBe(false)
    }
    expect(isTwNationalId(null as unknown as string)).toBe(false)
    expect(isTwNationalId(123 as unknown as string)).toBe(false)
  })
})

describe('isTwResidentId', () => {
  const fresh = [newResident('A', '8', '0012345'), newResident('F', '9', '9876543'), newResident('Z', '8', '7000001')]
  const legacy = [oldResident('A', 'A', '1234567'), oldResident('F', 'C', '0000001'), oldResident('Y', 'D', '7654321'), oldResident('I', 'B', '2222222')]

  it('accepts the new (2021+) and old formats by default', () => {
    for (const id of [...fresh, ...legacy]) {
      expect(isTwResidentId(id), id).toBe(true)
      expect(isTwResidentId(breakCheck(id)), breakCheck(id)).toBe(false)
    }
  })

  it('format option restricts to one generation', () => {
    for (const id of fresh) {
      expect(isTwResidentId(id, { format: 'new' })).toBe(true)
      expect(isTwResidentId(id, { format: 'old' })).toBe(false)
    }
    for (const id of legacy) {
      expect(isTwResidentId(id, { format: 'old' })).toBe(true)
      expect(isTwResidentId(id, { format: 'new' })).toBe(false)
    }
  })

  it('old-format 2nd letter counts as the units digit of its code', () => {
    // FA: F=15 → 1 + 5·9 = 46; A=10 → 0·8.  Serial 1234567 → 7·1+6·2+…+1·7 = 84 → sum 130 → check 0.
    expect(oldResident('F', 'A', '1234567')).toBe('FA12345670')
    expect(isTwResidentId('fa1234567-0')).toBe(true)
    expect(isTwResidentId('FE12345670')).toBe(false) // E isn't a valid 2nd letter
  })

  it('national IDs are not resident IDs, but isTwPersonalId takes both', () => {
    expect(isTwResidentId('A123456789')).toBe(false)
    expect(isTwNationalId(fresh[0])).toBe(false)
    expect(isTwPersonalId('A123456789')).toBe(true)
    expect(isTwPersonalId(fresh[0])).toBe(true)
    expect(isTwPersonalId(legacy[0])).toBe(true)
    expect(isTwPersonalId(legacy[0], { format: 'new' })).toBe(false)
    expect(isTwPersonalId('A123456788')).toBe(false)
  })
})

/* ── 統一編號 ─────────────────────────────────────────── */

describe('isTwBusinessId', () => {
  // The three worked examples in 財政部財政資訊中心「營利事業統一編號檢查碼邏輯修正說明」附件.
  const official = ['04595257', '10458575', '19312376']

  it('accepts the official examples under both rules', () => {
    for (const id of official) {
      expect(isTwBusinessId(id), id).toBe(true)
      expect(isTwBusinessId(id, { legacy: true }), id).toBe(true)
    }
  })

  it('implements the 2023 divisible-by-5 rule, legacy keeps divisible-by-10', () => {
    // 04595252: same as 04595257 with check digit −5 → sum 35: divisible by 5, not by 10.
    expect(isTwBusinessId('04595252')).toBe(true)
    expect(isTwBusinessId('04595252', { legacy: true })).toBe(false)
    // sums 41, 42, 33, 34, 36 → neither rule.
    for (const id of ['04595258', '04595259', '04595250', '04595251', '04595253']) expect(isTwBusinessId(id), id).toBe(false)
  })

  it('handles the 7th-digit-7 special case (product 28 counts as 1 or 0)', () => {
    // 1045857?: Z1 = 16 + d, Z2 = 15 + d. Old rule: d = 4 (Z1 20) or 5 (Z2 20); new rule adds 0 and 9.
    expect(ubnCompletions('1045857', 10)).toEqual(['10458574', '10458575'])
    expect(ubnCompletions('1045857', 5)).toEqual(['10458570', '10458574', '10458575', '10458579'])
    for (const id of ubnCompletions('1045857', 5)) expect(isTwBusinessId(id), id).toBe(true)
    expect(isTwBusinessId('10458572')).toBe(false)
  })

  it('agrees with an independent re-implementation over many prefixes', () => {
    let seed = 7
    const rand = () => (seed = (seed * 48271) % 2147483647)
    for (let n = 0; n < 400; n++) {
      // Force the special case for a quarter of them.
      const digits = Array.from({ length: 7 }, () => String(rand() % 10))
      if (n % 4 === 0) digits[6] = '7'
      const seven = digits.join('')
      for (const divisor of [5, 10] as const) {
        const ok = new Set(ubnCompletions(seven, divisor))
        for (let d = 0; d <= 9; d++) {
          expect(isTwBusinessId(seven + d, { legacy: divisor === 10 }), `${seven}${d} /${divisor}`).toBe(ok.has(seven + d))
        }
      }
    }
  })

  it('rejects bad shapes and normalizes separators', () => {
    for (const bad of ['', '1234567', '123456789', '0459525A', '04 59 52 5']) expect(isTwBusinessId(bad), bad).toBe(false)
    expect(isTwBusinessId('0459-5257')).toBe(true)
    expect(isTwBusinessId('０４５９５２５７')).toBe(true)
    expect(normalizeTwBusinessId(' 0459 5257 ')).toBe('04595257')
  })
})

/* ── 電話 ─────────────────────────────────────────────── */

describe('phone numbers', () => {
  it('mobile: 09 + 8 digits in common spellings', () => {
    for (const ok of ['0912345678', '0912-345-678', '0912 345 678', '+886912345678', '+886 912 345 678', '+886-0912-345-678', '886912345678', '00886912345678', '０９１２３４５６７８']) {
      expect(isTwMobile(ok), ok).toBe(true)
    }
    for (const bad of ['', '091234567', '09123456789', '0812345678', '912345678', '0912345678#1', '+1 912 345 678', 'abc', '0912-345-67a']) {
      expect(isTwMobile(bad), bad).toBe(false)
    }
  })

  it('landline: every area code with its local length (數位發展部號碼計畫)', () => {
    const ok = [
      '02-2345-6789', '(02)2771-8888', '02 8765 4321', // 臺北 8 digits
      '03-425-1234', '03-5712121', '03-8234567', '03-9321234', // 桃園 新竹 花蓮 宜蘭
      '037-323456', // 苗栗 6
      '04-2345-6789', '04-7123456', // 臺中 8 / 彰化 7
      '049-2345678', // 南投 7
      '05-2345678', '05-5345678', // 嘉義 / 雲林
      '06-2345678', '06-9271234', // 臺南 / 澎湖
      '07-3456789', // 高雄
      '08-7654321', // 屏東
      '089-321234', // 臺東 6
      '082-312345', // 金門 6
      '0826-61234', // 烏坵 5
      '0836-22345', // 馬祖 5
      '+886 2 2345 6789', '+886-7-345-6789',
    ]
    for (const n of ok) expect(isTwLandline(n), n).toBe(true)
    const bad = [
      '02-345-6789', // 02 needs 8 digits
      '02-9345-6789', // 市話首碼 9 reserved
      '02-1234-5678', // locals never start with 0/1
      '037-1234567', // 037 is 6 digits
      '04-5234567', // 04 首碼 5~6 reserved
      '05-8234567', // 05 首碼 8~9 reserved
      '06-8234567', // 06 首碼 8 reserved
      '08-2345678' + '9', // too long
      '0826-71234', // 烏坵 only 6xxxx
      '010-1234567', '0123456789', '0912345678', '', '02', 'hello',
    ]
    for (const n of bad) expect(isTwLandline(n), n).toBe(false)
  })

  it('extensions', () => {
    expect(isTwLandline('02-2345-6789#123')).toBe(true)
    expect(isTwLandline('02-2345-6789 ext. 123')).toBe(true)
    expect(isTwLandline('02-2345-6789 分機 45')).toBe(true)
    expect(isTwLandline('02-2345-6789 x9')).toBe(true)
    expect(isTwLandline('02-2345-6789#123', { extension: false })).toBe(false)
    expect(isTwLandline('02-2345-6789#')).toBe(false)
    expect(normalizeTwPhone('+886 (2) 2345-6789 分機 12')).toBe('0223456789#12')
  })

  it('parseTwPhone splits the parts', () => {
    expect(parseTwPhone('(037) 32-3456 #8')).toEqual({ type: 'landline', area: '037', local: '323456', extension: '8', number: '037323456' })
    expect(parseTwPhone('0836-22345')).toMatchObject({ area: '0836', local: '22345' })
    expect(parseTwPhone('03-7323456')).toMatchObject({ area: '037', local: '323456' }) // 03 7… is 苗栗
    expect(parseTwPhone('0912 345 678')).toEqual({ type: 'mobile', area: '09', local: '12345678', extension: '', number: '0912345678' })
    expect(parseTwPhone('nope')).toBeNull()
  })

  it('isTwPhone takes either', () => {
    expect(isTwPhone('0912345678')).toBe(true)
    expect(isTwPhone('02-2345-6789')).toBe(true)
    expect(isTwPhone('12345')).toBe(false)
  })

  it('formatters', () => {
    expect(formatTwMobile('0912345678')).toBe('0912-345-678')
    expect(formatTwMobile('+886912345678')).toBe('0912-345-678')
    expect(formatTwMobile('0912345678', { international: true })).toBe('+886 912 345 678')
    expect(formatTwMobile('0212345678')).toBe('0212345678') // not a mobile → unchanged
    expect(formatTwPhone('0223456789')).toBe('02-2345-6789')
    expect(formatTwPhone('0223456789#12', { parens: true })).toBe('(02) 2345-6789 #12')
    expect(formatTwPhone('073456789')).toBe('07-345-6789')
    expect(formatTwPhone('037323456')).toBe('037-323-456')
    expect(formatTwPhone('083622345')).toBe('0836-22345')
    expect(formatTwPhone('0912345678')).toBe('0912-345-678')
    expect(formatTwPhone('garbage')).toBe('garbage')
  })
})

/* ── 載具 / 郵遞區號 ─────────────────────────────────── */

describe('e-invoice carriers', () => {
  it('手機條碼: / + 7 of [0-9A-Z.+-]', () => {
    for (const ok of ['/ABC+123', '/1234567', '/A.B-C+D', '/abc+123', ' /ABCDEFG ']) expect(isTwMobileBarcode(ok), ok).toBe(true)
    for (const bad of ['', 'ABC+1234', '/ABC+12', '/ABC+1234', '/ABC 123', '/ABC_123', '/ABC*123', '//ABC123']) {
      expect(isTwMobileBarcode(bad), bad).toBe(false)
    }
    expect(normalizeTwCarrier(' /abc-12+ ')).toBe('/ABC-12+')
  })

  it('自然人憑證條碼: 2 letters + 14 digits', () => {
    for (const ok of ['AB12345678901234', 'ab12345678901234', 'ＡＢ12345678901234']) expect(isTwCitizenCert(ok), ok).toBe(true)
    for (const bad of ['', 'A123456789012345', 'AB1234567890123', 'AB123456789012345', '1212345678901234', 'AB1234567890123X']) {
      expect(isTwCitizenCert(bad), bad).toBe(false)
    }
  })
})

describe('postal codes', () => {
  it('3, 3+2 and 3+3 digit shapes', () => {
    for (const ok of ['100', '10001', '100001', '100-01', '100 001']) expect(isTwPostalCode(ok), ok).toBe(true)
    for (const bad of ['', '10', '1000', '1000011', '010', 'abc', '10a']) expect(isTwPostalCode(bad), bad).toBe(false)
    expect(isTwPostalCode('10001', { digits: 3 })).toBe(false)
    expect(isTwPostalCode('100001', { digits: [3, 6] })).toBe(true)
    expect(normalizeTwPostalCode('１００-０１')).toBe('10001')
  })

  it('isKnownTwPostalCode checks the 中華郵政 table', () => {
    expect(isKnownTwPostalCode('100')).toBe(true)
    expect(isKnownTwPostalCode('300')).toBe(true)
    expect(isKnownTwPostalCode('817')).toBe(true) // 東沙群島 counts
    expect(isKnownTwPostalCode('106001')).toBe(true)
    expect(isKnownTwPostalCode('101')).toBe(false)
    expect(isKnownTwPostalCode('999')).toBe(false)
    expect(isKnownTwPostalCode('1x0')).toBe(false)
  })
})

/* ── rules ────────────────────────────────────────────── */

describe('twRules', () => {
  const run = (rule: ReturnType<typeof twRules.nationalId>, value: unknown, locale = zhTW) => validateValue(value, [rule], {}, locale)

  it('pass on valid or empty values, fail with the localized message', async () => {
    const cases: [keyof typeof twRules, string, string, string, string][] = [
      ['nationalId', 'A123456789', 'A123456788', '身分證字號格式不正確', 'Invalid Taiwan ID number'],
      ['residentId', 'FA12345670', 'A123456789', '居留證號（統一證號）格式不正確', 'Invalid resident certificate (UI) number'],
      ['personalId', 'FA12345670', 'X', '身分證字號或居留證號格式不正確', 'Invalid ID or resident certificate number'],
      ['businessId', '04595257', '04595258', '統一編號格式不正確', 'Invalid business ID (UBN)'],
      ['mobile', '0912-345-678', '0212345678', '手機號碼格式不正確', 'Invalid mobile number'],
      ['landline', '02-2345-6789', '0912345678', '市話號碼格式不正確', 'Invalid landline number'],
      ['phone', '0912345678', '123', '電話號碼格式不正確', 'Invalid phone number'],
      ['mobileBarcode', '/ABC+123', 'ABC+123', '手機條碼格式不正確', 'Invalid mobile barcode'],
      ['citizenCert', 'AB12345678901234', 'AB123', '自然人憑證條碼格式不正確', 'Invalid citizen certificate barcode'],
      ['postalCode', '106', '1060', '郵遞區號格式不正確', 'Invalid postal code'],
    ]
    for (const [name, good, bad, zh, enMsg] of cases) {
      const rule = twRules[name]()
      expect(await run(rule, good), name).toBeUndefined()
      expect(await run(rule, ''), name).toBeUndefined()
      expect(await run(rule, null), name).toBeUndefined()
      expect(await run(rule, bad), name).toBe(zh)
      expect(await run(rule, bad, en), name).toBe(enMsg)
    }
  })

  it('options pass through, message overrides', async () => {
    expect(await run(twRules.businessId({ legacy: true }), '04595252')).toBe('統一編號格式不正確')
    expect(await run(twRules.businessId(), '04595252')).toBeUndefined()
    expect(await run(twRules.residentId({ format: 'new' }), 'FA12345670')).toBe('居留證號（統一證號）格式不正確')
    expect(await run(twRules.landline({ extension: false }), '02-2345-6789#1')).toBe('市話號碼格式不正確')
    expect(await run(twRules.postalCode({ digits: 3 }), '10001')).toBe('郵遞區號格式不正確')
    expect(await run(twRules.nationalId({ message: '請輸入正確的身分證' }), 'X')).toBe('請輸入正確的身分證')
    expect(await run(twRules.nationalId({ message: '請輸入正確的身分證' }), 'X', en)).toBe('請輸入正確的身分證')
  })

  it('required still comes first, and a custom locale without twValidate falls back', async () => {
    expect(await validateValue('', [{ required: true }, twRules.nationalId()], {}, zhTW)).toBe('此欄位為必填')
    const bare = { ...en, twValidate: undefined } as unknown as typeof en
    expect(await run(twRules.nationalId(), 'X', bare)).toBe('Invalid format')
  })

  it('twKnownPostalCodeRule after twRules.postalCode', async () => {
    const rules = [twRules.postalCode(), twKnownPostalCodeRule()]
    expect(await validateValue('1x', rules, {}, zhTW)).toBe('郵遞區號格式不正確')
    expect(await validateValue('101', rules, {}, zhTW)).toBe('查無此郵遞區號')
    expect(await validateValue('101', rules, {}, en)).toBe('Unknown postal code')
    expect(await validateValue('100', rules, {}, zhTW)).toBeUndefined()
    expect(await validateValue('', rules, {}, zhTW)).toBeUndefined()
  })

  it('is exported from @malilion/ui', () => {
    for (const name of ['twRules', 'twKnownPostalCodeRule', 'isTwNationalId', 'isTwBusinessId', 'formatTwPhone', 'isKnownTwPostalCode']) {
      expect(name in vueEntry, name).toBe(true)
    }
  })
})

/* ── Vue MlForm ───────────────────────────────────────── */

describe('twRules in MlForm', () => {
  function setup(locale?: typeof en) {
    const model = reactive({ id: 'A123456788', ubn: '04595257', phone: '12345' })
    const form = ref<InstanceType<typeof MlForm>>()
    const content = () =>
      h(
        MlForm,
        {
          ref: form,
          model,
          rules: {
            id: [{ required: true }, twRules.nationalId()],
            ubn: twRules.businessId(),
            phone: twRules.phone(),
          },
        },
        () => [
          h(MlFormItem, { prop: 'id' }, () => h(MlInput, { label: 'ID', modelValue: model.id, 'onUpdate:modelValue': (v: string | number | undefined) => (model.id = String(v ?? '')) })),
          h(MlFormItem, { prop: 'ubn' }, () => h(MlInput, { label: 'UBN', modelValue: model.ubn })),
          h(MlFormItem, { prop: 'phone' }, () => h(MlInput, { label: 'Phone', modelValue: model.phone })),
        ],
      )
    const wrapper = locale
      ? mount(MlConfigProvider, { props: { locale }, slots: { default: content } })
      : mount(defineComponent({ setup: () => content }))
    return { model, form, wrapper }
  }
  const errorOf = (w: ReturnType<typeof mount>, prop: string) => w.find(`[data-prop="${prop}"] .ml-field__error`)

  it('validate() shows the zh-TW messages and clears them once fixed', async () => {
    const { model, form, wrapper } = setup()
    expect(await form.value!.validate()).toBe(false)
    await nextTick()
    expect(errorOf(wrapper, 'id').text()).toBe('身分證字號格式不正確')
    expect(errorOf(wrapper, 'ubn').exists()).toBe(false)
    expect(errorOf(wrapper, 'phone').text()).toBe('電話號碼格式不正確')
    model.id = 'A123456789'
    model.phone = '(02) 2345-6789'
    expect(await form.value!.validate()).toBe(true)
    await nextTick()
    expect(wrapper.find('.ml-field__error').exists()).toBe(false)
    wrapper.unmount()
  })

  it('follows MlConfigProvider locale', async () => {
    const { form, wrapper } = setup(en)
    expect(await form.value!.validate()).toBe(false)
    await nextTick()
    expect(errorOf(wrapper, 'id').text()).toBe('Invalid Taiwan ID number')
    expect(errorOf(wrapper, 'phone').text()).toBe('Invalid phone number')
    wrapper.unmount()
  })
})
