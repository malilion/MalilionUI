<script setup lang="ts">
import { ref } from 'vue'
import type { MlComment } from '@malilion/ui'

// A fixed "now" keeps the relative times stable ("2 小時前") however long the page stays open.
const now = new Date('2026-10-04T15:00:00+08:00')
const at = (hhmm: string) => new Date(`2026-10-04T${hhmm}:00+08:00`)

const comments = ref<MlComment[]>([
  {
    id: 'q',
    author: { name: '美美' },
    content: '週末想去台南吃小吃，有推薦的嗎？',
    time: at('09:10'),
    likes: 5,
    replies: [
      {
        id: 'q1',
        author: { name: '阿德' },
        content: '牛肉湯一定要早上去！',
        time: at('09:30'),
        likes: 9,
        replies: [
          {
            id: 'q1a',
            author: { name: '美美' },
            content: '幾點開始排比較好？',
            time: at('09:42'),
            replies: [{ id: 'q1a1', author: { name: '阿德' }, content: '六點半左右，七點就要排很久了。', time: at('10:05'), likes: 3 }],
          },
        ],
      },
      { id: 'q2', author: { name: '小陳' }, content: '國華街一路吃過去就對了', time: at('10:20'), likes: 2 },
      { id: 'q3', author: { name: 'Leo' }, content: '還有碗粿跟虱目魚粥', time: at('11:00'), likes: 1 },
      { id: 'q4', author: { name: '珊珊' }, content: '記得帶現金，很多攤位不能刷卡', time: at('12:15'), likes: 4 },
      { id: 'q5', author: { name: '阿德' }, content: '吃不完可以外帶 😆', time: at('13:01') },
    ],
  },
])
</script>

<template>
  <div class="demo">
    <MlComments v-model:comments="comments" :now="now" :max-depth="1" :collapse-after="2" :current-user="{ name: '你' }" title="討論串" />
  </div>
</template>

<style scoped>
.demo { width: 100%; max-width: 640px; }
</style>
