<template>
  <div class="stack">
    <MlTitle :level="1" metal>碼力獅 MalilionUI</MlTitle>
    <MlTitle :level="2" accent>獅子 × 科技 × 金屬</MlTitle>
    <MlTitle :level="3">三級標題 Heading 3</MlTitle>
    <MlTitle :level="4">四級標題 Heading 4</MlTitle>
    <MlTitle :level="5">五級標題 Heading 5</MlTitle>
    <MlTitle :level="6">System status · 系統狀態</MlTitle>
    <MlTitle :level="3" ellipsis class="narrow">這是一個很長很長、長到一行放不下會被截斷的標題</MlTitle>
  </div>
</template>

<style scoped>
.stack {
  width: 100%;
}

.narrow {
  max-width: 320px;
}
</style>
