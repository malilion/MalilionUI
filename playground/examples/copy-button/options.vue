<script setup lang="ts">
import { ref } from 'vue'

const count = ref(0)
const log = ref('還沒複製')

// A getter is read at click time, so it always copies the latest value.
const snapshot = () => JSON.stringify({ roars: count.value, at: new Date().toISOString() })
// { text, html } writes both flavours (rich paste into docs / mail).
const rich = { text: '碼力獅 Malilion', html: '<strong style="color:#f0ad2f">碼力獅</strong> Malilion' }
</script>

<template>
  <div class="row">
    <MlButton variant="steel" size="sm" stamp @click="count++">吼 × {{ count }}</MlButton>
    <MlCopyButton :value="snapshot" variant="button" size="sm" label="複製狀態" copied-label="狀態到手！" @copy="(t) => (log = t)" />
    <MlCopyButton :value="rich" variant="button" size="sm" stamp="bean" label="複製 HTML" />
    <MlCopyButton value="小型" size="sm" placement="bottom" />
    <MlCopyButton value="大型" size="lg" stamp="tech" />
    <MlCopyButton value="不能複製" disabled />
  </div>
  <p class="ml-hud-label">@copy → {{ log }}</p>
</template>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  width: 100%;
}
</style>
