<script setup lang="ts">
import { ref, watch } from 'vue'
import { useToast, type MlUploadFile, type MlUploadRejectReason } from '@malilion/ui'

const toast = useToast()
const files = ref<MlUploadFile[]>([])

// Pretend to upload each new file: tick its percent, then mark it done.
// File objects aren't reactive, so hand MlUpload a new array after each change.
watch(files, (list) => {
  for (const file of list) {
    if (file.status) continue
    file.status = 'uploading'
    file.percent = 0
    const timer = setInterval(() => {
      file.percent = Math.min(100, (file.percent ?? 0) + 8 + Math.random() * 18)
      if (file.percent >= 100) {
        clearInterval(timer)
        // Files named "fail…" show the error overlay
        file.status = file.name.toLowerCase().startsWith('fail') ? 'error' : 'done'
      }
      files.value = [...files.value]
    }, 180)
  }
})

const reasons: Record<MlUploadRejectReason, string> = {
  type: '只收圖片',
  size: '超過 5MB',
  count: '最多 6 張',
}
function onReject(file: File, reason: MlUploadRejectReason) {
  toast.warning(`${file.name}：${reasons[reason]}`)
}
</script>

<template>
  <MlUpload
    v-model="files"
    list-type="picture"
    accept="image/*"
    :max-size="5 * 1024 * 1024"
    :max-count="6"
    hint="最多 6 張，拖曳卡片或按 Alt + ← / → 調整順序"
    style="max-width: 520px"
    @reject="onReject"
  />
</template>
