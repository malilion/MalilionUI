<template>
  <MlButton loading>部署中</MlButton>
  <MlButton variant="outline" loading>同步中</MlButton>
  <MlButton disabled>已停用</MlButton>
  <MlButton variant="tech">
    <template #prefix>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
      </svg>
    </template>
    Boost
  </MlButton>
  <MlButton square variant="steel" aria-label="新增">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
      <path d="M12 5v14M5 12h14" />
    </svg>
  </MlButton>
  <MlButton href="#/start" variant="outline">連結按鈕</MlButton>
</template>
