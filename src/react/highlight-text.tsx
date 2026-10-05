import { useMemo, type ElementType, type HTMLAttributes } from 'react'
import { splitHighlight } from '../components/highlight-text'
import type { MlHighlightTone } from '../types'
import { cx } from './utils'

/* ── Highlight ───────────────────────────────────────────── */

export interface HighlightProps extends HTMLAttributes<HTMLSpanElement> {
  text: string
  /** One keyword or several; empty ones are ignored. */
  keywords?: string | string[]
  caseSensitive?: boolean
  /** Match ＡＢＣ / １２３ against ABC / 123. Default true. */
  ignoreWidth?: boolean
  /** Element wrapped around each match. */
  as?: ElementType
  /** Extra class on each match. */
  highlightClassName?: string
  tone?: MlHighlightTone
}

export function Highlight({ text, keywords, caseSensitive, ignoreWidth = true, as: Mark = 'mark', highlightClassName, tone = 'gold', className, ...rest }: HighlightProps) {
  // Text nodes only — the keywords and the text are never parsed as HTML.
  const chunks = useMemo(() => splitHighlight(text ?? '', keywords, { caseSensitive, ignoreWidth }), [text, keywords, caseSensitive, ignoreWidth])
  return (
    <span className={cx('ml-highlight', `ml-highlight--${tone}`, className)} {...rest}>
      {chunks.map((c, i) =>
        c.match ? (
          <Mark key={i} className={cx('ml-highlight__mark', highlightClassName)}>
            {c.text}
          </Mark>
        ) : (
          c.text
        ),
      )}
    </span>
  )
}
