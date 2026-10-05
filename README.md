<h1>Malilion UI</h1>

<p align="right">
  English | <a href="https://github.com/malilion/MalilionUI/blob/main/README.zh-TW.md">繁體中文</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/logo.png" alt="Malilion UI" width="132" height="132">
</p>

<p align="center">Lion × tech × metal component library with cute paw prints, built for Vue 3 and TypeScript</p>

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
  <a href="https://malilion.github.io/MalilionUI/"><b>📖 Docs & live demos</b></a>
  &nbsp;·&nbsp;
  <a href="https://www.youtube.com/watch?v=ElXvObJbIFY"><b>▶️ Watch the trailer</b></a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/hero.png" alt="Malilion UI" width="100%">
</p>

Malilion UI is the component library of **Malilion (碼力獅)**, the "code lion". Every component is a machined armour plate: chamfered corners, polished lion gold, titanium and circuit-cyan glow. Then a trail of toe-bean paw prints walks through it all — radios press in a paw, buttons leave a stamp, tables let a little paw walk onto the row you hover — keeping the cool metal from ever feeling cold.

## Features

- 182 components across basic, layout, form, feedback, data display, charts, navigation, mobile and visual effects, plus ready-made templates
- Form validation built in: `MlForm` / `MlFormItem` rules (required, length, format, async) whose errors show up on every control
- Back-office forms from a schema: `MlSchemaForm` turns a field list (type, rules, `twRules`, conditional visibility, grid span) into a validated form, and `MlWizard` splits it into steps that each validate on their own
- Taiwan validators: `twRules.nationalId()` / `residentId()` / `businessId()` / `mobile()` / `landline()` / `mobileBarcode()` / `citizenCert()` / `postalCode()` drop into `MlForm` and React `<Form>` with localized messages, backed by framework-free checkers (`isTwNationalId`, `isTwBusinessId` with the Ministry of Finance's 2023 divisible-by-5 rule, `isTwLandline` per the official numbering plan…) and formatters like `formatTwPhone()`
- Rich pickers and overlays: searchable / multi-select combobox, autocomplete, time, date-time and colour pickers, drawer, popover, popconfirm
- i18n: Traditional Chinese and English built in — switch with `app.use(MalilionUI, { locale: en })` or `<MlConfigProvider>`, or bring your own strings
- Written in TypeScript, with typed props, slots and `GlobalComponents` for templates
- React too: `@malilion/ui/react` has every component (all 182) with the same markup as the Vue ones, ready for the Next.js App Router
- Framework-agnostic styling: every visual lives in `.ml-*` classes and `--ml-*` CSS variables, so React or plain HTML can use it too
- Two themes, dark **Night Pride** and light **Daylight Titanium**, switchable per page or per section
- The Malilion mascot built in: `MlMascot`, `<MlAvatar lion>`, and a napping lion for empty states
- Paw-print details everywhere: `MlPaw`, the `v-paw-stamp` directive, paw checkboxes, radios, loaders and progress runners
- Visual effects that stay on brand: count-up numbers, HUD text decryption, metal tilt with glare, border beams, spotlight grids, scroll reveals and paw-print bursts — all of them calm down under `prefers-reduced-motion`
- Accessible: keyboard navigation, focus trapping, ARIA wiring and `prefers-reduced-motion`
- On-demand loading ships only the components and styles you use; a Nuxt module too, and every component passes SSR and hydration tests
- Zero runtime dependencies — only Vue (or React) as a peer dependency

## What's New in 0.14

- **Docs in Vue or React**: a switch in the docs' top bar turns every page into React — imports from `@malilion/ui/react`, API tables with the real React props (read from the type definitions, with a "not in React" tag where a Vue prop has no twin) and example code converted to TSX. A conversion is shown only after it type-checks and renders the same markup as the Vue example; the few that don't yet show the Vue code with a note
- **Typography and identity**: `MlTitle` / `MlText` / `MlLink` (tones, ellipsis and line clamps, copyable text, safe external links), `MlAvatarGroup` (overlap, `+N` with the hidden names, expandable)
- **Forms**: `MlInputMask` (as-you-type masks with Taiwan presets — mobile, phone, 身分證, 統編, 民國 date, 載具, 3+3 zip), `MlAmountInput` (thousands separators and live 中文大寫), `MlNumberKeyboard` (PIN pads, shuffled digits, bottom sheet), `MlRichTextEditor` (Tiptap with the machined toolbar, from `@malilion/ui/editor`; Tiptap stays an optional peer)
- **Taiwan**: `calendar="roc"` on every date picker and the calendar (民國115/10/04, 民國 110 – 119 年) with `formatRocDate()` / `parseRocDate()`; `MlBarcode` (Code 128, Code 39 for 手機條碼載具 and 自然人憑證, EAN-13 with check digits); `MlTaiwanAddress` (縣市區, 3+3 postal code, 路段巷弄號樓, paste a whole address to split it, `parseTwAddress()`); `MlZhuyin` (注音 beside each character in textbook layout, or pinyin above; `zhuyinToPinyin()` / `pinyinToZhuyin()`)
- **Lists and data**: `MlIndexBar` (phone-book list with a draggable ㄅㄆㄇ / A–Z rail — Chinese names filed by the browser's 注音 collation, no dictionary), `MlFilterBar` and `MlQueryBuilder` (admin filters and nested AND / OR rules, with `matchFilters()` / `evaluateQuery()`), `MlScheduler` (week / day timetable with drag to move, resize and create)
- **Charts and media**: `MlWaterfallChart`, `MlBoxPlot`, `MlBulletChart`; `MlVideoPlayer` / `MlAudioPlayer` (steel control decks over native media with captions, speed, PiP and keyboard shortcuts)
- 182 components, every one in Vue and React

## What's New in 0.13

- **`MlCuteIcon`**: 52 sticker-style icons with blinking faces — animals, bubble tea and sweets, weather, everyday things and a tech workshop set (cyber lion, robot, chip, terminal, shield, database, bug…); `color`, brand `metal`, `mono` (currentColor) and `line` variants, six looping animations that can play on hover only
- **`MlPuzzle`**: a real jigsaw with interlocking tabs — drag a piece onto another or tap two to swap, placed pieces snap and lock, paw confetti and a `complete` event when solved; fully playable from the keyboard and announced to screen readers; works with any picture or as numbered tiles, `seed` for repeatable levels
- **`MlGlobe`**: a dotted orthographic Earth that spins, drags with inertia and turns with the arrow keys; markers, rising great-circle routes with a travelling glint, `flyTo()`; faces Taiwan by default; land mask from Natural Earth (public domain) in its own ~3 KB chunk
- **`MlSliderCaptcha`**: slide-the-jigsaw-piece check with the puzzle's tab shape, drag or keyboard, a recorded drag track and duration, `verify` for server-side judging, shake-and-retry and a fresh picture after too many misses
- **`MlScratchCard`**: brushed-metal scratch-off coating on a canvas with paw prints and a sheen; reveals past a threshold with paw confetti; SSR-safe CSS coating so nothing peeks; a reveal button for keyboard users
- **`MlGridLottery`** and **`MlGacha`**: the 九宮格 running light and a gacha machine (knob turns, capsules shake, one drops out and pops open) sharing one prize model — cute icons or images, weights, `draw(i)`, and `beforeDraw` Promises for server draws
- **Charts**: `MlTreemap` (squarified, nested groups, keyboard tiles), `MlSankey` (flows with gradient ribbons, hover tracing), `MlGantt` (day / week / month scales, dependencies, today line, drag or keyboard to move and resize) and `MlCandlestick` (Taiwan red-up by default, volume, moving averages, crosshair, zoom and pan)
- **Content**: `MlStickerPicker` (the cute icons with zh-TW search and recents, inline or as a popover beside a chat input), `MlComments` (threaded replies, paw likes, relative times, sorting), `MlSwipeStack` (swipe cards with stamps, undo and keyboard) and `MlInbox` (bell + notification centre with tabs, day groups, mark-all-read)
- **Taiwan**: `MlBankPicker` (every 財金資訊 member code with aliases, plus an account field), `MlLunarCalendar` (農曆, 24 節氣 and the statutory holidays of the 2025 紀念日及節日實施條例; with 人事行政總處's official 2024–2027 calendars — 補假, 調整放假, 補行上班 — built in; add later years or company days via `holidays`) and `MlInvoiceChecker` (統一發票 last-three quick check and full numbers, with your draw numbers)
- **Effects**: `MlAurora` (pure-CSS aurora backdrop), `MlParticles` (canvas constellation with paw particles and pointer play), `MlRadar` (HUD sweep with blips) and `MlClock` (brushed-metal analog clock with time zones and the lion crest)
- Custom locales only need the strings you change: anything missing (including strings added by newer components) is filled in from the built-in locale, via `completeLocale()`
- `MlRadar` uses the `ml-radar-scope` class block (`ml-radar` belongs to `MlRadarChart`); `MlInvoiceChecker` handles 雲端發票專屬獎 numbers; `registerTwBanks()` adds 農會 / 漁會 codes
- 161 components, every one in Vue and React

## What's New in 0.12.2

- **Bare URLs in CJK text**: `MlMarkdown` / `parseMarkdown` now end a bare URL at full-width punctuation (`。，、；：！？「」` …), so `see https://x.y/。` no longer links the 。 or the rest of the sentence. Full-width parens stay in only as a balanced pair (`…/獅子（動物）`), and a URL right after full-width punctuation (`網址：https://x.y`) is now linked too. English text is unaffected

## What's New in 0.12.1 — security release

A security pass over everything that renders untrusted text. Upgrading is recommended if you show Markdown or code from users or an LLM.

- **No more hangs on crafted input**: `MlMarkdown` / `parseMarkdown` and the syntax colouring behind `MlCodeBlock` and `MlCodeDiff` now run in linear time. Before, about 20 KB of crafted text (long runs of spaces, thousands of `[a](`, `**a` or unclosed `/*`) could freeze a tab for seconds to minutes; the same input now takes milliseconds
- **No more crashes on deep nesting**: quotes and lists deeper than 32 levels read as plain paragraphs, and emphasis deeper than 32 levels collapses to text, so `> > > …` ten thousand times can't overflow the stack
- **`MlCodeBlock` without `v-html`**: code is rendered as real elements (React: no `dangerouslySetInnerHTML`), so it works on sites that enforce Trusted Types
- **`safeHref()`**: `MlButton`, `MlListItem`, `MlBreadcrumb` and `MlMenuList` (and their React twins) drop `javascript:`, `vbscript:` and `data:` links; ordinary paths, http(s), `mailto:`, `tel:` and app schemes pass untouched. The helper is exported for your own links
- Highlighting is a little more accurate too: an apostrophe (`don't`) no longer opens a string, and a shell glob (`dist/*`) no longer turns the rest of the snippet into a comment
- CI actions are pinned to commit SHAs, and the npm publish job only runs from a version tag

## What's New in 0.12

- **Taiwan validators**: `twRules` for national / resident IDs, business IDs (the 2023 divisible-by-5 rule), mobile and landline numbers per the MODA numbering plan, e-invoice mobile-barcode and citizen-certificate carriers and postal codes — with formatters, for both Vue and React forms
- **`MlTaiwanMap`**: 22-county choropleth from 內政部國土測繪中心 open data, island insets, legend, keyboard neighbours, linked selection with `MlTaiwanRegion`; geometry loads only when used
- **Developer tools**: `MlTerminal` (typed-out commands, progress bars and spinners, SSR-friendly transcript), `MlCodeDiff` (split / unified diff with word-level marks, folding, git patches), `MlCopyButton` + `useClipboard()` (paw stamp on copy) and `MlJsonViewer` (searchable tree, path and value copy)
- **Mobile**: `MlBottomSheet` (snap points, flick to dismiss, modal or peek), `MlActionSheet` + `await actionSheet()`, `MlPullRefresh`, `MlSwipeCell` (full swipe, one open per group, keyboard menu) and `MlPickerView` (3D momentum wheels, cascading columns, date / time helpers)
- 139 components, every one in Vue and React

## What's New in 0.11

- **`MlCheckboxGroup`**: options or slotted `MlCheckbox` children, select-all with an indeterminate state, `min` / `max`, card layout, `MlForm` validation
- **`MlPasswordInput`**: show / hide, a strength meter (common passwords, sequences and keyboard walks score low), a live rules checklist and a Caps Lock warning; `scorePassword()` is exported
- **Month, quarter and year pickers**: `MlDatePicker type="month" | "quarter" | "year"` and month / year ranges in `MlDateRangePicker`, fully keyboard-driven
- **`MlThemeToggle` + `useTheme()`**: dark / light / system, remembered across visits and tabs, no flash on load (`themeInitScript()`, injected automatically by the Nuxt module), and a circular View Transition reveal from the toggle
- **`MlBarChart` series**: grouped, stacked and 100% stacked bars with totals, a legend that toggles series and a tooltip per category
- 128 components, every one in Vue and React

## What's New in 0.10

- **`MlLuckyWheel`**: a lion-gold prize wheel — chasing rim lights, a ticking pointer, a long ease-out with a tiny overshoot, paw confetti on the win; weighted odds or a server-decided result via `beforeSpin` (it starts spinning at once and brakes onto the answer)
- **`MlTaiwanRegion`**: 22 counties and 368 districts with 3-digit postal codes and official English names, from Chunghwa Post open data; linked selects or one search box that understands 台 / 臺, English and zip prefixes; works inside `MlForm`; the dataset (6 KB gzip) loads only when you use it, and helpers like `formatTaiwanAddress()` are exported
- **`MlScatterChart`**: scatter and bubble charts with trend lines, paw / diamond points, legend toggles and keyboard inspection
- **`MlTaiwanMap`**: choropleth of Taiwan's 22 counties (gold / teal scales, linear or quantile, legend, tooltip), click or Enter to select (single or multiple), arrow keys move between neighbouring counties, Penghu / Kinmen / Matsu in insets; outlines from the Ministry of the Interior's open data (~20 KB, loaded only when used)
- **`MlCodeDiff`**: code diff viewer — give it old and new code (Myers diff, built in) or a git patch with several files; split or unified, syntax colours, the exact changed words marked, ignore whitespace, folded context with “expand N lines”, n / p to jump between changes; real table markup with screen-reader markers, no `v-html`
- **`MlFunnelChart`**: conversion funnels with metal trapezoids, step and overall conversion, vertical or horizontal
- All four have React twins too, so the count stays complete: 125 components in Vue and React

## What's New in 0.9

- **React, complete**: every one of the 121 components now has a React twin in `@malilion/ui/react` — selects, date / time / colour pickers, upload, Table, Tree, Transfer, menus, Tour, Kanban, charts and effects — plus `<Form>` / `<FormItem>` validation sharing the Vue rules, and `<Loading>` / `usePawStamp()` for the directives
- **`MlMarkdown`**: zero-dependency Markdown built for AI chat — streams token by token without flicker, a paw caret, GFM tables and task lists, code blocks through `MlCodeBlock`, and XSS-safe by construction (no `v-html`)
- **`MlJsonViewer` + `MlCopyButton`**: a searchable, keyboard-navigable JSON tree for API responses (click a key to copy its path like `$.users[3].name`, a value to copy the value, big arrays paged 100 at a time, friendly parse errors with line / column) and a copy button with a paw-stamp check; both run on the framework-free `copyText()` / `useClipboard()` (Nuxt: `useMlClipboard()`), which falls back to `execCommand` outside secure contexts
- **`MlEllipsis`**: multi-line clamp that shows a tooltip only when text is really cut, expand / collapse, and middle ellipsis for hashes and file names
- **`MlScrollbar`**: metal overlay scrollbar over native scrolling — draggable thumbs, auto-hide, `reach-end`
- **`MlMasonry`**: waterfall layout into the shortest column, responsive columns, SSR-safe
- **`MlSignaturePad`**: smooth, speed / pressure-sensitive ink, undo, PNG / SVG export, survives resizes
- **`MlImageCropper`**: drag / resize / zoom / rotate, fixed ratios and a circle mask, keyboard controls, exports Blob / canvas — pairs with `MlUpload` and `MlAvatar`

## What's New in 0.8

- **On-demand loading**: `@malilion/ui/resolver` for unplugin-vue-components bundles only the components and styles you use (a page with a card, a button and a badge drops from 196 KB to 32 KB of CSS); or import `@malilion/ui/on-demand/MlButton` by hand
- **Nuxt module**: `modules: ['@malilion/ui/nuxt']` auto-imports components and composables, registers the directives and loads per-page styles
- **SSR**: every docs example passes server-side rendering and hydration tests
- **React**: `@malilion/ui/react` ships 45 components whose markup is checked against the Vue ones, ready for the Next.js App Router

## What's New in 0.7

- **i18n**: `MlConfigProvider` with built-in `zhTW` / `en`; every label, aria text, validation message and date format follows the locale
- **Table**: fixed columns, sticky header, built-in paging, expandable rows, tree data, ellipsis
- **`v-loading`**: a loading mask for any element, or `.fullscreen` for the whole page
- **Brand & dev components**: `MlHeatmap` (contribution graph, optionally paw-shaped cells), `MlCodeBlock`, `MlTour` (the lion gives the tour), `MlChat` / `MlChatMessage` / `MlChatInput`
- **Charts**: `MlRadarChart`, `MlGauge`
- **Interaction**: `MlMention`, `MlSortable` (mouse, touch and keyboard), `MlKanban`, `MlFloatButton`, `MlBanner`

## What's New in 0.6

22 new components plus `confirm()`, and the Malilion brand typefaces:

- **Layout**: `MlLayout` (app shell; the sidebar becomes a drawer on phones), `MlGrid` / `MlGridItem`, `MlSpace`
- **Form**: `MlDateRangePicker`, `MlCascader`, `MlTreeSelect`, `MlTagInput`, `MlPinInput`
- **Feedback**: `confirm()` / `confirm.danger()` / `confirm.prompt()` / `confirm.alert()`, `MlResult` (the lion stars on 403 · 404 · 500)
- **Data display**: `MlDescriptions`, `MlSplitter`, `MlVirtualList`, `MlInfiniteScroll`, `MlQRCode` (dependency-free encoder)
- **Charts**: `MlLineChart`
- **Navigation**: `MlMenu`, `MlCommandPalette` (⌘K), `MlContextMenu`, `MlAnchor`
- **Effects**: `MlCountdown`
- **Fonts**: bundled Malilion Display / Sans / Mono, plus the paw-print **Malilion Paw** (`.ml-font-paw`)

## What's New in 0.5

25 new components, all with keyboard support, ARIA wiring and docs pages:

- **Form**: `MlCombobox`, `MlAutocomplete`, `MlTimePicker`, `MlDateTimePicker`, `MlColorPicker`, `MlSegmented`, `MlRate`, `MlTransfer`, and `MlForm` / `MlFormItem` validation
- **Feedback**: `MlDrawer`, `MlPopover`, `MlPopconfirm`, `MlSkeleton` / `MlSkeletonItem`
- **Data display**: `MlTree`, `MlTimeline`, `MlImage` / `MlImagePreview`, `MlCarousel`, `MlWatermark`
- **Navigation**: `MlAffix`, `MlBackTop`
- Entrance and exit animations across existing components (alerts, tabs, calendar, charts, upload…)

## Installation

```bash
npm install @malilion/ui
```

```bash
yarn add @malilion/ui
```

```bash
pnpm add @malilion/ui
```

Malilion UI depends only on Vue and supports Vue 3.5 and above.

## Quick Start

```ts
// main.ts
import { createApp } from 'vue'
import MalilionUI from '@malilion/ui'
import '@malilion/ui/style.css'
import App from './App.vue'

createApp(App).use(MalilionUI).mount('#app')
```

Built-in UI text defaults to Traditional Chinese. For English: `import MalilionUI, { en } from '@malilion/ui'` and `app.use(MalilionUI, { locale: en })`, or wrap part of the page in `<MlConfigProvider :locale="en">`.

Night Pride (dark) / Daylight (light) / follow-the-OS: drop in `<MlThemeToggle />` (or call `useTheme()`); the choice is remembered in localStorage. Put `themeInitScript()` in an inline `<script>` in `<head>` so returning visitors never see a flash of the wrong theme — the Nuxt module does this for you and auto-imports `useMlTheme()`.

```vue
<template>
  <MlCard eyebrow="Pride / 01" title="Pride dashboard" rivets>
    <MlInput v-model="email" index="01" label="Email" type="email" />
    <template #footer>
      <MlButton variant="ghost">Cancel</MlButton>
      <MlButton stamp @click="open = true">Deploy</MlButton>
    </template>
  </MlCard>
</template>
```

Import components one by one instead of registering them all:

```ts
import { MlButton, MlCard } from '@malilion/ui'
```

Show toasts from anywhere — put one `<MlToastHost />` in `App.vue`, then:

```ts
import { useToast } from '@malilion/ui'

const toast = useToast()
toast('Roar!') // a paw toast by default
toast.success({ title: 'Deployed', message: 'v0.2 is live' })
```

The Malilion brand typefaces (Malilion Display / Sans / Mono) ship inside `style.css` — nothing to load. There is also **Malilion Paw**, a cute brand face where the dots on i, j and `. : ; ! ? …` are little paw prints (and `U+E000` is a full paw); use `class="ml-font-paw"` or `var(--ml-font-paw)`. Chinese text uses system fonts; add Noto Sans TC if you want consistent CJK glyphs across platforms:

```html
<link
  href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap"
  rel="stylesheet"
/>
```

## Gallery

| Buttons & badges | HUD forms |
| --- | --- |
| <img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/buttons.png" alt="Buttons and badges"> | <img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/forms.png" alt="Forms"> |
| **Alerts, progress, loaders & toasts** | **Tables, stats & avatars** |
| <img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/feedback.png" alt="Feedback"> | <img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/data.png" alt="Data display"> |
| **Tabs, dropdowns & tooltips** | **Modal** |
| <img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/navigation.png" alt="Navigation"> | <img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/modal.png" alt="Modal"> |
| **Charts & dashboards** | **Navigation, forms & empty states** |
| <img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/charts.png" alt="Charts"> | <img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/kit.png" alt="More components"> |
| **Calendar & date picker** | **Mobile screens** |
| <img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/calendar.png" alt="Calendar"> | <img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/mobile.png" alt="Mobile screens"> |
| **Pickers & form validation** | **Drawer, popover & skeleton** |
| <img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/pickers.png" alt="Pickers and validation"> | <img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/overlays.png" alt="Overlays"> |
| **Tree, timeline & transfer** | **Image, carousel & watermark** |
| <img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/structure.png" alt="Tree, timeline and transfer"> | <img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/media.png" alt="Media and utilities"> |
| **Paw prints · the cute side** | **Two themes** |
| <img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/paw.png" alt="Paw prints"> | <img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/themes.png" alt="Themes"> |

**Visual effects**

<img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/effects.png" alt="Visual effects" width="100%">

**0.14 · 民國 dates, mobile barcode, 注音 and addresses**

<img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/taiwan.png" alt="ROC calendar, mobile barcode, zhuyin and Taiwan address" width="100%">

**0.14 · Index bar, scheduler, avatar group and waterfall**

<img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/workflow.png" alt="Index bar, scheduler, avatar group and waterfall chart" width="100%">

**0.7 · Heatmap, gauge, radar, code block & chat**

<img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/devkit.png" alt="Heatmap, gauge, radar, code block and chat" width="100%">

**0.6 · Menu, line chart & descriptions**

<img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/workspace.png" alt="Menu, line chart and descriptions" width="100%">

**0.6 · Date range, cascader, tags & PIN**

<img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/inputs.png" alt="Date range, cascader, tag and PIN inputs" width="100%">

**0.6 · ⌘K palette, 404, QR code & countdown**

<img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/brand.png" alt="Command palette, 404, QR code and countdown" width="100%">

Every component has its own page on the [docs site](https://malilion.github.io/MalilionUI/) with live examples, copy-to-clipboard source and full API tables.

<img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/docs-site.png" alt="Docs site" width="100%">

Switch the docs to React and every page follows: React imports, React prop names in the API tables and example code converted to TSX.

<img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/docs-react.png" alt="Docs site in React mode" width="100%">

## Components

| Category | Components |
| --- | --- |
| Basic | `MlButton` · `MlBadge` · `MlTag` · `MlCard` · `MlDivider` · `MlTitle` / `MlText` / `MlLink` · `MlKbd` · `MlMascot` · `MlLionMark` · `MlPaw` · `MlIcon` · `MlCuteIcon` · `MlConfigProvider` · `MlThemeToggle` · `MlZhuyin` |
| Layout | `MlLayout` · `MlGrid` / `MlGridItem` · `MlSpace` · `MlScrollbar` · `MlMasonry` |
| Form | `MlInput` · `MlPasswordInput` · `MlTextarea` · `MlSelect` · `MlCombobox` · `MlAutocomplete` · `MlDatePicker` · `MlTimePicker` · `MlDateTimePicker` · `MlNumberInput` · `MlSlider` · `MlRate` · `MlColorPicker` · `MlCheckbox` · `MlCheckboxGroup` · `MlRadioGroup` / `MlRadio` · `MlSwitch` · `MlSegmented` · `MlTransfer` · `MlUpload` · `MlField` · `MlForm` / `MlFormItem` · `MlDateRangePicker` · `MlCascader` · `MlTreeSelect` · `MlTagInput` · `MlPinInput` · `MlSliderCaptcha` · `MlMention` · `MlSignaturePad` · `MlImageCropper` · `MlTaiwanRegion` · `MlBankPicker` · `MlInvoiceChecker` · `MlStickerPicker` · `MlRichTextEditor` (`@malilion/ui/editor`) · `MlInputMask` · `MlAmountInput` · `MlFilterBar` · `MlQueryBuilder` · `MlTaiwanAddress` · `MlSchemaForm` · `MlWizard` |
| Feedback | `MlAlert` · `toast()` / `MlToastHost` · `MlProgress` · `MlLoader` · `MlModal` · `MlDrawer` · `MlTooltip` · `MlPopover` · `MlPopconfirm` · `MlSkeleton` · `MlEmpty` · `confirm()` / `MlDialogHost` · `MlResult` · `MlTour` · `MlBanner` · `v-loading` · `MlInbox` |
| Data display | `MlTable` · `MlCalendar` · `MlAccordion` · `MlTree` · `MlTimeline` · `MlImage` / `MlImagePreview` · `MlCarousel` · `MlWatermark` · `MlAvatar` · `MlAvatarGroup` · `MlStat` · `MlDescriptions` · `MlSplitter` · `MlVirtualList` · `MlInfiniteScroll` · `MlQRCode` · `MlBarcode` · `MlCodeBlock` · `MlCodeDiff` · `MlCopyButton` · `MlJsonViewer` · `MlChat` / `MlChatMessage` / `MlChatInput` · `MlSortable` · `MlKanban` · `MlMarkdown` · `MlEllipsis` · `MlLunarCalendar` · `MlComments` · `MlScheduler` · `MlVideoPlayer` · `MlAudioPlayer` |
| Charts | `MlBarChart` · `MlDonut` · `MlRing` · `MlSparkline` · `MlLineChart` · `MlHeatmap` · `MlRadarChart` · `MlGauge` · `MlScatterChart` · `MlFunnelChart` · `MlTaiwanMap` · `MlGlobe` · `MlTreemap` · `MlSankey` · `MlGantt` · `MlCandlestick` · `MlWaterfallChart` · `MlBoxPlot` · `MlBulletChart` |
| Navigation | `MlTabs` · `MlDropdown` · `MlBreadcrumb` · `MlPagination` · `MlSteps` · `MlAffix` · `MlBackTop` · `MlMenu` · `MlCommandPalette` · `MlContextMenu` · `MlAnchor` · `MlFloatButton` |
| Mobile | `MlPhone` · `MlNavBar` · `MlTabBar` · `MlList` / `MlListItem` · `MlPickerView` · `MlBottomSheet` · `MlActionSheet` / `actionSheet()` · `MlPullRefresh` · `MlSwipeCell` · `MlSwipeStack` · `MlNumberKeyboard` · `MlIndexBar` |
| Effects | `MlCountUp` · `MlDecryptText` · `MlTilt` · `MlBorderBeam` · `MlMarquee` · `MlReveal` · `MlSpotlight` · `MlPawBurst` / `pawBurst()` · `MlCountdown` · `MlLuckyWheel` · `MlTerminal` · `MlPuzzle` · `MlScratchCard` · `MlGridLottery` · `MlGacha` · `MlAurora` · `MlParticles` · `MlRadar` · `MlClock` |
| Directive | `v-paw-stamp` · `v-loading` |

## Component Props

Every component accepts the usual attributes (`class`, `style`, `aria-*`, listeners). Form controls put `class` / `style` on their wrapper and everything else on the native element, so `name`, `autocomplete` and friends just work. A few of the most used props:

| Component | Prop | Type | Default | Description |
| --- | --- | --- | --- | --- |
| MlButton | variant | `'primary' \| 'steel' \| 'outline' \| 'tech' \| 'ghost' \| 'danger'` | `'primary'` | Plate style |
| MlButton | stamp | `boolean \| 'gold' \| 'bean' \| 'steel' \| 'tech'` | `false` | Leave a paw print where it's pressed |
| MlCard | variant | `'plate' \| 'gold' \| 'steel' \| 'tech'` | `'plate'` | Shell; add `rivets` or `interactive` |
| MlInput | index / label / hint / error | string | — | HUD label number, label, help text, error (wired to `aria-describedby`) |
| MlProgress | value | `number \| null` | `null` | Omit for an indeterminate scan; add `paw` for a running paw |
| MlTable | v-model:sort / v-model:selected | `MlTableSort \| null` / `Key[]` | `null` / `[]` | Sorting and row selection |
| MlCombobox | searchable / multiple / clearable | boolean | `false` | Custom listbox select; `multiple` makes v-model an array |
| MlForm | model / rules | `object` / `MlFormRules` | — | Wrap fields in `MlFormItem prop="…"`; errors flow into the controls |
| MlDrawer | placement / size | `'right' \| 'left' \| 'top' \| 'bottom'` / `number \| string` | `'right'` / `420` | Edge panel with focus trap and scroll lock |
| MlTimePicker | v-model / minute-step / min / max | `string \| null` / number / string | `null` / `1` / — | `"HH:mm"` wheels; `seconds` adds a column |
| MlTree | v-model:expanded / selected / checked | `Key[]` / `Key \| null` / `Key[]` | `[]` / `null` / `[]` | Add `checkable` for tri-state checks, `filter` to search |
| MlCarousel | items / autoplay / v-model:index | `T[]` / ms / number | — / `0` / `0` | Slides come from the default slot `{ item, index }` |
| MlReveal | effect / stagger | `'fade-up' \| 'zoom' \| 'blur' \| …` / ms | `'fade-up'` / `0` | Animate in when scrolled into view; `stagger` plays children one by one |
| MlDropdown | selectable | boolean | `false` | Single-choice menu; v-model holds the value, marked with a paw |
| MlMascot | pose / frame | `'avatar' \| 'full'` / `'none' \| 'ring' \| 'hex'` | `'avatar'` / `'none'` | The Malilion lion, as a portrait or full body |
| MlBarChart | data / highlight / series / labels / mode / showTotal | `{ label, value }[]` / `'max' \| number \| null` / `MlBarSeries[]` / `string[]` / `'grouped' \| 'stacked' \| 'percent'` / `boolean` | — / `'max'` / — / — / `'grouped'` / `false` | Bars with round-number ticks; the peak lights up. Pass `series` for grouped, stacked or 100% stacked bars with a toggleable legend |
| MlPaw | tone | `'gold' \| 'bean' \| 'steel' \| 'tech' \| 'current'` | `'gold'` | `current` follows the text colour |

The full list for every component lives on the [docs site](https://malilion.github.io/MalilionUI/).

```typescript
import type { MlButtonVariant, MlTableColumn, MlToastOptions, MlPawTone } from '@malilion/ui'
```

## On-demand Loading

Only ship the components you use. With [unplugin-vue-components](https://github.com/unplugin/unplugin-vue-components), each component a template uses is imported together with just its own styles — no `app.use`, no full `style.css`:

```ts
// vite.config.ts
import vue from '@vitejs/plugin-vue'
import Components from 'unplugin-vue-components/vite'
import { MalilionResolver } from '@malilion/ui/resolver'

export default defineConfig({
  plugins: [vue(), Components({ resolvers: [MalilionResolver()] })],
})
```

Without auto-import, import each component's style entry once (fonts, tokens and the styles of components it uses inside come along; shared files load once):

```ts
import '@malilion/ui/on-demand/MlButton'
import '@malilion/ui/on-demand/MlCombobox'
import { MlButton, MlCombobox } from '@malilion/ui'
```

A page using only a card, a button and a badge ships about 32 KB of CSS (the full stylesheet is 196 KB).

## Nuxt

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@malilion/ui/nuxt'],
  malilion: { locale: 'en' }, // optional: css: 'on-demand' | 'full' | false, prefix
})
```

The module auto-imports every component plus `useToast` / `useConfirm` / `useActionSheet`, registers `v-paw-stamp` and `v-loading`, and by default loads only the styles of the components each page uses. Every component passes server-side rendering and hydration tests.

## React / Next.js

`@malilion/ui/react` ships React components that render exactly the same markup as the Vue ones (an automated test compares every pair), styled by the same stylesheet. Works with React 18 / 19 and directly inside Next.js App Router Server Components (the entry is marked `'use client'`).

```tsx
import '@malilion/ui/style.css'
import { Button, Card, ToastHost, toast } from '@malilion/ui/react'

export default function Page() {
  return (
    <>
      <Card eyebrow="Pride / 01" title="Pride dashboard">
        <Button stamp onClick={() => toast('Roar!')}>Deploy</Button>
      </Card>
      <ToastHost />
    </>
  )
}
```

Form controls follow React conventions: `value` + `onChange` is controlled, `defaultValue` is uncontrolled. For i18n wrap with `<ConfigProvider locale={en}>`.

Every Vue component has a React twin named without the `Ml` prefix (`MlDatePicker` → `DatePicker`). `v-model` maps to `value` / `defaultValue` / `onChange`, `v-model:open` to `open` / `onOpenChange`, named slots to props or render functions, and the directives `v-loading` / `v-paw-stamp` to `<Loading>` / `usePawStamp()`. `<Form>` + `<FormItem>` validate React fields with the same rules as the Vue version.

## Rich-text Editor

`MlRichTextEditor` (React: `RichTextEditor`) wraps [Tiptap](https://tiptap.dev) in a machined toolbar: headings, marks, lists, quote, code block, divider, links (⌘K / Ctrl+K, script URLs refused) and undo. `v-model` is HTML (`''` when empty), it validates inside `MlFormItem`, and the toolbar is a keyboard-navigable `role="toolbar"`. Tiptap is an **optional** peer dependency, so it lives in its own entry:

```bash
npm i @tiptap/core @tiptap/pm @tiptap/starter-kit @tiptap/extensions
```

```ts
import { MlRichTextEditor } from '@malilion/ui/editor'        // Vue
import { RichTextEditor } from '@malilion/ui/react/editor'    // React
```

Its styles are part of `style.css`. To show saved HTML elsewhere with the same look, sanitize it on the server and render it inside `.ml-prose`. The Nuxt module and the resolver pick the editor up automatically once Tiptap is installed.

## Using the CSS Directly

Not on Vue? Import the stylesheet and write the classes — the templates in `src/components/*.vue` show the markup.

```tsx
import '@malilion/ui/style.css'

export function DeployButton() {
  return <button className="ml-btn ml-btn--primary ml-btn--md">Deploy</button>
}
```

Only want the design tokens (colours, metal gradients, fonts, easing)?

```ts
import '@malilion/ui/css/tokens.css'
```

## Themes

Dark is the default. Set `data-ml-theme` on any ancestor (usually `<html>`), or on one section to theme just that part:

```html
<html data-ml-theme="light">
  <body class="ml-app">…</body>
</html>
```

`ml-app` is optional: it adds the full-page backdrop (lion-gold glow and grid), text colour and fonts. The library never styles bare elements.

## Palette

| Name | Token | Value | Usage |
| --- | --- | --- | --- |
| Lion Gold | `--ml-gold-400` | `#f0ad2f` | Primary accent, metal rims |
| Mane Bronze | `--ml-bronze-400` | `#cd7631` | Mane, warm metal |
| Titanium | `--ml-steel-300` | `#9ea7b5` | Secondary metal, muted UI |
| Circuit Cyan | `--ml-cyan-400` | `#3eeed0` | Focus ring, tech accents, data |
| Toe Bean | `--ml-bean-400` | `#ff8fa8` | Paw prints, the cute accent |
| Roar Red | `--ml-red-400` | `#ff5c48` | Danger |
| Savanna Green | `--ml-green-400` | `#52e38a` | Success |
| Obsidian | `--ml-bg` | `#06070b` | Night Pride background |

Each hue comes as a scale (for example `--ml-gold-50` … `--ml-gold-900`), and each metal has a gradient: `--ml-metal-gold`, `--ml-metal-steel`, `--ml-metal-bronze`, `--ml-metal-cyan`, `--ml-metal-bean`.

## Design Principles

Malilion UI follows five rules. Respect them when adding new components.

1. **The Malilion cut**: top-left and bottom-right corners are chamfered like a machined plate. The root is never clipped — the rim and face live on `::before` / `::after` — so focus rings and glows survive.
2. **Metal, not flat**: surfaces use `--ml-metal-*` gradients with a specular band on top, a dark core and a reflected rim at the bottom.
3. **Tech for meaning**: circuit cyan is reserved for focus and data; HUD labels, scanlines and energy cells carry the tech feel.
4. **Paws as an accent**: toe-bean prints and pink appear in small doses — a stamp, a marker, a pop — and never override the metal.
5. **Accessible by default**: every interactive part is keyboard reachable, has a visible cyan "target lock" focus ring, and calms down under `prefers-reduced-motion`.

## Local Development

```bash
git clone https://github.com/malilion/MalilionUI.git
cd MalilionUI
npm install
```

Common scripts:

```bash
npm run dev          # Docs site (playground/) at http://127.0.0.1:5287
npm test             # Vitest component tests
npm run typecheck    # vue-tsc type check
npm run build        # Library build: dist/ (ESM + style.css + .d.ts)
npm run screenshots  # Regenerate the README images (needs Google Chrome)
```

`prepublishOnly` runs the type check, the tests and the build on publish, so there is no need to build manually.

Releases are published by GitHub Actions through npm Trusted Publishing — no tokens or one-time passwords:

```bash
npm version minor    # bumps package.json and creates the tag, e.g. v0.5.0
git push --follow-tags
```

The `Publish` workflow checks that the tag matches `package.json`, runs the checks and publishes with a provenance attestation.

The build output is `dist/malilion-ui.js` (ESM), `dist/style.css` and `dist/types/` (type declarations). Vue is external and is not bundled.

The docs site lives in `playground/`. Every example is a real `.vue` file in `playground/examples/` that is both rendered live and shown as copyable source, so the two can never drift apart. The React mode converts those same files to TSX (`playground/convert/vue-to-react.ts`) and shows a conversion only after `tests/react/examples.test.tsx` has type-checked it and matched its server-rendered markup to the Vue example; after adding or changing examples, refresh that list with `npx vitest run tests/react/examples.test.tsx -u`. Every push to `main` runs the checks in GitHub Actions and deploys the site to GitHub Pages.

## Security

- Markdown, JSON, diffs and terminal output are rendered as real elements, never as HTML strings; raw HTML in Markdown shows as text and unsafe link schemes are removed
- Parsers are linear-time and nesting is capped, so hostile input can't hang or crash the page; `tests/security.test.ts` guards this
- Links passed as props go through `safeHref()`. Validate URLs from users yourself as well if you put them in other attributes
- Releases are published from GitHub Actions with npm Trusted Publishing and provenance — no npm token exists

Found a vulnerability? Please report it privately through [GitHub security advisories](https://github.com/malilion/MalilionUI/security/advisories/new) rather than a public issue.

## Browser Support

Malilion UI targets the last two major versions of Chrome, Edge, Firefox and Safari. It relies on modern CSS (`clip-path`, `color-mix()`, `:has()`, individual transform properties, `@starting-style`); older browsers still work but lose some animations. Components are SSR-safe: browser APIs are only touched after mount or in event handlers.

## License

MIT License. See [LICENSE](https://github.com/malilion/MalilionUI/blob/main/LICENSE).

The lion crest and paw prints are original artwork by Malilion, free to use along with the library.
