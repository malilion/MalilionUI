<script setup lang="ts">
import { ref } from 'vue'
import type { MlCandle, MlCandleUpColor } from '@malilion/ui'

// 模擬 5 分鐘 K（固定亂數種子產生，非真實行情）
function simulate(count: number): MlCandle[] {
  let seed = 7
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const start = new Date(2026, 9, 2, 9, 0).getTime()
  const out: MlCandle[] = []
  let close = 2_105_000
  for (let i = 0; i < count; i++) {
    const open = close
    const next = Math.round(open + (rnd() - 0.5) * 9000 + Math.sin(i / 14) * 1200)
    out.push({
      time: start + i * 5 * 60_000,
      open,
      close: next,
      high: Math.round(Math.max(open, next) + rnd() * 3500),
      low: Math.round(Math.min(open, next) - rnd() * 3500),
      volume: +(0.8 + rnd() * 4.2).toFixed(3),
    })
    close = next
  }
  return out
}

const candles = simulate(144)
const upColor = ref<MlCandleUpColor>('green')
</script>

<template>
  <div style="display: grid; gap: 12px">
    <MlSegmented
      v-model="upColor"
      size="sm"
      label="漲跌配色"
      :options="[
        { label: '綠漲紅跌（歐美）', value: 'green' },
        { label: '紅漲綠跌（台灣）', value: 'red' },
      ]"
    />
    <MlCandlestick
      :data="candles"
      :up-color="upColor"
      :ma="[12]"
      :visible="48"
      :height="240"
      :volume-height="56"
      :format="(v) => `NT$${v.toLocaleString()}`"
      :volume-format="(v) => `${v.toFixed(3)} BTC`"
      label="模擬比特幣 5 分鐘 K 線（新台幣計價）"
    />
  </div>
</template>
