import { computed, inject, shallowRef, type ComputedRef, type InjectionKey, type Ref } from 'vue'
import { completeLocale, zhTW, type MlLocale, type MlLocaleInput } from './locale-data'

export { zhTW, en, completeLocale } from './locale-data'
export type { MlLocale, MlLocaleInput } from './locale-data'

/* ── Plumbing ─────────────────────────────────────────────── */

/** App-wide default, set by `app.use(MalilionUI, { locale })` or `setLocale()`. */
const globalLocale = shallowRef<MlLocale>(zhTW)

/** @internal provided by <MlConfigProvider> */
export const localeKey: InjectionKey<Ref<MlLocale>> = Symbol('ml-locale')

/** Change the app-wide default locale (components outside any <MlConfigProvider>). */
export function setLocale(locale: MlLocaleInput) {
  globalLocale.value = completeLocale(locale)
}

/** Read-only access to the app-wide default locale (e.g. for plain modules like form validation). */
export function getLocale(): MlLocale {
  return globalLocale.value
}

/** The locale in effect for the calling component: nearest <MlConfigProvider>, else the app default. */
export function useLocale(): ComputedRef<MlLocale> {
  const provided = inject(localeKey, null)
  return computed(() => provided?.value ?? globalLocale.value)
}
