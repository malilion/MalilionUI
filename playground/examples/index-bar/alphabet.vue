<script setup lang="ts">
const cities = [
  'Taipei', 'Tokyo', 'Seoul', 'Singapore', 'Sydney', 'Bangkok', 'Berlin', 'Boston', 'Chicago', 'Dubai',
  'Hong Kong', 'Kyoto', 'London', 'Los Angeles', 'Madrid', 'Melbourne', 'Osaka', 'Paris', 'Rome', 'Vancouver',
  '北京', '上海', '廣州', '深圳', '成都', '重慶', '杭州', '南京', '武漢', '西安',
].map((label) => ({ label }))
</script>

<template>
  <div class="row">
    <MlIndexBar :items="cities" mode="alphabet" :height="360" />
    <MlIndexBar
      :items="cities.slice(0, 20)"
      mode="alphabet"
      :indexes="'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')"
      :sticky="false"
      :height="360"
    >
      <template #item="{ item }">
        <div class="city">
          <span class="dot" />{{ item.label }}
        </div>
      </template>
    </MlIndexBar>
  </div>
</template>

<style scoped>
.row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 20px;
}
.city {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 40px 10px 16px;
}
.dot {
  width: 8px;
  height: 8px;
  background: var(--ml-accent);
  clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
}
</style>
