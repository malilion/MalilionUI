// The docs site's React mode shows each example converted from Vue
// (playground/convert/vue-to-react.ts). A conversion is only listed as
// verified — and only then shown — when it type-checks and server-renders the
// same markup as the Vue original. Refresh the list with `npx vitest run -u`;
// scripts/.cache/react-examples/report.txt says why the rest didn't make it.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createElement, type ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createSSRApp, type Component } from 'vue'
import { renderToString } from 'vue/server-renderer'
import ts from 'typescript'
import { collectReactApi, collectReactComponents, collectReactHandles } from '../../scripts/react-api.mjs'
import { UnsupportedError, vueToReact, type ConvertOptions } from '../../playground/convert/vue-to-react'
import MalilionUI from '../../src'
import { signature } from './parity-utils'

const root = process.cwd()
const out = join(root, 'scripts/.cache/react-examples')
const vueModules = import.meta.glob<{ default: Component }>('../../playground/examples/**/*.vue', { eager: true })
const sources = import.meta.glob<string>('../../playground/examples/**/*.vue', { eager: true, query: '?raw', import: 'default' })
const fileOf = (path: string) => path.replace('../../playground/examples/', '').replace(/\.vue$/, '')

// Same clock and dice for both renders.
const NOW = new Date('2026-10-04T10:30:00')
let seed = 1
beforeAll(() => {
  vi.useFakeTimers({ now: NOW, toFake: ['Date'] })
  vi.spyOn(Math, 'random').mockImplementation(() => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  })
})
afterAll(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const ctx = { props: collectReactApi(), components: new Set(collectReactComponents()), handles: new Set(collectReactHandles()) }

/** Convert and write `<file>.tsx` (package imports, for tsc) and `<file>.run.tsx` (source imports, to render). */
function write(file: string, source: string, options: ConvertOptions) {
  // CSS doesn't matter for types or markup; other relative imports (demo media)
  // are resolved from the example's own folder.
  const from = dirname(join(root, 'playground/examples', file))
  const tsx = vueToReact(source, file, ctx, options)
    .tsx.replace(/^import '\.\/[^']+\.css'\n/m, '')
    .replace(/(from |import )'(\.\.?\/[^']+)'/g, (_, kw: string, rel: string) => `${kw}'${join(from, rel)}'`)
  const target = join(out, `${file}.tsx`)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, tsx)
  writeFileSync(
    target.replace(/\.tsx$/, '.run.tsx'),
    tsx.replace(/'@malilion\/ui\/react\/editor'/g, `'${join(root, 'src/react/editor.tsx')}'`).replace(/'@malilion\/ui\/react'/g, `'${join(root, 'src/react/index.ts')}'`),
  )
  return target
}

/** First type error of each file. */
function typeErrors(targets: string[]) {
  const config = ts.getParsedCommandLineOfConfigFile(join(root, 'tsconfig.react.json'), {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} })!
  const program = ts.createProgram(targets, {
    ...config.options,
    noEmit: true,
    baseUrl: root,
    paths: { '@malilion/ui/react': ['src/react/index.ts'], '@malilion/ui/react/editor': ['src/react/editor.tsx'] },
  })
  const errors = new Map<string, string>()
  for (const t of targets) {
    const d = ts.getPreEmitDiagnostics(program, program.getSourceFile(t))[0]
    if (d) errors.set(t, ts.flattenDiagnosticMessageText(d.messageText, ' '))
  }
  return errors
}

describe('docs examples in React', () => {
  it('converted examples type-check and render like the Vue originals', async () => {
    rmSync(out, { recursive: true, force: true })
    const reasons: Record<string, string> = {}
    const options = new Map<string, ConvertOptions>()
    const targets = new Map<string, string>()

    for (const [path, source] of Object.entries(sources)) {
      const file = fileOf(path)
      try {
        targets.set(file, write(file, source, {}))
        options.set(file, {})
      } catch (e) {
        if (!(e instanceof UnsupportedError)) throw e
        reasons[file] = `unsupported: ${e.message}`
      }
    }

    // Type-check; setters handed a wider value get a second try with casts.
    const errors = typeErrors([...targets.values()])
    const retry = [...targets.keys()].filter((file) => /SetStateAction/.test(errors.get(targets.get(file)!) ?? ''))
    for (const file of retry) {
      targets.set(file, write(file, sources[`../../playground/examples/${file}.vue`], { castSetters: true }))
      options.set(file, { castSetters: true })
    }
    if (retry.length) {
      const again = typeErrors(retry.map((file) => targets.get(file)!))
      for (const file of retry) errors.set(targets.get(file)!, again.get(targets.get(file)!) ?? '')
    }
    for (const [file, t] of [...targets]) {
      const err = errors.get(t)
      if (err) {
        reasons[file] = `types: ${err}`
        targets.delete(file)
      }
    }

    // Render both and compare.
    const verified: Record<string, ConvertOptions> = {}
    for (const [file, target] of targets) {
      try {
        const vueApp = createSSRApp(vueModules[`../../playground/examples/${file}.vue`].default)
        vueApp.use(MalilionUI)
        const vueHtml = signature(await renderToString(vueApp))
        const mod = (await import(/* @vite-ignore */ target.replace(/\.tsx$/, '.run.tsx'))) as { default: ComponentType }
        const reactHtml = signature(renderToStaticMarkup(createElement(mod.default)))
        if (vueHtml === reactHtml) verified[file] = options.get(file)!
        else reasons[file] = 'markup differs'
      } catch (e) {
        reasons[file] = `render: ${(e as Error).message.split('\n')[0]}`
      }
    }

    writeFileSync(
      join(out, 'report.txt'),
      `${Object.keys(verified).length} / ${Object.keys(sources).length} verified\n\n${Object.entries(reasons)
        .sort()
        .map(([file, why]) => `${file}: ${why}`)
        .join('\n')}\n`,
    )
    const sorted = Object.fromEntries(Object.entries(verified).sort(([a], [b]) => a.localeCompare(b)))
    await expect(`${JSON.stringify(sorted, null, 1)}\n`).toMatchFileSnapshot('../../playground/convert/verified.json')
  }, 300_000)
})
