<script setup lang="ts">
import type { MlCandle } from '@malilion/ui'

// 模擬個股日 K（固定亂數種子產生，非真實行情）：只有交易日（週一到週五），
// 價格跳動單位 0.5 元，成交量單位為「張」。
function simulate(days: number): MlCandle[] {
  let seed = 20260105
  const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647
  const tick = (v: number) => Math.round(v * 2) / 2
  const out: MlCandle[] = []
  const d = new Date(2026, 0, 5)
  let close = 612
  while (out.length < days) {
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      const open = tick(close * (1 + (rnd() - 0.5) * 0.012))
      const trend = Math.sin(out.length / 23) * 0.004
      const next = tick(open * (1 + (rnd() - 0.48) * 0.032 + trend))
      const high = tick(Math.max(open, next) * (1 + rnd() * 0.012))
      const low = tick(Math.min(open, next) * (1 - rnd() * 0.012))
      const time = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
      out.push({ time, open, high, low, close: next, volume: Math.round(18000 + rnd() * 26000 + Math.abs(next - open) * 900) })
      close = next
    }
    d.setDate(d.getDate() + 1)
  }
  return out
}

const candles = simulate(180)
</script>

<template>
  <MlCandlestick :data="candles" :ma="[5, 20, 60]" :visible="80" :volume-format="(v) => `${v.toLocaleString()} 張`" label="模擬個股日 K 線" />
</template>
