// Shared logic of MlNumberKeyboard / <NumberKeyboard>.

export type MlNumberKeyboardTheme = 'default' | 'custom'

export interface NumberKeyboardKey {
  type: 'digit' | 'extra' | 'delete' | 'collapse' | 'blank'
  text: string
  /** Grid columns the key takes (the wide 0). */
  span?: 2 | 3
}

/** A Fisher–Yates shuffle of 0–9, for PIN pads that resist shoulder-surfing. */
export function shuffledDigits(random: () => number = Math.random) {
  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]
  for (let i = digits.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[digits[i], digits[j]] = [digits[j], digits[i]]
  }
  return digits
}

/**
 * The 3-column grid. The first nine digits fill the top three rows; the
 * bottom row depends on the theme:
 *   default — [extra | collapse | blank] 0 ⌫
 *   custom  — 0 spans what the extra keys leave (⌫ and Done sit in a side column)
 */
export function keyboardLayout(theme: MlNumberKeyboardTheme, extraKey: string | string[] | undefined, collapsible: boolean, order?: number[]) {
  const digits = order && order.length === 10 ? order : [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]
  const keys: NumberKeyboardKey[] = digits.slice(0, 9).map((d) => ({ type: 'digit', text: String(d) }))
  const last: NumberKeyboardKey = { type: 'digit', text: String(digits[9]) }
  const extras = (Array.isArray(extraKey) ? extraKey : extraKey ? [extraKey] : []).filter(Boolean)
  if (theme === 'custom') {
    if (extras.length >= 2) keys.push({ type: 'extra', text: extras[0] }, last, { type: 'extra', text: extras[1] })
    else if (extras.length === 1) keys.push({ ...last, span: 2 }, { type: 'extra', text: extras[0] })
    else keys.push({ ...last, span: 3 })
  } else {
    const left: NumberKeyboardKey = extras[0] ? { type: 'extra', text: extras[0] } : collapsible ? { type: 'collapse', text: '' } : { type: 'blank', text: '' }
    keys.push(left, last, { type: 'delete', text: '' })
  }
  return keys
}

/** Append a key to the value, respecting maxlength. */
export function keyboardAppend(value: string, key: string, maxlength = Infinity) {
  return value.length >= maxlength ? value : (value + key).slice(0, maxlength)
}

/** Remove the last character (one code point, so emoji-safe). */
export function keyboardDelete(value: string) {
  return Array.from(value).slice(0, -1).join('')
}

/** Long-pressing ⌫ repeats: first after HOLD ms, then every REPEAT ms. */
export const KEYBOARD_HOLD = 450
export const KEYBOARD_REPEAT = 70

export const BACKSPACE_PATH = 'M9 5h11a1 1 0 011 1v12a1 1 0 01-1 1H9l-6-7 6-7zM12 9.5l5 5M17 9.5l-5 5'
