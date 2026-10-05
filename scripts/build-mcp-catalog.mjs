// Build mcp/catalog.json — everything the Malilion UI MCP server answers from.
//   node scripts/build-mcp-catalog.mjs
//
// Sources: the docs site registry (props / events / slots / examples for every
// page), the example .vue files, the React props read by scripts/react-api.mjs,
// and the design tokens in src/styles/tokens.css. The published package ships
// the result, so the server needs neither the repo nor any dependency.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { collectReactApi, collectReactComponents } from './react-api.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const { pages, groups } = await import(join(root, 'playground/registry.ts'))
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

const exampleSource = (file) => {
  try {
    return readFileSync(join(root, 'playground/examples', `${file}.vue`), 'utf8').trimEnd()
  } catch {
    return undefined
  }
}

// Hand-written docs pages (home, start, tokens…) carry no data of their own.
const components = pages
  .filter((p) => p.desc || p.api || p.examples)
  .map((p) => ({
  id: p.id,
  title: p.title,
  zh: p.zh,
  group: p.group,
  desc: p.desc,
  usage: p.usage,
  isNew: p.isNew || undefined,
  setup: p.setup ? { title: p.setup.title, filename: p.setup.filename, code: p.setup.code } : undefined,
  api: p.api,
  examples: (p.examples ?? []).map((e) => ({ file: e.file, title: e.title, desc: e.desc, code: exampleSource(e.file) })),
}))

// tokens.css → [{ selector, vars: { '--ml-x': 'value' } }]
const tokenCss = readFileSync(join(root, 'src/styles/tokens.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
const tokens = [...tokenCss.matchAll(/^([^\s{][^{]*)\{([^}]*)\}/gm)].map((m) => ({
  selector: m[1].trim(),
  vars: Object.fromEntries([...m[2].matchAll(/(--ml-[\w-]+)\s*:\s*([^;]+);/g)].map((v) => [v[1], v[2].trim().replace(/\s+/g, ' ')])),
}))

const catalog = {
  name: pkg.name,
  version: pkg.version,
  groups,
  components,
  react: { components: collectReactComponents(), props: collectReactApi() },
  tokens,
}

mkdirSync(join(root, 'mcp'), { recursive: true })
writeFileSync(join(root, 'mcp/catalog.json'), JSON.stringify(catalog))
console.log(`mcp/catalog.json: ${components.length} pages, ${catalog.react.components.length} React components, ${tokens.length} token blocks`)
