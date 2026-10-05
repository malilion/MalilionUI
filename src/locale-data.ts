// Locale strings only — no framework imports, so the React build can share them.
import type { CuteIconName } from './components/cute-icons'
/**
 * Every piece of built-in UI text. Ship your own by copying `zhTW` or `en`
 * and passing it to <MlConfigProvider :locale> or `app.use(MalilionUI, { locale })`.
 */
export interface MlLocale {
  /** BCP 47 tag, also used for date / number formatting. */
  name: string
  common: {
    close: string
    clear: string
    remove: (label: string) => string
    search: string
    confirm: string
    cancel: string
    now: string
    loading: string
    choose: string
    noMatch: string
    prev: string
    next: string
    decrease: string
    increase: string
  }
  status: { online: string; busy: string; away: string; offline: string }
  mascot: string
  nav: {
    breadcrumb: string
    pagination: string
    page: (n: number) => string
    prevPage: string
    nextPage: string
    menu: string
    tabBar: string
    closeTab: (label: string) => string
    addTab: string
    scrollTabsPrev: string
    scrollTabsNext: string
    steps: string
    stepDone: string
    stepCurrent: string
    anchor: string
    backTop: string
    back: string
  }
  carousel: { label: string; prev: string; next: string; play: string; pause: string; slide: (n: number) => string }
  calendar: { prevMonth: string; nextMonth: string; prevYear: string; nextYear: string; prevDecade: string; nextDecade: string }
  date: {
    pick: string
    clear: string
    rangeStart: string
    rangeEnd: string
    pickRange: string
    clearRange: string
    presets: string
    today: string
    last7: string
    last30: string
    thisMonth: string
    lastMonth: string
    days: (n: number) => string
    pickEnd: (start: string) => string
    pickStart: string
    pickTime: string
    clearTime: string
    pickDateTime: string
    clearDateTime: string
    time: string
    timeFirst: string
    units: { h: string; m: string; s: string }
    /** Republic of China (民國) era labels for `calendar="roc"`. */
    roc: { era: string; before: string }
    /** Month / quarter / year picking (MlDatePicker / MlDateRangePicker `type`). */
    period: {
      /** Display of a chosen period; `month` is 1–12, `quarter` 1–4. */
      month: (year: number, month: number) => string
      quarter: (year: number, quarter: number) => string
      year: (year: number) => string
      /** Cell label in the quarter panel. */
      quarterCell: (quarter: number) => string
      /** Title of the year panel. */
      decade: (from: number, to: number) => string
      pick: { month: string; quarter: string; year: string }
      clear: { month: string; quarter: string; year: string }
      rangeStart: { month: string; year: string }
      rangeEnd: { month: string; year: string }
      pickRange: { month: string; year: string }
      clearRange: { month: string; year: string }
      pickStart: { month: string; year: string }
      pickEnd: (start: string) => string
      /** Length badge of a chosen range. */
      count: (n: number, type: 'month' | 'year') => string
    }
  }
  countdown: { label: string; days: string; hours: string; minutes: string; seconds: string }
  color: {
    pick: string
    clear: string
    area: string
    areaValue: (s: number, v: number) => string
    hue: string
    alpha: string
    hex: string
    presets: string
  }
  cascader: { placeholder: string }
  region: { county: string; district: string; zip: string; pickCounty: string; pickDistrict: string; search: string }
  tagInput: {
    placeholder: string
    added: (label?: string) => string
    clearAll: string
    max: (n: number) => string
    duplicate: (tag: string) => string
    invalid: (tag: string) => string
  }
  pin: { digit: (i: number, total: number) => string }
  autocomplete: { empty: string; searching: string }
  command: { placeholder: string; empty: string; dialog: string; list: string; move: string; run: string }
  contextMenu: string
  dialog: { ok: string }
  empty: { title: string }
  table: {
    empty: string
    selectAll: string
    selectRow: (n: number) => string
    expand: string
    collapse: string
    expandRow: (n: number) => string
    total: (n: number) => string
  }
  transfer: {
    titles: [string, string]
    filter: string
    empty: string
    noMatch: string
    selectAll: (title: string) => string
    searchIn: (title: string) => string
    moveTo: (title: string) => string
    moveBack: (title: string) => string
  }
  tree: { empty: string }
  upload: { title: string; or: string; browse: string }
  image: { error: string; failed: (alt: string) => string; zoomIn: (alt: string) => string }
  preview: {
    label: string
    close: string
    toolbar: string
    zoomOut: string
    zoomIn: string
    rotate: string
    reset: string
    image: (n: number, total: number) => string
  }
  infinite: { loading: string; finished: string; more: string }
  ellipsis: { expand: string; collapse: string }
  skeleton: string
  splitter: string
  mention: { placeholder: (trigger: string) => string }
  sortable: { handle: string; moved: (label: string, pos: number, total: number) => string; grabbed: (label: string) => string; dropped: string }
  kanban: { empty: string; full: string; count: (n: number, limit?: number) => string }
  float: { open: string; close: string }
  banner: { close: string }
  chat: { log: string; latest: string; typing: string; placeholder: string; send: string; stop: string; status: { sending: string; sent: string; error: string } }
  tour: { step: (n: number, total: number) => string; prev: string; next: string; finish: string; skip: string }
  code: { copy: string; copied: string; expand: string; collapse: string; copiedToast: (file?: string) => string }
  terminal: { label: (title: string) => string; copy: string; copied: string; replay: string }
  /** MlPullRefresh: the head text for each state, and the keyboard / screen-reader button. */
  pullRefresh: { pulling: string; loosing: string; refreshing: string; success: string; fail: string; button: string }
  /** MlSwipeCell: the keyboard button that reveals the actions, and the action groups. */
  swipeCell: { more: string; moreFor: (title: string) => string; left: string; right: string }
  copy: { copy: string; copied: string; failed: string }
  json: {
    label: string
    search: string
    matches: (n: number) => string
    expandAll: string
    collapseAll: string
    keys: (n: number) => string
    items: (n: number) => string
    more: (n: number, rest: number) => string
    expandString: (hidden: number) => string
    collapseString: string
    circular: string
    parseError: (line: number, column: number) => string
    unexpected: (char: string) => string
    unexpectedEnd: string
    copiedPath: (path: string) => string
    copiedValue: string
    copyPath: string
    copyValue: string
    empty: string
  }
  markdown: { streaming: string }
  /** MlRichTextEditor (@malilion/ui/editor). */
  editor: {
    toolbar: string
    content: string
    placeholder: string
    tools: {
      paragraph: string
      h1: string
      h2: string
      h3: string
      bold: string
      italic: string
      underline: string
      strike: string
      code: string
      link: string
      bulletList: string
      orderedList: string
      blockquote: string
      codeBlock: string
      horizontalRule: string
      clear: string
      undo: string
      redo: string
    }
    linkUrl: string
    linkApply: string
    linkRemove: string
    linkInvalid: string
    count: (characters: number, max?: number) => string
  }
  diff: {
    label: string
    added: string
    removed: string
    stats: (added: number, removed: number) => string
    files: (n: number) => string
    expand: (n: number) => string
    prev: string
    next: string
    position: (current: number, total: number) => string
    view: string
    split: string
    unified: string
    noChanges: string
    noNewline: string
    binary: string
    table: (name: string) => string
    oldLine: string
    newLine: string
    oldCode: string
    newCode: string
    code: string
    status: { added: string; deleted: string; renamed: string; modified: string }
  }
  heatmap: { cell: (count: number, date: string) => string; summary: (total: number) => string; less: string; more: string }
  scatter: { summary: (series: number, points: number) => string; table: string; series: string; point: string; x: string; y: string; size: string; trend: (name: string) => string; toggle: (name: string) => string }
  funnel: { summary: (stages: number, rate: string) => string; value: string; fromPrev: string; fromFirst: string; drop: string; start: string }
  treemap: { summary: (items: number, total: string) => string; hint: string; table: string; group: string; item: string; value: string; share: string; ofGroup: string; selected: string }
  sankey: {
    summary: (nodes: number, links: number) => string
    hint: string
    table: string
    source: string
    target: string
    value: string
    incoming: string
    outgoing: string
    flow: (source: string, target: string) => string
    ofSource: string
  }
  gantt: {
    summary: (tasks: number) => string
    hint: string
    editHint: string
    table: string
    task: string
    group: string
    start: string
    end: string
    duration: string
    days: (n: number) => string
    progress: string
    milestone: string
    today: string
    /** Short month names, January first. */
    months: string[]
    /** Short weekday names, Sunday first. */
    weekdays: string[]
    monthTitle: (year: number, month: number) => string
    year: (year: number) => string
    expand: (group: string) => string
    collapse: (group: string) => string
    moved: (task: string, start: string, end: string) => string
  }
  candle: {
    summary: (candles: number) => string
    hint: string
    table: string
    time: string
    open: string
    high: string
    low: string
    close: string
    volume: string
    change: string
    ma: (period: number) => string
    zoomIn: string
    zoomOut: string
    reset: string
    range: (from: string, to: string) => string
  }
  taiwanMap: { summary: (counties: number, min: string, max: string) => string; cell: (county: string, value: string) => string; table: string; county: string; value: string; noData: string; less: string; more: string }
  bars: { summary: (mode: 'grouped' | 'stacked' | 'percent', series: number, categories: number) => string; table: string; category: string; total: string; share: string; toggle: (name: string) => string }
  rate: string
  wheel: { label: string; summary: (label: string, prizes: string[]) => string; spin: string; spinning: string; result: (prize: string) => string }
  pickerView: { label: string; column: (n: number) => string; cancel: string; confirm: string; selected: (labels: string[]) => string }
  toast: { region: string; close: string }
  theme: { label: string; switch: string; dark: string; light: string; system: string; toDark: string; toLight: string }
  qrcode: { tooLong: string; label: (value: string) => string }
  barcode: { invalid: string; label: (value: string) => string }
  avatarGroup: { label: string; more: (count: number) => string; showAll: (count: number) => string; collapse: string }
  amount: { capital: string }
  numberKeyboard: { label: string; delete: string; close: string; collapse: string }
  indexBar: { label: string; jump: (index: string) => string; empty: string }
  scheduler: {
    label: string
    today: string
    prev: string
    next: string
    week: string
    day: string
    allDay: string
    /** Keyboard help for editable schedulers. */
    hint: string
    moved: (title: string, when: string) => string
  }
  address: {
    label: string
    zip: string
    zipHint: string
    zipMismatch: string
    zipInvalid: string
    road: string
    roadPlaceholder: string
    section: string
    lane: string
    alley: string
    number: string
    floor: string
    room: string
    preview: string
    english: string
    pasteHint: string
  }
  filter: {
    label: string
    search: string
    reset: string
    more: (n: number) => string
    less: string
    all: string
    min: string
    max: string
    clear: (field: string) => string
    clearAll: string
    applied: (n: number) => string
  }
  query: {
    label: string
    and: string
    or: string
    combinator: string
    addRule: string
    addGroup: string
    removeRule: string
    removeGroup: string
    field: string
    operator: string
    value: string
    from: string
    to: string
    yes: string
    no: string
    empty: string
    ops: Record<'contains' | 'notContains' | 'eq' | 'neq' | 'startsWith' | 'endsWith' | 'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'in' | 'notIn' | 'before' | 'after' | 'empty' | 'notEmpty' | 'isTrue' | 'isFalse', string>
  }
  waterfall: { table: string; category: string; change: string; running: string; total: string; increase: string; decrease: string; summary: (n: number) => string }
  boxplot: { table: string; group: string; min: string; q1: string; median: string; q3: string; max: string; mean: string; outliers: string; count: string; summary: (n: number) => string }
  bullet: { value: string; target: string; describe: (label: string, value: string, target: string | null, band: string | null) => string; bands: string[] }
  player: {
    video: string
    audio: string
    play: string
    pause: string
    replay: string
    mute: string
    unmute: string
    volume: string
    seek: string
    speed: string
    normal: string
    captions: string
    captionsOff: string
    fullscreen: string
    exitFullscreen: string
    pip: string
    back: (seconds: number) => string
    forward: (seconds: number) => string
    loading: string
    error: string
    /** Spoken value of the seek bar. */
    time: (current: string, duration: string) => string
  }
  link: { external: string }
  signature: { label: string; placeholder: string; hint: string; undo: string; clear: string; empty: string; signed: (strokes: number) => string; cleared: string }
  cropper: {
    label: string
    box: string
    hint: string
    empty: string
    error: string
    toolbar: string
    zoom: string
    zoomIn: string
    zoomOut: string
    rotateLeft: string
    rotateRight: string
    reset: string
    status: (width: number, height: number, x: number, y: number, zoom: number) => string
  }
  result: Record<'success' | 'info' | 'warning' | 'error' | '403' | '404' | '500', { title: string; subtitle: string }>
  checkboxGroup: { all: string }
  /** MlBottomSheet / MlActionSheet. */
  sheet: { handle: string; position: (n: number, total: number) => string; actions: string }
  puzzle: {
    label: (alt?: string) => string
    piece: (n: number, row: number, col: number, placed: boolean) => string
    picked: (n: number) => string
    swapped: (a: number, b: number) => string
    solved: (moves: number, time: string) => string
    progress: (placed: number, total: number) => string
    moves: (n: number) => string
    shuffle: string
  }
  globe: { label: string; summary: (markers: number) => string; hint: string; marker: (label: string, place: string) => string }
  captcha: { label: string; hint: string; slider: string; checking: string; success: string; fail: string; refresh: string; locked: string }
  scratch: { cover: string; label: string; hint: string; revealed: string; revealNow: string }
  lottery: { grid: string; gacha: string; draw: string; turn: string; drawing: string; result: (prize: string) => string; again: string; none: string }
  /** Relative times ("3 分鐘前") shared by MlComments and MlInbox; the rest comes from Intl.RelativeTimeFormat. */
  relativeTime: { justNow: string }
  sticker: {
    label: string
    open: string
    search: string
    recent: string
    groups: Record<'animals' | 'food' | 'nature' | 'things' | 'tech', string>
    results: (n: number) => string
    noMatch: string
    noRecent: string
    /** Accessible names of the cute icons. */
    names: Record<CuteIconName, string>
  }
  comments: {
    label: string
    title: string
    count: (n: number) => string
    sortLabel: string
    sort: { newest: string; oldest: string; popular: string }
    placeholder: string
    replyPlaceholder: (name: string) => string
    reply: string
    replyTo: (name: string) => string
    submit: string
    cancel: string
    hint: string
    like: (n: number) => string
    expand: (n: number) => string
    collapse: string
    empty: string
    emptyHint: string
    submitted: string
    you: string
  }
  swipeStack: {
    label: string
    like: string
    nope: string
    super: string
    undo: string
    stamp: { like: string; nope: string; super: string }
    card: (n: number, total: number) => string
    swiped: (direction: 'left' | 'right' | 'up', label?: string) => string
    undone: string
    empty: string
    hint: string
  }
  inbox: {
    label: string
    open: (unread: number) => string
    tabs: { all: string; unread: string; mention: string }
    readAll: string
    dismiss: (title: string) => string
    unread: string
    groups: { today: string; yesterday: string; earlier: string }
    empty: { all: string; unread: string; mention: string }
    markedAll: string
    dismissed: (title: string) => string
    types: { info: string; success: string; warning: string; danger: string; mention: string }
  }
  /** MlRadar: bearing is "045°", distance is "60%" or "12 km". */
  radar: { label: string; summary: (blips: number) => string; blip: (label: string | undefined, bearing: string, distance: string) => string }
  /** MlClock: spoken time, announced once a minute. */
  clock: { label: string; time: (place: string | undefined, h: number, m: number) => string }
  /** MlBankPicker / BankPicker. */
  bank: {
    label: string
    search: string
    account: string
    accountPlaceholder: string
    /** Under the account field: digit count and the usual 10–16 range. */
    accountHint: (digits: number) => string
  }
  /** MlLunarCalendar / LunarCalendar. */
  lunar: {
    label: string
    /** Header: lunar year(s) of the month shown, e.g. 「丙午年（馬）」. */
    year: (ganZhi: string, zodiac: number) => string
    /** Day-cell description added after the date: lunar date, then holiday / 節氣 names. */
    day: (lunar: string, names: string[], off: boolean, workday: boolean) => string
  }
  /** MlInvoiceChecker / InvoiceChecker. */
  invoice: {
    label: string
    period: string
    modes: string
    quick: string
    full: string
    quickLabel: string
    fullLabel: string
    none: string
    maybe: string
    /** Short verdicts for the history list. */
    noneShort: string
    maybeShort: string
    atLeast: (amount: string) => string
    win: (prize: string, amount: string) => string
    check: string
    prizes: Record<'special' | 'grand' | 'first' | 'second' | 'third' | 'fourth' | 'fifth' | 'sixth' | 'extraSixth' | 'cloud', string>
    /** NT$ amount as words, e.g. 「1,000 萬元」. */
    amount: (n: number) => string
    numbers: string
    /** Under the 頭獎 row. */
    firstRule: string
    history: string
    clearHistory: string
    noDraws: string
    waiting: string
  }
  password: {
    show: string
    hide: string
    capsLock: string
    strength: string
    /** Score 0 … 4. */
    levels: [string, string, string, string, string]
    rules: string
    met: string
    unmet: string
    minLength: (n: number) => string
    upper: string
    lower: string
    digit: string
    symbol: string
  }
  form: {
    required: string
    pattern: string
    email: string
    url: string
    number: string
    integer: string
    minChars: (n: number) => string
    minItems: (n: number) => string
    minValue: (n: number) => string
    maxChars: (n: number) => string
    maxItems: (n: number) => string
    maxValue: (n: number) => string
  }
  /** Messages of the Taiwan validators (`twRules`, src/validators-tw.ts). */
  twValidate: {
    nationalId: string
    residentId: string
    personalId: string
    businessId: string
    mobile: string
    landline: string
    phone: string
    mobileBarcode: string
    citizenCert: string
    postalCode: string
    postalCodeUnknown: string
    bankCode: string
    bankAccount: string
  }
}

export const zhTW: MlLocale = {
  name: 'zh-TW',
  common: {
    close: '關閉',
    clear: '清除',
    remove: (label) => (label ? `移除 ${label}` : '移除'),
    search: '搜尋…',
    confirm: '確定',
    cancel: '取消',
    now: '現在',
    loading: '載入中',
    choose: '請選擇',
    noMatch: '找不到符合的選項',
    prev: '上一張',
    next: '下一張',
    decrease: '減少',
    increase: '增加',
  },
  status: { online: '在線', busy: '忙碌', away: '離開', offline: '離線' },
  mascot: '碼力獅',
  nav: {
    breadcrumb: '目前位置',
    pagination: '分頁',
    page: (n) => `第 ${n} 頁`,
    prevPage: '上一頁',
    nextPage: '下一頁',
    menu: '主選單',
    tabBar: '主要導覽',
    closeTab: (l) => `關閉 ${l}`,
    addTab: '新增分頁',
    scrollTabsPrev: '向左捲動分頁',
    scrollTabsNext: '向右捲動分頁',
    steps: '進度步驟',
    stepDone: '（已完成）',
    stepCurrent: '（進行中）',
    anchor: '本頁目錄',
    backTop: '回到頂端',
    back: '返回',
  },
  carousel: {
    label: '輪播',
    prev: '上一張',
    next: '下一張',
    play: '開始自動播放',
    pause: '暫停自動播放',
    slide: (n) => `第 ${n} 張`,
  },
  calendar: { prevMonth: '上個月', nextMonth: '下個月', prevYear: '上一年', nextYear: '下一年', prevDecade: '上個十年', nextDecade: '下個十年' },
  date: {
    pick: '選擇日期',
    clear: '清除日期',
    rangeStart: '開始日期',
    rangeEnd: '結束日期',
    pickRange: '選擇日期區間',
    clearRange: '清除日期區間',
    presets: '快速選擇',
    today: '今天',
    last7: '最近 7 天',
    last30: '最近 30 天',
    thisMonth: '本月',
    lastMonth: '上個月',
    days: (n) => `${n} 天`,
    pickEnd: (start) => `${start} → 再選結束日`,
    pickStart: '先選開始日，再選結束日',
    pickTime: '選擇時間',
    clearTime: '清除時間',
    pickDateTime: '選擇日期與時間',
    clearDateTime: '清除日期時間',
    time: '時間',
    timeFirst: '先選日期或時間',
    units: { h: '時', m: '分', s: '秒' },
    roc: { era: '民國', before: '民國前' },
    period: {
      month: (y, m) => `${y} 年 ${m} 月`,
      quarter: (y, q) => `${y} 年第 ${q} 季`,
      year: (y) => `${y} 年`,
      quarterCell: (q) => `第 ${q} 季`,
      decade: (from, to) => `${from} – ${to} 年`,
      pick: { month: '選擇月份', quarter: '選擇季度', year: '選擇年份' },
      clear: { month: '清除月份', quarter: '清除季度', year: '清除年份' },
      rangeStart: { month: '開始月份', year: '開始年份' },
      rangeEnd: { month: '結束月份', year: '結束年份' },
      pickRange: { month: '選擇月份區間', year: '選擇年份區間' },
      clearRange: { month: '清除月份區間', year: '清除年份區間' },
      pickStart: { month: '先選開始月份，再選結束月份', year: '先選開始年份，再選結束年份' },
      pickEnd: (start) => `${start} → 再選結束`,
      count: (n, type) => (type === 'year' ? `${n} 年` : `${n} 個月`),
    },
  },
  countdown: { label: '剩餘時間', days: '天', hours: '時', minutes: '分', seconds: '秒' },
  color: {
    pick: '選擇顏色',
    clear: '清除顏色',
    area: '飽和度與亮度',
    areaValue: (s, v) => `飽和度 ${s}%，亮度 ${v}%`,
    hue: '色相',
    alpha: '不透明度',
    hex: '色碼',
    presets: '預設顏色',
  },
  cascader: { placeholder: '請選擇' },
  region: { county: '縣市', district: '鄉鎮市區', zip: '郵遞區號', pickCounty: '請選擇縣市', pickDistrict: '請選擇鄉鎮市區', search: '輸入縣市、鄉鎮或郵遞區號' },
  tagInput: {
    placeholder: '輸入後按 Enter',
    added: (label) => (label ? `${label}：已加入` : '已加入的標籤'),
    clearAll: '清除全部',
    max: (n) => `最多 ${n} 個`,
    duplicate: (tag) => `「${tag}」已經有了`,
    invalid: (tag) => `「${tag}」格式不符`,
  },
  pin: { digit: (i, total) => `第 ${i} 碼，共 ${total} 碼` },
  autocomplete: { empty: '沒有建議', searching: '搜尋中…' },
  command: {
    placeholder: '輸入指令或搜尋…',
    empty: '找不到符合的指令',
    dialog: '指令面板',
    list: '指令',
    move: '移動',
    run: '執行',
  },
  contextMenu: '右鍵選單',
  dialog: { ok: '知道了' },
  empty: { title: '這裡還沒有東西' },
  table: {
    empty: '這裡還沒有獵物',
    selectAll: '全選',
    selectRow: (n) => `選取第 ${n} 列`,
    expand: '展開',
    collapse: '收合',
    expandRow: (n) => `展開第 ${n} 列詳細資料`,
    total: (n) => `共 ${n} 筆`,
  },
  transfer: {
    titles: ['可選', '已選'],
    filter: '搜尋…',
    empty: '沒有項目',
    noMatch: '沒有符合的項目',
    selectAll: (t) => `全選${t}`,
    searchIn: (t) => `搜尋${t}`,
    moveTo: (t) => `移到${t}`,
    moveBack: (t) => `移回${t}`,
  },
  tree: { empty: '沒有符合的節點' },
  upload: { title: '把檔案拖到這裡', or: '或', browse: '點擊選擇檔案' },
  image: { error: '無法載入', failed: (alt) => `${alt}（無法載入）`, zoomIn: (alt) => `放大檢視：${alt}` },
  preview: {
    label: '圖片預覽',
    close: '關閉預覽',
    toolbar: '檢視工具',
    zoomOut: '縮小',
    zoomIn: '放大',
    rotate: '旋轉 90 度',
    reset: '重設',
    image: (n, total) => `圖片 ${n} / ${total}`,
  },
  infinite: { loading: '小獅子正在搬資料…', finished: '沒有更多了', more: '載入更多' },
  ellipsis: { expand: '展開', collapse: '收起' },
  skeleton: '載入中…',
  splitter: '調整面板大小',
  mention: { placeholder: (t) => `輸入 ${t} 提及成員…` },
  sortable: {
    handle: '拖曳排序（空白鍵抓起，方向鍵移動）',
    moved: (l, p, t) => `${l} 移到第 ${p} 個，共 ${t} 個`,
    grabbed: (l) => `已抓起 ${l}，用方向鍵移動，空白鍵放下，Esc 取消`,
    dropped: '已放下',
  },
  kanban: { empty: '拖曳卡片到這裡', full: '這一欄已滿', count: (n, l) => (l ? `${n} / ${l}` : `${n}`) },
  float: { open: '展開更多操作', close: '收合操作' },
  banner: { close: '關閉公告' },
  chat: { log: '對話紀錄', latest: '最新訊息', typing: '正在輸入…', placeholder: '輸入訊息，Enter 送出，Shift + Enter 換行', send: '送出', stop: '停止產生', status: { sending: '傳送中…', sent: '已送出', error: '傳送失敗' } },
  tour: { step: (n, t) => `第 ${n} / ${t} 步`, prev: '上一步', next: '下一步', finish: '完成', skip: '略過導覽' },
  code: { copy: '複製', copied: '已複製', expand: '展開程式碼', collapse: '收起', copiedToast: (f) => `已複製 ${f ?? '程式碼'}` },
  terminal: { label: (t) => `終端機：${t}`, copy: '複製指令', copied: '已複製', replay: '重播' },
  pullRefresh: { pulling: '下拉即可重新整理', loosing: '放開以重新整理', refreshing: '重新整理中…', success: '已更新', fail: '更新失敗', button: '重新整理' },
  swipeCell: { more: '更多動作', moreFor: (t) => `${t}：更多動作`, left: '左側動作', right: '右側動作' },
  copy: { copy: '複製', copied: '已複製！', failed: '複製失敗，請手動選取' },
  json: {
    label: 'JSON 檢視器',
    search: '搜尋鍵或值…',
    matches: (n) => (n ? `${n} 筆相符` : '沒有相符'),
    expandAll: '全部展開',
    collapseAll: '全部收合',
    keys: (n) => `${n} 個鍵`,
    items: (n) => `${n} 項`,
    more: (n, rest) => `再顯示 ${n} 項（還有 ${rest} 項）`,
    expandString: (h) => `展開（還有 ${h} 字）`,
    collapseString: '收起',
    circular: '循環參照',
    parseError: (l, c) => `JSON 格式錯誤：第 ${l} 行第 ${c} 欄`,
    unexpected: (ch) => `這裡出現了意外的「${ch}」`,
    unexpectedEnd: '內容提早結束，可能少了括號或引號',
    copiedPath: (p) => `已複製路徑 ${p}`,
    copiedValue: '已複製值',
    copyPath: '點擊複製路徑',
    copyValue: '點擊複製值',
    empty: '沒有符合的內容',
  },
  markdown: { streaming: '正在產生回覆…' },
  editor: {
    toolbar: '文字格式',
    content: '編輯區',
    placeholder: '開始輸入內容…',
    tools: {
      paragraph: '內文',
      h1: '標題 1',
      h2: '標題 2',
      h3: '標題 3',
      bold: '粗體',
      italic: '斜體',
      underline: '底線',
      strike: '刪除線',
      code: '行內程式碼',
      link: '連結',
      bulletList: '項目清單',
      orderedList: '編號清單',
      blockquote: '引言',
      codeBlock: '程式碼區塊',
      horizontalRule: '分隔線',
      clear: '清除格式',
      undo: '復原',
      redo: '重做',
    },
    linkUrl: '連結網址',
    linkApply: '套用',
    linkRemove: '移除連結',
    linkInvalid: '網址格式不正確',
    count: (n, max) => (max ? `${n} / ${max} 字` : `${n} 字`),
  },
  diff: {
    label: '程式碼差異',
    added: '新增',
    removed: '刪除',
    stats: (a, r) => `新增 ${a} 行、刪除 ${r} 行`,
    files: (n) => `${n} 個檔案`,
    expand: (n) => `展開 ${n} 行`,
    prev: '上一處變更',
    next: '下一處變更',
    position: (c, t) => (c ? `${c} / ${t}` : `${t} 處變更`),
    view: '檢視方式',
    split: '並排',
    unified: '單欄',
    noChanges: '沒有差異',
    noNewline: '檔案結尾沒有換行',
    binary: '二進位檔案已變更',
    table: (n) => (n ? `${n} 的差異` : '程式碼差異'),
    oldLine: '舊行號',
    newLine: '新行號',
    oldCode: '舊版本',
    newCode: '新版本',
    code: '內容',
    status: { added: '新檔案', deleted: '已刪除', renamed: '已更名', modified: '已修改' },
  },
  heatmap: { cell: (n, d) => `${d}：${n} 次`, summary: (t) => `一年內共 ${t.toLocaleString()} 次貢獻`, less: '少', more: '多' },
  scatter: {
    summary: (s, p) => `散佈圖：${s} 個數列，共 ${p} 個資料點`,
    table: '散佈圖資料',
    series: '數列',
    point: '資料點',
    x: 'X',
    y: 'Y',
    size: '大小',
    trend: (n) => `${n} 趨勢線`,
    toggle: (n) => `顯示或隱藏「${n}」`,
  },
  funnel: { summary: (n, r) => `漏斗圖：${n} 個階段，整體轉換率 ${r}`, value: '數量', fromPrev: '較上一階段', fromFirst: '整體轉換', drop: '流失', start: '起點' },
  treemap: {
    summary: (n, t) => `矩形樹圖：${n} 個項目，合計 ${t}`,
    hint: '方向鍵在區塊間移動，Enter 選取，Esc 取消選取',
    table: '矩形樹圖資料',
    group: '分組',
    item: '項目',
    value: '數值',
    share: '占總計',
    ofGroup: '占分組',
    selected: '已選取',
  },
  sankey: {
    summary: (n, l) => `桑基圖：${n} 個節點、${l} 條流向`,
    hint: '方向鍵在節點間移動，查看相連的流向',
    table: '桑基圖流向資料',
    source: '來源',
    target: '去向',
    value: '流量',
    incoming: '流入',
    outgoing: '流出',
    flow: (a, b) => `${a} → ${b}`,
    ofSource: '占來源流出',
  },
  gantt: {
    summary: (n) => `甘特圖：${n} 項工作`,
    hint: '↑ ↓ 在工作間移動',
    editHint: '← → 移動一天，Shift + ← → 調整結束日',
    table: '甘特圖工作資料',
    task: '工作',
    group: '分組',
    start: '開始',
    end: '結束',
    duration: '天數',
    days: (n) => `${n} 天`,
    progress: '進度',
    milestone: '里程碑',
    today: '今天',
    months: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
    weekdays: ['週日', '週一', '週二', '週三', '週四', '週五', '週六'],
    monthTitle: (y, m) => `${y} 年 ${m + 1} 月`,
    year: (y) => `${y} 年`,
    expand: (g) => `展開「${g}」`,
    collapse: (g) => `收合「${g}」`,
    moved: (t, a, b) => `${t}：${a} – ${b}`,
  },
  candle: {
    summary: (n) => `K 線圖：${n} 根 K 棒`,
    hint: '← → 移動十字線，+ − 縮放，Home／End 跳到頭尾，拖曳可平移',
    table: 'K 線資料',
    time: '時間',
    open: '開',
    high: '高',
    low: '低',
    close: '收',
    volume: '量',
    change: '漲跌',
    ma: (n) => `MA${n}`,
    zoomIn: '放大',
    zoomOut: '縮小',
    reset: '重設範圍',
    range: (a, b) => `顯示 ${a} 至 ${b}`,
  },
  taiwanMap: {
    summary: (n, lo, hi) => (n ? `臺灣縣市地圖：${n} 個縣市有資料，最低 ${lo}，最高 ${hi}` : '臺灣縣市地圖'),
    cell: (c, v) => `${c}：${v}`,
    table: '各縣市數值',
    county: '縣市',
    value: '數值',
    noData: '無資料',
    less: '低',
    more: '高',
  },
  bars: {
    summary: (m, s, c) => `${{ grouped: '分組', stacked: '堆疊', percent: '百分比堆疊' }[m]}長條圖：${s} 個數列、${c} 個類別`,
    table: '長條圖資料',
    category: '類別',
    total: '合計',
    share: '占比',
    toggle: (n) => `顯示或隱藏「${n}」`,
  },
  rate: '評分',
  wheel: { label: '幸運轉盤', summary: (l, p) => `${l}：${p.join('、')}`, spin: '開始抽獎', spinning: '轉盤轉動中…', result: (p) => `恭喜！抽中：${p}` },
  pickerView: { label: '滾輪選擇器', column: (n) => `第 ${n} 欄`, cancel: '取消', confirm: '確定', selected: (l) => `已選擇：${l.join('，')}` },
  toast: { region: '通知', close: '關閉通知' },
  theme: { label: '佈景主題', switch: '日光模式', dark: '夜間', light: '日光', system: '系統', toDark: '切換為夜間模式', toLight: '切換為日光模式' },
  qrcode: { tooLong: '內容太長，無法產生 QR Code', label: (v) => `QR Code：${v}` },
  barcode: { invalid: '這個格式無法編碼此內容', label: (v) => `條碼：${v}` },
  avatarGroup: { label: '成員', more: (n) => `還有 ${n} 位`, showAll: (n) => `顯示其他 ${n} 位`, collapse: '收合成員' },
  amount: { capital: '新臺幣' },
  numberKeyboard: { label: '數字鍵盤', delete: '刪除', close: '完成', collapse: '收起鍵盤' },
  indexBar: { label: '索引', jump: (i) => `跳到 ${i}`, empty: '沒有資料' },
  scheduler: {
    label: '行程表',
    today: '今天',
    prev: '上一頁',
    next: '下一頁',
    week: '週',
    day: '日',
    allDay: '全天',
    hint: '方向鍵上下移動一格、左右換日，Shift + 上下調整結束時間；在空白處拖曳可以新增行程。',
    moved: (title, when) => `${title} 改到 ${when}`,
  },
  address: {
    label: '地址',
    zip: '郵遞區號',
    zipHint: '前 3 碼依行政區自動帶入，可再補上後 3 碼',
    zipMismatch: '郵遞區號前 3 碼和行政區不符',
    zipInvalid: '郵遞區號是 3、5 或 6 碼數字',
    road: '路／街',
    roadPlaceholder: '例：重慶南路（可直接貼上整串地址）',
    section: '段',
    lane: '巷',
    alley: '弄',
    number: '號',
    floor: '樓',
    room: '之',
    preview: '完整地址',
    english: '英文地址',
    pasteHint: '已自動拆解貼上的地址',
  },
  filter: {
    label: '篩選',
    search: '搜尋',
    reset: '重設',
    more: (n) => `更多篩選（${n}）`,
    less: '收起篩選',
    all: '全部',
    min: '最小',
    max: '最大',
    clear: (f) => `清除「${f}」`,
    clearAll: '全部清除',
    applied: (n) => `已套用 ${n} 個篩選`,
  },
  query: {
    label: '查詢條件',
    and: '且',
    or: '或',
    combinator: '條件組合方式',
    addRule: '新增條件',
    addGroup: '新增群組',
    removeRule: '移除條件',
    removeGroup: '移除群組',
    field: '欄位',
    operator: '運算',
    value: '值',
    from: '從',
    to: '到',
    yes: '是',
    no: '否',
    empty: '還沒有條件：所有資料都符合',
    ops: {
      contains: '包含',
      notContains: '不包含',
      eq: '等於',
      neq: '不等於',
      startsWith: '開頭是',
      endsWith: '結尾是',
      gt: '大於',
      gte: '大於等於',
      lt: '小於',
      lte: '小於等於',
      between: '介於',
      in: '是其中之一',
      notIn: '不是其中之一',
      before: '早於',
      after: '晚於',
      empty: '是空的',
      notEmpty: '不是空的',
      isTrue: '是',
      isFalse: '否',
    },
  },
  waterfall: {
    table: '瀑布圖資料',
    category: '項目',
    change: '增減',
    running: '累計',
    total: '小計',
    increase: '增加',
    decrease: '減少',
    summary: (n) => `瀑布圖，${n} 個項目。用左右鍵逐項查看。`,
  },
  boxplot: {
    table: '箱形圖資料',
    group: '組別',
    min: '最小值',
    q1: '第一四分位數',
    median: '中位數',
    q3: '第三四分位數',
    max: '最大值',
    mean: '平均',
    outliers: '離群值',
    count: '樣本數',
    summary: (n) => `箱形圖，${n} 組。用左右鍵逐組查看。`,
  },
  bullet: {
    value: '實際',
    target: '目標',
    describe: (label, value, target, band) => [`${label}：${value}`, target && `目標 ${target}`, band && `落在「${band}」區間`].filter(Boolean).join('，'),
    bands: ['差', '普通', '良好', '優秀'],
  },
  player: {
    video: '影片播放器',
    audio: '音訊播放器',
    play: '播放',
    pause: '暫停',
    replay: '重播',
    mute: '靜音',
    unmute: '取消靜音',
    volume: '音量',
    seek: '播放進度',
    speed: '播放速度',
    normal: '正常',
    captions: '字幕',
    captionsOff: '關閉',
    fullscreen: '全螢幕',
    exitFullscreen: '離開全螢幕',
    pip: '子母畫面',
    back: (s) => `倒退 ${s} 秒`,
    forward: (s) => `快轉 ${s} 秒`,
    loading: '載入中',
    error: '無法播放這個媒體',
    time: (c, d) => `${c}，總長 ${d}`,
  },
  link: { external: '（另開新視窗）' },
  signature: {
    label: '簽名板',
    placeholder: '請在此簽名',
    hint: '用滑鼠、手指或觸控筆在框內簽名。Ctrl + Z 復原上一筆，Delete 清除全部。',
    undo: '復原上一筆',
    clear: '清除簽名',
    empty: '尚未簽名',
    signed: (n) => `已簽名，共 ${n} 筆`,
    cleared: '已清除簽名',
  },
  cropper: {
    label: '圖片裁切',
    box: '裁切框',
    hint: '方向鍵移動裁切框（Shift 加速），Alt + 方向鍵調整大小，+ / − 縮放。也可以拖曳圖片平移，用滾輪或雙指縮放。',
    empty: '尚未選擇圖片',
    error: '圖片載入失敗',
    toolbar: '裁切工具',
    zoom: '縮放',
    zoomIn: '放大',
    zoomOut: '縮小',
    rotateLeft: '向左旋轉 90°',
    rotateRight: '向右旋轉 90°',
    reset: '重設',
    status: (w, h, x, y, z) => `裁切 ${w} × ${h}，位置 ${x}, ${y}，縮放 ${z}%`,
  },
  result: {
    success: { title: '完成了！', subtitle: '一切順利，獅群為你歡呼。' },
    info: { title: '提醒你一下', subtitle: '這裡有些資訊值得留意。' },
    warning: { title: '請再確認一次', subtitle: '有些地方看起來不太對勁。' },
    error: { title: '出了點問題', subtitle: '動作沒有完成，請稍後再試。' },
    '403': { title: '這裡是獅王的領地', subtitle: '你沒有權限進入這個頁面。' },
    '404': { title: '找不到這個頁面', subtitle: '小獅子把它叼走了，或是它從來不存在。' },
    '500': { title: '伺服器打了個盹', subtitle: '我們的工程獅正在搶修，請稍後再回來。' },
  },
  checkboxGroup: { all: '全選' },
  sheet: { handle: '調整面板高度', position: (n, total) => `第 ${n} 段，共 ${total} 段`, actions: '動作選單' },
  puzzle: {
    label: (alt) => (alt ? `拼圖：${alt}` : '拼圖'),
    piece: (n, r, c, ok) => `第 ${n} 塊，位在第 ${r} 列第 ${c} 欄${ok ? '，已放對' : ''}`,
    picked: (n) => `拿起第 ${n} 塊：移到要交換的位置再按 Enter，Esc 放下`,
    swapped: (a, b) => `第 ${a} 塊與第 ${b} 塊交換`,
    solved: (m, t) => `完成！共 ${m} 步，用時 ${t}`,
    progress: (p, t) => `${p} / ${t} 塊就位`,
    moves: (n) => `${n} 步`,
    shuffle: '重新打亂',
  },
  globe: {
    label: '地球',
    summary: (n) => (n ? `地球，${n} 個標記` : '地球'),
    hint: '方向鍵旋轉，Home 回到起點',
    marker: (l, p) => `${l}（${p}）`,
  },
  captcha: {
    label: '安全驗證',
    hint: '向右拖動滑塊，完成拼圖',
    slider: '拼圖滑塊：用方向鍵移動，按 Enter 確認',
    checking: '驗證中…',
    success: '驗證成功',
    fail: '沒有對準，再試一次',
    refresh: '換一張',
    locked: '失敗太多次，已換一張新的',
  },
  scratch: { cover: '刮開這裡', label: '刮刮卡', hint: '用滑鼠或手指刮開塗層，或按 Enter 直接揭曉', revealed: '已刮開', revealNow: '直接刮開' },
  lottery: {
    grid: '九宮格抽獎',
    gacha: '扭蛋機',
    draw: '抽獎',
    turn: '轉一下',
    drawing: '抽獎中…',
    result: (p) => `恭喜！抽中：${p}`,
    again: '再抽一次',
    none: '這次沒有抽中',
  },
  relativeTime: { justNow: '剛剛' },
  sticker: {
    label: '貼圖',
    open: '選擇貼圖',
    search: '搜尋貼圖',
    recent: '最近使用',
    groups: { animals: '動物', food: '美食', nature: '自然', things: '生活', tech: '科技' },
    results: (n) => (n ? `找到 ${n} 個貼圖` : '找不到貼圖'),
    noMatch: '找不到符合的貼圖',
    noRecent: '還沒有最近使用的貼圖',
    names: {
      lion: '獅子', cat: '貓咪', dog: '狗狗', bear: '熊熊', bunny: '兔兔', chick: '小雞', panda: '熊貓', frog: '青蛙',
      bubbleTea: '珍奶', coffee: '咖啡', donut: '甜甜圈', cupcake: '杯子蛋糕', iceCream: '冰淇淋', strawberry: '草莓',
      sun: '太陽', moon: '月亮', cloud: '雲朵', rain: '下雨', star: '星星', rainbow: '彩虹', flower: '花朵', sprout: '嫩芽',
      heart: '愛心', paw: '肉球', gift: '禮物', rocket: '火箭', bell: '鈴鐺', mail: '信件', chat: '對話', camera: '相機',
      music: '音樂', game: '遊戲', trophy: '獎盃', crown: '皇冠', bulb: '燈泡', home: '房子', ghost: '幽靈',
      cyberLion: '機械獅', robot: '機器人', chip: '晶片', laptop: '筆電', terminal: '終端機', bolt: '閃電', shield: '盾牌',
      gear: '齒輪', key: '鑰匙', lock: '鎖頭', database: '資料庫', bug: '蟲蟲', signal: '訊號', battery: '電池', sparkle: '閃亮',
    },
  },
  comments: {
    label: '留言',
    title: '留言',
    count: (n) => `${n} 則`,
    sortLabel: '排序',
    sort: { newest: '最新', oldest: '最早', popular: '熱門' },
    placeholder: '留下你的想法…',
    replyPlaceholder: (name) => `回覆 ${name}…`,
    reply: '回覆',
    replyTo: (name) => `回覆 @${name}`,
    submit: '送出',
    cancel: '取消',
    hint: 'Ctrl + Enter 送出',
    like: (n) => `讚（${n}）`,
    expand: (n) => `展開 ${n} 則回覆`,
    collapse: '收起回覆',
    empty: '還沒有留言',
    emptyHint: '成為第一個留言的人吧！',
    submitted: '已送出留言',
    you: '你',
  },
  swipeStack: {
    label: '卡片堆疊',
    like: '喜歡',
    nope: '略過',
    super: '超級喜歡',
    undo: '復原',
    stamp: { like: '喜歡', nope: '略過', super: '超讚' },
    card: (n, t) => `第 ${n} 張，共 ${t} 張`,
    swiped: (d, l) => `${d === 'right' ? '喜歡' : d === 'left' ? '略過' : '超級喜歡'}${l ? `：${l}` : ''}`,
    undone: '已復原上一張',
    empty: '沒有更多卡片了',
    hint: '左右滑動或使用方向鍵，Backspace 復原',
  },
  inbox: {
    label: '通知',
    open: (n) => (n ? `通知，${n} 則未讀` : '通知'),
    tabs: { all: '全部', unread: '未讀', mention: '提及' },
    readAll: '全部標為已讀',
    dismiss: (t) => `移除通知：${t}`,
    unread: '未讀',
    groups: { today: '今天', yesterday: '昨天', earlier: '更早' },
    empty: { all: '目前沒有通知', unread: '全部都讀完了', mention: '還沒有人提到你' },
    markedAll: '已全部標為已讀',
    dismissed: (t) => `已移除：${t}`,
    types: { info: '資訊', success: '成功', warning: '警告', danger: '錯誤', mention: '提及' },
  },
  radar: {
    label: '雷達',
    summary: (n) => (n ? `雷達，${n} 個目標` : '雷達，沒有目標'),
    blip: (l, b, d) => `${l ?? '目標'}：方位 ${b}，距離 ${d}`,
  },
  clock: {
    label: '時鐘',
    time: (p, h, m) => `${p ? `${p} ` : ''}${h < 12 ? '上午' : '下午'} ${h % 12 || 12}:${String(m).padStart(2, '0')}`,
  },
  bank: {
    label: '銀行',
    search: '輸入代碼或銀行名稱',
    account: '帳號',
    accountPlaceholder: '請輸入帳號（只填數字）',
    accountHint: (n) => (n ? `已輸入 ${n} 位數字・帳號通常為 10–16 位` : '帳號通常為 10–16 位數字'),
  },
  lunar: {
    label: '農曆月曆',
    year: (gz, z) => `${gz}年（${'鼠牛虎兔龍蛇馬羊猴雞狗豬'[z]}）`,
    day: (lunar, names, off, workday) =>
      `農曆${lunar}${names.length ? `，${names.join('、')}` : ''}${off ? '（放假）' : workday ? '（上班日）' : ''}`,
  },
  invoice: {
    label: '統一發票對獎',
    period: '期別',
    modes: '對獎方式',
    quick: '末三碼',
    full: '完整號碼',
    quickLabel: '輸入發票末三碼',
    fullLabel: '輸入發票號碼（8 碼）',
    none: '沒中，下次再接再厲',
    maybe: '可能中獎，請核對完整號碼',
    noneShort: '沒中',
    maybeShort: '待核對',
    atLeast: (amount) => `末三碼和頭獎相同，至少有六獎 ${amount}`,
    win: (prize, amount) => `恭喜中${prize}！獎金 ${amount}`,
    check: '請核對這些號碼：',
    prizes: {
      special: '特別獎',
      grand: '特獎',
      first: '頭獎',
      second: '二獎',
      third: '三獎',
      fourth: '四獎',
      fifth: '五獎',
      sixth: '六獎',
      extraSixth: '增開六獎',
      cloud: '雲端發票專屬獎',
    },
    amount: (n) => (n >= 10000 && n % 10000 === 0 ? `${(n / 10000).toLocaleString('zh-TW')} 萬元` : `${n.toLocaleString('zh-TW')} 元`),
    numbers: '本期中獎號碼',
    firstRule: '末 7 至 3 碼相同：二獎 4 萬・三獎 1 萬・四獎 4 千・五獎 1 千・六獎 2 百',
    history: '對獎紀錄',
    clearHistory: '清除紀錄',
    noDraws: '尚未提供中獎號碼',
    waiting: '輸入號碼後馬上對獎',
  },
  password: {
    show: '顯示密碼',
    hide: '隱藏密碼',
    capsLock: '大寫鎖定已開啟',
    strength: '密碼強度',
    levels: ['很弱', '弱', '普通', '強', '很強'],
    rules: '密碼規則',
    met: '已符合',
    unmet: '未符合',
    minLength: (n) => `至少 ${n} 個字元`,
    upper: '包含大寫英文字母',
    lower: '包含小寫英文字母',
    digit: '包含數字',
    symbol: '包含符號',
  },
  form: {
    required: '此欄位為必填',
    pattern: '格式不正確',
    email: '請輸入有效的電子郵件',
    url: '請輸入有效的網址',
    number: '請輸入數字',
    integer: '請輸入整數',
    minChars: (n) => `至少需要 ${n} 個字元`,
    minItems: (n) => `至少選擇 ${n} 項`,
    minValue: (n) => `不能小於 ${n}`,
    maxChars: (n) => `最多 ${n} 個字元`,
    maxItems: (n) => `最多選擇 ${n} 項`,
    maxValue: (n) => `不能大於 ${n}`,
  },
  twValidate: {
    nationalId: '身分證字號格式不正確',
    residentId: '居留證號（統一證號）格式不正確',
    personalId: '身分證字號或居留證號格式不正確',
    businessId: '統一編號格式不正確',
    mobile: '手機號碼格式不正確',
    landline: '市話號碼格式不正確',
    phone: '電話號碼格式不正確',
    mobileBarcode: '手機條碼格式不正確',
    citizenCert: '自然人憑證條碼格式不正確',
    postalCode: '郵遞區號格式不正確',
    postalCodeUnknown: '查無此郵遞區號',
    bankCode: '查無此銀行代碼',
    bankAccount: '帳號格式不正確',
  },
}

export const en: MlLocale = {
  name: 'en',
  common: {
    close: 'Close',
    clear: 'Clear',
    remove: (label) => (label ? `Remove ${label}` : 'Remove'),
    search: 'Search…',
    confirm: 'OK',
    cancel: 'Cancel',
    now: 'Now',
    loading: 'Loading',
    choose: 'Select…',
    noMatch: 'No matching options',
    prev: 'Previous',
    next: 'Next',
    decrease: 'Decrease',
    increase: 'Increase',
  },
  status: { online: 'Online', busy: 'Busy', away: 'Away', offline: 'Offline' },
  mascot: 'Malilion',
  nav: {
    breadcrumb: 'Breadcrumb',
    pagination: 'Pagination',
    page: (n) => `Page ${n}`,
    prevPage: 'Previous page',
    nextPage: 'Next page',
    menu: 'Main menu',
    tabBar: 'Main navigation',
    closeTab: (l) => `Close ${l}`,
    addTab: 'New tab',
    scrollTabsPrev: 'Scroll tabs left',
    scrollTabsNext: 'Scroll tabs right',
    steps: 'Progress',
    stepDone: ' (completed)',
    stepCurrent: ' (current)',
    anchor: 'On this page',
    backTop: 'Back to top',
    back: 'Back',
  },
  carousel: {
    label: 'Carousel',
    prev: 'Previous slide',
    next: 'Next slide',
    play: 'Start autoplay',
    pause: 'Pause autoplay',
    slide: (n) => `Slide ${n}`,
  },
  calendar: {
    prevMonth: 'Previous month',
    nextMonth: 'Next month',
    prevYear: 'Previous year',
    nextYear: 'Next year',
    prevDecade: 'Previous decade',
    nextDecade: 'Next decade',
  },
  date: {
    pick: 'Pick a date',
    clear: 'Clear date',
    rangeStart: 'Start date',
    rangeEnd: 'End date',
    pickRange: 'Pick a date range',
    clearRange: 'Clear date range',
    presets: 'Quick ranges',
    today: 'Today',
    last7: 'Last 7 days',
    last30: 'Last 30 days',
    thisMonth: 'This month',
    lastMonth: 'Last month',
    days: (n) => (n === 1 ? '1 day' : `${n} days`),
    pickEnd: (start) => `${start} → now pick the end`,
    pickStart: 'Pick a start day, then an end day',
    pickTime: 'Pick a time',
    clearTime: 'Clear time',
    pickDateTime: 'Pick a date and time',
    clearDateTime: 'Clear date and time',
    time: 'Time',
    timeFirst: 'Pick a date or time first',
    units: { h: 'h', m: 'm', s: 's' },
    roc: { era: 'ROC', before: 'Before ROC' },
    period: {
      month: (y, m) => `${y}-${String(m).padStart(2, '0')}`,
      quarter: (y, q) => `${y} Q${q}`,
      year: (y) => String(y),
      quarterCell: (q) => `Q${q}`,
      decade: (from, to) => `${from} – ${to}`,
      pick: { month: 'Pick a month', quarter: 'Pick a quarter', year: 'Pick a year' },
      clear: { month: 'Clear month', quarter: 'Clear quarter', year: 'Clear year' },
      rangeStart: { month: 'Start month', year: 'Start year' },
      rangeEnd: { month: 'End month', year: 'End year' },
      pickRange: { month: 'Pick a month range', year: 'Pick a year range' },
      clearRange: { month: 'Clear month range', year: 'Clear year range' },
      pickStart: { month: 'Pick a start month, then an end month', year: 'Pick a start year, then an end year' },
      pickEnd: (start) => `${start} → now pick the end`,
      count: (n, type) => `${n} ${type}${n === 1 ? '' : 's'}`,
    },
  },
  countdown: { label: 'Time left', days: 'Days', hours: 'Hours', minutes: 'Min', seconds: 'Sec' },
  color: {
    pick: 'Pick a colour',
    clear: 'Clear colour',
    area: 'Saturation and brightness',
    areaValue: (s, v) => `Saturation ${s}%, brightness ${v}%`,
    hue: 'Hue',
    alpha: 'Opacity',
    hex: 'Hex code',
    presets: 'Preset colours',
  },
  cascader: { placeholder: 'Select…' },
  region: { county: 'City / County', district: 'District', zip: 'Postal code', pickCounty: 'Select city / county', pickDistrict: 'Select district', search: 'Search by name or postal code' },
  tagInput: {
    placeholder: 'Type and press Enter',
    added: (label) => (label ? `${label}: added` : 'Added tags'),
    clearAll: 'Clear all',
    max: (n) => `At most ${n}`,
    duplicate: (tag) => `“${tag}” is already there`,
    invalid: (tag) => `“${tag}” isn’t valid`,
  },
  pin: { digit: (i, total) => `Digit ${i} of ${total}` },
  autocomplete: { empty: 'No suggestions', searching: 'Searching…' },
  command: {
    placeholder: 'Type a command or search…',
    empty: 'No matching commands',
    dialog: 'Command palette',
    list: 'Commands',
    move: 'Move',
    run: 'Run',
  },
  contextMenu: 'Context menu',
  dialog: { ok: 'Got it' },
  empty: { title: 'Nothing here yet' },
  table: {
    empty: 'No prey here yet',
    selectAll: 'Select all',
    selectRow: (n) => `Select row ${n}`,
    expand: 'Expand',
    collapse: 'Collapse',
    expandRow: (n) => `Show details for row ${n}`,
    total: (n) => (n === 1 ? '1 row' : `${n} rows`),
  },
  transfer: {
    titles: ['Available', 'Selected'],
    filter: 'Search…',
    empty: 'No items',
    noMatch: 'No matching items',
    selectAll: (t) => `Select all ${t}`,
    searchIn: (t) => `Search ${t}`,
    moveTo: (t) => `Move to ${t}`,
    moveBack: (t) => `Move back to ${t}`,
  },
  tree: { empty: 'No matching nodes' },
  upload: { title: 'Drop files here', or: 'or ', browse: 'browse' },
  image: { error: 'Failed to load', failed: (alt) => `${alt} (failed to load)`, zoomIn: (alt) => `View larger: ${alt}` },
  preview: {
    label: 'Image preview',
    close: 'Close preview',
    toolbar: 'View tools',
    zoomOut: 'Zoom out',
    zoomIn: 'Zoom in',
    rotate: 'Rotate 90°',
    reset: 'Reset',
    image: (n, total) => `Image ${n} of ${total}`,
  },
  infinite: { loading: 'The cub is fetching more…', finished: 'That’s everything', more: 'Load more' },
  ellipsis: { expand: 'Show more', collapse: 'Show less' },
  skeleton: 'Loading…',
  splitter: 'Resize panels',
  mention: { placeholder: (t) => `Type ${t} to mention someone…` },
  sortable: {
    handle: 'Drag to reorder (Space to pick up, arrows to move)',
    moved: (l, p, t) => `${l} moved to position ${p} of ${t}`,
    grabbed: (l) => `Picked up ${l}. Use the arrow keys to move, Space to drop, Escape to cancel`,
    dropped: 'Dropped',
  },
  kanban: { empty: 'Drop cards here', full: 'This column is full', count: (n, l) => (l ? `${n} / ${l}` : `${n}`) },
  float: { open: 'More actions', close: 'Close actions' },
  banner: { close: 'Dismiss announcement' },
  chat: { log: 'Conversation', latest: 'Latest', typing: 'Typing…', placeholder: 'Message — Enter to send, Shift + Enter for a new line', send: 'Send', stop: 'Stop generating', status: { sending: 'Sending…', sent: 'Sent', error: 'Failed to send' } },
  tour: { step: (n, t) => `Step ${n} of ${t}`, prev: 'Back', next: 'Next', finish: 'Done', skip: 'Skip tour' },
  code: { copy: 'Copy', copied: 'Copied', expand: 'Show code', collapse: 'Hide', copiedToast: (f) => `Copied ${f ?? 'code'}` },
  terminal: { label: (t) => `Terminal: ${t}`, copy: 'Copy commands', copied: 'Copied', replay: 'Replay' },
  pullRefresh: { pulling: 'Pull down to refresh', loosing: 'Release to refresh', refreshing: 'Refreshing…', success: 'Updated', fail: 'Update failed', button: 'Refresh' },
  swipeCell: { more: 'More actions', moreFor: (t) => `More actions: ${t}`, left: 'Left actions', right: 'Right actions' },
  copy: { copy: 'Copy', copied: 'Copied!', failed: 'Copy failed — select it manually' },
  json: {
    label: 'JSON viewer',
    search: 'Search keys or values…',
    matches: (n) => (n ? `${n} match${n === 1 ? '' : 'es'}` : 'No matches'),
    expandAll: 'Expand all',
    collapseAll: 'Collapse all',
    keys: (n) => `${n} key${n === 1 ? '' : 's'}`,
    items: (n) => `${n} item${n === 1 ? '' : 's'}`,
    more: (n, rest) => `Show ${n} more (${rest} left)`,
    expandString: (h) => `Show ${h} more chars`,
    collapseString: 'Show less',
    circular: 'Circular',
    parseError: (l, c) => `Invalid JSON at line ${l}, column ${c}`,
    unexpected: (ch) => `Unexpected “${ch}” here`,
    unexpectedEnd: 'Unexpected end of input — a bracket or quote may be missing',
    copiedPath: (p) => `Copied path ${p}`,
    copiedValue: 'Copied value',
    copyPath: 'Click to copy the path',
    copyValue: 'Click to copy the value',
    empty: 'Nothing matches',
  },
  markdown: { streaming: 'Generating…' },
  editor: {
    toolbar: 'Formatting',
    content: 'Editor',
    placeholder: 'Start writing…',
    tools: {
      paragraph: 'Paragraph',
      h1: 'Heading 1',
      h2: 'Heading 2',
      h3: 'Heading 3',
      bold: 'Bold',
      italic: 'Italic',
      underline: 'Underline',
      strike: 'Strikethrough',
      code: 'Inline code',
      link: 'Link',
      bulletList: 'Bullet list',
      orderedList: 'Numbered list',
      blockquote: 'Quote',
      codeBlock: 'Code block',
      horizontalRule: 'Divider',
      clear: 'Clear formatting',
      undo: 'Undo',
      redo: 'Redo',
    },
    linkUrl: 'Link URL',
    linkApply: 'Apply',
    linkRemove: 'Remove link',
    linkInvalid: 'That URL is not valid',
    count: (n, max) => (max ? `${n} / ${max} characters` : `${n} characters`),
  },
  diff: {
    label: 'Code diff',
    added: 'Added',
    removed: 'Removed',
    stats: (a, r) => `${a} ${a === 1 ? 'line' : 'lines'} added, ${r} removed`,
    files: (n) => `${n} ${n === 1 ? 'file' : 'files'}`,
    expand: (n) => `Expand ${n} ${n === 1 ? 'line' : 'lines'}`,
    prev: 'Previous change',
    next: 'Next change',
    position: (c, t) => (c ? `${c} / ${t}` : `${t} ${t === 1 ? 'change' : 'changes'}`),
    view: 'View',
    split: 'Split',
    unified: 'Unified',
    noChanges: 'No changes',
    noNewline: 'No newline at end of file',
    binary: 'Binary file changed',
    table: (n) => (n ? `Changes in ${n}` : 'Code diff'),
    oldLine: 'Old line',
    newLine: 'New line',
    oldCode: 'Before',
    newCode: 'After',
    code: 'Content',
    status: { added: 'New', deleted: 'Deleted', renamed: 'Renamed', modified: 'Modified' },
  },
  heatmap: { cell: (n, d) => `${n === 1 ? '1 contribution' : `${n} contributions`} on ${d}`, summary: (t) => `${t.toLocaleString()} contributions in the last year`, less: 'Less', more: 'More' },
  scatter: {
    summary: (s, p) => `Scatter chart: ${s} series, ${p} ${p === 1 ? 'point' : 'points'}`,
    table: 'Scatter chart data',
    series: 'Series',
    point: 'Point',
    x: 'X',
    y: 'Y',
    size: 'Size',
    trend: (n) => `${n} trend line`,
    toggle: (n) => `Show or hide “${n}”`,
  },
  funnel: { summary: (n, r) => `Funnel chart: ${n} stages, ${r} overall conversion`, value: 'Count', fromPrev: 'From previous', fromFirst: 'Overall', drop: 'Dropped', start: 'Start' },
  treemap: {
    summary: (n, t) => `Treemap: ${n} ${n === 1 ? 'item' : 'items'}, ${t} in total`,
    hint: 'Arrow keys move between tiles, Enter selects, Escape clears',
    table: 'Treemap data',
    group: 'Group',
    item: 'Item',
    value: 'Value',
    share: 'Of total',
    ofGroup: 'Of group',
    selected: 'selected',
  },
  sankey: {
    summary: (n, l) => `Sankey diagram: ${n} nodes, ${l} ${l === 1 ? 'flow' : 'flows'}`,
    hint: 'Arrow keys move between nodes and show their flows',
    table: 'Sankey flows',
    source: 'From',
    target: 'To',
    value: 'Value',
    incoming: 'In',
    outgoing: 'Out',
    flow: (a, b) => `${a} → ${b}`,
    ofSource: 'Of source',
  },
  gantt: {
    summary: (n) => `Gantt chart: ${n} ${n === 1 ? 'task' : 'tasks'}`,
    hint: 'Up and down arrows move between tasks',
    editHint: 'Left / right move a day, Shift + left / right change the end',
    table: 'Gantt tasks',
    task: 'Task',
    group: 'Group',
    start: 'Start',
    end: 'End',
    duration: 'Days',
    days: (n) => `${n} ${n === 1 ? 'day' : 'days'}`,
    progress: 'Progress',
    milestone: 'Milestone',
    today: 'Today',
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    weekdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    monthTitle: (y, m) => `${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m]} ${y}`,
    year: (y) => `${y}`,
    expand: (g) => `Expand ${g}`,
    collapse: (g) => `Collapse ${g}`,
    moved: (t, a, b) => `${t}: ${a} – ${b}`,
  },
  candle: {
    summary: (n) => `Candlestick chart: ${n} ${n === 1 ? 'candle' : 'candles'}`,
    hint: 'Left / right move the crosshair, + / − zoom, Home / End jump, drag to pan',
    table: 'Price data',
    time: 'Time',
    open: 'O',
    high: 'H',
    low: 'L',
    close: 'C',
    volume: 'Vol',
    change: 'Chg',
    ma: (n) => `MA${n}`,
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    reset: 'Reset range',
    range: (a, b) => `Showing ${a} to ${b}`,
  },
  taiwanMap: {
    summary: (n, lo, hi) => (n ? `Map of Taiwan: ${n} ${n === 1 ? 'county' : 'counties'} with data, from ${lo} to ${hi}` : 'Map of Taiwan'),
    cell: (c, v) => `${c}: ${v}`,
    table: 'Values by county',
    county: 'City / County',
    value: 'Value',
    noData: 'No data',
    less: 'Low',
    more: 'High',
  },
  bars: {
    summary: (m, s, c) => `${{ grouped: 'Grouped', stacked: 'Stacked', percent: '100% stacked' }[m]} bar chart: ${s} series, ${c} categories`,
    table: 'Bar chart data',
    category: 'Category',
    total: 'Total',
    share: 'Share',
    toggle: (n) => `Show or hide “${n}”`,
  },
  rate: 'Rating',
  wheel: { label: 'Prize wheel', summary: (l, p) => `${l}: ${p.join(', ')}`, spin: 'Spin the wheel', spinning: 'Spinning…', result: (p) => `You won: ${p}` },
  pickerView: { label: 'Wheel picker', column: (n) => `Column ${n}`, cancel: 'Cancel', confirm: 'Done', selected: (l) => `Selected: ${l.join(', ')}` },
  toast: { region: 'Notifications', close: 'Dismiss notification' },
  theme: { label: 'Theme', switch: 'Light mode', dark: 'Dark', light: 'Light', system: 'System', toDark: 'Switch to dark theme', toLight: 'Switch to light theme' },
  qrcode: { tooLong: 'Too long for a QR code', label: (v) => `QR code: ${v}` },
  barcode: { invalid: "This format can't encode that value", label: (v) => `Barcode: ${v}` },
  avatarGroup: { label: 'Members', more: (n) => `${n} more`, showAll: (n) => `Show ${n} more`, collapse: 'Show fewer' },
  amount: { capital: 'In words (NT$)' },
  numberKeyboard: { label: 'Number keyboard', delete: 'Delete', close: 'Done', collapse: 'Hide keyboard' },
  indexBar: { label: 'Index', jump: (i) => `Jump to ${i}`, empty: 'Nothing here' },
  scheduler: {
    label: 'Schedule',
    today: 'Today',
    prev: 'Previous',
    next: 'Next',
    week: 'Week',
    day: 'Day',
    allDay: 'All day',
    hint: 'Arrow up/down moves by one slot, left/right by a day; Shift + up/down changes the end. Drag on an empty slot to add an event.',
    moved: (title, when) => `${title} moved to ${when}`,
  },
  address: {
    label: 'Address',
    zip: 'Postal code',
    zipHint: 'The first 3 digits follow the district; add the last 3 if you know them',
    zipMismatch: 'The first 3 digits don’t match the district',
    zipInvalid: 'Postal codes have 3, 5 or 6 digits',
    road: 'Road / street',
    roadPlaceholder: 'e.g. 重慶南路 (or paste a whole address)',
    section: 'Sec.',
    lane: 'Ln.',
    alley: 'Aly.',
    number: 'No.',
    floor: 'F',
    room: 'Unit',
    preview: 'Full address',
    english: 'In English',
    pasteHint: 'Pasted address split into fields',
  },
  filter: {
    label: 'Filters',
    search: 'Search',
    reset: 'Reset',
    more: (n) => `More filters (${n})`,
    less: 'Fewer filters',
    all: 'All',
    min: 'Min',
    max: 'Max',
    clear: (f) => `Clear “${f}”`,
    clearAll: 'Clear all',
    applied: (n) => `${n} filter${n === 1 ? '' : 's'} applied`,
  },
  query: {
    label: 'Query',
    and: 'AND',
    or: 'OR',
    combinator: 'Match',
    addRule: 'Add rule',
    addGroup: 'Add group',
    removeRule: 'Remove rule',
    removeGroup: 'Remove group',
    field: 'Field',
    operator: 'Operator',
    value: 'Value',
    from: 'From',
    to: 'To',
    yes: 'Yes',
    no: 'No',
    empty: 'No rules yet: everything matches',
    ops: {
      contains: 'contains',
      notContains: 'does not contain',
      eq: 'equals',
      neq: 'does not equal',
      startsWith: 'starts with',
      endsWith: 'ends with',
      gt: '>',
      gte: '≥',
      lt: '<',
      lte: '≤',
      between: 'between',
      in: 'is any of',
      notIn: 'is none of',
      before: 'before',
      after: 'after',
      empty: 'is empty',
      notEmpty: 'is not empty',
      isTrue: 'is true',
      isFalse: 'is false',
    },
  },
  waterfall: {
    table: 'Waterfall data',
    category: 'Item',
    change: 'Change',
    running: 'Running total',
    total: 'Subtotal',
    increase: 'Increase',
    decrease: 'Decrease',
    summary: (n) => `Waterfall chart, ${n} items. Use the arrow keys to step through them.`,
  },
  boxplot: {
    table: 'Box plot data',
    group: 'Group',
    min: 'Min',
    q1: 'Q1',
    median: 'Median',
    q3: 'Q3',
    max: 'Max',
    mean: 'Mean',
    outliers: 'Outliers',
    count: 'Count',
    summary: (n) => `Box plot, ${n} groups. Use the arrow keys to step through them.`,
  },
  bullet: {
    value: 'Actual',
    target: 'Target',
    describe: (label, value, target, band) => [`${label}: ${value}`, target && `target ${target}`, band && `in the “${band}” band`].filter(Boolean).join(', '),
    bands: ['Poor', 'Fair', 'Good', 'Excellent'],
  },
  player: {
    video: 'Video player',
    audio: 'Audio player',
    play: 'Play',
    pause: 'Pause',
    replay: 'Replay',
    mute: 'Mute',
    unmute: 'Unmute',
    volume: 'Volume',
    seek: 'Seek',
    speed: 'Playback speed',
    normal: 'Normal',
    captions: 'Captions',
    captionsOff: 'Off',
    fullscreen: 'Full screen',
    exitFullscreen: 'Exit full screen',
    pip: 'Picture in picture',
    back: (s) => `Back ${s} seconds`,
    forward: (s) => `Forward ${s} seconds`,
    loading: 'Loading',
    error: 'This media can’t be played',
    time: (c, d) => `${c} of ${d}`,
  },
  link: { external: '(opens in a new tab)' },
  signature: {
    label: 'Signature pad',
    placeholder: 'Sign here',
    hint: 'Sign inside the box with a mouse, finger or pen. Ctrl + Z undoes the last stroke, Delete clears everything.',
    undo: 'Undo last stroke',
    clear: 'Clear signature',
    empty: 'Not signed yet',
    signed: (n) => `Signed, ${n === 1 ? '1 stroke' : `${n} strokes`}`,
    cleared: 'Signature cleared',
  },
  cropper: {
    label: 'Image cropper',
    box: 'Crop area',
    hint: 'Arrow keys move the crop area (Shift for bigger steps), Alt + arrows resize it, + / − zoom. You can also drag the image to pan, and zoom with the wheel or a pinch.',
    empty: 'No image selected',
    error: 'The image failed to load',
    toolbar: 'Crop tools',
    zoom: 'Zoom',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    rotateLeft: 'Rotate left 90°',
    rotateRight: 'Rotate right 90°',
    reset: 'Reset',
    status: (w, h, x, y, z) => `Crop ${w} × ${h} at ${x}, ${y}, zoom ${z}%`,
  },
  result: {
    success: { title: 'All done!', subtitle: 'Everything went smoothly — the pride cheers.' },
    info: { title: 'Heads up', subtitle: 'There’s something worth a look here.' },
    warning: { title: 'Please double-check', subtitle: 'Something doesn’t look quite right.' },
    error: { title: 'Something went wrong', subtitle: 'That didn’t finish. Please try again later.' },
    '403': { title: 'The lion king’s territory', subtitle: 'You don’t have access to this page.' },
    '404': { title: 'Page not found', subtitle: 'A cub ran off with it — or it never existed.' },
    '500': { title: 'The server took a nap', subtitle: 'Our engineer lions are on it. Please come back soon.' },
  },
  checkboxGroup: { all: 'Select all' },
  sheet: { handle: 'Resize sheet', position: (n, total) => `Position ${n} of ${total}`, actions: 'Actions' },
  puzzle: {
    label: (alt) => (alt ? `Jigsaw puzzle: ${alt}` : 'Jigsaw puzzle'),
    piece: (n, r, c, ok) => `Piece ${n}, row ${r}, column ${c}${ok ? ', in place' : ''}`,
    picked: (n) => `Picked up piece ${n}: move to a piece and press Enter to swap, Escape to put it down`,
    swapped: (a, b) => `Swapped pieces ${a} and ${b}`,
    solved: (m, t) => `Solved in ${m} ${m === 1 ? 'move' : 'moves'}, ${t}`,
    progress: (p, t) => `${p} of ${t} in place`,
    moves: (n) => `${n} ${n === 1 ? 'move' : 'moves'}`,
    shuffle: 'Shuffle',
  },
  globe: {
    label: 'Globe',
    summary: (n) => (n ? `Globe with ${n} ${n === 1 ? 'marker' : 'markers'}` : 'Globe'),
    hint: 'Arrow keys rotate, Home goes back',
    marker: (l, p) => `${l} (${p})`,
  },
  captcha: {
    label: 'Security check',
    hint: 'Slide to complete the puzzle',
    slider: 'Puzzle slider: arrow keys move it, Enter checks',
    checking: 'Checking…',
    success: 'Verified',
    fail: 'Not quite — try again',
    refresh: 'New puzzle',
    locked: 'Too many tries — here is a new one',
  },
  scratch: { cover: 'Scratch here', label: 'Scratch card', hint: 'Scratch the coating off, or press Enter to reveal', revealed: 'Revealed', revealNow: 'Reveal' },
  lottery: {
    grid: 'Prize grid',
    gacha: 'Gacha machine',
    draw: 'Draw',
    turn: 'Turn',
    drawing: 'Drawing…',
    result: (p) => `You won: ${p}`,
    again: 'Again',
    none: 'No prize this time',
  },
  relativeTime: { justNow: 'just now' },
  sticker: {
    label: 'Stickers',
    open: 'Choose a sticker',
    search: 'Search stickers',
    recent: 'Recent',
    groups: { animals: 'Animals', food: 'Food', nature: 'Nature', things: 'Things', tech: 'Tech' },
    results: (n) => (n ? `${n} sticker${n === 1 ? '' : 's'} found` : 'No stickers found'),
    noMatch: 'No matching stickers',
    noRecent: 'No recent stickers yet',
    names: {
      lion: 'Lion', cat: 'Cat', dog: 'Dog', bear: 'Bear', bunny: 'Bunny', chick: 'Chick', panda: 'Panda', frog: 'Frog',
      bubbleTea: 'Bubble tea', coffee: 'Coffee', donut: 'Donut', cupcake: 'Cupcake', iceCream: 'Ice cream', strawberry: 'Strawberry',
      sun: 'Sun', moon: 'Moon', cloud: 'Cloud', rain: 'Rain', star: 'Star', rainbow: 'Rainbow', flower: 'Flower', sprout: 'Sprout',
      heart: 'Heart', paw: 'Paw', gift: 'Gift', rocket: 'Rocket', bell: 'Bell', mail: 'Mail', chat: 'Chat', camera: 'Camera',
      music: 'Music', game: 'Game', trophy: 'Trophy', crown: 'Crown', bulb: 'Light bulb', home: 'Home', ghost: 'Ghost',
      cyberLion: 'Cyber lion', robot: 'Robot', chip: 'Chip', laptop: 'Laptop', terminal: 'Terminal', bolt: 'Bolt', shield: 'Shield',
      gear: 'Gear', key: 'Key', lock: 'Lock', database: 'Database', bug: 'Bug', signal: 'Signal', battery: 'Battery', sparkle: 'Sparkle',
    },
  },
  comments: {
    label: 'Comments',
    title: 'Comments',
    count: (n) => `${n}`,
    sortLabel: 'Sort',
    sort: { newest: 'Newest', oldest: 'Oldest', popular: 'Popular' },
    placeholder: 'Share your thoughts…',
    replyPlaceholder: (name) => `Reply to ${name}…`,
    reply: 'Reply',
    replyTo: (name) => `Replying to @${name}`,
    submit: 'Post',
    cancel: 'Cancel',
    hint: 'Ctrl + Enter to post',
    like: (n) => `Like (${n})`,
    expand: (n) => `Show ${n} more ${n === 1 ? 'reply' : 'replies'}`,
    collapse: 'Hide replies',
    empty: 'No comments yet',
    emptyHint: 'Be the first to comment!',
    submitted: 'Comment posted',
    you: 'You',
  },
  swipeStack: {
    label: 'Card stack',
    like: 'Like',
    nope: 'Nope',
    super: 'Super like',
    undo: 'Undo',
    stamp: { like: 'LIKE', nope: 'NOPE', super: 'SUPER' },
    card: (n, t) => `Card ${n} of ${t}`,
    swiped: (d, l) => `${d === 'right' ? 'Liked' : d === 'left' ? 'Skipped' : 'Super liked'}${l ? `: ${l}` : ''}`,
    undone: 'Brought the last card back',
    empty: 'No more cards',
    hint: 'Swipe or use the arrow keys; Backspace to undo',
  },
  inbox: {
    label: 'Notifications',
    open: (n) => (n ? `Notifications, ${n} unread` : 'Notifications'),
    tabs: { all: 'All', unread: 'Unread', mention: 'Mentions' },
    readAll: 'Mark all as read',
    dismiss: (t) => `Dismiss notification: ${t}`,
    unread: 'Unread',
    groups: { today: 'Today', yesterday: 'Yesterday', earlier: 'Earlier' },
    empty: { all: 'No notifications', unread: 'You are all caught up', mention: 'No mentions yet' },
    markedAll: 'All marked as read',
    dismissed: (t) => `Dismissed: ${t}`,
    types: { info: 'Info', success: 'Success', warning: 'Warning', danger: 'Error', mention: 'Mention' },
  },
  radar: {
    label: 'Radar',
    summary: (n) => (n ? `Radar with ${n} ${n === 1 ? 'contact' : 'contacts'}` : 'Radar, no contacts'),
    blip: (l, b, d) => `${l ?? 'Contact'}: bearing ${b}, range ${d}`,
  },
  clock: {
    label: 'Clock',
    time: (p, h, m) => `${p ? `${p}, ` : ''}${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`,
  },
  bank: {
    label: 'Bank',
    search: 'Bank code or name',
    account: 'Account number',
    accountPlaceholder: 'Digits only',
    accountHint: (n) => (n ? `${n} digits · accounts usually have 10–16` : 'Accounts usually have 10–16 digits'),
  },
  lunar: {
    label: 'Lunar calendar',
    year: (gz, z) => `${gz} · Year of the ${['Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig'][z]}`,
    day: (lunar, names, off, workday) =>
      `lunar ${lunar}${names.length ? `, ${names.join(', ')}` : ''}${off ? ' (day off)' : workday ? ' (working day)' : ''}`,
  },
  invoice: {
    label: 'Receipt lottery checker',
    period: 'Period',
    modes: 'Check by',
    quick: 'Last 3 digits',
    full: 'Full number',
    quickLabel: 'Last 3 digits of the receipt',
    fullLabel: 'Receipt number (8 digits)',
    none: 'No prize this time',
    maybe: 'Possible win — check the full number',
    noneShort: 'No prize',
    maybeShort: 'Check',
    atLeast: (amount) => `The last 3 digits match a first-prize number: at least ${amount}`,
    win: (prize, amount) => `You won the ${prize}: ${amount}!`,
    check: 'Check against:',
    prizes: {
      special: 'special prize',
      grand: 'grand prize',
      first: 'first prize',
      second: 'second prize',
      third: 'third prize',
      fourth: 'fourth prize',
      fifth: 'fifth prize',
      sixth: 'sixth prize',
      extraSixth: 'extra sixth prize',
      cloud: 'cloud invoice prize',
    },
    amount: (n) => `NT$${n.toLocaleString('en-US')}`,
    numbers: 'Winning numbers',
    firstRule: 'Last 7 to 3 digits: 2nd NT$40,000 · 3rd 10,000 · 4th 4,000 · 5th 1,000 · 6th 200',
    history: 'Checked',
    clearHistory: 'Clear',
    noDraws: 'No winning numbers yet',
    waiting: 'Type a number to check it',
  },
  password: {
    show: 'Show password',
    hide: 'Hide password',
    capsLock: 'Caps Lock is on',
    strength: 'Strength',
    levels: ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'],
    rules: 'Password rules',
    met: 'met',
    unmet: 'not met',
    minLength: (n) => `At least ${n} characters`,
    upper: 'An uppercase letter',
    lower: 'A lowercase letter',
    digit: 'A number',
    symbol: 'A symbol',
  },
  form: {
    required: 'This field is required',
    pattern: 'Invalid format',
    email: 'Enter a valid email address',
    url: 'Enter a valid URL',
    number: 'Enter a number',
    integer: 'Enter a whole number',
    minChars: (n) => `At least ${n} characters`,
    minItems: (n) => `Choose at least ${n}`,
    minValue: (n) => `Must be at least ${n}`,
    maxChars: (n) => `At most ${n} characters`,
    maxItems: (n) => `Choose at most ${n}`,
    maxValue: (n) => `Must be at most ${n}`,
  },
  twValidate: {
    nationalId: 'Invalid Taiwan ID number',
    residentId: 'Invalid resident certificate (UI) number',
    personalId: 'Invalid ID or resident certificate number',
    businessId: 'Invalid business ID (UBN)',
    mobile: 'Invalid mobile number',
    landline: 'Invalid landline number',
    phone: 'Invalid phone number',
    mobileBarcode: 'Invalid mobile barcode',
    citizenCert: 'Invalid citizen certificate barcode',
    postalCode: 'Invalid postal code',
    postalCodeUnknown: 'Unknown postal code',
    bankCode: 'Unknown bank code',
    bankAccount: 'Invalid account number',
  },
}

/* ── Partial locales ──────────────────────────────────────── */

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends (...args: never[]) => unknown ? T[K] : T[K] extends readonly unknown[] ? T[K] : T[K] extends object ? DeepPartial<T[K]> : T[K]
}

/**
 * A locale you ship yourself. Only `name` is required: anything missing — for
 * example strings added by a newer MalilionUI — is filled in from `en` when the
 * name starts with "en", otherwise from `zhTW`.
 */
export type MlLocaleInput = { name: string } & DeepPartial<Omit<MlLocale, 'name'>>

const isPlain = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

function fill(base: Record<string, unknown>, own: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(own)) {
    if (value === undefined) continue
    out[key] = isPlain(value) && isPlain(base[key]) ? fill(base[key], value) : value
  }
  return out
}

const completed = new WeakMap<object, MlLocale>()

/** A full locale from a partial one (cached, so it is cheap to call on every render). */
export function completeLocale(locale: MlLocaleInput): MlLocale {
  if (locale === zhTW || locale === en) return locale as MlLocale
  let full = completed.get(locale)
  if (!full) {
    const base = /^en\b/i.test(locale.name) ? en : zhTW
    full = fill(base as unknown as Record<string, unknown>, locale) as unknown as MlLocale
    completed.set(locale, full)
  }
  return full
}
