<h1>Malilion UI · 碼力獅元件庫</h1>

<p align="right">
  <a href="https://github.com/malilion/MalilionUI/blob/main/README.md">English</a> | 繁體中文
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/logo.png" alt="Malilion UI" width="132" height="132">
</p>

<p align="center">獅子 × 科技 × 金屬，再踩上一串可愛肉球腳印的元件庫，為 Vue 3 與 TypeScript 打造</p>

<p align="center">
  <a href="https://github.com/malilion/MalilionUI/stargazers"><img src="https://img.shields.io/github/stars/malilion/MalilionUI?style=flat-square&color=f0ad2f" alt="GitHub stars"></a>
  <a href="https://www.npmjs.com/package/@malilion/ui"><img src="https://img.shields.io/npm/v/@malilion/ui?style=flat-square&color=cd7631" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/@malilion/ui"><img src="https://img.shields.io/npm/dm/@malilion/ui?style=flat-square&color=14cfb2" alt="npm downloads"></a>
  <a href="https://github.com/malilion/MalilionUI/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-ff8fa8?style=flat-square" alt="license: MIT"></a>
  <a href="https://github.com/malilion/MalilionUI/actions/workflows/docs.yml"><img src="https://img.shields.io/github/actions/workflow/status/malilion/MalilionUI/docs.yml?style=flat-square&label=docs" alt="docs build"></a>
  <br/>
  <img src="https://img.shields.io/badge/Vue_3-42B883?style=flat-square&logo=vuedotjs&logoColor=white" alt="Vue 3">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/CSS_Variables-1572B6?style=flat-square&logo=css&logoColor=white" alt="CSS variables">
</p>

<p align="center">
  <a href="https://malilion.github.io/MalilionUI/"><b>📖 文件站與線上範例</b></a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/hero.png" alt="Malilion UI" width="100%">
</p>

Malilion UI 是**碼力獅**專屬的元件庫。每個元件都是一塊機械加工過的裝甲板：斜切邊角、拋光獅金、鈦合金與電路青光。再讓一串肉球腳印走過其中——單選選中時壓進一個腳印、按鈕按下會蓋章、表格滑過的那一列會有小腳印走進來——讓冷冽的金屬多一點溫度。

## 特色

- 129 個元件，涵蓋基礎、版面、表單、回饋、資料展示、圖表、導覽、行動版與視覺特效，另附現成的版型範例
- 內建表單驗證：`MlForm` / `MlFormItem` 規則（必填、長度、格式、非同步檢查），錯誤會直接顯示在每個表單元件上
- 台灣格式驗證：`twRules.nationalId()`／`residentId()`／`businessId()`／`mobile()`／`landline()`／`mobileBarcode()`／`citizenCert()`／`postalCode()` 直接放進 `MlForm` 與 React `<Form>`，錯誤訊息跟著語系；底層是不依賴框架的檢查函式（`isTwNationalId`、採財政部 2023 年「可被 5 整除」新制的 `isTwBusinessId`、依號碼計畫檢查區碼的 `isTwLandline`…）與 `formatTwPhone()` 等格式化工具
- 完整的選擇器與浮層：可搜尋 / 多選的下拉選擇、自動完成、時間、日期時間與取色器，以及抽屜、彈出框、氣泡確認
- 多語系：內建繁體中文與英文，`app.use(MalilionUI, { locale: en })` 或 `<MlConfigProvider>` 一行切換，也能自訂文案
- 以 TypeScript 撰寫，props、插槽與模板裡的全域元件都有完整型別
- 也支援 React：`@malilion/ui/react` 提供全部 129 個元件的 React 版（HTML 結構與 Vue 版一致），Next.js App Router 可直接使用
- 樣式與框架無關：所有外觀都在 `.ml-*` class 與 `--ml-*` CSS 變數裡，React 或原生網頁也能用
- 兩套主題：深色 **Night Pride** 與淺色 **Daylight Titanium**，可整頁或局部切換
- 內建碼力獅吉祥物：`MlMascot`、`<MlAvatar lion>`，空狀態還有睡著的小獅子
- 處處都有腳印：`MlPaw`、`v-paw-stamp` 蓋章指令、腳印勾選框、單選、載入器與進度條跑者
- 符合品牌風格的視覺特效：數字滾動、HUD 解碼文字、金屬傾斜反光、流光邊框、聚光燈格線、捲動出場與腳印煙火，在 `prefers-reduced-motion` 下全部會收斂
- 無障礙：鍵盤操作、焦點鎖定、ARIA 關聯，並支援 `prefers-reduced-motion`
- 按需載入：只打包用到的元件與樣式；另有 Nuxt 模組，全部元件都通過 SSR 與水合測試
- 執行期零依賴，只需要 Vue（或 React）作為 peer dependency

## 0.11 版新功能

- **`MlCheckboxGroup`**：用 options 或放入 `MlCheckbox`，全選與半選狀態、`min` / `max` 上下限、卡片樣式，可放進 `MlForm` 驗證
- **`MlPasswordInput`**：顯示／隱藏密碼、強度條（常見密碼、連號與鍵盤順序都會被判為弱）、即時規則清單、大寫鍵提示；另外匯出 `scorePassword()`
- **月／季／年選擇器**：`MlDatePicker type="month" | "quarter" | "year"`，`MlDateRangePicker` 也能選月份與年份區間，全程可用鍵盤操作
- **`MlThemeToggle` + `useTheme()`**：深色／淺色／跟隨系統，跨分頁與重新整理都記得，載入時不閃爍（`themeInitScript()`，Nuxt 模組會自動加上），切換時從開關位置圓形展開
- **`MlBarChart` 多組資料**：分組、堆疊與百分比堆疊，可顯示總計，圖例可切換數列，滑過顯示該類別所有數值
- 共 128 個元件，Vue 與 React 都有

## 0.10 版新功能

- **`MlLuckyWheel`**：獅金抽獎轉盤——外圈燈跑馬、指針隨格線跳動、長長的減速加一點回彈，中獎噴腳印；可依權重抽，也可以用 `beforeSpin` 交給伺服器決定（立刻開轉，答案回來再煞停到那一格）
- **`MlTaiwanRegion`**：台灣 22 縣市、368 鄉鎮市區，附三碼郵遞區號與官方英文名稱，資料來自中華郵政開放資料；兩個連動下拉或單一搜尋框，懂「台／臺」、英文與郵遞區號；可放進 `MlForm` 驗證；資料（gzip 後 6 KB）只在用到時載入，另外匯出 `formatTaiwanAddress()` 等工具函式
- **`MlScatterChart`**：散佈圖與泡泡圖，趨勢線、腳印／菱形資料點、圖例切換、鍵盤查看
- **`MlTaiwanMap`**：臺灣 22 縣市面量圖，金／青色階（線性或分位數）、圖例、提示框；點擊或 Enter 選取（可複選），方向鍵移到相鄰縣市，澎湖／金門／連江放在插圖框；邊界取自內政部國土測繪中心開放資料，圖資約 20 KB、只在用到時載入
- **`MlFunnelChart`**：轉換漏斗，金屬梯形、逐步與整體轉換率，直向或橫向
- 四個新元件都有 React 版，Vue 與 React 一樣是完整的 125 個元件

## 0.9 版新功能

- **React 版補齊**：121 個元件全部都有 React 版（`@malilion/ui/react`），包含下拉選擇、日期／時間／顏色選擇器、上傳、Table、Tree、Transfer、選單、導覽、看板、圖表與特效；`<Form>` / `<FormItem>` 與 Vue 共用驗證規則，指令改為 `<Loading>` / `usePawStamp()`
- **`MlMarkdown`**：零依賴的 Markdown 渲染，專為 AI 對話設計——逐字串流不閃爍、腳印游標、GFM 表格與待辦清單、程式碼區塊交給 `MlCodeBlock` 上色，不用 `v-html`，從結構上杜絕 XSS
- **`MlEllipsis`**：多行截斷，真的被截斷才顯示 tooltip，可展開／收起，雜湊與檔名可從中間省略
- **`MlScrollbar`**：金屬風格的覆蓋式捲軸，保留原生捲動，可拖曳、自動隱藏、觸底事件
- **`MlMasonry`**：瀑布流，放進最短的欄，欄數可依寬度變化，支援 SSR
- **`MlSignaturePad`**：簽名板，筆畫平滑、依速度／壓力變粗細，可復原、匯出 PNG / SVG，縮放視窗不掉筆跡
- **`MlImageCropper`**：圖片裁切，拖曳／縮放／旋轉、固定比例與圓形遮罩、鍵盤操作、輸出 Blob / canvas，可搭配 `MlUpload` 與 `MlAvatar` 做大頭貼

## 0.8 版新功能

- **按需載入**：`@malilion/ui/resolver` 搭配 unplugin-vue-components，只打包用到的元件與樣式（只用卡片、按鈕、徽章的頁面，樣式從 196 KB 降到 32 KB）；也可以手動 `import '@malilion/ui/on-demand/MlButton'`
- **Nuxt 模組**：`modules: ['@malilion/ui/nuxt']`，元件與組合函式自動匯入、指令自動註冊、每頁只載入用到的樣式
- **SSR**：文件站全部範例都通過伺服器端渲染與水合測試
- **React 版**：`@malilion/ui/react` 提供 45 個元件，HTML 結構與 Vue 版逐一比對一致，Next.js App Router 可直接使用

## 0.7 版新功能

- **多語系**：`MlConfigProvider`、內建 `zhTW` / `en`，所有元件文字、無障礙說明、表單驗證訊息與日期格式都會跟著換
- **表格**：固定欄、固定表頭、內建分頁、展開列、樹狀資料、文字截斷
- **`v-loading`**：任何區塊加上載入遮罩，或 `.fullscreen` 蓋住整個畫面
- **品牌與工程師元件**：`MlHeatmap`（貢獻熱力圖，可換成腳印格）、`MlCodeBlock`、`MlTour`（碼力獅新手導覽）、`MlChat` / `MlChatMessage` / `MlChatInput`
- **圖表**：`MlRadarChart`、`MlGauge`
- **互動**：`MlMention`、`MlSortable`（滑鼠、觸控、鍵盤都能拖）、`MlKanban`、`MlFloatButton`、`MlBanner`

## 0.6 版新功能

新增 22 個元件與 `confirm()`，另外多了碼力獅專屬的品牌字型：

- **版面**：`MlLayout`（後台骨架，手機自動變抽屜）、`MlGrid` / `MlGridItem`、`MlSpace`
- **表單**：`MlDateRangePicker`、`MlCascader`、`MlTreeSelect`、`MlTagInput`、`MlPinInput`
- **回饋**：`confirm()` / `confirm.danger()` / `confirm.prompt()` / `confirm.alert()`、`MlResult`（403 · 404 · 500 由小獅子登場）
- **資料展示**：`MlDescriptions`、`MlSplitter`、`MlVirtualList`、`MlInfiniteScroll`、`MlQRCode`（零依賴 QR 編碼器）
- **圖表**：`MlLineChart`
- **導覽**：`MlMenu`、`MlCommandPalette`（⌘K）、`MlContextMenu`、`MlAnchor`
- **視覺特效**：`MlCountdown`
- **字型**：內建 Malilion Display / Sans / Mono，以及腳印風格的 **Malilion Paw**（`.ml-font-paw`）

## 0.5 版新功能

新增 25 個元件，全部支援鍵盤操作、ARIA 關聯，也都有文件頁：

- **表單**：`MlCombobox`、`MlAutocomplete`、`MlTimePicker`、`MlDateTimePicker`、`MlColorPicker`、`MlSegmented`、`MlRate`、`MlTransfer`，以及 `MlForm` / `MlFormItem` 表單驗證
- **回饋**：`MlDrawer`、`MlPopover`、`MlPopconfirm`、`MlSkeleton` / `MlSkeletonItem`
- **資料展示**：`MlTree`、`MlTimeline`、`MlImage` / `MlImagePreview`、`MlCarousel`、`MlWatermark`
- **導覽**：`MlAffix`、`MlBackTop`
- 既有元件加上進場與退場動畫（警示、分頁、日曆、圖表、上傳等）

## 安裝

```bash
npm install @malilion/ui
```

```bash
yarn add @malilion/ui
```

```bash
pnpm add @malilion/ui
```

Malilion UI 只依賴 Vue，支援 Vue 3.5 以上。

## 快速開始

```ts
// main.ts
import { createApp } from 'vue'
import MalilionUI from '@malilion/ui'
import '@malilion/ui/style.css'
import App from './App.vue'

createApp(App).use(MalilionUI).mount('#app')
```

介面文字預設是繁體中文。要換成英文：`import MalilionUI, { en } from '@malilion/ui'`，然後 `app.use(MalilionUI, { locale: en })`；只換局部就用 `<MlConfigProvider :locale="en">` 包起來。

夜間（Night Pride）／日光（Daylight）／跟隨系統：放一個 `<MlThemeToggle />`（或呼叫 `useTheme()`），選擇會記在 localStorage。把 `themeInitScript()` 放進 `<head>` 的行內 `<script>`，回訪者就不會先閃一下錯的主題；Nuxt 模組會自動加上，並自動匯入 `useMlTheme()`。

```vue
<template>
  <MlCard eyebrow="Pride / 01" title="獅群儀表板" rivets>
    <MlInput v-model="email" index="01" label="Email" type="email" />
    <template #footer>
      <MlButton variant="ghost">取消</MlButton>
      <MlButton stamp @click="open = true">部署</MlButton>
    </template>
  </MlCard>
</template>
```

也可以按需引入，不全域註冊：

```ts
import { MlButton, MlCard } from '@malilion/ui'
```

在任何地方顯示通知——先在 `App.vue` 放一個 `<MlToastHost />`，然後：

```ts
import { useToast } from '@malilion/ui'

const toast = useToast()
toast('嗷嗚～') // 預設是腳印通知
toast.success({ title: '部署完成', message: 'v0.2 已上線' })
```

碼力獅品牌字型（Malilion Display / Sans / Mono）已經內建在 `style.css` 裡，不用另外載入。另外還有專屬的可愛字體 **Malilion Paw**——i、j 的點和 `. : ; ! ? …` 都換成了小腳印，`U+E000` 則是一個完整的腳印；加上 `class="ml-font-paw"` 或用 `var(--ml-font-paw)` 就能使用。中文字則交給系統字體；想要各平台一致的中文字形，可以再加上 Noto Sans TC：

```html
<link
  href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap"
  rel="stylesheet"
/>
```

## 樣式一覽

| 按鈕與徽章 | HUD 表單 |
| --- | --- |
| <img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/buttons.png" alt="按鈕與徽章"> | <img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/forms.png" alt="表單"> |
| **警示、進度、載入與通知** | **表格、數據與頭像** |
| <img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/feedback.png" alt="回饋元件"> | <img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/data.png" alt="資料展示"> |
| **分頁、下拉選單與提示** | **對話框** |
| <img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/navigation.png" alt="導覽元件"> | <img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/modal.png" alt="對話框"> |
| **圖表與儀表板** | **導覽、表單與空狀態** |
| <img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/charts.png" alt="圖表"> | <img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/kit.png" alt="更多元件"> |
| **日曆與日期選擇** | **手機版畫面** |
| <img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/calendar.png" alt="日曆"> | <img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/mobile.png" alt="手機版畫面"> |
| **進階選擇與表單驗證** | **抽屜、彈出框與骨架屏** |
| <img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/pickers.png" alt="進階選擇與表單驗證"> | <img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/overlays.png" alt="浮層元件"> |
| **樹狀結構、時間軸與穿梭框** | **圖片、輪播與浮水印** |
| <img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/structure.png" alt="樹狀結構、時間軸與穿梭框"> | <img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/media.png" alt="媒體與工具元件"> |
| **獅掌腳印 · 可愛風格** | **雙主題** |
| <img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/paw.png" alt="獅掌腳印"> | <img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/themes.png" alt="雙主題"> |

**視覺特效**

<img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/effects.png" alt="視覺特效" width="100%">

**0.7 · 熱力圖、儀表、雷達、程式碼區塊與聊天**

<img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/devkit.png" alt="熱力圖、儀表、雷達、程式碼區塊與聊天" width="100%">

**0.6 · 選單、折線圖與描述清單**

<img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/workspace.png" alt="選單、折線圖與描述清單" width="100%">

**0.6 · 日期區間、級聯、標籤與驗證碼**

<img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/inputs.png" alt="日期區間、級聯、標籤與驗證碼" width="100%">

**0.6 · ⌘K 指令面板、404、QR Code 與倒數**

<img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/brand.png" alt="指令面板、404、QR Code 與倒數" width="100%">

每個元件在[文件站](https://malilion.github.io/MalilionUI/)都有自己的頁面：即時範例、一鍵複製原始碼與完整 API 表。

<img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/docs-site.png" alt="文件站" width="100%">

## 元件一覽

| 分類 | 元件 |
| --- | --- |
| 基礎 | `MlButton` · `MlBadge` · `MlTag` · `MlCard` · `MlDivider` · `MlKbd` · `MlMascot` · `MlLionMark` · `MlPaw` · `MlIcon` · `MlConfigProvider` · `MlThemeToggle` |
| 版面 | `MlLayout` · `MlGrid` / `MlGridItem` · `MlSpace` · `MlScrollbar` · `MlMasonry` |
| 表單 | `MlInput` · `MlPasswordInput` · `MlTextarea` · `MlSelect` · `MlCombobox` · `MlAutocomplete` · `MlDatePicker` · `MlTimePicker` · `MlDateTimePicker` · `MlNumberInput` · `MlSlider` · `MlRate` · `MlColorPicker` · `MlCheckbox` · `MlCheckboxGroup` · `MlRadioGroup` / `MlRadio` · `MlSwitch` · `MlSegmented` · `MlTransfer` · `MlUpload` · `MlField` · `MlForm` / `MlFormItem` · `MlDateRangePicker` · `MlCascader` · `MlTreeSelect` · `MlTagInput` · `MlPinInput` · `MlMention` · `MlSignaturePad` · `MlImageCropper` · `MlTaiwanRegion` |
| 回饋 | `MlAlert` · `toast()` / `MlToastHost` · `MlProgress` · `MlLoader` · `MlModal` · `MlDrawer` · `MlTooltip` · `MlPopover` · `MlPopconfirm` · `MlSkeleton` · `MlEmpty` · `confirm()` / `MlDialogHost` · `MlResult` · `MlTour` · `MlBanner` · `v-loading` |
| 資料展示 | `MlTable` · `MlCalendar` · `MlAccordion` · `MlTree` · `MlTimeline` · `MlImage` / `MlImagePreview` · `MlCarousel` · `MlWatermark` · `MlAvatar` · `MlStat` · `MlDescriptions` · `MlSplitter` · `MlVirtualList` · `MlInfiniteScroll` · `MlQRCode` · `MlCodeBlock` · `MlChat` / `MlChatMessage` / `MlChatInput` · `MlSortable` · `MlKanban` · `MlMarkdown` · `MlEllipsis` |
| 圖表 | `MlBarChart` · `MlDonut` · `MlRing` · `MlSparkline` · `MlLineChart` · `MlHeatmap` · `MlRadarChart` · `MlGauge` · `MlScatterChart` · `MlFunnelChart` · `MlTaiwanMap` |
| 導覽 | `MlTabs` · `MlDropdown` · `MlBreadcrumb` · `MlPagination` · `MlSteps` · `MlAffix` · `MlBackTop` · `MlMenu` · `MlCommandPalette` · `MlContextMenu` · `MlAnchor` · `MlFloatButton` |
| 行動版 | `MlPhone` · `MlNavBar` · `MlTabBar` · `MlList` / `MlListItem` |
| 視覺特效 | `MlCountUp` · `MlDecryptText` · `MlTilt` · `MlBorderBeam` · `MlMarquee` · `MlReveal` · `MlSpotlight` · `MlPawBurst` / `pawBurst()` · `MlCountdown` · `MlLuckyWheel` |
| 指令 | `v-paw-stamp` · `v-loading` |

## 元件屬性

所有元件都接受一般屬性（`class`、`style`、`aria-*`、事件）。表單元件會把 `class` / `style` 放在外框上，其餘屬性放在原生元素上，所以 `name`、`autocomplete` 等都能直接用。以下是最常用的幾個：

| 元件 | 屬性 | 型別 | 預設值 | 說明 |
| --- | --- | --- | --- | --- |
| MlButton | variant | `'primary' \| 'steel' \| 'outline' \| 'tech' \| 'ghost' \| 'danger'` | `'primary'` | 外觀 |
| MlButton | stamp | `boolean \| 'gold' \| 'bean' \| 'steel' \| 'tech'` | `false` | 按下時在游標位置蓋腳印 |
| MlCard | variant | `'plate' \| 'gold' \| 'steel' \| 'tech'` | `'plate'` | 外殼；可加 `rivets` 或 `interactive` |
| MlInput | index / label / hint / error | string | — | HUD 編號、標籤、說明、錯誤（自動連到 `aria-describedby`） |
| MlProgress | value | `number \| null` | `null` | 不給就是不確定進度；加 `paw` 會有腳印跟著跑 |
| MlTable | v-model:sort / v-model:selected | `MlTableSort \| null` / `Key[]` | `null` / `[]` | 排序與勾選 |
| MlCombobox | searchable / multiple / clearable | boolean | `false` | 自繪下拉選擇；multiple 時 v-model 為陣列 |
| MlForm | model / rules | `object` / `MlFormRules` | — | 欄位包在 `MlFormItem prop="…"` 裡，錯誤自動顯示在元件上 |
| MlDrawer | placement / size | `'right' \| 'left' \| 'top' \| 'bottom'` / `number \| string` | `'right'` / `420` | 邊緣滑出面板，含焦點鎖定與捲動鎖定 |
| MlTimePicker | v-model / minute-step / min / max | `string \| null` / number / string | `null` / `1` / — | `"HH:mm"` 捲輪；加 `seconds` 多一欄秒 |
| MlTree | v-model:expanded / selected / checked | `Key[]` / `Key \| null` / `Key[]` | `[]` / `null` / `[]` | 加 `checkable` 三態勾選，`filter` 篩選 |
| MlCarousel | items / autoplay / v-model:index | `T[]` / 毫秒 / number | — / `0` / `0` | 投影片由預設插槽 `{ item, index }` 決定 |
| MlReveal | effect / stagger | `'fade-up' \| 'zoom' \| 'blur' \| …` / 毫秒 | `'fade-up'` / `0` | 捲進畫面時出場；`stagger` 讓子元素依序出場 |
| MlDropdown | selectable | boolean | `false` | 單選選單；v-model 存選中的值，並用腳印標記 |
| MlMascot | pose / frame | `'avatar' \| 'full'` / `'none' \| 'ring' \| 'hex'` | `'avatar'` / `'none'` | 碼力獅本獅，頭像或全身 |
| MlBarChart | data / highlight / series / labels / mode / showTotal | `{ label, value }[]` / `'max' \| number \| null` / `MlBarSeries[]` / `string[]` / `'grouped' \| 'stacked' \| 'percent'` / `boolean` | — / `'max'` / — / — / `'grouped'` / `false` | 自動取整數刻度，最高的一根會亮起；傳 series 變成多數列（分組、堆疊、百分比堆疊），圖例可切換數列 |
| MlPaw | tone | `'gold' \| 'bean' \| 'steel' \| 'tech' \| 'current'` | `'gold'` | `current` 會跟隨文字顏色 |

每個元件的完整屬性都在[文件站](https://malilion.github.io/MalilionUI/)。

```typescript
import type { MlButtonVariant, MlTableColumn, MlToastOptions, MlPawTone } from '@malilion/ui'
```

## 按需載入

只想帶走用到的元件？搭配 [unplugin-vue-components](https://github.com/unplugin/unplugin-vue-components)，模板裡用到哪個元件，就只匯入那個元件和它需要的樣式（不必 `app.use`，也不必引入整份 `style.css`）：

```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { MalilionResolver } from '@malilion/ui/resolver'

export default defineConfig({
  plugins: [vue(), Components({ resolvers: [MalilionResolver()] })],
})
```

不用自動匯入的話，每個元件各引入一次它的樣式入口（字體、色彩變數與它用到的子元件樣式都會一起帶上，重複的只載入一次）：

```ts
import '@malilion/ui/on-demand/MlButton'
import '@malilion/ui/on-demand/MlCombobox'
import { MlButton, MlCombobox } from '@malilion/ui'
```

以只用卡片、按鈕和徽章的頁面為例：樣式約 32 KB（完整版 196 KB）。

## Nuxt

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@malilion/ui/nuxt'],
  malilion: { locale: 'en' }, // 選用：css: 'on-demand' | 'full' | false、prefix
})
```

模組會自動匯入所有元件、`useToast` / `useConfirm`，註冊 `v-paw-stamp` 與 `v-loading`，並預設只載入每頁用到的元件樣式。所有元件都通過伺服器端渲染與水合測試。

## React / Next.js

`@malilion/ui/react` 提供 React 版元件，輸出的 HTML 結構與 Vue 版完全相同（有自動化測試逐一比對），共用同一份樣式。支援 React 18 / 19，可以直接用在 Next.js App Router 的 Server Component 裡（已標記 `'use client'`）。

```tsx
import '@malilion/ui/style.css'
import { Button, Card, ToastHost, toast } from '@malilion/ui/react'

export default function Page() {
  return (
    <>
      <Card eyebrow="Pride / 01" title="獅群儀表板">
        <Button stamp onClick={() => toast('嗷嗚～')}>部署</Button>
      </Card>
      <ToastHost />
    </>
  )
}
```

表單元件遵循 React 慣例：`value` + `onChange` 為受控，`defaultValue` 為非受控。多語系用 `<ConfigProvider locale={en}>`。

每個 Vue 元件都有 React 版，名稱去掉 `Ml` 前綴（`MlDatePicker` → `DatePicker`）。`v-model` 對應 `value` / `defaultValue` / `onChange`，`v-model:open` 對應 `open` / `onOpenChange`，具名插槽改成 prop 或 render 函式，指令 `v-loading` / `v-paw-stamp` 改為 `<Loading>` / `usePawStamp()`。`<Form>` + `<FormItem>` 用和 Vue 版相同的規則驗證 React 欄位。

## 直接使用 CSS

不是 Vue 專案？引入樣式表直接寫 class 就好，結構可以參考 `src/components/*.vue` 的 template。

```tsx
import '@malilion/ui/style.css'

export function DeployButton() {
  return <button className="ml-btn ml-btn--primary ml-btn--md">部署</button>
}
```

只想要設計代幣（顏色、金屬漸層、字體、動態曲線）？

```ts
import '@malilion/ui/css/tokens.css'
```

## 主題

預設是深色。在任何祖先元素（通常是 `<html>`）設定 `data-ml-theme`，或只設定在某個區塊，就能切換：

```html
<html data-ml-theme="light">
  <body class="ml-app">…</body>
</html>
```

`ml-app` 是選用的：它會加上整頁背景（獅金光暈與網格）、文字顏色與字體。元件庫不會動到任何原生元素的樣式。

## 色票

| 名稱 | 代幣 | 色值 | 用途 |
| --- | --- | --- | --- |
| 獅金 Lion Gold | `--ml-gold-400` | `#f0ad2f` | 主色、金屬外框 |
| 鬃銅 Mane Bronze | `--ml-bronze-400` | `#cd7631` | 鬃毛、暖金屬 |
| 鈦合金 Titanium | `--ml-steel-300` | `#9ea7b5` | 次要金屬、低調介面 |
| 電路青 Circuit Cyan | `--ml-cyan-400` | `#3eeed0` | 焦點框、科技點綴、資料 |
| 肉球粉 Toe Bean | `--ml-bean-400` | `#ff8fa8` | 腳印、可愛點綴 |
| 怒吼紅 Roar Red | `--ml-red-400` | `#ff5c48` | 危險 |
| 草原綠 Savanna Green | `--ml-green-400` | `#52e38a` | 成功 |
| 黑曜 Obsidian | `--ml-bg` | `#06070b` | Night Pride 背景 |

每個色相都是一組色階（例如 `--ml-gold-50` … `--ml-gold-900`），每種金屬也有對應的漸層：`--ml-metal-gold`、`--ml-metal-steel`、`--ml-metal-bronze`、`--ml-metal-cyan`、`--ml-metal-bean`。

## 設計原則

Malilion UI 遵守五條規則，新增元件時也請遵守。

1. **碼力獅切角**：左上、右下兩角斜切，像機械加工過的金屬板。根元素不裁切，外框與面板放在 `::before` / `::after` 上，所以焦點框與光暈不會被切掉。
2. **是金屬，不是扁平**：表面使用 `--ml-metal-*` 漸層——頂部高光帶、中段暗核、底部反光。
3. **科技要有意義**：電路青只留給焦點與資料；HUD 標籤、掃描線與能量格負責科技感。
4. **腳印是點綴**：肉球腳印與粉紅色只少量出現——一個章、一個標記、一下彈跳——永遠不搶金屬的主調。
5. **預設就無障礙**：每個互動元素都能用鍵盤操作、有清楚的青色「鎖定框」焦點，並在 `prefers-reduced-motion` 下收斂動畫。

## 本地開發

```bash
git clone https://github.com/malilion/MalilionUI.git
cd MalilionUI
npm install
```

常用指令：

```bash
npm run dev          # 文件站（playground/），http://127.0.0.1:5287
npm test             # Vitest 元件測試
npm run typecheck    # vue-tsc 型別檢查
npm run build        # 函式庫建置：dist/（ESM + style.css + .d.ts）
npm run screenshots  # 重新產生 README 圖片（需要本機 Google Chrome）
```

發布時 `prepublishOnly` 會自動跑型別檢查、測試與建置，不用手動 build。

新版本由 GitHub Actions 透過 npm Trusted Publishing 發布，不需要任何 token 或一次性密碼：

```bash
npm version minor    # 更新 package.json 版本並建立 tag，例如 v0.5.0
git push --follow-tags
```

`Publish` 工作流程會確認 tag 與 `package.json` 版本一致、跑完檢查，再附上來源證明（provenance）直接發布。

建置產物是 `dist/malilion-ui.js`（ESM）、`dist/style.css` 與 `dist/types/`（型別宣告）。Vue 是外部依賴，不會被打包進去。

文件站在 `playground/`。每個範例都是 `playground/examples/` 裡真正的 `.vue` 檔，同一個檔案既是即時預覽，也是可複製的原始碼，兩者永遠一致。每次推到 `main`，GitHub Actions 會跑檢查並把文件站部署到 GitHub Pages。

## 瀏覽器支援

支援 Chrome、Edge、Firefox、Safari 最新的兩個主要版本。元件使用現代 CSS（`clip-path`、`color-mix()`、`:has()`、獨立 transform 屬性、`@starting-style`）；較舊的瀏覽器仍可使用，但部分動畫會消失。元件可安全用於 SSR：瀏覽器 API 只在掛載後或事件處理中才會使用。

## 授權

MIT License，詳見 [LICENSE](https://github.com/malilion/MalilionUI/blob/main/LICENSE)。

獅徽與腳印是碼力獅的原創圖像，可隨元件庫一起自由使用。
