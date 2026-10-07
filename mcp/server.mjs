#!/usr/bin/env node
// Malilion UI MCP server — lets AI agents look up components, props, examples
// and design tokens instead of guessing. Zero dependencies: a small stdio
// JSON-RPC (MCP) implementation reading mcp/catalog.json.
//   npx -y -p @malilion/ui malilion-ui-mcp
import { readFileSync } from 'node:fs'
import { createInterface } from 'node:readline'

const catalog = JSON.parse(readFileSync(new URL('./catalog.json', import.meta.url), 'utf8'))
const byId = new Map(catalog.components.map((c) => [c.id, c]))
const groupLabel = new Map(catalog.groups.map((g) => [g.id, `${g.label} ${g.en}`]))
const reactComponents = new Set(catalog.react.components)

const norm = (s) => String(s).toLowerCase().replace(/^ml(?=[a-z])/, '').replace(/[^a-z0-9一-鿿]/g, '')
const toReact = (name) => name.replace(/^Ml(?=[A-Z])/, '')

/** Find a page by id, English title, MlName, React name or Chinese name. */
function find(name) {
  const n = norm(name)
  return catalog.components.find((c) => norm(c.id) === n || norm(c.title) === n || c.zh === name || c.api?.some((a) => norm(a.component) === n))
}

const text = (t) => ({ content: [{ type: 'text', text: t }] })
const fail = (t) => ({ content: [{ type: 'text', text: t }], isError: true })

const reactNote =
  'React: import from "@malilion/ui/react" with the "Ml" prefix dropped (MlDatePicker → DatePicker). v-model → value/defaultValue/onChange, v-model:open → open/onOpenChange, named slots → props or render functions, v-slot → render props.'

function suggest(name) {
  const n = norm(name)
  const hits = catalog.components.filter((c) => norm(c.id).includes(n) || n.includes(norm(c.id))).slice(0, 6)
  return hits.length ? ` Did you mean: ${hits.map((c) => c.id).join(', ')}?` : ' Try list_components or search_components.'
}

function renderApi(page, framework) {
  const out = []
  for (const api of page.api ?? []) {
    const react = framework === 'react'
    const name = react ? toReact(api.component) : api.component
    out.push(`### ${name}`)
    const reactProps = react ? catalog.react.props[name] : undefined
    if (api.props?.length) {
      out.push('**Props**', '| name | type | default | description |', '| --- | --- | --- | --- |')
      for (const p of api.props) {
        const r = reactProps?.[p.name]
        const flag = react && reactProps && !r ? ' (Vue only)' : ''
        const type = (react && r?.type ? r.type : p.type).replace(/\\/g, '\\\\').replace(/\|/g, '\\|')
        out.push(`| ${p.name}${flag} | \`${type}\` | ${p.default ? `\`${p.default}\`` : ''} | ${p.desc} |`)
      }
      if (react && reactProps) {
        const known = new Set(api.props.map((p) => p.name))
        const extra = Object.entries(reactProps).filter(([k, v]) => !v.inherited && !known.has(k))
        if (extra.length) out.push('', '**React-only props**', ...extra.map(([k, v]) => `- \`${k}${v.optional ? '?' : ''}: ${v.type}\`${v.doc ? ` — ${v.doc}` : ''}`))
      }
    }
    if (api.events?.length) {
      out.push('', react ? '**Events** (Vue names; React uses onXxx props)' : '**Events**')
      for (const e of api.events) out.push(`- \`${e.name}\`${e.type ? ` \`${e.type}\`` : ''} — ${e.desc}`)
    }
    if (api.slots?.length) {
      out.push('', react ? '**Slots** (React: props / render functions)' : '**Slots**')
      for (const s of api.slots) out.push(`- \`${s.name}\` — ${s.desc}`)
    }
    out.push('')
  }
  return out.join('\n')
}

const setupGuides = {
  vue: `npm install @malilion/ui

// main.ts
import { createApp } from 'vue'
import MalilionUI from '@malilion/ui'
import '@malilion/ui/style.css'
createApp(App).use(MalilionUI).mount('#app')   // registers every Ml* component globally

// or import one by one (tree-shakeable)
import { MlButton, MlCard } from '@malilion/ui'

// English UI text: app.use(MalilionUI, { locale: en })  (import { en } from '@malilion/ui')
// Toasts: put <MlToastHost /> once in App.vue, then const toast = useToast(); toast('Roar!')
// Theme: <html data-ml-theme="light"> (default dark); <MlThemeToggle /> or useTheme()`,
  react: `npm install @malilion/ui react react-dom

import '@malilion/ui/style.css'
import { Button, Card, ToastHost, toast } from '@malilion/ui/react'

<Card title="Hello"><Button stamp onClick={() => toast('Roar!')}>Deploy</Button></Card>
<ToastHost />   // once, near the root

Works in Next.js App Router (entry is 'use client'). Rich-text editor: '@malilion/ui/react/editor'.
i18n: <ConfigProvider locale={en}>. ${reactNote}`,
  nuxt: `// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@malilion/ui/nuxt'],
  malilion: { locale: 'en' },   // optional: css: 'on-demand' | 'full' | false, prefix
})
// Components, useToast/useConfirm/useActionSheet and v-paw-stamp / v-loading are auto-imported.
// Default css mode loads only the styles of the components each page uses.`,
  css: `Every visual lives in plain .ml-* classes and --ml-* tokens, so any framework can use the CSS alone:

import '@malilion/ui/style.css'            // everything
import '@malilion/ui/css/tokens.css'       // tokens only
<button class="ml-btn ml-btn--primary ml-btn--md">Deploy</button>
<body class="ml-app">  <!-- optional page backdrop + fonts -->

Theme: data-ml-theme="dark|light" on <html> or any section.`,
  'on-demand': `Load only the styles of the components you use:

import '@malilion/ui/on-demand/MlButton'
import '@malilion/ui/on-demand/MlCard'

(Nuxt module does this automatically.)`,
}

const tools = [
  {
    name: 'list_components',
    description: 'List every Malilion UI component/page (id, English + Chinese name, one-line description), optionally filtered by group. Start here to see what exists.',
    inputSchema: { type: 'object', properties: { group: { type: 'string', description: `Group id: ${catalog.groups.map((g) => g.id).join(', ')}` } } },
    run({ group }) {
      const list = catalog.components.filter((c) => !group || c.group === group)
      if (!list.length) return fail(`No components in group "${group}". Groups: ${catalog.groups.map((g) => g.id).join(', ')}`)
      const rows = []
      let last
      for (const c of list) {
        if (c.group !== last) rows.push(`\n## ${groupLabel.get(c.group) ?? c.group}`), (last = c.group)
        rows.push(`- ${c.id} — ${c.title} / ${c.zh}${c.isNew ? ' (new)' : ''}: ${c.desc}`)
      }
      return text(`${catalog.name}@${catalog.version} — ${list.length} pages${rows.join('\n')}`)
    },
  },
  {
    name: 'search_components',
    description: 'Search components by keyword in English or Chinese (name, description, prop names). Use when you know what you need but not what it is called, e.g. "date range", "表格", "toast".',
    inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
    run({ query }) {
      const terms = String(query).toLowerCase().split(/\s+/).filter(Boolean)
      const scored = catalog.components
        .map((c) => {
          const head = `${c.id} ${c.title} ${c.zh} ${(c.api ?? []).map((a) => a.component).join(' ')}`.toLowerCase()
          const body = `${c.desc} ${(c.api ?? []).flatMap((a) => (a.props ?? []).map((p) => `${p.name} ${p.desc}`)).join(' ')}`.toLowerCase()
          let score = 0
          for (const t of terms) score += (head.includes(t) ? 5 : 0) + (body.includes(t) ? 1 : 0)
          return { c, score }
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 12)
      if (!scored.length) return text(`No match for "${query}". Try list_components.`)
      return text(scored.map(({ c }) => `- ${c.id} — ${c.title} / ${c.zh}: ${c.desc}`).join('\n'))
    },
  },
  {
    name: 'get_component',
    description: 'Full reference for one component: import line, props (types, defaults), events, slots, and optionally usage examples. Accepts id ("date-picker"), name ("MlDatePicker", "DatePicker") or Chinese name. Always call this before writing code that uses a component — do not guess prop names.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        framework: { type: 'string', enum: ['vue', 'react'], description: 'Default vue. react = @malilion/ui/react names and prop types.' },
        examples: { type: 'boolean', description: 'Include example source code (default false; use get_example for one).' },
      },
      required: ['name'],
    },
    run({ name, framework = 'vue', examples = false }) {
      const page = find(name)
      if (!page) return fail(`No component "${name}".${suggest(name)}`)
      const react = framework === 'react'
      const lines = [`# ${page.title} / ${page.zh} (${page.id})`, page.desc, '']
      if (page.usage) {
        lines.push('```ts', react ? page.usage.replace(/'@malilion\/ui\/editor'/g, "'@malilion/ui/react/editor'").replace(/'@malilion\/ui'/g, "'@malilion/ui/react'").replace(/\bMl([A-Z]\w*)/g, (m, n) => (reactComponents.has(n) ? n : m)) : page.usage, '```', '')
      }
      if (react) lines.push(`> ${reactNote}`, '')
      if (page.setup) lines.push(`**Setup — ${page.setup.title}** (${page.setup.filename})`, '```', page.setup.code, '```', '')
      lines.push(renderApi(page, framework))
      if (page.examples.length) {
        lines.push('**Examples** (use get_example for source):', ...page.examples.map((e) => `- ${e.file.split('/').pop()} — ${e.title}${e.desc ? `: ${e.desc}` : ''}`))
        if (examples) for (const e of page.examples) if (e.code) lines.push('', `#### ${e.title} (${e.file})`, '```vue', e.code, '```')
        if (react) lines.push('', 'Examples are Vue SFCs; translate to React with the mapping above.')
      }
      return text(lines.join('\n'))
    },
  },
  {
    name: 'get_example',
    description: 'Source code of a component example (Vue SFC) from the docs site. Omit "example" to list the available ones.',
    inputSchema: {
      type: 'object',
      properties: { component: { type: 'string' }, example: { type: 'string', description: 'Example file name (e.g. "variants") or title; omit to list.' } },
      required: ['component'],
    },
    run({ component, example }) {
      const page = find(component)
      if (!page) return fail(`No component "${component}".${suggest(component)}`)
      if (!page.examples.length) return text(`${page.id} has no examples.`)
      if (!example) return text(page.examples.map((e) => `- ${e.file.split('/').pop()} — ${e.title}${e.desc ? `: ${e.desc}` : ''}`).join('\n'))
      const q = String(example).toLowerCase()
      const hit = page.examples.find((e) => e.file.split('/').pop().toLowerCase() === q || e.file.toLowerCase() === q || e.title.toLowerCase() === q)
      if (!hit?.code) return fail(`No example "${example}" for ${page.id}. Available: ${page.examples.map((e) => e.file.split('/').pop()).join(', ')}`)
      return text(`${hit.title}${hit.desc ? ` — ${hit.desc}` : ''}\n\`\`\`vue\n${hit.code}\n\`\`\``)
    },
  },
  {
    name: 'get_tokens',
    description: 'Design tokens (CSS custom properties --ml-*): palette, metals, spacing, type, semantic colours per theme. Use var(--ml-…) instead of hard-coded colours.',
    inputSchema: {
      type: 'object',
      properties: {
        filter: { type: 'string', description: 'Substring of the token name, e.g. "gold", "surface", "metal", "radius".' },
        theme: { type: 'string', enum: ['all', 'root', 'dark', 'light'], description: 'Which block; default all.' },
      },
    },
    run({ filter, theme = 'all' }) {
      const blocks = catalog.tokens.filter((b) => theme === 'all' || (theme === 'root' ? b.selector === ':root' : b.selector.includes(`'${theme}'`)))
      const out = []
      for (const b of blocks) {
        const rows = Object.entries(b.vars).filter(([k]) => !filter || k.includes(String(filter).toLowerCase()))
        if (rows.length) out.push(`/* ${b.selector} */`, ...rows.map(([k, v]) => `${k}: ${v};`), '')
      }
      return out.length ? text(out.join('\n')) : text(`No tokens match "${filter}".`)
    },
  },
  {
    name: 'get_setup',
    description: 'How to install and wire up Malilion UI for a framework: vue, react (Next.js), nuxt, css (any framework / plain HTML), or on-demand (per-component styles).',
    inputSchema: { type: 'object', properties: { framework: { type: 'string', enum: Object.keys(setupGuides) } }, required: ['framework'] },
    run({ framework }) {
      const g = setupGuides[framework]
      return g ? text(`${catalog.name}@${catalog.version}\n\n${g}`) : fail(`Unknown framework "${framework}". Use: ${Object.keys(setupGuides).join(', ')}`)
    },
  },
]

// ── MCP over stdio (newline-delimited JSON-RPC 2.0) ──────────────────────────
const send = (msg) => process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', ...msg })}\n`)
const SUPPORTED = ['2025-06-18', '2025-03-26', '2024-11-05']

const instructions = `Malilion UI (碼力獅, ${catalog.name}@${catalog.version}) is a lion × tech × metal component library for Vue 3, React and plain CSS. Before using a component call get_component — do not guess prop names. Use search_components when unsure of the name, get_tokens for colours/spacing, get_setup for installation.`

function handle(req) {
  const { id, method, params } = req
  const reply = (result) => id !== undefined && send({ id, result })
  const error = (code, message) => id !== undefined && send({ id, error: { code, message } })
  switch (method) {
    case 'initialize':
      return reply({
        protocolVersion: SUPPORTED.includes(params?.protocolVersion) ? params.protocolVersion : SUPPORTED[0],
        capabilities: { tools: {} },
        serverInfo: { name: 'malilion-ui', version: catalog.version },
        instructions,
      })
    case 'ping':
      return reply({})
    case 'tools/list':
      return reply({ tools: tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) })
    case 'tools/call': {
      const tool = tools.find((t) => t.name === params?.name)
      if (!tool) return error(-32602, `Unknown tool: ${params?.name}`)
      try {
        return reply(tool.run(params.arguments ?? {}))
      } catch (e) {
        return reply(fail(`Error: ${e instanceof Error ? e.message : e}`))
      }
    }
    default:
      if (method?.startsWith('notifications/')) return
      return error(-32601, `Method not found: ${method}`)
  }
}

createInterface({ input: process.stdin }).on('line', (line) => {
  if (!line.trim()) return
  let req
  try {
    req = JSON.parse(line)
  } catch {
    return send({ id: null, error: { code: -32700, message: 'Parse error' } })
  }
  handle(req)
})
