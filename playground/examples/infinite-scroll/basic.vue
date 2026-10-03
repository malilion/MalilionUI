<script setup lang="ts">
import { ref } from 'vue'

const posts = ref(Array.from({ length: 8 }, (_, i) => i + 1))
const loading = ref(false)
const finished = ref(false)

function load() {
  loading.value = true
  // Pretend to fetch the next page.
  setTimeout(() => {
    const next = posts.value.length
    posts.value.push(...Array.from({ length: 6 }, (_, i) => next + i + 1))
    loading.value = false
    if (posts.value.length >= 32) finished.value = true
  }, 700)
}
</script>

<template>
  <div class="box">
    <MlInfiniteScroll :loading="loading" :finished="finished" container=".box" @load="load">
      <article v-for="n in posts" :key="n" class="post">
        <MlAvatar size="sm" :name="`獅${n}`" />
        <div>
          <strong>第 {{ n }} 則貼文</strong>
          <p>今天也是努力寫程式的一天。🐾</p>
        </div>
      </article>
    </MlInfiniteScroll>
  </div>
</template>

<style scoped>
.box {
  width: 100%;
  height: 320px;
  overflow-y: auto;
  box-shadow: inset 0 0 0 1px var(--ml-line);
}

.post {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--ml-line-steel);
}

.post p {
  margin: 2px 0 0;
  color: var(--ml-text-muted);
  font-size: var(--ml-text-sm);
}
</style>
