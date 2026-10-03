<script setup lang="ts">
import { computed, nextTick, ref, useId } from 'vue'
import MlField from './MlField.vue'
import MlIcon from './MlIcon.vue'
import MlPaw from './MlPaw.vue'
import { describedBy, useOutsidePointer } from '../composables'
import { useFormField } from '../form'
import type { MlCascaderOption, MlSize } from '../types'
import { useLocale } from '../locale'

const loc = useLocale()

type Value = string | number

const props = withDefaults(
  defineProps<{
    options: MlCascaderOption[]
    label?: string
    hint?: string
    error?: string
    index?: string
    placeholder?: string
    size?: MlSize
    disabled?: boolean
    clearable?: boolean
    /** Allow picking a parent, not only a leaf. */
    changeOnSelect?: boolean
    /** Type to search every path at once. */
    searchable?: boolean
    /** Joins the labels of the chosen path. */
    separator?: string
    id?: string
  }>(),
  { size: 'md', separator: ' / ' },
)

const emit = defineEmits<{ change: [path: Value[], options: MlCascaderOption[]] }>()
/** The chosen path of values, outermost first. */
const model = defineModel<Value[]>({ default: () => [] })
const { fieldError, fieldRequired } = useFormField(props)
const ph = computed(() => props.placeholder ?? loc.value.cascader.placeholder)

const autoId = useId()
const controlId = computed(() => props.id ?? `ml-cascader-${autoId}`)
const root = ref<HTMLElement>()
const trigger = ref<HTMLElement>()
const panel = ref<HTMLElement>()
const open = ref(false)
/** Path being browsed in the panel (may be deeper or shallower than the model). */
const browse = ref<Value[]>([])
const query = ref('')

function resolve(path: Value[]) {
  const chain: MlCascaderOption[] = []
  let level: MlCascaderOption[] | undefined = props.options
  for (const v of path) {
    const found: MlCascaderOption | undefined = level?.find((o) => o.value === v)
    if (!found) break
    chain.push(found)
    level = found.children
  }
  return chain
}

const chosen = computed(() => resolve(model.value))
const display = computed(() => chosen.value.map((o) => o.label).join(props.separator))

/** One column per level of the browsed path. */
const columns = computed(() => {
  const cols: MlCascaderOption[][] = [props.options]
  for (const o of resolve(browse.value)) if (o.children?.length) cols.push(o.children)
  return cols
})

/** Every selectable path, for search mode. */
const allPaths = computed(() => {
  const out: MlCascaderOption[][] = []
  const walk = (opts: MlCascaderOption[], trail: MlCascaderOption[]) => {
    for (const o of opts) {
      if (o.disabled) continue
      const path = [...trail, o]
      if (o.children?.length) {
        if (props.changeOnSelect) out.push(path)
        walk(o.children, path)
      } else out.push(path)
    }
  }
  walk(props.options, [])
  return out
})

const matches = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []
  return allPaths.value.filter((p) => p.some((o) => o.label.toLowerCase().includes(q))).slice(0, 50)
})

async function show() {
  if (props.disabled || open.value) return
  browse.value = [...model.value]
  query.value = ''
  open.value = true
  await nextTick()
  focusIn(Math.max(0, columns.value.length - 1))
}

function hide(returnFocus = true) {
  open.value = false
  query.value = ''
  if (returnFocus) trigger.value?.focus()
}

function commit(path: MlCascaderOption[]) {
  const values = path.map((o) => o.value)
  model.value = values
  emit('change', values, path)
  hide()
}

function pick(level: number, option: MlCascaderOption) {
  if (option.disabled) return
  const path = [...browse.value.slice(0, level), option.value]
  browse.value = path
  if (!option.children?.length) commit(resolve(path))
  else if (props.changeOnSelect) {
    model.value = path
    emit('change', path, resolve(path))
  }
}

function clear() {
  model.value = []
  emit('change', [], [])
  trigger.value?.focus()
}

/** Focus the chosen (or first enabled) option in a column. */
async function focusIn(level: number, which: 'chosen' | 'first' = 'chosen') {
  await nextTick()
  const col = panel.value?.querySelectorAll<HTMLElement>('.ml-cascader__col')[level]
  if (!col) return
  const target =
    (which === 'chosen' && col.querySelector<HTMLElement>('.ml-cascader__opt--on')) ||
    col.querySelector<HTMLElement>('.ml-cascader__opt:not([aria-disabled="true"])')
  target?.focus()
}

function onOptionKeydown(event: KeyboardEvent, level: number, option: MlCascaderOption) {
  const col = (event.currentTarget as HTMLElement).closest('.ml-cascader__col')!
  const opts = [...col.querySelectorAll<HTMLElement>('.ml-cascader__opt:not([aria-disabled="true"])')]
  const at = opts.indexOf(event.currentTarget as HTMLElement)
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      opts[(at + 1) % opts.length]?.focus()
      break
    case 'ArrowUp':
      event.preventDefault()
      opts[(at - 1 + opts.length) % opts.length]?.focus()
      break
    case 'ArrowRight':
      event.preventDefault()
      if (option.children?.length && !option.disabled) {
        browse.value = [...browse.value.slice(0, level), option.value]
        focusIn(level + 1, 'first')
      }
      break
    case 'ArrowLeft':
      event.preventDefault()
      if (level > 0) {
        browse.value = browse.value.slice(0, level)
        focusIn(level - 1)
      }
      break
    case 'Enter':
    case ' ':
      event.preventDefault()
      pick(level, option)
      if (option.children?.length && !option.disabled) focusIn(level + 1, 'first')
      break
    case 'Escape':
      event.preventDefault()
      event.stopPropagation()
      hide()
      break
    case 'Tab':
      hide(false)
  }
}

function onSearchKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    hide()
  } else if (event.key === 'ArrowDown') {
    event.preventDefault()
    panel.value?.querySelector<HTMLElement>('.ml-cascader__hit')?.focus()
  }
}

function onHitKeydown(event: KeyboardEvent) {
  const hits = [...(panel.value?.querySelectorAll<HTMLElement>('.ml-cascader__hit') ?? [])]
  const at = hits.indexOf(event.currentTarget as HTMLElement)
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    hits[at + 1]?.focus()
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    ;(at === 0 ? panel.value?.querySelector<HTMLElement>('.ml-cascader__search input') : hits[at - 1])?.focus()
  } else if (event.key === 'Escape') {
    event.stopPropagation()
    hide()
  }
}

function highlight(label: string) {
  const q = query.value.trim()
  const at = q ? label.toLowerCase().indexOf(q.toLowerCase()) : -1
  if (at < 0) return [{ text: label, hit: false }]
  return [
    { text: label.slice(0, at), hit: false },
    { text: label.slice(at, at + q.length), hit: true },
    { text: label.slice(at + q.length), hit: false },
  ].filter((p) => p.text)
}

useOutsidePointer(root, () => open.value, () => hide(false))
</script>

<template>
  <MlField :control-id="controlId" :label="label" :hint="hint" :error="fieldError" :index="index" :required="fieldRequired">
    <div ref="root" :class="['ml-cascader', 'ml-combobox', { 'ml-combobox--open': open }]">
      <div
        :class="['ml-input', `ml-input--${size}`, 'ml-combobox__box', { 'ml-input--error': fieldError, 'ml-input--disabled': disabled }]"
        @click="open ? hide() : show()"
      >
        <div
          :id="controlId"
          ref="trigger"
          class="ml-input__control ml-combobox__display"
          role="combobox"
          aria-haspopup="dialog"
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
          <span v-if="display" class="ml-combobox__single ml-cascader__path">
            <template v-for="(o, i) in chosen" :key="o.value">
              <span v-if="i" class="ml-cascader__sep">{{ separator.trim() || '/' }}</span>{{ o.label }}
            </template>
          </span>
          <span v-else class="ml-combobox__placeholder">{{ ph }}</span>
        </div>
        <button
          v-if="clearable && model.length && !disabled"
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
        <div v-if="open" ref="panel" class="ml-cascader__panel" role="dialog" :aria-label="label ?? ph">
          <div v-if="searchable" class="ml-cascader__search">
            <MlIcon name="search" />
            <input v-model="query" type="text" :placeholder="loc.common.search" autocomplete="off" @keydown="onSearchKeydown" />
          </div>
          <ul v-if="query.trim()" class="ml-cascader__hits">
            <li v-for="(path, i) in matches" :key="i">
              <button type="button" class="ml-cascader__hit" @click="commit(path)" @keydown="onHitKeydown">
                <template v-for="(o, k) in path" :key="o.value">
                  <span v-if="k" class="ml-cascader__sep">/</span>
                  <template v-for="(p, j) in highlight(o.label)" :key="j">
                    <mark v-if="p.hit" class="ml-combobox__hit">{{ p.text }}</mark>
                    <template v-else>{{ p.text }}</template>
                  </template>
                </template>
              </button>
            </li>
            <li v-if="!matches.length" class="ml-combobox__empty">
              <MlPaw tone="steel" class="ml-combobox__empty-paw" />{{ loc.common.noMatch }}
            </li>
          </ul>
          <div v-else class="ml-cascader__cols">
            <ul v-for="(col, level) in columns" :key="level" class="ml-cascader__col" role="listbox">
              <li v-for="o in col" :key="o.value" role="none">
                <button
                  type="button"
                  role="option"
                  :aria-selected="browse[level] === o.value"
                  :aria-disabled="o.disabled || undefined"
                  :aria-haspopup="o.children?.length ? 'listbox' : undefined"
                  :class="[
                    'ml-cascader__opt',
                    {
                      'ml-cascader__opt--on': browse[level] === o.value,
                      'ml-cascader__opt--chosen': model[level] === o.value && model.length === level + 1,
                    },
                  ]"
                  :tabindex="-1"
                  @click="pick(level, o)"
                  @keydown="onOptionKeydown($event, level, o)"
                >
                  <span class="ml-cascader__label">{{ o.label }}</span>
                  <MlIcon v-if="o.children?.length" name="chevronRight" class="ml-cascader__arrow" />
                  <MlPaw v-else-if="model[level] === o.value && model.length === level + 1" tone="current" class="ml-dropdown__paw" />
                </button>
              </li>
            </ul>
          </div>
        </div>
      </Transition>
    </div>
  </MlField>
</template>
