<template>
  <MlPopover title="獅群狀態">
    <MlButton variant="outline">點我查看</MlButton>
    <template #content>
      <p class="line">在線成員 <strong>12</strong> · 巡邏中 <strong>3</strong></p>
      <MlProgress :value="72" label="領地覆蓋率" size="sm" show-value />
    </template>
  </MlPopover>

  <MlPopover trigger="hover" placement="right" :width="220">
    <MlButton variant="ghost">滑過我</MlButton>
    <template #content>hover 模式也支援鍵盤聚焦，和 Tooltip 不同的是內容可以放任何元素。</template>
  </MlPopover>
</template>

<style scoped>
.line {
  margin: 0 0 10px;
}
</style>
