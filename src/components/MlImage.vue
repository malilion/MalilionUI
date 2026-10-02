<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import MlImagePreview from './MlImagePreview.vue'
import MlPaw from './MlPaw.vue'

const props = withDefaults(
  defineProps<{
    src: string
    alt: string
    /** Number → px, or any CSS length. */
    width?: number | string
    height?: number | string
    fit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
    /** Native lazy loading. */
    lazy?: boolean
    /** Click to open a full-screen preview. */
    preview?: boolean
    /** Images the preview can page through; defaults to just `src`. */
    previewList?: string[]
    /** Rounded "portrait" corners instead of the chamfer. */
    round?: boolean
  }>(),
  { fit: 'cover', lazy: true },
)

const emit = defineEmits<{ load: [event: Event]; error: [event: Event] }>()

const status = ref<'loading' | 'loaded' | 'error'>('loading')
const previewOpen = ref(false)
const previewIndex = ref(0)

const list = computed(() => (props.previewList?.length ? props.previewList : [props.src]))
const len = (v: number | string | undefined) => (typeof v === 'number' ? `${v}px` : v)

watch(() => props.src, () => (status.value = 'loading'))

function onLoad(event: Event) {
  status.value = 'loaded'
  emit('load', event)
}

function onError(event: Event) {
  status.value = 'error'
  emit('error', event)
}

function openPreview() {
  if (!props.preview || status.value === 'error') return
  previewIndex.value = Math.max(0, list.value.indexOf(props.src))
  previewOpen.value = true
}
</script>

<template>
  <div
    :class="[
      'ml-image',
      `ml-image--${status}`,
      { 'ml-image--preview': preview && status !== 'error', 'ml-image--round': round },
    ]"
    :style="{ width: len(width), height: len(height) }"
  >
    <img
      v-show="status !== 'error'"
      :src="src"
      :alt="alt"
      :loading="lazy ? 'lazy' : undefined"
      class="ml-image__img"
      :style="{ objectFit: fit }"
      @load="onLoad"
      @error="onError"
    />
    <span v-if="status === 'loading'" class="ml-image__placeholder" aria-hidden="true">
      <slot name="placeholder" />
    </span>
    <span v-else-if="status === 'error'" class="ml-image__error" role="img" :aria-label="`${alt}（無法載入）`">
      <slot name="error">
        <MlPaw tone="steel" class="ml-image__error-paw" />
        <span>無法載入</span>
      </slot>
    </span>
    <button
      v-if="preview && status !== 'error'"
      type="button"
      class="ml-image__zoom"
      :aria-label="`放大檢視：${alt}`"
      @click="openPreview"
    />
    <MlImagePreview
      v-if="preview"
      v-model:open="previewOpen"
      v-model:index="previewIndex"
      :images="list"
    />
  </div>
</template>
