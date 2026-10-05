<template>
  <div class="stack">
    <p>
      <span class="ml-hud-label">全形半形</span>
      <MlHighlight text="型號 ＡＢＣ－１２３ 已出貨" keywords="abc-123" />
    </p>
    <p>
      <span class="ml-hud-label">區分大小寫</span>
      <MlHighlight text="Lion lion LION" keywords="Lion" case-sensitive />
    </p>
    <p>
      <span class="ml-hud-label">重疊合併</span>
      <MlHighlight text="碼力獅子座" :keywords="['力獅', '獅子']" tone="tech" />
    </p>
    <p>
      <span class="ml-hud-label">特殊字元</span>
      <MlHighlight text="正規表達式 (a|b)* 與 C++" :keywords="['(a|b)*', 'C++']" tone="success" />
    </p>
    <p>
      <span class="ml-hud-label">自訂標籤</span>
      <MlHighlight text="部署失敗：權限不足" keywords="失敗" tag="strong" tone="danger" />
    </p>
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 10px;
}
.stack p {
  display: flex;
  gap: 12px;
  align-items: baseline;
  margin: 0;
}
.stack .ml-hud-label {
  min-width: 80px;
}
</style>
