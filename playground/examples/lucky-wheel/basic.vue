<script setup lang="ts">
import { ref } from 'vue'
import type { MlWheelPrize } from '@malilion/ui'

const prizes: MlWheelPrize[] = [
  { label: '獅王大獎', icon: 'heart' },
  { label: '再接再厲' },
  { label: '9 折券', icon: 'check' },
  { label: '神秘禮', icon: 'compass' },
  { label: '免運費' },
  { label: '肉球貼紙', icon: 'bell' },
]

const last = ref('')
const wheel = ref<{ spin: (index?: number) => Promise<number> }>()
</script>

<template>
  <div class="demo">
    <MlLuckyWheel ref="wheel" :prizes="prizes" @result="(prize) => (last = prize.label)" />
    <div class="side">
      <p class="note">按下中央的 GO，或用下面的按鈕指定落點。</p>
      <MlSpace wrap>
        <MlButton @click="wheel?.spin()">隨機轉一次</MlButton>
        <MlButton variant="outline" @click="wheel?.spin(0)">指定落在「獅王大獎」</MlButton>
      </MlSpace>
      <p class="result">結果：<strong>{{ last || '—' }}</strong></p>
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
  gap: 12px;
}

.note,
.result {
  margin: 0;
  color: var(--ml-text-muted);
}

.result strong {
  color: var(--ml-accent-text);
}
</style>
