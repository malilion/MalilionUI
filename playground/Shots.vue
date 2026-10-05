<script setup lang="ts">
import { ref } from 'vue'
import { lionAvatarUrl, lionFullUrl, twRules, type MlAvatarStatus, type MlProTableColumn, type MlSchemaModel, type MlWizardStep, type MlSchedulerEvent, type MlTableSort, type MlTaiwanAddressValue } from '@malilion/ui'
import MlToastCard from '../src/components/MlToastCard.vue'
import type { MlToastItem } from '../src/toast'

// Fixed compositions for the README screenshots (scripts/screenshots.mjs).
// Every panel is a [data-shot] element captured on its own.

const mailIcon = 'M3 6h18v12H3zM3 6l9 7 9-7'

/* v0.15 — back-office kit */
interface V15Member { id: number; name: string; team: string; level: number; active: boolean }
const v15Teams = [
  { value: 'core', label: '核心組' },
  { value: 'ui', label: '介面組' },
  { value: 'ops', label: '維運組' },
]
const v15Columns: MlProTableColumn<V15Member>[] = [
  { key: 'id', title: '編號', width: '64px', mono: true, sortable: true },
  { key: 'name', title: '姓名', sortable: true, filter: true, form: { required: true } },
  { key: 'team', title: '組別', options: v15Teams, filter: true, form: { required: true } },
  { key: 'level', title: '等級', align: 'right', sortable: true, form: { type: 'number' } },
  { key: 'active', title: '狀態', format: (v) => (v ? '在職' : '停用'), form: { type: 'switch' } },
]
const v15Members: V15Member[] = [
  { id: 1, name: '陳大獅', team: 'core', level: 9, active: true },
  { id: 2, name: '林小鬃', team: 'ui', level: 6, active: true },
  { id: 3, name: '王爪爪', team: 'ops', level: 4, active: false },
  { id: 4, name: '張肉球', team: 'ui', level: 7, active: true },
  { id: 5, name: '李金鬃', team: 'core', level: 10, active: true },
  { id: 6, name: '黃小吼', team: 'ops', level: 3, active: true },
  { id: 7, name: '吳尾巴', team: 'ui', level: 5, active: false },
]
const v15Selected = ref<(string | number)[]>([2, 4])
const v15Steps: MlWizardStep[] = [
  {
    key: 'identity',
    title: '身分驗證',
    schema: [
      { field: 'name', label: '姓名', required: true },
      { field: 'nationalId', label: '身分證字號', required: true, rules: [twRules.nationalId()] },
    ],
  },
  { key: 'shop', title: '商店設定' },
  { key: 'confirm', title: '確認送出' },
]
const v15Model = ref<MlSchemaModel>({ name: '陳大獅', nationalId: 'A123456789' })
const v15Format = ref<string[]>(['bold', 'code'])
const v15Formats = [
  { value: 'bold', label: '粗體' },
  { value: 'italic', label: '斜體' },
  { value: 'code', label: '程式碼' },
]

/* v0.14 — Taiwan, lists, data & workflow */
const v14Day = new Date(2026, 9, 5)
const v14Now = new Date(2026, 9, 7, 14, 20)
const v14At = (day: number, hour: number, minute = 0) => new Date(2026, 9, 4 + day, hour, minute)
const v14Events: MlSchedulerEvent[] = [
  { id: 'standup', title: '晨會', start: v14At(1, 9), end: v14At(1, 9, 30), tone: 'tech', location: '會議室 A' },
  { id: 'review', title: '設計審查', start: v14At(1, 10), end: v14At(1, 12), tone: 'gold', location: '獅子廳' },
  { id: 'pair', title: '結對寫程式', start: v14At(1, 11), end: v14At(1, 13), tone: 'bean' },
  { id: 'lunch', title: '午餐', start: v14At(2, 12), end: v14At(2, 13), tone: 'success' },
  { id: 'release', title: '發版 v0.14', start: v14At(3, 14), end: v14At(3, 16, 30), tone: 'danger', location: 'CI' },
  { id: 'demo', title: 'Demo Day', start: v14At(4, 10), end: v14At(4, 11, 30), tone: 'gold' },
  { id: 'gym', title: '健身', start: v14At(4, 15), end: v14At(4, 16, 30), tone: 'steel' },
  { id: 'trip', title: '台南出差', start: v14At(5, 0), end: v14At(5, 0), allDay: true, tone: 'bean' },
]
const v14Contacts = [
  '陳大文', '林美玲', '黃志明', '張雅婷', '李建宏', '王小明', '吳佩珊', '劉家豪', '蔡淑芬', '楊俊傑', '許文欣', '鄭宇翔',
  '沈佳穎', '安以樂', '歐陽晴', '白子軒', '馬可', '方宇翔', 'Leo', 'Nala',
].map((label, i) => ({ label, desc: i % 3 ? undefined : '碼力獅工作室' }))
const v14Team = ['碼力獅', 'Leo', 'Nala', '小虎', 'Simba', '阿金', 'Kiara', '大橘'].map((name, i) => ({
  name,
  lion: i === 0,
  ring: (['gold', 'steel', 'tech'] as const)[i % 3],
}))
const v14Waterfall = [
  { label: '期初', value: 1200, total: true },
  { label: '營收', value: 860 },
  { label: '服務', value: 240 },
  { label: '成本', value: -520 },
  { label: '人事', value: -380 },
  { label: '期末', total: true },
]
const v14Address: MlTaiwanAddressValue = { county: '臺北市', district: '中正區', zip: '100', road: '重慶南路', section: '1', number: '122' }
const v14Poem: [string, string][] = [
  ['床前明月光，', 'ㄔㄨㄤˊ ㄑㄧㄢˊ ㄇㄧㄥˊ ㄩㄝˋ ㄍㄨㄤ'],
  ['疑是地上霜。', 'ㄧˊ ㄕˋ ㄉㄧˋ ㄕㄤˋ ㄕㄨㄤ'],
]

/* v0.7 — dev kit */
const v7Today = new Date(2026, 9, 3)
const v7Heat = Array.from({ length: 270 }, (_, i) => {
  const seed = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1
  const date = new Date(2026, 9, 3 - i)
  const weekday = date.getDay() % 6 !== 0
  return { date, count: seed < (weekday ? 0.2 : 0.6) ? 0 : Math.round(seed * 8 + (Math.sin(i / 17) > 0.5 ? 5 : 0)) }
})
const v7Radar = [{ label: '前端', max: 100 }, { label: '後端', max: 100 }, { label: '設計', max: 100 }, { label: '測試', max: 100 }, { label: '溝通', max: 100 }]
const v7Series = [
  { name: '碼力獅', values: [95, 72, 88, 80, 76], tone: 'gold' as const },
  { name: 'Nala', values: [70, 92, 55, 85, 90], tone: 'tech' as const },
]
const v7Code = `import MalilionUI, { en } from '@malilion/ui'

createApp(App)
  .use(MalilionUI, { locale: en })
  .mount('#app')`

/* v0.6 — workspace, inputs, brand */
const v6Menu = [
  { key: 'g-main', label: '主要', group: true, children: [
    { key: 'dash', label: '儀表板', icon: 'grid' as const },
    { key: 'deploy', label: '部署', icon: 'upload' as const, children: [
      { key: 'pipelines', label: '流水線' },
      { key: 'envs', label: '環境', badge: 3 },
    ] },
    { key: 'msg', label: '訊息', icon: 'message' as const, badge: 8 },
  ] },
  { key: 'g-team', label: '團隊', group: true, children: [
    { key: 'pride', label: '獅群', icon: 'user' as const },
    { key: 'set', label: '設定', icon: 'settings' as const },
  ] },
]
const v6Labels = ['週一', '週二', '週三', '週四', '週五', '週六', '週日']
const v6Series = [
  { name: 'API 請求', data: [120, 132, 101, 134, 190, 230, 210], tone: 'gold' as const },
  { name: '快取命中', data: [80, 92, 71, 104, 140, 180, 160], tone: 'tech' as const },
]
const v6Desc = [
  { label: '版本', value: 'v0.6.0', mono: true },
  { label: '環境', value: 'Production' },
  { label: 'Commit', value: '09c031c', mono: true },
]
const v6Areas = [
  { value: 'taipei', label: '台北市', children: [{ value: 'xinyi', label: '信義區' }, { value: 'daan', label: '大安區' }, { value: 'neihu', label: '內湖區' }] },
  { value: 'newtaipei', label: '新北市', children: [{ value: 'banqiao', label: '板橋區' }] },
  { value: 'taichung', label: '台中市', children: [{ value: 'xitun', label: '西屯區' }] },
]
const v6Tree = [
  { key: 'users', label: '使用者', children: [{ key: 'read-users', label: '讀取使用者' }, { key: 'write-users', label: '修改使用者' }] },
  { key: 'repos', label: '程式庫' },
]
const v6Range: [Date, Date] = [new Date(2026, 9, 6), new Date(2026, 9, 12)]
const v6Commands = [
  { icon: 'file' as const, label: '新增檔案', hit: [0, 1], shortcut: '⌘ N' },
  { icon: 'settings' as const, label: '開啟設定', hit: [2, 3], shortcut: '⌘ ,' },
  { icon: 'rotate' as const, label: '切換日光 / 夜間模式', hit: [], shortcut: '' },
]
const v6Deadline = Date.now() + ((2 * 24 + 7) * 3600 + 25 * 60 + 41) * 1000

/* Forms */
const roles = [
  { value: 'alpha', label: 'Alpha — 獅群領袖' },
  { value: 'hunter', label: 'Hunter — 前線開發' },
  { value: 'scout', label: 'Scout — 探索研究' },
]
const plans = [
  { value: 'cub', label: 'Cub', hint: '個人專案 · 免費' },
  { value: 'pride', label: 'Pride', hint: '小團隊 · NT$ 290 / 月' },
  { value: 'king', label: 'King', hint: '企業 · 聯絡我們' },
  { value: 'legend', label: 'Legend', hint: '傳說 · 即將推出', disabled: true },
]

/* Feedback */
const toasts: MlToastItem[] = [
  { id: 1, tone: 'paw', message: '嗷嗚～收到一個腳印通知', duration: 0, closable: true },
  { id: 2, tone: 'success', title: '部署完成', message: 'v0.2.0 已上線到 production', duration: 600000, closable: true },
  {
    id: 3,
    tone: 'danger',
    title: '建置失敗',
    message: '第 42 行有型別錯誤',
    duration: 0,
    closable: true,
    action: { label: '重試', onClick: () => {} },
  },
]

/* Data */
const columns = [
  { key: 'name', title: '專案', sortable: true },
  { key: 'owner', title: '負責人' },
  { key: 'status', title: '狀態' },
  { key: 'stars', title: 'Stars', sortable: true, align: 'right' as const, mono: true },
  { key: 'updated', title: '更新', sortable: true, mono: true },
]
const rows: { id: string; name: string; owner: string; presence: MlAvatarStatus; status: string; stars: number; updated: string }[] = [
  { id: 'context', name: 'ContextLion', owner: '碼力獅', presence: 'online', status: 'Live', stars: 518, updated: '2026-09-30' },
  { id: 'stock', name: 'StockLion', owner: 'Nala Ray', presence: 'away', status: 'Beta', stars: 342, updated: '2026-09-28' },
  { id: 'toeic', name: 'ToeicLion', owner: 'Leo Nova', presence: 'busy', status: 'Live', stars: 233, updated: '2026-07-19' },
  { id: 'gift', name: 'GiftLion', owner: 'Kiara', presence: 'online', status: 'Draft', stars: 156, updated: '2026-09-02' },
]
const statusTone = { Live: 'success', Beta: 'tech', Draft: 'steel' } as const
const sort = ref<MlTableSort | null>({ key: 'stars', order: 'desc' })
const selected = ref<(string | number)[]>(['context', 'toeic'])

/* Navigation */
const tab = ref('overview')
const tabItems = [
  { value: 'overview', label: '總覽' },
  { value: 'pride', label: '獅群' },
  { value: 'logs', label: '日誌' },
  { value: 'locked', label: '鎖定', disabled: true },
]
const range = ref('week')
const ranges = [
  { value: 'day', label: '日' },
  { value: 'week', label: '週' },
  { value: 'month', label: '月' },
  { value: 'year', label: '年' },
]
const lang = ref('zh-Hant')
const languages = [
  { value: 'zh-Hant', label: '繁體中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'lion', label: '獅語（Roar）', divider: true },
]
const actions = [
  { value: 'edit', label: '編輯', icon: 'info' as const, hint: '⌘E' },
  { value: 'delete', label: '刪除', icon: 'danger' as const, danger: true, divider: true },
]

const sparkStats = [
  { label: 'Total Users', value: '24,532', delta: '+12.6%', tone: 'gold' as const, data: [8, 9, 7, 11, 10, 14, 13, 17, 16, 21] },
  { label: 'Revenue', value: 'NT$1.28M', delta: '+18.4%', tone: 'tech' as const, data: [3, 5, 4, 6, 8, 7, 9, 12, 11, 14] },
  { label: 'Satisfaction', value: '96%', delta: '+2.1%', tone: 'bean' as const, data: [80, 82, 85, 84, 88, 90, 89, 93, 95, 96] },
]
const months = [
  { label: 'Jan', value: 8200 },
  { label: 'Feb', value: 14800 },
  { label: 'Mar', value: 11600 },
  { label: 'Apr', value: 22400 },
  { label: 'May', value: 42560 },
  { label: 'Jun', value: 31800 },
]
const traffic = [
  { label: 'Direct', value: 38 },
  { label: 'Search', value: 28 },
  { label: 'Social', value: 18 },
  { label: 'Referral', value: 10 },
  { label: 'Others', value: 6 },
]
const chips = [
  { label: 'UI', on: true },
  { label: 'Vue', on: true },
  { label: 'React', on: false },
  { label: 'AI', on: false },
]
const faq = [
  { value: 'what', title: 'What is Malilion UI?', content: '可愛又強大的元件庫：獅子 × 科技 × 金屬，再加上肉球腳印。' },
  { value: 'install', title: 'Installation', content: 'npm install @malilion/ui' },
]

const now = new Date()
const calDay = new Date(now.getFullYear(), now.getMonth(), 16)
const calMarkers = [3, 9, 18, 24].map((d) => new Date(now.getFullYear(), now.getMonth(), d))
const calRange: [Date | null, Date | null] = [
  new Date(now.getFullYear(), now.getMonth(), 8),
  new Date(now.getFullYear(), now.getMonth(), 13),
]
const mTabs = [
  { value: 'home', label: 'Home', icon: 'home' as const },
  { value: 'explore', label: 'Explore', icon: 'compass' as const },
  { value: 'inbox', label: 'Inbox', icon: 'message' as const, badge: 3 },
  { value: 'me', label: 'Me', icon: 'user' as const },
]

/* v0.5 — pickers, overlays, structure, media */
const comboRoles = [
  { value: 'alpha', label: 'Alpha — 獅群領袖' },
  { value: 'hunter', label: 'Hunter — 前線開發' },
  { value: 'scout', label: 'Scout — 探索研究' },
  { value: 'elder', label: 'Elder — 名譽顧問' },
]
const stackOptions = [
  { value: 'vue', label: 'Vue' },
  { value: 'ts', label: 'TypeScript' },
  { value: 'vite', label: 'Vite' },
  { value: 'pinia', label: 'Pinia' },
]
const rangeOptions = [
  { value: 'day', label: '日' },
  { value: 'week', label: '週' },
  { value: 'month', label: '月' },
]
const treeData = [
  {
    key: 'src',
    label: 'src',
    icon: 'folder' as const,
    children: [
      {
        key: 'components',
        label: 'components',
        icon: 'folder' as const,
        children: [
          { key: 'combobox', label: 'MlCombobox.vue', icon: 'file' as const },
          { key: 'tree', label: 'MlTree.vue', icon: 'file' as const },
          { key: 'drawer', label: 'MlDrawer.vue', icon: 'file' as const },
        ],
      },
      { key: 'form', label: 'form.ts', icon: 'file' as const },
    ],
  },
  { key: 'readme', label: 'README.md', icon: 'file' as const },
]
const timelineItems = [
  { title: 'v0.5.0 發布', time: '10:02', tone: 'success' as const, icon: 'success' as const, desc: '新增 25 個元件。' },
  { title: '合併 PR #3', time: '09:40', paw: true },
  { title: 'CI 通過', time: '09:31', tone: 'tech' as const, icon: 'check' as const },
  { title: '開始開發', time: '08:00' },
]
const transferData = [
  { key: 'simba', label: 'Simba', hint: 'Alpha' },
  { key: 'nala', label: 'Nala', hint: 'Hunter' },
  { key: 'rafiki', label: 'Rafiki', hint: 'Elder' },
  { key: 'timon', label: 'Timon', hint: 'Scout' },
  { key: 'zazu', label: 'Zazu', hint: 'Messenger' },
]
const slides = [
  { title: 'Night Pride', sub: '暗色主題，金屬與獅鬃的光澤' },
  { title: 'Circuit Cyan', sub: '科技色，獅子眼裡的電光' },
  { title: 'Toe Bean Pink', sub: '肉球粉，少量使用的可愛' },
]

const themes = [
  { id: 'dark', name: 'Night Pride', zh: '深色' },
  { id: 'light', name: 'Daylight Titanium', zh: '淺色' },
]
</script>

<template>
  <div class="shots">
    <!-- ───────────── Hero ───────────── -->
    <section data-shot="hero" class="shot shot--hero">
      <div class="hero__emblem">
        <div class="hero__halo" />
        <span class="hero__trail">
          <MlPaw v-for="n in 5" :key="n" tone="bean" />
        </span>
        <MlMascot pose="full" :size="300" glow title="碼力獅" class="hero__lion" />
      </div>
      <div class="hero__copy">
        <p class="ml-hud-label hero__kicker">碼力獅 Design System · Vue 3</p>
        <h1 class="hero__title">
          <span class="ml-metal-text">MALILION</span>
          <span class="ml-metal-text ml-metal-text--steel">UI</span>
        </h1>
        <p class="hero__paw ml-font-paw">hi, i'm malilion! let's ship it… &#xE000;</p>
        <p class="hero__lead">
          <strong>獅子</strong> × <strong>科技</strong> × <strong>金屬</strong> ×
          <strong class="bean">肉球</strong><br />
          切角機甲板、拋光獅金、鈦合金與電路青光，再踩上一串可愛的腳印。
        </p>
        <div class="row">
          <MlButton size="lg">開始使用</MlButton>
          <MlButton size="lg" variant="outline">瀏覽元件</MlButton>
          <MlButton size="lg" variant="tech">
            <template #prefix><MlPaw tone="current" /></template>
            Paw
          </MlButton>
        </div>
        <div class="row hero__badges">
          <MlBadge paw>101 Components</MlBadge>
          <MlBadge tone="tech" dot>Vue 3 · TS</MlBadge>
          <MlBadge tone="steel">2 Themes</MlBadge>
          <MlBadge tone="bean" solid paw>Cute</MlBadge>
        </div>
      </div>
    </section>

    <!-- ───────────── Buttons & badges ───────────── -->
    <section data-shot="buttons" class="shot">
      <header class="shot__head">
        <div>
          <p class="shot__kicker">01 // Buttons &amp; Badges</p>
          <h2 class="shot__title">按鈕與徽章</h2>
        </div>
        <span class="shot__brand"><MlMascot :size="30" frame="ring" title="" />MALILION<b>UI</b></span>
      </header>
      <div class="stack">
        <p class="ml-hud-label">Variants</p>
        <div class="row">
          <MlButton>主要行動</MlButton>
          <MlButton variant="steel">鈦金屬</MlButton>
          <MlButton variant="outline">外框</MlButton>
          <MlButton variant="tech">科技</MlButton>
          <MlButton variant="ghost">幽靈</MlButton>
          <MlButton variant="danger">刪除</MlButton>
        </div>
        <p class="ml-hud-label">Sizes · States</p>
        <div class="row">
          <MlButton size="sm">Small</MlButton>
          <MlButton>Medium</MlButton>
          <MlButton size="lg">Large</MlButton>
          <MlButton loading>部署中</MlButton>
          <MlButton variant="outline" disabled>已停用</MlButton>
          <MlButton square variant="steel" aria-label="新增">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 5v14M5 12h14" /></svg>
          </MlButton>
          <span class="stamp-demo">
            <MlButton variant="outline">按我蓋章</MlButton>
            <MlPaw class="stamp-demo__paw" />
          </span>
        </div>
        <p class="ml-hud-label">Badges</p>
        <div class="row">
          <MlBadge>Gold</MlBadge>
          <MlBadge tone="steel">Steel</MlBadge>
          <MlBadge tone="tech" dot>Tech</MlBadge>
          <MlBadge tone="bean" paw>Bean</MlBadge>
          <MlBadge tone="success" pulse>Online</MlBadge>
          <MlBadge tone="danger" dot>Error</MlBadge>
          <MlBadge solid>Alpha</MlBadge>
          <MlBadge solid tone="steel">Beta</MlBadge>
          <MlBadge solid tone="tech">New</MlBadge>
          <MlBadge solid tone="bean" paw>Cute</MlBadge>
          <MlBadge solid tone="success">Pass</MlBadge>
        </div>
      </div>
    </section>

    <!-- ───────────── Forms ───────────── -->
    <section data-shot="forms" class="shot">
      <header class="shot__head">
        <div>
          <p class="shot__kicker">02 // Form</p>
          <h2 class="shot__title">HUD 表單</h2>
        </div>
        <span class="shot__brand"><MlMascot :size="30" frame="ring" title="" />MALILION<b>UI</b></span>
      </header>
      <div class="grid-2">
        <MlCard eyebrow="Register" title="成員登錄" rivets>
          <div class="stack">
            <MlInput index="01" label="Email" model-value="lion@malilion.dev" class="focus-me">
              <template #prefix>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path :d="mailIcon" /></svg>
              </template>
            </MlInput>
            <MlInput index="02" label="代號 Callsign" model-value="MALI-LION">
              <template #suffix>#0721</template>
            </MlInput>
            <MlInput index="03" label="密碼" type="password" model-value="roar" error="至少需要 8 個字元" />
            <MlSelect index="04" label="角色" :options="roles" model-value="hunter" />
          </div>
        </MlCard>
        <div class="stack stack--loose">
          <MlRadioGroup label="選擇方案" variant="card" :options="plans" model-value="pride" />
          <div class="grid-2 grid-2--tight">
            <div class="stack">
              <MlCheckbox paw :model-value="true" label="今天有吃點心" />
              <MlCheckbox :model-value="true" label="我同意獅群公約" />
              <MlCheckbox :model-value="false" label="訂閱電子報" />
            </div>
            <div class="stack">
              <MlSwitch :model-value="true" label="推播通知" show-state />
              <MlSwitch :model-value="true" tone="tech" label="Turbo 模式" show-state />
              <MlSwitch :model-value="false" label="防護罩" show-state />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ───────────── Feedback ───────────── -->
    <section data-shot="feedback" class="shot">
      <header class="shot__head">
        <div>
          <p class="shot__kicker">03 // Feedback</p>
          <h2 class="shot__title">警示、進度、載入與通知</h2>
        </div>
        <span class="shot__brand"><MlMascot :size="30" frame="ring" title="" />MALILION<b>UI</b></span>
      </header>
      <div class="grid-2">
        <div class="stack">
          <MlAlert title="系統訊息">新版獅群儀表板已推出，歡迎試用。</MlAlert>
          <MlAlert tone="success" title="部署完成" closable>版本 v0.2.0 已成功上線。</MlAlert>
          <MlAlert tone="warning" title="額度即將用盡">本月 API 額度剩下 12%。</MlAlert>
          <MlAlert tone="danger" title="建置失敗">第 42 行有型別錯誤。</MlAlert>
        </div>
        <MlCard eyebrow="Telemetry" title="能量監控">
          <div class="stack stack--loose">
            <MlProgress :value="72" label="Mane Reactor" size="lg" paw />
            <MlProgress :value="58" label="CPU" tone="tech" />
            <MlProgress :value="38" label="記憶體" tone="success" smooth />
            <MlProgress :value="91" label="磁碟" tone="danger" striped />
          </div>
        </MlCard>
        <div class="loaders">
          <MlLoader :size="58" label="Roaring" />
          <MlLoader :size="58" tone="tech" label="Syncing" />
          <MlLoader variant="paws" :size="58" label="Walking" />
          <MlLoader variant="paws" :size="58" tone="bean" label="Cub" />
        </div>
        <ul class="ml-toast-host__list toasts">
          <MlToastCard v-for="item in toasts" :key="item.id" :item="item" />
        </ul>
      </div>
    </section>

    <!-- ───────────── Data ───────────── -->
    <section data-shot="data" class="shot">
      <header class="shot__head">
        <div>
          <p class="shot__kicker">04 // Data display</p>
          <h2 class="shot__title">表格、數據與頭像</h2>
        </div>
        <span class="shot__brand"><MlMascot :size="30" frame="ring" title="" />MALILION<b>UI</b></span>
      </header>
      <div class="stack stack--loose">
        <div class="stats">
          <MlStat label="今日部署" :value="128" :delta="12.4" caption="vs 昨日" />
          <MlStat label="平均回應" value="42" unit="ms" :delta="-8.1" caption="越低越好" />
          <MlStat label="獅群成員" value="2,048" :delta="3.2" caption="本週" />
          <MlStat label="可用率" value="99.98" unit="%" :delta="0.02" caption="過去 30 天" />
        </div>
        <MlTable v-model:sort="sort" v-model:selected="selected" :columns="columns" :rows="rows" selectable>
          <template #cell-owner="{ row }">
            <span class="who"><MlAvatar :name="row.owner" :lion="row.owner === '碼力獅'" size="sm" :status="row.presence" />{{ row.owner }}</span>
          </template>
          <template #cell-status="{ row }">
            <MlBadge :tone="statusTone[row.status as keyof typeof statusTone]" dot>{{ row.status }}</MlBadge>
          </template>
        </MlTable>
      </div>
    </section>

    <!-- ───────────── Navigation ───────────── -->
    <section data-shot="navigation" class="shot shot--nav">
      <header class="shot__head">
        <div>
          <p class="shot__kicker">05 // Navigation</p>
          <h2 class="shot__title">分頁、下拉選單與提示</h2>
        </div>
        <span class="shot__brand"><MlMascot :size="30" frame="ring" title="" />MALILION<b>UI</b></span>
      </header>
      <div class="grid-2">
        <MlCard>
          <MlTabs v-model="tab" :items="tabItems" label="獅群資訊">
            <template #overview>
              <div class="stack">
                <p class="copy">本週共完成 37 個任務，獅群士氣高昂。</p>
                <pre class="log">[21:04] build ✓  12.4s
[21:05] test  ✓  49 passed
[21:06] deploy → production 🐾</pre>
                <div class="ml-avatar-group">
                  <MlAvatar lion status="online" />
                  <MlAvatar name="Nala" ring="steel" />
                  <MlAvatar name="Leo" ring="tech" />
                  <MlAvatar name="+4" ring="steel" />
                </div>
              </div>
            </template>
          </MlTabs>
        </MlCard>
        <div class="stack stack--loose">
          <MlTabs v-model="range" :items="ranges" variant="plate" label="時間範圍" />
          <div class="row row--top">
            <MlDropdown v-model="lang" :items="languages" selectable label="語言" class="open-me" />
            <MlDropdown :items="actions" label="操作" variant="steel" />
            <MlTooltip content="獅子的科技之眼 👁" placement="top" class="show-tip">
              <MlButton variant="tech">Hover</MlButton>
            </MlTooltip>
          </div>
        </div>
      </div>
    </section>

    <!-- ───────────── Modal ───────────── -->
    <section data-shot="modal" class="shot shot--modal">
      <div class="modal-backdrop-content">
        <div class="stats">
          <MlStat label="今日部署" :value="128" :delta="12.4" />
          <MlStat label="獅群成員" value="2,048" :delta="3.2" />
          <MlStat label="可用率" value="99.98" unit="%" />
          <MlStat label="回應" value="42" unit="ms" :delta="-8.1" />
        </div>
        <div class="grid-2">
          <MlCard eyebrow="Pride / 01" title="獅群儀表板" rivets>即時掌握每位成員的開發節奏。</MlCard>
          <MlCard variant="tech" eyebrow="System" title="電路之眼">青色科技外殼與發光邊框。</MlCard>
        </div>
      </div>
      <MlModal :open="true" inline eyebrow="Command · Deploy" title="部署到正式站？" :width="500">
        即將把 <strong>main</strong> 分支的最新版本推上 production，部署期間網站仍可正常瀏覽。
        <div class="modal-progress"><MlProgress :value="100" label="Pre-flight checks" tone="success" size="sm" /></div>
        <template #footer>
          <MlButton variant="ghost">取消</MlButton>
          <MlButton>確認部署</MlButton>
        </template>
      </MlModal>
    </section>

    <!-- ───────────── Paw ───────────── -->
    <section data-shot="paw" class="shot">
      <header class="shot__head">
        <div>
          <p class="shot__kicker">06 // Paw</p>
          <h2 class="shot__title">獅掌腳印 · 可愛風格</h2>
        </div>
        <span class="shot__brand"><MlMascot :size="30" frame="ring" title="" />MALILION<b>UI</b></span>
      </header>
      <div class="paw-row">
        <figure v-for="tone in (['gold', 'bean', 'steel', 'tech'] as const)" :key="tone">
          <MlPaw :size="84" :tone="tone" />
          <figcaption>tone="{{ tone }}"</figcaption>
        </figure>
        <figure class="paw-row__stamp">
          <span class="stamp-demo stamp-demo--big">
            <MlButton size="lg" variant="outline">v-paw-stamp</MlButton>
            <MlPaw class="stamp-demo__paw" tone="bean" />
          </span>
          <figcaption>按下就蓋一個腳印</figcaption>
        </figure>
      </div>
      <MlDivider paw />
      <div class="grid-3">
        <div class="stack">
          <p class="ml-hud-label">Checkbox · Radio</p>
          <MlCheckbox paw :model-value="true" label="喜歡碼力獅" />
          <MlRadioGroup :options="[{ value: 'm', label: '青年獅' }, { value: 'l', label: '獅王' }]" model-value="m" />
        </div>
        <div class="stack">
          <p class="ml-hud-label">Progress · Loader</p>
          <MlProgress :value="64" label="小獅子回家中" paw />
          <div class="row">
            <MlLoader variant="paws" :size="40" />
            <MlLoader variant="paws" tone="bean" :size="40" />
          </div>
        </div>
        <div class="stack">
          <p class="ml-hud-label">Badge · Toast</p>
          <div class="row">
            <MlBadge paw>Lion</MlBadge>
            <MlBadge tone="bean" paw>Purr</MlBadge>
            <MlBadge solid tone="bean" paw>Cute</MlBadge>
          </div>
          <ul class="ml-toast-host__list">
            <MlToastCard :item="toasts[0]" />
          </ul>
        </div>
      </div>
    </section>

    <!-- ───────────── Charts (v0.3) ───────────── -->
    <section data-shot="charts" class="shot">
      <header class="shot__head">
        <div>
          <p class="shot__kicker">07 // Charts</p>
          <h2 class="shot__title">圖表與儀表板</h2>
        </div>
        <span class="shot__brand"><MlMascot :size="30" frame="ring" title="" />MALILION<b>UI</b></span>
      </header>
      <div class="stack stack--loose">
        <div class="grid-3">
          <MlCard v-for="s in sparkStats" :key="s.label">
            <span class="ml-hud-label">{{ s.label }}</span>
            <div class="spark-row">
              <strong class="big">{{ s.value }}</strong>
              <MlSparkline :data="s.data" :tone="s.tone" :width="120" />
            </div>
            <span class="up">↗ {{ s.delta }}</span>
          </MlCard>
        </div>
        <div class="charts-row">
          <MlCard eyebrow="Monthly" title="Traffic">
            <MlBarChart :data="months" :height="170" :format="(v) => `${Math.round(v / 1000)}K`" />
          </MlCard>
          <MlCard eyebrow="Sources" title="Total Visits">
            <MlDonut :data="traffic" title="42,560" caption="Total Visits" :size="150" />
          </MlCard>
          <MlCard eyebrow="Goal" title="Completion">
            <div class="ring-box"><MlRing :value="78" :size="150" label="Project Completion" /></div>
          </MlCard>
        </div>
      </div>
    </section>

    <!-- ───────────── Kit (v0.3) ───────────── -->
    <section data-shot="kit" class="shot">
      <header class="shot__head">
        <div>
          <p class="shot__kicker">08 // More components</p>
          <h2 class="shot__title">導覽、表單與空狀態</h2>
        </div>
        <span class="shot__brand"><MlMascot :size="30" frame="ring" title="" />MALILION<b>UI</b></span>
      </header>
      <div class="kit">
        <div class="stack stack--loose">
          <MlBreadcrumb :items="[{ label: 'Home', href: '#', icon: 'home' }, { label: 'Components', href: '#' }, { label: 'Buttons' }]" />
          <MlSteps :items="[{ title: 'Setup' }, { title: 'Configure' }, { title: 'Review' }, { title: 'Complete' }]" :current="2" />
          <MlPagination :page="5" :total="20" />
          <div class="row">
            <MlTag v-for="chip in chips" :key="chip.label" selectable :selected="chip.on">{{ chip.label }}</MlTag>
            <MlTag tone="bean" closable>Cute</MlTag>
          </div>
          <div class="grid-2 grid-2--tight">
            <MlSlider :model-value="60" label="Volume" unit="%" />
            <MlNumberInput :model-value="3" label="Seats" :min="1" :max="9" />
          </div>
          <MlAccordion :items="faq" :model-value="['what']" />
        </div>
        <div class="stack stack--loose">
          <MlCard>
            <MlEmpty title="No Data Yet" description="讓這隻小獅子先睡一下…新東西很快就來了！">
              <MlButton size="sm">Create New</MlButton>
            </MlEmpty>
          </MlCard>
          <MlUpload hint="PNG, JPG, SVG, PDF (Max 10MB)" />
          <span class="kbd-row">搜尋 <MlKbd>⌘</MlKbd><MlKbd>K</MlKbd></span>
        </div>
      </div>
    </section>

    <!-- ───────────── Calendar (v0.4) ───────────── -->
    <section data-shot="calendar" class="shot">
      <header class="shot__head">
        <div>
          <p class="shot__kicker">09 // Calendar</p>
          <h2 class="shot__title">日曆與日期選擇</h2>
        </div>
        <span class="shot__brand"><MlMascot :size="30" frame="ring" title="" />MALILION<b>UI</b></span>
      </header>
      <div class="cal-row">
        <MlCalendar :model-value="calDay" :markers="calMarkers" />
        <MlCalendar mode="range" :range="calRange" :week-starts-on="1" />
        <div class="stack">
          <MlDatePicker label="開始日期" index="01" :model-value="calDay" />
          <MlDatePicker label="截止日期" index="02" :model-value="null" clearable />
          <MlSteps :items="[{ title: '選日期' }, { title: '確認' }, { title: '完成' }]" :current="1" />
        </div>
      </div>
    </section>

    <!-- ───────────── Mobile (v0.4) ───────────── -->
    <section data-shot="mobile" class="shot">
      <header class="shot__head">
        <div>
          <p class="shot__kicker">10 // Mobile</p>
          <h2 class="shot__title">手機版畫面</h2>
        </div>
        <span class="shot__brand"><MlMascot :size="30" frame="ring" title="" />MALILION<b>UI</b></span>
      </header>
      <div class="phone-row">
        <MlPhone :width="252">
          <div class="m-welcome">
            <MlMascot pose="full" :size="200" glow />
            <h3 class="ml-metal-text">Malilion UI</h3>
            <p>Design. Develop. Roar.</p>
            <MlButton block>Get Started</MlButton>
            <MlButton block variant="outline">Continue with GitHub</MlButton>
          </div>
        </MlPhone>
        <MlPhone :width="252">
          <MlNavBar title="Explore" subtitle="UI Components" large />
          <div class="m-pad">
            <MlInput size="sm" placeholder="Search components..."><template #prefix><MlIcon name="search" /></template></MlInput>
            <div class="row"><MlTag selectable :selected="true">All</MlTag><MlTag selectable>UI</MlTag><MlTag selectable>Data</MlTag></div>
            <MlCard eyebrow="Basic" title="Buttons"><div class="row"><MlButton size="sm">Primary</MlButton><MlButton size="sm" variant="outline">Ghost</MlButton></div></MlCard>
            <MlCard eyebrow="Data" title="Charts"><MlSparkline :data="[3, 5, 4, 7, 6, 9, 11]" :width="170" /></MlCard>
          </div>
          <template #bottom><MlTabBar model-value="home" :items="mTabs" action-label="新增" /></template>
        </MlPhone>
        <MlPhone :width="252">
          <MlNavBar title="Messages" />
          <MlList title="Today">
            <MlListItem title="Malilion Bot" subtitle="Your design is amazing!" meta="10:24" :badge="2"><template #leading><MlAvatar lion size="sm" status="online" /></template></MlListItem>
            <MlListItem title="Figma Team" subtitle="New comments on your file" meta="09:12"><template #leading><MlAvatar name="Figma" size="sm" ring="tech" /></template></MlListItem>
            <MlListItem title="System" subtitle="Build completed" meta="08:41"><template #leading><MlAvatar name="SY" size="sm" ring="steel" /></template></MlListItem>
          </MlList>
          <MlList title="Yesterday">
            <MlListItem title="Luna" subtitle="Let's ship it! ✨" meta="Mon"><template #leading><MlAvatar name="Luna" size="sm" /></template></MlListItem>
          </MlList>
          <template #bottom><MlTabBar model-value="inbox" :items="mTabs" action-label="新增" /></template>
        </MlPhone>
        <MlPhone :width="252">
          <div class="m-cta">
            <MlMascot pose="full" :size="215" glow />
            <h3>Create<br />Amazing<br /><span class="ml-metal-text">Together.</span></h3>
            <MlButton block>Explore Components →</MlButton>
          </div>
        </MlPhone>
      </div>
    </section>

    <!-- ───────────── Logo (README header) ───────────── -->
    <!-- ───────────── Pickers & validation (v0.5) ───────────── -->
    <section data-shot="pickers" class="shot">
      <header class="shot__head">
        <div>
          <p class="shot__kicker">11 // Pickers &amp; validation</p>
          <h2 class="shot__title">進階選擇與表單驗證</h2>
        </div>
        <span class="shot__brand"><MlMascot :size="30" frame="ring" title="" />MALILION<b>UI</b></span>
      </header>
      <div class="v5-grid">
        <div class="stack stack--loose">
          <MlInput index="01" label="Email" :model-value="'simba@pride'" error="請輸入有效的電子郵件" required />
          <MlCombobox class="open-combo" index="02" label="角色" :options="comboRoles" :model-value="'hunter'" searchable />
          <div class="v5-spacer" />
        </div>
        <div class="stack stack--loose">
          <MlCombobox index="03" label="技術棧" :options="stackOptions" :model-value="['vue', 'ts', 'vite']" multiple clearable />
          <MlAutocomplete index="04" label="搜尋專案" :model-value="'malilion/ui'" clearable>
            <template #prefix><MlIcon name="search" /></template>
          </MlAutocomplete>
          <div class="grid-2 grid-2--tight">
            <MlTimePicker label="開始時間" :model-value="'09:30'" />
            <MlColorPicker class="open-color" label="品牌色" :model-value="'#f0ad2f'" />
          </div>
          <div class="v5-spacer v5-spacer--tall" />
        </div>
        <div class="stack stack--loose">
          <MlDateTimePicker label="上線時間" :model-value="new Date(2026, 9, 2, 10, 0)" />
          <MlSegmented :options="rangeOptions" :model-value="'week'" label="範圍" />
          <MlRate :model-value="4.5" allow-half show-value size="lg" />
          <MlRate :model-value="3" tone="bean" :texts="['很差', '普通', '不錯', '很好', '獅吼級']" />
        </div>
      </div>
    </section>

    <!-- ───────────── Overlays (v0.5) ───────────── -->
    <section data-shot="overlays" class="shot shot--overlays">
      <header class="shot__head">
        <div>
          <p class="shot__kicker">12 // Overlays</p>
          <h2 class="shot__title">抽屜、彈出框與骨架屏</h2>
        </div>
      </header>
      <div class="v5-overlays">
        <div class="stack stack--loose">
          <div class="row row--top v5-pops">
            <MlPopover :open="true" title="獅群狀態" placement="bottom" :width="240">
              <MlButton variant="outline">查看狀態</MlButton>
              <template #content>
                <p class="v5-line">在線成員 <strong>12</strong> · 巡邏中 <strong>3</strong></p>
                <MlProgress :value="72" label="領地覆蓋率" size="sm" show-value />
              </template>
            </MlPopover>
            <MlPopconfirm :open="true" title="刪除這個專案？" description="部署紀錄會一起刪除，無法復原。" tone="danger" confirm-text="刪除" placement="bottom">
              <MlButton variant="danger">刪除專案</MlButton>
            </MlPopconfirm>
          </div>
          <MlCard class="v5-skel">
            <MlSkeleton avatar :rows="3" />
          </MlCard>
        </div>
        <MlDrawer :open="true" inline eyebrow="Console · Settings" title="偏好設定" :size="380">
          <div class="stack">
            <MlSwitch :model-value="true">桌面通知</MlSwitch>
            <MlSegmented :options="rangeOptions" :model-value="'day'" size="sm" label="報表週期" />
            <MlSkeleton :rows="2" :title="false" />
          </div>
          <template #footer>
            <MlButton variant="ghost">取消</MlButton>
            <MlButton>儲存</MlButton>
          </template>
        </MlDrawer>
      </div>
    </section>

    <!-- ───────────── Structure (v0.5) ───────────── -->
    <section data-shot="structure" class="shot">
      <header class="shot__head">
        <div>
          <p class="shot__kicker">13 // Structure</p>
          <h2 class="shot__title">樹狀結構、時間軸與穿梭框</h2>
        </div>
        <span class="shot__brand"><MlMascot :size="30" frame="ring" title="" />MALILION<b>UI</b></span>
      </header>
      <div class="v5-structure">
        <MlCard>
          <MlTree
            :data="treeData"
            :expanded="['src', 'components']"
            :checked="['combobox', 'tree']"
            checkable
            :selectable="false"
            label="檔案"
          />
        </MlCard>
        <MlCard>
          <MlTimeline :items="timelineItems" pending="部署中…" />
        </MlCard>
        <MlTransfer class="v5-transfer" :data="transferData" :model-value="['nala', 'timon']" :titles="['獅群成員', '本次任務']" filterable />
      </div>
    </section>

    <!-- ───────────── Media (v0.5) ───────────── -->
    <section data-shot="media" class="shot shot--media">
      <header class="shot__head">
        <div>
          <p class="shot__kicker">14 // Media &amp; utilities</p>
          <h2 class="shot__title">圖片、輪播、浮水印與回到頂端</h2>
        </div>
        <span class="shot__brand"><MlMascot :size="30" frame="ring" title="" />MALILION<b>UI</b></span>
      </header>
      <div class="v5-media">
        <MlCarousel :items="slides" :height="260" label="主題展示">
          <template #default="{ item }">
            <div class="v5-slide">
              <p class="shot__kicker">MALILION UI</p>
              <h3>{{ item.title }}</h3>
              <p>{{ item.sub }}</p>
            </div>
          </template>
        </MlCarousel>
        <MlWatermark :content="['碼力獅 · 內部文件', 'MALILION · 2026']">
          <MlCard eyebrow="Confidential" title="Q4 獅群作戰計畫" class="v5-wm">
            <p>1. 第三優先元件全部上線。</p>
            <p>2. 發布 v0.5.0 到 npm。</p>
            <p>3. 午睡。</p>
          </MlCard>
        </MlWatermark>
        <div class="row">
          <MlImage :src="lionFullUrl" alt="碼力獅全身" :width="140" :height="140" fit="contain" preview />
          <MlImage :src="lionAvatarUrl" alt="碼力獅頭像" :width="140" :height="140" />
          <MlImage :src="lionAvatarUrl" alt="圓形頭像" :width="96" :height="96" round />
          <MlImage src="/missing.png" alt="壞掉的圖片" :width="140" :height="140" />
        </div>
        <div class="v5-backtop">
          <MlBackTop :visibility-height="0" :right="0" :bottom="0" />
          <span class="ml-hud-label">BackTop · 外圈是捲動進度</span>
        </div>
      </div>
    </section>

    <!-- ───────────── Effects (v0.6) ───────────── -->
    <section data-shot="effects" class="shot">
      <header class="shot__head">
        <div>
          <p class="shot__kicker">15 // Effects</p>
          <h2 class="shot__title">視覺特效</h2>
        </div>
        <span class="shot__brand"><MlMascot :size="30" frame="ring" title="" />MALILION<b>UI</b></span>
      </header>
      <div class="fx-grid">
        <MlSpotlight class="fx-spot fx-panel">
          <p class="ml-hud-label">Spotlight · CountUp</p>
          <p class="fx-big"><MlCountUp :value="1284000" prefix="NT$ " :start-on-view="false" :duration="600" /></p>
          <p class="fx-sub">本月營收 · 游標像手電筒照亮 HUD 格線</p>
        </MlSpotlight>
        <MlTilt class="fx-tilt">
          <MlCard variant="gold" eyebrow="Tilt" title="Alpha Pass">金屬板跟著游標傾斜，反光一起移動。</MlCard>
        </MlTilt>
        <MlBorderBeam tone="tech" :size="3" paused class="fx-beam">
          <MlCard eyebrow="BorderBeam" title="流光邊框">一道光沿著切角邊框繞行。</MlCard>
        </MlBorderBeam>
        <div class="fx-panel fx-decrypt">
          <p class="ml-hud-label">DecryptText</p>
          <p class="fx-code"><MlDecryptText text="ACCESS GRANTED · WELCOME ALPHA" trigger="mount" :duration="9000" /></p>
          <div class="fx-burst">
            <MlPawBurst :count="22" :power="150"><MlButton stamp>按讚 · PawBurst</MlButton></MlPawBurst>
          </div>
        </div>
      </div>
      <MlMarquee class="fx-marquee" :speed="0.0001" label="技術">
        <MlTag v-for="t in ['Vue 3', 'TypeScript', 'Vite', 'Vitest', 'Pinia', 'Nuxt', 'Playwright', 'CSS Variables']" :key="t" tone="steel" variant="outline">{{ t }}</MlTag>
      </MlMarquee>
    </section>

    <!-- ───────────── Workspace (v0.6) ───────────── -->
    <section data-shot="workspace" class="shot">
      <header class="shot__head">
        <div>
          <p class="shot__kicker">16 // Workspace</p>
          <h2 class="shot__title">選單、折線圖與描述清單</h2>
        </div>
        <span class="shot__brand"><MlMascot :size="30" frame="ring" title="" />MALILION<b>UI</b></span>
      </header>
      <div class="v6-work">
        <MlMenu model-value="envs" :open-keys="['deploy']" :items="v6Menu" class="v6-menu" />
        <div class="stack stack--loose">
          <MlCard eyebrow="Traffic" title="本週流量">
            <MlLineChart :series="v6Series" :labels="v6Labels" :height="190" dots />
          </MlCard>
          <MlDescriptions title="部署資訊" :items="v6Desc" />
        </div>
      </div>
    </section>

    <!-- ───────────── Inputs (v0.6) ───────────── -->
    <section data-shot="inputs" class="shot">
      <header class="shot__head">
        <div>
          <p class="shot__kicker">17 // Inputs</p>
          <h2 class="shot__title">日期區間、級聯、標籤與驗證碼</h2>
        </div>
        <span class="shot__brand"><MlMascot :size="30" frame="ring" title="" />MALILION<b>UI</b></span>
      </header>
      <div class="v6-inputs">
        <div class="stack stack--loose">
          <MlDateRangePicker :model-value="v6Range" index="01" label="報表區間" />
          <div class="open-cascader">
            <MlCascader :model-value="['taipei', 'daan']" :options="v6Areas" index="02" label="縣市 / 區域" />
          </div>
        </div>
        <div class="stack stack--loose">
          <MlTagInput :model-value="['Vue', 'TypeScript', 'Vite']" index="03" label="技術標籤" :max="5" />
          <MlTreeSelect :model-value="['users', 'read-users', 'write-users', 'repos']" :data="v6Tree" index="04" label="Token 權限" multiple />
          <MlPinInput model-value="2846" label="簡訊驗證碼" :group-size="3" />
        </div>
      </div>
    </section>

    <!-- ───────────── Brand moments (v0.6) ───────────── -->
    <section data-shot="brand" class="shot">
      <header class="shot__head">
        <div>
          <p class="shot__kicker">18 // Brand moments</p>
          <h2 class="shot__title">⌘K、404、QR Code 與倒數</h2>
        </div>
        <span class="shot__brand"><MlMascot :size="30" frame="ring" title="" />MALILION<b>UI</b></span>
      </header>
      <div class="v6-brand">
        <!-- The palette is pure CSS classes, so it can be shown in place for the capture -->
        <div class="ml-cmd__panel v6-cmd">
          <div class="ml-cmd__search">
            <MlIcon name="search" class="ml-cmd__search-icon" />
            <span class="ml-cmd__input v6-cmd__q">開設</span>
            <MlKbd>Esc</MlKbd>
          </div>
          <div class="ml-cmd__list">
            <p class="ml-cmd__group">指令</p>
            <div v-for="(c, i) in v6Commands" :key="c.label" :class="['ml-cmd__item', { 'ml-cmd__item--active': i === 1 }]">
              <MlIcon :name="c.icon" class="ml-cmd__icon" />
              <span class="ml-cmd__label">
                <template v-for="(ch, k) in [...c.label]" :key="k">
                  <mark v-if="i === 1 && (k === 0 || k === 2)" class="ml-cmd__hit">{{ ch }}</mark>
                  <template v-else>{{ ch }}</template>
                </template>
              </span>
              <span class="ml-cmd__shortcut">{{ c.shortcut }}</span>
            </div>
          </div>
          <footer class="ml-cmd__foot">
            <span><MlKbd>↑</MlKbd><MlKbd>↓</MlKbd> 移動</span>
            <span><MlKbd>Enter</MlKbd> 執行</span>
            <span class="ml-cmd__brand"><MlPaw tone="current" /> Malilion</span>
          </footer>
        </div>
        <MlResult status="404" class="v6-404">
          <template #actions><MlButton size="sm" stamp>帶我回家</MlButton></template>
        </MlResult>
        <div class="stack v6-side">
          <MlQRCode value="https://malilion.github.io/MalilionUI/" logo="paw" :size="150">掃我看文件</MlQRCode>
          <p class="ml-hud-label">新版倒數</p>
          <MlCountdown :to="v6Deadline" :units="['days', 'hours', 'minutes']" paused />
          <p class="v6-paw-font ml-font-paw">hi, i'm malilion! jiji… &#xE000;</p>
        </div>
      </div>
    </section>

    <!-- ───────────── Dev kit (v0.7) ───────────── -->
    <section data-shot="devkit" class="shot">
      <header class="shot__head">
        <div>
          <p class="shot__kicker">19 // Dev kit</p>
          <h2 class="shot__title">熱力圖、儀表、雷達、程式碼與聊天</h2>
        </div>
        <span class="shot__brand"><MlMascot :size="30" frame="ring" title="" />MALILION<b>UI</b></span>
      </header>
      <div class="v7-grid">
        <MlCard eyebrow="Contributions" title="提交紀錄" class="v7-heat">
          <MlHeatmap :data="v7Heat" :end="v7Today" :weeks="36" cell="paw" />
        </MlCard>
        <MlCard eyebrow="Gauge" title="系統負載" class="v7-gauges">
          <div class="row">
            <MlGauge :value="64" unit="%" label="CPU" :size="170" :bands="[{ from: 0, tone: 'success' }, { from: 70, tone: 'gold' }, { from: 90, tone: 'danger' }]" />
            <MlGauge :value="182" :max="300" unit="ms" label="延遲" tone="tech" :size="170" />
          </div>
        </MlCard>
        <MlCard eyebrow="Radar" title="能力值" class="v7-radar">
          <MlRadarChart :indicators="v7Radar" :series="v7Series" :size="300" />
        </MlCard>
        <div class="stack v7-side">
          <MlCodeBlock :code="v7Code" lang="ts" filename="main.ts" line-numbers :highlight="[4]" />
          <MlChat :height="250" class="v7-chat">
            <MlChatMessage role="user" name="你" content="可以換成英文嗎？" time="10:03" />
            <MlChatMessage role="assistant" name="碼力獅" content="可以！0.7 起內建多語系 🐾" time="10:03" />
            <MlChatMessage role="assistant" name="碼力獅" typing />
          </MlChat>
        </div>
      </div>
    </section>

    <!-- ───────────── Taiwan (v0.14) ───────────── -->
    <section data-shot="taiwan" class="shot">
      <header class="shot__head">
        <div>
          <p class="shot__kicker">20 // Built for Taiwan</p>
          <h2 class="shot__title">民國年、手機條碼、注音與地址</h2>
        </div>
        <span class="shot__brand"><MlMascot :size="30" frame="ring" title="" />MALILION<b>UI</b></span>
      </header>
      <div class="v14-tw">
        <div class="stack">
          <MlCalendar :model-value="v14Day" calendar="roc" />
          <MlDatePicker :model-value="v14Day" label="出生日期" calendar="roc" />
        </div>
        <div class="stack">
          <MlCard eyebrow="E-invoice carrier" title="手機條碼載具" class="v14-card">
            <div class="v14-center"><MlBarcode value="/ABC+123" format="code39" :height="64" /></div>
          </MlCard>
          <MlBarcode value="4710088430120" format="ean13" :module="1.6" :height="52">EAN-13 · 471 台灣商品</MlBarcode>
          <div class="v14-masks">
            <MlInputMask :model-value="'0912345678'" preset="mobile" label="手機" />
            <MlInputMask :model-value="'A123456789'" preset="id" label="身分證" />
          </div>
        </div>
        <div class="stack">
          <div class="v14-poem">
            <p class="v14-poem__title"><MlZhuyin text="靜夜思" zhuyin="ㄐㄧㄥˋ ㄧㄝˋ ㄙ" /></p>
            <p v-for="[text, zy] in v14Poem" :key="text"><MlZhuyin :text="text" :zhuyin="zy" /></p>
          </div>
          <MlTaiwanAddress :model-value="v14Address" label="收件地址" />
        </div>
      </div>
    </section>

    <!-- ───────────── Workflow (v0.14) ───────────── -->
    <section data-shot="workflow" class="shot">
      <header class="shot__head">
        <div>
          <p class="shot__kicker">21 // Lists, data &amp; workflow</p>
          <h2 class="shot__title">索引列、行程表、頭像群組與瀑布圖</h2>
        </div>
        <span class="shot__brand"><MlMascot :size="30" frame="ring" title="" />MALILION<b>UI</b></span>
      </header>
      <div class="v14-flow">
        <MlIndexBar :items="v14Contacts" :height="470" />
        <MlScheduler :events="v14Events" :date="v14Day" :now="v14Now" :start-hour="8" :end-hour="18" :height="470" :scroll-to-hour="9" />
        <div class="stack">
          <MlCard eyebrow="Team" title="專案成員" class="v14-card">
            <MlAvatarGroup :items="v14Team" :max="5" :total="32" />
            <p class="v14-type">
              <MlText tone="dim">部署代號</MlText> <MlText mono copyable>LION-0014</MlText>
            </p>
          </MlCard>
          <MlCard eyebrow="Waterfall" title="本季損益（萬元）" class="v14-card">
            <MlWaterfallChart :data="v14Waterfall" :height="210" :show-values="false" />
          </MlCard>
        </div>
      </div>
    </section>

    <section data-shot="admin" class="shot">
      <header class="shot__head">
        <div>
          <p class="shot__kicker">22 // Back-office kit</p>
          <h2 class="shot__title">CRUD 表格、分步表單與工具列</h2>
        </div>
        <span class="shot__brand"><MlMascot :size="30" frame="ring" title="" />MALILION<b>UI</b></span>
      </header>
      <div class="v15-admin">
        <MlProTable
          v-model:selected="v15Selected"
          title="獅群成員"
          :columns="v15Columns"
          :data="v15Members"
          :page-size="7"
          :page-sizes="[7]"
          :on-create="() => {}"
          :on-update="() => {}"
          :on-delete="() => {}"
          dense
        />
        <div class="stack">
          <MlCard eyebrow="Wizard" title="商家開通" class="v14-card">
            <MlWizard v-model="v15Model" :steps="v15Steps" label="商家開通" />
          </MlCard>
          <MlCard eyebrow="Toolbar" title="工具列與搜尋" class="v14-card">
            <div class="stack">
              <MlButtonGroup size="sm" variant="outline" label="分頁">
                <MlButton>上一頁</MlButton>
                <MlButton variant="primary">2</MlButton>
                <MlButton>下一頁</MlButton>
              </MlButtonGroup>
              <MlToggleGroup v-model="v15Format" :options="v15Formats" multiple size="sm" label="文字格式" />
              <p class="v15-hit"><MlHighlight text="碼力獅 MalilionUI：金屬質感的獅子元件庫" :keywords="['獅子', 'ｍａｌｉｌｉｏｎ']" /></p>
            </div>
          </MlCard>
        </div>
      </div>
    </section>

    <div data-shot="logo" class="logo-shot">
      <MlMascot :size="132" frame="ring" title="碼力獅" />
    </div>

    <!-- ───────────── Themes ───────────── -->
    <section data-shot="themes" class="shot shot--themes">
      <div
        v-for="theme in themes"
        :key="theme.id"
        :data-ml-theme="theme.id"
        class="ml-app theme-half"
      >
        <p class="shot__kicker">{{ theme.name }} · {{ theme.zh }}</p>
        <MlCard :variant="theme.id === 'dark' ? 'gold' : 'plate'" eyebrow="Pride / 01" title="獅群儀表板" rivets>
          <div class="stack">
            <MlInput index="01" label="Callsign" model-value="MALI-LION" />
            <MlProgress :value="68" label="Mane Power" paw />
            <div class="row">
              <MlSwitch :model-value="true" label="推播" />
              <MlCheckbox paw :model-value="true" label="點心" />
              <MlBadge tone="bean" paw>Cute</MlBadge>
            </div>
          </div>
          <template #footer>
            <MlButton size="sm" variant="ghost">稍後</MlButton>
            <MlButton size="sm" variant="outline">設定</MlButton>
            <MlButton size="sm">進入</MlButton>
          </template>
        </MlCard>
      </div>
    </section>
  </div>
</template>

<style>
body {
  margin: 0;
  background: #030406;
}

.shots {
  display: grid;
  justify-content: center;
  gap: 40px;
  padding: 40px;
}

.shot {
  position: relative;
  width: 1200px;
  box-sizing: border-box;
  padding: 44px 48px 48px;
  overflow: hidden;
  color: var(--ml-text);
  font-family: var(--ml-font-body);
  background:
    radial-gradient(ellipse 55% 45% at 8% -10%, rgb(240 173 47 / 0.16), transparent 70%),
    radial-gradient(ellipse 45% 40% at 96% 0%, rgb(62 238 208 / 0.08), transparent 70%),
    linear-gradient(rgb(240 173 47 / 0.035) 1px, transparent 1px) 0 0 / 48px 48px,
    linear-gradient(90deg, rgb(240 173 47 / 0.035) 1px, transparent 1px) 0 0 / 48px 48px,
    var(--ml-bg);
  box-shadow: inset 0 0 0 1px var(--ml-line);
}

.shot__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 30px;
}

.shot__kicker {
  margin: 0 0 6px;
  color: var(--ml-accent-text);
  font-family: var(--ml-font-mono);
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.shot__title {
  margin: 0;
  font-family: var(--ml-font-display);
  font-size: 30px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.shot__brand {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--ml-text-muted);
  font-family: var(--ml-font-display);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.16em;
}

.shot__brand b {
  margin-left: -4px;
  color: var(--ml-accent-text);
}

.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
}

.row--top {
  align-items: flex-start;
}

.stack {
  display: grid;
  gap: 14px;
  align-content: start;
}

.stack--loose {
  gap: 22px;
}

.stack > .ml-hud-label {
  margin: 8px 0 -2px;
}

.grid-2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 28px;
}

.grid-2--tight {
  gap: 16px;
}

.grid-3 {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 28px;
}

.copy {
  margin: 0;
  color: var(--ml-text-muted);
}

.who {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

/* Freeze looping animations at a pleasing frame so captures are deterministic */
.shot .ml-loader__step {
  animation: none;
  opacity: calc(0.3 + var(--i) * 0.23);
}

.shot .hero__trail .ml-paw {
  animation: none;
}

/* ── Hero ── */
.shot--hero {
  display: grid;
  grid-template-columns: 420px 1fr;
  align-items: center;
  gap: 40px;
  padding: 56px 64px;
}

.hero__emblem {
  position: relative;
  display: grid;
  place-items: center;
  height: 360px;
}

.hero__halo {
  position: absolute;
  width: 340px;
  height: 340px;
  border-radius: 50%;
  border: 1px solid var(--ml-line);
}

.hero__halo::before,
.hero__halo::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  border: 2px solid transparent;
}

.hero__halo::before {
  inset: -1px;
  border-top-color: var(--ml-accent);
  border-right-color: rgb(240 173 47 / 0.25);
  filter: drop-shadow(0 0 6px rgb(240 173 47 / 0.7));
  rotate: -30deg;
}

.hero__halo::after {
  inset: 22px;
  border-width: 1px;
  border-bottom-color: var(--ml-tech);
  border-left-color: rgb(62 238 208 / 0.25);
  rotate: 20deg;
}

.hero__trail {
  position: absolute;
  left: -6px;
  bottom: 8px;
  display: flex;
  gap: 10px;
  rotate: -20deg;
}

.hero__trail .ml-paw {
  width: 20px;
  height: 20px;
  rotate: 90deg;
}

.hero__trail .ml-paw:nth-child(odd) { translate: 0 -7px; }
.hero__trail .ml-paw:nth-child(even) { translate: 0 7px; }
.hero__trail .ml-paw:nth-child(1) { opacity: 0.3; }
.hero__trail .ml-paw:nth-child(2) { opacity: 0.5; }
.hero__trail .ml-paw:nth-child(3) { opacity: 0.7; }
.hero__trail .ml-paw:nth-child(4) { opacity: 0.85; }

.hero__kicker {
  margin: 0 0 14px;
  color: var(--ml-accent-text);
}

.hero__title {
  display: flex;
  gap: 20px;
  margin: 0;
  font-family: var(--ml-font-display);
  font-size: 96px;
  font-weight: 700;
  line-height: 0.95;
  letter-spacing: 0.04em;
}

.hero__lead {
  margin: 22px 0 30px;
  color: var(--ml-text-muted);
  font-size: 18px;
  line-height: 1.9;
}

.hero__lead strong {
  color: var(--ml-accent-text);
}

.hero__lead strong.bean {
  color: var(--ml-bean-300);
}

.hero__badges {
  margin-top: 22px;
}

/* ── Stamp illustration ── */
.stamp-demo {
  position: relative;
  display: inline-flex;
}

.stamp-demo__paw {
  position: absolute;
  top: -16px;
  right: -14px;
  width: 26px;
  height: 26px;
  rotate: 18deg;
  filter: drop-shadow(0 0 8px rgb(240 173 47 / 0.8));
}

.stamp-demo--big .stamp-demo__paw {
  top: -22px;
  right: -18px;
  width: 34px;
  height: 34px;
  filter: drop-shadow(0 0 10px rgb(255 143 168 / 0.8));
}

/* ── Feedback ── */
.loaders {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 22px 16px;
  background: var(--ml-scanlines);
  box-shadow: inset 0 0 0 1px var(--ml-line);
}

.toasts {
  align-self: end;
}

/* ── Navigation: leave room for the open menu ── */
.shot--nav .grid-2 {
  min-height: 330px;
}

.log {
  margin: 0;
  color: var(--ml-tech-text);
  font-family: var(--ml-font-mono);
  font-size: 13px;
  line-height: 1.8;
}

/* ── Modal: keep the console inside the panel ── */
.shot--modal {
  height: 600px;
  padding: 40px 48px;
}

.modal-backdrop-content {
  display: grid;
  gap: 24px;
}

.shot--modal .ml-modal {
  position: absolute;
}

.modal-progress {
  margin-top: 18px;
}

/* ── Paw ── */
.paw-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 0 12px 6px;
}

.paw-row figure {
  display: grid;
  justify-items: center;
  gap: 12px;
  margin: 0;
}

.paw-row figcaption {
  color: var(--ml-text-dim);
  font-family: var(--ml-font-mono);
  font-size: 12px;
}

.paw-row__stamp {
  padding-bottom: 0;
}

/* ── Charts / kit ── */
.spark-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin: 6px 0 2px;
}

.big {
  font-family: var(--ml-font-display);
  font-size: 30px;
}

.up {
  color: var(--ml-success-text);
  font-family: var(--ml-font-mono);
  font-size: 12px;
}

.charts-row {
  display: grid;
  grid-template-columns: 1.3fr 1.2fr 0.8fr;
  gap: 20px;
}

.ring-box {
  display: grid;
  place-items: center;
  padding-top: 6px;
}

.kit {
  display: grid;
  grid-template-columns: 1.25fr 1fr;
  gap: 32px;
}

.kbd-row {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--ml-text-muted);
}

.logo-shot {
  justify-self: start;
  padding: 6px;
}

.hero__lion {
  position: relative;
  z-index: 1;
}

/* ── Calendar / mobile ── */
.cal-row {
  display: grid;
  grid-template-columns: 300px 300px 1fr;
  gap: 28px;
  align-items: start;
}

.phone-row {
  display: flex;
  justify-content: space-between;
}

.m-welcome,
.m-cta {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 16px 16px 28px;
  text-align: center;
}

.m-welcome h3 {
  margin: 2px 0 0;
  font-family: var(--ml-font-display);
  font-size: 24px;
}

.m-welcome p {
  margin: 0 0 6px;
  color: var(--ml-text-muted);
  font-size: 13px;
}

.m-cta {
  justify-items: start;
  text-align: left;
}

.m-cta .ml-mascot {
  justify-self: center;
}

.m-cta h3 {
  margin: 0 0 6px;
  font-family: var(--ml-font-display);
  font-size: 28px;
  line-height: 1.1;
}

.m-pad {
  display: grid;
  gap: 12px;
  padding: 0 12px 12px;
}

/* ── Themes: two halves, each its own theme ── */
.shot--themes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 0;
}

.theme-half {
  min-height: 0;
  padding: 40px 44px 44px;
}

.theme-half .shot__kicker {
  margin-bottom: 18px;
}
/* v0.5 panels */
.v5-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 28px;
  align-items: start;
}

.v5-spacer {
  height: 150px;
}

.v5-spacer--tall {
  height: 300px;
}

.shot--overlays {
  min-height: 560px;
}

.v5-overlays {
  max-width: 620px;
}

.v5-pops {
  gap: 200px;
  min-height: 260px;
  padding-left: 90px;
}

.v5-line {
  margin: 0 0 10px;
}

.v5-skel {
  max-width: 520px;
}

/* Keep the drawer inside the panel, docked right, without dimming the rest */
.shot--overlays .ml-drawer {
  position: absolute;
  inset: 0 0 0 auto;
}

.shot--overlays .ml-drawer__backdrop {
  display: none;
}

.v5-structure {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  align-items: start;
}

.v5-transfer {
  grid-column: 1 / -1;
}

.v5-media {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 28px;
  align-items: start;
}

.v5-slide {
  display: grid;
  align-content: center;
  height: 100%;
  padding: 0 56px;
  background: radial-gradient(80% 120% at 20% 0%, rgb(240 173 47 / 0.32), transparent 60%), #0b0e14;
  color: #efe8d8;
}

.v5-slide h3 {
  margin: 4px 0;
  font-family: var(--ml-font-display);
  font-size: 30px;
}

.v5-slide p:last-child {
  margin: 0;
  opacity: 0.8;
}

.v5-wm p {
  margin: 0 0 8px;
}

.v5-backtop {
  position: relative;
  display: flex;
  align-items: center;
  gap: 18px;
  min-height: 60px;
}

.v5-backtop .ml-backtop {
  position: relative;
}
/* v0.6 effects panel */
.fx-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 24px;
}

.fx-panel {
  padding: 24px 26px;
  background: var(--ml-surface);
  box-shadow: inset 0 0 0 1px var(--ml-line);
}

.fx-big {
  margin: 8px 0 4px;
  color: var(--ml-accent-text);
  font-family: var(--ml-font-display);
  font-size: 40px;
  font-weight: 700;
}

.fx-sub {
  margin: 0;
  color: var(--ml-text-muted);
}

.fx-beam {
  display: block;
  align-self: start;
}

.fx-code {
  margin: 10px 0 22px;
  color: var(--ml-text);
  font-family: var(--ml-font-mono);
  font-size: 22px;
  letter-spacing: 0.06em;
}

.fx-marquee {
  margin-top: 26px;
}
/* v0.7 panel */
/* v0.14 */
.v14-tw {
  display: grid;
  grid-template-columns: 330px 1fr 1fr;
  gap: 26px;
  align-items: start;
}

.v14-card {
  min-width: 0;
}

.v14-center {
  display: grid;
  justify-items: center;
}

.v14-masks {
  display: grid;
  gap: 14px;
}

.v14-poem {
  font-size: 2rem;
  line-height: 2;
}

.v14-poem p {
  margin: 0;
}

.v14-poem__title {
  color: var(--ml-accent-text);
  font-weight: 700;
}

.v14-flow {
  display: grid;
  grid-template-columns: 250px 1fr 270px;
  gap: 22px;
  align-items: start;
}

.v14-type {
  margin: 14px 0 0;
}

.v15-admin {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 22px;
  align-items: start;
}

.v15-hit {
  margin: 0;
  color: var(--ml-text-muted);
}

.v7-grid {
  display: grid;
  grid-template-columns: 1.25fr 1fr;
  gap: 22px;
}

.v7-heat,
.v7-radar {
  min-width: 0;
}

.v7-radar .ml-radar {
  display: grid;
  justify-items: center;
}

.v7-chat .ml-chat__log {
  gap: 10px;
  padding: 12px;
}

/* v0.6 panels */
.hero__paw {
  margin: 10px 0 -6px;
  color: var(--ml-accent-text);
  font-size: 24px;
}

.v6-work {
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 28px;
}

.v6-menu {
  padding: 8px;
  background: var(--ml-brushed), var(--ml-surface);
  box-shadow: inset 0 0 0 1px var(--ml-line-steel);
}

.v6-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
  min-height: 330px;
}

.v6-brand {
  display: grid;
  grid-template-columns: 1.15fr 1fr 220px;
  gap: 24px;
  align-items: start;
}

.v6-cmd {
  max-height: none;
}

.v6-cmd__q {
  display: flex;
  align-items: center;
  height: 58px;
}

.v6-404 {
  padding: 0;
}

.v6-404 .ml-result__code {
  font-size: 92px;
}

.v6-404 .ml-result__lion {
  margin-top: -6px;
}

.v6-side {
  justify-items: start;
}

.v6-paw-font {
  margin: 6px 0 0;
  color: var(--ml-accent-text);
  font-size: 20px;
}
</style>
