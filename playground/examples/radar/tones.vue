<script setup lang="ts">
const few = [
  { angle: 60, distance: 0.7 },
  { angle: 250, distance: 0.4 },
]
</script>

<template>
  <MlRadar tone="danger" :size="180" :blips="few" :speed="180" :rings="3" />
  <MlRadar tone="success" :size="180" :blips="few" :speed="-60" :trail="60" />
  <MlRadar tone="bean" :size="180" :blips="few" paused :range-labels="['近', '中', '遠', '極遠']" />
</template>
