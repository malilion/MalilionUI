<template>
  <div class="stack">
    <p>
      <MlText>預設</MlText> ·
      <MlText tone="dim">次要</MlText> ·
      <MlText tone="gold">獅金</MlText> ·
      <MlText tone="tech">科技青</MlText> ·
      <MlText tone="success">成功</MlText> ·
      <MlText tone="warning">警告</MlText> ·
      <MlText tone="danger">危險</MlText>
    </p>
    <p>
      <MlText strong>粗體</MlText> ·
      <MlText italic>斜體</MlText> ·
      <MlText underline>底線</MlText> ·
      <MlText delete>原價 NT$1,280</MlText> ·
      <MlText mark>重點標記</MlText> ·
      <MlText code>npm i @malilion/ui</MlText> ·
      <MlText mono>ORD-2026-1004-0042</MlText>
    </p>
    <p>
      訂單編號 <MlText mono copyable>ORD-2026-1004-0042</MlText>
      ，統編 <MlText mono copyable="24536806">2453-6806</MlText>
    </p>
    <MlText as="p" :ellipsis="2" class="narrow">
      碼力獅是一套以獅子、科技與金屬為主題的元件庫，Vue 3 與 React 共用同一份 CSS。
      這段文字被限制在兩行，超出的部分會用刪節號收起來，適合卡片摘要或列表描述。
    </MlText>
    <MlText ellipsis class="narrow">一行截斷：https://malilion.github.io/MalilionUI/components/typography</MlText>
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 12px;
  width: 100%;
}

.stack p {
  margin: 0;
}

.narrow {
  max-width: 340px;
}
</style>
