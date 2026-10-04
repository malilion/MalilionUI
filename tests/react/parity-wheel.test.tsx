// Markup parity for MlLuckyWheel ↔ <LuckyWheel> (see parity.test.tsx).
import { describe, expect, it } from 'vitest'
import * as V from '../../src'
import { LuckyWheel } from '../../src/react/wheel'
import type { MlWheelPrize } from '../../src/components/wheel'
import { react, vue } from './parity-utils'

const prizes: MlWheelPrize[] = [
  { label: '大獎', icon: 'heart', weight: 1 },
  { label: '再接再厲' },
  { label: '9 折', tone: 'tech' },
  { label: '圖片', image: '/lion.webp', color: '#12151c' },
  { label: '售完', disabled: true },
]

const cases: [string, () => Promise<string>, () => string][] = [
  ['LuckyWheel', () => vue(V.MlLuckyWheel, { prizes }), () => react(<LuckyWheel prizes={prizes} />)],
  ['LuckyWheel custom', () => vue(V.MlLuckyWheel, { prizes: prizes.slice(0, 3), size: 200, spinText: '抽', label: '轉盤', confetti: false }), () => react(<LuckyWheel prizes={prizes.slice(0, 3)} size={200} spinText="抽" label="轉盤" confetti={false} />)],
  ['LuckyWheel disabled', () => vue(V.MlLuckyWheel, { prizes: prizes.slice(0, 1), disabled: true }), () => react(<LuckyWheel prizes={prizes.slice(0, 1)} disabled />)],
  ['LuckyWheel empty', () => vue(V.MlLuckyWheel, { prizes: [] }), () => react(<LuckyWheel prizes={[]} />)],
  ['LuckyWheel many', () => vue(V.MlLuckyWheel, { prizes: Array.from({ length: 14 }, (_, i) => ({ label: `#${i}` })) }), () => react(<LuckyWheel prizes={Array.from({ length: 14 }, (_, i) => ({ label: `#${i}` }))} />)],
]

describe('React ↔ Vue markup parity: LuckyWheel', () => {
  for (const [name, fromVue, fromReact] of cases) {
    it(name, async () => {
      expect(fromReact()).toBe(await fromVue())
    })
  }

  it('matches attributes that carry meaning (aria, geometry)', async () => {
    const { renderToString } = await import('vue/server-renderer')
    const { createSSRApp, h } = await import('vue')
    const { renderToStaticMarkup } = await import('react-dom/server')
    const strip = (html: string) => {
      const root = document.createElement('div')
      root.innerHTML = html.replace(/<!--[\s\S]*?-->/g, '')
      // Ids differ per framework; swap the instance prefix for a placeholder.
      const uid = root.querySelector('[aria-live]')!.id.replace(/-live$/, '')
      const out: string[] = []
      for (const el of root.querySelectorAll('*')) {
        for (const name of ['aria-label', 'aria-live', 'aria-disabled', 'disabled', 'd', 'transform', 'font-size', 'href', 'viewBox', 'fill']) {
          const v = el.getAttribute(name)
          if (v !== null) out.push(`${el.tagName.toLowerCase()} ${name}=${v.split(uid).join('ID')}`)
        }
      }
      return out.join('\n')
    }
    const v = strip(await renderToString(createSSRApp({ render: () => h(V.MlLuckyWheel, { prizes }) })))
    const r = strip(renderToStaticMarkup(<LuckyWheel prizes={prizes} />))
    expect(r).toBe(v)
  })
})
