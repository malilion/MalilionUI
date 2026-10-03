<template>
  <div class="stack">
    <MlBanner tone="gold" title="0.7 版上線" message="多語系、表格進階功能、Tour 新手導覽都來了。" closable>
      <template #action><MlButton size="sm" variant="outline">看看新功能</MlButton></template>
    </MlBanner>
    <MlBanner tone="warning" title="維護通知" message="10/10 02:00–04:00 系統維護，期間無法登入。" />
    <MlBanner tone="danger" message="付款方式即將到期，請更新信用卡資訊。" closable />
    <MlBanner tone="paw" message="小獅子提醒：記得喝水、伸懶腰 🐾" closable storage-key="ml-demo-banner-paw" />
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 10px;
  width: 100%;
}
</style>
