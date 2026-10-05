// Turns the Vue-first docs (registry.ts) into their React reading: component
// names without "Ml", camelCase props, v-model → value / onChange, events →
// onX, slots → children / render props. Names are checked against the real
// React props (scripts/react-api.mjs); anything that can't be matched is
// reported so the page can mark it instead of inventing an API.

import type { ApiDoc, EventDoc, PropDoc, SlotDoc } from './registry'

export interface ReactField {
  type: string
  optional: boolean
  doc: string
  /** From React's DOM typings (disabled, placeholder…), not the component's own. */
  inherited?: boolean
}
/** Component name (no "Ml") → its props. */
export type ReactApi = Record<string, Record<string, ReactField>>

const camel = (s: string) => s.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase())
/** HTML attributes React spells differently. */
const DOM_CASE: Record<string, string> = {
  readonly: 'readOnly', autofocus: 'autoFocus', autocomplete: 'autoComplete', crossorigin: 'crossOrigin', maxlength: 'maxLength',
  minlength: 'minLength', tabindex: 'tabIndex', autoplay: 'autoPlay', for: 'htmlFor', class: 'className', enterkeyhint: 'enterKeyHint', inputmode: 'inputMode',
  timeupdate: 'TimeUpdate', loadedmetadata: 'LoadedMetadata', volumechange: 'VolumeChange', ratechange: 'RateChange',
}

/** Vue slot names whose React prop is named differently. */
const SLOT_ALIAS: Record<string, string> = { error: 'fallback' }

const pascal = (s: string) => {
  const c = camel(s)
  return c.charAt(0).toUpperCase() + c.slice(1)
}

/** Vue directives and their React stand-ins. */
const DIRECTIVES: Record<string, string> = {
  'v-paw-stamp': 'usePawStamp()',
  'v-loading': '<Loading>',
  vPawStamp: 'usePawStamp',
  vLoading: 'Loading',
}

/**
 * "MlDatePicker" → "DatePicker" when React has that component; types such as
 * MlTableColumn and headings like "方法" stay; directives map to their hook / component.
 */
export function reactName(name: string, components: ReadonlySet<string>) {
  if (DIRECTIVES[name]) return DIRECTIVES[name]
  return name.replace(/\bMl([A-Z]\w*)/g, (match, rest: string) => (components.has(rest) ? rest : match))
}

/** Component names in prose ("MlForm 管理…" → "Form 管理…"); everything else stays. */
export function reactProse(text: string, components: ReadonlySet<string>) {
  return text.replace(/\bMl([A-Z]\w*)/g, (match, rest: string) => (components.has(rest) ? rest : match))
}

/**
 * An import line or snippet for Vue → the same for React. "MlFoo" loses its
 * prefix only when Foo is a React component; types like MlTableColumn stay.
 */
export function reactUsage(code: string, components: ReadonlySet<string>) {
  return code
    .replace(/'@malilion\/ui\/editor'/g, "'@malilion/ui/react/editor'")
    .replace(/'@malilion\/ui'/g, "'@malilion/ui/react'")
    .replace(/\bvPawStamp\b/g, 'usePawStamp')
    .replace(/\bvLoading\b/g, 'Loading')
    .replace(/\bMl([A-Z]\w*)/g, (match, rest: string) => (components.has(rest) ? rest : match))
}

export interface ReactRow {
  name: string
  /** Names that couldn't be found among the React props. */
  missing: string[]
}

/** One "a / b / c" cell → React names, checked against the component's props. */
function convertNames(cell: string, kind: 'prop' | 'event' | 'slot', fields: Record<string, ReactField> | undefined): ReactRow {
  const missing: string[] = []
  const has = (n: string) => !fields || n in fields
  const pick = (candidates: string[]) => {
    const found = candidates.filter(has)
    if (found.length) return found
    missing.push(candidates[0])
    return [candidates[0]]
  }
  const parts = cell.split(' / ').map((raw) => {
    const t = raw.trim()
    // Methods, calls and prose ("toSVG()", "Esc", "…") are the same in React.
    if (!/^(v-model(:[a-z-]+)?|[a-z][a-z0-9-]*(:[a-z-]+)?)$/i.test(t) || /[()]/.test(t)) return t
    if (kind === 'slot') {
      // A scoped default slot is usually a render prop (SwipeStack's renderItem).
      if (t === 'default') return pick(['children', 'renderItem']).slice(0, 1).join(' / ')
      const found = [`render${pascal(t)}`, camel(t), `${camel(t)}Content`, SLOT_ALIAS[t] ?? ''].find((n) => n && has(n))
      if (found) return found
      // Markdown-style components={{ code, link }} maps.
      if (fields && 'components' in fields) return `components.${camel(t)}`
      return pick([`render${pascal(t)}`]).join(' / ')
    }
    if (kind === 'event') {
      const base = t.replace(/^update:/, '')
      const n = t.startsWith('update:') ? `on${pascal(base)}Change` : `on${DOM_CASE[base] ?? pascal(base)}`
      return pick([n]).join(' / ')
    }
    if (t === 'v-model') return pick(['value', 'defaultValue', 'onChange']).join(' / ')
    const vm = /^v-model:(.+)$/.exec(t)
    if (vm) return pick([camel(vm[1]), `default${pascal(vm[1])}`, `on${pascal(vm[1])}Change`]).join(' / ')
    // A Vue `tag` prop is usually `as` in React.
    if (t === 'tag') {
      const found = ['as', 'tag'].find(has)
      if (found) return found
      missing.push('tag')
      return 'tag'
    }
    // "view-class" is viewClassName in React.
    const candidates = [DOM_CASE[t], camel(t), /-class$/.test(t) ? `${camel(t)}Name` : ''].filter(Boolean) as string[]
    const found = candidates.find(has)
    return found ?? pick([candidates[0]]).join(' / ')
  })
  return { name: parts.join(' / '), missing }
}

export interface ReactApiDoc {
  component: string
  props: (PropDoc & { missing: string[] })[]
  events: (EventDoc & { missing: string[] })[]
  slots: (SlotDoc & { missing: string[] })[]
}

/** A registry ApiDoc in its React reading. */
export function reactApiDoc(doc: ApiDoc, api: ReactApi, components: ReadonlySet<string>): ReactApiDoc {
  const component = reactName(doc.component, components)
  // Only components with known props are checked; helper tables ("方法", "函式"…) are prose.
  const fields = api[component]
  const isComponent = /^Ml[A-Z]\w*$/.test(doc.component) && components.has(doc.component.slice(2))
  const conv = <T extends { name: string; desc: string }>(rows: T[] | undefined, kind: 'prop' | 'event' | 'slot') =>
    (rows ?? []).map((row) => {
      if (!isComponent) return { ...row, missing: [] }
      const r = convertNames(row.name, kind, fields)
      return { ...row, name: r.name, desc: reactProse(row.desc, components), missing: r.missing }
    })
  return { component, props: conv(doc.props, 'prop'), events: conv(doc.events, 'event'), slots: conv(doc.slots, 'slot') }
}
