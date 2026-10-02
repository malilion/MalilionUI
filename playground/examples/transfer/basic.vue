<script setup lang="ts">
import { ref } from 'vue'

const members = [
  { key: 'simba', label: 'Simba', hint: 'Alpha' },
  { key: 'nala', label: 'Nala', hint: 'Hunter' },
  { key: 'rafiki', label: 'Rafiki', hint: 'Elder' },
  { key: 'timon', label: 'Timon', hint: 'Scout' },
  { key: 'pumbaa', label: 'Pumbaa', hint: 'Scout' },
  { key: 'zazu', label: 'Zazu', hint: 'Messenger' },
  { key: 'scar', label: 'Scar', hint: '已停權', disabled: true },
]
const team = ref<(string | number)[]>(['nala'])
</script>

<template>
  <div class="box">
    <MlTransfer v-model="team" :data="members" :titles="['獅群成員', '本次任務']" filterable />
    <p class="ml-hud-label">team = {{ team.join(', ') || '—' }}</p>
  </div>
</template>

<style scoped>
.box {
  display: grid;
  gap: 10px;
  max-width: 640px;
}
</style>
