// Markup parity for MlSliderCaptcha / MlScratchCard / MlGridLottery / MlGacha ↔ their React twins.
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { renderToStaticMarkup } from 'react-dom/server'
import * as V from '../../src'
import MlConfigProvider from '../../src/components/MlConfigProvider.vue'
import * as R from '../../src/react'
import { ConfigProvider } from '../../src/react/locale'
import { en } from '../../src/locale-data'
import type { MlLotteryPrize } from '../../src/components/lottery'
import { react, signature, vue } from './parity-utils'

const prizes: MlLotteryPrize[] = [
  { label: '獅王', icon: 'crown', tone: 'gold' },
  { label: '珍奶', icon: 'bubbleTea' },
  { label: '圖片', image: '/a.png', tone: 'success' },
  { label: '停用', disabled: true },
  { label: '咖啡', icon: 'coffee' },
  { label: '禮物', icon: 'gift' },
]

const cases: [string, () => Promise<string>, () => string][] = [
  ['SliderCaptcha', () => vue(V.MlSliderCaptcha, { seed: 2 }), () => react(<R.SliderCaptcha seed={2} />)],
  [
    'SliderCaptcha: picture, target, options',
    () => vue(V.MlSliderCaptcha, { src: '/bg.png', target: { x: 150, y: 50 }, width: 300, height: 180, tone: 'tech', hint: '拖我', disabled: true }),
    () => react(<R.SliderCaptcha src="/bg.png" target={{ x: 150, y: 50 }} width={300} height={180} tone="tech" hint="拖我" disabled />),
  ],
  ['ScratchCard', () => vue(V.MlScratchCard, {}, '大獎'), () => react(<R.ScratchCard>大獎</R.ScratchCard>)],
  [
    'ScratchCard: revealed, options',
    () => vue(V.MlScratchCard, { revealed: true, tone: 'bean', coverText: '刮刮看', width: 200, height: 100 }, '銘謝惠顧'),
    () => react(<R.ScratchCard revealed tone="bean" coverText="刮刮看" width={200} height={100}>銘謝惠顧</R.ScratchCard>),
  ],
  ['GridLottery', () => vue(V.MlGridLottery, { prizes }), () => react(<R.GridLottery prizes={prizes} />)],
  [
    'GridLottery: chances, text, size',
    () => vue(V.MlGridLottery, { prizes, chances: 2, buttonText: 'GO', size: 240, label: '小格', disabled: true }),
    () => react(<R.GridLottery prizes={prizes} chances={2} buttonText="GO" size={240} label="小格" disabled />),
  ],
  ['Gacha', () => vue(V.MlGacha, { prizes }), () => react(<R.Gacha prizes={prizes} />)],
  [
    'Gacha: chances, text, no prizes',
    () => vue(V.MlGacha, { prizes: [], chances: 0, buttonText: '投幣', size: 200 }),
    () => react(<R.Gacha prizes={[]} chances={0} buttonText="投幣" size={200} />),
  ],
  [
    'English locale',
    async () =>
      signature(
        await renderToString(
          createSSRApp({
            render: () =>
              h(MlConfigProvider, { locale: en }, () => [h(V.MlSliderCaptcha, { seed: 1 }), h(V.MlScratchCard), h(V.MlGridLottery, { prizes }), h(V.MlGacha, { prizes })]),
          }),
        ),
      ),
    () =>
      signature(
        renderToStaticMarkup(
          <ConfigProvider locale={en}>
            <R.SliderCaptcha seed={1} />
            <R.ScratchCard />
            <R.GridLottery prizes={prizes} />
            <R.Gacha prizes={prizes} />
          </ConfigProvider>,
        ),
      ),
  ],
]

describe('React ↔ Vue markup parity: SliderCaptcha, ScratchCard, GridLottery, Gacha', () => {
  for (const [name, fromVue, fromReact] of cases) {
    it(name, async () => {
      expect(fromReact()).toBe(await fromVue())
    })
  }

  it('geometry matches too (paths, transforms, labels)', async () => {
    const pick = (html: string) =>
      [...html.matchAll(/ (d|aria-label|transform|viewBox|aria-valuenow|aria-valuemax|data-index)="([^"]*)"/g)].map((m) => `${m[1]}=${m[2]}`).join('\n')
    const vueHtml = await renderToString(createSSRApp({ render: () => [h(V.MlSliderCaptcha, { seed: 5 }), h(V.MlGridLottery, { prizes }), h(V.MlGacha, { prizes })] }))
    const reactHtml = renderToStaticMarkup(
      <>
        <R.SliderCaptcha seed={5} />
        <R.GridLottery prizes={prizes} />
        <R.Gacha prizes={prizes} />
      </>,
    )
    expect(pick(reactHtml)).toBe(pick(vueHtml))
  })
})
