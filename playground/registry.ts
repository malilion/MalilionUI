// Everything the docs site knows about: menu groups, pages, examples, API tables.
// Example `file` paths point at playground/examples/<file>.vue — the same file is
// rendered live and shown (and copied) as source, so the two can never drift.

export interface ExampleDef {
  file: string
  title: string
  desc?: string
  /** Full-width stage (forms, tables, cards) instead of a wrapping row. */
  block?: boolean
}

export interface PropDoc {
  name: string
  desc: string
  type: string
  default?: string
}

export interface EventDoc {
  name: string
  desc: string
  type?: string
}

export interface SlotDoc {
  name: string
  desc: string
}

export interface ApiDoc {
  component: string
  props?: PropDoc[]
  events?: EventDoc[]
  slots?: SlotDoc[]
}

export interface PageDef {
  id: string
  title: string
  zh: string
  group: GroupId
  desc: string
  /** What to import, shown under the page title. */
  usage?: string
  /** Extra one-off setup shown before the examples (e.g. the toast host). */
  setup?: { title: string; filename: string; lang?: string; code: string }
  isNew?: boolean
  examples?: ExampleDef[]
  api?: ApiDoc[]
}

export type GroupId = 'start' | 'basic' | 'form' | 'feedback' | 'data' | 'chart' | 'nav' | 'mobile' | 'template'

export const groups: { id: GroupId; label: string; en: string }[] = [
  { id: 'start', label: '開始', en: 'Getting started' },
  { id: 'basic', label: '基礎', en: 'Basic' },
  { id: 'form', label: '表單', en: 'Form' },
  { id: 'feedback', label: '回饋', en: 'Feedback' },
  { id: 'data', label: '資料展示', en: 'Data display' },
  { id: 'chart', label: '圖表', en: 'Charts' },
  { id: 'nav', label: '導覽', en: 'Navigation' },
  { id: 'mobile', label: '行動版', en: 'Mobile' },
  { id: 'template', label: '範本', en: 'Templates' },
]

const sizeType = `'sm' | 'md' | 'lg'`

export const pages: PageDef[] = [
  /* ── 開始 ─────────────────────────────────────────────── */
  { id: 'home', title: 'Overview', zh: '總覽', group: 'start', desc: '' },
  { id: 'start', title: 'Quick start', zh: '快速開始', group: 'start', desc: '' },
  { id: 'tokens', title: 'Design tokens', zh: '設計代幣', group: 'start', desc: '' },
  {
    id: 'paw',
    title: 'Paw',
    zh: '獅掌',
    group: 'start',
    desc: '獅子腳印是碼力獅的可愛簽名：金屬感的肉球、按下去會「蓋章」的按鈕，以及散佈在各元件裡的小腳印。',
    usage: `import { MlPaw, vPawStamp, pawStamp } from '@malilion/ui'`,
    examples: [
      { file: 'paw/tones', title: '色調與尺寸', desc: '五種色調；tone="current" 會跟隨文字顏色，方便放進任何地方。' },
      { file: 'paw/stamp', title: '蓋章效果 v-paw-stamp', desc: '按下就在游標位置蓋一個會飄走的腳印。可以掛在任何元素上，MlButton 直接用 stamp 屬性。' },
      { file: 'paw/everywhere', title: '藏在元件裡的腳印', desc: '徽章、勾選框、單選、分隔線、載入器、進度條、表格、下拉選單與通知都有腳印版本。', block: true },
    ],
    api: [
      {
        component: 'MlPaw',
        props: [
          { name: 'tone', desc: '色調，current 跟隨文字顏色', type: `'gold' | 'bean' | 'steel' | 'tech' | 'current'`, default: `'gold'` },
          { name: 'size', desc: '數字為 px，或任何 CSS 長度', type: 'number | string', default: `'1em'` },
          { name: 'shine', desc: '肉球上的光澤點', type: 'boolean', default: 'true' },
          { name: 'title', desc: '無障礙名稱；不給則視為裝飾', type: 'string' },
        ],
      },
      {
        component: 'v-paw-stamp',
        events: [
          { name: 'v-paw-stamp', desc: '按下時蓋腳印。值為 true、色調，或 false 關閉', type: `boolean | 'gold' | 'bean' | 'steel' | 'tech'` },
          { name: 'pawStamp(x, y, tone?)', desc: '在視窗座標手動蓋一個腳印', type: '(x: number, y: number, tone?: MlPawTone) => void' },
        ],
      },
    ],
  },

  /* ── 基礎 ─────────────────────────────────────────────── */
  {
    id: 'button',
    title: 'Button',
    zh: '按鈕',
    group: 'basic',
    desc: '切角金屬板，滑過時有一道拋光反光掃過；加上 stamp 會在按下的位置蓋腳印。',
    usage: `import { MlButton } from '@malilion/ui'`,
    examples: [
      { file: 'button/variants', title: '外觀', desc: '六種外觀：獅金、鈦金屬、外框、科技、幽靈與危險。' },
      { file: 'button/sizes', title: '尺寸' },
      { file: 'button/states', title: '狀態與圖示', desc: '載入中會自動停用；只放圖示時用 square 並記得加 aria-label。' },
      { file: 'button/stamp', title: '腳印蓋章', desc: 'stamp 可以是 true 或指定色調。' },
    ],
    api: [
      {
        component: 'MlButton',
        props: [
          { name: 'variant', desc: '外觀', type: `'primary' | 'steel' | 'outline' | 'tech' | 'ghost' | 'danger'`, default: `'primary'` },
          { name: 'size', desc: '尺寸', type: sizeType, default: `'md'` },
          { name: 'type', desc: '原生 button type', type: `'button' | 'submit' | 'reset'`, default: `'button'` },
          { name: 'href', desc: '有值時渲染成 <a>', type: 'string' },
          { name: 'loading', desc: '顯示轉圈並停用', type: 'boolean', default: 'false' },
          { name: 'disabled', desc: '停用', type: 'boolean', default: 'false' },
          { name: 'block', desc: '撐滿寬度', type: 'boolean', default: 'false' },
          { name: 'square', desc: '正方形（純圖示按鈕）', type: 'boolean', default: 'false' },
          { name: 'stamp', desc: '按下時蓋腳印', type: 'boolean | MlPawTone', default: 'false' },
        ],
        slots: [
          { name: 'default', desc: '按鈕文字' },
          { name: 'prefix', desc: '文字前的圖示（載入中時被轉圈取代）' },
          { name: 'suffix', desc: '文字後的圖示' },
        ],
      },
    ],
  },
  {
    id: 'badge',
    title: 'Badge',
    zh: '徽章',
    group: 'basic',
    desc: '沖壓出來的小標籤，可加狀態燈或小腳印。',
    usage: `import { MlBadge } from '@malilion/ui'`,
    examples: [
      { file: 'badge/tones', title: '色調' },
      { file: 'badge/solid', title: '實心金屬' },
      { file: 'badge/status', title: '狀態燈與腳印' },
    ],
    api: [
      {
        component: 'MlBadge',
        props: [
          { name: 'tone', desc: '色調', type: `'gold' | 'steel' | 'tech' | 'bean' | 'success' | 'danger'`, default: `'gold'` },
          { name: 'solid', desc: '實心金屬底', type: 'boolean', default: 'false' },
          { name: 'size', desc: '尺寸', type: `'md' | 'lg'`, default: `'md'` },
          { name: 'dot', desc: '前方狀態燈', type: 'boolean', default: 'false' },
          { name: 'pulse', desc: '會脈動的狀態燈', type: 'boolean', default: 'false' },
          { name: 'paw', desc: '前方小腳印', type: 'boolean', default: 'false' },
        ],
      },
    ],
  },
  {
    id: 'card',
    title: 'Card',
    zh: '卡片',
    group: 'basic',
    desc: '拉絲裝甲板。plate / gold / steel / tech 四種外殼，可加鉚釘或做成可點擊。',
    usage: `import { MlCard } from '@malilion/ui'`,
    examples: [
      { file: 'card/basic', title: '基本用法', desc: '標題、眉標、內容、頁尾按鈕與鉚釘。', block: true },
      { file: 'card/variants', title: '外殼與互動', desc: 'interactive 會浮起發光，記得搭配點擊行為與 tabindex。', block: true },
    ],
    api: [
      {
        component: 'MlCard',
        props: [
          { name: 'variant', desc: '外殼', type: `'plate' | 'gold' | 'steel' | 'tech'`, default: `'plate'` },
          { name: 'title', desc: '標題', type: 'string' },
          { name: 'eyebrow', desc: '標題上方的小標', type: 'string' },
          { name: 'rivets', desc: '在未切角的兩端加鉚釘', type: 'boolean', default: 'false' },
          { name: 'interactive', desc: '滑過浮起發光', type: 'boolean', default: 'false' },
          { name: 'tag', desc: '根元素標籤', type: 'string', default: `'section'` },
        ],
        slots: [
          { name: 'default', desc: '內容' },
          { name: 'header', desc: '取代預設的標題區' },
          { name: 'actions', desc: '標題右側的操作' },
          { name: 'footer', desc: '頁尾（虛線分隔）' },
        ],
      },
    ],
  },
  {
    id: 'divider',
    title: 'Divider',
    zh: '分隔線',
    group: 'basic',
    desc: '兩端淡出的細線，中間可放文字、獅爪痕或一串小腳印。',
    usage: `import { MlDivider } from '@malilion/ui'`,
    examples: [{ file: 'divider/basic', title: '四種樣式', block: true }],
    api: [
      {
        component: 'MlDivider',
        props: [
          { name: 'label', desc: '中間文字', type: 'string' },
          { name: 'claw', desc: '三道獅爪痕', type: 'boolean', default: 'false' },
          { name: 'paw', desc: '一串小腳印', type: 'boolean', default: 'false' },
        ],
      },
    ],
  },
  {
    id: 'lion-mark',
    title: 'LionMark',
    zh: '獅徽',
    group: 'basic',
    desc: '多面體金屬獅徽，額頭有 </> 程式碼記號，眼睛會發光。',
    usage: `import { MlLionMark } from '@malilion/ui'`,
    examples: [{ file: 'lion-mark/basic', title: '尺寸、光暈與動畫' }],
    api: [
      {
        component: 'MlLionMark',
        props: [
          { name: 'size', desc: '尺寸（px）', type: 'number', default: '64' },
          { name: 'glow', desc: '金色光暈', type: 'boolean', default: 'false' },
          { name: 'animated', desc: '鬃毛呼吸與眨眼', type: 'boolean', default: 'false' },
          { name: 'title', desc: '無障礙名稱；不給則視為裝飾', type: 'string' },
        ],
      },
    ],
  },

  /* ── 表單 ─────────────────────────────────────────────── */
  {
    id: 'input',
    title: 'Input',
    zh: '輸入框',
    group: 'form',
    desc: 'HUD 風格欄位：聚焦時外框轉金，底部射出一道能量線。',
    usage: `import { MlInput } from '@malilion/ui'`,
    examples: [
      { file: 'input/basic', title: '基本用法', desc: 'index 是標籤前的 HUD 編號。', block: true },
      { file: 'input/affix', title: '前後綴', block: true },
      { file: 'input/validation', title: '驗證錯誤', desc: '錯誤訊息會自動透過 aria-describedby 連到輸入框。', block: true },
    ],
    api: [
      {
        component: 'MlInput',
        props: [
          { name: 'v-model', desc: '值', type: 'string | number' },
          { name: 'label', desc: '標籤', type: 'string' },
          { name: 'index', desc: 'HUD 編號，例如 "01"', type: 'string' },
          { name: 'hint', desc: '說明文字', type: 'string' },
          { name: 'error', desc: '錯誤訊息（同時標示 aria-invalid）', type: 'string' },
          { name: 'type', desc: '原生 type', type: 'string', default: `'text'` },
          { name: 'size', desc: '尺寸', type: sizeType, default: `'md'` },
          { name: 'placeholder / required / disabled / readonly / id', desc: '同原生屬性', type: '—' },
        ],
        slots: [
          { name: 'prefix', desc: '前綴（圖示或文字）' },
          { name: 'suffix', desc: '後綴' },
          { name: 'label', desc: '自訂標籤內容' },
        ],
      },
    ],
  },
  {
    id: 'textarea',
    title: 'Textarea',
    zh: '多行輸入',
    group: 'form',
    desc: '和 Input 同一套外觀的多行欄位。',
    usage: `import { MlTextarea } from '@malilion/ui'`,
    examples: [{ file: 'textarea/basic', title: '基本用法', block: true }],
    api: [
      {
        component: 'MlTextarea',
        props: [
          { name: 'v-model', desc: '值', type: 'string' },
          { name: 'rows', desc: '列數', type: 'number', default: '4' },
          { name: 'label / index / hint / error', desc: '同 MlInput', type: 'string' },
        ],
      },
    ],
  },
  {
    id: 'select',
    title: 'Select',
    zh: '下拉選擇',
    group: 'form',
    desc: '原生 select 換上 HUD 外殼，手機上保有系統選單。',
    usage: `import { MlSelect } from '@malilion/ui'`,
    examples: [{ file: 'select/basic', title: '基本用法', block: true }],
    api: [
      {
        component: 'MlSelect',
        props: [
          { name: 'v-model', desc: '值', type: 'string | number' },
          { name: 'options', desc: '選項', type: '{ value, label, disabled? }[]' },
          { name: 'placeholder', desc: '尚未選擇時顯示', type: 'string' },
          { name: 'label / index / hint / error / size', desc: '同 MlInput', type: '—' },
        ],
      },
    ],
  },
  {
    id: 'combobox',
    title: 'Combobox',
    zh: '進階選擇',
    group: 'form',
    isNew: true,
    desc: '完全自繪的下拉選擇：可搜尋、可多選、可清除，選單和金屬外殼一致。鍵盤操作遵循 WAI-ARIA combobox 模式（方向鍵、Home / End、首字跳轉、Esc 只關選單）。需要手機原生選單時改用 MlSelect。',
    usage: `import { MlCombobox } from '@malilion/ui'`,
    examples: [
      { file: 'combobox/basic', title: '基本用法', desc: '加上 clearable 會出現清除按鈕。', block: true },
      { file: 'combobox/searchable', title: '可搜尋', desc: 'searchable 讓輸入框即時篩選；符合的片段會標亮。', block: true },
      { file: 'combobox/multiple', title: '多選', desc: 'multiple 時 v-model 是陣列，已選項目以標籤顯示，選單保持開啟方便連續挑選。', block: true },
    ],
    api: [
      {
        component: 'MlCombobox',
        props: [
          { name: 'v-model', desc: '單選為值，multiple 時為陣列', type: 'string | number | null | (string | number)[]', default: 'null' },
          { name: 'options', desc: '選項', type: 'MlSelectOption[]' },
          { name: 'searchable', desc: '輸入篩選', type: 'boolean', default: 'false' },
          { name: 'multiple', desc: '多選', type: 'boolean', default: 'false' },
          { name: 'clearable', desc: '顯示清除按鈕', type: 'boolean', default: 'false' },
          { name: 'filter', desc: '自訂篩選函式', type: '(option, query) => boolean' },
          { name: 'placeholder', desc: '尚未選擇時顯示', type: 'string', default: `'請選擇'` },
          { name: 'no-match-text', desc: '沒有符合項目時的文字', type: 'string', default: `'找不到符合的選項'` },
          { name: 'name', desc: '輸出 hidden input，讓原生表單也能送出', type: 'string' },
          { name: 'label / index / hint / error / size / required / disabled', desc: '同 MlInput', type: '—' },
        ],
        events: [{ name: 'change', desc: '使用者改變選擇時', type: '(value) => void' }],
        slots: [
          { name: 'option', desc: '自訂選項內容，提供 { option, selected }' },
          { name: 'tag', desc: '多選標籤內容，提供 { option }' },
          { name: 'selected', desc: '單選、非搜尋模式下已選值的顯示，提供 { option }' },
          { name: 'prefix', desc: '前綴（圖示等）' },
        ],
      },
    ],
  },
  {
    id: 'form',
    title: 'Form',
    zh: '表單驗證',
    group: 'form',
    isNew: true,
    desc: 'MlForm 管理整份表單的規則；MlFormItem 用 prop 指向欄位，錯誤會自動顯示在裡面的 MlInput、MlCombobox 等元件上（含 aria-invalid）。欄位失焦後開始即時驗證；送出時全部檢查，並把焦點移到第一個錯誤。',
    usage: `import { MlForm, MlFormItem, type MlFormRules } from '@malilion/ui'`,
    examples: [
      { file: 'form/basic', title: '完整表單', desc: '必填、長度、Email 格式、非同步檢查（試試輸入 Simba），以及沒有內建錯誤列的勾選框。', block: true },
      { file: 'form/item-rules', title: '欄位上的規則', desc: '規則也能直接寫在 MlFormItem 上；validator 拿得到整個 model，適合「確認密碼」這類交叉檢查。', block: true },
    ],
    api: [
      {
        component: 'MlForm',
        props: [
          { name: 'model', desc: '表單資料（reactive 物件）', type: 'Record<string, unknown>' },
          { name: 'rules', desc: '以欄位路徑為 key 的規則', type: 'MlFormRules' },
        ],
        events: [
          { name: 'submit', desc: '全部通過時觸發', type: '(model) => void' },
          { name: 'invalid', desc: '有欄位未通過；焦點已移到第一個錯誤', type: '(errors: Record<string, string>) => void' },
        ],
        slots: [{ name: 'default', desc: '表單內容' }],
      },
      {
        component: 'MlForm (ref)',
        events: [
          { name: 'validate()', desc: '驗證全部欄位', type: '() => Promise<boolean>' },
          { name: 'validateField(prop)', desc: '驗證單一欄位，回傳錯誤訊息', type: '(prop: string) => Promise<string | undefined>' },
          { name: 'clearValidation(props?)', desc: '清除錯誤（全部或指定欄位）', type: '(props?: string[]) => void' },
        ],
      },
      {
        component: 'MlFormItem',
        props: [
          { name: 'prop', desc: '欄位在 model 中的路徑，支援 a.b', type: 'string' },
          { name: 'rules', desc: '額外規則，接在表單規則之後', type: 'MlFormRule | MlFormRule[]' },
        ],
        slots: [{ name: 'default', desc: '一個表單元件，提供 { error, validate }' }],
      },
      {
        component: 'MlFormRule',
        props: [
          { name: 'required', desc: "必填；''、null、undefined、[]、false 都算空", type: 'boolean' },
          { name: 'min / max', desc: '字串長度、陣列項數或數值大小', type: 'number' },
          { name: 'type', desc: '格式', type: `'email' | 'url' | 'number' | 'integer'` },
          { name: 'pattern', desc: '正規表示式', type: 'RegExp' },
          { name: 'validator', desc: '自訂檢查；回傳 true 通過、字串為錯誤訊息，可為 async', type: '(value, model) => boolean | string | Promise<…>' },
          { name: 'message', desc: '覆寫這條規則的預設訊息', type: 'string' },
        ],
      },
    ],
  },
  {
    id: 'checkbox',
    title: 'Checkbox',
    zh: '勾選框',
    group: 'form',
    desc: '切角插槽，勾選時嵌入金色面板；也可以改蓋一個小腳印。',
    usage: `import { MlCheckbox } from '@malilion/ui'`,
    examples: [
      { file: 'checkbox/basic', title: '基本用法' },
      { file: 'checkbox/paw', title: '腳印勾選', desc: '加上 paw，勾選時會「啵」一聲彈出肉球。' },
      { file: 'checkbox/indeterminate', title: '部分選取', desc: '全選框常用的半選狀態。', block: true },
    ],
    api: [
      {
        component: 'MlCheckbox',
        props: [
          { name: 'v-model', desc: '是否勾選', type: 'boolean', default: 'false' },
          { name: 'label', desc: '標籤', type: 'string' },
          { name: 'hint', desc: '說明', type: 'string' },
          { name: 'paw', desc: '用腳印取代勾勾', type: 'boolean', default: 'false' },
          { name: 'indeterminate', desc: '半選狀態', type: 'boolean', default: 'false' },
          { name: 'disabled', desc: '停用', type: 'boolean', default: 'false' },
        ],
      },
    ],
  },
  {
    id: 'radio',
    title: 'Radio',
    zh: '單選',
    group: 'form',
    desc: '圓形插槽，選中時壓進一個金色腳印。也可以做成可選的卡片方塊。',
    usage: `import { MlRadioGroup, MlRadio } from '@malilion/ui'`,
    examples: [
      { file: 'radio/basic', title: '基本用法', desc: '用 options 快速產生；方向鍵可在選項間移動。', block: true },
      { file: 'radio/card', title: '卡片方塊', desc: 'variant="card" 適合方案、方案比較等選擇。', block: true },
      { file: 'radio/slot', title: '自訂選項', desc: '用 <MlRadio> 子元件取代 options，可放任意內容。', block: true },
    ],
    api: [
      {
        component: 'MlRadioGroup',
        props: [
          { name: 'v-model', desc: '選中的值', type: 'string | number' },
          { name: 'options', desc: '選項（或用預設插槽放 MlRadio）', type: 'MlRadioOption[]' },
          { name: 'label', desc: '群組標題（legend）', type: 'string' },
          { name: 'variant', desc: '外觀', type: `'default' | 'card'`, default: `'default'` },
          { name: 'direction', desc: '排列方向', type: `'row' | 'column'`, default: `'row'` },
          { name: 'disabled', desc: '整組停用', type: 'boolean', default: 'false' },
          { name: 'name', desc: '原生 name（預設自動產生）', type: 'string' },
        ],
        slots: [{ name: 'default', desc: '放 <MlRadio> 子元件' }],
      },
      {
        component: 'MlRadio',
        props: [
          { name: 'value', desc: '此選項的值（必填）', type: 'string | number' },
          { name: 'label', desc: '標籤', type: 'string' },
          { name: 'hint', desc: '說明', type: 'string' },
          { name: 'disabled', desc: '停用', type: 'boolean', default: 'false' },
          { name: 'v-model / name', desc: '只在不放進 MlRadioGroup 時使用', type: '—' },
        ],
      },
    ],
  },
  {
    id: 'switch',
    title: 'Switch',
    zh: '開關',
    group: 'form',
    desc: '電源開關：鋼製滑塊在一排能量格上滑動。',
    usage: `import { MlSwitch } from '@malilion/ui'`,
    examples: [
      { file: 'switch/basic', title: '基本用法' },
      { file: 'switch/tech', title: '科技色與狀態顯示' },
    ],
    api: [
      {
        component: 'MlSwitch',
        props: [
          { name: 'v-model', desc: '開或關', type: 'boolean', default: 'false' },
          { name: 'label', desc: '標籤', type: 'string' },
          { name: 'tone', desc: '開啟時的顏色', type: `'gold' | 'tech'`, default: `'gold'` },
          { name: 'show-state', desc: '顯示 ON / OFF', type: 'boolean', default: 'false' },
          { name: 'disabled', desc: '停用', type: 'boolean', default: 'false' },
        ],
      },
    ],
  },

  /* ── 回饋 ─────────────────────────────────────────────── */
  {
    id: 'alert',
    title: 'Alert',
    zh: '警示',
    group: 'feedback',
    desc: '狀態面板，左側電源軌，角落有三道獅爪痕。',
    usage: `import { MlAlert } from '@malilion/ui'`,
    examples: [
      { file: 'alert/tones', title: '四種狀態', block: true },
      { file: 'alert/closable', title: '可關閉', block: true },
    ],
    api: [
      {
        component: 'MlAlert',
        props: [
          { name: 'tone', desc: '狀態', type: `'info' | 'success' | 'warning' | 'danger'`, default: `'info'` },
          { name: 'title', desc: '標題', type: 'string' },
          { name: 'closable', desc: '顯示關閉鈕', type: 'boolean', default: 'false' },
        ],
        events: [{ name: 'close', desc: '按下關閉後觸發' }],
        slots: [
          { name: 'default', desc: '內容' },
          { name: 'icon', desc: '自訂圖示' },
        ],
      },
    ],
  },
  {
    id: 'toast',
    title: 'Toast',
    zh: '通知',
    group: 'feedback',
    desc: '從角落滑入的通知，蓋著淡淡的腳印浮水印。滑鼠移上去會暫停倒數。',
    usage: `import { useToast, MlToastHost } from '@malilion/ui'`,
    setup: {
      title: '先在 App.vue 放一個 <MlToastHost>',
      filename: 'App.vue',
      code: `<template>
  <RouterView />
  <MlToastHost placement="bottom-right" />
</template>`,
    },
    examples: [
      { file: 'toast/basic', title: '基本用法', desc: '在任何地方呼叫 toast()，預設是腳印通知。' },
      { file: 'toast/advanced', title: '標題、動作與常駐', desc: 'duration: 0 會一直留著直到關閉。' },
    ],
    api: [
      {
        component: 'toast() / useToast()',
        events: [
          { name: 'toast(input)', desc: '顯示通知，回傳 id', type: '(input: string | MlToastOptions) => number' },
          { name: 'toast.paw / info / success / warning / danger', desc: '指定色調的捷徑', type: '(input: string | MlToastOptions) => number' },
          { name: 'toast.dismiss(id)', desc: '關閉指定通知', type: '(id: number) => void' },
          { name: 'toast.clear()', desc: '清除全部', type: '() => void' },
        ],
      },
      {
        component: 'MlToastOptions',
        props: [
          { name: 'title', desc: '標題', type: 'string' },
          { name: 'message', desc: '內容', type: 'string' },
          { name: 'tone', desc: '色調', type: `'paw' | 'info' | 'success' | 'warning' | 'danger'`, default: `'paw'` },
          { name: 'duration', desc: '幾毫秒後自動關閉；0 為常駐', type: 'number', default: '4000' },
          { name: 'closable', desc: '顯示關閉鈕', type: 'boolean', default: 'true' },
          { name: 'action', desc: '動作按鈕，按下後關閉', type: '{ label: string; onClick: () => void }' },
        ],
      },
      {
        component: 'MlToastHost',
        props: [
          { name: 'placement', desc: '位置', type: `'top-right' | 'top-left' | 'top-center' | 'bottom-right' | 'bottom-left' | 'bottom-center'`, default: `'bottom-right'` },
          { name: 'max', desc: '同時顯示的上限', type: 'number', default: '5' },
        ],
      },
    ],
  },
  {
    id: 'progress',
    title: 'Progress',
    zh: '進度條',
    group: 'feedback',
    desc: '由能量格組成的儀表；加上 paw 會有一隻小腳印跟著跑。',
    usage: `import { MlProgress } from '@malilion/ui'`,
    examples: [
      { file: 'progress/basic', title: '色調', block: true },
      { file: 'progress/styles', title: '條紋、平滑與不確定進度', desc: '不給 value 就是不確定進度（掃描動畫）。', block: true },
      { file: 'progress/paw', title: '腳印跑者', block: true },
    ],
    api: [
      {
        component: 'MlProgress',
        props: [
          { name: 'value', desc: '目前值；null 為不確定進度', type: 'number | null', default: 'null' },
          { name: 'max', desc: '最大值', type: 'number', default: '100' },
          { name: 'label', desc: '標籤', type: 'string' },
          { name: 'tone', desc: '色調', type: `'gold' | 'tech' | 'success' | 'danger'`, default: `'gold'` },
          { name: 'size', desc: '粗細', type: sizeType, default: `'md'` },
          { name: 'striped', desc: '流動條紋', type: 'boolean', default: 'false' },
          { name: 'smooth', desc: '連續條，不分格', type: 'boolean', default: 'false' },
          { name: 'show-value', desc: '顯示百分比', type: 'boolean', default: 'true' },
          { name: 'paw', desc: '跟著進度跑的腳印', type: 'boolean', default: 'false' },
        ],
      },
    ],
  },
  {
    id: 'loader',
    title: 'Loader',
    zh: '載入器',
    group: 'feedback',
    desc: 'Mane Reactor 獅鬃反應爐，或是一隻小獅子一步步走過去的腳印。',
    usage: `import { MlLoader } from '@malilion/ui'`,
    examples: [
      { file: 'loader/reactor', title: '獅鬃反應爐' },
      { file: 'loader/paws', title: '走路的腳印' },
    ],
    api: [
      {
        component: 'MlLoader',
        props: [
          { name: 'variant', desc: '樣式', type: `'reactor' | 'paws'`, default: `'reactor'` },
          { name: 'size', desc: '尺寸（px）', type: 'number', default: '48' },
          { name: 'tone', desc: '色調', type: `'gold' | 'tech' | 'bean'`, default: `'gold'` },
          { name: 'label', desc: '下方可見文字', type: 'string' },
          { name: 'sr-label', desc: '沒有 label 時給螢幕閱讀器的文字', type: 'string', default: `'載入中'` },
        ],
      },
    ],
  },
  {
    id: 'modal',
    title: 'Modal',
    zh: '對話框',
    group: 'feedback',
    desc: '指揮台式對話框，由中線向上下展開。Esc / 點背景關閉，焦點鎖在框內，關閉後焦點回到觸發按鈕。',
    usage: `import { MlModal } from '@malilion/ui'`,
    examples: [
      { file: 'modal/basic', title: '基本用法' },
      { file: 'modal/confirm', title: '危險確認' },
    ],
    api: [
      {
        component: 'MlModal',
        props: [
          { name: 'v-model:open', desc: '是否開啟', type: 'boolean', default: 'false' },
          { name: 'title', desc: '標題', type: 'string' },
          { name: 'eyebrow', desc: '標題上方小標', type: 'string' },
          { name: 'width', desc: '最大寬度', type: 'number | string', default: '520' },
          { name: 'close-on-backdrop', desc: '點背景關閉', type: 'boolean', default: 'true' },
          { name: 'close-on-esc', desc: 'Esc 關閉', type: 'boolean', default: 'true' },
          { name: 'hide-close', desc: '隱藏右上角關閉鈕', type: 'boolean', default: 'false' },
          { name: 'inline', desc: '不傳送到 <body>', type: 'boolean', default: 'false' },
        ],
        events: [{ name: 'close', desc: '使用者關閉時觸發' }],
        slots: [
          { name: 'default', desc: '內容' },
          { name: 'title', desc: '自訂標題' },
          { name: 'footer', desc: '頁尾，提供 { close }' },
        ],
      },
    ],
  },
  {
    id: 'tooltip',
    title: 'Tooltip',
    zh: '提示',
    group: 'feedback',
    desc: '小小的 HUD 讀數，面向觸發元素的一側有金色邊。鍵盤聚焦也會出現。',
    usage: `import { MlTooltip } from '@malilion/ui'`,
    examples: [{ file: 'tooltip/placement', title: '四個方向' }],
    api: [
      {
        component: 'MlTooltip',
        props: [
          { name: 'content', desc: '提示文字', type: 'string' },
          { name: 'placement', desc: '位置', type: `'top' | 'bottom' | 'left' | 'right'`, default: `'top'` },
          { name: 'delay', desc: '滑鼠延遲（ms）', type: 'number', default: '120' },
        ],
        slots: [
          { name: 'default', desc: '觸發元素（自動加上 aria-describedby）' },
          { name: 'content', desc: '自訂提示內容' },
        ],
      },
    ],
  },

  /* ── 資料展示 ─────────────────────────────────────────── */
  {
    id: 'popover',
    title: 'Popover',
    zh: '彈出框',
    group: 'feedback',
    isNew: true,
    desc: '可以放任何內容的浮動面板，金色邊朝向觸發元素。點擊或滑過開啟，Esc 與點擊外部關閉，關閉後焦點回到觸發元素。',
    usage: `import { MlPopover } from '@malilion/ui'`,
    examples: [
      { file: 'popover/basic', title: '點擊與滑過' },
      { file: 'popover/placement', title: '四個方向' },
    ],
    api: [
      {
        component: 'MlPopover',
        props: [
          { name: 'v-model:open', desc: '是否開啟', type: 'boolean', default: 'false' },
          { name: 'trigger', desc: '開啟方式', type: `'click' | 'hover'`, default: `'click'` },
          { name: 'placement', desc: '方向', type: `'top' | 'bottom' | 'left' | 'right'`, default: `'bottom'` },
          { name: 'title', desc: '標題（同時作為對話框的無障礙名稱）', type: 'string' },
          { name: 'width', desc: '面板寬度', type: 'number | string' },
          { name: 'delay', desc: 'hover 延遲（ms）', type: 'number', default: '120' },
          { name: 'disabled', desc: '停用', type: 'boolean', default: 'false' },
        ],
        slots: [
          { name: 'default', desc: '觸發元素，提供 { open, toggle }' },
          { name: 'content', desc: '面板內容，提供 { close }' },
          { name: 'title', desc: '自訂標題' },
        ],
      },
    ],
  },
  {
    id: 'popconfirm',
    title: 'Popconfirm',
    zh: '氣泡確認',
    group: 'feedback',
    isNew: true,
    desc: '就地確認的小氣泡，比對話框輕巧。開啟時焦點落在「取消」，避免誤按 Enter 就執行危險動作。',
    usage: `import { MlPopconfirm } from '@malilion/ui'`,
    examples: [{ file: 'popconfirm/basic', title: '基本用法', desc: 'tone="danger" 會換成紅色的確認按鈕與邊條。' }],
    api: [
      {
        component: 'MlPopconfirm',
        props: [
          { name: 'title', desc: '問題', type: 'string' },
          { name: 'description', desc: '補充說明', type: 'string' },
          { name: 'tone', desc: '語氣', type: `'warning' | 'danger' | 'info'`, default: `'warning'` },
          { name: 'confirm-text / cancel-text', desc: '按鈕文字', type: 'string', default: `'確定' / '取消'` },
          { name: 'placement', desc: '方向', type: `'top' | 'bottom' | 'left' | 'right'`, default: `'top'` },
          { name: 'v-model:open / disabled', desc: '同 MlPopover', type: 'boolean' },
        ],
        events: [
          { name: 'confirm', desc: '按下確認' },
          { name: 'cancel', desc: '按下取消' },
        ],
        slots: [
          { name: 'default', desc: '觸發元素' },
          { name: 'description', desc: '自訂說明內容' },
        ],
      },
    ],
  },
  {
    id: 'drawer',
    title: 'Drawer',
    zh: '抽屜',
    group: 'feedback',
    isNew: true,
    desc: '從畫面邊緣滑出的控制台面板，內側有金色能量條。行為和 MlModal 一樣：鎖定捲動、焦點鎖在面板內、Esc / 點背景關閉、關閉後焦點回到原處。',
    usage: `import { MlDrawer } from '@malilion/ui'`,
    examples: [
      { file: 'drawer/basic', title: '基本用法' },
      { file: 'drawer/placement', title: '四個方向' },
    ],
    api: [
      {
        component: 'MlDrawer',
        props: [
          { name: 'v-model:open', desc: '是否開啟', type: 'boolean', default: 'false' },
          { name: 'placement', desc: '從哪一邊滑出', type: `'right' | 'left' | 'top' | 'bottom'`, default: `'right'` },
          { name: 'size', desc: '寬度（左右）或高度（上下）', type: 'number | string', default: '420 / 360' },
          { name: 'title / eyebrow', desc: '標題與小標', type: 'string' },
          { name: 'close-on-backdrop / close-on-esc', desc: '點背景 / Esc 關閉', type: 'boolean', default: 'true' },
          { name: 'hide-close', desc: '隱藏關閉鈕', type: 'boolean', default: 'false' },
          { name: 'inline', desc: '不傳送到 <body>', type: 'boolean', default: 'false' },
        ],
        events: [{ name: 'close', desc: '使用者關閉時觸發' }],
        slots: [
          { name: 'default', desc: '內容，提供 { close }' },
          { name: 'title', desc: '自訂標題' },
          { name: 'footer', desc: '頁尾，提供 { close }' },
        ],
      },
    ],
  },
  {
    id: 'skeleton',
    title: 'Skeleton',
    zh: '骨架屏',
    group: 'feedback',
    isNew: true,
    desc: '資料還在路上時的佔位金屬板，帶一道掃描光。螢幕閱讀器會讀到「載入中」；減少動態效果時掃描光會關閉。',
    usage: `import { MlSkeleton, MlSkeletonItem } from '@malilion/ui'`,
    examples: [
      { file: 'skeleton/basic', title: '基本用法', desc: 'loading 變成 false 就換成真正的內容。', block: true },
      { file: 'skeleton/custom', title: '自訂版型', desc: '用 #template 插槽和 MlSkeletonItem 拼出和真實內容一樣的形狀。', block: true },
    ],
    api: [
      {
        component: 'MlSkeleton',
        props: [
          { name: 'loading', desc: '是否顯示骨架', type: 'boolean', default: 'true' },
          { name: 'rows', desc: '段落行數', type: 'number', default: '3' },
          { name: 'title', desc: '顯示標題列', type: 'boolean', default: 'true' },
          { name: 'avatar', desc: '顯示圓形頭像', type: 'boolean', default: 'false' },
          { name: 'animated', desc: '掃描光', type: 'boolean', default: 'true' },
          { name: 'label', desc: '給螢幕閱讀器的文字', type: 'string', default: `'載入中…'` },
        ],
        slots: [
          { name: 'default', desc: '載入完成後的內容' },
          { name: 'template', desc: '自訂骨架版型' },
        ],
      },
      {
        component: 'MlSkeletonItem',
        props: [
          { name: 'variant', desc: '形狀', type: `'text' | 'title' | 'circle' | 'rect' | 'button' | 'image'`, default: `'text'` },
          { name: 'width / height', desc: '數字為 px，或任何 CSS 長度', type: 'number | string' },
        ],
      },
    ],
  },
  {
    id: 'table',
    title: 'Table',
    zh: '表格',
    group: 'data',
    desc: 'HUD 資料表。可排序、可勾選，滑過的那一列會有小腳印走進來；沒資料時有一串腳印走過。',
    usage: `import { MlTable } from '@malilion/ui'`,
    examples: [
      { file: 'table/basic', title: '基本用法', block: true },
      { file: 'table/sort-select', title: '排序與勾選', desc: '點表頭切換 升冪 → 降冪 → 不排序；勾選的 key 存在 v-model:selected。', block: true },
      { file: 'table/custom-cells', title: '自訂儲存格', desc: '用 #cell-欄位 插槽放徽章、頭像、按鈕。', block: true },
      { file: 'table/states', title: '空狀態與載入', block: true },
    ],
    api: [
      {
        component: 'MlTable',
        props: [
          { name: 'columns', desc: '欄位設定', type: 'MlTableColumn[]' },
          { name: 'rows', desc: '資料', type: 'Row[]' },
          { name: 'row-key', desc: '每列唯一鍵的欄位名或函式', type: 'string | (row) => Key', default: `'id'` },
          { name: 'v-model:sort', desc: '排序狀態', type: `{ key, order: 'asc' | 'desc' } | null`, default: 'null' },
          { name: 'v-model:selected', desc: '已勾選的 key', type: '(string | number)[]', default: '[]' },
          { name: 'selectable', desc: '加上勾選欄', type: 'boolean', default: 'false' },
          { name: 'manual-sort', desc: '不在前端排序（交給後端）', type: 'boolean', default: 'false' },
          { name: 'caption', desc: '表格標題', type: 'string' },
          { name: 'striped / dense', desc: '斑馬紋 / 緊湊', type: 'boolean', default: 'false' },
          { name: 'loading', desc: '顯示腳印載入遮罩', type: 'boolean', default: 'false' },
          { name: 'hover-paw', desc: '滑過列時的小腳印', type: 'boolean', default: 'true' },
          { name: 'empty-text', desc: '沒資料時的文字', type: 'string', default: `'這裡還沒有獵物'` },
        ],
        events: [{ name: 'row-click', desc: '點擊某列', type: '(row: Row) => void' }],
        slots: [
          { name: 'cell-<key>', desc: '自訂儲存格，提供 { row, value, index }' },
          { name: 'header-<key>', desc: '自訂表頭，提供 { column }' },
          { name: 'empty', desc: '自訂空狀態' },
        ],
      },
      {
        component: 'MlTableColumn',
        props: [
          { name: 'key', desc: '對應資料欄位', type: 'string' },
          { name: 'title', desc: '表頭文字', type: 'string' },
          { name: 'width', desc: '寬度', type: 'string' },
          { name: 'align', desc: '對齊', type: `'left' | 'center' | 'right'`, default: `'left'` },
          { name: 'sortable', desc: '可排序', type: 'boolean', default: 'false' },
          { name: 'mono', desc: '等寬數字字體', type: 'boolean', default: 'false' },
          { name: 'format', desc: '格式化顯示值', type: '(value, row) => string' },
        ],
      },
    ],
  },
  {
    id: 'avatar',
    title: 'Avatar',
    zh: '頭像',
    group: 'data',
    desc: '六角徽章頭像，金屬外框，圖片載入失敗時自動退回縮寫。',
    usage: `import { MlAvatar } from '@malilion/ui'`,
    examples: [
      { file: 'avatar/basic', title: '尺寸、外框與狀態' },
      { file: 'avatar/group', title: '疊放群組' },
    ],
    api: [
      {
        component: 'MlAvatar',
        props: [
          { name: 'src', desc: '圖片網址', type: 'string' },
          { name: 'name', desc: '名字（替代文字與縮寫）', type: 'string' },
          { name: 'size', desc: '尺寸', type: `'sm' | 'md' | 'lg' | 'xl'`, default: `'md'` },
          { name: 'ring', desc: '外框金屬', type: `'gold' | 'steel' | 'tech'`, default: `'gold'` },
          { name: 'status', desc: '狀態燈', type: `'online' | 'busy' | 'away' | 'offline'` },
        ],
      },
    ],
  },
  {
    id: 'stat',
    title: 'Stat',
    zh: '數據',
    group: 'data',
    desc: 'HUD 數據讀數，四角有瞄準框；delta 的正負會自動上色。',
    usage: `import { MlStat } from '@malilion/ui'`,
    examples: [{ file: 'stat/basic', title: '基本用法', block: true }],
    api: [
      {
        component: 'MlStat',
        props: [
          { name: 'label', desc: '標籤', type: 'string' },
          { name: 'value', desc: '數值', type: 'string | number' },
          { name: 'unit', desc: '單位', type: 'string' },
          { name: 'delta', desc: '變化量（正綠負紅）', type: 'number' },
          { name: 'delta-suffix', desc: '變化量單位', type: 'string', default: `'%'` },
          { name: 'caption', desc: '補充說明', type: 'string' },
        ],
        slots: [{ name: 'icon', desc: '標籤前的圖示' }],
      },
    ],
  },

  /* ── 導覽 ─────────────────────────────────────────────── */
  {
    id: 'tabs',
    title: 'Tabs',
    zh: '分頁',
    group: 'nav',
    desc: '金色墨線或滑動金屬板。支援方向鍵、Home / End。',
    usage: `import { MlTabs } from '@malilion/ui'`,
    examples: [
      { file: 'tabs/line', title: '墨線分頁', desc: '每個分頁的內容用和 value 同名的插槽。', block: true },
      { file: 'tabs/plate', title: '金屬板切換' },
    ],
    api: [
      {
        component: 'MlTabs',
        props: [
          { name: 'v-model', desc: '目前分頁的 value', type: 'string' },
          { name: 'items', desc: '分頁', type: '{ value, label, disabled? }[]' },
          { name: 'variant', desc: '樣式', type: `'line' | 'plate'`, default: `'line'` },
          { name: 'label', desc: '分頁列的無障礙名稱', type: 'string' },
        ],
        slots: [
          { name: '<value>', desc: '該分頁的內容' },
          { name: 'tab', desc: '自訂分頁標籤，提供 { item, active }' },
        ],
      },
    ],
  },
  {
    id: 'dropdown',
    title: 'Dropdown',
    zh: '下拉選單',
    group: 'nav',
    desc: '從金屬槽掉出來的指令選單。方向鍵、Home / End、首字跳轉、Esc 都支援；單選模式會用腳印標記目前選項。',
    usage: `import { MlDropdown } from '@malilion/ui'`,
    examples: [
      { file: 'dropdown/basic', title: '動作選單', desc: '圖示、快捷鍵提示、分隔線與危險項目。' },
      { file: 'dropdown/selectable', title: '單選模式', desc: 'selectable + v-model，按鈕會顯示目前選項。' },
      { file: 'dropdown/custom-trigger', title: '自訂觸發元素', desc: '#trigger 插槽的 attrs 綁到你的元素上，就有完整的鍵盤與 ARIA 行為。' },
    ],
    api: [
      {
        component: 'MlDropdown',
        props: [
          { name: 'items', desc: '選單項目', type: 'MlDropdownItem[]' },
          { name: 'label', desc: '內建觸發按鈕的文字', type: 'string' },
          { name: 'selectable', desc: '單選模式', type: 'boolean', default: 'false' },
          { name: 'v-model', desc: '單選模式下選中的值', type: 'string | number' },
          { name: 'placement', desc: '選單對齊', type: `'bottom-start' | 'bottom-end'`, default: `'bottom-start'` },
          { name: 'variant / size', desc: '內建觸發按鈕的外觀與尺寸', type: 'MlButtonVariant / MlSize', default: `'outline' / 'md'` },
          { name: 'disabled', desc: '停用', type: 'boolean', default: 'false' },
        ],
        events: [{ name: 'select', desc: '選了某個項目', type: '(item: MlDropdownItem) => void' }],
        slots: [{ name: 'trigger', desc: '自訂觸發元素，提供 { attrs, open, toggle }；把 attrs 用 v-bind 綁上去（含 aria 與事件）' }],
      },
      {
        component: 'MlDropdownItem',
        props: [
          { name: 'value', desc: '值', type: 'string | number' },
          { name: 'label', desc: '文字', type: 'string' },
          { name: 'icon', desc: '內建圖示名稱', type: 'IconName' },
          { name: 'hint', desc: '右側提示（如快捷鍵）', type: 'string' },
          { name: 'danger', desc: '危險項目', type: 'boolean' },
          { name: 'divider', desc: '在此項上方畫分隔線', type: 'boolean' },
          { name: 'disabled', desc: '停用', type: 'boolean' },
        ],
      },
    ],
  },

  /* ── v0.3 additions ───────────────────────────────────── */
  {
    id: 'mascot',
    title: 'Mascot',
    zh: '吉祥物',
    group: 'basic',
    desc: '碼力獅本獅：穿黑色帽 T 的小獅子。可以當頭像、品牌標誌或空狀態插圖，圖片已經打包在套件裡。',
    usage: `import { MlMascot, lionAvatarUrl, lionFullUrl } from '@malilion/ui'`,
    examples: [
      { file: 'mascot/basic', title: '姿勢與外框', desc: 'avatar 是頭像、full 是全身；頭像可以加 ring 或 hex 金屬外框。MlAvatar 加上 lion 也會用這張圖。' },
      { file: 'mascot/urls', title: '直接使用圖片', desc: '匯出的網址與 @malilion/ui/assets/*.webp 檔案都能直接用。' },
    ],
    api: [
      {
        component: 'MlMascot',
        props: [
          { name: 'size', desc: '高度（px）', type: 'number', default: '96' },
          { name: 'pose', desc: '頭像或全身', type: `'avatar' | 'full'`, default: `'avatar'` },
          { name: 'frame', desc: '頭像的金屬外框', type: `'none' | 'ring' | 'hex'`, default: `'none'` },
          { name: 'glow', desc: '金色光暈', type: 'boolean', default: 'false' },
          { name: 'title', desc: '替代文字；裝飾用時傳空字串', type: 'string', default: `'碼力獅'` },
        ],
      },
    ],
  },
  {
    id: 'tag',
    title: 'Tag',
    zh: '標籤',
    group: 'basic',
    desc: '圓角膠囊標籤。可以關閉，也可以當作能切換的篩選 chip。',
    usage: `import { MlTag } from '@malilion/ui'`,
    examples: [
      { file: 'tag/basic', title: '色調、樣式與關閉' },
      { file: 'tag/chips', title: '可選取的 Chip', desc: 'selectable 會變成按鈕，用 v-model:selected 記錄狀態。' },
    ],
    api: [
      {
        component: 'MlTag',
        props: [
          { name: 'tone', desc: '色調', type: `'gold' | 'steel' | 'tech' | 'bean' | 'success' | 'danger'`, default: `'gold'` },
          { name: 'variant', desc: '樣式', type: `'soft' | 'outline' | 'solid'`, default: `'soft'` },
          { name: 'closable', desc: '顯示移除按鈕', type: 'boolean', default: 'false' },
          { name: 'selectable', desc: '可切換的 chip', type: 'boolean', default: 'false' },
          { name: 'v-model:selected', desc: '是否選取', type: 'boolean', default: 'false' },
        ],
        events: [{ name: 'close', desc: '按下移除' }],
        slots: [
          { name: 'default', desc: '文字' },
          { name: 'icon', desc: '前方圖示' },
        ],
      },
    ],
  },
  {
    id: 'kbd',
    title: 'Kbd',
    zh: '按鍵',
    group: 'basic',
    desc: '顯示鍵盤快捷鍵的小鍵帽。',
    usage: `import { MlKbd } from '@malilion/ui'`,
    examples: [{ file: 'kbd/basic', title: '基本用法' }],
    api: [{ component: 'MlKbd', slots: [{ name: 'default', desc: '按鍵文字' }] }],
  },
  {
    id: 'slider',
    title: 'Slider',
    zh: '滑桿',
    group: 'form',
    desc: '原生 range 換上金屬滑軌與發光滑塊，鍵盤方向鍵一樣能用。',
    usage: `import { MlSlider } from '@malilion/ui'`,
    examples: [{ file: 'slider/basic', title: '基本用法', block: true }],
    api: [
      {
        component: 'MlSlider',
        props: [
          { name: 'v-model', desc: '值', type: 'number', default: '0' },
          { name: 'min / max / step', desc: '範圍與間隔', type: 'number', default: '0 / 100 / 1' },
          { name: 'label', desc: '標籤', type: 'string' },
          { name: 'unit', desc: '數值後的單位', type: 'string' },
          { name: 'show-value', desc: '顯示目前數值', type: 'boolean', default: 'true' },
          { name: 'tone', desc: '色調', type: `'gold' | 'tech'`, default: `'gold'` },
          { name: 'disabled', desc: '停用', type: 'boolean', default: 'false' },
        ],
      },
    ],
  },
  {
    id: 'number-input',
    title: 'NumberInput',
    zh: '數字輸入',
    group: 'form',
    desc: '帶有 − / + 的數字欄位，會自動限制在 min / max 之間，小數間隔也不會出現浮點誤差。',
    usage: `import { MlNumberInput } from '@malilion/ui'`,
    examples: [{ file: 'number-input/basic', title: '基本用法', block: true }],
    api: [
      {
        component: 'MlNumberInput',
        props: [
          { name: 'v-model', desc: '值', type: 'number', default: '0' },
          { name: 'min / max', desc: '範圍', type: 'number', default: '-∞ / ∞' },
          { name: 'step', desc: '每次增減', type: 'number', default: '1' },
          { name: 'label / hint / error / index', desc: '同 MlInput', type: 'string' },
          { name: 'disabled', desc: '停用', type: 'boolean', default: 'false' },
        ],
      },
    ],
  },
  {
    id: 'upload',
    title: 'Upload',
    zh: '上傳',
    group: 'form',
    desc: '拖曳或點擊選擇檔案。會依 accept 與 max-size 過濾，被擋下的檔案透過 reject 事件告訴你原因。注意：這只是使用體驗上的過濾，檔案類型與大小仍必須在伺服器端再驗證一次。',
    usage: `import { MlUpload } from '@malilion/ui'`,
    examples: [{ file: 'upload/basic', title: '基本用法', block: true }],
    api: [
      {
        component: 'MlUpload',
        props: [
          { name: 'v-model', desc: '已選擇的檔案', type: 'File[]', default: '[]' },
          { name: 'accept', desc: '同 <input accept>', type: 'string' },
          { name: 'multiple', desc: '允許多個檔案', type: 'boolean', default: 'true' },
          { name: 'max-size', desc: '單檔大小上限（bytes）', type: 'number' },
          { name: 'title / hint', desc: '區塊文字', type: 'string' },
          { name: 'disabled', desc: '停用', type: 'boolean', default: 'false' },
        ],
        events: [{ name: 'reject', desc: '檔案被擋下', type: `(file: File, reason: 'type' | 'size') => void` }],
      },
    ],
  },
  {
    id: 'empty',
    title: 'Empty',
    zh: '空狀態',
    group: 'feedback',
    desc: '沒有資料時，讓小獅子先睡一下。也可以只放一串腳印。',
    usage: `import { MlEmpty } from '@malilion/ui'`,
    examples: [{ file: 'empty/basic', title: '基本用法' }],
    api: [
      {
        component: 'MlEmpty',
        props: [
          { name: 'title', desc: '標題', type: 'string', default: `'這裡還沒有東西'` },
          { name: 'description', desc: '說明', type: 'string' },
          { name: 'art', desc: '插圖', type: `'lion' | 'paws' | 'none'`, default: `'lion'` },
          { name: 'size', desc: '尺寸', type: `'sm' | 'md'`, default: `'md'` },
        ],
        slots: [
          { name: 'default', desc: '動作按鈕' },
          { name: 'art', desc: '自訂插圖' },
          { name: 'description', desc: '自訂說明' },
        ],
      },
    ],
  },
  {
    id: 'accordion',
    title: 'Accordion',
    zh: '摺疊面板',
    group: 'data',
    desc: '一疊可以滑開的面板，展開時腳印會轉向。收起的內容不會被 Tab 鍵走到。',
    usage: `import { MlAccordion } from '@malilion/ui'`,
    examples: [
      { file: 'accordion/basic', title: '基本用法', desc: '內容用 content，或用和 value 同名的插槽。', block: true },
      { file: 'accordion/multiple', title: '多個同時展開', block: true },
    ],
    api: [
      {
        component: 'MlAccordion',
        props: [
          { name: 'items', desc: '面板', type: '{ value, title, content?, disabled? }[]' },
          { name: 'v-model', desc: '展開中的 value', type: 'string[]', default: '[]' },
          { name: 'multiple', desc: '可同時展開多個', type: 'boolean', default: 'false' },
        ],
        slots: [{ name: '<value>', desc: '該面板的內容，提供 { item }' }],
      },
    ],
  },
  {
    id: 'ring',
    title: 'Ring',
    zh: '環形進度',
    group: 'chart',
    desc: '發光的環形進度，中間顯示百分比與標籤。',
    usage: `import { MlRing } from '@malilion/ui'`,
    examples: [{ file: 'ring/basic', title: '色調與尺寸' }],
    api: [
      {
        component: 'MlRing',
        props: [
          { name: 'value', desc: '目前值', type: 'number' },
          { name: 'max', desc: '最大值', type: 'number', default: '100' },
          { name: 'size', desc: '尺寸（px）', type: 'number', default: '120' },
          { name: 'thickness', desc: '線寬（以 100 為基準）', type: 'number', default: '9' },
          { name: 'label', desc: '中間的小字與無障礙名稱', type: 'string' },
          { name: 'tone', desc: '色調', type: `'gold' | 'tech' | 'bean' | 'success' | 'danger' | 'steel'`, default: `'gold'` },
          { name: 'show-value', desc: '顯示百分比', type: 'boolean', default: 'true' },
        ],
        slots: [{ name: 'default', desc: '自訂中間內容' }],
      },
    ],
  },
  {
    id: 'sparkline',
    title: 'Sparkline',
    zh: '迷你折線',
    group: 'chart',
    desc: '放在數據卡片裡的小折線，末端有一顆發光的點。',
    usage: `import { MlSparkline } from '@malilion/ui'`,
    examples: [{ file: 'sparkline/basic', title: '數據卡片', block: true }],
    api: [
      {
        component: 'MlSparkline',
        props: [
          { name: 'data', desc: '數值', type: 'number[]' },
          { name: 'width / height', desc: '尺寸（px）', type: 'number', default: '120 / 36' },
          { name: 'tone', desc: '色調', type: 'MlChartTone', default: `'gold'` },
          { name: 'area', desc: '填滿線下區域', type: 'boolean', default: 'true' },
          { name: 'title', desc: '無障礙描述；不給則視為裝飾', type: 'string' },
        ],
      },
    ],
  },
  {
    id: 'bar-chart',
    title: 'BarChart',
    zh: '長條圖',
    group: 'chart',
    desc: 'HUD 長條圖。座標軸會自動取整數刻度，最高的一根會亮起並標出數值。',
    usage: `import { MlBarChart } from '@malilion/ui'`,
    examples: [
      { file: 'bar-chart/basic', title: '基本用法', block: true },
      { file: 'bar-chart/tones', title: '色調與指定高亮', block: true },
    ],
    api: [
      {
        component: 'MlBarChart',
        props: [
          { name: 'data', desc: '資料', type: '{ label, value }[]' },
          { name: 'height', desc: '繪圖區高度（px）', type: 'number', default: '200' },
          { name: 'tone', desc: '色調', type: 'MlChartTone', default: `'gold'` },
          { name: 'highlight', desc: '高亮哪一根', type: `'max' | number | null`, default: `'max'` },
          { name: 'ticks', desc: '水平格線數', type: 'number', default: '4' },
          { name: 'format', desc: '數值格式化', type: '(value: number) => string' },
          { name: 'label', desc: '無障礙摘要（預設自動產生）', type: 'string' },
        ],
      },
    ],
  },
  {
    id: 'donut',
    title: 'Donut',
    zh: '甜甜圈圖',
    group: 'chart',
    desc: '多段的環形比例圖，附圖例與百分比。',
    usage: `import { MlDonut } from '@malilion/ui'`,
    examples: [{ file: 'donut/basic', title: '流量來源' }],
    api: [
      {
        component: 'MlDonut',
        props: [
          { name: 'data', desc: '資料', type: '{ label, value, color? }[]' },
          { name: 'size', desc: '尺寸（px）', type: 'number', default: '160' },
          { name: 'thickness', desc: '線寬（以 100 為基準）', type: 'number', default: '12' },
          { name: 'title / caption', desc: '中間的大字與小字', type: 'string' },
          { name: 'legend', desc: '顯示圖例', type: 'boolean', default: 'true' },
          { name: 'label', desc: '無障礙摘要（預設自動產生）', type: 'string' },
        ],
      },
    ],
  },
  {
    id: 'breadcrumb',
    title: 'Breadcrumb',
    zh: '麵包屑',
    group: 'nav',
    desc: '顯示目前位置。最後一項自動標記為目前頁面。',
    usage: `import { MlBreadcrumb } from '@malilion/ui'`,
    examples: [{ file: 'breadcrumb/basic', title: '基本用法' }],
    api: [
      {
        component: 'MlBreadcrumb',
        props: [
          { name: 'items', desc: '路徑', type: '{ label, href?, icon? }[]' },
          { name: 'label', desc: '無障礙名稱', type: 'string', default: `'目前位置'` },
        ],
      },
    ],
  },
  {
    id: 'pagination',
    title: 'Pagination',
    zh: '分頁器',
    group: 'nav',
    desc: '固定寬度的分頁器：頁數多時自動用 … 收合，切換頁面時按鈕不會跳動。',
    usage: `import { MlPagination } from '@malilion/ui'`,
    examples: [{ file: 'pagination/basic', title: '基本用法', block: true }],
    api: [
      {
        component: 'MlPagination',
        props: [
          { name: 'v-model:page', desc: '目前頁碼（從 1 開始）', type: 'number', default: '1' },
          { name: 'total', desc: '總頁數', type: 'number' },
          { name: 'siblings', desc: '目前頁左右各顯示幾頁', type: 'number', default: '1' },
          { name: 'label', desc: '無障礙名稱', type: 'string', default: `'分頁'` },
        ],
      },
    ],
  },
  {
    id: 'steps',
    title: 'Steps',
    zh: '步驟條',
    group: 'nav',
    desc: '多步驟流程。完成的步驟蓋上腳印，進行中的步驟會發光。',
    usage: `import { MlSteps } from '@malilion/ui'`,
    examples: [{ file: 'steps/basic', title: '基本用法', block: true }],
    api: [
      {
        component: 'MlSteps',
        props: [
          { name: 'items', desc: '步驟', type: '{ title, desc? }[]' },
          { name: 'current', desc: '進行中步驟的索引；之前的算完成', type: 'number', default: '0' },
          { name: 'label', desc: '無障礙名稱', type: 'string', default: `'進度步驟'` },
        ],
      },
    ],
  },
  {
    id: 'templates',
    title: 'Templates',
    zh: '版型範例',
    group: 'template',
    desc: '把元件組起來的完整區塊：儀表板、個人檔案、價格方案、空狀態與頂部導覽列。直接複製改一改就能用。',
    examples: [
      { file: 'templates/dashboard', title: '儀表板', desc: '數據卡片 + 迷你折線、長條圖與甜甜圈圖。', block: true },
      { file: 'templates/cards', title: '個人檔案、價格方案與空狀態', block: true },
      { file: 'templates/header', title: '頂部導覽列', desc: '品牌、導覽、⌘K 搜尋、頭像與行動按鈕。', block: true },
    ],
  },

  /* ── v0.4 additions ───────────────────────────────────── */
  {
    id: 'calendar',
    title: 'Calendar',
    zh: '日曆',
    group: 'data',
    isNew: true,
    desc: '月曆，可選單日或區間。完整鍵盤操作（方向鍵、PageUp/PageDown 換月、Home/End），有事件的日子會蓋上小肉球。',
    usage: `import { MlCalendar } from '@malilion/ui'`,
    examples: [
      { file: 'calendar/basic', title: '單日與標記', desc: 'markers 會在日期下方畫一個肉球。' },
      { file: 'calendar/range', title: '區間選擇', desc: 'mode="range" 搭配 v-model:range；這裡從今天開始、週日不能選、週一為一週開始。' },
      { file: 'calendar/locale', title: '語系', desc: '月份與星期名稱來自 Intl，換 locale 就好。' },
    ],
    api: [
      {
        component: 'MlCalendar',
        props: [
          { name: 'v-model', desc: '選中的日期（單日模式）', type: 'Date | null', default: 'null' },
          { name: 'v-model:range', desc: '選中的區間（區間模式）', type: '[Date | null, Date | null]', default: '[null, null]' },
          { name: 'mode', desc: '單日或區間', type: `'single' | 'range'`, default: `'single'` },
          { name: 'min / max', desc: '可選範圍', type: 'Date' },
          { name: 'disabled-date', desc: '停用特定日期', type: '(date: Date) => boolean' },
          { name: 'markers', desc: '要蓋肉球的日期', type: 'Date[]' },
          { name: 'locale', desc: '語系', type: 'string', default: `'zh-TW'` },
          { name: 'week-starts-on', desc: '一週從星期幾開始', type: '0 | 1', default: '0' },
        ],
        events: [
          { name: 'month-change', desc: '切換月份', type: '(year: number, month: number) => void' },
          { name: 'focus()', desc: '把鍵盤焦點移進日曆（透過 ref 呼叫）', type: '() => void' },
        ],
      },
    ],
  },
  {
    id: 'date-picker',
    title: 'DatePicker',
    zh: '日期選擇',
    group: 'form',
    isNew: true,
    desc: '點一下彈出日曆的日期欄位。開啟時焦點直接進入日曆，選好或按 Esc 會回到欄位。',
    usage: `import { MlDatePicker } from '@malilion/ui'`,
    examples: [{ file: 'date-picker/basic', title: '基本用法', block: true }],
    api: [
      {
        component: 'MlDatePicker',
        props: [
          { name: 'v-model', desc: '日期', type: 'Date | null', default: 'null' },
          { name: 'label / hint / error / index', desc: '同 MlInput', type: 'string' },
          { name: 'placeholder', desc: '未選擇時的文字', type: 'string', default: `'選擇日期'` },
          { name: 'format', desc: '顯示格式（Intl 選項）', type: 'Intl.DateTimeFormatOptions', default: '年/月/日 星期' },
          { name: 'clearable', desc: '顯示清除按鈕', type: 'boolean', default: 'false' },
          { name: 'min / max / disabled-date / markers / locale / week-starts-on', desc: '同 MlCalendar', type: '—' },
          { name: 'placement', desc: '日曆對齊', type: `'bottom-start' | 'bottom-end'`, default: `'bottom-start'` },
          { name: 'disabled', desc: '停用', type: 'boolean', default: 'false' },
        ],
      },
    ],
  },
  {
    id: 'phone',
    title: 'Phone',
    zh: '手機外框',
    group: 'mobile',
    isNew: true,
    desc: '金屬邊框的手機外框，含狀態列、動態島與 Home 指示條。用來展示行動版畫面或做行銷頁。',
    usage: `import { MlPhone } from '@malilion/ui'`,
    examples: [{ file: 'phone/basic', title: '基本用法' }],
    api: [
      {
        component: 'MlPhone',
        props: [
          { name: 'width', desc: '螢幕寬度（px），高度依比例', type: 'number', default: '300' },
          { name: 'time', desc: '狀態列時間', type: 'string', default: `'9:41'` },
          { name: 'label', desc: '無障礙名稱', type: 'string' },
        ],
        slots: [
          { name: 'default', desc: '可捲動的畫面內容' },
          { name: 'bottom', desc: '固定在底部（例如 MlTabBar）' },
        ],
      },
    ],
  },
  {
    id: 'nav-bar',
    title: 'NavBar',
    zh: '頂部導覽',
    group: 'mobile',
    isNew: true,
    desc: '行動版頂部列：返回、置中標題與右側動作，或 iOS 風格的大標題。捲動時會黏在頂端。',
    usage: `import { MlNavBar } from '@malilion/ui'`,
    examples: [{ file: 'nav-bar/basic', title: '一般與大標題', block: true }],
    api: [
      {
        component: 'MlNavBar',
        props: [
          { name: 'title / subtitle', desc: '標題與副標', type: 'string' },
          { name: 'back', desc: '顯示返回按鈕', type: 'boolean', default: 'false' },
          { name: 'large', desc: '大標題', type: 'boolean', default: 'false' },
        ],
        events: [{ name: 'back', desc: '按下返回' }],
        slots: [
          { name: 'left / right', desc: '兩側內容' },
          { name: 'title', desc: '自訂標題' },
        ],
      },
    ],
  },
  {
    id: 'tab-bar',
    title: 'TabBar',
    zh: '底部導覽',
    group: 'mobile',
    isNew: true,
    desc: '行動版底部導覽，可加數字徽章，中間還能放一顆凸起的金色肉球按鈕。',
    usage: `import { MlTabBar } from '@malilion/ui'`,
    examples: [{ file: 'tab-bar/basic', title: '含肉球動作鈕' }],
    api: [
      {
        component: 'MlTabBar',
        props: [
          { name: 'v-model', desc: '目前分頁', type: 'string' },
          { name: 'items', desc: '分頁', type: '{ value, label, icon, badge? }[]' },
          { name: 'action-label', desc: '給了就顯示中間的肉球鈕（也是它的無障礙名稱）', type: 'string' },
          { name: 'label', desc: '導覽的無障礙名稱', type: 'string', default: `'主要導覽'` },
        ],
        events: [{ name: 'action', desc: '按下肉球鈕' }],
      },
    ],
  },
  {
    id: 'list',
    title: 'List',
    zh: '清單',
    group: 'mobile',
    isNew: true,
    desc: '訊息、設定、選單用的清單列：前方頭像或圖示、標題副標、右側時間或數字。',
    usage: `import { MlList, MlListItem } from '@malilion/ui'`,
    examples: [{ file: 'list/basic', title: '訊息與設定' }],
    api: [
      {
        component: 'MlList',
        props: [
          { name: 'variant', desc: '滿版或群組卡片', type: `'plain' | 'inset'`, default: `'plain'` },
          { name: 'title', desc: '群組標題', type: 'string' },
        ],
        slots: [{ name: 'default', desc: '放 MlListItem' }],
      },
      {
        component: 'MlListItem',
        props: [
          { name: 'title / subtitle', desc: '標題與副標', type: 'string' },
          { name: 'meta', desc: '右側小字（時間等）', type: 'string' },
          { name: 'badge', desc: '右側數字', type: 'number | string' },
          { name: 'href', desc: '變成連結', type: 'string' },
          { name: 'clickable', desc: '變成按鈕（觸發 select）', type: 'boolean', default: 'false' },
          { name: 'active', desc: '目前項目', type: 'boolean', default: 'false' },
          { name: 'chevron', desc: '右側箭頭', type: 'boolean', default: 'false' },
        ],
        events: [{ name: 'select', desc: '點擊（clickable 時）' }],
        slots: [
          { name: 'leading', desc: '前方頭像或圖示' },
          { name: 'trailing', desc: '右側自訂內容' },
        ],
      },
    ],
  },
  {
    id: 'mobile-screens',
    title: 'Mobile screens',
    zh: '手機版畫面',
    group: 'template',
    isNew: true,
    desc: '五個完整的手機畫面：歡迎、選單、探索、訊息與行動呼籲。全部用元件組成，可以直接複製。',
    examples: [{ file: 'templates/mobile', title: '五個畫面', block: true }],
  },
]

export const pageById = new Map(pages.map((page) => [page.id, page]))
