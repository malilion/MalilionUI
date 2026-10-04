// Vue composable for MlComments / MlInbox: the `now` prop when given, otherwise
// the current time refreshed every minute after mount (SSR renders with the
// time of the request).
import { computed, onBeforeUnmount, onMounted, ref, type ComputedRef } from 'vue'
import type { MlTimeInput } from './relative-time'

export function useNow(given: () => MlTimeInput | undefined): ComputedRef<MlTimeInput> {
  const tick = ref(Date.now())
  let timer: ReturnType<typeof setInterval> | undefined
  onMounted(() => {
    tick.value = Date.now()
    timer = setInterval(() => {
      if (given() === undefined) tick.value = Date.now()
    }, 60_000)
  })
  onBeforeUnmount(() => clearInterval(timer))
  return computed(() => given() ?? tick.value)
}
