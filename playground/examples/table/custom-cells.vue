<script setup lang="ts">
import { useToast, type MlAvatarStatus } from '@malilion/ui'

const toast = useToast()

const columns = [
  { key: 'name', title: '成員' },
  { key: 'status', title: '狀態' },
  { key: 'power', title: '力量', width: '30%' },
  { key: 'actions', title: '', align: 'right' as const },
]

const rows: { id: number; name: string; status: MlAvatarStatus; power: number }[] = [
  { id: 1, name: '碼力獅', status: 'online', power: 92 },
  { id: 2, name: 'Nala Ray', status: 'away', power: 78 },
  { id: 3, name: 'Leo Nova', status: 'busy', power: 64 },
]

const statusText = { online: '在線', away: '離開', busy: '忙碌', offline: '離線' } as const
const statusTone = { online: 'success', away: 'gold', busy: 'danger', offline: 'steel' } as const
</script>

<template>
  <MlTable :columns="columns" :rows="rows">
    <template #cell-name="{ row }">
      <span class="who">
        <MlAvatar :name="row.name" size="sm" :status="row.status" />
        {{ row.name }}
      </span>
    </template>
    <template #cell-status="{ row }">
      <MlBadge :tone="statusTone[row.status]" dot>{{ statusText[row.status] }}</MlBadge>
    </template>
    <template #cell-power="{ value }">
      <MlProgress :value="value" size="sm" :show-value="false" smooth />
    </template>
    <template #cell-actions="{ row }">
      <MlButton size="sm" variant="ghost" stamp @click="toast(`已向 ${row.name} 打招呼`)">打招呼</MlButton>
    </template>
  </MlTable>
</template>

<style scoped>
.who {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}
</style>
