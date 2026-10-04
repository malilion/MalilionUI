<script setup lang="ts">
import { lionAvatarUrl } from '@malilion/ui'
</script>

<template>
  <MlPuzzle :src="lionAvatarUrl" :rows="2" :cols="4" :ratio="2" :width="420" tone="bean" :seed="42" :ghost="false" />
</template>
