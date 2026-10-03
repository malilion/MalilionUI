// Fake layout metrics for happy-dom (which has no layout engine): every
// HTMLElement asks `measure(el, prop)`; returning undefined keeps the default.
type Prop = 'clientWidth' | 'clientHeight' | 'scrollWidth' | 'scrollHeight' | 'offsetWidth' | 'offsetHeight'
const PROPS: Prop[] = ['clientWidth', 'clientHeight', 'scrollWidth', 'scrollHeight', 'offsetWidth', 'offsetHeight']

function findDescriptor(prop: string) {
  for (let proto: object | null = HTMLElement.prototype; proto; proto = Object.getPrototypeOf(proto)) {
    const d = Object.getOwnPropertyDescriptor(proto, prop)
    if (d) return d
  }
  return undefined
}

export function stubBox(measure: (el: HTMLElement, prop: Prop) => number | undefined) {
  const saved = PROPS.map((prop) => [prop, Object.getOwnPropertyDescriptor(HTMLElement.prototype, prop)] as const)
  for (const prop of PROPS) {
    const original = findDescriptor(prop)
    Object.defineProperty(HTMLElement.prototype, prop, {
      configurable: true,
      get(this: HTMLElement) {
        return measure(this, prop) ?? original?.get?.call(this) ?? 0
      },
    })
  }
  return () => {
    for (const [prop, d] of saved) {
      if (d) Object.defineProperty(HTMLElement.prototype, prop, d)
      else delete (HTMLElement.prototype as unknown as Record<string, unknown>)[prop]
    }
  }
}
