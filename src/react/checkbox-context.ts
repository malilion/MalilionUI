// Internal: lets <Checkbox value> join a surrounding <CheckboxGroup> (mirrors src/components/checkboxGroup.ts).
import { createContext } from 'react'

export type CheckboxValue = string | number

export interface CheckboxGroupContext {
  name?: string
  isChecked: (value: CheckboxValue) => boolean
  /** Group-level reasons a box can't change: group disabled, max reached, min held. */
  isLocked: (value: CheckboxValue) => boolean
  toggle: (value: CheckboxValue, on: boolean) => void
  /** Children announce their value so "select all" knows what "all" is. Returns the cleanup. */
  register: (value: CheckboxValue, disabled: boolean) => () => void
}

export const CheckboxGroupCtx = createContext<CheckboxGroupContext | null>(null)
