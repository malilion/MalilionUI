<script setup lang="ts">
import { computed, ref } from 'vue'
import { solarTermOn, toLunar, twHolidays } from '@malilion/ui'

const picked = ref<Date | null>(new Date(2026, 8, 25))
const info = computed(() => {
  const d = picked.value
  if (!d) return null
  const lunar = toLunar(d)
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const days = twHolidays(d.getFullYear()).filter((h) => h.date === key)
  return {
    lunar: lunar ? `${lunar.ganZhi}年（${lunar.zodiac}）${lunar.monthName}${lunar.dayName}` : '超出 1900–2100',
    term: solarTermOn(d),
    days: days.map((h) => `${h.name}${h.off ? '・放假' : ''}`),
  }
})
</script>

<template>
  <div class="demo">
    <MlLunarCalendar v-model="picked" />
    <dl v-if="info" class="info">
      <dt>農曆</dt>
      <dd>{{ info.lunar }}</dd>
      <dt>節氣</dt>
      <dd>{{ info.term ?? '—' }}</dd>
      <dt>節日</dt>
      <dd>{{ info.days.join('、') || '—' }}</dd>
    </dl>
  </div>
</template>

<style scoped>
.demo {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 24px;
}

.info {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 6px 14px;
  min-width: 200px;
  margin: 0;
  color: var(--ml-text-muted);
  font-size: var(--ml-text-sm);
}

.info dt {
  color: var(--ml-text-dim);
}

.info dd {
  margin: 0;
}
</style>
