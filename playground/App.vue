<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import type { MlTabItem } from '@malilion/ui'
import DemoSection from './DemoSection.vue'

/* ── Theme ─────────────────────────────────────────────── */
const daylight = ref(false)
watch(daylight, (on) => {
  document.documentElement.dataset.mlTheme = on ? 'light' : 'dark'
})

const nav = [
  { id: 'tokens', label: 'Tokens' },
  { id: 'buttons', label: 'Button' },
  { id: 'cards', label: 'Card' },
  { id: 'forms', label: 'Form' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'display', label: 'Display' },
  { id: 'navigation', label: 'Tabs' },
  { id: 'overlay', label: 'Modal' },
]

/* ── Tokens ────────────────────────────────────────────── */
const scales = [
  { name: 'Lion Gold', prefix: 'gold', steps: [100, 200, 300, 400, 500, 600, 700, 800] },
  { name: 'Titanium', prefix: 'steel', steps: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { name: 'Circuit Cyan', prefix: 'cyan', steps: [200, 300, 400, 500, 600, 700] },
  { name: 'Mane Bronze', prefix: 'bronze', steps: [300, 400, 500, 600] },
]
const metals = ['gold', 'steel', 'bronze', 'cyan', 'red', 'gunmetal']

/* ── Form demo ─────────────────────────────────────────── */
const email = ref('')
const callsign = ref('MALI-LION')
const role = ref<string | number>()
const bio = ref('')
const notify = ref(true)
const turbo = ref(false)
const agree = ref(true)
const newsletter = ref(false)
const roles: { value: string; label: string }[] = [
  { value: 'alpha', label: 'Alpha — 獅群領袖' },
  { value: 'hunter', label: 'Hunter — 前線開發' },
  { value: 'scout', label: 'Scout — 探索研究' },
]
const emailError = ref('')
function validateEmail() {
  emailError.value = email.value && !email.value.includes('@') ? '信箱格式不正確，少了 @' : ''
}

/* ── Feedback demo ─────────────────────────────────────── */
const charge = ref(64)
const charging = ref(false)
let chargeTimer: ReturnType<typeof setInterval> | undefined
function runCharge() {
  if (charging.value) return
  charging.value = true
  charge.value = 0
  chargeTimer = setInterval(() => {
    charge.value = Math.min(100, charge.value + Math.ceil(Math.random() * 9))
    if (charge.value >= 100) {
      clearInterval(chargeTimer)
      charging.value = false
    }
  }, 160)
}
onBeforeUnmount(() => clearInterval(chargeTimer))

/* ── Tabs demo ─────────────────────────────────────────── */
const tabItems: MlTabItem[] = [
  { value: 'overview', label: '總覽' },
  { value: 'pride', label: '獅群' },
  { value: 'logs', label: '日誌' },
  { value: 'locked', label: '鎖定', disabled: true },
]
const lineTab = ref('overview')
const plateTab = ref('week')
const plateItems: MlTabItem[] = [
  { value: 'day', label: '日' },
  { value: 'week', label: '週' },
  { value: 'month', label: '月' },
  { value: 'year', label: '年' },
]

/* ── Modal demo ────────────────────────────────────────── */
const modalOpen = ref(false)
const dangerOpen = ref(false)
const deploying = ref(false)
function deploy(close: () => void) {
  deploying.value = true
  setTimeout(() => {
    deploying.value = false
    close()
  }, 1400)
}

/* ── Code snippets ─────────────────────────────────────── */
const code = {
  install: `npm i @malilion/ui`,
  buttons: `
<MlButton>主要行動</MlButton>
<MlButton variant="steel">鈦金屬</MlButton>
<MlButton variant="outline">外框</MlButton>
<MlButton variant="tech">科技</MlButton>
<MlButton variant="danger">刪除</MlButton>
<MlButton loading>部署中</MlButton>`,
  cards: `
<MlCard eyebrow="Pride / 01" title="獅群儀表板" rivets>
  內容……
  <template #footer>
    <MlButton size="sm">進入</MlButton>
  </template>
</MlCard>`,
  forms: `
<MlInput v-model="email" index="01" label="Email" :error="emailError" />
<MlSelect v-model="role" :options="roles" placeholder="選擇角色" />
<MlSwitch v-model="notify" label="推播通知" show-state />
<MlCheckbox v-model="agree" label="我同意獅群公約" />`,
  feedback: `
<MlAlert tone="success" title="部署完成">版本 v0.1.0 已上線。</MlAlert>
<MlProgress :value="64" label="Mane Reactor" />
<MlProgress label="同步中" tone="tech" />   <!-- 不給 value = 不確定進度 -->
<MlLoader label="Roaring" />`,
  display: `
<MlBadge tone="success" pulse>Online</MlBadge>
<MlAvatar name="碼力獅" status="online" size="lg" />
<MlStat label="今日部署" :value="128" :delta="12.4" caption="vs 昨日" />
<MlTooltip content="獅子的科技之眼"><MlButton>Hover</MlButton></MlTooltip>`,
  tabs: `
<MlTabs v-model="tab" :items="items">
  <template #overview>總覽內容</template>
  <template #pride>獅群內容</template>
</MlTabs>
<MlTabs v-model="range" :items="ranges" variant="plate" />`,
  modal: `
<MlModal v-model:open="open" eyebrow="Command" title="部署到正式站？">
  確定要把目前版本推上線嗎？
  <template #footer="{ close }">
    <MlButton variant="ghost" @click="close">取消</MlButton>
    <MlButton @click="deploy">確認部署</MlButton>
  </template>
</MlModal>`,
}
</script>

<template>
  <!-- ── Top bar ─────────────────────────────────────────── -->
  <header class="topbar">
    <div class="topbar__inner">
      <a href="#top" class="brand">
        <MlLionMark :size="34" />
        <span class="brand__name">MALILION<span class="brand__ui">UI</span></span>
        <MlBadge tone="steel">v0.1</MlBadge>
      </a>
      <nav class="topnav" aria-label="元件分類">
        <a v-for="item in nav" :key="item.id" :href="`#${item.id}`">{{ item.label }}</a>
      </nav>
      <MlSwitch v-model="daylight" tone="tech" label="日光模式" class="theme-switch" />
    </div>
  </header>

  <main id="top" class="page">
    <!-- ── Hero ──────────────────────────────────────────── -->
    <section class="hero">
      <div class="hero__copy">
        <p class="ml-hud-label hero__kicker">碼力獅 Design System · Vue 3</p>
        <h1 class="hero__title">
          <span class="ml-metal-text">MALILION</span>
          <span class="hero__title-ui ml-metal-text ml-metal-text--steel">UI</span>
        </h1>
        <p class="hero__lead">
          以<strong>獅子</strong>為魂、<strong>科技</strong>為骨、<strong>金屬</strong>為甲。
          切角機甲板、拋光獅金、鈦合金與電路青光——為碼力獅打造的專屬元件庫。
        </p>
        <div class="hero__actions">
          <MlButton size="lg" href="#buttons">開始探索</MlButton>
          <MlButton size="lg" variant="outline" href="#tokens">設計代幣</MlButton>
        </div>
        <div class="install">
          <span class="install__prompt">$</span>
          <code>{{ code.install }}</code>
        </div>
      </div>
      <div class="hero__emblem">
        <div class="hero__halo" aria-hidden="true" />
        <MlLionMark :size="260" glow animated title="碼力獅徽章" />
      </div>
    </section>

    <div class="hero-stats">
      <MlStat label="Components" :value="20" caption="Vue 3 · TypeScript" />
      <MlStat label="Themes" :value="2" caption="Night Pride / Daylight" />
      <MlStat label="Bundle" value="10" unit="KB gz" caption="JS，不含 Vue" />
      <MlStat label="Runtime deps" :value="0" caption="Peer：Vue 3.5+" />
    </div>

    <!-- ── Tokens ────────────────────────────────────────── -->
    <DemoSection id="tokens" index="00" title="Design Tokens" subtitle="色票、金屬漸層與字體。全部以 --ml-* CSS 變數提供，React / 原生網頁也能用。">
      <div class="scales">
        <div v-for="scale in scales" :key="scale.prefix" class="scale">
          <p class="ml-hud-label">{{ scale.name }}</p>
          <div class="scale__row">
            <div
              v-for="step in scale.steps"
              :key="step"
              class="swatch"
              :style="{ background: `var(--ml-${scale.prefix}-${step})` }"
              :title="`--ml-${scale.prefix}-${step}`"
            >
              <span :class="step >= 500 ? 'swatch__label swatch__label--light' : 'swatch__label'">{{ step }}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="metals">
        <div v-for="metal in metals" :key="metal" class="metal">
          <div class="metal__plate" :style="{ background: `var(--ml-metal-${metal})` }" />
          <code class="metal__name">--ml-metal-{{ metal }}</code>
        </div>
      </div>
      <div class="type-specimen">
        <div>
          <p class="ml-hud-label">Display · Chakra Petch</p>
          <p class="type-specimen__display">ROAR OF CODE 獅吼</p>
        </div>
        <div>
          <p class="ml-hud-label">Body · IBM Plex Sans / Noto Sans TC</p>
          <p class="type-specimen__body">每一行程式碼，都是獅群的一次狩獵。</p>
        </div>
        <div>
          <p class="ml-hud-label">Mono · JetBrains Mono</p>
          <p class="type-specimen__mono">const pride = await lion.roar()</p>
        </div>
      </div>
    </DemoSection>

    <MlDivider claw />

    <!-- ── Buttons ───────────────────────────────────────── -->
    <DemoSection id="buttons" index="01" title="Button 按鈕" subtitle="切角金屬板，滑過時有一道拋光反光掃過。" :code="code.buttons">
      <div class="demo-panel">
        <p class="ml-hud-label">Variants</p>
        <div class="row">
          <MlButton>主要行動</MlButton>
          <MlButton variant="steel">鈦金屬</MlButton>
          <MlButton variant="outline">外框</MlButton>
          <MlButton variant="tech">科技</MlButton>
          <MlButton variant="ghost">幽靈</MlButton>
          <MlButton variant="danger">刪除</MlButton>
        </div>
        <p class="ml-hud-label">Sizes</p>
        <div class="row row--center">
          <MlButton size="sm">Small</MlButton>
          <MlButton>Medium</MlButton>
          <MlButton size="lg">Large</MlButton>
        </div>
        <p class="ml-hud-label">States</p>
        <div class="row row--center">
          <MlButton loading>部署中</MlButton>
          <MlButton variant="outline" loading>同步中</MlButton>
          <MlButton disabled>已停用</MlButton>
          <MlButton variant="tech">
            <template #prefix>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></svg>
            </template>
            Boost
          </MlButton>
          <MlTooltip content="新增（僅圖示按鈕記得加 aria-label）">
            <MlButton square variant="steel" aria-label="新增">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 5v14M5 12h14" /></svg>
            </MlButton>
          </MlTooltip>
        </div>
      </div>
    </DemoSection>

    <!-- ── Cards ─────────────────────────────────────────── -->
    <DemoSection id="cards" index="02" title="Card 卡片" subtitle="拉絲裝甲板。plate / gold / steel / tech 四種外殼，可選鉚釘。" :code="code.cards">
      <div class="grid grid--3">
        <MlCard eyebrow="Pride / 01" title="獅群儀表板" rivets>
          即時掌握每位成員的開發節奏。拉絲金屬面板搭配斜切邊角，鉚釘固定在未切角的兩端。
          <template #footer>
            <MlButton size="sm" variant="ghost">稍後</MlButton>
            <MlButton size="sm">進入</MlButton>
          </template>
        </MlCard>
        <MlCard variant="gold" eyebrow="Premium" title="黃金獅鬃">
          金色拋光外框與頂部光暈，用在最重要的內容或付費方案。
          <div class="card-progress"><MlProgress :value="82" label="Mane Power" size="sm" /></div>
        </MlCard>
        <MlCard variant="tech" eyebrow="System" title="電路之眼" interactive tabindex="0">
          青色科技外殼，帶 interactive 屬性會浮起並發光，適合可點擊的卡片。
          <template #footer>
            <MlBadge tone="tech" pulse>Live</MlBadge>
          </template>
        </MlCard>
      </div>
    </DemoSection>

    <!-- ── Forms ─────────────────────────────────────────── -->
    <DemoSection id="forms" index="03" title="Form 表單" subtitle="HUD 風格欄位：聚焦時外框轉金，底部射出一道能量線。" :code="code.forms">
      <div class="grid grid--2">
        <MlCard title="成員登錄" eyebrow="Register">
          <form class="form" @submit.prevent>
            <MlInput
              v-model="email"
              index="01"
              label="Email"
              type="email"
              placeholder="lion@malilion.dev"
              autocomplete="email"
              :error="emailError"
              hint="試試輸入沒有 @ 的字串再離開欄位"
              required
              @blur="validateEmail"
            >
              <template #prefix>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18v12H3zM3 6l9 7 9-7" /></svg>
              </template>
            </MlInput>
            <MlInput v-model="callsign" index="02" label="代號 Callsign">
              <template #suffix>#0721</template>
            </MlInput>
            <MlSelect v-model="role" index="03" label="角色" :options="roles" placeholder="選擇你的角色" />
            <MlTextarea v-model="bio" index="04" label="自我介紹" placeholder="說說你的狩獵技能…" :rows="3" />
          </form>
        </MlCard>
        <MlCard title="控制面板" eyebrow="Controls">
          <div class="stack">
            <MlSwitch v-model="notify" label="推播通知" show-state />
            <MlSwitch v-model="turbo" tone="tech" label="Turbo 模式" show-state />
            <MlSwitch :model-value="false" label="停用的開關" disabled />
            <MlDivider />
            <MlCheckbox v-model="agree" label="我同意獅群公約" hint="包含程式碼審查與每週分享" />
            <MlCheckbox v-model="newsletter" label="訂閱碼力獅電子報" />
            <MlCheckbox :model-value="true" label="停用的選項" disabled />
          </div>
        </MlCard>
      </div>
    </DemoSection>

    <!-- ── Feedback ──────────────────────────────────────── -->
    <DemoSection id="feedback" index="04" title="Feedback 回饋" subtitle="警示、能量條與 Mane Reactor 載入器。警示角落有三道獅爪痕。" :code="code.feedback">
      <div class="grid grid--2">
        <div class="stack">
          <MlAlert title="系統訊息">新版獅群儀表板已推出，歡迎試用。</MlAlert>
          <MlAlert tone="success" title="部署完成" closable>版本 v0.1.0 已成功上線。</MlAlert>
          <MlAlert tone="warning" title="額度即將用盡">本月 API 額度剩下 12%。</MlAlert>
          <MlAlert tone="danger" title="建置失敗" closable>第 42 行有型別錯誤，請檢查後重新部署。</MlAlert>
        </div>
        <MlCard eyebrow="Telemetry" title="能量監控">
          <div class="stack">
            <MlProgress :value="charge" label="Mane Reactor" size="lg" />
            <MlProgress :value="72" label="CPU" tone="tech" />
            <MlProgress :value="38" label="記憶體" tone="success" smooth />
            <MlProgress :value="91" label="磁碟" tone="danger" striped />
            <MlProgress label="同步獅群資料" tone="tech" size="sm" />
            <div class="row row--center">
              <MlButton size="sm" variant="outline" :loading="charging" @click="runCharge">重新充能</MlButton>
            </div>
          </div>
        </MlCard>
      </div>
      <div class="loaders">
        <MlLoader />
        <MlLoader :size="64" label="Roaring" />
        <MlLoader :size="64" tone="tech" label="Syncing" />
        <MlLoader :size="28" />
      </div>
    </DemoSection>

    <!-- ── Display ───────────────────────────────────────── -->
    <DemoSection id="display" index="05" title="Display 資料展示" subtitle="徽章、六角頭像、HUD 數據與提示框。" :code="code.display">
      <div class="demo-panel">
        <p class="ml-hud-label">Badge</p>
        <div class="row row--center">
          <MlBadge>Gold</MlBadge>
          <MlBadge tone="steel">Steel</MlBadge>
          <MlBadge tone="tech" dot>Tech</MlBadge>
          <MlBadge tone="success" pulse>Online</MlBadge>
          <MlBadge tone="danger" dot>Error</MlBadge>
          <MlBadge solid>Alpha</MlBadge>
          <MlBadge solid tone="steel">Beta</MlBadge>
          <MlBadge solid tone="tech">New</MlBadge>
          <MlBadge solid tone="success">Pass</MlBadge>
          <MlBadge solid tone="danger">Fail</MlBadge>
        </div>
        <p class="ml-hud-label">Avatar</p>
        <div class="row row--center">
          <MlAvatar name="碼力獅" size="xl" status="online" />
          <MlAvatar name="Leo Nova" size="lg" ring="steel" status="away" />
          <MlAvatar name="Simba" ring="tech" status="busy" />
          <MlAvatar name="Nala Ray" size="sm" />
          <div class="ml-avatar-group">
            <MlAvatar name="A" size="sm" />
            <MlAvatar name="B" size="sm" ring="steel" />
            <MlAvatar name="C" size="sm" ring="tech" />
            <MlAvatar name="+4" size="sm" ring="steel" />
          </div>
        </div>
        <p class="ml-hud-label">Tooltip</p>
        <div class="row row--center">
          <MlTooltip content="上方提示" placement="top"><MlButton size="sm" variant="outline">Top</MlButton></MlTooltip>
          <MlTooltip content="下方提示" placement="bottom"><MlButton size="sm" variant="outline">Bottom</MlButton></MlTooltip>
          <MlTooltip content="左側提示" placement="left"><MlButton size="sm" variant="outline">Left</MlButton></MlTooltip>
          <MlTooltip content="右側提示" placement="right"><MlButton size="sm" variant="outline">Right</MlButton></MlTooltip>
        </div>
      </div>
      <div class="grid grid--4 stats">
        <MlStat label="今日部署" :value="128" :delta="12.4" caption="vs 昨日" />
        <MlStat label="平均回應" value="42" unit="ms" :delta="-8.1" caption="越低越好" />
        <MlStat label="獅群成員" value="2,048" :delta="0" caption="本週持平" />
        <MlStat label="可用率" value="99.98" unit="%" :delta="0.02" caption="過去 30 天" />
      </div>
    </DemoSection>

    <!-- ── Tabs ──────────────────────────────────────────── -->
    <DemoSection id="navigation" index="06" title="Tabs 分頁" subtitle="金色墨線或滑動金屬板。支援方向鍵、Home / End 鍵盤操作。" :code="code.tabs">
      <div class="grid grid--2">
        <MlCard>
          <MlTabs v-model="lineTab" :items="tabItems" label="獅群資訊">
            <template #overview>
              <p class="tab-copy">總覽：本週共完成 37 個任務，獅群士氣高昂。</p>
            </template>
            <template #pride>
              <div class="row row--center">
                <MlAvatar name="碼力獅" size="sm" status="online" />
                <MlAvatar name="Leo" size="sm" ring="steel" />
                <MlAvatar name="Nala" size="sm" ring="tech" />
                <span class="tab-copy">3 位成員在線</span>
              </div>
            </template>
            <template #logs>
              <pre class="log">[21:04] build ✓  12.4s
[21:05] test  ✓  148 passed
[21:06] deploy → production</pre>
            </template>
          </MlTabs>
        </MlCard>
        <MlCard>
          <div class="stack">
            <MlTabs v-model="plateTab" :items="plateItems" variant="plate" label="時間範圍" />
            <p class="tab-copy">目前範圍：<strong>{{ plateItems.find((i) => i.value === plateTab)?.label }}</strong></p>
          </div>
        </MlCard>
      </div>
    </DemoSection>

    <!-- ── Modal ─────────────────────────────────────────── -->
    <DemoSection id="overlay" index="07" title="Modal 對話框" subtitle="指揮台式對話框，開啟時由中線向上下展開。Esc / 點背景關閉，焦點鎖定在框內。" :code="code.modal">
      <div class="row">
        <MlButton @click="modalOpen = true">開啟對話框</MlButton>
        <MlButton variant="danger" @click="dangerOpen = true">危險操作</MlButton>
      </div>
    </DemoSection>

    <MlModal v-model:open="modalOpen" eyebrow="Command · Deploy" title="部署到正式站？">
      即將把 <strong>main</strong> 分支的最新版本推上 production。部署期間網站仍可正常瀏覽。
      <div class="modal-progress"><MlProgress :value="100" label="Pre-flight checks" tone="success" size="sm" /></div>
      <template #footer="{ close }">
        <MlButton variant="ghost" @click="close">取消</MlButton>
        <MlButton :loading="deploying" @click="deploy(close)">確認部署</MlButton>
      </template>
    </MlModal>

    <MlModal v-model:open="dangerOpen" eyebrow="Danger Zone" title="刪除整個獅群？" :width="440">
      這個動作無法復原。所有成員、紀錄與設定都會被永久刪除。
      <template #footer="{ close }">
        <MlButton variant="ghost" @click="close">保留</MlButton>
        <MlButton variant="danger" @click="close">我確定，刪除</MlButton>
      </template>
    </MlModal>

    <MlDivider label="End of transmission" />

    <footer class="footer">
      <MlLionMark :size="28" />
      <span>MalilionUI · 碼力獅出品 · 獅子 × 科技 × 金屬</span>
    </footer>
  </main>
</template>

<style>
html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
}

/* ── Top bar ── */
.topbar {
  position: sticky;
  top: 0;
  z-index: 50;
  background: color-mix(in srgb, var(--ml-bg) 82%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: inset 0 -1px 0 var(--ml-line);
}

.topbar__inner {
  display: flex;
  align-items: center;
  gap: 24px;
  max-width: 1200px;
  margin: 0 auto;
  padding: 12px 24px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: inherit;
  text-decoration: none;
}

.brand__name {
  font-family: var(--ml-font-display);
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: 0.14em;
}

.brand__ui {
  margin-left: 4px;
  color: var(--ml-accent-text);
}

.topnav {
  display: flex;
  gap: 4px;
  margin-left: auto;
  overflow-x: auto;
  scrollbar-width: none;
}

.topnav a {
  padding: 6px 10px;
  color: var(--ml-text-muted);
  font-family: var(--ml-font-mono);
  font-size: var(--ml-text-xs);
  letter-spacing: 0.08em;
  text-decoration: none;
  text-transform: uppercase;
  white-space: nowrap;
  transition: color var(--ml-dur) var(--ml-ease);
}

.topnav a:hover {
  color: var(--ml-accent-text);
}

.theme-switch {
  flex: none;
  font-size: var(--ml-text-xs);
}

/* ── Page ── */
.page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px 64px;
}

.hero {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  align-items: center;
  gap: 48px;
  padding: 72px 0 40px;
}

.hero__kicker {
  margin: 0 0 16px;
  color: var(--ml-accent-text);
}

.hero__title {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0 18px;
  margin: 0;
  font-family: var(--ml-font-display);
  font-size: clamp(3rem, 8vw, 6rem);
  font-weight: 700;
  line-height: 0.95;
  letter-spacing: 0.04em;
}

.hero__lead {
  max-width: 34em;
  margin: 24px 0 32px;
  color: var(--ml-text-muted);
  font-size: var(--ml-text-lg);
  line-height: 1.8;
}

.hero__lead strong {
  color: var(--ml-accent-text);
  font-weight: 600;
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}

.install {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  margin-top: 28px;
  padding: 10px 16px;
  background: var(--ml-surface-inset);
  box-shadow: inset 0 0 0 1px var(--ml-line);
  font-family: var(--ml-font-mono);
  font-size: var(--ml-text-sm);
}

.install__prompt {
  color: var(--ml-tech-text);
}

.hero__emblem {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 340px;
}

.hero__halo {
  position: absolute;
  width: 360px;
  height: 360px;
  border-radius: 50%;
  border: 1px solid var(--ml-line);
  animation: ml-spin 30s linear infinite;
}

/* Two HUD arcs riding the ring, gold and cyan */
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
}

.hero__halo::after {
  inset: 22px;
  border-width: 1px;
  border-bottom-color: var(--ml-tech);
  border-left-color: rgb(62 238 208 / 0.25);
  border-style: dashed solid solid solid;
  animation: ml-spin 12s linear infinite reverse;
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding: 8px 0 24px;
}

/* ── Demo layout helpers ── */
.demo-panel {
  display: grid;
  gap: 14px;
}

.demo-panel > .ml-hud-label {
  margin: 10px 0 0;
}

.row {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
}

.row--center {
  align-items: center;
}

.stack {
  display: grid;
  gap: 18px;
}

.stack .ml-divider {
  margin: 4px 0;
}

.grid {
  display: grid;
  gap: 20px;
}

.grid--2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.grid--3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.grid--4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }

.form {
  display: grid;
  gap: 18px;
}

.card-progress {
  margin-top: 18px;
}

.stats {
  margin-top: 32px;
}

.loaders {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 48px;
  margin-top: 32px;
  padding: 28px;
  box-shadow: inset 0 0 0 1px var(--ml-line);
  background: var(--ml-scanlines);
}

.tab-copy {
  margin: 0;
  color: var(--ml-text-muted);
}

.log {
  margin: 0;
  font-family: var(--ml-font-mono);
  font-size: var(--ml-text-sm);
  line-height: 1.8;
  color: var(--ml-tech-text);
}

.modal-progress {
  margin-top: 18px;
}

/* ── Tokens ── */
.scales {
  display: grid;
  gap: 18px;
}

.scale .ml-hud-label {
  margin: 0 0 8px;
}

.scale__row {
  display: flex;
  overflow: hidden;
  clip-path: polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px);
}

.swatch {
  flex: 1;
  height: 56px;
  display: flex;
  align-items: flex-end;
  padding: 6px 8px;
}

.swatch__label {
  font-family: var(--ml-font-mono);
  font-size: 0.6875rem;
  color: rgb(0 0 0 / 0.7);
}

.swatch__label--light {
  color: rgb(255 255 255 / 0.8);
}

.metals {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 14px;
  margin-top: 28px;
}

.metal__plate {
  height: 72px;
  clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
}

.metal__name {
  display: block;
  margin-top: 8px;
  font-family: var(--ml-font-mono);
  font-size: 0.6875rem;
  color: var(--ml-text-dim);
}

.type-specimen {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 20px;
  margin-top: 32px;
}

.type-specimen .ml-hud-label {
  margin: 0 0 6px;
}

.type-specimen p:not(.ml-hud-label) {
  margin: 0;
}

.type-specimen__display {
  font-family: var(--ml-font-display);
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.type-specimen__body {
  font-size: 1.05rem;
}

.type-specimen__mono {
  font-family: var(--ml-font-mono);
  color: var(--ml-tech-text);
}

.footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--ml-text-dim);
  font-family: var(--ml-font-mono);
  font-size: var(--ml-text-xs);
  letter-spacing: 0.08em;
}

@media (max-width: 960px) {
  .hero { grid-template-columns: 1fr; padding-top: 40px; }
  .hero__emblem { order: -1; min-height: 260px; }
  .hero__emblem .ml-lion-mark { --_size: 180px !important; }
  .hero__halo { width: 250px; height: 250px; }
  .hero-stats, .grid--4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .grid--2, .grid--3 { grid-template-columns: 1fr; }
  .metals { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .type-specimen { grid-template-columns: 1fr; }
  .topnav { display: none; }
  .theme-switch { margin-left: auto; }
}

@media (max-width: 520px) {
  .page { padding: 0 16px 48px; }
  .topbar__inner { padding: 10px 16px; gap: 12px; }
  .brand .ml-badge { display: none; }
  .hero-stats, .grid--4 { grid-template-columns: 1fr; }
  .metals { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .loaders { gap: 28px; }
  .theme-switch .ml-switch__label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }
}
</style>
