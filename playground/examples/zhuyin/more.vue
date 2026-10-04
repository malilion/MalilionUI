<script setup lang="ts">
import { registerZhuyin } from '@malilion/ui'

// Words beat single characters, so 破音字 read correctly in context.
registerZhuyin({
  我: 'ㄨㄛˇ', 去: 'ㄑㄩˋ', 他: 'ㄊㄚ', 在: 'ㄗㄞˋ', 走: 'ㄗㄡˇ', 路: 'ㄌㄨˋ',
  行: 'ㄒㄧㄥˊ', 銀行: 'ㄧㄣˊ ㄏㄤˊ', 銀: 'ㄧㄣˊ',
})
</script>

<template>
  <div class="stack">
    <p class="big"><MlZhuyin text="我們的獅子朋友" zhuyin="ㄨㄛˇ ˙ㄇㄣ ˙ㄉㄜ ㄕ ˙ㄗ ㄆㄥˊ ˙ㄧㄡ" /></p>
    <p class="big"><MlZhuyin text="我去銀行，他在行走路。" /></p>
    <p class="mid"><MlZhuyin text="碼力獅學注音" zhuyin="mǎ lì shī xué zhù yīn" position="top" /></p>
  </div>
</template>

<style scoped>
.stack p {
  margin: 0 0 8px;
}
.big {
  font-size: 1.75rem;
}
.mid {
  font-size: 1.375rem;
}
</style>
