<script setup lang="ts">
import { computed, ref } from 'vue'
import { toast, type MlWheelPrize } from '@malilion/ui'

// Odds come from `weight`; a disabled prize (sold out) can never be drawn.
const prizes = ref<MlWheelPrize[]>([
  { label: '頭獎 iPad', tone: 'gold', weight: 1 },
  { label: '100 元', tone: 'tech', weight: 10 },
  { label: '50 元', tone: 'bean', weight: 25 },
  { label: '謝謝參加', tone: 'steel', weight: 50 },
  { label: '限量公仔', tone: 'danger', weight: 4, disabled: true },
  { label: '10 元', tone: 'success', weight: 30 },
])

const odds = computed(() => {
  const total = prizes.value.reduce((s, p) => s + (p.disabled ? 0 : (p.weight ?? 1)), 0)
  return prizes.value.map((p) => ({ label: p.label, pct: p.disabled ? '已抽完' : `${(((p.weight ?? 1) / total) * 100).toFixed(1)}%` }))
})

const server = ref(true)

// A stand-in for `await fetch('/api/draw')`: the server picks, the wheel only shows it.
function fakeDraw(): Promise<number> {
  return new Promise((resolve) => setTimeout(() => resolve(Math.random() < 0.5 ? 3 : 1), 1200))
}

const beforeSpin = () => (server.value ? fakeDraw() : undefined)

function onResult(prize: MlWheelPrize) {
  toast({ tone: prize.label === '謝謝參加' ? 'info' : 'success', title: prize.label === '謝謝參加' ? '下次會更好' : '恭喜中獎！', message: prize.label })
}
</script>

<template>
  <div class="demo">
    <MlLuckyWheel :prizes="prizes" :size="300" :before-spin="beforeSpin" @result="onResult" />
    <div class="side">
      <MlSwitch v-model="server" label="由伺服器決定結果（before-spin 回傳 Promise）" />
      <ul class="odds">
        <li v-for="o in odds" :key="o.label">
          <span>{{ o.label }}</span><b>{{ o.pct }}</b>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.demo {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 28px;
}

.side {
  display: grid;
  gap: 14px;
  min-width: 240px;
}

.odds {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--ml-text-sm);
}

.odds li {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  color: var(--ml-text-muted);
}

.odds b {
  color: var(--ml-text);
  font-family: var(--ml-font-mono);
  font-weight: 500;
}
</style>
