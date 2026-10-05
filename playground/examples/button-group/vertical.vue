<template>
  <div class="row">
    <MlButtonGroup vertical variant="steel" label="排序">
      <MlButton>最新</MlButton>
      <MlButton>最熱門</MlButton>
      <MlButton>評分最高</MlButton>
    </MlButtonGroup>
    <MlButtonGroup block variant="outline" label="部署" class="wide">
      <MlButton>預覽</MlButton>
      <MlButton>測試環境</MlButton>
      <MlButton variant="danger">正式上線</MlButton>
    </MlButtonGroup>
    <MlButtonGroup disabled label="已鎖定">
      <MlButton>複製</MlButton>
      <MlButton>移動</MlButton>
    </MlButtonGroup>
  </div>
</template>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  align-items: flex-start;
}
.wide {
  flex: 1 1 280px;
}
</style>
