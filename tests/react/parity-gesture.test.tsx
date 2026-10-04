// Markup parity for MlPullRefresh ↔ <PullRefresh> and MlSwipeCell ↔ <SwipeCell>.
import { describe, expect, it } from 'vitest'
import * as V from '../../src'
import { PullRefresh, SwipeCell } from '../../src/react/gesture'
import { react, vue } from './parity-utils'

const right: V.MlSwipeAction[] = [
  { label: '封存', value: 'archive', icon: 'folder', tone: 'accent' },
  { label: '標記', value: 'flag', tone: 'warning' },
  { label: '刪除', value: 'delete', icon: 'close', tone: 'danger' },
]
const left: V.MlSwipeAction[] = [{ label: '已讀', icon: 'check' }]

const cases: [string, () => Promise<string>, () => string][] = [
  ['PullRefresh', () => vue(V.MlPullRefresh, {}, 'feed'), () => react(<PullRefresh>feed</PullRefresh>)],
  [
    'PullRefresh options',
    () => vue(V.MlPullRefresh, { headHeight: 72, pullDistance: 90, pullingText: '往下拉', successDuration: 0 }, 'x'),
    () => react(<PullRefresh headHeight={72} pullDistance={90} pullingText="往下拉" successDuration={0}>x</PullRefresh>),
  ],
  ['PullRefresh disabled', () => vue(V.MlPullRefresh, { disabled: true }, 'x'), () => react(<PullRefresh disabled>x</PullRefresh>)],
  [
    'SwipeCell row',
    () => vue(V.MlSwipeCell, { title: '獅子王', subtitle: '今晚開會', meta: '09:41', badge: 2, leftActions: left, rightActions: right }),
    () => react(<SwipeCell title="獅子王" subtitle="今晚開會" meta="09:41" badge={2} leftActions={left} rightActions={right} />),
  ],
  [
    'SwipeCell clickable, right only, open',
    () => vue(V.MlSwipeCell, { title: 'Mail', clickable: true, rightActions: right, open: 'right', fullSwipe: true }),
    () => react(<SwipeCell title="Mail" clickable rightActions={right} open="right" fullSwipe />),
  ],
  [
    'SwipeCell slot content as div',
    () => vue(V.MlSwipeCell, { tag: 'div', leftActions: left }, 'Hello'),
    () => react(<SwipeCell as="div" leftActions={left}>Hello</SwipeCell>),
  ],
  [
    'SwipeCell disabled, no actions',
    () => vue(V.MlSwipeCell, { title: 'Plain', disabled: true }),
    () => react(<SwipeCell title="Plain" disabled />),
  ],
]

describe('React ↔ Vue markup parity: gesture', () => {
  for (const [name, fromVue, fromReact] of cases) {
    it(name, async () => {
      expect(fromReact()).toBe(await fromVue())
    })
  }
})
