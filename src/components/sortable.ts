import { shallowReactive } from 'vue'

/** @internal one registered <MlSortable>, so lists in a group can trade items. */
export interface SortableInstance {
  id: string
  group: () => string
  items: () => unknown[]
  setItems: (next: unknown[]) => void
  max: () => number | undefined
  root: () => HTMLElement | undefined
  vertical: () => boolean
}

/** @internal every mounted list. */
export const sortables = new Set<SortableInstance>()

/**
 * @internal the drag in progress (there is only ever one pointer drag at a time).
 * Shallow, so the item and list objects keep their identity for === checks.
 */
export const dragState = shallowReactive({
  active: false,
  item: null as unknown,
  source: null as SortableInstance | null,
  sourceIndex: -1,
  target: null as SortableInstance | null,
  targetIndex: -1,
  offsetX: 0,
  offsetY: 0,
})
