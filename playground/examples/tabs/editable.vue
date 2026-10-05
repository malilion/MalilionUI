<script setup lang="ts">
import { ref } from 'vue'
import { nextTabAfterClose, type MlTabItem } from '@malilion/ui'

// 「總覽」 is pinned (closable: false); the rest close with ×, middle-click or Delete.
const tabs = ref<MlTabItem[]>([
  { value: 'overview', label: '總覽', closable: false },
  { value: 'orders', label: '訂單管理' },
  { value: 'members', label: '會員名單' },
  { value: 'reports', label: '營運報表' },
])
const active = ref('orders')
let count = 0

function close(value: string) {
  if (value === active.value) active.value = nextTabAfterClose(tabs.value, value) ?? ''
  tabs.value = tabs.value.filter((tab) => tab.value !== value)
}

function add() {
  count += 1
  const value = `draft-${count}`
  tabs.value = [...tabs.value, { value, label: `草稿 ${count}` }]
  active.value = value
}

function reorder(order: string[]) {
  tabs.value = order.map((value) => tabs.value.find((tab) => tab.value === value)!)
}
</script>

<template>
  <MlTabs
    v-model="active"
    :items="tabs"
    label="工作區"
    closable
    addable
    reorderable
    @close="close"
    @add="add"
    @reorder="reorder"
  >
    <template v-for="tab in tabs" :key="tab.value" #[tab.value]>
      <p class="panel">{{ tab.label }}：拖曳分頁或按 Alt + ←/→ 調整順序。</p>
    </template>
  </MlTabs>
</template>

<style scoped>
.panel {
  margin: 0;
}
</style>
