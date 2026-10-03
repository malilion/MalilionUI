// Markup parity for the navigation components (see parity.test.tsx).
import { describe, expect, it } from 'vitest'
import { createApp, h, nextTick, type Component } from 'vue'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import * as V from '../../src'
import * as R from '../../src/react/nav'
import { react, signature, vue } from './parity-utils'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const menu = [
  { key: 'home', label: 'Home', icon: 'home' as const, badge: 3 },
  { key: 'docs', label: 'Docs', href: '/docs' },
  {
    key: 'sec',
    label: 'Section',
    group: true,
    children: [
      { key: 'set', label: 'Settings', icon: 'settings' as const, children: [{ key: 'profile', label: 'Profile' }, { key: 'keys', label: 'Keys', disabled: true }] },
      { key: 'off', label: 'Off', disabled: true, href: '/off' },
    ],
  },
]
const tabs = [
  { value: 'a', label: 'A', icon: 'home' as const, badge: 2 },
  { value: 'b', label: 'B', icon: 'search' as const },
  { value: 'c', label: 'C', icon: 'user' as const },
]
const anchors = [{ id: 'intro', label: 'Intro', children: [{ id: 'setup', label: 'Setup' }] }, { id: 'api', label: 'API' }]
const ctxItems = [
  { value: 'edit', label: 'Edit', icon: 'file' as const, hint: '⌘E' },
  { value: 'copy', label: 'Copy', disabled: true },
  { value: 'del', label: 'Delete', danger: true, divider: true },
]
const actions = [{ key: 'a', label: 'Add', icon: 'plus' as const }, { key: 'd', label: 'Del', icon: 'close' as const, danger: true }]
const acc = [
  { value: 'one', title: 'One', content: 'First' },
  { value: 'two', title: 'Two', content: 'Second', disabled: true },
]
const steps = [{ title: 'Welcome', content: 'Hello' }, { title: 'Next', content: 'More' }]

const cases: [string, () => Promise<string>, () => string][] = [
  ['Menu vertical', () => vue(V.MlMenu, { items: menu, modelValue: 'profile' }), () => react(<R.Menu items={menu} value="profile" />)],
  ['Menu vertical open', () => vue(V.MlMenu, { items: menu, openKeys: ['set'], label: 'Side' }), () => react(<R.Menu items={menu} openKeys={['set']} label="Side" />)],
  ['Menu collapsed', () => vue(V.MlMenu, { items: menu, collapsed: true, modelValue: 'home' }), () => react(<R.Menu items={menu} collapsed value="home" />)],
  ['Menu horizontal popup', () => vue(V.MlMenu, { items: menu, mode: 'horizontal', openKeys: ['set'] }), () => react(<R.Menu items={menu} mode="horizontal" openKeys={['set']} />)],
  ['Menu collapsed popup', () => vue(V.MlMenu, { items: menu, collapsed: true, openKeys: ['set'] }), () => react(<R.Menu items={menu} collapsed openKeys={['set']} />)],
  ['ContextMenu closed', () => vue(V.MlContextMenu, { items: ctxItems }, 'Area'), () => react(<R.ContextMenu items={ctxItems}>Area</R.ContextMenu>)],
  ['NavBar', () => vue(V.MlNavBar, { title: 'T', subtitle: 'S', back: true }), () => react(<R.NavBar title="T" subtitle="S" back />)],
  ['NavBar large', () => vue(V.MlNavBar, { title: 'T', large: true }), () => react(<R.NavBar title="T" large />)],
  [
    'NavBar slots',
    async () => {
      const { createSSRApp } = await import('vue')
      const { renderToString } = await import('vue/server-renderer')
      return signature(await renderToString(createSSRApp({ render: () => h(V.MlNavBar, {}, { left: () => h('b', 'L'), right: () => h('i', 'R'), title: () => h('em', 'X') }) })))
    },
    () => react(<R.NavBar left={<b>L</b>} right={<i>R</i>} heading={<em>X</em>} />),
  ],
  ['TabBar', () => vue(V.MlTabBar, { items: tabs, modelValue: 'b' }), () => react(<R.TabBar items={tabs} value="b" />)],
  ['TabBar action', () => vue(V.MlTabBar, { items: tabs, actionLabel: 'New', label: 'Tabs' }), () => react(<R.TabBar items={tabs} actionLabel="New" label="Tabs" />)],
  ['Anchor', () => vue(V.MlAnchor, { items: anchors, title: 'On this page' }), () => react(<R.Anchor items={anchors} title="On this page" />)],
  ['Anchor active', () => vue(V.MlAnchor, { items: anchors, modelValue: 'setup' }), () => react(<R.Anchor items={anchors} value="setup" />)],
  ['Affix', () => vue(V.MlAffix, {}, 'Pinned'), () => react(<R.Affix>Pinned</R.Affix>)],
  ['BackTop hidden', () => vue(V.MlBackTop), () => react(<R.BackTop />)],
  ['BackTop visible', () => vue(V.MlBackTop, { visibilityHeight: 0, label: 'Top' }), () => react(<R.BackTop visibilityHeight={0} label="Top" />)],
  ['FloatButton', () => vue(V.MlFloatButton, { label: 'Add', badge: 2 }), () => react(<R.FloatButton label="Add" badge={2} />)],
  ['FloatButton actions', () => vue(V.MlFloatButton, { actions, corner: 'top-left', tone: 'tech' }), () => react(<R.FloatButton actions={actions} corner="top-left" tone="tech" />)],
  ['FloatButton open inline', () => vue(V.MlFloatButton, { actions, open: true, inline: true }), () => react(<R.FloatButton actions={actions} open inline />)],
  ['Tour closed', () => vue(V.MlTour, { steps }), () => react(<R.Tour steps={steps} />)],
  ['Accordion', () => vue(V.MlAccordion, { items: acc }), () => react(<R.Accordion items={acc} />)],
  ['Accordion open', () => vue(V.MlAccordion, { items: acc, modelValue: ['one'], multiple: true }), () => react(<R.Accordion items={acc} value={['one']} multiple />)],
]

describe('React ↔ Vue markup parity: nav', () => {
  for (const [name, fromVue, fromReact] of cases) {
    it(name, async () => {
      expect(fromReact()).toBe(await fromVue())
    })
  }
})

// Teleported / client-only states: mount both in the DOM and compare the portal content.
const noTransition = (s: string) => s.replace(/\.ml-[\w-]+-(enter|leave)-(from|active|to)/g, '')
async function vueDom(component: Component, props: Record<string, unknown>, after?: (host: HTMLElement) => void | Promise<void>, slot?: string) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp({ render: () => h(component, props, slot === undefined ? undefined : { default: () => slot }) })
  app.mount(host)
  await nextTick()
  await after?.(host)
  await nextTick()
  return { done: () => (app.unmount(), (document.body.innerHTML = '')) }
}
async function reactDom(el: React.ReactElement, after?: (host: HTMLElement) => void) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  await act(async () => root.render(el))
  await act(async () => after?.(host))
  await act(() => new Promise((r) => setTimeout(r, 30)))
  return { done: () => (act(() => root.unmount()), (document.body.innerHTML = '')) }
}
const grab = (sel: string) => noTransition(signature(document.querySelector(sel)!.outerHTML))
const rightClick = (host: HTMLElement) => void host.querySelector('.ml-ctx')!.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 5, clientY: 5 }))

describe('React ↔ Vue DOM parity: nav portals', () => {
  it('ContextMenu open', async () => {
    let v = await vueDom(V.MlContextMenu, { items: ctxItems, label: 'Ctx' }, rightClick, 'Area')
    const fromVue = grab('.ml-ctx__menu')
    v.done()
    v = await reactDom(<R.ContextMenu items={ctxItems} label="Ctx">Area</R.ContextMenu>, rightClick)
    expect(grab('.ml-ctx__menu')).toBe(fromVue)
    v.done()
  })
  for (const [name, props] of [
    ['Tour first step', { steps, open: true }],
    ['Tour last step, no mascot', { steps, open: true, current: 1, mascot: false }],
  ] as const) {
    it(name, async () => {
      let v = await vueDom(V.MlTour, props)
      const fromVue = grab('.ml-tour')
      v.done()
      v = await reactDom(<R.Tour {...props} />)
      expect(grab('.ml-tour')).toBe(fromVue)
      v.done()
    })
  }
})
