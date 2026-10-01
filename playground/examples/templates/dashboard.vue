<script setup lang="ts">
const stats = [
  { label: 'Total Users', value: '12,480', delta: '+12%', tone: 'gold' as const, data: [5, 7, 6, 9, 8, 11, 13] },
  { label: 'Active Projects', value: '320', delta: '+8%', tone: 'tech' as const, data: [2, 3, 3, 4, 6, 5, 7] },
  { label: 'Conversion', value: '24.6%', delta: '+2.4%', tone: 'bean' as const, data: [9, 8, 10, 11, 10, 12, 14] },
]
const activity = [
  { label: '10', value: 1200 },
  { label: '11', value: 1800 },
  { label: '12', value: 1500 },
  { label: '13', value: 2100 },
  { label: '14', value: 2420 },
  { label: '15', value: 1900 },
  { label: '16', value: 2250 },
]
const completion = [
  { label: 'Design', value: 40 },
  { label: 'Development', value: 30 },
  { label: 'Marketing', value: 20 },
  { label: 'Others', value: 10 },
]
</script>

<template>
  <div class="dash">
    <div class="stats">
      <MlCard v-for="s in stats" :key="s.label">
        <span class="ml-hud-label">{{ s.label }}</span>
        <div class="row">
          <strong>{{ s.value }}</strong>
          <MlSparkline :data="s.data" :tone="s.tone" :width="96" />
        </div>
        <span class="up">↗ {{ s.delta }}</span>
      </MlCard>
    </div>
    <div class="charts">
      <MlCard eyebrow="Last 7 days" title="Activity Overview">
        <MlBarChart :data="activity" :height="150" :format="(v) => `${(v / 1000).toFixed(1)}K`" />
      </MlCard>
      <MlCard eyebrow="This month" title="Completion Rate">
        <MlDonut :data="completion" title="78%" :size="130" />
      </MlCard>
    </div>
  </div>
</template>

<style scoped>
.dash {
  display: grid;
  gap: 18px;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.charts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}

.row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin: 6px 0 2px;
}

strong {
  font-family: var(--ml-font-display);
  font-size: 1.6rem;
}

.up {
  color: var(--ml-success-text);
  font-family: var(--ml-font-mono);
  font-size: 12px;
}
</style>
