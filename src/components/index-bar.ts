// Shared logic of MlIndexBar / <IndexBar>.
import type { MlIndexBarItem } from '../types'
import { ALPHABET_INDEXES, ZHUYIN_INDEXES, indexCollator, indexKey, type MlIndexMode } from '../zhuyin'

export interface IndexGroup<T extends MlIndexBarItem = MlIndexBarItem> {
  key: string
  items: T[]
}

/** Every index a mode knows, in phone-book order; "#" collects the rest. */
export function indexOrder(mode: MlIndexMode) {
  return mode === 'zhuyin' ? [...ZHUYIN_INDEXES, ...ALPHABET_INDEXES, '#'] : [...ALPHABET_INDEXES, '#']
}

/**
 * Bucket the items by index and order the buckets. With `indexes`, only those
 * buckets exist (in that order) and anything else falls into the last one.
 */
export function groupIndexItems<T extends MlIndexBarItem>(items: T[], mode: MlIndexMode, sort = true, indexes?: string[]): IndexGroup<T>[] {
  const order = indexes?.length ? indexes : indexOrder(mode)
  const fallback = order[order.length - 1]
  const map = new Map<string, T[]>()
  for (const item of items) {
    let key = item.index ?? indexKey(item.label, mode)
    if (!order.includes(key)) key = order.includes('#') ? '#' : fallback
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  const collator = sort ? indexCollator(mode) : undefined
  return order
    .filter((key) => map.has(key))
    .map((key) => {
      const list = map.get(key)!
      return { key, items: collator ? [...list].sort((a, b) => collator.compare(a.label, b.label)) : list }
    })
}

/** The keys the side rail shows: the given indexes, or only buckets that have items. */
export function railKeys(groups: IndexGroup[], indexes?: string[]) {
  return indexes?.length ? indexes : groups.map((g) => g.key)
}

/** The group whose header has scrolled to (or past) the top. */
export function activeGroup(offsets: number[], scrollTop: number) {
  let active = 0
  for (let i = 0; i < offsets.length; i++) if (offsets[i] <= scrollTop + 1) active = i
  return active
}

/** Which rail key a finger at clientY is over: the one whose centre is nearest. */
export function railKeyAt(centers: number[], clientY: number) {
  let best = 0
  for (let i = 1; i < centers.length; i++) if (Math.abs(centers[i] - clientY) < Math.abs(centers[best] - clientY)) best = i
  return best
}

/** A stable key for an item. */
export function itemKey(item: MlIndexBarItem, i: number) {
  return item.value ?? `${item.label}-${i}`
}
