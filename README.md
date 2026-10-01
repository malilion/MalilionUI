# MalilionUI · 碼力獅元件庫

> 以**獅子**為魂、**科技**為骨、**金屬**為甲。

碼力獅專屬的 Vue 3 元件庫：切角機甲板、拋光獅金、鈦合金與電路青光。
預設是深色的 **Night Pride** 主題，另有淺色的 **Daylight Titanium** 主題。

- 20 個元件，Vue 3.5+ / TypeScript，完整型別
- 樣式與框架無關：所有視覺都在 `.ml-*` class 與 `--ml-*` CSS 變數裡，React / Next / 原生網頁也能直接用
- 執行期零依賴（Vue 是 peer dependency），JS ≈ 10 KB gzip、CSS ≈ 9 KB gzip
- 無障礙：鍵盤操作、焦點鎖定、ARIA 關聯，並支援 `prefers-reduced-motion`

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
| `MlButton` | `primary` / `steel` / `outline` / `tech` / `ghost` / `danger`，`sm` / `md` / `lg`，`loading`、`square`、`href` |
| `MlCard` | `plate` / `gold` / `steel` / `tech` 外殼，`rivets` 鉚釘、`interactive` 浮起發光；`#header`、`#actions`、`#footer` 插槽 |
| `MlBadge` | `gold` / `steel` / `tech` / `success` / `danger`，`solid`、`dot`、`pulse` |
| `MlInput` / `MlTextarea` / `MlSelect` | HUD 欄位，`label`、`index`、`hint`、`error`，`#prefix` / `#suffix` |
| `MlField` | 給自訂控制項用的 label / hint / error 外框 |
| `MlSwitch` | `v-model`，`tone="tech"`，`show-state` 顯示 ON/OFF |
| `MlCheckbox` | `v-model`，`hint` |
| `MlProgress` | 能量條；不給 `value` 即為不確定進度，`striped`、`smooth`、四種 `tone` |
| `MlTabs` | `line` 金色墨線 / `plate` 滑動金屬板，用 `#<value>` 具名插槽放面板內容 |
| `MlModal` | `v-model:open`，Esc / 點背景關閉、焦點鎖定、多層對話框共用捲動鎖 |
| `MlTooltip` | `top` / `bottom` / `left` / `right`，自動設定 `aria-describedby` |
| `MlAvatar` | 六角徽章頭像，`ring`、`status`，圖片失敗時退回縮寫；`.ml-avatar-group` 可疊放 |
| `MlAlert` | `info` / `success` / `warning` / `danger`，角落有三道獅爪痕，`closable` |
| `MlLoader` | Mane Reactor 載入器 |
| `MlStat` | HUD 數據，`delta` 正負自動上色 |
| `MlDivider` | `label` 或 `claw` 獅爪分隔線 |
| `MlLionMark` | 多面體金屬獅徽，`glow`、`animated` |
| `MlIcon` | 內建的少量圖示 |

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
      <MlButton @click="open = true">部署</MlButton>
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
| **科技** | 電路青作為焦點與資料色、HUD 標籤、掃描線、能量格 |
| **焦點** | 青色矩形「鎖定框」，在深色與淺色主題都清楚可見 |

## 開發

```bash
npm install
npm run dev          # 元件展示頁（playground/）
npm test             # Vitest 元件測試
npm run typecheck    # vue-tsc 型別檢查
npm run build        # 輸出 dist/：ESM + style.css + .d.ts
```

## 專案結構

```
src/
  index.ts              # 外掛 + 具名匯出 + GlobalComponents 型別
  types.ts              # 公開型別
  composables.ts        # attrs 分流、捲動鎖
  components/           # Ml*.vue
  styles/
    tokens.css          # 設計代幣（兩套主題）
    base.css            # .ml-app 外殼、工具 class、keyframes
    components/*.css    # 每個元件的樣式
playground/             # 展示頁
tests/                  # 元件測試
```
