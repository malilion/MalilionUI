// Shared logic of MlUpload / <Upload>: filtering picked files and the picture wall's reorder math.
import type { MlUploadFile, MlUploadRejectReason } from '../types'

export function parseAccept(accept?: string) {
  return (accept ?? '')
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
}

/** Same matching as <input accept>: ".png" by extension, "image/*" by family, otherwise the exact MIME type. */
export function acceptsFile(file: File, rules: string[]) {
  if (!rules.length) return true
  const name = file.name.toLowerCase()
  const type = file.type.toLowerCase()
  return rules.some((rule) => (rule.startsWith('.') ? name.endsWith(rule) : rule.endsWith('/*') ? type.startsWith(rule.slice(0, -1)) : type === rule))
}

export interface UploadFilterOptions {
  accept?: string
  maxSize?: number
  maxCount?: number
  multiple?: boolean
}

export interface UploadFilterResult {
  /** The new v-model, or null when nothing was accepted. */
  next: MlUploadFile[] | null
  rejected: [file: File, reason: MlUploadRejectReason][]
}

/**
 * Merge picked / dropped files into the current list. Wrong types and oversize
 * files are rejected first; of the rest, anything past `maxCount` is rejected
 * with 'count'. Without `multiple` the newest file replaces the list.
 */
export function addFiles(current: readonly MlUploadFile[], incoming: Iterable<File>, options: UploadFilterOptions): UploadFilterResult {
  const rules = parseAccept(options.accept)
  const rejected: UploadFilterResult['rejected'] = []
  const ok: File[] = []
  for (const file of incoming) {
    if (!acceptsFile(file, rules)) rejected.push([file, 'type'])
    else if (options.maxSize !== undefined && file.size > options.maxSize) rejected.push([file, 'size'])
    else ok.push(file)
  }
  if (options.multiple === false) {
    // A single-file upload swaps its file, so only a maxCount below 1 can refuse it.
    const kept = ok.slice(0, 1)
    if (kept.length && options.maxCount !== undefined && options.maxCount < 1) {
      rejected.push([kept[0], 'count'])
      return { next: null, rejected }
    }
    return { next: kept.length ? kept : null, rejected }
  }
  const room = options.maxCount === undefined ? Infinity : Math.max(0, options.maxCount - current.length)
  const kept = ok.slice(0, room)
  for (const file of ok.slice(kept.length)) rejected.push([file, 'count'])
  return { next: kept.length ? [...current, ...kept] : null, rejected }
}

/** True while another file still fits. */
export function canAddMore(count: number, maxCount?: number) {
  return maxCount === undefined || count < maxCount
}

/** A copy of `list` with the item at `from` moved to `to` (clamped to the list). */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = list.slice()
  if (from < 0 || from >= next.length) return next
  const target = Math.max(0, Math.min(next.length - 1, to))
  const [item] = next.splice(from, 1)
  next.splice(target, 0, item)
  return next
}

/** Where Alt+ArrowLeft / Alt+ArrowRight moves the card at `index`, or null when it can't move. */
export function reorderKey(key: string, index: number, total: number): number | null {
  const to = key === 'ArrowLeft' ? index - 1 : key === 'ArrowRight' ? index + 1 : null
  return to === null || to < 0 || to >= total ? null : to
}

export function isImageFile(file: File) {
  return file.type.toLowerCase().startsWith('image/')
}

/** The overlay a card shows, read off the optional fields of an MlUploadFile. */
export function uploadState(file: MlUploadFile) {
  const percent = Math.round(Math.max(0, Math.min(100, Number(file.percent) || 0)))
  return { status: file.status, percent, error: file.error }
}

export function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** Pointer travel (px) before a press on a card turns into a drag. */
export const CARD_DRAG_THRESHOLD = 4

/**
 * Index of the card under a point, or -1. Cards carry data-index; the dragged
 * card (index `skip`) sits under the pointer itself, so it's looked through.
 */
export function cardIndexAt(root: HTMLElement | null | undefined, x: number, y: number, skip = -1) {
  if (!root || typeof document === 'undefined') return -1
  const stack = typeof document.elementsFromPoint === 'function' ? document.elementsFromPoint(x, y) : [document.elementFromPoint?.(x, y)]
  for (const el of stack) {
    const card = el?.closest<HTMLElement>('.ml-upload__card[data-index]')
    if (!card || !root.contains(card)) continue
    const index = Number(card.dataset.index)
    if (index !== skip) return index
  }
  return -1
}

/**
 * One object URL per image file. `sync` makes URLs for new images and revokes
 * those whose file left the list; it returns true when anything changed.
 * URLs are only made in a browser, so server-rendered cards show the file icon.
 */
export function createThumbStore() {
  const urls = new Map<File, string>()
  const canCreate = () => typeof window !== 'undefined' && typeof URL.createObjectURL === 'function'
  return {
    urls,
    sync(files: readonly File[]) {
      let changed = false
      const keep = new Set(files)
      for (const [file, url] of urls) {
        if (keep.has(file)) continue
        URL.revokeObjectURL(url)
        urls.delete(file)
        changed = true
      }
      if (!canCreate()) return changed
      for (const file of files) {
        if (urls.has(file) || !isImageFile(file)) continue
        urls.set(file, URL.createObjectURL(file))
        changed = true
      }
      return changed
    },
    clear() {
      for (const url of urls.values()) URL.revokeObjectURL(url)
      urls.clear()
    },
  }
}
