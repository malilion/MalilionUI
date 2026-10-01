<p align="center">
  <img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/hero.png" alt="MalilionUI — 獅子 × 科技 × 金屬 × 肉球" width="100%" />
</p>

<p align="center">
  <a href="https://github.com/malilion/MalilionUI/blob/main/README.md">English</a> · <b>繁體中文</b>
</p>

<p align="center">
  <a href="https://malilion.github.io/MalilionUI/"><b>📖 文件站與線上範例</b></a> ·
  <a href="#安裝">安裝</a> ·
  <a href="#樣式一覽">樣式一覽</a> ·
  <a href="#元件一覽">元件一覽</a>
</p>

<p align="center">
  <a href="https://github.com/malilion/MalilionUI/actions/workflows/docs.yml"><img src="https://github.com/malilion/MalilionUI/actions/workflows/docs.yml/badge.svg" alt="Docs" /></a>
  <a href="https://www.npmjs.com/package/@malilion/ui"><img src="https://img.shields.io/npm/v/@malilion/ui?color=f0ad2f&label=npm" alt="npm" /></a>
  <img src="https://img.shields.io/badge/Vue-3.5%2B-42b883?logo=vuedotjs&logoColor=white" alt="Vue 3.5+" />
  <img src="https://img.shields.io/badge/TypeScript-ready-3178c6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/runtime%20deps-0-f0ad2f" alt="0 runtime deps" />
</p>

# MalilionUI · 碼力獅元件庫

> 以**獅子**為魂、**科技**為骨、**金屬**為甲，再踩上一串可愛的肉球腳印。

碼力獅專屬的 Vue 3 元件庫：切角機甲板、拋光獅金、鈦合金與電路青光，
加上散佈在各元件裡的獅子腳印（勾選、單選、通知、表格、載入器……按鈕還能「蓋章」）。
預設是深色的 **Night Pride** 主題，另有淺色的 **Daylight Titanium** 主題。

- 26 個元件，Vue 3.5+ / TypeScript，完整型別
- [文件站](https://malilion.github.io/MalilionUI/)：左側選單、每個元件一頁、每個範例都能一鍵複製原始碼
- 樣式與框架無關：所有視覺都在 `.ml-*` class 與 `--ml-*` CSS 變數裡，React / Next / 原生網頁也能直接用
- 執行期零依賴（Vue 是 peer dependency）
- 無障礙：鍵盤操作、焦點鎖定、ARIA 關聯，並支援 `prefers-reduced-motion`

## 樣式一覽

### 按鈕與徽章

切角金屬板，滑過時有一道拋光反光掃過；加上 `stamp` 會在按下的位置蓋一個腳印。

<img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/buttons.png" alt="按鈕與徽章" width="100%" />

### HUD 表單

聚焦時外框轉金、底部射出能量線；單選選中時壓進金色腳印，也能做成卡片方塊。

<img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/forms.png" alt="表單元件" width="100%" />

### 警示、進度、載入與通知

警示角落有三道獅爪痕；進度條可以有一隻腳印跟著跑；通知蓋著淡淡的腳印浮水印。

<img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/feedback.png" alt="回饋元件" width="100%" />

### 表格、數據與頭像

可排序、可勾選的 HUD 資料表，滑過的那一列會有小腳印走進來；六角徽章頭像。

<img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/data.png" alt="資料展示元件" width="100%" />

### 分頁、下拉選單與提示

<img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/navigation.png" alt="導覽元件" width="100%" />

### 對話框

指揮台式對話框，由中線向上下展開，背景是掃描線與模糊。

<img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/modal.png" alt="對話框" width="100%" />

### 獅掌腳印 · 可愛風格

`MlPaw` 有金、肉球粉、鈦、科技青四種色調，並藏在勾選框、單選、進度條、載入器、徽章與通知裡。

<img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/paw.png" alt="獅掌腳印" width="100%" />

### 雙主題

同一套元件，深色 Night Pride 與淺色 Daylight Titanium。

<img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/themes.png" alt="深色與淺色主題" width="100%" />

### 文件站

左側選單、即時範例、一鍵複製程式碼與完整 API 表：<https://malilion.github.io/MalilionUI/>

<img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/docs-site.png" alt="文件站" width="100%" />

## 安裝

```bash
npm i @malilion/ui
```

```ts
// main.ts
import { createApp } from 'vue'
import MalilionUI from '@malilion/ui'
import '@malilion/ui/style.css'
import App from './App.vue'

createApp(App).use(MalilionUI).mount('#app')
```

要用通知的話，在 `App.vue` 放一個 `<MlToastHost />`，之後在任何地方呼叫 `toast()`：

```ts
import { useToast } from '@malilion/ui'

const toast = useToast()
toast('嗷嗚～')                       // 預設是腳印通知
toast.success({ title: '部署完成', message: 'v0.2 已上線' })
```

或者按需引入：

```ts
import { MlButton, MlCard } from '@malilion/ui'
```

### 字體（建議）

元件會使用以下字體，找不到時會退回系統字體。在 `index.html` 加入：

```html
<link
  href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;600&family=Noto+Sans+TC:wght@400;500;700&display=swap"
  rel="stylesheet"
/>
```

## 主題

預設為深色。在任何祖先元素（通常是 `<html>`）設定 `data-ml-theme` 即可切換，也可以只套用在局部區塊：

```html
<html data-ml-theme="light">
```

在 `<body>` 加上 `ml-app` class，就會套用整頁的背景（獅金光暈 + 網格）、文字顏色與字體。這是選用的，元件庫不會動到任何原生元素的樣式。

## 元件一覽

| 元件 | 說明 |
| --- | --- |
| `MlButton` | `primary` / `steel` / `outline` / `tech` / `ghost` / `danger`，`sm` / `md` / `lg`，`loading`、`square`、`href`、`stamp` |
| `MlCard` | `plate` / `gold` / `steel` / `tech` 外殼，`rivets` 鉚釘、`interactive` 浮起發光；`#header`、`#actions`、`#footer` 插槽 |
| `MlBadge` | `gold` / `steel` / `tech` / `bean` / `success` / `danger`，`solid`、`dot`、`pulse`、`paw` |
| `MlInput` / `MlTextarea` / `MlSelect` | HUD 欄位，`label`、`index`、`hint`、`error`，`#prefix` / `#suffix` |
| `MlField` | 給自訂控制項用的 label / hint / error 外框 |
| `MlSwitch` | `v-model`，`tone="tech"`，`show-state` 顯示 ON/OFF |
| `MlCheckbox` | `v-model`，`hint`，`paw` 腳印勾選，`indeterminate` 半選 |
| `MlRadioGroup` / `MlRadio` | 選中時壓進金色腳印；`variant="card"` 卡片方塊；`options` 或子元件 |
| `MlProgress` | 能量條；不給 `value` 即為不確定進度，`striped`、`smooth`、`paw` 腳印跑者、四種 `tone` |
| `MlTabs` | `line` 金色墨線 / `plate` 滑動金屬板，用 `#<value>` 具名插槽放面板內容 |
| `MlModal` | `v-model:open`，Esc / 點背景關閉、焦點鎖定、多層對話框共用捲動鎖 |
| `toast()` / `MlToastHost` | 通知；五種色調、動作按鈕、常駐、滑鼠移上暫停倒數 |
| `MlTooltip` | `top` / `bottom` / `left` / `right`，自動設定 `aria-describedby` |
| `MlAvatar` | 六角徽章頭像，`ring`、`status`，圖片失敗時退回縮寫；`.ml-avatar-group` 可疊放 |
| `MlAlert` | `info` / `success` / `warning` / `danger`，角落有三道獅爪痕，`closable` |
| `MlLoader` | `reactor` 獅鬃反應爐 / `paws` 走路的腳印 |
| `MlStat` | HUD 數據，`delta` 正負自動上色 |
| `MlTable` | 排序、勾選（`v-model:selected`）、`#cell-欄位` 插槽、滑過列的小腳印、腳印空狀態與載入遮罩 |
| `MlDropdown` | 指令選單；方向鍵 / Home / End / 首字跳轉 / Esc；`selectable` 單選模式用腳印標記 |
| `MlDivider` | `label`、`claw` 獅爪痕或 `paw` 一串腳印 |
| `MlLionMark` | 多面體金屬獅徽，`glow`、`animated` |
| `MlPaw` | 獅子腳印；`gold` / `bean`（肉球粉）/ `steel` / `tech` / `current` |
| `v-paw-stamp` | 按下時在游標位置蓋一個會飄走的腳印；`MlButton` 直接用 `stamp` 屬性 |
| `MlIcon` | 內建的少量圖示 |

每個元件的完整 props、事件、插槽與可複製的範例都在[文件站](https://malilion.github.io/MalilionUI/)。

### 範例

```vue
<script setup lang="ts">
import { ref } from 'vue'
const open = ref(false)
const email = ref('')
</script>

<template>
  <MlCard eyebrow="Pride / 01" title="獅群儀表板" rivets>
    <MlInput v-model="email" index="01" label="Email" type="email" />
    <template #footer>
      <MlButton variant="ghost">取消</MlButton>
      <MlButton stamp @click="open = true">部署</MlButton>
    </template>
  </MlCard>

  <MlModal v-model:open="open" eyebrow="Command" title="部署到正式站？">
    確定要把目前版本推上線嗎？
    <template #footer="{ close }">
      <MlButton variant="ghost" @click="close">取消</MlButton>
      <MlButton @click="close">確認部署</MlButton>
    </template>
  </MlModal>
</template>
```

## 在 React / 非 Vue 專案使用

引入 CSS 後直接寫 class 即可，結構可以參考 `src/components/*.vue` 的 template：

```tsx
import '@malilion/ui/style.css'

export function DeployButton() {
  return <button className="ml-btn ml-btn--primary ml-btn--md">部署</button>
}
```

只想要設計代幣（顏色、金屬漸層、字體、動態曲線）的話，引入 `@malilion/ui/css/tokens.css` 就好。

## 設計語言

| 元素 | 做法 |
| --- | --- |
| **切角（Malilion cut）** | 左上、右下兩角斜切，像機械加工過的金屬板。根元素不裁切，外框與面板放在 `::before` / `::after` 上，因此焦點框與光暈不會被切掉 |
| **金屬** | `--ml-metal-*` 漸層：頂部高光帶、中段暗核、底部反光，模擬拋光金屬 |
| **獅子** | 獅金色票、獅鬃載入器、獅爪痕、獅徽 |
| **可愛** | 肉球腳印（`MlPaw`）、肉球粉 `--ml-bean-*`、按鈕蓋章、Q 彈的彈出動畫——點綴用，不搶金屬的主調 |
| **科技** | 電路青作為焦點與資料色、HUD 標籤、掃描線、能量格 |
| **焦點** | 青色矩形「鎖定框」，在深色與淺色主題都清楚可見 |

## 開發

```bash
npm install
npm run dev          # 文件站（playground/），http://127.0.0.1:5287
npm test             # Vitest 元件測試
npm run typecheck    # vue-tsc 型別檢查
npm run build        # 輸出 dist/：ESM + style.css + .d.ts
npm run screenshots  # 重新產生 README 的樣式圖片（需要本機 Google Chrome）
```

推到 `main` 之後，GitHub Actions 會跑型別檢查與測試，通過後自動部署文件站到 GitHub Pages。

## 專案結構

```
src/
  index.ts              # 外掛 + 具名匯出 + GlobalComponents 型別
  types.ts              # 公開型別
  composables.ts        # attrs 分流、捲動鎖
  toast.ts              # 通知佇列與 toast() API
  pawStamp.ts           # v-paw-stamp 指令
  components/           # Ml*.vue
  styles/
    tokens.css          # 設計代幣（兩套主題）
    base.css            # .ml-app 外殼、工具 class、keyframes
    components/*.css    # 每個元件的樣式
playground/             # 文件站
  registry.ts           # 選單、頁面、範例與 API 表的資料
  examples/**/*.vue     # 每個範例；同一個檔案既是即時預覽，也是可複製的原始碼
  shots.html            # README 截圖用的組合頁（不會部署）
scripts/screenshots.mjs # 產生 docs/images/*.png
tests/                  # 元件測試
```
