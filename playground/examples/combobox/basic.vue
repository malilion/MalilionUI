<script setup lang="ts">
import { ref } from 'vue'

const role = ref<string | null>(null)
const roles = [
  { value: 'alpha', label: 'Alpha — 獅群領袖' },
  { value: 'hunter', label: 'Hunter — 前線開發' },
  { value: 'scout', label: 'Scout — 探索研究' },
  { value: 'elder', label: 'Elder — 名譽顧問', disabled: true },
]
</script>

<template>
  <div class="form">
    <MlCombobox v-model="role" index="01" label="角色" :options="roles" placeholder="選擇你的角色" clearable />
    <p class="ml-hud-label">目前選擇：{{ role ?? '尚未選擇' }}</p>
  </div>
</template>

<style scoped>
.form {
  display: grid;
  gap: 12px;
  max-width: 420px;
}
</style>
