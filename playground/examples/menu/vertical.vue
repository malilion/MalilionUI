<script setup lang="ts">
import { ref } from 'vue'
import type { MlMenuItem } from '@malilion/ui'

const active = ref('overview')
const openKeys = ref(['pride'])

const items: MlMenuItem[] = [
  { key: 'overview', label: '總覽', icon: 'home' },
  {
    key: 'pride',
    label: '獅群管理',
    icon: 'user',
    children: [
      { key: 'members', label: '成員', badge: 12 },
      { key: 'roles', label: '角色與權限' },
      { key: 'invites', label: '邀請', badge: 'NEW' },
    ],
  },
  {
    key: 'deploy',
    label: '部署',
    icon: 'upload',
    children: [
      { key: 'pipelines', label: '流水線' },
      { key: 'envs', label: '環境', children: [
        { key: 'staging', label: 'Staging' },
        { key: 'production', label: 'Production' },
      ] },
    ],
  },
  { key: 'messages', label: '訊息', icon: 'message', badge: 3 },
  { key: 'archive', label: '封存區', icon: 'folder', disabled: true },
  { key: 'settings', label: '設定', icon: 'settings' },
]
</script>

<template>
  <div class="demo">
    <MlMenu v-model="active" v-model:open-keys="openKeys" :items="items" class="side" />
    <p class="ml-hud-label">目前頁面：{{ active }}</p>
  </div>
</template>

<style scoped>
.demo {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 24px;
}

.side {
  width: 240px;
}
</style>
