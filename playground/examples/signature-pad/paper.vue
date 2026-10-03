<script setup lang="ts">
import { ref } from 'vue'
import type { SignatureStroke } from '@malilion/ui'

type Pad = { toData: () => SignatureStroke[]; fromData: (strokes: SignatureStroke[]) => void; isEmpty: () => boolean }

const pad = ref<Pad>()
const saved = ref<SignatureStroke[] | null>(null)
const ink = ref('#1b2a4a')
const inks = [
  { value: '#1b2a4a', label: '藍黑' },
  { value: '#12151c', label: '墨黑' },
  { value: '#a85a1e', label: '古銅' },
]

function store() {
  if (!pad.value?.isEmpty()) saved.value = pad.value?.toData() ?? null
}
</script>

<template>
  <div class="wrap">
    <MlSegmented v-model="ink" :options="inks" size="sm" />
    <MlSignaturePad
      ref="pad"
      :pen-color="ink"
      background="#fbf8f1"
      :min-width="1"
      :max-width="3.5"
      :height="180"
      label="合約簽名"
      placeholder="甲方簽章"
    />
    <div class="row">
      <MlButton variant="outline" size="sm" @click="store">儲存筆畫</MlButton>
      <MlButton variant="ghost" size="sm" :disabled="!saved" @click="saved && pad?.fromData(saved)">重播筆畫</MlButton>
      <span class="ml-hud-label">{{ saved ? `已儲存 ${saved.length} 筆` : '筆畫資料可存成 JSON，之後用 fromData() 還原' }}</span>
    </div>
  </div>
</template>

<style scoped>
.wrap {
  display: grid;
  gap: 12px;
  width: 100%;
  max-width: 560px;
}

.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}
</style>
