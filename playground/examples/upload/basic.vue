<script setup lang="ts">
import { ref } from 'vue'
import { useToast, type MlUploadRejectReason } from '@malilion/ui'

const toast = useToast()
const files = ref<File[]>([])

function onReject(file: File, reason: MlUploadRejectReason) {
  toast.warning(reason === 'size' ? `${file.name} 超過 10MB` : `${file.name} 格式不支援`)
}
</script>

<template>
  <MlUpload
    v-model="files"
    accept=".png,.jpg,.svg,.pdf"
    :max-size="10 * 1024 * 1024"
    hint="PNG, JPG, SVG, PDF (Max 10MB)"
    style="max-width: 460px"
    @reject="onReject"
  />
</template>
