<template>
  <div class="stack">
    <MlSpace>
      <MlButton>主要</MlButton>
      <MlButton variant="steel">次要</MlButton>
      <MlButton variant="ghost">取消</MlButton>
    </MlSpace>
    <MlSpace size="sm" divider="paw">
      <a href="#/space">文件</a>
      <a href="#/space">元件</a>
      <a href="#/space">GitHub</a>
      <span>v0.6</span>
    </MlSpace>
    <MlSpace direction="vertical" size="lg" divider="line" fill>
      <MlAlert tone="info" title="垂直排列">direction="vertical" 搭配 fill 會撐滿整行。</MlAlert>
      <MlAlert tone="success" title="分隔線">divider 可以是細線或小腳印。</MlAlert>
    </MlSpace>
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 24px;
  width: 100%;
}

a {
  color: var(--ml-accent-text);
  text-decoration: none;
}
</style>
