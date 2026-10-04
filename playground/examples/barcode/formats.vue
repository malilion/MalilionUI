<template>
  <div class="codes">
    <MlBarcode value="4710088430120" format="ean13">EAN-13 · 商品條碼（471 = 台灣）</MlBarcode>
    <MlBarcode value="471008843012" format="ean13" :module="1.5" :height="48">只給 12 碼，自動補檢查碼</MlBarcode>
    <MlBarcode value="TW-0042" format="code39" :show-text="false" :height="40">Code 39 · 不顯示文字</MlBarcode>
    <MlBarcode value="中文不行" format="code128">無法編碼時</MlBarcode>
  </div>
</template>

<style scoped>
.codes {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 28px;
}
</style>
