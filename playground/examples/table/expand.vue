<script setup lang="ts">
import { ref } from 'vue'

const columns = [
  { key: 'name', title: '成員' },
  { key: 'role', title: '角色' },
  { key: 'commits', title: 'Commits', align: 'right' as const, mono: true },
]
const rows = [
  { id: 1, name: '碼力獅', role: 'Alpha', commits: 1284, bio: '獅群領袖，負責整體架構與設計系統。', skills: ['Vue', 'TypeScript', 'Design'] },
  { id: 2, name: 'Nala', role: 'Hunter', commits: 902, bio: '前線開發，表單與資料元件的主力。', skills: ['Forms', 'A11y'] },
  { id: 3, name: 'Simba', role: 'Hunter', commits: 655, bio: '圖表與動畫都是他做的。', skills: ['SVG', 'Motion'] },
  { id: 4, name: 'Kiara', role: 'Scout', commits: 0, bio: '', skills: [] },
]
const expanded = ref<(string | number)[]>([1])
</script>

<template>
  <MlTable v-model:expanded="expanded" :columns="columns" :rows="rows" :row-expandable="(row) => !!row.bio">
    <template #expand="{ row }">
      <p class="bio">{{ row.bio }}</p>
      <MlSpace size="sm">
        <MlTag v-for="s in row.skills" :key="s" tone="tech" variant="outline">{{ s }}</MlTag>
      </MlSpace>
    </template>
  </MlTable>
</template>

<style scoped>
.bio {
  margin: 0 0 10px;
  color: var(--ml-text-muted);
}
</style>
