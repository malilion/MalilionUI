<template>
  <div class="grid">
    <MlStat label="今日部署" :value="128" :delta="12.4" caption="vs 昨日" />
    <MlStat label="平均回應" value="42" unit="ms" :delta="-8.1" caption="越低越好" />
    <MlStat label="獅群成員" value="2,048" :delta="0" caption="本週持平" />
    <MlStat label="可用率" value="99.98" unit="%" :delta="0.02" caption="過去 30 天" />
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}
</style>
