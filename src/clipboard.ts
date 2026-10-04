// Clipboard, framework-free: shared by MlCopyButton, MlCodeBlock, MlJsonViewer,
// the Vue composable (useClipboard.ts) and the React hook (react/devtools.tsx).
// Nothing touches window / document until a copy is attempted, so importing
// this module during SSR is safe.

const inBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined'

/** Whether this page can copy at all (async Clipboard API or the legacy execCommand). */
export function isClipboardSupported(): boolean {
  if (!inBrowser()) return false
  if (typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function') return true
  try {
    return typeof document.queryCommandSupported === 'function' ? document.queryCommandSupported('copy') : typeof document.execCommand === 'function'
  } catch {
    return false
  }
}

/**
 * Hidden-textarea + execCommand('copy'): works in non-secure contexts (http://
 * LAN addresses, old WebViews) where navigator.clipboard is missing or refuses.
 * Restores the previous selection and focus afterwards.
 */
function legacyCopy(text: string): boolean {
  if (!inBrowser() || typeof document.execCommand !== 'function') return false
  const active = document.activeElement as HTMLElement | null
  const selection = document.getSelection?.()
  const ranges: Range[] = []
  if (selection) for (let i = 0; i < selection.rangeCount; i++) ranges.push(selection.getRangeAt(i))
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.setAttribute('aria-hidden', 'true')
  area.style.position = 'fixed'
  area.style.top = '0'
  area.style.left = '0'
  area.style.opacity = '0'
  area.style.pointerEvents = 'none'
  // iOS zooms into inputs under 16px.
  area.style.fontSize = '16px'
  document.body.appendChild(area)
  let ok = false
  try {
    area.focus({ preventScroll: true })
    area.select()
    area.setSelectionRange?.(0, text.length)
    ok = document.execCommand('copy')
  } catch {
    ok = false
  } finally {
    area.remove()
    if (selection) {
      selection.removeAllRanges()
      for (const r of ranges) selection.addRange(r)
    }
    active?.focus?.({ preventScroll: true })
  }
  return !!ok
}

/**
 * Copy plain text. Uses navigator.clipboard.writeText and falls back to a
 * hidden textarea + execCommand('copy') when the API is missing or rejects
 * (non-secure context, denied permission). Resolves `true` on success.
 */
export async function copyText(text: string): Promise<boolean> {
  if (!inBrowser()) return false
  const value = String(text ?? '')
  const clip = typeof navigator !== 'undefined' ? navigator.clipboard : undefined
  if (typeof clip?.writeText === 'function') {
    try {
      await clip.writeText(value)
      return true
    } catch {
      // fall through to the legacy path
    }
  }
  return legacyCopy(value)
}

export interface MlRichClipboard {
  /** Plain-text flavour (always written; the fallback when HTML can't be). */
  text: string
  /** HTML flavour, e.g. for pasting into docs / mail. */
  html?: string
}

/**
 * Copy text and HTML together via ClipboardItem when the browser has it;
 * otherwise (or if it rejects) copies the plain text with `copyText`.
 */
export async function copyRich({ text, html }: MlRichClipboard): Promise<boolean> {
  if (!inBrowser()) return false
  const clip = typeof navigator !== 'undefined' ? navigator.clipboard : undefined
  const Item = (globalThis as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem
  if (html !== undefined && Item && typeof clip?.write === 'function') {
    try {
      await clip.write([
        new Item({
          'text/plain': new Blob([text], { type: 'text/plain' }),
          'text/html': new Blob([html], { type: 'text/html' }),
        }),
      ])
      return true
    } catch {
      // fall through
    }
  }
  return copyText(text)
}

/** What MlCopyButton / useClipboard accept: a string, a rich pair, or a (possibly async) getter. */
export type MlCopySource = string | MlRichClipboard | (() => string | MlRichClipboard | Promise<string | MlRichClipboard>)

/** Resolve a copy source and copy it: `{ ok, text }` with the plain text that was (or would have been) copied. */
export async function copySource(source: MlCopySource): Promise<{ ok: boolean; text: string }> {
  const value = typeof source === 'function' ? await source() : source
  if (typeof value === 'string') return { ok: await copyText(value), text: value }
  const text = value?.text ?? ''
  return { ok: await copyRich({ text, html: value?.html }), text }
}
