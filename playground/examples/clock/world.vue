<script setup lang="ts">
const cities = [
  { label: '台北', timeZone: 'Asia/Taipei', tone: 'gold' as const },
  { label: '東京', timeZone: 'Asia/Tokyo', tone: 'steel' as const },
  { label: '倫敦', timeZone: 'Europe/London', tone: 'tech' as const },
  { label: '紐約', timeZone: 'America/New_York', tone: 'bean' as const },
]
</script>

<template>
  <div class="world">
    <MlClock v-for="c in cities" :key="c.label" :label="c.label" :time-zone="c.timeZone" :tone="c.tone" :size="160" digital offset />
  </div>
</template>

<style scoped>
.world {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  justify-items: center;
  gap: 24px;
  width: 100%;
}
</style>
