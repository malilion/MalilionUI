import type { IconName } from './components/icons'

export type MlButtonVariant = 'primary' | 'steel' | 'outline' | 'ghost' | 'tech' | 'danger'
export type MlSize = 'sm' | 'md' | 'lg'
export type MlCardVariant = 'plate' | 'gold' | 'steel' | 'tech'
export type MlTone = 'gold' | 'steel' | 'tech' | 'bean' | 'success' | 'danger'
export type MlAlertTone = 'info' | 'success' | 'warning' | 'danger'
export type MlProgressTone = 'gold' | 'tech' | 'success' | 'danger'
export type MlAvatarSize = 'sm' | 'md' | 'lg' | 'xl'
export type MlAvatarStatus = 'online' | 'busy' | 'away' | 'offline'
export type MlPlacement = 'top' | 'bottom' | 'left' | 'right'

export interface MlTabItem {
  value: string
  label: string
  disabled?: boolean
}

export interface MlSelectOption {
  value: string | number
  label: string
  disabled?: boolean
}

export type MlPawTone = 'gold' | 'bean' | 'steel' | 'tech' | 'current'
export type MlToastTone = 'paw' | 'info' | 'success' | 'warning' | 'danger'
export type MlToastPlacement =
  | 'top-right'
  | 'top-left'
  | 'top-center'
  | 'bottom-right'
  | 'bottom-left'
  | 'bottom-center'

export interface MlToastOptions {
  title?: string
  message?: string
  tone?: MlToastTone
  /** ms before it leaves on its own; 0 keeps it until closed. Default 4000. */
  duration?: number
  closable?: boolean
  action?: { label: string; onClick: () => void }
}

export interface MlRadioOption {
  value: string | number
  label: string
  hint?: string
  disabled?: boolean
}

export interface MlDropdownItem {
  value: string | number
  label: string
  icon?: IconName
  /** Right-aligned hint, e.g. a keyboard shortcut. */
  hint?: string
  disabled?: boolean
  danger?: boolean
  /** Draw a separator above this item. */
  divider?: boolean
}

export interface MlTableColumn<Row = Record<string, unknown>> {
  key: string
  title: string
  width?: string
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
  /** Monospace, tabular digits — for ids, numbers, timestamps. */
  mono?: boolean
  format?: (value: unknown, row: Row) => string
}

export interface MlTableSort {
  key: string
  order: 'asc' | 'desc'
}

export interface MlBreadcrumbItem {
  label: string
  href?: string
  icon?: IconName
}

export interface MlStepItem {
  title: string
  desc?: string
}

export interface MlAccordionItem {
  value: string
  title: string
  /** Plain-text body; use the slot named after `value` for rich content. */
  content?: string
  disabled?: boolean
}

export type MlChartTone = 'gold' | 'tech' | 'bean' | 'success' | 'danger' | 'steel'

export interface MlChartDatum {
  label: string
  value: number
  /** Donut only: override the segment colour. */
  color?: string
}

/** A [start, end] date range; either end may still be unset. */
export type MlDateRange = [Date | null, Date | null]

export interface MlTabBarItem {
  value: string
  label: string
  icon: IconName
  /** Small count bubble on the icon. */
  badge?: number | string
}

export interface MlSegmentedOption {
  value: string | number
  label?: string
  icon?: IconName
  disabled?: boolean
}

export type MlAutocompleteItem = string | { value: string; label?: string; hint?: string }

export type MlTimelineTone = 'gold' | 'tech' | 'success' | 'danger' | 'steel'

export interface MlTimelineItem {
  title: string
  /** Shown as the HUD timestamp; free text. */
  time?: string
  desc?: string
  tone?: MlTimelineTone
  icon?: IconName
  /** Mark the node with a paw instead of a dot. */
  paw?: boolean
}

export interface MlTreeNode {
  key: string | number
  label: string
  children?: MlTreeNode[]
  icon?: IconName
  disabled?: boolean
}
