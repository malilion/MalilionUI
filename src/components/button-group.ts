import type { InjectionKey } from 'vue'
import type { MlButtonVariant, MlSize } from '../types'

/** What MlButtonGroup hands its buttons; a button's own prop always wins. */
export interface ButtonGroupContext {
  size: () => MlSize | undefined
  variant: () => MlButtonVariant | undefined
  disabled: () => boolean
}

export const buttonGroupKey: InjectionKey<ButtonGroupContext> = Symbol('MlButtonGroup')
