<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import MlIcon from './MlIcon.vue'
import MlPaw from './MlPaw.vue'

const props = withDefaults(
  defineProps<{
    /** Same syntax as <input accept>: ".png,.pdf", "image/*"… */
    accept?: string
    multiple?: boolean
    /** Bytes. Larger files are rejected. */
    maxSize?: number
    disabled?: boolean
    title?: string
    hint?: string
  }>(),
  { title: '把檔案拖到這裡', multiple: true },
)

const emit = defineEmits<{ reject: [file: File, reason: 'type' | 'size'] }>()
const files = defineModel<File[]>({ default: () => [] })

const inputId = `ml-upload-${useId()}`
const dragging = ref(false)
let dragDepth = 0

const acceptList = computed(() =>
  (props.accept ?? '')
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean),
)

function accepts(file: File) {
  if (!acceptList.value.length) return true
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()
  return acceptList.value.some((rule) => {
    if (rule.startsWith('.')) return name.endsWith(rule)
    if (rule.endsWith('/*')) return type.startsWith(rule.slice(0, -1))
    return type === rule
  })
}

function add(list: FileList | null) {
  if (!list || props.disabled) return
  const incoming: File[] = []
  for (const file of Array.from(list)) {
    if (!accepts(file)) emit('reject', file, 'type')
    else if (props.maxSize !== undefined && file.size > props.maxSize) emit('reject', file, 'size')
    else incoming.push(file)
  }
  if (!incoming.length) return
  files.value = props.multiple ? [...files.value, ...incoming] : incoming.slice(0, 1)
}

function remove(index: number) {
  files.value = files.value.filter((_, i) => i !== index)
}

function onChange(event: Event) {
  const input = event.target as HTMLInputElement
  add(input.files)
  input.value = '' // allow picking the same file again
}

function onDragEnter() {
  dragDepth++
  dragging.value = !props.disabled
}

function onDragLeave() {
  dragDepth = Math.max(0, dragDepth - 1)
  if (!dragDepth) dragging.value = false
}

function onDrop(event: DragEvent) {
  dragDepth = 0
  dragging.value = false
  add(event.dataTransfer?.files ?? null)
}

// Stable per-file keys, so removing a row animates that row rather than the last one.
const fileKeys = new WeakMap<File, number>()
let nextKey = 0
function fileKey(file: File) {
  let key = fileKeys.get(file)
  if (key === undefined) fileKeys.set(file, (key = nextKey++))
  return key
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
</script>

<template>
  <div :class="['ml-upload', { 'ml-upload--dragging': dragging, 'ml-upload--disabled': disabled }]">
    <label
      :for="inputId"
      class="ml-upload__zone"
      @dragenter.prevent="onDragEnter"
      @dragover.prevent
      @dragleave="onDragLeave"
      @drop.prevent="onDrop"
    >
      <MlIcon name="upload" class="ml-upload__icon" />
      <span class="ml-upload__title">{{ title }}</span>
      <span class="ml-upload__sub">或<u>點擊選擇檔案</u></span>
      <span v-if="hint" class="ml-upload__hint">{{ hint }}</span>
    </label>
    <input
      :id="inputId"
      type="file"
      class="ml-visually-hidden ml-upload__input"
      :accept="accept"
      :multiple="multiple"
      :disabled="disabled"
      @change="onChange"
    />
    <TransitionGroup v-if="files.length" tag="ul" name="ml-upload-file" class="ml-upload__list">
      <li v-for="(file, i) in files" :key="fileKey(file)" class="ml-upload__file">
        <MlPaw tone="current" class="ml-upload__paw" />
        <span class="ml-upload__name">{{ file.name }}</span>
        <span class="ml-upload__size">{{ formatSize(file.size) }}</span>
        <button type="button" class="ml-upload__remove" :aria-label="`移除 ${file.name}`" @click="remove(i)">
          <MlIcon name="close" />
        </button>
      </li>
    </TransitionGroup>
  </div>
</template>
