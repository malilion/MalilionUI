<script setup lang="ts">
import { ref } from 'vue'
import { toast } from '@malilion/ui'

const liked = ref(true)
const size = ref('m')
const progress = ref(68)
</script>

<template>
  <div class="grid">
    <div class="cell">
      <p class="ml-hud-label">Badge</p>
      <div class="row">
        <MlBadge paw>Lion</MlBadge>
        <MlBadge tone="bean" paw>Cute</MlBadge>
        <MlBadge solid tone="bean" paw>Purr</MlBadge>
      </div>
    </div>
    <div class="cell">
      <p class="ml-hud-label">Checkbox · Radio</p>
      <div class="row">
        <MlCheckbox v-model="liked" paw label="喜歡" />
        <MlRadioGroup
          v-model="size"
          :options="[
            { value: 's', label: 'S' },
            { value: 'm', label: 'M' },
          ]"
        />
      </div>
    </div>
    <div class="cell">
      <p class="ml-hud-label">Progress</p>
      <MlProgress :value="progress" label="Hunting" paw />
    </div>
    <div class="cell">
      <p class="ml-hud-label">Loader · Toast</p>
      <div class="row">
        <MlLoader variant="paws" :size="32" />
        <MlLoader variant="paws" tone="bean" :size="32" />
        <MlButton size="sm" variant="outline" stamp @click="toast('嗷嗚～收到一個腳印通知')">
          通知
        </MlButton>
      </div>
    </div>
  </div>
  <MlDivider paw />
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 24px;
}

.cell .ml-hud-label {
  margin: 0 0 10px;
}

.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
}
</style>
