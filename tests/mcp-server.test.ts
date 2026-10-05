// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest'
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))

function rpc(...calls: [string, object?][]) {
  const lines = calls.map(([method, params], i) => JSON.stringify({ jsonrpc: '2.0', id: i + 1, method, params }))
  const out = spawnSync('node', ['mcp/server.mjs'], { cwd: root, input: lines.join('\n') + '\n', encoding: 'utf8' })
  return out.stdout
    .trim()
    .split('\n')
    .map((l) => JSON.parse(l))
}
const call = (name: string, args: object) => rpc(['tools/call', { name, arguments: args }])[0].result as { content: { text: string }[]; isError?: boolean }

describe('malilion-ui-mcp', () => {
  beforeAll(() => {
    execFileSync('node', ['scripts/build-mcp-catalog.mjs'], { cwd: root })
  })

  it('initializes and lists tools', () => {
    const [init, list] = rpc(['initialize', { protocolVersion: '2025-06-18' }], ['tools/list'])
    expect(init.result.serverInfo.name).toBe('malilion-ui')
    expect(list.result.tools.map((t: { name: string }) => t.name)).toEqual(
      expect.arrayContaining(['list_components', 'search_components', 'get_component', 'get_example', 'get_tokens', 'get_setup']),
    )
  })

  it('resolves a component by id, Ml name, React name and Chinese name', () => {
    for (const name of ['button', 'MlButton', 'Button', '按鈕']) {
      expect(call('get_component', { name }).content[0].text).toContain('| variant |')
    }
  })

  it('maps to React names and reports unknown components', () => {
    expect(call('get_component', { name: 'date-picker', framework: 'react' }).content[0].text).toContain("import { DatePicker } from '@malilion/ui/react'")
    expect(call('get_component', { name: 'nope' }).isError).toBe(true)
  })

  it('returns example source, tokens and setup', () => {
    expect(call('get_example', { component: 'button', example: 'variants' }).content[0].text).toContain('<MlButton')
    expect(call('get_tokens', { filter: 'metal-gold', theme: 'root' }).content[0].text).toContain('--ml-metal-gold:')
    expect(call('get_setup', { framework: 'react' }).content[0].text).toContain('@malilion/ui/react')
  })
})
