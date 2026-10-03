<script setup lang="ts">
import { toast, type MlDropdownItem } from '@malilion/ui'

const items: MlDropdownItem[] = [
  { value: 'open', label: '開啟', icon: 'file', hint: 'Enter' },
  { value: 'rename', label: '重新命名', hint: 'F2' },
  { value: 'copy', label: '複製連結', icon: 'arrowRight', hint: '⌘ C' },
  { value: 'star', label: '加到最愛', icon: 'heart' },
  { value: 'move', label: '移動到…', icon: 'folder', disabled: true },
  { value: 'delete', label: '刪除', icon: 'close', danger: true, divider: true, hint: '⌫' },
]
</script>

<template>
  <MlContextMenu :items="items" @select="(item) => toast(`選了「${item.label}」`)">
    <div class="target" tabindex="0">
      <MlPaw tone="steel" />
      <p>在這裡按右鍵</p>
      <small>鍵盤：先 Tab 到這裡，再按 Shift + F10</small>
    </div>
  </MlContextMenu>
</template>

<style scoped>
.target {
  display: grid;
  place-items: center;
  gap: 6px;
  width: 100%;
  min-height: 180px;
  border: 1px dashed var(--ml-line-strong);
  color: var(--ml-text-muted);
  user-select: none;
}

.target:focus-visible {
  outline: 2px solid var(--ml-focus);
}

.target p {
  margin: 0;
}

.target small {
  color: var(--ml-text-dim);
}

.target :deep(svg) {
  width: 28px;
  height: 28px;
}
</style>
