// Markup parity for MlStickerPicker / MlComments / MlSwipeStack / MlInbox ↔ their React twins.
import { describe, expect, it } from 'vitest'
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { renderToStaticMarkup } from 'react-dom/server'
import * as V from '../../src'
import MlConfigProvider from '../../src/components/MlConfigProvider.vue'
import * as R from '../../src/react'
import { ConfigProvider } from '../../src/react/locale'
import { en } from '../../src/locale-data'
import type { MlComment } from '../../src/components/comments'
import type { MlInboxItem } from '../../src/components/inbox'
import { react, signature, vue } from './parity-utils'

const NOW = new Date('2026-10-04T12:00:00')
const at = (min: number) => NOW.getTime() - min * 60_000

const comments: MlComment[] = [
  {
    id: 1,
    author: { name: '阿哲' },
    content: '第一則\n第二行',
    time: at(60),
    likes: 2,
    liked: true,
    replies: [
      { id: 11, author: { name: '小美', avatar: '/m.png' }, content: '回覆一', time: at(50), replies: [{ id: 111, author: { name: '阿哲' }, content: '再回覆', time: at(40) }] },
      { id: 12, author: { name: 'Leo' }, content: '回覆二', time: at(45) },
      { id: 13, author: { name: 'Mia' }, content: '回覆三', time: at(44) },
    ],
  },
  { id: 2, author: { name: 'Yuki' }, content: '<b>純文字</b>', time: at(5), likes: 9 },
]

const notes: MlInboxItem[] = [
  { id: 'a', title: '提到你', body: '@你 看一下', type: 'mention', time: new Date('2026-10-04T11:58:00') },
  { id: 'b', title: '部署完成', type: 'success', time: new Date('2026-10-04T08:00:00'), read: true, href: '/deploys/1' },
  { id: 'c', title: '昨天的', time: new Date('2026-10-03T21:00:00'), avatar: '/a.png' },
  { id: 'd', title: '很久以前', type: 'danger', time: new Date('2026-09-20T10:00:00'), read: true, href: 'javascript:alert(1)' },
]

const cards = ['阿', '貓', '狗', '兔']
async function vueStack(props: Record<string, unknown>) {
  const app = createSSRApp({
    render: () => h(V.MlSwipeStack, { items: cards, ...props }, { default: ({ item, index }: { item: string; index: number }) => h('b', { class: 'card' }, `${index}:${item}`) }),
  })
  return signature(await renderToString(app))
}
const reactStack = (props: Partial<R.SwipeStackProps<string>>) => react(<R.SwipeStack items={cards} renderItem={(item, index) => <b className="card">{`${index}:${item}`}</b>} {...props} />)

const cases: [string, () => Promise<string>, () => string][] = [
  ['StickerPicker', () => vue(V.MlStickerPicker), () => react(<R.StickerPicker />)],
  [
    'StickerPicker: options',
    () => vue(V.MlStickerPicker, { variant: 'line', size: 24, columns: 5, recent: false, label: '貼圖盒' }),
    () => react(<R.StickerPicker variant="line" size={24} columns={5} recent={false} label="貼圖盒" />),
  ],
  ['StickerPicker: trigger (closed)', () => vue(V.MlStickerPicker, { trigger: true, triggerIcon: 'cat', disabled: true }), () => react(<R.StickerPicker trigger triggerIcon="cat" disabled />)],
  ['Comments', () => vue(V.MlComments, { comments, now: NOW }), () => react(<R.Comments comments={comments} now={NOW} />)],
  [
    'Comments: flat, collapsed, popular, user',
    () => vue(V.MlComments, { comments, now: NOW, maxDepth: 1, collapseAfter: 2, sort: 'popular', currentUser: { name: '你', avatar: '/me.png' }, title: '討論' }),
    () => react(<R.Comments comments={comments} now={NOW} maxDepth={1} collapseAfter={2} sort="popular" currentUser={{ name: '你', avatar: '/me.png' }} title="討論" />),
  ],
  ['Comments: readonly', () => vue(V.MlComments, { comments, now: NOW, readonly: true }), () => react(<R.Comments comments={comments} now={NOW} readonly />)],
  ['Comments: empty', () => vue(V.MlComments, { comments: [], emptyText: '空空的' }), () => react(<R.Comments comments={[]} emptyText="空空的" />)],
  ['SwipeStack', () => vueStack({}), () => reactStack({})],
  [
    'SwipeStack: up, depth, stamps, no buttons, index',
    () => vueStack({ up: true, depth: 2, likeText: '要', nopeText: '不要', superText: '超要', index: 1, width: 280, height: '20rem' }),
    () => reactStack({ up: true, depth: 2, likeText: '要', nopeText: '不要', superText: '超要', index: 1, width: 280, height: '20rem' }),
  ],
  ['SwipeStack: done', () => vueStack({ index: 4, buttons: false }), () => reactStack({ index: 4, buttons: false })],
  ['Inbox: bell (closed)', () => vue(V.MlInbox, { items: notes, now: NOW }), () => react(<R.Inbox items={notes} now={NOW} />)],
  ['Inbox: open', () => vue(V.MlInbox, { items: notes, now: NOW, open: true, placement: 'bottom-start', max: 1 }), () => react(<R.Inbox items={notes} now={NOW} open placement="bottom-start" max={1} />)],
  ['Inbox: inline, mention tab', () => vue(V.MlInbox, { items: notes, now: NOW, inline: true, tab: 'mention', title: '通知中心' }), () => react(<R.Inbox items={notes} now={NOW} inline tab="mention" title="通知中心" />)],
  ['Inbox: inline, empty', () => vue(V.MlInbox, { items: [], inline: true }), () => react(<R.Inbox items={[]} inline />)],
  [
    'English locale',
    async () =>
      signature(
        await renderToString(
          createSSRApp({
            render: () =>
              h(MlConfigProvider, { locale: en }, () => [
                h(V.MlStickerPicker),
                h(V.MlComments, { comments, now: NOW, collapseAfter: 1 }),
                h(V.MlSwipeStack, { items: cards, up: true }, { default: ({ item }: { item: string }) => item }),
                h(V.MlInbox, { items: notes, now: NOW, inline: true }),
              ]),
          }),
        ),
      ),
    () =>
      signature(
        renderToStaticMarkup(
          <ConfigProvider locale={en}>
            <R.StickerPicker />
            <R.Comments comments={comments} now={NOW} collapseAfter={1} />
            <R.SwipeStack items={cards} up renderItem={(item) => item} />
            <R.Inbox items={notes} now={NOW} inline />
          </ConfigProvider>,
        ),
      ),
  ],
]

describe('React ↔ Vue markup parity: StickerPicker, Comments, SwipeStack, Inbox', () => {
  for (const [name, fromVue, fromReact] of cases) {
    it(name, async () => {
      expect(fromReact()).toBe(await fromVue())
    })
  }

  it('attributes match too (labels, states, links, times)', async () => {
    // React spells it dateTime and adds <link rel=preload> for images; neither is part of the component.
    const pick = (html: string) =>
      [...html.replace(/<link [^>]*>/g, '').matchAll(/ (aria-label|aria-pressed|aria-selected|aria-expanded|aria-hidden|href|datetime|tabindex|data-name|data-tab|data-id|role)="([^"]*)"/gi)]
        .map((m) => `${m[1].toLowerCase()}=${m[2]}`)
        .join('\n')
    const vueHtml = await renderToString(
      createSSRApp({
        render: () => [
          h(V.MlStickerPicker),
          h(V.MlComments, { comments, now: NOW }),
          h(V.MlSwipeStack, { items: cards }, { default: ({ item }: { item: string }) => item }),
          h(V.MlInbox, { items: notes, now: NOW, inline: true }),
        ],
      }),
    )
    const reactHtml = renderToStaticMarkup(
      <>
        <R.StickerPicker />
        <R.Comments comments={comments} now={NOW} />
        <R.SwipeStack items={cards} renderItem={(item) => item} />
        <R.Inbox items={notes} now={NOW} inline />
      </>,
    )
    expect(pick(reactHtml)).toBe(pick(vueHtml))
  })
})
