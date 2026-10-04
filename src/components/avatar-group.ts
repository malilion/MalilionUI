// Shared logic of MlAvatarGroup / <AvatarGroup>.
import type { MlAvatarGroupItem } from '../types'

export interface AvatarGroupSplit {
  shown: MlAvatarGroupItem[]
  hidden: MlAvatarGroupItem[]
  /** Count on the "+N" chip: hidden items plus anyone counted by `total` but not passed in. */
  more: number
}

/**
 * Which avatars to draw. `max` caps the visible avatars (the "+N" chip comes
 * after them); `total` is the real headcount when only a page of people is loaded.
 */
export function splitAvatars(items: MlAvatarGroupItem[], max?: number, total?: number, expanded = false): AvatarGroupSplit {
  const cap = expanded || !max || max < 1 ? items.length : Math.min(max, items.length)
  const shown = items.slice(0, cap)
  const hidden = items.slice(cap)
  const count = Math.max(total ?? 0, items.length)
  return { shown, hidden, more: count - shown.length }
}

/** Tooltip for the "+N" chip: the hidden names, then "…" when some are unnamed or not loaded. */
export function hiddenNames(split: AvatarGroupSplit, separator = '、', limit = 10) {
  const names = split.hidden.map((p) => p.name).filter(Boolean) as string[]
  const list = names.slice(0, limit).join(separator)
  return names.length < split.more && list ? `${list}…` : list
}
