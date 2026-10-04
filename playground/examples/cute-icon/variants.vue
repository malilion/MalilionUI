<script setup lang="ts">
import type { CuteIconName } from '@malilion/ui'

const metal: CuteIconName[] = ['cyberLion', 'robot', 'chip', 'terminal', 'bolt', 'shield', 'gear', 'crown', 'trophy', 'paw']
</script>

<template>
  <div class="cute-variants">
    <div class="row">
      <MlCuteIcon name="lion" :size="56" />
      <MlCuteIcon name="lion" :size="56" variant="metal" />
      <MlCuteIcon name="lion" :size="56" variant="mono" style="color: var(--ml-gold-400)" />
      <MlCuteIcon name="lion" :size="56" variant="mono" style="color: var(--ml-cyan-400)" />
      <MlCuteIcon name="lion" :size="56" variant="line" />
      <MlCuteIcon name="lion" :size="56" variant="line" style="color: var(--ml-bean-400)" />
    </div>
    <div class="row metal">
      <MlCuteIcon v-for="n in metal" :key="n" :name="n" :size="48" variant="metal" />
    </div>
    <div class="row">
      <MlCuteIcon name="bubbleTea" :size="16" />
      <MlCuteIcon name="bubbleTea" :size="24" />
      <MlCuteIcon name="bubbleTea" :size="32" />
      <MlCuteIcon name="bubbleTea" :size="48" />
      <MlCuteIcon name="bubbleTea" :size="72" />
    </div>
    <p class="text">
      在文字裡也很自然 <MlCuteIcon name="heart" /> 預設是 1em，跟著字級走
      <MlCuteIcon name="star" variant="mono" /> 單色版用目前的文字顏色。
    </p>
  </div>
</template>

<style scoped>
.cute-variants { display: grid; gap: 18px; }
.row { display: flex; align-items: end; gap: 18px; flex-wrap: wrap; }
.metal { padding: 12px 14px; border-radius: 10px; background: var(--ml-metal-gunmetal); }
.text { margin: 0; font-size: 18px; color: var(--ml-text); }
</style>
