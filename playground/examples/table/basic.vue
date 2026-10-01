<script setup lang="ts">
const columns = [
  { key: 'name', title: '成員' },
  { key: 'role', title: '角色' },
  { key: 'commits', title: 'Commits', align: 'right' as const, mono: true },
  { key: 'joined', title: '加入日期', mono: true },
]

const rows = [
  { id: 1, name: '碼力獅', role: 'Alpha', commits: 1284, joined: '2024-03-01' },
  { id: 2, name: 'Nala', role: 'Hunter', commits: 902, joined: '2024-06-18' },
  { id: 3, name: 'Simba', role: 'Hunter', commits: 655, joined: '2025-01-09' },
  { id: 4, name: 'Kiara', role: 'Scout', commits: 214, joined: '2025-08-22' },
]
</script>

<template>
  <MlTable :columns="columns" :rows="rows" caption="獅群成員" />
</template>
