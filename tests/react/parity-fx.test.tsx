// Markup parity for the effect, chat and line-chart components (see parity.test.tsx).
import { describe, expect, it } from 'vitest'
import { createSSRApp, h, type Component } from 'vue'
import { renderToString } from 'vue/server-renderer'
import * as V from '../../src'
import * as F from '../../src/react/fx'
import * as C from '../../src/react/chat'
import { LineChart } from '../../src/react/charts'
import { react, signature, vue } from './parity-utils'

async function vueSlots(component: Component, props: Record<string, unknown>, slots: Record<string, string>) {
  const app = createSSRApp({ render: () => h(component, props, Object.fromEntries(Object.entries(slots).map(([k, v]) => [k, () => v]))) })
  return signature(await renderToString(app))
}

const series = [
  { name: 'A', data: [1, 4, 2, 5] },
  { name: 'B', data: [3, -1, 2], tone: 'tech' as const },
]

const cases: [string, () => Promise<string>, () => string][] = [
  ['BorderBeam', () => vue(V.MlBorderBeam, { tone: 'tech', reverse: true, paused: true }, 'Hi'), () => react(<F.BorderBeam tone="tech" reverse paused>Hi</F.BorderBeam>)],
  ['BorderBeam tag', () => vue(V.MlBorderBeam, { tag: 'section' }, 'x'), () => react(<F.BorderBeam as="section">x</F.BorderBeam>)],
  ['CountUp', () => vue(V.MlCountUp, { value: 12345.6, from: 100, decimals: 1, prefix: '$', suffix: '+' }), () => react(<F.CountUp value={12345.6} from={100} decimals={1} prefix="$" suffix="+" />)],
  ['CountUp negative', () => vue(V.MlCountUp, { value: -5000, separator: '' }), () => react(<F.CountUp value={-5000} separator="" />)],
  ['DecryptText', () => vue(V.MlDecryptText, { text: 'Hi lion' }), () => react(<F.DecryptText text="Hi lion" />)],
  ['DecryptText tag', () => vue(V.MlDecryptText, { text: 'AB', tag: 'h2', trigger: 'hover' }), () => react(<F.DecryptText text="AB" as="h2" trigger="hover" />)],
  ['LionMark', () => vue(V.MlLionMark, { glow: true, animated: true }), () => react(<F.LionMark glow animated />)],
  ['LionMark title', () => vue(V.MlLionMark, { title: 'Malilion', size: 32 }), () => react(<F.LionMark title="Malilion" size={32} />)],
  ['Marquee', () => vue(V.MlMarquee, { direction: 'right', paused: true, fade: false, label: 'Logos' }, 'Item'), () => react(<F.Marquee direction="right" paused fade={false} label="Logos">Item</F.Marquee>)],
  ['PawBurst', () => vue(V.MlPawBurst, {}, 'Yay'), () => react(<F.PawBurst>Yay</F.PawBurst>)],
  ['Phone', () => vue(V.MlPhone, { time: '10:00', label: 'Preview' }, 'App'), () => react(<F.Phone time="10:00" label="Preview">App</F.Phone>)],
  ['Phone bottom', () => vueSlots(V.MlPhone, {}, { default: 'App', bottom: 'Tabs' }), () => react(<F.Phone bottom="Tabs">App</F.Phone>)],
  ['Reveal', () => vue(V.MlReveal, { effect: 'zoom', stagger: 80 }, 'Hello'), () => react(<F.Reveal effect="zoom" stagger={80}>Hello</F.Reveal>)],
  ['Spotlight', () => vue(V.MlSpotlight, { tone: 'tech', grid: false }, 'Lit'), () => react(<F.Spotlight tone="tech" grid={false}>Lit</F.Spotlight>)],
  ['Tilt', () => vue(V.MlTilt, {}, 'Card'), () => react(<F.Tilt>Card</F.Tilt>)],
  ['Tilt no glare', () => vue(V.MlTilt, { glare: false }, 'Card'), () => react(<F.Tilt glare={false}>{({ active }) => (active ? 'on' : 'Card')}</F.Tilt>)],
  ['Chat', () => vue(V.MlChat, { label: 'Log' }, 'msgs'), () => react(<C.Chat label="Log">msgs</C.Chat>)],
  ['Chat slots', () => vueSlots(V.MlChat, {}, { default: 'm', header: 'H', footer: 'F' }), () => react(<C.Chat header="H" footer="F">m</C.Chat>)],
  ['ChatInput', () => vue(V.MlChatInput, { maxLength: 200 }), () => react(<C.ChatInput maxLength={200} />)],
  ['ChatInput loading', () => vue(V.MlChatInput, { loading: true, disabled: true, placeholder: 'Say' }), () => react(<C.ChatInput loading disabled placeholder="Say" />)],
  ['ChatMessage assistant', () => vue(V.MlChatMessage, { name: 'Lion', time: '10:01', content: 'Roar' }), () => react(<C.ChatMessage name="Lion" time="10:01" content="Roar" />)],
  ['ChatMessage user', () => vue(V.MlChatMessage, { role: 'user', name: 'Nala', status: 'error', content: 'Hi' }), () => react(<C.ChatMessage role="user" name="Nala" status="error" content="Hi" />)],
  ['ChatMessage typing', () => vue(V.MlChatMessage, { typing: true }), () => react(<C.ChatMessage typing />)],
  ['ChatMessage system', () => vue(V.MlChatMessage, { role: 'system', content: 'Joined' }), () => react(<C.ChatMessage role="system" content="Joined" />)],
  ['ChatMessage actions', () => vueSlots(V.MlChatMessage, { role: 'user' }, { default: 'Rich', actions: 'Copy' }), () => react(<C.ChatMessage role="user" actions="Copy">Rich</C.ChatMessage>)],
  ['LineChart', () => vue(V.MlLineChart, { series, labels: ['Mon', 'Tue', 'Wed', 'Thu'], dots: true }), () => react(<LineChart series={series} labels={['Mon', 'Tue', 'Wed', 'Thu']} dots />)],
  ['LineChart single', () => vue(V.MlLineChart, { series: [series[0]], smooth: false, area: false, label: 'Sales' }), () => react(<LineChart series={[series[0]]} smooth={false} area={false} label="Sales" />)],
]

describe('React ↔ Vue markup parity: effects, chat, LineChart', () => {
  for (const [name, fromVue, fromReact] of cases) {
    it(name, async () => {
      expect(fromReact()).toBe(await fromVue())
    })
  }

  it('Loading renders the v-loading mask markup', async () => {
    const { MlLoader } = V
    const vueMask = await vue({ render: () => h('div', { class: 'ml-loading' }, [h(MlLoader, { variant: 'reactor', size: 44, srLabel: '載入中' })]) })
    const html = react(<F.Loading loading>Body</F.Loading>)
    expect(html).toBe(`div "Body"\n${vueMask.split('\n').map((l) => `  ${l}`).join('\n')}`)
  })
})
