<script setup lang="ts">
import { ref } from 'vue'
import type { MlAvatarGroupItem } from '@malilion/ui'

const expanded = ref(false)
const people: MlAvatarGroupItem[] = ['碼力獅', 'Leo', 'Nala', '小虎', 'Simba', '阿金', 'Kiara', '大橘', 'Mufasa'].map((name, i) => ({
  name,
  lion: i === 0,
  ring: (['gold', 'steel', 'tech'] as const)[i % 3],
}))
</script>

<template>
  <div class="rows">
    <MlAvatarGroup v-model:expanded="expanded" :items="people" :max="4" expandable />
    <p class="note">{{ expanded ? '全部展開了，按「−」收合' : '點「+5」展開；滑過可以看到被藏起來的名字' }}</p>
  </div>
</template>

<style scoped>
.rows {
  display: grid;
  justify-items: start;
  gap: 10px;
}

.note {
  margin: 0;
  color: var(--ml-text-dim);
  font-size: var(--ml-text-sm);
}
</style>
