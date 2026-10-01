<template>
  <div class="stack">
    <MlAlert title="系統訊息">新版獅群儀表板已推出，歡迎試用。</MlAlert>
    <MlAlert tone="success" title="部署完成">版本 v0.2.0 已成功上線。</MlAlert>
    <MlAlert tone="warning" title="額度即將用盡">本月 API 額度剩下 12%。</MlAlert>
    <MlAlert tone="danger" title="建置失敗">第 42 行有型別錯誤，請檢查後重新部署。</MlAlert>
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 14px;
}
</style>
