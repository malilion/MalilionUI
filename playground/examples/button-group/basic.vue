<template>
  <div class="stack">
    <MlButtonGroup label="檔案">
      <MlButton>新增</MlButton>
      <MlButton>開啟</MlButton>
      <MlButton>儲存</MlButton>
    </MlButtonGroup>
    <MlButtonGroup variant="outline" size="sm" label="分頁">
      <MlButton>上一頁</MlButton>
      <MlButton>1</MlButton>
      <MlButton variant="primary">2</MlButton>
      <MlButton>3</MlButton>
      <MlButton>下一頁</MlButton>
    </MlButtonGroup>
    <MlButtonGroup variant="tech" label="播放">
      <MlButton square aria-label="播放">
        <template #prefix><MlIcon name="play" /></template>
      </MlButton>
      <MlButton square aria-label="暫停">
        <template #prefix><MlIcon name="pause" /></template>
      </MlButton>
      <MlButton square aria-label="重來">
        <template #prefix><MlIcon name="rotate" /></template>
      </MlButton>
    </MlButtonGroup>
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 16px;
  justify-items: start;
}
</style>
