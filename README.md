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
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/hero.png" alt="Malilion UI" width="100%">
</p>

Malilion UI is the component library of **Malilion (碼力獅)**, the "code lion". Every component is a machined armour plate: chamfered corners, polished lion gold, titanium and circuit-cyan glow. Then a trail of toe-bean paw prints walks through it all — radios press in a paw, buttons leave a stamp, tables let a little paw walk onto the row you hover — keeping the cool metal from ever feeling cold.

## Features

- 41 components across basic, form, feedback, data display, charts and navigation, plus ready-made templates
- Written in TypeScript, with typed props, slots and `GlobalComponents` for templates
- Framework-agnostic styling: every visual lives in `.ml-*` classes and `--ml-*` CSS variables, so React or plain HTML can use it too
- Two themes, dark **Night Pride** and light **Daylight Titanium**, switchable per page or per section
- The Malilion mascot built in: `MlMascot`, `<MlAvatar lion>`, and a napping lion for empty states
- Paw-print details everywhere: `MlPaw`, the `v-paw-stamp` directive, paw checkboxes, radios, loaders and progress runners
- Accessible: keyboard navigation, focus trapping, ARIA wiring and `prefers-reduced-motion`
- Zero runtime dependencies — only Vue as a peer dependency

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

Load the fonts for the full mech look (the components fall back to system fonts without them):

```html
<link
  href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;600&family=Noto+Sans+TC:wght@400;500;700&display=swap"
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
| **Paw prints · the cute side** | **Two themes** |
| <img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/paw.png" alt="Paw prints"> | <img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/themes.png" alt="Themes"> |

Every component has its own page on the [docs site](https://malilion.github.io/MalilionUI/) with live examples, copy-to-clipboard source and full API tables.

<img src="https://raw.githubusercontent.com/malilion/MalilionUI/main/docs/images/docs-site.png" alt="Docs site" width="100%">

## Components

| Category | Components |
| --- | --- |
| Basic | `MlButton` · `MlBadge` · `MlTag` · `MlCard` · `MlDivider` · `MlKbd` · `MlMascot` · `MlLionMark` · `MlPaw` · `MlIcon` |
| Form | `MlInput` · `MlTextarea` · `MlSelect` · `MlNumberInput` · `MlSlider` · `MlCheckbox` · `MlRadioGroup` / `MlRadio` · `MlSwitch` · `MlUpload` · `MlField` |
| Feedback | `MlAlert` · `toast()` / `MlToastHost` · `MlProgress` · `MlLoader` · `MlModal` · `MlTooltip` · `MlEmpty` |
| Data display | `MlTable` · `MlAccordion` · `MlAvatar` · `MlStat` |
| Charts | `MlBarChart` · `MlDonut` · `MlRing` · `MlSparkline` |
| Navigation | `MlTabs` · `MlDropdown` · `MlBreadcrumb` · `MlPagination` · `MlSteps` |
| Directive | `v-paw-stamp` |

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
| MlDropdown | selectable | boolean | `false` | Single-choice menu; v-model holds the value, marked with a paw |
| MlMascot | pose / frame | `'avatar' \| 'full'` / `'none' \| 'ring' \| 'hex'` | `'avatar'` / `'none'` | The Malilion lion, as a portrait or full body |
| MlBarChart | data / highlight | `{ label, value }[]` / `'max' \| number \| null` | — / `'max'` | Bars with round-number ticks; the peak lights up |
| MlPaw | tone | `'gold' \| 'bean' \| 'steel' \| 'tech' \| 'current'` | `'gold'` | `current` follows the text colour |

The full list for every component lives on the [docs site](https://malilion.github.io/MalilionUI/).

```typescript
import type { MlButtonVariant, MlTableColumn, MlToastOptions, MlPawTone } from '@malilion/ui'
```

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
npm version minor    # bumps package.json and creates the tag, e.g. v0.4.0
git push --follow-tags
```

The `Publish` workflow checks that the tag matches `package.json`, runs the checks and publishes with a provenance attestation.

The build output is `dist/malilion-ui.js` (ESM), `dist/style.css` and `dist/types/` (type declarations). Vue is external and is not bundled.

The docs site lives in `playground/`. Every example is a real `.vue` file in `playground/examples/` that is both rendered live and shown as copyable source, so the two can never drift apart. Every push to `main` runs the checks in GitHub Actions and deploys the site to GitHub Pages.

## Browser Support

Malilion UI targets the last two major versions of Chrome, Edge, Firefox and Safari. It relies on modern CSS (`clip-path`, `color-mix()`, `:has()`, individual transform properties, `@starting-style`); older browsers still work but lose some animations. Components are SSR-safe: browser APIs are only touched after mount or in event handlers.

## License

MIT License. See [LICENSE](https://github.com/malilion/MalilionUI/blob/main/LICENSE).

The lion crest and paw prints are original artwork by Malilion, free to use along with the library.
