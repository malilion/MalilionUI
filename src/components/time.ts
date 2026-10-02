// "HH:mm" / "HH:mm:ss" helpers shared by the time pickers.

export interface TimeParts {
  h: number
  m: number
  s: number
}

const pad = (n: number) => String(n).padStart(2, '0')

export function parseTime(value: string | null | undefined): TimeParts | null {
  if (!value) return null
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim())
  if (!match) return null
  const [h, m, s] = [Number(match[1]), Number(match[2]), Number(match[3] ?? 0)]
  if (h > 23 || m > 59 || s > 59) return null
  return { h, m, s }
}

export function formatTime(t: TimeParts, seconds = false) {
  return seconds ? `${pad(t.h)}:${pad(t.m)}:${pad(t.s)}` : `${pad(t.h)}:${pad(t.m)}`
}

export const toSeconds = (t: TimeParts) => t.h * 3600 + t.m * 60 + t.s

export function range(step: number, max: number) {
  const out: number[] = []
  for (let i = 0; i < max; i += Math.max(1, step)) out.push(i)
  return out
}

export { pad as padTime }
