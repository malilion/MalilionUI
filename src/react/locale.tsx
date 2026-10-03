import { createContext, useContext, type ReactNode } from 'react'
import { zhTW, type MlLocale } from '../locale-data'

const LocaleContext = createContext<MlLocale | null>(null)
let appLocale: MlLocale = zhTW

/** App-wide default for components outside any <ConfigProvider>. */
export function setLocale(locale: MlLocale) {
  appLocale = locale
}

/** The locale in effect: nearest <ConfigProvider>, else the app default. */
export function useLocale(): MlLocale {
  return useContext(LocaleContext) ?? appLocale
}

export interface ConfigProviderProps {
  locale?: MlLocale
  /** Scope a theme to this subtree (wraps children in a data-ml-theme div). */
  theme?: 'dark' | 'light'
  children?: ReactNode
}

export function ConfigProvider({ locale, theme, children }: ConfigProviderProps) {
  const parent = useLocale()
  const content = <LocaleContext.Provider value={locale ?? parent}>{children}</LocaleContext.Provider>
  return theme ? (
    <div className="ml-config" data-ml-theme={theme}>
      {content}
    </div>
  ) : (
    content
  )
}
