<script setup lang="ts">
import { computed, ref, useId } from 'vue'
import MlIcon from './MlIcon.vue'
import { useOutsidePointer } from '../composables'
import { useLocale } from '../locale'
import type { IconName } from './icons'
import type { MlFloatAction } from '../types'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    /** Main button icon (when there are no actions, or while closed). */
    icon?: IconName
    /** Accessible name / tooltip of the main button. */
    label?: string
    /** Speed-dial actions that fan out from the main button. */
    actions?: MlFloatAction[]
    /** Open the actions on hover as well as click. */
    hover?: boolean
    corner?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
    /** Distance from the corner, in px. */
    offset?: number
    /** Small count bubble on the main button. */
    badge?: number | string
    tone?: 'gold' | 'steel' | 'tech'
    /** Render in place instead of fixed to the viewport. */
    inline?: boolean
  }>(),
  { icon: 'plus', actions: () => [], corner: 'bottom-right', offset: 24, tone: 'gold' },
)

const emit = defineEmits<{ click: [event: MouseEvent]; select: [action: MlFloatAction] }>()
const open = defineModel<boolean>('open', { default: false })
const root = ref<HTMLElement>()
const menuId = `ml-fab-${useId()}`
const hasActions = computed(() => props.actions.length > 0)
const up = computed(() => props.corner.startsWith('bottom'))

function onMain(event: MouseEvent) {
  if (hasActions.value) open.value = !open.value
  else emit('click', event)
}

function choose(action: MlFloatAction) {
  open.value = false
  emit('select', action)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && open.value) {
    open.value = false
    root.value?.querySelector<HTMLElement>('.ml-fab__main')?.focus()
  }
}

useOutsidePointer(root, () => open.value, () => (open.value = false))

const position = computed(() => {
  if (props.inline) return undefined
  const [v, h] = props.corner.split('-')
  return { [v]: `${props.offset}px`, [h]: `${props.offset}px` }
})
</script>

<template>
  <div
    ref="root"
    :class="[
      'ml-fab',
      `ml-fab--${tone}`,
      `ml-fab--${corner}`,
      { 'ml-fab--open': open, 'ml-fab--inline': inline, 'ml-fab--up': up },
    ]"
    :style="position"
    @keydown="onKeydown"
    @mouseenter="hover && hasActions && (open = true)"
    @mouseleave="hover && hasActions && (open = false)"
  >
    <ul v-if="hasActions" :id="menuId" class="ml-fab__actions" role="menu" :aria-hidden="!open">
      <li v-for="(action, i) in actions" :key="action.key" role="none" :style="{ '--i': i }">
        <span class="ml-fab__label" aria-hidden="true">{{ action.label }}</span>
        <button
          type="button"
          role="menuitem"
          :class="['ml-fab__action', { 'ml-fab__action--danger': action.danger }]"
          :aria-label="action.label"
          :tabindex="open ? 0 : -1"
          @click="choose(action)"
        >
          <MlIcon :name="action.icon" />
        </button>
      </li>
    </ul>
    <button
      type="button"
      class="ml-fab__main"
      :aria-label="label ?? (hasActions ? (open ? loc.float.close : loc.float.open) : undefined)"
      :title="label"
      :aria-haspopup="hasActions ? 'menu' : undefined"
      :aria-expanded="hasActions ? open : undefined"
      :aria-controls="hasActions ? menuId : undefined"
      @click="onMain"
    >
      <slot><MlIcon :name="icon" class="ml-fab__icon" /></slot>
      <span v-if="badge !== undefined" class="ml-fab__badge">{{ badge }}</span>
    </button>
  </div>
</template>
