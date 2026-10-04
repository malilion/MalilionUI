<script setup lang="ts">
import { useTheme } from '@malilion/ui'

const { mode, resolved, system } = useTheme()
const names = { dark: '夜間', light: '日光', system: '跟隨系統' }
</script>

<template>
  <div class="theme-demo">
    <MlThemeToggle variant="segmented" />
    <p class="theme-demo__state">
      選擇 <strong>{{ names[mode] }}</strong> · 套用 <strong>{{ names[resolved] }}</strong> · 系統偏好 <strong>{{ names[system] }}</strong>
    </p>
  </div>
</template>

<style scoped>
.theme-demo {
  display: grid;
  gap: 12px;
  justify-items: start;
}

.theme-demo__state {
  margin: 0;
  color: var(--ml-text-muted);
  font-size: var(--ml-text-sm);
}
</style>
