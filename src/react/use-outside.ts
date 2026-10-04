// Internal hooks shared by StickerPicker, Comments and Inbox (not part of the public React API).
import { useEffect, useRef, useState, type RefObject } from 'react'
import type { MlTimeInput } from '../components/relative-time'

/** Calls `handler` on a pointerdown outside `root` while `active`. */
export function useOutsidePointer(root: RefObject<HTMLElement | null>, active: boolean, handler: () => void) {
  const latest = useRef(handler)
  latest.current = handler
  useEffect(() => {
    if (!active) return
    const onDown = (event: Event) => {
      if (root.current && !root.current.contains(event.target as Node)) latest.current()
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [active, root])
}

/** `now` when given; otherwise the current time, refreshed every minute so "3 分鐘前" stays true. */
export function useNow(now: MlTimeInput | undefined): MlTimeInput {
  const [tick, setTick] = useState(() => Date.now())
  useEffect(() => {
    if (now !== undefined) return
    setTick(Date.now())
    const id = setInterval(() => setTick(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [now])
  return now ?? tick
}
