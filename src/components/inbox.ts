// MlInbox / Inbox — framework-free: tab filters, counts, day groups and the
// read / dismiss updates (new arrays, for v-model / controlled props).
import type { CuteIconName } from './cute-icons'
import { daysAgo, toEpoch, type MlTimeInput } from './relative-time'

export type MlInboxType = 'info' | 'success' | 'warning' | 'danger' | 'mention'
export type MlInboxTab = 'all' | 'unread' | 'mention'
export type MlInboxGroupId = 'today' | 'yesterday' | 'earlier'

export interface MlInboxItem {
  id: string | number
  title: string
  body?: string
  time: MlTimeInput
  read?: boolean
  type?: MlInboxType
  /** Picture of who it is from; otherwise an icon for the type. */
  avatar?: string
  /** Makes the item a link. */
  href?: string
}

export const INBOX_TABS: MlInboxTab[] = ['all', 'unread', 'mention']

/** The sticker each type shows when there is no avatar. */
export const INBOX_TYPE_ICON: Record<MlInboxType, CuteIconName> = {
  info: 'bell',
  success: 'trophy',
  warning: 'bolt',
  danger: 'bug',
  mention: 'chat',
}

export function inboxFilter(items: MlInboxItem[], tab: MlInboxTab): MlInboxItem[] {
  if (tab === 'unread') return items.filter((i) => !i.read)
  if (tab === 'mention') return items.filter((i) => i.type === 'mention')
  return items
}

export function inboxCounts(items: MlInboxItem[]): Record<MlInboxTab, number> {
  return { all: items.length, unread: inboxFilter(items, 'unread').length, mention: inboxFilter(items, 'mention').length }
}

/** Newest first, split into 今天 / 昨天 / 更早 by local calendar day at `now`; empty groups left out. */
export function inboxGroups(items: MlInboxItem[], now: MlTimeInput): { id: MlInboxGroupId; items: MlInboxItem[] }[] {
  const sorted = items.slice().sort((a, b) => (toEpoch(b.time) || 0) - (toEpoch(a.time) || 0))
  const groups: Record<MlInboxGroupId, MlInboxItem[]> = { today: [], yesterday: [], earlier: [] }
  for (const item of sorted) {
    const d = daysAgo(item.time, now)
    groups[d <= 0 ? 'today' : d === 1 ? 'yesterday' : 'earlier'].push(item)
  }
  return (['today', 'yesterday', 'earlier'] as const).filter((id) => groups[id].length).map((id) => ({ id, items: groups[id] }))
}

/** Mark one item read (the same array when it already was). */
export function inboxMarkRead(items: MlInboxItem[], id: MlInboxItem['id']): MlInboxItem[] {
  return items.some((i) => i.id === id && !i.read) ? items.map((i) => (i.id === id ? { ...i, read: true } : i)) : items
}

export function inboxMarkAllRead(items: MlInboxItem[]): MlInboxItem[] {
  return items.some((i) => !i.read) ? items.map((i) => (i.read ? i : { ...i, read: true })) : items
}

export function inboxDismiss(items: MlInboxItem[], id: MlInboxItem['id']): MlInboxItem[] {
  return items.filter((i) => i.id !== id)
}

/** Badge text: the count, capped as "99+". */
export const inboxBadge = (n: number, max = 99) => (n > max ? `${max}+` : String(n))
