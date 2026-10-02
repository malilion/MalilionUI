<script setup lang="ts">
import { lionAvatarUrl, lionFullUrl } from '@malilion/ui'
</script>

<template>
  <MlImage :src="lionFullUrl" alt="碼力獅全身" :width="160" :height="160" fit="contain" preview :preview-list="[lionFullUrl, lionAvatarUrl]" />
  <MlImage :src="lionAvatarUrl" alt="碼力獅頭像" :width="160" :height="160" preview :preview-list="[lionFullUrl, lionAvatarUrl]" />
  <MlImage :src="lionAvatarUrl" alt="圓形頭像" :width="96" :height="96" round />
</template>
