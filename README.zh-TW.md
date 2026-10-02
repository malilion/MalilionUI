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

- 48 個元件，涵蓋基礎、表單、回饋、資料展示、圖表、導覽與行動版，另附現成的版型範例
- 以 TypeScript 撰寫，props、插槽與模板裡的全域元件都有完整型別
- 樣式與框架無關：所有外觀都在 `.ml-*` class 與 `--ml-*` CSS 變數裡，React 或原生網頁也能用
- 兩套主題：深色 **Night Pride** 與淺色 **Daylight Titanium**，可整頁或局部切換
- 內建碼力獅吉祥物：`MlMascot`、`<MlAvatar lion>`，空狀態還有睡著的小獅子
- 處處都有腳印：`MlPaw`、`v-paw-stamp` 蓋章指令、腳印勾選框、單選、載入器與進度條跑者
- 無障礙：鍵盤操作、焦點鎖定、ARIA 關聯，並支援 `prefers-reduced-motion`
- 執行期零依賴，只需要 Vue 作為 peer dependency

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

載入字體可以得到完整的機甲風格（沒有的話會退回系統字體）：

```html
<link
  href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;600&family=Noto+Sans+TC:wght@400;500;700&display=swap"
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
| **獅掌腳印 · 可愛風格** | **雙主題** |
| <img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/paw.png" alt="獅掌腳印"> | <img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/themes.png" alt="雙主題"> |

每個元件在[文件站](https://malilion.github.io/MalilionUI/)都有自己的頁面：即時範例、一鍵複製原始碼與完整 API 表。

<img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/docs-site.png" alt="文件站" width="100%">

## 元件一覽

| 分類 | 元件 |
| --- | --- |
| 基礎 | `MlButton` · `MlBadge` · `MlTag` · `MlCard` · `MlDivider` · `MlKbd` · `MlMascot` · `MlLionMark` · `MlPaw` · `MlIcon` |
| 表單 | `MlInput` · `MlTextarea` · `MlSelect` · `MlCombobox` · `MlAutocomplete` · `MlDatePicker` · `MlTimePicker` · `MlDateTimePicker` · `MlNumberInput` · `MlSlider` · `MlRate` · `MlColorPicker` · `MlCheckbox` · `MlRadioGroup` / `MlRadio` · `MlSwitch` · `MlSegmented` · `MlTransfer` · `MlUpload` · `MlField` · `MlForm` / `MlFormItem` |
| 回饋 | `MlAlert` · `toast()` / `MlToastHost` · `MlProgress` · `MlLoader` · `MlModal` · `MlDrawer` · `MlTooltip` · `MlPopover` · `MlPopconfirm` · `MlSkeleton` · `MlEmpty` |
| 資料展示 | `MlTable` · `MlCalendar` · `MlAccordion` · `MlTree` · `MlTimeline` · `MlImage` / `MlImagePreview` · `MlCarousel` · `MlWatermark` · `MlAvatar` · `MlStat` |
| 圖表 | `MlBarChart` · `MlDonut` · `MlRing` · `MlSparkline` |
| 導覽 | `MlTabs` · `MlDropdown` · `MlBreadcrumb` · `MlPagination` · `MlSteps` · `MlAffix` · `MlBackTop` |
| 行動版 | `MlPhone` · `MlNavBar` · `MlTabBar` · `MlList` / `MlListItem` |
| 指令 | `v-paw-stamp` |

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
| MlDropdown | selectable | boolean | `false` | 單選選單；v-model 存選中的值，並用腳印標記 |
| MlMascot | pose / frame | `'avatar' \| 'full'` / `'none' \| 'ring' \| 'hex'` | `'avatar'` / `'none'` | 碼力獅本獅，頭像或全身 |
| MlBarChart | data / highlight | `{ label, value }[]` / `'max' \| number \| null` | — / `'max'` | 自動取整數刻度，最高的一根會亮起 |
| MlPaw | tone | `'gold' \| 'bean' \| 'steel' \| 'tech' \| 'current'` | `'gold'` | `current` 會跟隨文字顏色 |

每個元件的完整屬性都在[文件站](https://malilion.github.io/MalilionUI/)。

```typescript
import type { MlButtonVariant, MlTableColumn, MlToastOptions, MlPawTone } from '@malilion/ui'
```

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
npm version minor    # 更新 package.json 版本並建立 tag，例如 v0.4.0
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
