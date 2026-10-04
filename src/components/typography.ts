// Shared bits of MlTitle / MlText / MlLink and their React twins.
import type { MlTextTone } from '../types'

export type MlTitleLevel = 1 | 2 | 3 | 4 | 5 | 6

/** Arrow-out-of-box glyph for external links (24×24, stroked). */
export const EXTERNAL_ICON = 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5'

/**
 * The element MlText renders when `as` isn't given: the strongest semantic
 * wrapper among its flags (code > mark > del > strong), else a span.
 */
export function textTag(o: { as?: string; code?: boolean; mark?: boolean; delete?: boolean; strong?: boolean }) {
  return o.as ?? (o.code ? 'code' : o.mark ? 'mark' : o.delete ? 'del' : o.strong ? 'strong' : 'span')
}

export function textClasses(o: {
  tone?: MlTextTone
  size?: string
  strong?: boolean
  italic?: boolean
  underline?: boolean
  delete?: boolean
  mark?: boolean
  code?: boolean
  mono?: boolean
  ellipsis?: boolean | number
}) {
  const lines = typeof o.ellipsis === 'number' ? o.ellipsis : o.ellipsis ? 1 : 0
  return [
    'ml-text',
    o.tone && o.tone !== 'default' && `ml-text--${o.tone}`,
    o.size && `ml-text--${o.size}`,
    o.strong && 'ml-text--strong',
    o.italic && 'ml-text--italic',
    o.underline && 'ml-text--underline',
    o.delete && 'ml-text--delete',
    o.mark && 'ml-text--mark',
    o.code && 'ml-text--code',
    o.mono && 'ml-text--mono',
    lines === 1 && 'ml-text--ellipsis',
    lines > 1 && 'ml-text--clamp',
  ].filter(Boolean) as string[]
}

/** Whether a link should open in a new tab: forced by `external`, or implied by target="_blank". */
export const isExternal = (external?: boolean, target?: string) => !!external || target === '_blank'
