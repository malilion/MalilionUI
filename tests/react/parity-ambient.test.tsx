// Markup parity for MlAurora / MlParticles / MlRadar / MlClock ↔ Aurora / Particles / Radar / Clock (see parity.test.tsx).
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { renderToStaticMarkup } from 'react-dom/server'
import * as V from '../../src'
import MlConfigProvider from '../../src/components/MlConfigProvider.vue'
import * as R from '../../src/react'
import { ConfigProvider } from '../../src/react/locale'
import { en } from '../../src/locale-data'
import { react, signature, vue } from './parity-utils'

const blips = [
  { angle: 45, distance: 0.5, label: 'Alpha' },
  { x: 0.4, y: -0.3, tone: 'danger' as const },
  { angle: 300, distance: 0.9, label: '補給站', tone: 'gold' as const },
]
const moment = Date.UTC(2026, 0, 15, 12, 34, 56)

const cases: [string, () => Promise<string>, () => string][] = [
  ['Aurora', () => vue(V.MlAurora), () => react(<R.Aurora />)],
  [
    'Aurora: palette, options, content',
    () => vue(V.MlAurora, { palette: 'night', intensity: 0.3, speed: 2, grain: false, scanlines: true, paused: true }, '<h1>Hi</h1>'),
    () =>
      react(
        <R.Aurora palette="night" intensity={0.3} speed={2} grain={false} scanlines paused>
          {'<h1>Hi</h1>'}
        </R.Aurora>,
      ),
  ],
  ['Aurora: custom colours', () => vue(V.MlAurora, { palette: ['#f00', '#0f0'] }), () => react(<R.Aurora palette={['#f00', '#0f0']} />)],
  ['Particles', () => vue(V.MlParticles), () => react(<R.Particles />)],
  [
    'Particles: options and content',
    () => vue(V.MlParticles, { tone: 'bean', shape: 'paw', burst: false, interaction: 'attract' }, 'Hello'),
    () => react(<R.Particles tone="bean" shape="paw" burst={false} interaction="attract">Hello</R.Particles>),
  ],
  ['Radar', () => vue(V.MlRadar), () => react(<R.Radar />)],
  [
    'Radar: blips, range, options',
    () => vue(V.MlRadar, { blips, range: 50, unit: 'km', rings: 5, tone: 'gold', speed: -40, trail: 120, size: 200, paused: true }),
    () => react(<R.Radar blips={blips} range={50} unit="km" rings={5} tone="gold" speed={-40} trail={120} size={200} paused />),
  ],
  [
    'Radar: ring labels and a label',
    () => vue(V.MlRadar, { blips, rangeLabels: ['近', '遠'], rings: 2, label: '掃描' }),
    () => react(<R.Radar blips={blips} rangeLabels={['近', '遠']} rings={2} label="掃描" />),
  ],
  ['Clock (live, before the first tick)', () => vue(V.MlClock), () => react(<R.Clock />)],
  [
    'Clock: frozen, every caption',
    () => vue(V.MlClock, { time: moment, timeZone: 'Asia/Taipei', label: '台北', digital: true, offset: true }),
    () => react(<R.Clock time={moment} timeZone="Asia/Taipei" label="台北" digital offset />),
  ],
  [
    'Clock: roman, sweep, no seconds, no crest',
    () => vue(V.MlClock, { time: moment, numerals: 'roman', motion: 'sweep', seconds: false, crest: false, tone: 'tech', size: 140, digital: true }),
    () => react(<R.Clock time={moment} numerals="roman" motion="sweep" seconds={false} crest={false} tone="tech" size={140} digital />),
  ],
  [
    'Clock: no numerals, live with a label',
    () => vue(V.MlClock, { numerals: 'none', label: 'Tokyo', timeZone: 'Asia/Tokyo', offset: true }),
    () => react(<R.Clock numerals="none" label="Tokyo" timeZone="Asia/Tokyo" offset />),
  ],
  [
    'English locale',
    async () =>
      signature(
        await renderToString(
          createSSRApp({
            render: () =>
              h(MlConfigProvider, { locale: en }, () => [h(V.MlRadar, { blips }), h(V.MlClock, { time: moment, timeZone: 'Europe/London', label: 'London' })]),
          }),
        ),
      ),
    () =>
      signature(
        renderToStaticMarkup(
          <ConfigProvider locale={en}>
            <R.Radar blips={blips} />
            <R.Clock time={moment} timeZone="Europe/London" label="London" />
          </ConfigProvider>,
        ),
      ),
  ],
]

describe('React ↔ Vue markup parity: Aurora, Particles, Radar, Clock', () => {
  for (const [name, fromVue, fromReact] of cases) {
    it(name, async () => {
      expect(fromReact()).toBe(await fromVue())
    })
  }

  it('attributes that matter match too (labels, paths, positions, angles)', async () => {
    const pick = (html: string) =>
      [...html.matchAll(/ (d|aria-label|aria-pressed|viewBox|x|y|r|datetime|style)="([^"]*)"/gi)]
        .map((m) => `${m[1].toLowerCase()}=${m[2].replace(/;\s*$/, '').replace(/:\s*/g, ':').replace(/;\s*/g, ';')}`)
        .join('\n')
    const vueHtml = await renderToString(
      createSSRApp({ render: () => [h(V.MlRadar, { blips, range: 10 }), h(V.MlClock, { time: moment, timeZone: 'Asia/Taipei', digital: true })] }),
    )
    const reactHtml = renderToStaticMarkup(
      <>
        <R.Radar blips={blips} range={10} />
        <R.Clock time={moment} timeZone="Asia/Taipei" digital />
      </>,
    )
    expect(pick(reactHtml.replaceAll('dateTime', 'datetime'))).toBe(pick(vueHtml))
  })
})
