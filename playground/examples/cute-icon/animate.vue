<script setup lang="ts">
import type { CuteIconName, MlCuteIconAnimation } from '@malilion/ui'

const demos: { name: CuteIconName; animate: MlCuteIconAnimation }[] = [
  { name: 'chick', animate: 'bounce' },
  { name: 'bell', animate: 'wiggle' },
  { name: 'ghost', animate: 'float' },
  { name: 'heart', animate: 'beat' },
  { name: 'sun', animate: 'spin' },
  { name: 'panda', animate: 'blink' },
]
</script>

<template>
  <div class="cute-animate">
    <div class="row">
      <figure v-for="d in demos" :key="d.animate">
        <MlCuteIcon :name="d.name" :size="56" :animate="d.animate" />
        <figcaption>{{ d.animate }}</figcaption>
      </figure>
    </div>
    <div class="row">
      <MlButton><MlCuteIcon name="gift" animate="wiggle" hover :size="20" />領取禮物</MlButton>
      <MlButton variant="outline"><MlCuteIcon name="rocket" animate="bounce" hover :size="20" />發射</MlButton>
      <MlButton variant="ghost"><MlCuteIcon name="cat" animate="blink" hover :size="20" />喵一下</MlButton>
    </div>
  </div>
</template>

<style scoped>
.cute-animate { display: grid; gap: 22px; }
.row { display: flex; align-items: center; gap: 22px; flex-wrap: wrap; }
figure { display: grid; justify-items: center; gap: 6px; margin: 0; }
figcaption { font: 12px var(--ml-font-mono); color: var(--ml-text-muted); }
</style>
