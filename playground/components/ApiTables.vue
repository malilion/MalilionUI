<script setup lang="ts">
import { computed } from 'vue'
import type { ApiDoc } from '../registry'
import { reactApiDoc, type ReactApi } from '../react-docs'

const props = defineProps<{
  api: ApiDoc[]
  /** Show the React reading (names checked against these props). */
  react?: { props: ReactApi; components: string[] }
}>()

type Row = { name: string; desc: string; type?: string; default?: string; missing?: string[] }
const docs = computed<{ component: string; props?: Row[]; events?: Row[]; slots?: Row[] }[]>(() => {
  if (!props.react) return props.api
  const components = new Set(props.react.components)
  return props.api.map((doc) => reactApiDoc(doc, props.react!.props, components))
})

const propColumns = [
  { key: 'name', title: '屬性', width: '18%' },
  { key: 'desc', title: '說明' },
  { key: 'type', title: '型別', mono: true, width: '28%' },
  { key: 'default', title: '預設值', mono: true, width: '14%' },
]
const eventColumns = computed(() => [
  { key: 'name', title: props.react ? '回呼 / 方法' : '事件 / 方法', width: '22%' },
  { key: 'desc', title: '說明' },
  { key: 'type', title: '參數 / 簽名', mono: true, width: '34%' },
])
const slotColumns = computed(() => [
  { key: 'name', title: props.react ? 'Prop' : '插槽', width: '22%' },
  { key: 'desc', title: '說明' },
])
</script>

<template>
  <section class="api">
    <h2 class="api__title">API</h2>
    <div v-for="doc in docs" :key="doc.component" class="api__component">
      <h3 class="api__name"><code>{{ doc.component }}</code></h3>
      <template v-if="doc.props?.length">
        <p class="ml-hud-label api__label">Props</p>
        <MlTable :columns="propColumns" :rows="doc.props" row-key="name" dense>
          <template #cell-name="{ value, row }">
            <code class="api__code">{{ value }}</code>
            <MlTag v-if="row.missing?.length" tone="steel" variant="outline" class="api__missing">React 版沒有</MlTag>
          </template>
          <template #cell-default="{ value }">{{ value ?? '—' }}</template>
        </MlTable>
      </template>
      <template v-if="doc.events?.length">
        <p class="ml-hud-label api__label">{{ react ? 'Callbacks / Methods' : 'Events / Methods' }}</p>
        <MlTable :columns="eventColumns" :rows="doc.events" row-key="name" dense>
          <template #cell-name="{ value, row }">
            <code class="api__code">{{ value }}</code>
            <MlTag v-if="row.missing?.length" tone="steel" variant="outline" class="api__missing">React 版沒有</MlTag>
          </template>
        </MlTable>
      </template>
      <template v-if="doc.slots?.length">
        <p class="ml-hud-label api__label">{{ react ? 'Children / Render props' : 'Slots' }}</p>
        <MlTable :columns="slotColumns" :rows="doc.slots" row-key="name" dense>
          <template #cell-name="{ value, row }">
            <code class="api__code">{{ value }}</code>
            <MlTag v-if="row.missing?.length" tone="steel" variant="outline" class="api__missing">React 版沒有</MlTag>
          </template>
        </MlTable>
      </template>
    </div>
  </section>
</template>

<style scoped>
.api {
  margin-top: 56px;
}

.api__title {
  margin: 0;
  font-family: var(--ml-font-display);
  font-size: var(--ml-text-2xl);
}

.api__component {
  margin-top: 24px;
}

.api__name {
  margin: 0 0 4px;
  font-size: var(--ml-text-md);
}

.api__name code {
  color: var(--ml-accent-text);
  font-family: var(--ml-font-mono);
}

.api__label {
  margin: 18px 0 8px;
}

.api__missing {
  margin-left: 6px;
  vertical-align: middle;
}

.api__code {
  color: var(--ml-tech-text);
  font-family: var(--ml-font-mono);
  font-size: 0.8125rem;
  white-space: nowrap;
}
</style>
