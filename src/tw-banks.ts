// 台灣金融機構代號（3 碼總代號）— framework-free, shared by MlBankPicker (Vue) and
// BankPicker (React). Nothing runs at import time, and the build puts this file in its own
// chunk (vite.config.ts `manualChunks`), so apps that never pick a bank don't ship the table.
//
// Source: 財金資訊股份有限公司「金融機構業務別代號」開放資料
// https://www.fisc.com.tw/TC/OPENDATA/Comm1_MEMBER.csv (downloaded 2026-10-04) — every institution
// taking part in 「通匯業務-入戶電匯」 (incoming transfers) except the central bank, the 票券金融公司
// (bills-finance houses) and the clearing / IT centres (600 農金資訊, 952, 995, 996, 997).
// Official names are exactly as FISC spells them (台 / 臺 mixed). The e-payment institutions
// (387–398) come from the same file's 「跨行自動化服務機器業務」 rows and are opt-in (kind 'epay').
//
// 農會 / 漁會 are not listed: their transfers go through 農金資訊 (600) with a 7-digit 機構代號 per
// 農漁會, which is not a 3-digit 總代號. Short names and search aliases are the common usage, not
// official; English names are the institutions' own and are left out where not certain.

export type TwBankKind = 'bank' | 'foreign' | 'coop' | 'post' | 'farm' | 'epay'

export interface TwBank {
  /** 3-digit 總代號, e.g. '822' (institutions added with registerTwBanks may use 3–7 digits). */
  code: string
  /** Official name as registered with FISC, e.g. 中國信託商業銀行. */
  name: string
  /** Common short name, e.g. 中國信託. */
  short: string
  /** English name, when known. */
  en?: string
  /**
   * `bank` 本國銀行 · `foreign` 外國銀行在台分行 · `coop` 信用合作社 · `post` 中華郵政 ·
   * `farm` 農會 / 漁會 (only those you add with registerTwBanks) · `epay` 電子支付機構 (opt-in).
   */
  kind: TwBankKind
  /** Extra search words: abbreviations, former / brand names, English short forms. */
  aliases: string[]
}

export interface TwBankOptions {
  /** Which kinds to include. Default every kind except `epay`. */
  kinds?: TwBankKind[]
}

export const TW_BANK_KINDS_DEFAULT: TwBankKind[] = ['bank', 'foreign', 'coop', 'post', 'farm']

// code, kind, official name, short name, English, aliases (space-separated)
const DATA: [string, TwBankKind, string, string, string, string][] = [
  ['004', 'bank', '臺灣銀行', '臺灣銀行', 'Bank of Taiwan', '臺銀 台銀 BOT'],
  ['005', 'bank', '臺灣土地銀行', '土地銀行', 'Land Bank of Taiwan', '土銀 LandBank'],
  ['006', 'bank', '合作金庫商業銀行', '合作金庫', 'Taiwan Cooperative Bank', '合庫 TCB'],
  ['007', 'bank', '第一商業銀行', '第一銀行', 'First Commercial Bank', '一銀 FirstBank'],
  ['008', 'bank', '華南商業銀行', '華南銀行', 'Hua Nan Commercial Bank', '華銀 HNCB'],
  ['009', 'bank', '彰化商業銀行', '彰化銀行', 'Chang Hwa Commercial Bank', '彰銀 CHB'],
  ['011', 'bank', '上海商業儲蓄銀行', '上海銀行', 'The Shanghai Commercial & Savings Bank', '上海商銀 SCSB'],
  ['012', 'bank', '台北富邦商業銀行', '台北富邦', 'Taipei Fubon Commercial Bank', '富邦 北富銀 Fubon'],
  ['013', 'bank', '國泰世華商業銀行', '國泰世華', 'Cathay United Bank', '國泰 Cathay CUB'],
  ['016', 'bank', '高雄銀行', '高雄銀行', 'Bank of Kaohsiung', '高銀'],
  ['017', 'bank', '兆豐國際商業銀行', '兆豐銀行', 'Mega International Commercial Bank', '兆豐 Mega'],
  ['018', 'bank', '全國農業金庫', '農業金庫', 'Agricultural Bank of Taiwan', '農金'],
  ['020', 'foreign', '日商瑞穗銀行台北分行', '瑞穗銀行', 'Mizuho Bank, Taipei Branch', '瑞穗 Mizuho'],
  ['021', 'bank', '花旗(台灣)商業銀行', '花旗銀行', 'Citibank Taiwan', '花旗 Citi'],
  ['022', 'foreign', '美國銀行台北分行', '美國銀行', 'Bank of America, Taipei Branch', '美銀 BofA'],
  ['023', 'foreign', '泰國盤谷銀行台北分行', '盤谷銀行', 'Bangkok Bank, Taipei Branch', '盤谷'],
  ['025', 'foreign', '菲律賓首都銀行台北分行', '首都銀行', 'Metropolitan Bank and Trust Company, Taipei Branch', 'Metrobank'],
  ['029', 'foreign', '新加坡商大華銀行台北分行', '大華銀行', 'United Overseas Bank, Taipei Branch', '大華 UOB'],
  ['030', 'foreign', '美商道富銀行台北分行', '道富銀行', 'State Street Bank and Trust Company, Taipei Branch', '道富'],
  ['037', 'foreign', '法商法國興業銀行台北分行', '法國興業銀行', 'Société Générale, Taipei Branch', '法興 SocGen'],
  ['039', 'foreign', '澳商澳盛銀行台北分行', '澳盛銀行', 'ANZ, Taipei Branch', '澳盛 ANZ'],
  ['048', 'bank', '王道商業銀行', '王道銀行', 'O-Bank', '王道 OBank'],
  ['050', 'bank', '臺灣中小企業銀行', '臺灣企銀', 'Taiwan Business Bank', '台企銀 企銀 中小企銀 TBB'],
  ['052', 'bank', '渣打國際商業銀行', '渣打銀行', 'Standard Chartered Bank (Taiwan)', '渣打 StanChart'],
  ['053', 'bank', '台中商業銀行', '台中銀行', 'Taichung Commercial Bank', '台中銀 TCBank'],
  ['054', 'bank', '京城商業銀行', '京城銀行', "King's Town Bank", '京城銀'],
  ['072', 'foreign', '德商德意志銀行台北分行', '德意志銀行', 'Deutsche Bank, Taipei Branch', '德銀'],
  ['075', 'foreign', '香港商東亞銀行台北分行', '東亞銀行', 'The Bank of East Asia, Taipei Branch', 'BEA'],
  ['076', 'foreign', '美商摩根大通銀行台北分行', '摩根大通銀行', 'JPMorgan Chase Bank, Taipei Branch', '摩根大通 JPMorgan'],
  ['081', 'bank', '匯豐(台灣)商業銀行', '匯豐銀行', 'HSBC Bank (Taiwan)', '匯豐 HSBC'],
  ['082', 'foreign', '法國巴黎銀行台北分行', '法國巴黎銀行', 'BNP Paribas, Taipei Branch', '法巴 BNP'],
  ['085', 'foreign', '新加坡商新加坡華僑銀行台北分行', '華僑銀行', 'OCBC Bank, Taipei Branch', '華僑 OCBC'],
  ['086', 'foreign', '法商東方匯理銀行台北分行', '東方匯理銀行', 'Crédit Agricole CIB, Taipei Branch', '東方匯理 CACIB'],
  ['092', 'foreign', '瑞士商瑞士銀行台北分行', '瑞士銀行', 'UBS AG, Taipei Branch', '瑞銀 UBS'],
  ['093', 'foreign', '荷商安智銀行台北分行', '安智銀行', 'ING Bank, Taipei Branch', '安智 ING'],
  ['098', 'foreign', '日商三菱日聯銀行台北分行', '三菱日聯銀行', 'MUFG Bank, Taipei Branch', '三菱日聯 MUFG'],
  ['101', 'bank', '瑞興商業銀行', '瑞興銀行', 'Taipei Star Bank', '瑞興'],
  ['102', 'bank', '華泰商業銀行', '華泰銀行', 'Hwatai Bank', '華泰'],
  ['103', 'bank', '臺灣新光商業銀行', '新光銀行', 'Shin Kong Commercial Bank', '新光 SKBank'],
  ['108', 'bank', '陽信商業銀行', '陽信銀行', 'Sunny Bank', '陽信'],
  ['114', 'coop', '基隆第一信用合作社', '基隆一信', '', ''],
  ['115', 'coop', '基隆市第二信用合作社', '基隆二信', '', ''],
  ['118', 'bank', '板信商業銀行', '板信銀行', 'Bank of Panhsin', '板信'],
  ['119', 'coop', '淡水第一信用合作社', '淡水一信', '', ''],
  ['130', 'coop', '新竹第一信用合作社', '新竹一信', '', ''],
  ['132', 'coop', '新竹第三信用合作社', '新竹三信', '', ''],
  ['146', 'coop', '台中市第二信用合作社', '台中二信', '', ''],
  ['147', 'bank', '三信商業銀行', '三信銀行', 'COTA Commercial Bank', '三信'],
  ['162', 'coop', '彰化第六信用合作社', '彰化六信', '', ''],
  ['204', 'coop', '高雄市第三信用合作社', '高雄三信', '', ''],
  ['215', 'coop', '花蓮第一信用合作社', '花蓮一信', '', ''],
  ['216', 'coop', '花蓮第二信用合作社', '花蓮二信', '', ''],
  ['321', 'foreign', '日商三井住友銀行台北分行', '三井住友銀行', 'Sumitomo Mitsui Banking Corporation, Taipei Branch', '三井住友 SMBC'],
  ['326', 'foreign', '西班牙商西班牙對外銀行臺北分行', '西班牙對外銀行', 'BBVA, Taipei Branch', 'BBVA'],
  ['329', 'foreign', '印尼商印尼人民銀行台北分行', '印尼人民銀行', 'Bank Rakyat Indonesia, Taipei Branch', 'BRI'],
  ['330', 'foreign', '韓商韓亞銀行台北分行', '韓亞銀行', '', '韓亞 Hana KEB'],
  ['380', 'foreign', '大陸商中國銀行臺北分行', '中國銀行', 'Bank of China, Taipei Branch', '中銀 BOC'],
  ['381', 'foreign', '大陸商交通銀行臺北分行', '交通銀行', 'Bank of Communications, Taipei Branch', '交行'],
  ['382', 'foreign', '大陸商中國建設銀行臺北分行', '中國建設銀行', 'China Construction Bank, Taipei Branch', '建設銀行 建行 CCB'],
  ['387', 'epay', '連加電子支付股份有限公司', '連加電子支付', '', 'LINE Pay'],
  ['388', 'epay', '全盈支付金融科技股份有限公司', '全盈支付', '', '全盈+PAY'],
  ['389', 'epay', '全支付電子支付股份有限公司', '全支付', '', 'PX Pay 全聯'],
  ['390', 'epay', '悠遊卡股份有限公司', '悠遊卡', '', '悠遊付 EasyCard'],
  ['391', 'epay', '一卡通票證股份有限公司', '一卡通', '', 'iPASS'],
  ['392', 'epay', '愛金卡股份有限公司', '愛金卡', '', 'icash'],
  ['395', 'epay', '橘子支行動支付股份有限公司', '橘子支', '', 'GAMA PAY'],
  ['396', 'epay', '街口電子支付股份有限公司', '街口支付', '', '街口 JKOPAY'],
  ['397', 'epay', '歐付寶電子支付股份有限公司', '歐付寶', '', "O'Pay allPay"],
  ['398', 'epay', '簡單行動支付股份有限公司', '簡單行動支付', '', 'ezPay'],
  ['700', 'post', '中華郵政股份有限公司', '中華郵政', 'Chunghwa Post', '郵局 郵政 Post'],
  ['803', 'bank', '聯邦商業銀行', '聯邦銀行', 'Union Bank of Taiwan', '聯邦 UBOT'],
  ['805', 'bank', '遠東國際商業銀行', '遠東商銀', 'Far Eastern International Bank', '遠銀 遠東銀行 FEIB Bankee'],
  ['806', 'bank', '元大商業銀行', '元大銀行', 'Yuanta Commercial Bank', '元大'],
  ['807', 'bank', '永豐商業銀行', '永豐銀行', 'Bank SinoPac', '永豐 SinoPac DAWHO'],
  ['808', 'bank', '玉山商業銀行', '玉山銀行', 'E.SUN Commercial Bank', '玉山 ESUN'],
  ['809', 'bank', '凱基商業銀行', '凱基銀行', 'KGI Commercial Bank', '凱基 KGI'],
  ['810', 'bank', '星展(台灣)商業銀行', '星展銀行', 'DBS Bank (Taiwan)', '星展 DBS'],
  ['812', 'bank', '台新國際商業銀行', '台新銀行', 'Taishin International Bank', '台新 Taishin Richart'],
  ['816', 'bank', '安泰商業銀行', '安泰銀行', 'EnTie Commercial Bank', '安泰'],
  ['822', 'bank', '中國信託商業銀行', '中國信託', 'CTBC Bank', '中信 中信銀 CTBC'],
  ['823', 'bank', '將來商業銀行', '將來銀行', 'Next Commercial Bank', '將來 Next Bank'],
  ['824', 'bank', '連線商業銀行', 'LINE Bank', 'LINE Bank Taiwan', '連線銀行 連線 LINEBank'],
  ['826', 'bank', '樂天國際商業銀行', '樂天銀行', 'Rakuten International Commercial Bank', '樂天 Rakuten'],
]

let table: TwBank[] | undefined
let added: TwBank[] = []

function all(): TwBank[] {
  if (table) return table
  const own = DATA.map(([code, kind, name, short, en, aliases]) => {
    const bank: TwBank = { code, name, short, kind, aliases: aliases ? aliases.split(' ') : [] }
    if (en) bank.en = en
    return bank
  })
  const codes = new Set(added.map((b) => b.code))
  table = [...own.filter((b) => !codes.has(b.code)), ...added].sort((a, b) => a.code.localeCompare(b.code))
  return table
}

/** An institution you add yourself: a 農會 / 漁會 (7-digit 農金 codes), or a fix to a built-in one. */
export interface TwBankInput {
  /** 3–7 digits. */
  code: string
  name: string
  short?: string
  en?: string
  /** Default `farm`. */
  kind?: TwBankKind
  aliases?: string[]
}

/**
 * Add institutions app-wide — typically the 農會 / 漁會 your users bank with, which use 7-digit
 * codes through 農金資訊 (600) and aren't shipped. A code that already exists is replaced.
 * Call once at start-up; MlBankPicker / BankPicker, searchTwBanks and twBankCodeRule all see them.
 */
export function registerTwBanks(banks: TwBankInput[]) {
  const next = new Map(added.map((b) => [b.code, b]))
  for (const b of banks) {
    const code = squash(String(b.code))
    if (!/^\d{3,7}$/.test(code)) throw new Error(`registerTwBanks: "${b.code}" is not a 3–7 digit code`)
    const bank: TwBank = { code, name: b.name, short: b.short ?? b.name, kind: b.kind ?? 'farm', aliases: b.aliases ?? [] }
    if (b.en) bank.en = b.en
    next.set(code, bank)
  }
  added = [...next.values()]
  table = undefined
}

/** 台 → 臺, full-width → half-width, lower-case, drop spaces and punctuation — for matching only. */
function squash(text: string): string {
  return text
    .replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/台/g, '臺')
    .toLowerCase()
    .replace(/[\s'’.,()（）&+\-]/g, '')
}

const keysOf = (b: TwBank) => [b.name, b.short, b.en ?? '', ...b.aliases].map(squash).filter(Boolean)

/** Every institution, sorted by code. Default kinds: bank, foreign, coop, post (no e-payment). */
export function getTwBanks(options: TwBankOptions = {}): TwBank[] {
  const kinds = options.kinds ?? TW_BANK_KINDS_DEFAULT
  return all().filter((b) => kinds.includes(b.kind))
}

/** One institution by its 3-digit code (any kind; '822', 822 and '０２２' all work). */
export function getTwBank(code: string | number): TwBank | undefined {
  const key = squash(String(code)).padStart(3, '0')
  return all().find((b) => b.code === key)
}

/** Is this a known 3-digit 總代號 (of the given kinds; default all kinds)? Strings must have 3 digits. */
export function isKnownTwBankCode(code: string | number, options: TwBankOptions = {}): boolean {
  if (typeof code === 'string' && !/^\d{3,7}$/.test(squash(code))) return false
  const bank = getTwBank(code)
  return !!bank && (!options.kinds || options.kinds.includes(bank.kind))
}

/** Does `query` match? Every word must hit the code prefix or a name / short name / English name / alias. */
export function matchTwBank(bank: TwBank, query: string): boolean {
  const tokens = query.trim().split(/[\s,，、/]+/).filter(Boolean)
  if (!tokens.length) return false
  const keys = keysOf(bank)
  return tokens.every((token) => {
    const t = squash(token)
    if (!t) return true
    if (/^\d+$/.test(t)) return bank.code.startsWith(t)
    return keys.some((k) => k.includes(t))
  })
}

/**
 * Search by code prefix, Chinese (台 or 臺), English or a common abbreviation —
 * 「822」「中信」「國泰」「Cathay」「郵局」. Exact code and name-prefix hits come first.
 */
export function searchTwBanks(query: string, options: TwBankOptions & { limit?: number } = {}): TwBank[] {
  const q = squash(query)
  if (!q) return []
  const rank = (b: TwBank) => {
    if (b.code === q) return 0
    const keys = keysOf(b)
    if (keys.includes(q)) return 1
    if (keys.some((k) => k.startsWith(q)) || b.code.startsWith(q)) return 2
    return 3
  }
  const hits = getTwBanks(options)
    .filter((b) => matchTwBank(b, query))
    .map((b, i) => ({ b, i, r: rank(b) }))
    .sort((x, y) => x.r - y.r || x.i - y.i)
    .map((x) => x.b)
  return options.limit ? hits.slice(0, options.limit) : hits
}

/** 「822 中國信託商業銀行」 / 「822 CTBC Bank」 (falls back to Chinese without an English name). */
export function formatTwBank(bank: TwBank, options: { lang?: 'zh' | 'en'; short?: boolean; code?: boolean } = {}): string {
  const name = options.lang === 'en' && bank.en ? bank.en : options.short ? bank.short : bank.name
  return options.code === false ? name : `${bank.code} ${name}`
}

/** Account number → digits only (full-width digits, spaces and dashes are dropped). */
export function normalizeTwBankAccount(value: string): string {
  return String(value ?? '')
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/\D/g, '')
}

/** Digits in groups of 4 for display: `'12345678901234'` → `'1234 5678 9012 34'`. */
export function formatTwBankAccount(value: string, groupSize = 4): string {
  const digits = normalizeTwBankAccount(value)
  return digits.replace(new RegExp(`(\\d{${groupSize}})(?=\\d)`, 'g'), '$1 ')
}
