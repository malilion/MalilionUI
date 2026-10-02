<template>
  <div class="row">
    <MlBorderBeam class="box">
      <MlCard title="獅金能量" eyebrow="tone: gold">預設每 4 秒繞一圈。</MlCard>
    </MlBorderBeam>
    <MlBorderBeam tone="tech" :duration="2.5" :size="3" class="box">
      <MlCard title="科技青光" eyebrow="tone: tech">快一點、粗一點。</MlCard>
    </MlBorderBeam>
    <MlBorderBeam tone="bean" reverse class="box">
      <MlCard title="肉球粉" eyebrow="reverse">反方向繞行。</MlCard>
    </MlBorderBeam>
  </div>
</template>

<style scoped>
.row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.box {
  display: block;
}
</style>
