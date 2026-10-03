<script setup lang="ts">
const source = `## 自訂渲染

外部連結 [MalilionUI](https://github.com/malilion/MalilionUI) 會加上箭頭，站內連結 [回到頂端](#top) 不會。

\`\`\`lion
小獅子提醒：自訂的 lion 區塊會變成提示框。
\`\`\`

\`\`\`bash
npm i @malilion/ui
\`\`\`

### 標題錨點

開啟 \`heading-anchors\` 後，滑過標題會出現 # 連結。`
</script>

<template>
  <MlMarkdown :source="source" heading-anchors anchor-prefix="demo-" line-numbers class="doc">
    <template #code="{ code, lang }">
      <MlAlert v-if="lang === 'lion'" tone="info" title="碼力獅">{{ code }}</MlAlert>
      <MlCodeBlock v-else :code="code" :lang="lang" line-numbers />
    </template>
    <template #link="{ href, external, text }">
      <a class="ml-markdown__link" :href="href" :target="external ? '_blank' : undefined" :rel="external ? 'noopener noreferrer' : undefined">
        {{ text }}<template v-if="external"> ↗</template>
      </a>
    </template>
  </MlMarkdown>
</template>

<style scoped>
.doc {
  width: 100%;
}
</style>
