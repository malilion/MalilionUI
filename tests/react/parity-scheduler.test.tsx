// Markup parity for MlScheduler ↔ <Scheduler>.
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

const now = new Date(2026, 9, 7, 10, 30)
const at = (day: number, h: number, m = 0) => new Date(2026, 9, day, h, m)
const events: V.MlSchedulerEvent[] = [
  { id: 'a', title: '晨會', start: at(7, 9), end: at(7, 9, 20), tone: 'tech', location: '會議室' },
  { id: 'b', title: '審查', start: at(7, 9), end: at(7, 11), location: '獅子廳' },
  { id: 'n', title: '夜班', start: at(5, 22), end: at(6, 6) },
  { id: 'c', title: '出差', start: '2026-10-08', end: '2026-10-12', allDay: true, tone: 'bean' },
  { id: 'd', title: '鎖定', start: at(6, 14), end: at(6, 15), editable: false },
]

// Month view: a bar across a week break, a crowded day and a timed overnight bar.
const monthEvents: V.MlSchedulerEvent[] = [
  ...events,
  { id: 'e', title: '午餐', start: at(7, 12), end: at(7, 13), tone: 'success' },
  { id: 'f', title: '週會', start: at(7, 15), end: at(7, 16) },
  { id: 'g', title: '電腦展', start: '2026-10-29', end: '2026-11-03', allDay: true, tone: 'tech' },
]

const cases: [string, () => Promise<string>, () => string][] = [
  ['Scheduler: month', () => vue(V.MlScheduler, { events: monthEvents, now, date: now, view: 'month' }), () => react(<R.Scheduler events={monthEvents} now={now} date={now} view="month" />)],
  [
    'Scheduler: month, editable, Monday start, 2 rows',
    () => vue(V.MlScheduler, { events: monthEvents, now, date: now, view: 'month', editable: true, weekStartsOn: 1, monthMaxEvents: 2 }),
    () => react(<R.Scheduler events={monthEvents} now={now} date={now} view="month" editable weekStartsOn={1} monthMaxEvents={2} />),
  ],
  [
    'Scheduler: month, English',
    async () => signature(await renderToString(createSSRApp({ render: () => h(MlConfigProvider, { locale: en }, () => h(V.MlScheduler, { events: monthEvents, now, date: now, view: 'month' })) }))),
    () =>
      signature(
        renderToStaticMarkup(
          <ConfigProvider locale={en}>
            <R.Scheduler events={monthEvents} now={now} date={now} view="month" />
          </ConfigProvider>,
        ),
      ),
  ],
  ['Scheduler: week', () => vue(V.MlScheduler, { events, now, date: now }), () => react(<R.Scheduler events={events} now={now} date={now} />)],
  ['Scheduler: day, cropped hours', () => vue(V.MlScheduler, { events, now, date: now, view: 'day', startHour: 8, endHour: 18 }), () => react(<R.Scheduler events={events} now={now} date={now} view="day" startHour={8} endHour={18} />)],
  ['Scheduler: editable, Monday start', () => vue(V.MlScheduler, { events, now, date: now, editable: true, weekStartsOn: 1 }), () => react(<R.Scheduler events={events} now={now} date={now} editable weekStartsOn={1} />)],
  ['Scheduler: no toolbar, empty', () => vue(V.MlScheduler, { now, date: now, toolbar: false }), () => react(<R.Scheduler now={now} date={now} toolbar={false} />)],
  [
    'English locale',
    async () => signature(await renderToString(createSSRApp({ render: () => h(MlConfigProvider, { locale: en }, () => h(V.MlScheduler, { events, now, date: now, editable: true })) }))),
    () =>
      signature(
        renderToStaticMarkup(
          <ConfigProvider locale={en}>
            <R.Scheduler events={events} now={now} date={now} editable />
          </ConfigProvider>,
        ),
      ),
  ],
]

describe('React ↔ Vue markup parity: Scheduler', () => {
  for (const [name, fromVue, fromReact] of cases) {
    it(name, async () => {
      expect(fromReact()).toBe(await fromVue())
    })
  }

  it('attributes match too (labels, positions)', async () => {
    const pick = (html: string) =>
      [...html.matchAll(/<[a-z]+([^>]*)>/gi)]
        .map((tag) =>
          [...tag[1].matchAll(/ (role|aria-label|aria-pressed|aria-live|aria-hidden|data-id|type)(?:="([^"]*)")?(?=[\s/>]|$)/gi)]
            .map((m) => `${m[1].toLowerCase()}=${m[2] ?? ''}`)
            .sort()
            .join(' '),
        )
        .filter(Boolean)
        .join('\n')
    const top = (html: string) => [...html.matchAll(/top:\s?([\d.]+)px/g)].map((m) => m[1]).join(',')
    const vueHtml = await renderToString(createSSRApp({ render: () => h(V.MlScheduler, { events, now, date: now, editable: true }) }))
    const reactHtml = renderToStaticMarkup(<R.Scheduler events={events} now={now} date={now} editable />)
    expect(pick(reactHtml)).toBe(pick(vueHtml))
    expect(top(reactHtml)).toBe(top(vueHtml))
  })

  it('month attributes match too (grid roles, roving tabindex, lanes and spans)', async () => {
    const pick = (html: string) =>
      [...html.matchAll(/<[a-z]+([^>]*)>/gi)]
        .map((tag) =>
          [...tag[1].matchAll(/ (role|aria-[a-z]+|data-id|tabindex|type)(?:="([^"]*)")?(?=[\s/>]|$)/gi)]
            .map((m) => `${m[1].toLowerCase()}=${m[2] ?? ''}`)
            .filter((a) => !a.startsWith('aria-describedby'))
            .sort()
            .join(' '),
        )
        .filter(Boolean)
        .join('\n')
    const vars = (html: string) => [...html.matchAll(/--_sc-(lane|span|max):\s?(\d+)/g)].map((m) => `${m[1]}${m[2]}`).join(',')
    const vueHtml = await renderToString(createSSRApp({ render: () => h(V.MlScheduler, { events: monthEvents, now, date: now, view: 'month', editable: true }) }))
    const reactHtml = renderToStaticMarkup(<R.Scheduler events={monthEvents} now={now} date={now} view="month" editable />)
    expect(pick(reactHtml)).toBe(pick(vueHtml))
    expect(vars(reactHtml)).toBe(vars(vueHtml))
    expect(vars(vueHtml)).toContain('span')
  })
})
