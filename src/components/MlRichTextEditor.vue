<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, useId, watch } from 'vue'
import type { AnyExtension, Editor } from '@tiptap/core'
import MlField from './MlField.vue'
import MlIcon from './MlIcon.vue'
import { describedBy, useSplitAttrs } from '../composables'
import { useFormField } from '../form'
import { useLocale } from '../locale'
import {
  applyEditorLink,
  cleanToolbar,
  createRichTextEditor,
  currentEditorLink,
  defaultEditorToolbar,
  editorToolGlyph,
  editorToolTitle,
  emptyEditorSnapshot,
  isMacPlatform,
  isToggleTool,
  nextToolbarIndex,
  normalizeEditorLink,
  refreshEditor,
  runEditorTool,
  setEditorLimit,
  snapshotEditor,
  type MlEditorStarterKitOptions,
  type MlEditorTool,
  type MlEditorToolbarItem,
} from './rich-text'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    label?: string
    hint?: string
    error?: string
    index?: string
    required?: boolean
    disabled?: boolean
    readonly?: boolean
    placeholder?: string
    /** Tools in order, '|' for a separator; false hides the toolbar. */
    toolbar?: MlEditorToolbarItem[] | false
    /** Character limit; also shows the counter. */
    maxLength?: number
    /** Show the character counter without a limit. */
    showCount?: boolean
    /** Height of the writing area; numbers are px. */
    minHeight?: number | string
    /** Grow up to this height, then scroll; numbers are px. */
    maxHeight?: number | string
    autofocus?: boolean
    /** Extra Tiptap extensions (read once, on mount). */
    extensions?: AnyExtension[]
    /** Options for Tiptap's StarterKit, e.g. `{ codeBlock: false }` (read once, on mount). */
    starterKit?: Partial<MlEditorStarterKitOptions>
    id?: string
  }>(),
  // toolbar's `false` would make Vue cast a missing prop to false, so give it a real default.
  { minHeight: 160, toolbar: () => defaultEditorToolbar },
)

const emit = defineEmits<{ focus: [event: FocusEvent]; blur: [event: FocusEvent]; ready: [editor: Editor] }>()
const model = defineModel<string>({ default: '' })

const loc = useLocale()
const { fieldError, fieldRequired } = useFormField(props)
const { rootAttrs } = useSplitAttrs()
const autoId = useId()
const controlId = computed(() => props.id ?? `ml-editor-${autoId}`)

const mount = ref<HTMLElement>()
const bar = ref<HTMLElement>()
const linkInput = ref<HTMLInputElement>()
const editor = shallowRef<Editor>()
const items = computed(() => (props.toolbar === false ? [] : cleanToolbar(props.toolbar)))
const state = shallowRef(emptyEditorSnapshot)
const mac = ref<boolean>()
const focusIndex = ref(0)
const linkOpen = ref(false)
const linkDraft = ref('')
const linkError = ref(false)
const locked = computed(() => props.disabled || props.readonly)
const counted = computed(() => !!props.maxLength || props.showCount)
// What the editor last emitted, so v-model echoing it back doesn't reset the caret.
let emitted: string | undefined

const size = (v?: number | string) => (typeof v === 'number' ? `${v}px` : v)
const sizes = computed(() => ({ '--ml-editor-min': size(props.minHeight), '--ml-editor-max': size(props.maxHeight) }))

const tools = computed(() => {
  let n = 0
  return items.value.map((item) =>
    item === '|'
      ? { sep: true as const }
      : {
          sep: false as const,
          tool: item,
          order: n++,
          label: loc.value.editor.tools[item],
          glyph: editorToolGlyph(item),
          toggle: isToggleTool(item),
        },
  )
})

const attributes = () => {
  const attrs: Record<string, string> = { id: controlId.value, class: 'ml-editor__content ml-prose', role: 'textbox', 'aria-multiline': 'true' }
  if (props.label) attrs['aria-labelledby'] = `${controlId.value}-label`
  else attrs['aria-label'] = props.placeholder ?? loc.value.editor.content
  const described = describedBy(controlId.value, props.hint, fieldError.value)
  if (described) attrs['aria-describedby'] = described
  if (fieldError.value) attrs['aria-invalid'] = 'true'
  if (fieldRequired.value) attrs['aria-required'] = 'true'
  if (props.readonly) attrs['aria-readonly'] = 'true'
  if (props.disabled) attrs['aria-disabled'] = 'true'
  return attrs
}

function readState(e: Editor) {
  state.value = snapshotEditor(e, items.value)
}

onMounted(() => {
  mac.value = isMacPlatform()
  emitted = model.value
  const e = createRichTextEditor({
    element: mount.value!,
    content: model.value,
    editable: !locked.value,
    placeholder: () => props.placeholder ?? loc.value.editor.placeholder,
    maxLength: props.maxLength,
    autofocus: props.autofocus,
    starterKit: props.starterKit,
    extensions: props.extensions,
    attributes: attributes(),
    onChange: (html) => {
      emitted = html
      model.value = html
    },
    onState: readState,
    onLinkShortcut: openLink,
    onFocus: (event) => emit('focus', event),
    onBlur: (event) => emit('blur', event),
  })
  editor.value = e
  // Tiptap's onCreate waits a tick; the counter and toolbar shouldn't.
  readState(e)
  emit('ready', e)
})

onBeforeUnmount(() => editor.value?.destroy())

watch(model, (value) => {
  const e = editor.value
  if (!e || value === emitted) return
  emitted = value
  e.commands.setContent(value || '', { emitUpdate: false })
})
watch(locked, (value) => {
  editor.value?.setEditable(!value, false)
  if (value) linkOpen.value = false
  if (editor.value) readState(editor.value)
})
watch(
  () => [controlId.value, props.label, props.hint, props.placeholder, fieldError.value, fieldRequired.value, props.readonly, props.disabled],
  () => editor.value?.setOptions({ editorProps: { attributes: attributes() } }),
)
watch(() => props.placeholder ?? loc.value.editor.placeholder, () => refreshEditor(editor.value))
watch(() => props.maxLength, (n) => setEditorLimit(editor.value, n))
watch(items, () => editor.value && readState(editor.value))

function run(tool: MlEditorTool) {
  if (locked.value || !state.value.can[tool]) return
  if (tool === 'link') return linkOpen.value ? closeLink() : openLink()
  runEditorTool(editor.value, tool)
}

function onToolbarKey(event: KeyboardEvent) {
  const buttons = [...(bar.value?.querySelectorAll<HTMLButtonElement>('.ml-editor__tool') ?? [])]
  const next = nextToolbarIndex(buttons.length, focusIndex.value, event.key)
  if (next === undefined) return
  event.preventDefault()
  focusIndex.value = next
  buttons[next]?.focus()
}

function openLink() {
  if (locked.value || !editor.value) return
  linkDraft.value = currentEditorLink(editor.value)
  linkError.value = false
  linkOpen.value = true
  nextTick(() => linkInput.value?.select())
}

function closeLink() {
  linkOpen.value = false
  editor.value?.commands.focus()
}

function applyLink() {
  if (!linkDraft.value.trim()) return removeLink()
  const href = normalizeEditorLink(linkDraft.value)
  if (!href || !applyEditorLink(editor.value, href)) {
    linkError.value = true
    return
  }
  linkOpen.value = false
}

function removeLink() {
  applyEditorLink(editor.value, null)
  linkOpen.value = false
}

function onLinkKey(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.isComposing) {
    event.preventDefault()
    applyLink()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    closeLink()
  }
}

defineExpose({
  /** The Tiptap editor (undefined until mounted). */
  get editor() {
    return editor.value
  },
  focus: () => editor.value?.commands.focus(),
  blur: () => editor.value?.commands.blur(),
})
</script>

<template>
  <MlField
    v-bind="rootAttrs()"
    :control-id="controlId"
    :label="label"
    :hint="hint"
    :error="fieldError"
    :index="index"
    :required="fieldRequired"
  >
    <div
      :class="[
        'ml-editor',
        {
          'ml-editor--focused': state.focused,
          'ml-editor--error': fieldError,
          'ml-editor--disabled': disabled,
          'ml-editor--readonly': readonly,
        },
      ]"
      :style="sizes"
    >
      <div
        v-if="tools.length || $slots['toolbar-extra']"
        ref="bar"
        class="ml-editor__toolbar"
        role="toolbar"
        :aria-label="loc.editor.toolbar"
        :aria-controls="controlId"
        @keydown="onToolbarKey"
      >
        <template v-for="(item, i) in tools" :key="i">
          <span v-if="item.sep" class="ml-editor__sep" aria-hidden="true" />
          <button
            v-else
            type="button"
            :class="['ml-editor__tool', { 'ml-editor__tool--active': state.active[item.tool] }]"
            :aria-label="item.label"
            :aria-pressed="item.toggle ? !!state.active[item.tool] : undefined"
            :aria-disabled="locked || !state.can[item.tool] ? true : undefined"
            :aria-expanded="item.tool === 'link' ? linkOpen : undefined"
            :title="editorToolTitle(item.tool, item.label, mac)"
            :tabindex="item.order === focusIndex ? 0 : -1"
            @mousedown.prevent
            @focus="focusIndex = item.order"
            @click="run(item.tool)"
          >
            <svg v-if="item.glyph.icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="item.glyph.icon" /></svg>
            <span v-else class="ml-editor__glyph" aria-hidden="true">{{ item.glyph.text }}</span>
          </button>
        </template>
        <slot name="toolbar-extra" :editor="editor" :locked="locked" />
      </div>
      <div v-if="linkOpen" class="ml-editor__linkbar">
        <input
          ref="linkInput"
          v-model="linkDraft"
          type="url"
          inputmode="url"
          :class="['ml-editor__link-input', { 'ml-editor__link-input--error': linkError }]"
          placeholder="https://"
          :aria-label="loc.editor.linkUrl"
          :aria-invalid="linkError ? true : undefined"
          :aria-describedby="linkError ? `${controlId}-link-error` : undefined"
          @input="linkError = false"
          @keydown="onLinkKey"
        />
        <button type="button" class="ml-editor__link-btn ml-editor__link-btn--apply" @click="applyLink">{{ loc.editor.linkApply }}</button>
        <button v-if="state.active.link" type="button" class="ml-editor__link-btn" @click="removeLink">{{ loc.editor.linkRemove }}</button>
        <button type="button" class="ml-editor__link-close" :aria-label="loc.common.close" @click="closeLink">
          <MlIcon name="close" />
        </button>
        <p v-if="linkError" :id="`${controlId}-link-error`" class="ml-editor__link-error" role="alert">{{ loc.editor.linkInvalid }}</p>
      </div>
      <div ref="mount" class="ml-editor__body" />
      <div v-if="counted" class="ml-editor__footer">
        <span :class="['ml-editor__count', { 'ml-editor__count--full': maxLength && state.characters >= maxLength }]">
          {{ loc.editor.count(state.characters, maxLength) }}
        </span>
      </div>
    </div>
  </MlField>
</template>
