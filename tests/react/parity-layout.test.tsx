// Markup parity for the layout / media / drag components (see parity.test.tsx).
import { describe, expect, it } from 'vitest'
import { createSSRApp, h, type Component } from 'vue'
import { renderToString } from 'vue/server-renderer'
import * as V from '../../src'
import * as R from '../../src/react/layout'
import { react, signature, vue } from './parity-utils'

async function vueSlots(component: Component, props: Record<string, unknown>, slots: Record<string, (ctx: any) => unknown>) {
  const app = createSSRApp({ render: () => h(component, props, slots) })
  return signature(await renderToString(app))
}

const slides = ['Mane', 'Claw', 'Roar']
const tasks = [
  { id: 1, title: 'Forge' },
  { id: 2, title: 'Polish' },
  { id: 3, title: 'Ship' },
]
const columns = [
  { key: 'todo', title: 'To do', items: tasks.slice(0, 2), tone: 'gold' as const },
  { key: 'doing', title: 'Doing', items: [tasks[2]], limit: 1 },
  { key: 'done', title: 'Done', items: [] as typeof tasks, limit: 3 },
]

const cases: [string, () => Promise<string>, () => string][] = [
  ['Layout main only', () => vue(V.MlLayout, {}, 'Body'), () => react(<R.Layout>Body</R.Layout>)],
  [
    'Layout full shell',
    () =>
      vueSlots(V.MlLayout, { asideRight: true, stickyHeader: false, fullHeight: false, collapsed: true }, {
        header: ({ collapsed }) => h('b', collapsed ? 'rail' : 'wide'),
        aside: () => h('nav', 'Menu'),
        default: () => 'Main',
        footer: () => 'Foot',
      }),
    () =>
      react(
        <R.Layout asideRight stickyHeader={false} fullHeight={false} collapsed header={({ collapsed }) => <b>{collapsed ? 'rail' : 'wide'}</b>} aside={<nav>Menu</nav>} footer="Foot">
          Main
        </R.Layout>,
      ),
  ],
  ['Grid', () => vue(V.MlGrid, {}, 'x'), () => react(<R.Grid>x</R.Grid>)],
  ['Grid auto', () => vue(V.MlGrid, { minItemWidth: '200px', gap: 8, stack: false, tag: 'ul' }), () => react(<R.Grid minItemWidth="200px" gap={8} stack={false} as="ul" />)],
  [
    'GridItem',
    () => vueSlots(V.MlGrid, { cols: 4 }, { default: () => [h(V.MlGridItem, { span: 2 }, () => 'A'), h(V.MlGridItem, { offset: 3, rowSpan: 2, tag: 'section' }, () => 'B')] }),
    () =>
      react(
        <R.Grid cols={4}>
          <R.GridItem span={2}>A</R.GridItem>
          <R.GridItem offset={3} rowSpan={2} as="section">
            B
          </R.GridItem>
        </R.Grid>,
      ),
  ],
  ['Space', () => vue(V.MlSpace, {}, 'x'), () => react(<R.Space>x</R.Space>)],
  ['Space vertical', () => vue(V.MlSpace, { direction: 'vertical', size: 20, align: 'center', justify: 'between', fill: true }, 'x'), () => react(<R.Space direction="vertical" size={20} align="center" justify="between" fill>x</R.Space>)],
  [
    'Space divider',
    () => vueSlots(V.MlSpace, { divider: 'paw', size: 'lg' }, { default: () => [h('a', 'One'), ...['Two', 'Three'].map((t) => h('b', t))] }),
    () =>
      react(
        <R.Space divider="paw" size="lg">
          <a>One</a>
          <>
            {['Two', 'Three'].map((t) => (
              <b key={t}>{t}</b>
            ))}
          </>
        </R.Space>,
      ),
  ],
  ['Splitter', () => vueSlots(V.MlSplitter, {}, { start: () => 'L', end: () => 'R' }), () => react(<R.Splitter start="L" end="R" />)],
  ['Splitter vertical disabled', () => vue(V.MlSplitter, { direction: 'vertical', disabled: true, modelValue: 30, label: 'Resize' }), () => react(<R.Splitter direction="vertical" disabled value={30} label="Resize" />)],
  ['List', () => vue(V.MlList, { title: 'Pride' }), () => react(<R.List title="Pride" />)],
  ['List inset', () => vueSlots(V.MlList, { variant: 'inset' }, { default: () => h(V.MlListItem, { title: 'Leo' }) }), () => react(<R.List variant="inset"><R.ListItem title="Leo" /></R.List>)],
  [
    'ListItem full',
    () => vueSlots(V.MlListItem, { title: 'Leo', subtitle: 'King', meta: '09:00', badge: 3, clickable: true, active: true, chevron: true }, { leading: () => h('i', 'L'), trailing: () => h('em', 'T') }),
    () => react(<R.ListItem title="Leo" subtitle="King" meta="09:00" badge={3} clickable active chevron leading={<i>L</i>} trailing={<em>T</em>} />),
  ],
  ['ListItem link', () => vue(V.MlListItem, { title: 'Docs', href: '/docs', badge: 0 }), () => react(<R.ListItem title="Docs" href="/docs" badge={0} />)],
  ['InfiniteScroll', () => vue(V.MlInfiniteScroll, {}, 'rows'), () => react(<R.InfiniteScroll>rows</R.InfiniteScroll>)],
  ['InfiniteScroll loading', () => vue(V.MlInfiniteScroll, { loading: true, loadingText: 'Wait' }), () => react(<R.InfiniteScroll loading loadingText="Wait" />)],
  ['InfiniteScroll finished', () => vue(V.MlInfiniteScroll, { finished: true }), () => react(<R.InfiniteScroll finished />)],
  ['InfiniteScroll finished slot', () => vueSlots(V.MlInfiniteScroll, { finished: true }, { finished: () => h('i', 'End') }), () => react(<R.InfiniteScroll finished finishedContent={<i>End</i>} />)],
  ['InfiniteScroll manual', () => vue(V.MlInfiniteScroll, { manual: true }), () => react(<R.InfiniteScroll manual />)],
  [
    'Carousel',
    () => vueSlots(V.MlCarousel, { items: slides, label: 'Pride' }, { default: ({ item, active }) => h('b', `${item}${active ? '*' : ''}`) }),
    () => react(<R.Carousel items={slides} label="Pride">{(item, _i, active) => <b>{`${item}${active ? '*' : ''}`}</b>}</R.Carousel>),
  ],
  [
    'Carousel autoplay no loop',
    () => vueSlots(V.MlCarousel, { items: slides, autoplay: 3000, loop: false, index: 2, arrows: false }, { default: ({ item }) => item }),
    () => react(<R.Carousel items={slides} autoplay={3000} loop={false} index={2} arrows={false}>{(item) => item}</R.Carousel>),
  ],
  ['Carousel single', () => vue(V.MlCarousel, { items: ['One'], indicators: false }), () => react(<R.Carousel items={['One']} indicators={false} />)],
  ['Image', () => vue(V.MlImage, { src: '/a.png', alt: 'A' }), () => react(<R.Image src="/a.png" alt="A" />)],
  [
    'Image preview round',
    () => vueSlots(V.MlImage, { src: '/a.png', alt: 'A', preview: true, round: true, width: 120, height: '8rem', fit: 'contain' }, { placeholder: () => h('i', '…') }),
    () => react(<R.Image src="/a.png" alt="A" preview round width={120} height="8rem" fit="contain" placeholder={<i>…</i>} />),
  ],
  ['ImagePreview inline', () => vue(V.MlImagePreview, { images: ['/a.png', '/b.png', '/c.png'], open: true, inline: true, index: 1 }), () => react(<R.ImagePreview images={['/a.png', '/b.png', '/c.png']} open inline index={1} />)],
  ['ImagePreview single', () => vue(V.MlImagePreview, { images: ['/a.png'], alts: ['Alpha'], open: true, inline: true }), () => react(<R.ImagePreview images={['/a.png']} alts={['Alpha']} open inline />)],
  ['ImagePreview closed', () => vue(V.MlImagePreview, { images: ['/a.png'], inline: true }), () => react(<R.ImagePreview images={['/a.png']} inline />)],
  ['Watermark', () => vue(V.MlWatermark, { content: 'Secret' }, 'Doc'), () => react(<R.Watermark content="Secret">Doc</R.Watermark>)],
  [
    'Sortable',
    () => vueSlots(V.MlSortable, { modelValue: tasks }, { default: ({ item }) => h('span', item.title) }),
    () => react(<R.Sortable value={tasks}>{(item) => <span>{item.title}</span>}</R.Sortable>),
  ],
  [
    'Sortable handle horizontal',
    () => vueSlots(V.MlSortable, { modelValue: tasks, handle: true, direction: 'horizontal', disabled: true, tag: 'ol' }, { default: ({ item, index }) => `${index}:${item.title}` }),
    () => react(<R.Sortable value={tasks} handle direction="horizontal" disabled as="ol">{(item, index) => `${index}:${item.title}`}</R.Sortable>),
  ],
  ['Sortable empty', () => vueSlots(V.MlSortable, { modelValue: [] }, { empty: () => 'Nothing' }), () => react(<R.Sortable value={[]} empty="Nothing" />)],
  [
    'Kanban',
    () => vueSlots(V.MlKanban, { modelValue: columns }, { card: ({ item, column }) => h('b', `${column.key}:${item.title}`) }),
    () => react(<R.Kanban value={columns} renderCard={(item, _i, column) => <b>{`${column.key}:${item.title}`}</b>} />),
  ],
  [
    'Kanban handle with actions and footer',
    () =>
      vueSlots(V.MlKanban, { modelValue: columns, handle: true }, {
        card: ({ item }) => item.title,
        'column-actions': ({ column }) => h('button', `+${column.key}`),
        'column-footer': ({ column }) => h('small', column.title),
      }),
    () => react(<R.Kanban value={columns} handle renderCard={(item) => item.title} renderColumnActions={(c) => <button>{`+${c.key}`}</button>} renderColumnFooter={(c) => <small>{c.title}</small>} />),
  ],
]

describe('React ↔ Vue markup parity: layout', () => {
  for (const [name, fromVue, fromReact] of cases) {
    it(name, async () => {
      expect(fromReact()).toBe(await fromVue())
    })
  }
})
