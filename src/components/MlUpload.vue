<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, useId, watch } from 'vue'
import MlIcon from './MlIcon.vue'
import MlImagePreview from './MlImagePreview.vue'
import MlPaw from './MlPaw.vue'
import { CARD_DRAG_THRESHOLD, addFiles, canAddMore, cardIndexAt, createThumbStore, formatSize, moveItem, reorderKey, uploadState } from './upload'
import { useLocale } from '../locale'
import type { MlUploadFile, MlUploadListType, MlUploadRejectReason } from '../types'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    /** Same syntax as <input accept>: ".png,.pdf", "image/*"… */
    accept?: string
    multiple?: boolean
    /** Bytes. Larger files are rejected. */
    maxSize?: number
    /** Most files kept. Extra ones are rejected with 'count'; the picture wall hides its add tile when full. */
    maxCount?: number
    disabled?: boolean
    title?: string
    hint?: string
    /** 'picture': a wall of thumbnail cards that can be previewed and reordered. */
    listType?: MlUploadListType
    /** Card width / height in picture mode. */
    aspect?: number
  }>(),
  { multiple: true, listType: 'text', aspect: 1 },
)

const emit = defineEmits<{ reject: [file: File, reason: MlUploadRejectReason] }>()
const files = defineModel<MlUploadFile[]>({ default: () => [] })

const uid = useId()
const inputId = `ml-upload-${uid}`
const hintId = `ml-upload-${uid}-reorder`
const root = ref<HTMLElement>()
const dragging = ref(false)
let dragDepth = 0

const picture = computed(() => props.listType === 'picture')
const canAdd = computed(() => canAddMore(files.value.length, props.maxCount))

function add(list: FileList | File[] | null) {
  if (!list || props.disabled) return
  const { next, rejected } = addFiles(files.value, Array.from(list), props)
  for (const [file, reason] of rejected) emit('reject', file, reason)
  if (next) files.value = next
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

/* ── Picture wall ── */

// Object URLs are made after mount (never during SSR) and revoked when their file leaves.
const thumbStore = createThumbStore()
const thumbs = shallowRef(new Map<File, string>())
function syncThumbs() {
  if (thumbStore.sync(picture.value ? files.value : [])) thumbs.value = new Map(thumbStore.urls)
}
onMounted(() => {
  syncThumbs()
  watch([files, picture], syncThumbs)
})
onBeforeUnmount(() => thumbStore.clear())

const previewOpen = ref(false)
const previewIndex = ref(0)
const previewable = computed(() => files.value.filter((file) => thumbs.value.has(file)))
const previewImages = computed(() => previewable.value.map((file) => thumbs.value.get(file)!))
const previewAlts = computed(() => previewable.value.map((file) => file.name))
function openPreview(file: File) {
  previewIndex.value = Math.max(0, previewable.value.indexOf(file))
  previewOpen.value = true
}

const announce = ref('')
async function move(from: number, to: number, refocus: boolean) {
  if (from === to) return
  files.value = moveItem(files.value, from, to)
  announce.value = loc.value.upload.moved(to + 1)
  if (!refocus) return
  await nextTick()
  root.value?.querySelectorAll<HTMLElement>('.ml-upload__card')[to]?.focus()
}

function onCardKeydown(event: KeyboardEvent, index: number) {
  if (!event.altKey || props.disabled) return
  const to = reorderKey(event.key, index, files.value.length)
  if (to === null) return
  event.preventDefault()
  move(index, to, true)
}

// Drag a card onto another to reorder. The pressed card follows the pointer.
let press: { index: number; x: number; y: number } | null = null
const drag = ref<{ from: number; over: number; dx: number; dy: number } | null>(null)

function onCardPointerDown(event: PointerEvent, index: number) {
  if (props.disabled || event.button !== 0 || (event.target as Element).closest('button')) return
  press = { index, x: event.clientX, y: event.clientY }
  ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
}

function onCardPointerMove(event: PointerEvent) {
  if (!press) return
  const dx = event.clientX - press.x
  const dy = event.clientY - press.y
  if (!drag.value && Math.hypot(dx, dy) < CARD_DRAG_THRESHOLD) return
  const over = cardIndexAt(root.value, event.clientX, event.clientY, press.index)
  // Off every other card (a gap, or back home) means "drop nowhere".
  drag.value = { from: press.index, over: over < 0 ? press.index : over, dx, dy }
}

function onCardPointerUp() {
  const done = drag.value
  press = null
  drag.value = null
  if (done) move(done.from, done.over, false)
}
</script>

<template>
  <div
    ref="root"
    :class="['ml-upload', { 'ml-upload--picture': picture, 'ml-upload--dragging': dragging, 'ml-upload--disabled': disabled }]"
    :style="picture ? { '--ml-upload-aspect': aspect } : undefined"
  >
    <template v-if="picture">
      <div class="ml-upload__wall">
        <ul v-if="files.length" role="list" class="ml-upload__cards" :aria-label="loc.upload.files">
          <li
            v-for="(file, i) in files"
            :key="fileKey(file)"
            role="listitem"
            :class="[
              'ml-upload__card',
              uploadState(file).status && `ml-upload__card--${uploadState(file).status}`,
              { 'ml-upload__card--dragging': drag?.from === i, 'ml-upload__card--over': drag && drag.from !== i && drag.over === i },
            ]"
            :style="drag?.from === i ? { translate: `${drag.dx}px ${drag.dy}px` } : undefined"
            :data-index="i"
            :tabindex="disabled ? undefined : 0"
            :aria-label="file.name"
            :aria-describedby="disabled ? undefined : hintId"
            @keydown="onCardKeydown($event, i)"
            @pointerdown="onCardPointerDown($event, i)"
            @pointermove="onCardPointerMove"
            @pointerup="onCardPointerUp"
            @pointercancel="onCardPointerUp"
          >
            <img v-if="thumbs.get(file)" :src="thumbs.get(file)" alt="" class="ml-upload__thumb" draggable="false" />
            <span v-else class="ml-upload__doc">
              <MlIcon name="file" class="ml-upload__doc-icon" />
              <span class="ml-upload__doc-name">{{ file.name }}</span>
            </span>
            <span
              v-if="uploadState(file).status === 'uploading'"
              class="ml-upload__overlay ml-upload__overlay--progress"
              role="progressbar"
              aria-valuemin="0"
              aria-valuemax="100"
              :aria-valuenow="uploadState(file).percent"
              :aria-label="loc.upload.uploading(file.name, uploadState(file).percent)"
            >
              <span class="ml-upload__percent">{{ uploadState(file).percent }}%</span>
              <span class="ml-upload__bar"><span class="ml-upload__bar-fill" :style="{ width: `${uploadState(file).percent}%` }" /></span>
            </span>
            <span v-else-if="uploadState(file).status === 'error'" class="ml-upload__overlay ml-upload__overlay--error">
              <MlIcon name="danger" class="ml-upload__error-icon" />
              <span class="ml-upload__error">{{ uploadState(file).error || loc.upload.failed }}</span>
            </span>
            <span class="ml-upload__actions">
              <button
                v-if="thumbs.get(file)"
                type="button"
                class="ml-upload__action ml-upload__preview"
                :aria-label="loc.upload.preview(file.name)"
                @click="openPreview(file)"
              >
                <MlIcon name="eye" />
              </button>
              <button type="button" class="ml-upload__action ml-upload__remove" :aria-label="loc.common.remove(file.name)" @click="remove(i)">
                <MlIcon name="close" />
              </button>
            </span>
          </li>
        </ul>
        <label
          v-if="canAdd"
          :for="inputId"
          class="ml-upload__add"
          @dragenter.prevent="onDragEnter"
          @dragover.prevent
          @dragleave="onDragLeave"
          @drop.prevent="onDrop"
        >
          <MlIcon name="plus" class="ml-upload__add-icon" />
          <span class="ml-upload__add-text">{{ title ?? loc.upload.add }}</span>
        </label>
      </div>
      <span v-if="hint" class="ml-upload__hint">{{ hint }}</span>
      <span :id="hintId" class="ml-visually-hidden">{{ loc.upload.reorderHint }}</span>
      <span class="ml-visually-hidden" aria-live="polite">{{ announce }}</span>
    </template>
    <label
      v-else
      :for="inputId"
      class="ml-upload__zone"
      @dragenter.prevent="onDragEnter"
      @dragover.prevent
      @dragleave="onDragLeave"
      @drop.prevent="onDrop"
    >
      <MlIcon name="upload" class="ml-upload__icon" />
      <span class="ml-upload__title">{{ title ?? loc.upload.title }}</span>
      <span class="ml-upload__sub">{{ loc.upload.or }}<u>{{ loc.upload.browse }}</u></span>
      <span v-if="hint" class="ml-upload__hint">{{ hint }}</span>
    </label>
    <input
      :id="inputId"
      type="file"
      class="ml-visually-hidden ml-upload__input"
      :accept="accept"
      :multiple="multiple"
      :disabled="disabled || (picture && !canAdd)"
      @change="onChange"
    />
    <TransitionGroup v-if="!picture && files.length" tag="ul" name="ml-upload-file" class="ml-upload__list">
      <li v-for="(file, i) in files" :key="fileKey(file)" class="ml-upload__file">
        <MlPaw tone="current" class="ml-upload__paw" />
        <span class="ml-upload__name">{{ file.name }}</span>
        <span class="ml-upload__size">{{ formatSize(file.size) }}</span>
        <button type="button" class="ml-upload__remove" :aria-label="loc.common.remove(file.name)" @click="remove(i)">
          <MlIcon name="close" />
        </button>
      </li>
    </TransitionGroup>
    <MlImagePreview v-if="picture" v-model:open="previewOpen" v-model:index="previewIndex" :images="previewImages" :alts="previewAlts" />
  </div>
</template>
