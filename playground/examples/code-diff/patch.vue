<script setup lang="ts">
// 直接貼上 git diff / git format-patch 的輸出，多個檔案會一個接一個列出。
const patch = `From 4f1c2e9 Mon Sep 17 00:00:00 2001
From: Malilion <roar@malilion.dev>
Subject: [PATCH] 吼聲加大、換上新的獅子 Logo

diff --git a/src/roar.ts b/src/roar.ts
index 83db48f..bf269f4 100644
--- a/src/roar.ts
+++ b/src/roar.ts
@@ -1,9 +1,10 @@
 import { pawBurst } from '@malilion/ui'
 
-export function roar(volume = 1) {
-  const text = '吼'.repeat(volume)
+export function roar(volume = 3) {
+  const text = '吼'.repeat(Math.min(volume, 10))
+  pawBurst({ count: volume * 4 })
   return text
 }
 
 /** 一次吼完整段 */
 export const chorus = () => [roar(), roar(2), roar(3)]
@@ -21,3 +22,3 @@ export function quiet() {
   // 安靜模式：只輕輕喵一聲
-  return '喵'
+  return '……喵'
 }
\\ No newline at end of file
diff --git a/docs/old-name.md b/docs/roar-guide.md
similarity index 88%
rename from docs/old-name.md
rename to docs/roar-guide.md
index 1111111..2222222 100644
--- a/docs/old-name.md
+++ b/docs/roar-guide.md
@@ -1,3 +1,3 @@
-# 吼叫指南
+# 碼力獅吼叫指南
 
 請在安全距離外欣賞。
diff --git a/public/lion.png b/public/lion.png
new file mode 100644
index 0000000..3a4b5c6
Binary files /dev/null and b/public/lion.png differ
`
</script>

<template>
  <MlCodeDiff :patch="patch" view="unified" style="width: 100%" />
</template>
