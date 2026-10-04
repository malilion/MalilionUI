<script setup lang="ts">
import { ref } from 'vue'
import type { MlSwipeDirection } from '@malilion/ui'

interface Dish {
  name: string
  city: string
  price: number
  note: string
}

const dishes: Dish[] = [
  { name: '滷肉飯', city: '台北', price: 45, note: '肥瘦七三，配一顆滷蛋' },
  { name: '蚵仔煎', city: '台南', price: 70, note: '粉漿要煎到邊邊酥脆' },
  { name: '肉圓', city: '彰化', price: 50, note: '油炸外皮、Q 彈內餡' },
  { name: '大腸包小腸', city: '高雄', price: 65, note: '夜市必吃，加蒜頭' },
  { name: '鼎邊銼', city: '基隆', price: 60, note: '廟口的早晨味道' },
]

const verdict: Record<MlSwipeDirection, string> = { right: '想吃', left: '不吃', up: '超想吃' }
const log = ref<string[]>([])
</script>

<template>
  <div class="demo">
    <MlSwipeStack
      :items="dishes"
      up
      :depth="2"
      :width="300"
      :height="260"
      :threshold="0.25"
      like-text="想吃"
      nope-text="不吃"
      super-text="超想吃"
      :item-label="(d) => d.name"
      @swipe="(d, dir) => log.unshift(`${verdict[dir]}：${d.name}`)"
      @undo="() => log.shift()"
    >
      <template #default="{ item, index }">
        <div class="dish">
          <span class="dish__no">#{{ index + 1 }}</span>
          <h4 class="dish__name">{{ item.name }}</h4>
          <p class="dish__meta">{{ item.city }} · NT$ {{ item.price }}</p>
          <p class="dish__note">{{ item.note }}</p>
        </div>
      </template>
    </MlSwipeStack>
    <ol class="log">
      <li v-for="(line, i) in log" :key="i">{{ line }}</li>
    </ol>
  </div>
</template>

<style scoped>
.demo { display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start; width: 100%; }
.dish {
  display: grid;
  align-content: center;
  gap: 6px;
  height: 100%;
  padding: 24px;
  background: var(--ml-brushed), var(--ml-surface-2);
  text-align: center;
}
.dish__no { color: var(--ml-text-dim); font-family: var(--ml-font-mono); font-size: 12px; }
.dish__name { margin: 0; font-size: 30px; color: var(--ml-accent-text); }
.dish__meta { margin: 0; color: var(--ml-text-muted); font-size: 13px; }
.dish__note { margin: 6px 0 0; }
.log { min-width: 140px; margin: 0; padding-left: 18px; color: var(--ml-text-muted); font-size: 13px; line-height: 1.8; }
</style>
