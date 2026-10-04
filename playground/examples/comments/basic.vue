<script setup lang="ts">
import { ref } from 'vue'
import { lionAvatarUrl, type MlComment, type MlCommentSort } from '@malilion/ui'

// A fixed "now" keeps server and client rendering the same times; drop it to follow the clock.
const now = new Date('2026-10-04T15:00:00+08:00')
const t = (minutesAgo: number) => now.getTime() - minutesAgo * 60_000

const comments = ref<MlComment[]>([
  {
    id: 1,
    author: { name: '阿哲' },
    content: '0.13 的貼圖選擇器好可愛！請問可以自己加貼圖嗎？',
    time: t(42),
    likes: 12,
    replies: [
      { id: 11, author: { name: '碼力獅', avatar: lionAvatarUrl }, content: '目前是內建的 52 張可愛圖示，自訂貼圖已經排進下個版本了 🐾', time: t(30), likes: 8, liked: true },
      { id: 12, author: { name: '阿哲' }, content: '太好了，等你們！', time: t(25), likes: 1 },
    ],
  },
  {
    id: 2,
    author: { name: 'Yuki 林' },
    content: '深色主題配金屬按鈕真的很有質感，\n我們團隊的後台已經整個換過來了。',
    time: t(60 * 5),
    likes: 30,
  },
  {
    id: 3,
    author: { name: '小王工程師' },
    content: '請問 React 版本也有 Comments 嗎？',
    time: t(3),
    likes: 0,
  },
])
const sort = ref<MlCommentSort>('newest')
const log = ref('')
</script>

<template>
  <div class="demo">
    <MlComments
      v-model:comments="comments"
      v-model:sort="sort"
      :now="now"
      :current-user="{ name: '你' }"
      @submit="(_text, parent) => (log = parent ? `回覆了 #${parent}` : '發表了新留言')"
      @like="(id, liked) => (log = `${liked ? '按讚' : '收回讚'} #${id}`)"
    />
    <p class="ml-hud-label">{{ log || 'Ctrl / ⌘ + Enter 送出，Esc 取消回覆' }}</p>
  </div>
</template>

<style scoped>
.demo { display: grid; gap: 10px; width: 100%; max-width: 640px; }
</style>
