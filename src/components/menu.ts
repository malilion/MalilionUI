import type { InjectionKey } from 'vue'
import type { MlMenuItem } from '../types'

/** @internal shared between <MlMenu> and its recursive <MlMenuList>. */
export interface MenuContext {
  active: () => string | undefined
  /** Ancestors of the active item, so their headers light up too. */
  activePath: () => string[]
  /** Submenus expand in place (vertical, not collapsed) rather than popping out. */
  inline: () => boolean
  horizontal: () => boolean
  isOpen: (key: string) => boolean
  toggle: (item: MlMenuItem) => void
  close: (key: string) => void
  select: (item: MlMenuItem) => void
}

export const menuKey: InjectionKey<MenuContext> = Symbol('ml-menu')
