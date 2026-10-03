<script setup lang="ts">
import { ref } from 'vue'
import type { MlTreeNode } from '@malilion/ui'

const folder = ref<string | number | null>('components')
const scopes = ref<(string | number)[]>(['read-users', 'read-repos'])

const folders: MlTreeNode[] = [
  {
    key: 'src',
    label: 'src',
    icon: 'folder',
    children: [
      { key: 'components', label: 'components', icon: 'folder' },
      { key: 'styles', label: 'styles', icon: 'folder', children: [{ key: 'tokens', label: 'tokens.css', icon: 'file' }] },
    ],
  },
  { key: 'playground', label: 'playground', icon: 'folder' },
  { key: 'tests', label: 'tests', icon: 'folder' },
]

const permissions: MlTreeNode[] = [
  { key: 'users', label: '使用者', children: [{ key: 'read-users', label: '讀取使用者' }, { key: 'write-users', label: '修改使用者' }] },
  { key: 'repos', label: '程式庫', children: [{ key: 'read-repos', label: '讀取程式庫' }, { key: 'write-repos', label: '推送' }, { key: 'admin-repos', label: '管理' }] },
  { key: 'billing', label: '帳務', disabled: true },
]
</script>

<template>
  <div class="form">
    <MlTreeSelect v-model="folder" :data="folders" index="01" label="輸出資料夾" />
    <MlTreeSelect v-model="scopes" :data="permissions" index="02" label="Token 權限" multiple searchable clearable />
  </div>
</template>

<style scoped>
.form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 20px;
  min-height: 400px;
  align-content: start;
}
</style>
