<script setup lang="ts">
import { ref } from 'vue'

const side = ref(30)
const editor = ref(65)
</script>

<template>
  <MlSplitter v-model="side" :min="18" :max="50" :default-size="30" class="frame">
    <template #start>
      <div class="pane">
        <p class="ml-hud-label">檔案 · {{ Math.round(side) }}%</p>
        <p>拖曳中間的握把，或聚焦後用 ← → 調整；雙擊恢復預設。</p>
      </div>
    </template>
    <template #end>
      <MlSplitter v-model="editor" direction="vertical" :min="25" :max="85">
        <template #start>
          <div class="pane"><p class="ml-hud-label">編輯器 · {{ Math.round(editor) }}%</p></div>
        </template>
        <template #end>
          <div class="pane pane--term"><p class="ml-hud-label">終端機</p><code>$ npm run dev</code></div>
        </template>
      </MlSplitter>
    </template>
  </MlSplitter>
</template>

<style scoped>
.frame {
  height: 320px;
  box-shadow: inset 0 0 0 1px var(--ml-line);
}

.pane {
  height: 100%;
  padding: 14px 16px;
  color: var(--ml-text-muted);
  font-size: var(--ml-text-sm);
}

.pane p {
  margin: 0 0 8px;
}

.pane--term {
  background: var(--ml-surface-inset);
  font-family: var(--ml-font-mono);
}
</style>
