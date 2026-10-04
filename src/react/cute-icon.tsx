import type { CSSProperties } from 'react'
import { cuteIcons, type CuteIconName, type MlCuteIconAnimation, type MlCuteIconVariant } from '../components/cute-icons'
import { cx, len } from './utils'

export { cuteIcons, CUTE_ICON_GROUPS, CUTE_ICON_NAMES } from '../components/cute-icons'
export type { CuteIconName, CuteColor, CuteLayer, CuteLayerKind, MlCuteIconAnimation, MlCuteIconVariant } from '../components/cute-icons'

export interface CuteIconProps {
  name: CuteIconName
  /** px number or any CSS length. Defaults to 1em so it sits in text. */
  size?: number | string
  /** `color` stickers · `mono` tinted by the text colour · `line` outlines only. Default `color`. */
  variant?: MlCuteIconVariant
  /** A looping animation (still when the user prefers reduced motion). */
  animate?: MlCuteIconAnimation
  /** Only animate while hovered (or while its link / button is hovered or focused). */
  hover?: boolean
  /** Accessible name. Without it the icon is decoration. */
  title?: string
  className?: string
}

export function CuteIcon({ name, size, variant = 'color', animate, hover = false, title, className }: CuteIconProps) {
  const length = len(size)
  return (
    <svg
      className={cx('ml-cute', `ml-cute--${variant}`, animate && `ml-cute--${animate}`, { 'ml-cute--hover': animate && hover }, className)}
      style={length ? ({ '--_size': length } as CSSProperties) : undefined}
      viewBox="0 0 32 32"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {cuteIcons[name].map((layer, i) => (
        <path key={i} className={`ml-cute__layer ml-cute__layer--${layer.kind} ml-cute__layer--${layer.color}`} d={layer.d} />
      ))}
    </svg>
  )
}
