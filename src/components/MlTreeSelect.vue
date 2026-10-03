<script setup lang="ts">
import { computed, nextTick, ref, useId } from 'vue'
import MlField from './MlField.vue'
import MlIcon from './MlIcon.vue'
import MlTree from './MlTree.vue'
import { describedBy, useOutsidePointer } from '../composables'
import { useFormField } from '../form'
import type { MlSize, MlTreeNode } from '../types'
import { useLocale } from '../locale'

const loc = useLocale()

type Key = string | number

const props = withDefaults(
  defineProps<{
    data: MlTreeNode[]
    /** Checkboxes; v-model becomes an array of keys. */
    multiple?: boolean
    label?: string
    hint?: string
    error?: string
    index?: string
    placeholder?: string
    size?: MlSize
    disabled?: boolean
    clearable?: boolean
    /** Filter box at the top of the panel. */
    searchable?: boolean
    /** Multiple: most tags shown before "+N". */
    maxTags?: number
    id?: string
  }>(),
  { size: 'md', maxTags: 3 },
)

const emit = defineEmits<{ change: [value: Key | Key[] | null] }>()
const model = defineModel<Key | Key[] | null>({ default: null })
const expanded = defineModel<Key[]>('expanded', { default: () => [] })
const { fieldError, fieldRequired } = useFormField(props)
const ph = computed(() => props.placeholder ?? loc.value.common.choose)

const autoId = useId()
const controlId = computed(() => props.id ?? `ml-treeselect-${autoId}`)
const root = ref<HTMLElement>()
const trigger = ref<HTMLElement>()
const panel = ref<HTMLElement>()
const open = ref(false)
const query = ref('')

const byKey = computed(() => {
  const map = new Map<Key, { node: MlTreeNode; parent: Key | null }>()
  const walk = (nodes: MlTreeNode[], parent: Key | null) =>
    nodes.forEach((n) => {
      map.set(n.key, { node: n, parent })
      if (n.children) walk(n.children, n.key)
    })
  walk(props.data, null)
  return map
})

const keys = computed<Key[]>(() => {
  const v = model.value
  return Array.isArray(v) ? v : v === null || v === undefined ? [] : [v]
})

/** In multiple mode, show a checked parent instead of all of its children. */
const shownNodes = computed(() => {
  const set = new Set(keys.value)
  return keys.value
    .filter((k) => {
      let p = byKey.value.get(k)?.parent ?? null
      while (p !== null) {
        if (set.has(p)) return false
        p = byKey.value.get(p)?.parent ?? null
      }
      return true
    })
    .map((k) => byKey.value.get(k)?.node)
    .filter((n): n is MlTreeNode => !!n)
})

/** Expand the ancestors of the chosen nodes so they're visible on open. */
function revealChosen() {
  const next = new Set(expanded.value)
  for (const k of keys.value) {
    let p = byKey.value.get(k)?.parent ?? null
    while (p !== null) {
      next.add(p)
      p = byKey.value.get(p)?.parent ?? null
    }
  }
  expanded.value = [...next]
}

async function show() {
  if (props.disabled || open.value) return
  revealChosen()
  query.value = ''
  open.value = true
  await nextTick()
  const target =
    panel.value?.querySelector<HTMLElement>('.ml-treeselect__search input') ??
    panel.value?.querySelector<HTMLElement>('[role="treeitem"][tabindex="0"]')
  target?.focus()
}

function hide(returnFocus = true) {
  open.value = false
  if (returnFocus) trigger.value?.focus()
}

function onSelect(node: MlTreeNode) {
  if (props.multiple || node.disabled) return
  model.value = node.key
  emit('change', node.key)
  hide()
}

function onChecked(next: Key[]) {
  model.value = next
  emit('change', next)
}

function remove(node: MlTreeNode) {
  // Unchecking a parent unchecks everything under it.
  const drop = new Set<Key>()
  const walk = (n: MlTreeNode) => {
    drop.add(n.key)
    n.children?.forEach(walk)
  }
  walk(node)
  // …and its ancestors are no longer fully checked.
  let p = byKey.value.get(node.key)?.parent ?? null
  while (p !== null) {
    drop.add(p)
    p = byKey.value.get(p)?.parent ?? null
  }
  onChecked(keys.value.filter((k) => !drop.has(k)))
}

function clear() {
  const next = props.multiple ? [] : null
  model.value = next
  emit('change', next)
  trigger.value?.focus()
}

function onPanelKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    hide()
  } else if (event.key === 'ArrowDown' && (event.target as HTMLElement).tagName === 'INPUT') {
    event.preventDefault()
    panel.value?.querySelector<HTMLElement>('[role="treeitem"]')?.focus()
  }
}

useOutsidePointer(root, () => open.value, () => hide(false))
</script>

<template>
  <MlField :control-id="controlId" :label="label" :hint="hint" :error="fieldError" :index="index" :required="fieldRequired">
    <div ref="root" :class="['ml-treeselect', 'ml-combobox', { 'ml-combobox--open': open, 'ml-combobox--multiple': multiple }]">
      <div
        :class="['ml-input', `ml-input--${size}`, 'ml-combobox__box', { 'ml-input--error': fieldError, 'ml-input--disabled': disabled }]"
        @click="($event.target as HTMLElement).closest('.ml-combobox__tag-remove, .ml-combobox__clear') || (open ? hide() : show())"
      >
        <div class="ml-combobox__value">
          <template v-if="multiple">
            <span v-for="node in shownNodes.slice(0, maxTags)" :key="node.key" class="ml-combobox__tag">
              {{ node.label }}
              <button
                v-if="!disabled"
                type="button"
                class="ml-combobox__tag-remove"
                tabindex="-1"
                :aria-label="loc.common.remove(node.label)"
                @click.stop="remove(node)"
              >
                <MlIcon name="close" />
              </button>
            </span>
            <span v-if="shownNodes.length > maxTags" class="ml-combobox__tag ml-treeselect__more">+{{ shownNodes.length - maxTags }}</span>
          </template>
          <div
            :id="controlId"
            ref="trigger"
            class="ml-input__control ml-combobox__display"
            role="combobox"
            aria-haspopup="tree"
            :aria-expanded="open"
            :aria-labelledby="label ? `${controlId}-label` : undefined"
            :aria-invalid="fieldError ? true : undefined"
            :aria-describedby="describedBy(controlId, hint, fieldError)"
            :aria-disabled="disabled || undefined"
            :tabindex="disabled ? -1 : 0"
            @keydown.down.prevent="show()"
            @keydown.enter.prevent="open ? hide() : show()"
            @keydown.space.prevent="open ? hide() : show()"
          >
            <span v-if="!multiple && shownNodes[0]" class="ml-combobox__single">{{ shownNodes[0].label }}</span>
            <span v-else-if="!shownNodes.length" class="ml-combobox__placeholder">{{ ph }}</span>
          </div>
        </div>
        <button
          v-if="clearable && keys.length && !disabled"
          type="button"
          class="ml-combobox__clear"
          tabindex="-1"
          :aria-label="loc.common.clear"
          @click.stop="clear"
        >
          <MlIcon name="close" />
        </button>
        <MlIcon name="chevronDown" class="ml-combobox__chevron" />
      </div>

      <Transition name="ml-dropdown">
        <div v-if="open" ref="panel" class="ml-cascader__panel ml-treeselect__panel" @keydown="onPanelKeydown">
          <div v-if="searchable" class="ml-cascader__search ml-treeselect__search">
            <MlIcon name="search" />
            <input v-model="query" type="text" :placeholder="loc.common.search" autocomplete="off" />
          </div>
          <MlTree
            v-if="multiple"
            v-model:expanded="expanded"
            :data="data"
            :filter="query"
            :label="label ?? ph"
            checkable
            :selectable="false"
            :checked="keys"
            @update:checked="onChecked"
          />
          <MlTree
            v-else
            v-model:expanded="expanded"
            :data="data"
            :filter="query"
            :label="label ?? ph"
            :selected="keys[0] ?? null"
            @select="onSelect"
          />
        </div>
      </Transition>
    </div>
  </MlField>
</template>
