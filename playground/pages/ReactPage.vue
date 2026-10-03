<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import CodeBlock from '../components/CodeBlock.vue'
import PageHeader from '../components/PageHeader.vue'
import demoSource from '../react/Demo.tsx?raw'

// A real React root inside the Vue docs site, rendering @malilion/ui/react.
const host = ref<HTMLElement>()
let unmount: (() => void) | undefined

// Loaded through import.meta.glob so vue-tsc (which checks this Vue site) never
// type-checks the React TSX; tsconfig.react.json covers that file.
const demoModule = import.meta.glob<{ Demo: () => unknown }>('../react/Demo.tsx')

onMounted(async () => {
  const [{ createElement }, { createRoot }, { Demo }] = await Promise.all([
    import('react'),
    import('react-dom/client'),
    demoModule['../react/Demo.tsx'](),
  ])
  if (!host.value) return
  const root = createRoot(host.value)
  root.render(createElement(Demo as () => null))
  unmount = () => root.unmount()
})
onBeforeUnmount(() => unmount?.())

const install = `npm i @malilion/ui react react-dom`
const usage = `import '@malilion/ui/style.css'
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
}`
const components = [
  'Button', 'Badge', 'Tag', 'Kbd', 'Divider', 'Paw', 'Icon', 'Card', 'Alert', 'Banner', 'Result', 'Empty', 'Mascot',
  'Avatar', 'Stat', 'Progress', 'Loader', 'Skeleton', 'Breadcrumb', 'Steps', 'Descriptions', 'Timeline', 'Field',
  'Input', 'Textarea', 'Checkbox', 'Switch', 'RadioGroup', 'Radio', 'Tabs', 'Segmented', 'Pagination', 'Tooltip',
  'Modal', 'ToastHost', 'Ring', 'Sparkline', 'BarChart', 'Donut', 'Heatmap', 'Gauge', 'RadarChart', 'QRCode',
  'CodeBlock', 'Countdown', 'ConfigProvider', 'Select', 'Combobox', 'Autocomplete', 'Cascader', 'TreeSelect',
  'Calendar', 'DatePicker', 'DateRangePicker', 'DateTimePicker', 'TimePicker', 'ColorPicker', 'Upload', 'Drawer',
  'Popover', 'Dropdown', 'Popconfirm', 'DialogHost', 'CommandPalette', 'Table', 'Tree', 'Transfer', 'VirtualList',
]
</script>

<template>
  <article>
    <PageHeader
      eyebrow="Getting started / 開始"
      title="React"
      zh="React 與 Next.js"
      desc="@malilion/ui/react 提供 67 個 React 元件，輸出的 HTML 結構和 Vue 版一模一樣（有自動化測試逐一比對），共用同一份樣式。支援 React 18 / 19，Next.js App Router 的 Server Component 可以直接使用。"
    />

    <section class="block">
      <h2>即時示範</h2>
      <p class="note">下面這一塊是真的 React 在跑（不是 Vue）：切換語言、按按鈕、開對話框都可以試。</p>
      <div ref="host" class="stage" />
    </section>

    <section class="block">
      <h2>安裝與使用</h2>
      <CodeBlock :code="install" lang="bash" filename="terminal" />
      <CodeBlock :code="usage" lang="tsx" filename="app/page.tsx" />
      <p class="note">表單元件照 React 慣例：<code>value</code> + <code>onChange</code> 為受控，<code>defaultValue</code> 為非受控。多語系用 <code>&lt;ConfigProvider locale={en}&gt;</code>。</p>
    </section>

    <section class="block">
      <h2>目前提供的元件</h2>
      <div class="chips">
        <MlTag v-for="c in components" :key="c" tone="tech" variant="outline">{{ c }}</MlTag>
      </div>
      <p class="note">選單、表單驗證、其餘輸入元件（Slider、Rate、數字／PIN／標籤輸入、Mention）、版面工具與特效類元件目前只有 Vue 版，會陸續補上。</p>
    </section>

    <section class="block">
      <h2>上面示範的原始碼</h2>
      <CodeBlock :code="demoSource" lang="tsx" filename="Demo.tsx" collapsible />
    </section>
  </article>
</template>

<style scoped>
.block {
  display: grid;
  gap: 14px;
  margin-top: 40px;
}

.block h2 {
  margin: 0;
  font-family: var(--ml-font-display);
}

.note {
  margin: 0;
  color: var(--ml-text-muted);
  font-size: var(--ml-text-sm);
}

.stage {
  padding: 24px;
  background: var(--ml-brushed), var(--ml-surface);
  box-shadow: inset 0 0 0 1px var(--ml-line);
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
