// Shared bits of MlCopyButton / <CopyButton>: glyphs and class lists.
import type { MlCopySource } from '../clipboard'
import type { MlCopyButtonVariant, MlSize } from '../types'

/** Two stacked sheets (same as MlCodeBlock's copy glyph). */
export const COPY_ICON = 'M8 8h11v13H8zM5 16H4V3h11v1'
/** A check mark. */
export const COPIED_ICON = 'M5 12.5l4.5 4.5L19 7.5'

/** The <button>'s classes: icon / button variants reuse the metal button plate. */
export function copyButtonClasses(variant: MlCopyButtonVariant, size: MlSize): string[] {
  if (variant === 'button') return ['ml-copy__btn', 'ml-btn', 'ml-btn--outline', `ml-btn--${size}`]
  if (variant === 'icon') return ['ml-copy__btn', 'ml-btn', 'ml-btn--ghost', `ml-btn--${size}`, 'ml-btn--square']
  return ['ml-copy__btn']
}

/** Text shown by the inline variant when no slot / children are given. */
export function copySourceText(value: MlCopySource): string {
  if (typeof value === 'string') return value
  if (typeof value === 'function') return ''
  return value?.text ?? ''
}
