<script setup lang="ts">
import { ref } from 'vue'
import type { MlAvatarStatus, MlTableSort } from '@malilion/ui'
import MlToastCard from '../src/components/MlToastCard.vue'
import type { MlToastItem } from '../src/toast'

// Fixed compositions for the README screenshots (scripts/screenshots.mjs).
// Every panel is a [data-shot] element captured on its own.

const mailIcon = 'M3 6h18v12H3zM3 6l9 7 9-7'

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
          <MlBadge paw>48 Components</MlBadge>
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
</style>
