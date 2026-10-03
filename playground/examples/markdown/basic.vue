<script setup lang="ts">
const source = `# 碼力獅 Markdown

支援 **粗體**、*斜體*、~~刪除線~~、\`行內程式碼\`，以及 [連結](https://github.com/malilion/MalilionUI) 與自動連結 https://malilion.github.io/MalilionUI/。

## 清單

- 獅鬃金 Night Pride
- 日光鈦 Daylight
  1. 巢狀的有序清單
  2. 第二項
- [x] 已完成的任務
- [ ] 還沒做的任務

> 引言區塊：小獅子說，程式碼要像鬃毛一樣整齊。

## 表格

| 元件 | 類型 | 數量 |
| :--- | :---: | ---: |
| MlButton | 基礎 | 6 |
| MlChat | 資料展示 | 3 |
| MlMarkdown | 資料展示 | 1 |

## 程式碼

\`\`\`ts
import { MlMarkdown } from '@malilion/ui'

const answer = ref('**嗷嗚！**')
\`\`\`

---

原始 HTML 一律當成文字：<script>alert('roar')<\/script>，\`javascript:\` 連結也會被拿掉：[不安全](javascript:alert(1))。`
</script>

<template>
  <MlMarkdown :source="source" class="doc" />
</template>

<style scoped>
.doc {
  width: 100%;
}
</style>
