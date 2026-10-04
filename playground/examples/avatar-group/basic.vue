<script setup lang="ts">
import type { MlAvatarGroupItem } from '@malilion/ui'

const team: MlAvatarGroupItem[] = [
  { name: '碼力獅', lion: true, status: 'online' },
  { name: 'Leo', ring: 'steel' },
  { name: 'Nala', ring: 'tech', status: 'busy' },
  { name: '小虎' },
  { name: 'Simba', ring: 'steel' },
  { name: '阿金', status: 'away' },
  { name: 'Kiara', ring: 'tech' },
]
</script>

<template>
  <div class="rows">
    <MlAvatarGroup :items="team" :max="4" />
    <MlAvatarGroup :items="team.slice(0, 5)" :total="128" size="sm" spacing="tight" label="專案成員" />
    <MlAvatarGroup :items="team" :max="3" size="lg" spacing="loose" ring="steel" />
  </div>
</template>

<style scoped>
.rows {
  display: grid;
  justify-items: start;
  gap: 18px;
}
</style>
