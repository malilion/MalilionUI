// The context MlQueryBuilder hands down to its nested MlQueryGroup rows.
import type { ComputedRef, InjectionKey } from 'vue'
import type { MlQueryField, MlQueryGroup, MlQueryNode } from './filter'
import type { MlSize } from '../types'

export interface QueryContext {
  fields: ComputedRef<MlQueryField[]>
  maxDepth: ComputedRef<number>
  size: ComputedRef<MlSize>
  disabled: ComputedRef<boolean>
  replace: (id: string, next: MlQueryNode | null) => void
  append: (groupId: string, kind: 'rule' | 'group') => void
  root: ComputedRef<MlQueryGroup>
}

export const queryKey: InjectionKey<QueryContext> = Symbol('ml-query')
