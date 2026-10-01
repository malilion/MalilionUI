import type { InjectionKey, Ref } from 'vue'

export interface RadioGroupContext {
  name: string
  model: Ref<string | number | undefined>
  disabled: Ref<boolean>
  variant: Ref<'default' | 'card'>
  select: (value: string | number) => void
}

export const radioGroupKey: InjectionKey<RadioGroupContext> = Symbol('MlRadioGroup')
