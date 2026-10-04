import type { InjectionKey, Ref } from 'vue'

export type CheckboxValue = string | number

export interface CheckboxGroupContext {
  name: Ref<string | undefined>
  isChecked: (value: CheckboxValue) => boolean
  /** Group-level reasons a box can't change: group disabled, max reached, min held. */
  isLocked: (value: CheckboxValue) => boolean
  toggle: (value: CheckboxValue, on: boolean) => void
  /** Slot children announce their value so "全選" knows what "all" is. Returns the cleanup. */
  register: (value: CheckboxValue, disabled: () => boolean) => () => void
}

export const checkboxGroupKey: InjectionKey<CheckboxGroupContext> = Symbol('MlCheckboxGroup')
