<script setup lang="ts">
import { useToast, type MlDropdownItem } from '@malilion/ui'

const toast = useToast()

const items: MlDropdownItem[] = [
  { value: 'edit', label: '編輯', icon: 'info', hint: '⌘E' },
  { value: 'duplicate', label: '複製一份', hint: '⌘D' },
  { value: 'archive', label: '封存', disabled: true },
  { value: 'delete', label: '刪除', icon: 'danger', danger: true, divider: true },
]

function onSelect(item: MlDropdownItem) {
  if (item.danger) toast.danger(`已${item.label}`)
  else toast(`選了「${item.label}」`)
}
</script>

<template>
  <MlDropdown :items="items" label="操作" @select="onSelect" />
  <MlDropdown :items="items" label="靠右對齊" placement="bottom-end" variant="steel" @select="onSelect" />
</template>
