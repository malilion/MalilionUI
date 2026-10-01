<script setup lang="ts">
import { useToast } from '@malilion/ui'

const toast = useToast()

const items = [
  { value: 'profile', label: '個人檔案' },
  { value: 'settings', label: '設定' },
  { value: 'logout', label: '登出', danger: true, divider: true },
]
</script>

<template>
  <MlDropdown :items="items" label="帳號選單" placement="bottom-end" @select="(item) => toast(item.label)">
    <template #trigger="{ attrs }">
      <button class="avatar-btn" v-bind="attrs" aria-label="帳號選單">
        <MlAvatar name="碼力獅" size="sm" status="online" />
        <span>碼力獅</span>
      </button>
    </template>
  </MlDropdown>
</template>

<style scoped>
.avatar-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 4px 12px 4px 4px;
  border: 0;
  background: none;
  color: var(--ml-text);
  font: inherit;
  cursor: pointer;
}

.avatar-btn:focus-visible {
  outline: 2px solid var(--ml-focus);
  outline-offset: 2px;
}
</style>
