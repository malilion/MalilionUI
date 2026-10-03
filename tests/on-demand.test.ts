// @vitest-environment node
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { MalilionResolver } from '../src/resolver'
import map from '../src/styles/on-demand/map.json'

describe('on-demand styles', () => {
  it('generated entries are up to date', () => {
    expect(() => execFileSync('node', ['scripts/build-style-map.mjs', '--check'], { stdio: 'pipe' })).not.toThrow()
  })

  it('every component has an entry that starts with core.css', () => {
    const index = readFileSync('src/index.ts', 'utf8')
    const components = [...index.matchAll(/^import (Ml\w+) from '\.\/components\//gm)].map((m) => m[1])
    expect(Object.keys(map)).toEqual(expect.arrayContaining(components))
    for (const name of components) {
      expect(readFileSync(`src/styles/on-demand/${name}.js`, 'utf8')).toMatch(/^\/\/.*\nimport '\.\.\/core\.css'/)
    }
    expect(map.MlCard).toEqual(['components/card.css'])
  })

  it('the resolver maps components and directives to the package and their styles', () => {
    const [components, directives] = MalilionResolver()
    expect(components.resolve('MlButton')).toEqual({ name: 'MlButton', from: '@malilion/ui', sideEffects: '@malilion/ui/on-demand/MlButton' })
    expect(components.resolve('RouterLink')).toBeUndefined()
    expect(directives.resolve('Loading')).toMatchObject({ name: 'vLoading', sideEffects: '@malilion/ui/on-demand/v-loading' })
    const [full] = MalilionResolver({ importStyle: 'full' })
    expect(full.resolve('MlCard')?.sideEffects).toBe('@malilion/ui/style.css')
    const [none] = MalilionResolver({ importStyle: false })
    expect(none.resolve('MlCard')?.sideEffects).toBeUndefined()
  })
})
