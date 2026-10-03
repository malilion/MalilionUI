<script setup lang="ts">
import { ref } from 'vue'
import type { MlMenuItem } from '@malilion/ui'

const collapsed = ref(false)
const page = ref('dash')
const items: MlMenuItem[] = [
  { key: 'dash', label: '儀表板', icon: 'grid' },
  { key: 'team', label: '獅群', icon: 'user', badge: 12 },
  { key: 'msg', label: '訊息', icon: 'message' },
  { key: 'set', label: '設定', icon: 'settings' },
]
</script>

<template>
  <div class="frame">
    <MlLayout v-model:collapsed="collapsed" :full-height="false" :sticky-header="false" :breakpoint="560">
      <template #header="{ toggleAside }">
        <MlButton square variant="ghost" size="sm" aria-label="切換側欄" @click="toggleAside"><MlIcon name="menu" /></MlButton>
        <MlLionMark :size="28" />
        <strong class="brand">Malilion Console</strong>
        <MlSpace class="right" size="sm">
          <MlButton square variant="ghost" size="sm" aria-label="通知"><MlIcon name="bell" /></MlButton>
          <MlAvatar size="sm" name="碼力獅" />
        </MlSpace>
      </template>
      <template #aside="{ collapsed: rail }">
        <MlMenu v-model="page" :items="items" :collapsed="rail" />
      </template>
      <MlGrid min-item-width="140px" gap="sm">
        <MlStat label="活躍用戶" value="1,890" />
        <MlStat label="部署次數" value="42" />
        <MlStat label="錯誤率" value="0.3%" />
      </MlGrid>
      <template #footer>© 2026 碼力獅 · 縮窄視窗，側欄會變成滑出式抽屜</template>
    </MlLayout>
  </div>
</template>

<style scoped>
.frame {
  width: 100%;
  overflow: hidden;
  box-shadow: inset 0 0 0 1px var(--ml-line);
}

.brand {
  font-family: var(--ml-font-display);
}

.right {
  margin-left: auto;
}
</style>
