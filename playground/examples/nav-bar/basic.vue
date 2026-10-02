<template>
  <div class="screens">
    <div class="screen">
      <MlNavBar title="Messages" back>
        <template #right>
          <button class="icon-btn" aria-label="搜尋"><MlIcon name="search" /></button>
        </template>
      </MlNavBar>
    </div>
    <div class="screen">
      <MlNavBar title="Explore" subtitle="UI Components" large>
        <template #right>
          <MlAvatar lion size="sm" />
        </template>
      </MlNavBar>
    </div>
  </div>
</template>

<style scoped>
.screens {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 340px));
  gap: 20px;
}

.screen {
  overflow: hidden;
  border-radius: 16px;
  background: var(--ml-bg);
  box-shadow: inset 0 0 0 1px var(--ml-line);
}

.icon-btn {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 50%;
  background: none;
  color: var(--ml-text);
  cursor: pointer;
}

.icon-btn svg {
  width: 20px;
  height: 20px;
}
</style>
