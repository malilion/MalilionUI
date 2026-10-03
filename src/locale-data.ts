// Locale strings only — no framework imports, so the React build can share them.
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
    steps: string
    stepDone: string
    stepCurrent: string
    anchor: string
    backTop: string
    back: string
  }
  carousel: { label: string; prev: string; next: string; play: string; pause: string; slide: (n: number) => string }
  calendar: { prevMonth: string; nextMonth: string }
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
  heatmap: { cell: (count: number, date: string) => string; summary: (total: number) => string; less: string; more: string }
  rate: string
  toast: { region: string; close: string }
  qrcode: { tooLong: string; label: (value: string) => string }
  result: Record<'success' | 'info' | 'warning' | 'error' | '403' | '404' | '500', { title: string; subtitle: string }>
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
  calendar: { prevMonth: '上個月', nextMonth: '下個月' },
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
  heatmap: { cell: (n, d) => `${d}：${n} 次`, summary: (t) => `一年內共 ${t.toLocaleString()} 次貢獻`, less: '少', more: '多' },
  rate: '評分',
  toast: { region: '通知', close: '關閉通知' },
  qrcode: { tooLong: '內容太長，無法產生 QR Code', label: (v) => `QR Code：${v}` },
  result: {
    success: { title: '完成了！', subtitle: '一切順利，獅群為你歡呼。' },
    info: { title: '提醒你一下', subtitle: '這裡有些資訊值得留意。' },
    warning: { title: '請再確認一次', subtitle: '有些地方看起來不太對勁。' },
    error: { title: '出了點問題', subtitle: '動作沒有完成，請稍後再試。' },
    '403': { title: '這裡是獅王的領地', subtitle: '你沒有權限進入這個頁面。' },
    '404': { title: '找不到這個頁面', subtitle: '小獅子把它叼走了，或是它從來不存在。' },
    '500': { title: '伺服器打了個盹', subtitle: '我們的工程獅正在搶修，請稍後再回來。' },
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
  calendar: { prevMonth: 'Previous month', nextMonth: 'Next month' },
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
  heatmap: { cell: (n, d) => `${n === 1 ? '1 contribution' : `${n} contributions`} on ${d}`, summary: (t) => `${t.toLocaleString()} contributions in the last year`, less: 'Less', more: 'More' },
  rate: 'Rating',
  toast: { region: 'Notifications', close: 'Dismiss notification' },
  qrcode: { tooLong: 'Too long for a QR code', label: (v) => `QR code: ${v}` },
  result: {
    success: { title: 'All done!', subtitle: 'Everything went smoothly — the pride cheers.' },
    info: { title: 'Heads up', subtitle: 'There’s something worth a look here.' },
    warning: { title: 'Please double-check', subtitle: 'Something doesn’t look quite right.' },
    error: { title: 'Something went wrong', subtitle: 'That didn’t finish. Please try again later.' },
    '403': { title: 'The lion king’s territory', subtitle: 'You don’t have access to this page.' },
    '404': { title: 'Page not found', subtitle: 'A cub ran off with it — or it never existed.' },
    '500': { title: 'The server took a nap', subtitle: 'Our engineer lions are on it. Please come back soon.' },
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
}
