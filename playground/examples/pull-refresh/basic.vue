<script setup lang="ts">
import { ref } from 'vue'

const posts = ref([
  { id: 3, who: '碼力獅', text: '新元件：下拉重新整理', time: '剛剛' },
  { id: 2, who: 'Figma Team', text: '設計稿有 3 則新留言', time: '10 分鐘' },
  { id: 1, who: 'Malilion Bot', text: '早安！今天也要寫好程式', time: '1 小時' },
  { id: 0, who: 'GitHub', text: 'MalilionUI CI passed', time: '2 小時' },
  { id: -1, who: 'Figma Team', text: '新的設計系統檔案已分享', time: '昨天' },
  { id: -2, who: '碼力獅', text: '0.11.0 發佈：期間選擇器與多系列長條圖', time: '週一' },
])
let next = 4
const fail = ref(false)

/** Pretend to fetch: resolves after a moment (or rejects when "模擬失敗" is on). */
function load() {
  return new Promise<void>((resolve, reject) =>
    setTimeout(() => {
      if (fail.value) return reject(new Error('offline'))
      posts.value.unshift({ id: next, who: '碼力獅', text: `第 ${next} 則新動態`, time: '剛剛' })
      next++
      resolve()
    }, 1200),
  )
}
</script>

<template>
  <div class="stage">
    <MlPhone :width="280" label="動態牆預覽">
      <MlNavBar title="動態" />
      <MlPullRefresh success-text="已載入最新動態" @refresh="load">
        <MlList>
          <MlListItem v-for="post in posts" :key="post.id" :title="post.who" :subtitle="post.text" :meta="post.time">
            <template #leading><MlAvatar :name="post.who" :lion="post.who === '碼力獅'" size="sm" /></template>
          </MlListItem>
        </MlList>
        <p class="hint">往下拉（觸控或滑鼠拖曳）就會重新整理</p>
      </MlPullRefresh>
    </MlPhone>
    <div class="side">
      <MlSwitch v-model="fail" label="模擬失敗" />
      <p class="ml-hud-label">鍵盤：Tab 進入畫面會出現「重新整理」按鈕</p>
    </div>
  </div>
</template>

<style scoped>
.stage {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 24px;
}

.side {
  display: grid;
  gap: 12px;
  max-width: 220px;
}

.hint {
  margin: 0;
  padding: 24px 16px 40px;
  color: var(--ml-text-dim);
  font-size: 12px;
  text-align: center;
}
</style>
