<script setup lang="ts">
import { ref } from 'vue'

const snap = ref(0)
const spots = [
  { name: '碼力獅咖啡', meta: '350 m · 營業中' },
  { name: '金鬃書店', meta: '600 m · 營業中' },
  { name: '肉球公園', meta: '1.2 km' },
  { name: '鐵爪工坊', meta: '2.4 km · 即將打烊' },
]
</script>

<template>
  <MlPhone :width="280" label="地圖式的常駐面板">
    <div class="map" aria-hidden="true">
      <MlPaw class="pin" :size="30" />
    </div>
    <MlBottomSheet
      :open="true"
      v-model:snap="snap"
      :snap-points="[124, '50%', '88%']"
      :modal="false"
      :dismissible="false"
      inline
      title="附近的獅子窩"
    >
      <MlList>
        <MlListItem v-for="spot in spots" :key="spot.name" :title="spot.name" :subtitle="spot.meta" chevron clickable>
          <template #leading><MlIcon name="compass" /></template>
        </MlListItem>
      </MlList>
    </MlBottomSheet>
  </MlPhone>
</template>

<style scoped>
.map {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background:
    repeating-linear-gradient(0deg, transparent 0 38px, var(--ml-line) 38px 39px),
    repeating-linear-gradient(90deg, transparent 0 38px, var(--ml-line) 38px 39px),
    radial-gradient(60% 40% at 40% 35%, var(--ml-tech-soft), transparent 70%),
    var(--ml-surface-2);
}

.pin {
  margin-bottom: 120px;
  filter: var(--ml-glow-gold);
}
</style>
