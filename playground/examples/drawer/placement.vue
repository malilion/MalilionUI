<script setup lang="ts">
import { ref } from 'vue'

type Edge = 'right' | 'left' | 'top' | 'bottom'
const edge = ref<Edge>('right')
const open = ref(false)
const edges: Edge[] = ['left', 'right', 'top', 'bottom']

function openAt(e: Edge) {
  edge.value = e
  open.value = true
}
</script>

<template>
  <MlButton v-for="e in edges" :key="e" variant="outline" @click="openAt(e)">
    {{ e }}
  </MlButton>

  <MlDrawer
    v-model:open="open"
    :placement="edge"
    :size="edge === 'top' || edge === 'bottom' ? 280 : 360"
    :title="`從 ${edge} 滑出`"
  >
    抽屜會從指定的邊緣滑出，內側邊緣有一道金色能量條。
  </MlDrawer>
</template>
