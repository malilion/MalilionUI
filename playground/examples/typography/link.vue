<template>
  <div class="stack">
    <p>
      閱讀 <MlLink href="#/components/button">按鈕文件</MlLink>，或到
      <MlLink href="https://github.com/malilion/MalilionUI" external>GitHub</MlLink> 看原始碼。
    </p>
    <p>
      <MlLink href="#/components/typography" tone="tech">科技青</MlLink> ·
      <MlLink href="#/components/typography" underline="always">一直有底線</MlLink> ·
      <MlLink href="#/components/typography" underline="none">沒有底線</MlLink> ·
      <MlLink href="#/components/typography" disabled>停用</MlLink>
    </p>
    <p class="inherit">
      在一般段落裡用 <MlLink href="#/components/typography" tone="inherit" underline="always">tone="inherit"</MlLink>，連結會跟著文字顏色。
    </p>
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 12px;
}

.stack p {
  margin: 0;
}

.inherit {
  color: var(--ml-text-muted);
}
</style>
