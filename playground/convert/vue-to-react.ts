// Turns a docs example (Vue SFC) into the same example in React (TSX + CSS).
// It covers what the examples use — ref / computed state, template refs,
// v-model, events, v-if / v-for, slots — and throws UnsupportedError for
// anything else. The output is only shown on the site once a test has
// type-checked it and matched its server-rendered markup against the Vue
// original (tests/react/examples.test.tsx), so a wrong guess never ships.

import { parse as parseSfc } from 'vue/compiler-sfc'
import ts from 'typescript'

export class UnsupportedError extends Error {}
const unsupported = (what: string): never => {
  throw new UnsupportedError(what)
}

export interface ReactFieldLite {
  type?: string
  inherited?: boolean
}
export interface ConvertContext {
  /** Component → its React props. */
  props: Record<string, Record<string, ReactFieldLite>>
  components: ReadonlySet<string>
  /** Exported handle types (BarcodeHandle…) for refs passed to components. */
  handles?: ReadonlySet<string>
}

export interface ConvertOptions {
  /**
   * Wrap setters passed as change callbacks: onChange={(v) => setX(v as typeof x)}.
   * Needed when the callback's value is wider than the state (Segmented hands
   * over string | number); the verifier turns it on per example.
   */
  castSetters?: boolean
}

export interface ReactExample {
  tsx: string
  css: string
}

/* ── Names ─────────────────────────────────────────────── */

const camel = (s: string) => s.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase())
const pascal = (s: string) => {
  const c = camel(s)
  return c.charAt(0).toUpperCase() + c.slice(1)
}

/** HTML / SVG attributes React spells differently. */
const DOM_ATTRS: Record<string, string> = {
  class: 'className', for: 'htmlFor', tabindex: 'tabIndex', readonly: 'readOnly', autofocus: 'autoFocus', autocomplete: 'autoComplete',
  maxlength: 'maxLength', minlength: 'minLength', crossorigin: 'crossOrigin', autoplay: 'autoPlay', colspan: 'colSpan', rowspan: 'rowSpan',
  contenteditable: 'contentEditable', spellcheck: 'spellCheck', enterkeyhint: 'enterKeyHint', inputmode: 'inputMode', srcset: 'srcSet',
  playsinline: 'playsInline', 'xlink:href': 'xlinkHref', 'xml:space': 'xmlSpace',
}
const DOM_EVENTS: Record<string, string> = {
  click: 'onClick', dblclick: 'onDoubleClick', input: 'onInput', change: 'onChange', submit: 'onSubmit', keydown: 'onKeyDown', keyup: 'onKeyUp',
  focus: 'onFocus', blur: 'onBlur', pointerdown: 'onPointerDown', pointerup: 'onPointerUp', pointermove: 'onPointerMove', mouseenter: 'onMouseEnter',
  mouseleave: 'onMouseLeave', contextmenu: 'onContextMenu', scroll: 'onScroll', load: 'onLoad', error: 'onError', timeupdate: 'onTimeUpdate',
}

/** DOM attributes React types as numbers. */
const NUMERIC_DOM = new Set(['rows', 'cols', 'tabIndex', 'maxLength', 'minLength', 'colSpan', 'rowSpan', 'span'])

/** A native element attribute in React spelling (aria-* and data-* stay kebab). */
function domAttr(name: string) {
  if (DOM_ATTRS[name]) return DOM_ATTRS[name]
  if (/^(aria|data)-/.test(name)) return name
  return camel(name)
}

/* ── Script: ref / computed → hooks ────────────────────── */

type Binding = { kind: 'state'; setter: string } | { kind: 'domRef' } | { kind: 'computed' } | { kind: 'plain' }

interface ScriptResult {
  imports: string[]
  body: string
  bindings: Map<string, Binding>
  reactHooks: Set<string>
}

const VUE_OK = new Set(['ref', 'shallowRef', 'computed', 'onMounted', 'onBeforeUnmount', 'onUnmounted'])

function convertScript(code: string, templateRefs: Set<string>, ctx: ConvertContext): ScriptResult {
  const sf = ts.createSourceFile('x.ts', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const bindings = new Map<string, Binding>()
  const reactHooks = new Set<string>()
  const imports: string[] = []
  const statements: string[] = []

  // Pass 1: find ref() / computed() declarations.
  for (const st of sf.statements) {
    if (!ts.isVariableStatement(st)) continue
    for (const d of st.declarationList.declarations) {
      if (!ts.isIdentifier(d.name)) {
        if (d.initializer && ts.isCallExpression(d.initializer) && ts.isIdentifier(d.initializer.expression) && VUE_OK.has(d.initializer.expression.text))
          unsupported('destructured ref')
        continue
      }
      const name = d.name.text
      const init = d.initializer
      const callee = init && ts.isCallExpression(init) && ts.isIdentifier(init.expression) ? init.expression.text : ''
      if (callee === 'ref' || callee === 'shallowRef') {
        bindings.set(name, templateRefs.has(name) ? { kind: 'domRef' } : { kind: 'state', setter: `set${pascal(name)}` })
      } else if (callee === 'computed') {
        bindings.set(name, { kind: 'computed' })
      } else if (['reactive', 'watch', 'watchEffect', 'defineModel', 'defineProps', 'useTemplateRef', 'toRef', 'inject', 'provide'].includes(callee)) {
        unsupported(callee)
      }
    }
  }

  // Rewrites x.value reads / writes inside any node, by text edits.
  const rewrite = (node: ts.Node): string => rewriteValueAccess(node, sf, bindings)

  for (const st of sf.statements) {
    // Keep the author's blank lines between statements.
    if (statements.length && /\n[ \t]*\n/.test(st.getFullText(sf).slice(0, st.getStart(sf) - st.getFullStart()))) statements.push('')
    if (ts.isImportDeclaration(st)) {
      const from = (st.moduleSpecifier as ts.StringLiteral).text
      if (from === 'vue') {
        const names = st.importClause?.namedBindings && ts.isNamedImports(st.importClause.namedBindings) ? st.importClause.namedBindings.elements.map((e) => e.name.text) : []
        for (const n of names) {
          if (!VUE_OK.has(n) && !st.importClause?.isTypeOnly) unsupported(`vue import ${n}`)
        }
        continue
      }
      if (from === '@malilion/ui' || from === '@malilion/ui/editor') {
        // useToast() just returns toast; React code imports toast directly.
        imports.push(st.getText().replace(/\buseToast\b/, 'toast').replace(/'@malilion\/ui(\/editor)?'/, (_, ed: string | undefined) => `'@malilion/ui/react${ed ?? ''}'`).replace(/\bMl([A-Z]\w*)/g, (m, rest: string) => (ctx.components.has(rest) ? rest : m)).replace(/\bvPawStamp\b/g, 'usePawStamp'))
        continue
      }
      if (from.endsWith('.vue')) unsupported('imports a .vue file')
      imports.push(st.getText())
      continue
    }
    if (ts.isVariableStatement(st)) {
      const out: string[] = []
      for (const d of st.declarationList.declarations) {
        const name = ts.isIdentifier(d.name) ? d.name.text : ''
        const b = bindings.get(name)
        const init = d.initializer as ts.CallExpression | undefined
        if (init && ts.isCallExpression(init) && ts.isIdentifier(init.expression) && init.expression.text === 'useToast') {
          if (name !== 'toast') out.push(`const ${name} = toast`)
          continue
        }
        if (b?.kind === 'state') {
          reactHooks.add('useState')
          const typeArg = init!.typeArguments?.[0]?.getText()
          const arg = init!.arguments[0] ? rewrite(init!.arguments[0]) : 'undefined'
          const lazy = init!.arguments[0] && /^(\[|\{|new |Array)/.test(arg) && arg.length > 60
          out.push(`const [${name}, ${b.setter}] = useState${typeArg ? `<${typeArg}${init!.arguments[0] ? '' : ' | undefined'}>` : ''}(${lazy ? `() => (${arg})` : init!.arguments[0] ? arg : ''})`)
        } else if (b?.kind === 'domRef') {
          reactHooks.add('useRef')
          const typeArg = init!.typeArguments?.[0]?.getText()
          out.push(`const ${name} = useRef<${typeArg ?? 'HTMLElement'}>(null)`)
        } else if (b?.kind === 'computed') {
          const fn = init!.arguments[0]
          if (!fn || !(ts.isArrowFunction(fn) || ts.isFunctionExpression(fn))) unsupported('computed without a getter')
          const f = fn as ts.ArrowFunction
          const type = init!.typeArguments?.[0]?.getText()
          const value = ts.isBlock(f.body) ? `(() => ${rewrite(f.body)})()` : rewrite(f.body)
          out.push(`const ${name}${type ? `: ${type}` : ''} = ${value}`)
        } else {
          out.push(`${st.declarationList.flags & ts.NodeFlags.Let ? 'let' : 'const'} ${rewrite(d)}`)
        }
      }
      if (out.length) statements.push(out.join('\n'))
      else if (statements[statements.length - 1] === '') statements.pop()
      continue
    }
    if (ts.isExpressionStatement(st) && ts.isCallExpression(st.expression) && ts.isIdentifier(st.expression.expression)) {
      const hook = st.expression.expression.text
      if (hook === 'onMounted' || hook === 'onBeforeUnmount' || hook === 'onUnmounted') {
        reactHooks.add('useEffect')
        const fn = rewrite(st.expression.arguments[0])
        statements.push(hook === 'onMounted' ? `useEffect(${fn}, [])` : `useEffect(() => ${fn}, [])`)
        continue
      }
      if (VUE_OK.has(hook) || /^define/.test(hook)) unsupported(hook)
    }
    statements.push(rewrite(st))
  }
  return { imports, body: statements.join('\n').replace(/^\n+/, ''), bindings, reactHooks }
}

/**
 * Rewrite `x.value` for every binding inside `node`: reads become `x` (or
 * `x.current` for element refs), assignments become setter calls. In-place
 * mutation of state (x.value.push(), x.value.a = 1) is unsupported.
 */
function rewriteValueAccess(node: ts.Node, sf: ts.SourceFile, bindings: Map<string, Binding>): string {
  const base = node.getStart(sf)
  const text = node.getText(sf)
  const edits: { start: number; end: number; text: string }[] = []
  const valueOf = (n: ts.Node) => (ts.isPropertyAccessExpression(n) && n.name.text === 'value' && ts.isIdentifier(n.expression) ? n.expression.text : undefined)

  const visit = (n: ts.Node) => {
    // x.value = e / x.value += e / x.value++
    if (ts.isBinaryExpression(n) && n.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && n.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
      const target = valueOf(n.left)
      const b = target ? bindings.get(target) : undefined
      if (b?.kind === 'state') {
        const op = n.operatorToken.getText(sf)
        const rhs = rewriteValueAccess(n.right, sf, bindings)
        const value = op === '=' ? rhs : `${target} ${op.slice(0, -1)} ${n.right.kind === ts.SyntaxKind.BinaryExpression ? `(${rhs})` : rhs}`
        edits.push({ start: n.getStart(sf) - base, end: n.getEnd() - base, text: `${b.setter}(${value})` })
        return
      }
      if (b) unsupported('assigning to a computed / element ref')
      // x.value.y = … mutates state in place.
      let left: ts.Node = n.left
      while (ts.isPropertyAccessExpression(left) || ts.isElementAccessExpression(left)) {
        const t = valueOf(left)
        if (t && bindings.get(t)?.kind === 'state') unsupported('mutating state in place')
        left = left.expression
      }
    }
    if ((ts.isPostfixUnaryExpression(n) || ts.isPrefixUnaryExpression(n)) && (n.operator === ts.SyntaxKind.PlusPlusToken || n.operator === ts.SyntaxKind.MinusMinusToken)) {
      const target = valueOf(n.operand)
      const b = target ? bindings.get(target) : undefined
      if (b?.kind === 'state') {
        edits.push({ start: n.getStart(sf) - base, end: n.getEnd() - base, text: `${b.setter}(${target} ${n.operator === ts.SyntaxKind.PlusPlusToken ? '+' : '-'} 1)` })
        return
      }
    }
    // x.value.push(…) and friends.
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) {
      const owner = valueOf(n.expression.expression)
      if (owner && bindings.get(owner)?.kind === 'state' && /^(push|pop|shift|unshift|splice|sort|reverse|fill|set|delete|add|clear)$/.test(n.expression.name.text))
        unsupported('mutating state in place')
    }
    const target = valueOf(n)
    if (target) {
      const b = bindings.get(target)
      if (b) {
        edits.push({ start: n.getStart(sf) - base, end: n.getEnd() - base, text: b.kind === 'domRef' ? `${target}.current` : target })
        return
      }
    }
    ts.forEachChild(n, visit)
  }
  visit(node)
  edits.sort((a, b) => b.start - a.start)
  let out = text
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end)
  return out
}

/* ── Template expressions ──────────────────────────────── */

/**
 * A template expression in React: state reads are unchanged (Vue unwraps them
 * in templates), assignments become setter calls.
 */
function templateExpression(expr: string, bindings: Map<string, Binding>, opts: { statement?: boolean } = {}) {
  const src = opts.statement ? expr : `(${expr})`
  const sf = ts.createSourceFile('e.ts', src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const edits: { start: number; end: number; text: string }[] = []
  const visit = (n: ts.Node) => {
    if (ts.isBinaryExpression(n) && n.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && n.operatorToken.kind <= ts.SyntaxKind.LastAssignment) {
      if (ts.isIdentifier(n.left)) {
        const b = bindings.get(n.left.text)
        if (b?.kind !== 'state') unsupported(`assigning to ${n.left.text} in the template`)
        const op = n.operatorToken.getText(sf)
        const rhs = templateExpression(n.right.getText(sf), bindings)
        const value = op === '=' ? rhs : `${n.left.text} ${op.slice(0, -1)} (${rhs})`
        edits.push({ start: n.getStart(sf), end: n.getEnd(), text: `${(b as { setter: string }).setter}(${value})` })
        return
      }
      unsupported('assigning to a member in the template')
    }
    if ((ts.isPostfixUnaryExpression(n) || ts.isPrefixUnaryExpression(n)) && (n.operator === ts.SyntaxKind.PlusPlusToken || n.operator === ts.SyntaxKind.MinusMinusToken) && ts.isIdentifier(n.operand)) {
      const b = bindings.get(n.operand.text)
      if (b?.kind !== 'state') unsupported('++ on a non-state value')
      edits.push({ start: n.getStart(sf), end: n.getEnd(), text: `${(b as { setter: string }).setter}(${n.operand.text} ${n.operator === ts.SyntaxKind.PlusPlusToken ? '+' : '-'} 1)` })
      return
    }
    if (ts.isIdentifier(n) && /^\$(slots|attrs|props|refs|el|emit)$/.test(n.text)) unsupported(n.text)
    if (ts.isIdentifier(n) && bindings.get(n.text)?.kind === 'domRef' && !(ts.isPropertyAccessExpression(n.parent) && n.parent.name === n))
      edits.push({ start: n.getStart(sf), end: n.getEnd(), text: `${n.text}.current` })
    ts.forEachChild(n, visit)
  }
  visit(sf)
  edits.sort((a, b) => b.start - a.start)
  let out = src
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end)
  return opts.statement ? out.trim().replace(/;$/, '') : out.slice(1, -1).trim()
}

/* ── Template → JSX ────────────────────────────────────── */

// compiler-core node types.
const ELEMENT = 1
const TEXT = 2
const COMMENT = 3
const INTERPOLATION = 5
const ATTRIBUTE = 6
const DIRECTIVE = 7
// Element tag types.
const COMPONENT = 1
const TEMPLATE = 3

/* eslint-disable @typescript-eslint/no-explicit-any */
type Node = any

interface JsxCtx {
  bindings: Map<string, Binding>
  conv: ConvertContext
  options: ConvertOptions
  /** Template ref name → the React component it's passed to. */
  refTargets: Map<string, string>
  /** Names in scope from v-for / scoped slots (never state). */
  locals: Set<string>
}

const escapeText = (s: string) => s.replace(/[{}<>]/g, (c) => `{'${c}'}`)

/**
 * Join JSX children: one per line when they're all elements / expressions,
 * on one line when text is mixed in (newlines would eat the spaces around it).
 */
function joinKids(kids: string[]) {
  const block = kids.every((k) => (k.startsWith('<') || k.startsWith('{')) && k !== `{' '}`)
  return block ? `\n${kids.join('\n')}\n` : kids.join('')
}

/** An opening tag, with its attributes one per line when they don't fit. */
function openTag(name: string, attrs: string[]) {
  const flat = `<${name}${attrs.length ? ` ${attrs.join(' ')}` : ''}`
  return flat.length <= 100 || attrs.length < 2 ? flat : `<${name}\n${attrs.join('\n')}\n`
}

function cssToObject(css: string) {
  const entries = css
    .split(';')
    .map((d) => d.trim())
    .filter(Boolean)
    .map((d) => {
      const i = d.indexOf(':')
      const key = d.slice(0, i).trim()
      const value = d.slice(i + 1).trim()
      return `${key.startsWith('--') ? `'${key}'` : camel(key)}: ${JSON.stringify(value)}`
    })
  return `{ ${entries.join(', ')} }`
}

/** The React prop for a component prop / slot, checked against its real props. */
function componentProp(component: string, vueName: string, ctx: JsxCtx) {
  const fields = ctx.conv.props[component]
  // modelValue is checked on checkbox-like components (they also have a form value), else value.
  const checkable = !!fields?.defaultChecked && !fields.defaultChecked.inherited
  const model = vueName === 'model-value' ? (checkable ? ['checked', 'value'] : ['value', 'checked']) : []
  const candidates = [DOM_ATTRS[vueName], ...model, camel(vueName), vueName === 'tag' ? 'as' : ''].filter(Boolean) as string[]
  if (!fields) return candidates[0]
  const found = candidates.find((c) => c in fields)
  // Vue falls class / style through to the root element; React needs a prop for them.
  if (vueName === 'class') return 'className' in fields ? 'className' : unsupported(`${component} has no className`)
  if (vueName === 'style') return 'style' in fields ? 'style' : unsupported(`${component} has no style`)
  if (!found && !/^(aria|data)-/.test(vueName) && vueName !== 'key') unsupported(`${component} has no prop ${vueName}`)
  return found ?? vueName
}

function componentEvent(component: string, event: string, ctx: JsxCtx) {
  const fields = ctx.conv.props[component]
  const candidates = event.startsWith('update:')
    ? [`on${pascal(event.slice(7))}Change`, event === 'update:model-value' || event === 'update:modelValue' ? 'onChange' : '']
    : [`on${pascal(event)}`, DOM_EVENTS[event] ?? '']
  const name = candidates.find((c) => c && (!fields || c in fields))
  return name ?? unsupported(`${component} has no ${candidates[0]}`)
}

function elementName(node: Node, ctx: JsxCtx) {
  if (node.tagType === COMPONENT) {
    const m = /^Ml([A-Z]\w*)$/.exec(node.tag)
    if (!m || !ctx.conv.components.has(m[1])) unsupported(`component <${node.tag}>`)
    return m![1]
  }
  return node.tag as string
}

/** v-on handler → a JSX function expression. */
function handler(exp: string, modifiers: string[], ctx: JsxCtx) {
  const trimmed = exp.trim()
  // An inline arrow / function is already a handler.
  if (!modifiers.length && /^(async\s+)?(\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>|^function\b/.test(trimmed)) return templateExpression(trimmed, ctx.bindings)
  const pre = modifiers.map((m) => (m === 'prevent' ? 'e.preventDefault()' : m === 'stop' ? 'e.stopPropagation()' : unsupported(`.${m} modifier`)))
  // A bare function name or member: pass it straight through.
  if (!pre.length && /^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/.test(trimmed) && !/^(true|false|null)$/.test(trimmed)) return trimmed
  const usesEvent = /\$event\b/.test(trimmed) || pre.length
  const body = templateExpression(trimmed.replace(/\$event\b/g, 'e'), ctx.bindings, { statement: true })
  const stmts = [...pre, ...body.split(/\n|;/).map((s) => s.trim()).filter(Boolean)]
  const param = usesEvent ? '(e)' : '()'
  return stmts.length === 1 ? `${param} => ${stmts[0]}` : `${param} => {\n${stmts.join('\n')}\n}`
}

function attrs(node: Node, ctx: JsxCtx, component: string | undefined): string[] {
  const out: string[] = []
  for (const p of node.props) {
    if (p.type === ATTRIBUTE) {
      if (p.name === 'ref') {
        if (component) ctx.refTargets.set(p.value.content, component)
        out.push(`ref={${p.value.content}}`)
        continue
      }
      if (p.name === 'class' && node.props.some((q: any) => q.type === DIRECTIVE && q.name === 'bind' && q.arg?.content === 'class')) continue
      const name = component ? componentProp(component, p.name, ctx) : domAttr(p.name)
      const fieldType = component ? (ctx.conv.props[component]?.[name]?.type ?? '') : ''
      if (!p.value) out.push(name)
      else if (p.name === 'style') out.push(`style={${cssToObject(p.value.content)}${/--/.test(p.value.content) ? ' as CSSProperties' : ''}}`)
      // A number-typed prop written as text ("4") is a number in React.
      else if (/^-?\d+(\.\d+)?$/.test(p.value.content) && ((/\bnumber\b/.test(fieldType) && !/\bstring\b/.test(fieldType)) || NUMERIC_DOM.has(name))) out.push(`${name}={${p.value.content}}`)
      else out.push(`${p.name === 'class' ? 'className' : name}=${JSON.stringify(p.value.content)}`)
      continue
    }
    if (p.type !== DIRECTIVE) continue
    const arg = p.arg?.content as string | undefined
    const exp = p.exp?.content as string | undefined
    if (p.name === 'bind') {
      if (!arg || !p.arg.isStatic) unsupported('v-bind without a static name')
      if (arg === 'key') {
        out.push(`key={${templateExpression(exp!, ctx.bindings)}}`)
        continue
      }
      if (arg === 'class') {
        const staticClass = node.props.find((q: any) => q.type === ATTRIBUTE && q.name === 'class')?.value?.content
        out.push(`className={${classExpression(exp!, staticClass, ctx)}}`)
        continue
      }
      const name = arg === 'style' ? (component ? componentProp(component, 'style', ctx) : 'style') : component ? componentProp(component, arg!, ctx) : domAttr(arg!)
      const value = templateExpression(exp!, ctx.bindings)
      // CSS custom properties aren't in React's CSSProperties type.
      out.push(name === 'style' && /['"]--/.test(value) ? `${name}={${value} as CSSProperties}` : `${name}={${value}}`)
    } else if (p.name === 'on') {
      if (!arg || !p.arg.isStatic) unsupported('dynamic v-on')
      const name = component ? componentEvent(component, arg!, ctx) : DOM_EVENTS[arg!] ?? unsupported(`@${arg}`)
      out.push(`${name}={${handler(exp!, (p.modifiers ?? []).map((m: any) => m.content ?? m), ctx)}}`)
    } else if (p.name === 'model') {
      if (p.modifiers?.length) unsupported('v-model modifiers')
      const b = bindings(ctx).get(exp!)
      if (b?.kind !== 'state') unsupported('v-model on a non-state value')
      const setter = (b as { setter: string }).setter
      if (component) {
        const fields = ctx.conv.props[component] ?? {}
        // v-model is value (or checked) + onChange; v-model:x is x + onXChange, else
        // onChange, else (for open) onClose.
        // Checkbox-like components have both value (the form value) and checked.
        const own = (n: string) => n in fields && !fields[n].inherited
        const prop = arg ? componentProp(component, arg, ctx) : own('defaultChecked') ? 'checked' : (['value', 'checked'].find((c) => c in fields) ?? unsupported(`${component} has no value`))
        const ev = arg ? `on${pascal(arg)}Change` : 'onChange'
        const set = ctx.options.castSetters ? `(v) => ${setter}(v as typeof ${exp})` : setter
        if (ev in fields) out.push(`${prop}={${exp}}`, `${ev}={${set}}`)
        else if (arg && 'onChange' in fields) out.push(`${prop}={${exp}}`, `onChange={${set}}`)
        else if (arg === 'open' && 'onClose' in fields) out.push(`${prop}={${exp}}`, `onClose={() => ${setter}(false)}`)
        else unsupported(`${component} has no ${ev}`)
      } else {
        const checkbox = node.props.some((q: any) => q.type === ATTRIBUTE && q.name === 'type' && q.value?.content === 'checkbox')
        out.push(checkbox ? `checked={${exp}}` : `value={${exp}}`, `onChange={(e) => ${setter}(e.target.${checkbox ? 'checked' : 'value'})}`)
      }
    } else if (p.name === 'html') {
      out.push(`dangerouslySetInnerHTML={{ __html: ${templateExpression(exp!, ctx.bindings)} }}`)
    } else if (p.name === 'if' || p.name === 'else-if' || p.name === 'else' || p.name === 'for' || p.name === 'slot') {
      // Handled by the caller.
    } else {
      unsupported(`v-${p.name}`)
    }
  }
  return out
}
const bindings = (ctx: JsxCtx) => ctx.bindings

/** Top-level parameter count of a function type such as "(a: A, b: B) => R". */
function paramCount(type: string) {
  const m = /\(([^()]*(?:\([^()]*\)[^()]*)*)\)\s*=>/.exec(type)
  if (!m) return 1
  let depth = 0
  let count = m[1].trim() ? 1 : 0
  for (const c of m[1]) {
    if ('<({['.includes(c)) depth++
    else if ('>)}]'.includes(c)) depth--
    else if (c === ',' && depth === 0) count++
  }
  return count
}

/**
 * Vue slot props → the React render function's parameters: one destructured
 * object when the function takes a single object (api: SheetApi), else the
 * names positionally ({ item, index } → item, index).
 */
function slotArgs(params: string | undefined, propType: string) {
  if (!params) return ''
  const destructured = /^\s*\{/.test(params)
  const names = params.replace(/^\s*\{\s*|\s*\}\s*$/g, '').split(',').map((x) => x.trim().split(/\s*:\s*/).pop()!).filter(Boolean)
  if (!destructured) return params.trim()
  const single = paramCount(propType) === 1
  // The function may sit in a union (ReactNode | ((api: SheetApi) => ReactNode)).
  const objectParam = /\(\s*\w+\??\s*:\s*(\{|[A-Z]\w*(Api|Context|Scope|Slot|State)\b)/.test(propType)
  return single && (objectParam || names.length > 1) ? `{ ${names.join(', ')} }` : names.join(', ')
}

/**
 * Vue's :class (string, array of strings / conditionals, or { cls: cond }
 * object) → a className expression, merged with a static class.
 */
function classExpression(exp: string, staticClass: string | undefined, ctx: JsxCtx) {
  const sf = ts.createSourceFile('c.ts', `(${exp})`, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const root = (sf.statements[0] as ts.ExpressionStatement).expression as ts.ParenthesizedExpression
  const e = root.expression
  const parts: string[] = staticClass ? [JSON.stringify(staticClass)] : []
  const fromObject = (o: ts.ObjectLiteralExpression) =>
    o.properties.map((pr) => {
      if (!ts.isPropertyAssignment(pr)) return unsupported(':class object form')
      const key = ts.isIdentifier(pr.name) || ts.isStringLiteral(pr.name) ? JSON.stringify(pr.name.text) : unsupported(':class computed key')
      return `${templateExpression(pr.initializer.getText(sf), ctx.bindings)} && ${key}`
    })
  if (ts.isArrayLiteralExpression(e)) {
    for (const el of e.elements) {
      if (ts.isObjectLiteralExpression(el)) parts.push(...fromObject(el))
      else parts.push(templateExpression(el.getText(sf), ctx.bindings))
    }
  } else if (ts.isObjectLiteralExpression(e)) {
    parts.push(...fromObject(e))
  } else {
    parts.push(templateExpression(e.getText(sf), ctx.bindings))
  }
  return parts.length === 1 && !staticClass ? parts[0] : `[${parts.join(', ')}].filter(Boolean).join(' ')`
}

const dir = (node: Node, name: string) => node.props?.find((p: any) => p.type === DIRECTIVE && p.name === name)

/** Children → JSX pieces, folding v-if / v-else-if / v-else chains. */
function children(nodes: Node[], ctx: JsxCtx): string[] {
  const out = childrenRaw(nodes, ctx)
  // Whitespace at the very start / end of an element's content is just indentation.
  if (out.length && !out[0].startsWith('<') && !out[0].startsWith('{')) out[0] = out[0].replace(/^ +/, '')
  const last = out.length - 1
  if (last >= 0 && !out[last].startsWith('<') && !out[last].endsWith('}')) out[last] = out[last].replace(/ +$/, '')
  return out.filter((k) => k !== '')
}

function childrenRaw(nodes: Node[], ctx: JsxCtx): string[] {
  const out: string[] = []
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]
    if (n.type === COMMENT) continue
    if (n.type === TEXT) {
      const t = n.content.replace(/\s+/g, ' ')
      if (t.trim()) out.push(escapeText(t))
      else if (t && out.length && i < nodes.length - 1 && !/\n/.test(n.content)) out.push(`{' '}`)
      continue
    }
    if (n.type === INTERPOLATION) {
      out.push(`{${templateExpression(n.content.content, ctx.bindings)}}`)
      continue
    }
    if (n.type !== ELEMENT) unsupported(`node type ${n.type}`)
    const vif = dir(n, 'if')
    if (vif) {
      const branches: [string | undefined, Node][] = [[vif.exp.content, n]]
      let j = i + 1
      for (; j < nodes.length; j++) {
        const m = nodes[j]
        if (m.type === COMMENT || (m.type === TEXT && !m.content.trim())) continue
        const elif = m.type === ELEMENT && dir(m, 'else-if')
        const els = m.type === ELEMENT && dir(m, 'else')
        if (elif) branches.push([elif.exp.content, m])
        else if (els) branches.push([undefined, m])
        else break
        if (els) {
          j++
          break
        }
      }
      i = j - 1
      let expr = branches[branches.length - 1][0] === undefined ? element(branches.pop()![1], ctx) : 'null'
      for (let k = branches.length - 1; k >= 0; k--) expr = `${templateExpression(branches[k][0]!, ctx.bindings)} ? ${element(branches[k][1], ctx)} : ${expr}`
      out.push(`{${expr}}`)
      continue
    }
    out.push(element(n, ctx))
  }
  return out
}

/** One element (with its v-for) → JSX. */
function element(n: Node, ctx: JsxCtx): string {
  const vfor = dir(n, 'for')
  if (vfor) {
    const m = /^\s*\(?\s*([^,)]+?)\s*(?:,\s*([^,)]+?)\s*)?\)?\s+(?:in|of)\s+(.+)$/.exec(vfor.exp.content)
    if (!m) unsupported('v-for form')
    const [, item, index, source] = m!
    if (/[{[]/.test(item) && !/^[[{]/.test(item.trim())) unsupported('v-for destructuring')
    const locals = new Set(ctx.locals)
    for (const name of `${item},${index ?? ''}`.match(/[A-Za-z_$][\w$]*/g) ?? []) locals.add(name)
    const inner = { ...ctx, locals, bindings: withoutLocals(ctx.bindings, locals) }
    const src = /^\d+$/.test(source.trim()) ? `Array.from({ length: ${source.trim()} }, (_, i) => i + 1)` : templateExpression(source, ctx.bindings)
    return `{${src}.map((${item}${index ? `, ${index}` : ''}) => ${elementNoFor(n, inner)})}`
  }
  return elementNoFor(n, ctx)
}

function withoutLocals(b: Map<string, Binding>, locals: Set<string>) {
  const next = new Map(b)
  for (const l of locals) next.delete(l)
  return next
}

function elementNoFor(n: Node, ctx: JsxCtx): string {
  if (n.tagType === TEMPLATE) {
    // A bare <template v-if / v-for> groups children.
    return `<>${joinKids(children(n.children, ctx))}</>`
  }
  if (n.tag === 'slot') unsupported('<slot>')
  const name = elementName(n, ctx)
  const component = n.tagType === COMPONENT ? name : undefined
  const a = attrs(n, ctx, component)
  let kids: string[] = []
  if (component) {
    // Named / scoped slots become props; the rest are children.
    const slotTemplates = n.children.filter((c: Node) => c.type === ELEMENT && c.tagType === TEMPLATE && dir(c, 'slot'))
    const rest = n.children.filter((c: Node) => !slotTemplates.includes(c))
    const ownSlot = dir(n, 'slot')
    for (const t of ownSlot ? [{ ...n, children: rest, __self: true }] : slotTemplates) {
      const s = t.__self ? ownSlot : dir(t, 'slot')
      const slotName = s.arg?.content ?? 'default'
      const params = s.exp?.content as string | undefined
      const locals = new Set(ctx.locals)
      for (const v of params?.match(/[A-Za-z_$][\w$]*/g) ?? []) locals.add(v)
      const inner = { ...ctx, locals, bindings: withoutLocals(ctx.bindings, locals) }
      const content = children(t.children, inner)
      const jsx = content.length === 1 && !content[0].startsWith('{') && content[0].startsWith('<') ? content[0] : `<>${joinKids(content)}</>`
      if (slotName === 'default' && !params) {
        kids = content
        continue
      }
      const fields = ctx.conv.props[component] ?? {}
      const candidates = slotName === 'default' ? ['renderItem', 'children'] : [`render${pascal(slotName)}`, camel(slotName), `${camel(slotName)}Content`, slotName === 'error' ? 'fallback' : '']
      const prop = candidates.find((c) => c && c in fields) ?? unsupported(`${component} has no prop for slot #${slotName}`)
      const propType = fields[prop]?.type ?? ''
      const isFunction = /=>/.test(propType)
      if (params && !isFunction) unsupported(`${component}.${prop} takes no arguments`)
      a.push(isFunction ? `${prop}={(${slotArgs(params, propType)}) => ${jsx}}` : `${prop}={${jsx}}`)
    }
    if (!ownSlot && !slotTemplates.length) kids = children(n.children, ctx)
    else if (!ownSlot) {
      const loose = children(rest, ctx)
      if (loose.length) kids = loose
    }
    const fields = ctx.conv.props[component]
    if (kids.length && fields && !('children' in fields)) {
      // A default slot holding only text can become the label.
      const text = kids.length === 1 && !kids[0].startsWith('<') && !kids[0].startsWith('{') ? kids[0] : undefined
      if (text && 'label' in fields && !a.some((x) => x.startsWith('label='))) {
        a.push(`label=${JSON.stringify(text)}`)
        kids = []
      } else unsupported(`${component} takes no children`)
    }
  } else {
    kids = children(n.children, ctx)
  }
  const open = openTag(name, a)
  return kids.length ? `${open}>${joinKids(kids)}</${name}>` : `${open}${open.endsWith('\n') ? '' : ' '}/>`
}

/* ── Formatting ────────────────────────────────────────── */

// One language service for every example: creating one per file is slow.
const FORMAT_FILE = 'example.tsx'
let formatSource = ''
let formatVersion = 0
let formatter: ts.LanguageService | undefined

/** Indent with the TypeScript formatter (2 spaces, no semicolons added). */
function format(code: string) {
  formatSource = code
  formatVersion++
  formatter ??= ts.createLanguageService({
    getScriptFileNames: () => [FORMAT_FILE],
    getScriptVersion: () => String(formatVersion),
    getScriptSnapshot: (f) => (f === FORMAT_FILE ? ts.ScriptSnapshot.fromString(formatSource) : undefined),
    getCurrentDirectory: () => '/',
    getCompilationSettings: () => ({ jsx: ts.JsxEmit.Preserve, noLib: true }),
    getDefaultLibFileName: () => 'lib.d.ts',
    fileExists: (f) => f === FORMAT_FILE,
    readFile: (f) => (f === FORMAT_FILE ? formatSource : undefined),
  })
  const edits = formatter.getFormattingEditsForDocument(FORMAT_FILE, {
    ...ts.getDefaultFormatCodeSettings('\n'),
    indentSize: 2,
    tabSize: 2,
    convertTabsToSpaces: true,
    semicolons: ts.SemicolonPreference.Remove,
  })
  let out = code
  for (const e of [...edits].sort((a, b) => b.span.start - a.span.start)) out = out.slice(0, e.span.start) + e.newText + out.slice(e.span.start + e.span.length)
  return out.replace(/\n{3,}/g, '\n\n')
}

/* ── Whole file ────────────────────────────────────────── */

/** "button/basic" → "ButtonBasic". */
const componentName = (file: string) => file.split(/[/-]/).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('')

export function vueToReact(source: string, file: string, ctx: ConvertContext, options: ConvertOptions = {}): ReactExample {
  const { descriptor, errors } = parseSfc(source)
  if (errors.length) unsupported('parse error')
  if (descriptor.script) unsupported('<script> without setup')
  const ast = descriptor.template?.ast
  if (!ast) unsupported('no template')

  const templateRefs = new Set<string>()
  const collectRefs = (n: Node) => {
    for (const p of n.props ?? []) if (p.type === ATTRIBUTE && p.name === 'ref' && p.value) templateRefs.add(p.value.content)
    for (const c of n.children ?? []) collectRefs(c)
  }
  collectRefs(ast)

  const script = descriptor.scriptSetup ? convertScript(descriptor.scriptSetup.content, templateRefs, ctx) : { imports: [], body: '', bindings: new Map<string, Binding>(), reactHooks: new Set<string>() }
  const ctxJsx: JsxCtx = { bindings: script.bindings, conv: ctx, options, refTargets: new Map(), locals: new Set() }
  const body = children(ast!.children, ctxJsx)
  // Refs handed to components get the component's handle type (BarcodeHandle…).
  const handleTypes: string[] = []
  for (const [refName, comp] of ctxJsx.refTargets) {
    const handle = `${comp}Handle`
    if (!ctx.handles?.has(handle)) continue
    script.body = script.body.replace(new RegExp(`const ${refName} = useRef<.*?>\\(null\\)`), `const ${refName} = useRef<${handle}>(null)`)
    handleTypes.push(handle)
  }
  const jsx = body.length === 1 && body[0].startsWith('<') ? body[0] : `<>${joinKids(body)}</>`

  // Components used in JSX must be imported from @malilion/ui/react.
  const used = new Set([...jsx.matchAll(/<([A-Z]\w*)/g)].map((m) => m[1]))
  const imported = new Set(script.imports.flatMap((l) => [...l.matchAll(/\b([A-Z]\w*)\b/g)].map((m) => m[1])))
  const plain = (x: string) => x.replace(/^type /, '')
  const need = [...used, ...handleTypes.map((h) => `type ${h}`)].filter((c) => !imported.has(plain(c))).sort((x, y) => plain(x).localeCompare(plain(y)))
  const imports: string[] = []
  // A local type that only described a Vue ref (now typed by its handle) goes.
  const bodySf = ts.createSourceFile('b.tsx', script.body, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  for (const st of [...bodySf.statements].reverse()) {
    if (!ts.isTypeAliasDeclaration(st) && !ts.isInterfaceDeclaration(st)) continue
    const uses = `${script.body}\n${jsx}`.match(new RegExp(`\\b${st.name.text}\\b`, 'g'))?.length ?? 0
    if (uses === 1) script.body = (script.body.slice(0, st.getFullStart()) + script.body.slice(st.getEnd())).replace(/^\n+/, '')
  }
  // State that is never set needs no setter.
  for (const [name, b] of script.bindings) {
    if (b.kind !== 'state') continue
    const uses = `${script.body}\n${jsx}`.match(new RegExp(`\\b${b.setter}\\b`, 'g'))?.length ?? 0
    if (uses === 1) script.body = script.body.replace(`const [${name}, ${b.setter}] =`, `const [${name}] =`)
  }
  const reactNames = [...script.reactHooks].sort()
  if (/as CSSProperties/.test(jsx)) reactNames.push('type CSSProperties')
  if (reactNames.length) imports.push(`import { ${reactNames.join(', ')} } from 'react'`)
  const uiLine = script.imports.findIndex((l) => /from '@malilion\/ui\/react'/.test(l) && !/^import type/.test(l))
  if (need.length) {
    if (uiLine >= 0) script.imports[uiLine] = script.imports[uiLine].replace(/\{\s*/, `{ ${need.join(', ')}, `)
    else imports.push(`import { ${need.join(', ')} } from '@malilion/ui/react'`)
  }
  const css = descriptor.styles.map((s) => s.content.trim()).join('\n\n')
  if (descriptor.styles.some((s) => s.module)) unsupported('CSS modules')
  const base = file.split('/').pop()!
  imports.push(...script.imports)
  if (css) imports.push(`import './${base}.css'`)

  const code = `\n\nexport default function ${componentName(file)}() {\n${script.body ? `${script.body}\n\n` : ''}return (\n${jsx}\n)\n}\n`
  const tsx = `${imports.map((line) => pruneImport(line, code)).filter(Boolean).join('\n')}${code}`
  return { tsx: format(tsx), css }
}

/**
 * Drop named imports the React code no longer uses (a Vue ref's hand-written
 * type replaced by BarcodeHandle, say); keeps side-effect and default imports.
 */
function pruneImport(line: string, code: string) {
  const m = /^import (type )?\{([^}]*)\}( from .+)$/.exec(line.trim())
  if (!m) return line
  const keep = m[2]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((spec) => {
      const local = spec.replace(/^type\s+/, '').split(/\s+as\s+/).pop()!
      return new RegExp(`\\b${local}\\b`).test(code)
    })
  return keep.length ? `import ${m[1] ?? ''}{ ${keep.join(', ')} }${m[3]}` : ''
}
