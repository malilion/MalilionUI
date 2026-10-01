<script setup lang="ts">
import { useToast } from '@malilion/ui'

const toast = useToast()

function open(name: string) {
  toast(`打開「${name}」`)
}
</script>

<template>
  <div class="grid">
    <MlCard variant="gold" eyebrow="Premium" title="黃金獅鬃">
      金色拋光外框與頂部光暈，留給最重要的內容。
    </MlCard>
    <MlCard variant="steel" eyebrow="Archive" title="鈦合金庫">
      冷靜的鈦金屬外框，適合次要或封存的資訊。
    </MlCard>
    <MlCard
      variant="tech"
      eyebrow="System"
      title="電路之眼"
      interactive
      tabindex="0"
      @click="open('電路之眼')"
      @keydown.enter="open('電路之眼')"
    >
      可點擊的卡片：滑過會浮起並發光。
      <template #footer>
        <MlBadge tone="tech" pulse>Live</MlBadge>
      </template>
    </MlCard>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
}
</style>
