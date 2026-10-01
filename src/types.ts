export type MlButtonVariant = 'primary' | 'steel' | 'outline' | 'ghost' | 'tech' | 'danger'
export type MlSize = 'sm' | 'md' | 'lg'
export type MlCardVariant = 'plate' | 'gold' | 'steel' | 'tech'
export type MlTone = 'gold' | 'steel' | 'tech' | 'success' | 'danger'
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
