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

export type GroupId = 'start' | 'basic' | 'form' | 'feedback' | 'data' | 'chart' | 'nav' | 'template'

export const groups: { id: GroupId; label: string; en: string }[] = [
  { id: 'start', label: '開始', en: 'Getting started' },
  { id: 'basic', label: '基礎', en: 'Basic' },
  { id: 'form', label: '表單', en: 'Form' },
  { id: 'feedback', label: '回饋', en: 'Feedback' },
  { id: 'data', label: '資料展示', en: 'Data display' },
  { id: 'chart', label: '圖表', en: 'Charts' },
  { id: 'nav', label: '導覽', en: 'Navigation' },
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
    isNew: true,
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
    isNew: true,
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
    isNew: true,
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
    isNew: true,
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
    isNew: true,
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
    isNew: true,
    desc: '拖曳或點擊選擇檔案。會依 accept 與 max-size 過濾，被擋下的檔案透過 reject 事件告訴你原因。',
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
    isNew: true,
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
    isNew: true,
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
    isNew: true,
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
    isNew: true,
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
    isNew: true,
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
    isNew: true,
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
    isNew: true,
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
    isNew: true,
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
    isNew: true,
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
    isNew: true,
    desc: '把元件組起來的完整區塊：儀表板、個人檔案、價格方案、空狀態與頂部導覽列。直接複製改一改就能用。',
    examples: [
      { file: 'templates/dashboard', title: '儀表板', desc: '數據卡片 + 迷你折線、長條圖與甜甜圈圖。', block: true },
      { file: 'templates/cards', title: '個人檔案、價格方案與空狀態', block: true },
      { file: 'templates/header', title: '頂部導覽列', desc: '品牌、導覽、⌘K 搜尋、頭像與行動按鈕。', block: true },
    ],
  },
]

export const pageById = new Map(pages.map((page) => [page.id, page]))
