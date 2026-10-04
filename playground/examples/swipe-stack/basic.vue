<script setup lang="ts">
import { ref } from 'vue'
import type { CuteIconName, MlSwipeDirection } from '@malilion/ui'

interface Pet {
  name: string
  icon: CuteIconName
  age: string
  place: string
  tags: string[]
  hue: number
}

const pets: Pet[] = [
  { name: '橘子', icon: 'cat', age: '2 歲', place: '台北市大安區', tags: ['親人', '愛撒嬌'], hue: 28 },
  { name: '黑糖', icon: 'dog', age: '4 歲', place: '新北市板橋區', tags: ['已結紮', '會握手'], hue: 200 },
  { name: '湯圓', icon: 'bunny', age: '1 歲', place: '台中市西屯區', tags: ['安靜', '吃很多'], hue: 330 },
  { name: '芝麻', icon: 'panda', age: '3 歲', place: '高雄市鼓山區', tags: ['慢熟', '貪睡'], hue: 150 },
  { name: '布丁', icon: 'chick', age: '6 個月', place: '台南市東區', tags: ['活潑', '愛唱歌'], hue: 48 },
  { name: '阿獅', icon: 'lion', age: '5 歲', place: '花蓮縣花蓮市', tags: ['王者風範', '怕打雷'], hue: 36 },
]

const liked = ref<string[]>([])
function onSwipe(pet: Pet, direction: MlSwipeDirection) {
  if (direction === 'right') liked.value = [...liked.value, pet.name]
}
function onUndo(pet: Pet) {
  liked.value = liked.value.filter((n) => n !== pet.name)
}
</script>

<template>
  <div class="demo">
    <MlSwipeStack :items="pets" :item-label="(p) => p.name" :height="380" @swipe="onSwipe" @undo="onUndo">
      <template #default="{ item }">
        <article class="pet" :style="{ '--hue': item.hue }">
          <MlCuteIcon :name="item.icon" :size="132" class="pet__icon" />
          <div class="pet__info">
            <h4 class="pet__name">{{ item.name }} <small>{{ item.age }}</small></h4>
            <p class="pet__place">📍 {{ item.place }}</p>
            <p class="pet__tags"><MlTag v-for="tag in item.tags" :key="tag" variant="solid">{{ tag }}</MlTag></p>
          </div>
        </article>
      </template>
      <template #empty>
        <MlEmpty size="sm" title="今天的毛孩都看完了" :description="liked.length ? `你喜歡：${liked.join('、')}` : '明天再來看看吧'" />
      </template>
    </MlSwipeStack>
    <p class="ml-hud-label">拖曳卡片，或用 ← → 鍵；Backspace 復原</p>
  </div>
</template>

<style scoped>
.demo { display: grid; gap: 10px; width: 100%; justify-items: center; }
.pet {
  display: grid;
  grid-template-rows: 1fr auto;
  height: 100%;
  background: linear-gradient(160deg, hsl(var(--hue) 70% 72%), hsl(calc(var(--hue) + 30) 60% 45%));
}
.pet__icon { place-self: center; filter: drop-shadow(0 10px 16px rgb(0 0 0 / 0.25)); }
.pet__info {
  padding: 14px 18px 18px;
  background: linear-gradient(transparent, rgb(0 0 0 / 0.55));
  color: #fff;
}
.pet__name { margin: 0; font-size: 22px; }
.pet__name small { font-size: 14px; font-weight: 500; opacity: 0.85; }
.pet__place { margin: 4px 0 8px; font-size: 13px; opacity: 0.9; }
.pet__tags { display: flex; gap: 6px; margin: 0; }
</style>
