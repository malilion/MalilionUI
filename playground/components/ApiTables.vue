<script setup lang="ts">
import type { ApiDoc } from '../registry'

defineProps<{ api: ApiDoc[] }>()

const propColumns = [
  { key: 'name', title: '屬性', width: '18%' },
  { key: 'desc', title: '說明' },
  { key: 'type', title: '型別', mono: true, width: '28%' },
  { key: 'default', title: '預設值', mono: true, width: '14%' },
]
const eventColumns = [
  { key: 'name', title: '事件 / 方法', width: '22%' },
  { key: 'desc', title: '說明' },
  { key: 'type', title: '參數 / 簽名', mono: true, width: '34%' },
]
const slotColumns = [
  { key: 'name', title: '插槽', width: '22%' },
  { key: 'desc', title: '說明' },
]
</script>

<template>
  <section class="api">
    <h2 class="api__title">API</h2>
    <div v-for="doc in api" :key="doc.component" class="api__component">
      <h3 class="api__name"><code>{{ doc.component }}</code></h3>
      <template v-if="doc.props?.length">
        <p class="ml-hud-label api__label">Props</p>
        <MlTable :columns="propColumns" :rows="doc.props" row-key="name" dense>
          <template #cell-name="{ value }"><code class="api__code">{{ value }}</code></template>
          <template #cell-default="{ value }">{{ value ?? '—' }}</template>
        </MlTable>
      </template>
      <template v-if="doc.events?.length">
        <p class="ml-hud-label api__label">Events / Methods</p>
        <MlTable :columns="eventColumns" :rows="doc.events" row-key="name" dense>
          <template #cell-name="{ value }"><code class="api__code">{{ value }}</code></template>
        </MlTable>
      </template>
      <template v-if="doc.slots?.length">
        <p class="ml-hud-label api__label">Slots</p>
        <MlTable :columns="slotColumns" :rows="doc.slots" row-key="name" dense>
          <template #cell-name="{ value }"><code class="api__code">{{ value }}</code></template>
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

.api__code {
  color: var(--ml-tech-text);
  font-family: var(--ml-font-mono);
  font-size: 0.8125rem;
  white-space: nowrap;
}
</style>
