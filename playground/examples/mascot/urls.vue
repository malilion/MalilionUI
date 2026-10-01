<script setup lang="ts">
import { lionAvatarUrl } from '@malilion/ui'
</script>

<template>
  <!-- 也可以拿圖片網址自己用，例如 favicon、og:image 或背景 -->
  <img :src="lionAvatarUrl" alt="碼力獅" width="48" height="48" style="border-radius: 50%" />
  <code style="font-size: 12px; color: var(--ml-text-dim)">@malilion/ui/assets/lion-avatar.webp</code>
</template>
