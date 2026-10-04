// Markup parity for MlVideoPlayer / MlAudioPlayer ↔ their React twins.
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

const tracks = [
  { src: '/zh.vtt', srclang: 'zh-TW', label: '中文', default: true },
  { src: '/en.vtt', srclang: 'en', label: 'English' },
]
const sources = [{ src: '/a.webm', type: 'video/webm' }, { src: '/a.mp4' }]

const cases: [string, () => Promise<string>, () => string][] = [
  ['VideoPlayer', () => vue(V.MlVideoPlayer, { src: '/a.mp4' }), () => react(<R.VideoPlayer src="/a.mp4" />)],
  [
    'VideoPlayer: sources, tracks, title',
    () => vue(V.MlVideoPlayer, { src: sources, tracks, title: '示範', poster: '/p.jpg', aspectRatio: '4 / 3' }),
    () => react(<R.VideoPlayer src={sources} tracks={tracks} title="示範" poster="/p.jpg" aspectRatio="4 / 3" />),
  ],
  ['AudioPlayer', () => vue(V.MlAudioPlayer, { src: '/a.m4a' }), () => react(<R.AudioPlayer src="/a.m4a" />)],
  [
    'AudioPlayer: meta and cover',
    () => vue(V.MlAudioPlayer, { src: '/a.m4a', title: '獅吼', artist: '碼力獅', cover: '/c.jpg', skip: 15 }),
    () => react(<R.AudioPlayer src="/a.m4a" title="獅吼" artist="碼力獅" cover="/c.jpg" skip={15} />),
  ],
  [
    'English locale',
    async () =>
      signature(await renderToString(createSSRApp({ render: () => h(MlConfigProvider, { locale: en }, () => [h(V.MlVideoPlayer, { src: '/a.mp4', tracks }), h(V.MlAudioPlayer, { src: '/a.m4a' })]) }))),
    () =>
      signature(
        renderToStaticMarkup(
          <ConfigProvider locale={en}>
            <R.VideoPlayer src="/a.mp4" tracks={tracks} />
            <R.AudioPlayer src="/a.m4a" />
          </ConfigProvider>,
        ),
      ),
  ],
]

describe('React ↔ Vue markup parity: VideoPlayer, AudioPlayer', () => {
  for (const [name, fromVue, fromReact] of cases) {
    it(name, async () => {
      expect(fromReact()).toBe(await fromVue())
    })
  }

  it('attributes match too', async () => {
    const pick = (html: string) =>
      [...html.matchAll(/<[a-z]+([^>]*)>/gi)]
        .map((tag) =>
          [...tag[1].matchAll(/ (role|aria-label|aria-haspopup|aria-expanded|aria-valuetext|src|type|srclang|label|kind|poster|preload|min|max|step|d)(?:="([^"]*)")?(?=[\s/>]|$)/gi)]
            .map((m) => `${m[1].toLowerCase()}=${m[2] ?? ''}`)
            .sort()
            .join(' '),
        )
        .filter(Boolean)
        .join('\n')
    const vueHtml = await renderToString(createSSRApp({ render: () => [h(V.MlVideoPlayer, { src: sources, tracks, poster: '/p.jpg' }), h(V.MlAudioPlayer, { src: '/a.m4a', title: 'T' })] }))
    const reactHtml = renderToStaticMarkup(
      <>
        <R.VideoPlayer src={sources} tracks={tracks} poster="/p.jpg" />
        <R.AudioPlayer src="/a.m4a" title="T" />
      </>,
    )
    expect(pick(reactHtml)).toBe(pick(vueHtml))
  })
})
