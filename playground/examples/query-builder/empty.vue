<script setup lang="ts">
import type { MlQueryField } from '@malilion/ui'

const fields: MlQueryField[] = [
  { key: 'title', label: '標題', type: 'text' },
  { key: 'views', label: '瀏覽數', type: 'number', operators: ['gt', 'lt', 'between'] },
]
</script>

<template>
  <MlQueryBuilder :fields="fields" :max-depth="2" size="md" />
</template>
