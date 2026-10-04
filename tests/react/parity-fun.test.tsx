// Markup parity for MlCuteIcon / MlPuzzle / MlGlobe ↔ CuteIcon / Puzzle / Globe (see parity.test.tsx).
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

const markers = [
  { lat: 25.03, lng: 121.56, label: '臺北' },
  { lat: 35.68, lng: 139.69, label: '東京', tone: 'tech' as const, pulse: false },
  { lat: 40.71, lng: -74.01 },
]
const arcs = [
  { from: markers[0], to: markers[1] },
  { from: markers[0], to: markers[2], tone: 'bean' as const, lift: 0.4 },
]

const cases: [string, () => Promise<string>, () => string][] = [
  ['CuteIcon', () => vue(V.MlCuteIcon, { name: 'lion' }), () => react(<R.CuteIcon name="lion" />)],
  [
    'CuteIcon: every option',
    () => vue(V.MlCuteIcon, { name: 'bubbleTea', size: 40, variant: 'line', animate: 'wiggle', hover: true, title: '珍奶' }),
    () => react(<R.CuteIcon name="bubbleTea" size={40} variant="line" animate="wiggle" hover title="珍奶" />),
  ],
  ['Puzzle: numbered', () => vue(V.MlPuzzle, { seed: 3 }), () => react(<R.Puzzle seed={3} />)],
  [
    'Puzzle: picture, 2×4, options',
    () => vue(V.MlPuzzle, { seed: 8, src: '/lion.png', alt: '獅子', rows: 2, cols: 4, ratio: 2, tone: 'tech', ghost: false, numbers: true, lock: false }),
    () => react(<R.Puzzle seed={8} src="/lion.png" alt="獅子" rows={2} cols={4} ratio={2} tone="tech" ghost={false} numbers lock={false} />),
  ],
  [
    'Puzzle: disabled, no toolbar, label',
    () => vue(V.MlPuzzle, { seed: 1, src: '/a.png', disabled: true, toolbar: false, label: '關卡一' }),
    () => react(<R.Puzzle seed={1} src="/a.png" disabled toolbar={false} label="關卡一" />),
  ],
  ['Globe', () => vue(V.MlGlobe), () => react(<R.Globe />)],
  [
    'Globe: markers, arcs, labels',
    () => vue(V.MlGlobe, { markers, arcs, labels: true, tone: 'tech', graticule: false, atmosphere: false }),
    () => react(<R.Globe markers={markers} arcs={arcs} labels tone="tech" graticule={false} atmosphere={false} />),
  ],
  [
    'Globe: centre, not draggable',
    () => vue(V.MlGlobe, { markers, center: { lat: 40, lng: -80 }, draggable: false, size: 240, label: '據點' }),
    () => react(<R.Globe markers={markers} center={{ lat: 40, lng: -80 }} draggable={false} size={240} label="據點" />),
  ],
  [
    'English locale',
    async () =>
      signature(
        await renderToString(
          createSSRApp({ render: () => h(MlConfigProvider, { locale: en }, () => [h(V.MlPuzzle, { seed: 2, alt: 'Lion' }), h(V.MlGlobe, { markers })]) }),
        ),
      ),
    () =>
      signature(
        renderToStaticMarkup(
          <ConfigProvider locale={en}>
            <R.Puzzle seed={2} alt="Lion" />
            <R.Globe markers={markers} />
          </ConfigProvider>,
        ),
      ),
  ],
]

describe('React ↔ Vue markup parity: CuteIcon, Puzzle, Globe', () => {
  for (const [name, fromVue, fromReact] of cases) {
    it(name, async () => {
      expect(fromReact()).toBe(await fromVue())
    })
  }

  it('attributes that matter match too (paths, labels, positions)', async () => {
    const pick = (html: string) =>
      [...html.matchAll(/ (d|aria-label|transform|viewBox|tabindex|data-cell)="([^"]*)"/g)].map((m) => `${m[1].toLowerCase()}=${m[2]}`).join('\n')
    const vueHtml = await renderToString(createSSRApp({ render: () => [h(V.MlPuzzle, { seed: 6 }), h(V.MlGlobe, { markers, arcs })] }))
    const reactHtml = renderToStaticMarkup(
      <>
        <R.Puzzle seed={6} />
        <R.Globe markers={markers} arcs={arcs} />
      </>,
    )
    expect(pick(reactHtml.replaceAll('tabIndex', 'tabindex'))).toBe(pick(vueHtml))
  })
})
