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
  /** Keep this column in view while the table scrolls sideways. */
  fixed?: 'left' | 'right'
  /** Cut long text with "…" (full text in a tooltip). */
  ellipsis?: boolean
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

export interface MlTransferItem {
  key: string | number
  label: string
  /** Small second line under the label. */
  hint?: string
  disabled?: boolean
}

export interface MlMenuItem {
  key: string
  label: string
  icon?: IconName
  /** Render as a link instead of a button. */
  href?: string
  children?: MlMenuItem[]
  /** Small count or text bubble on the right. */
  badge?: number | string
  disabled?: boolean
  /** Non-clickable section heading; its children render as a flat group. */
  group?: boolean
}

export interface MlRangePreset {
  label: string
  /** The range itself, or a function so "last 7 days" stays relative to today. */
  value: MlDateRange | (() => MlDateRange)
}

export interface MlLineSeries {
  name: string
  data: number[]
  tone?: MlChartTone
  /** Override the stroke colour. */
  color?: string
}

export interface MlDescriptionItem {
  label: string
  value?: string | number
  /** Columns this cell spans. */
  span?: number
  /** Monospace value (ids, hashes, amounts). */
  mono?: boolean
}

export interface MlConfirmOptions {
  title?: string
  message?: string
  eyebrow?: string
  confirmText?: string
  cancelText?: string
  /** Red confirm button for destructive actions. */
  danger?: boolean
  /** Show a text input; confirm resolves with its value instead of `true`. */
  prompt?: { placeholder?: string; defaultValue?: string; label?: string }
  width?: number | string
}

export interface MlCommandItem {
  value: string
  label: string
  /** Group heading the command is listed under. */
  group?: string
  icon?: IconName
  /** Right-aligned shortcut hint, e.g. "⌘ S". */
  shortcut?: string
  /** Extra words that should also match the search. */
  keywords?: string[]
  disabled?: boolean
}

export interface MlCascaderOption {
  value: string | number
  label: string
  children?: MlCascaderOption[]
  disabled?: boolean
}

export interface MlAnchorItem {
  /** Element id to scroll to (without "#"). */
  id: string
  label: string
  children?: MlAnchorItem[]
}

export type MlResultStatus = 'success' | 'info' | 'warning' | 'error' | '403' | '404' | '500'

export interface MlHeatmapDatum {
  /** A Date or an ISO date string ("2026-10-03"). */
  date: Date | string
  count: number
}

export interface MlTourStep {
  /** Element to highlight: a CSS selector, the element, or a function returning it. None = centred card. */
  target?: string | HTMLElement | (() => HTMLElement | null)
  title: string
  /** Plain-text body; use the default slot for rich content. */
  content?: string
  /** Side of the target the card sits on. */
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

export interface MlMentionOption {
  value: string | number
  /** Inserted after the trigger, e.g. "@Nala ". */
  label: string
  avatar?: string
  /** Small text on the right, e.g. a role. */
  hint?: string
  disabled?: boolean
}

export interface MlKanbanColumn<Item = Record<string, unknown>> {
  key: string
  title: string
  items: Item[]
  tone?: MlChartTone
  /** Most cards allowed; dropping more is refused. */
  limit?: number
}

export interface MlFloatAction {
  key: string
  label: string
  icon: IconName
  danger?: boolean
}
