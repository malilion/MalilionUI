// Markup parity for MlTerminal ↔ <Terminal>: both server-render the finished transcript.
import { describe, expect, it } from 'vitest'
import * as V from '../../src'
import { Terminal } from '../../src/react/terminal'
import { react, vue } from './parity-utils'

const lines: V.MlTerminalLine[] = [
  { type: 'comment', text: '# install' },
  { type: 'input', text: 'npm i {b}@malilion/ui{/}' },
  { type: 'progress', text: 'fetch' },
  { type: 'spinner', text: '{green}ready{/}', pending: 'resolving' },
  { type: 'spinner', text: 'broken', tone: 'danger' },
  { type: 'blank' },
  { type: 'output', text: 'added {gold}{u}1{/}{/} package <b>x</b>', tone: 'success' },
  { type: 'input', text: 'ls', prompt: '#' },
]

const cases: [string, () => Promise<string>, () => string][] = [
  ['Terminal', () => vue(V.MlTerminal, { lines }), () => react(<Terminal lines={lines} />)],
  [
    'Terminal options',
    () => vue(V.MlTerminal, { lines: ['plain', ...lines], title: 'pride@savanna', prompt: '$', copyable: true, dots: 'paw', meterWidth: 8, loop: true }),
    () => react(<Terminal lines={['plain', ...lines]} title="pride@savanna" prompt="$" copyable dots="paw" meterWidth={8} loop />),
  ],
  ['Terminal empty', () => vue(V.MlTerminal, { lines: [] }), () => react(<Terminal lines={[]} />)],
]

describe('React ↔ Vue markup parity: Terminal', () => {
  for (const [name, fromVue, fromReact] of cases) {
    it(name, async () => {
      expect(fromReact()).toBe(await fromVue())
    })
  }
})
