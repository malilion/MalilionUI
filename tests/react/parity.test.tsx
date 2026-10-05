// The React components must render the same markup as the Vue ones, so the
// shared stylesheet styles both identically. Each pair is server-rendered and
// compared as a tree of tag + classes + role + text (ids and inline styles aside).
import { describe, expect, it } from 'vitest'
import * as V from '../../src'
import * as R from '../../src/react'
import { react, vue } from './parity-utils'

// Pinned home tab (closable: false), one closable tab, one disabled.
const editTabs = [
  { value: 'a', label: 'A', closable: false },
  { value: 'b', label: 'B' },
  { value: 'c', label: 'C', closable: true },
  { value: 'd', label: 'D', disabled: true },
]

const cases: [string, () => Promise<string>, () => string][] = [
  ['Button', () => vue(V.MlButton, { variant: 'tech', size: 'lg', block: true }, 'Go'), () => react(<R.Button variant="tech" size="lg" block>Go</R.Button>)],
  ['Button loading', () => vue(V.MlButton, { loading: true }, 'Wait'), () => react(<R.Button loading>Wait</R.Button>)],
  ['Badge', () => vue(V.MlBadge, { tone: 'success', dot: true }, 'Live'), () => react(<R.Badge tone="success" dot>Live</R.Badge>)],
  ['Badge paw', () => vue(V.MlBadge, { paw: true, solid: true }, 'Cute'), () => react(<R.Badge paw solid>Cute</R.Badge>)],
  ['Tag', () => vue(V.MlTag, { tone: 'tech', variant: 'outline', closable: true }, 'Vue'), () => react(<R.Tag tone="tech" variant="outline" closable>Vue</R.Tag>)],
  ['Kbd', () => vue(V.MlKbd, {}, 'Esc'), () => react(<R.Kbd>Esc</R.Kbd>)],
  ['Divider paw', () => vue(V.MlDivider, { paw: true }), () => react(<R.Divider paw />)],
  ['Paw', () => vue(V.MlPaw, { tone: 'bean', size: 20 }), () => react(<R.Paw tone="bean" size={20} />)],
  ['Card', () => vue(V.MlCard, { title: 'T', eyebrow: 'E', rivets: true }, 'Body'), () => react(<R.Card title="T" eyebrow="E" rivets>Body</R.Card>)],
  ['Alert', () => vue(V.MlAlert, { tone: 'warning', title: 'Heads up', closable: true }, 'Careful'), () => react(<R.Alert tone="warning" title="Heads up" closable>Careful</R.Alert>)],
  ['Progress', () => vue(V.MlProgress, { value: 40, label: 'Load', paw: true }), () => react(<R.Progress value={40} label="Load" paw />)],
  ['Progress indeterminate', () => vue(V.MlProgress, {}), () => react(<R.Progress />)],
  ['Loader', () => vue(V.MlLoader, { label: 'Hold on' }), () => react(<R.Loader label="Hold on" />)],
  ['Loader paws', () => vue(V.MlLoader, { variant: 'paws' }), () => react(<R.Loader variant="paws" />)],
  ['Avatar', () => vue(V.MlAvatar, { name: 'Nala Ray', status: 'online' }), () => react(<R.Avatar name="Nala Ray" status="online" />)],
  ['Avatar lion', () => vue(V.MlAvatar, { lion: true, size: 'lg' }), () => react(<R.Avatar lion size="lg" />)],
  ['Empty', () => vue(V.MlEmpty, { description: 'Nothing' }), () => react(<R.Empty description="Nothing" />)],
  ['Mascot', () => vue(V.MlMascot, { frame: 'ring', glow: true }), () => react(<R.Mascot frame="ring" glow />)],
  ['Skeleton', () => vue(V.MlSkeleton, { avatar: true, rows: 2 }), () => react(<R.Skeleton avatar rows={2} />)],
  ['Stat', () => vue(V.MlStat, { label: 'Users', value: '1,890', delta: 12, caption: 'week' }), () => react(<R.Stat label="Users" value="1,890" delta={12} caption="week" />)],
  ['Banner', () => vue(V.MlBanner, { tone: 'gold', title: 'New', message: 'Hi', closable: true }), () => react(<R.Banner tone="gold" title="New" message="Hi" closable />)],
  ['Result 404', () => vue(V.MlResult, { status: '404' }), () => react(<R.Result status="404" />)],
  ['Result success', () => vue(V.MlResult, { status: 'success', title: 'Done' }), () => react(<R.Result status="success" title="Done" />)],
  ['Breadcrumb', () => vue(V.MlBreadcrumb, { items: [{ label: 'Home', href: '/', icon: 'home' }, { label: 'Docs' }] }), () => react(<R.Breadcrumb items={[{ label: 'Home', href: '/', icon: 'home' }, { label: 'Docs' }]} />)],
  ['Steps', () => vue(V.MlSteps, { items: [{ title: 'A' }, { title: 'B', desc: 'b' }, { title: 'C' }], current: 1 }), () => react(<R.Steps items={[{ title: 'A' }, { title: 'B', desc: 'b' }, { title: 'C' }]} current={1} />)],
  ['Descriptions', () => vue(V.MlDescriptions, { title: 'Info', items: [{ label: 'A', value: 1 }, { label: 'B', mono: true, value: 'x', span: 2 }] }), () => react(<R.Descriptions title="Info" items={[{ label: 'A', value: 1 }, { label: 'B', mono: true, value: 'x', span: 2 }]} />)],
  ['Timeline', () => vue(V.MlTimeline, { items: [{ title: 'Ship', time: '10:00', paw: true }, { title: 'Test', icon: 'check', tone: 'tech' }], pending: 'Deploying' }), () => react(<R.Timeline items={[{ title: 'Ship', time: '10:00', paw: true }, { title: 'Test', icon: 'check', tone: 'tech' }]} pending="Deploying" />)],
  ['Input', () => vue(V.MlInput, { label: 'Name', hint: 'Hint', index: '01', id: 'x' }), () => react(<R.Input label="Name" hint="Hint" index="01" id="x" />)],
  ['Input error', () => vue(V.MlInput, { label: 'Name', error: 'Bad', id: 'x' }), () => react(<R.Input label="Name" error="Bad" id="x" />)],
  ['Textarea', () => vue(V.MlTextarea, { label: 'Bio', id: 'y' }), () => react(<R.Textarea label="Bio" id="y" />)],
  ['Checkbox', () => vue(V.MlCheckbox, { label: 'Snacks', paw: true, modelValue: true }), () => react(<R.Checkbox label="Snacks" paw checked />)],
  ['Switch', () => vue(V.MlSwitch, { label: 'Push', showState: true, modelValue: true }), () => react(<R.Switch label="Push" showState checked />)],
  ['RadioGroup', () => vue(V.MlRadioGroup, { label: 'Plan', variant: 'card', options: [{ value: 'a', label: 'A', hint: 'h' }, { value: 'b', label: 'B' }], modelValue: 'a' }), () => react(<R.RadioGroup label="Plan" variant="card" options={[{ value: 'a', label: 'A', hint: 'h' }, { value: 'b', label: 'B' }]} value="a" />)],
  ['Tabs', () => vue(V.MlTabs, { items: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }], modelValue: 'a' }), () => react(<R.Tabs items={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]} value="a" />)],
  [
    'Tabs editable',
    () => vue(V.MlTabs, { items: editTabs, modelValue: 'b', closable: true, addable: true, reorderable: true }),
    () => react(<R.Tabs items={editTabs} value="b" closable addable reorderable />),
  ],
  ['Tabs plate closable per tab', () => vue(V.MlTabs, { items: editTabs, variant: 'plate' }), () => react(<R.Tabs items={editTabs} variant="plate" />)],
  ['Segmented', () => vue(V.MlSegmented, { options: [{ value: 1, label: 'One' }, { value: 2, label: 'Two', icon: 'grid' }], modelValue: 1 }), () => react(<R.Segmented options={[{ value: 1, label: 'One' }, { value: 2, label: 'Two', icon: 'grid' }]} value={1} />)],
  ['Pagination', () => vue(V.MlPagination, { total: 20, page: 10 }), () => react(<R.Pagination total={20} page={10} />)],
  ['Tooltip', () => vue(V.MlTooltip, { content: 'Tip' }, 'x'), () => react(<R.Tooltip content="Tip">x</R.Tooltip>)],
  ['Ring', () => vue(V.MlRing, { value: 72, label: 'CPU' }), () => react(<R.Ring value={72} label="CPU" />)],
  ['Sparkline', () => vue(V.MlSparkline, { data: [1, 4, 2, 5] }), () => react(<R.Sparkline data={[1, 4, 2, 5]} />)],
  ['BarChart', () => vue(V.MlBarChart, { data: [{ label: 'A', value: 3 }, { label: 'B', value: 7 }] }), () => react(<R.BarChart data={[{ label: 'A', value: 3 }, { label: 'B', value: 7 }]} />)],
  ['Donut', () => vue(V.MlDonut, { data: [{ label: 'A', value: 3 }, { label: 'B', value: 1 }], title: '4' }), () => react(<R.Donut data={[{ label: 'A', value: 3 }, { label: 'B', value: 1 }]} title="4" />)],
  ['Heatmap', () => vue(V.MlHeatmap, { data: [{ date: '2026-10-01', count: 3 }], end: new Date(2026, 9, 3), weeks: 3, cell: 'paw' }), () => react(<R.Heatmap data={[{ date: '2026-10-01', count: 3 }]} end={new Date(2026, 9, 3)} weeks={3} cell="paw" />)],
  ['Gauge', () => vue(V.MlGauge, { value: 64, unit: '%', label: 'CPU', bands: [{ from: 0, tone: 'success' }, { from: 90, tone: 'danger' }] }), () => react(<R.Gauge value={64} unit="%" label="CPU" bands={[{ from: 0, tone: 'success' }, { from: 90, tone: 'danger' }]} />)],
  ['RadarChart', () => vue(V.MlRadarChart, { indicators: [{ label: 'A' }, { label: 'B' }, { label: 'C' }], series: [{ name: 'x', values: [1, 2, 3] }, { name: 'y', values: [3, 2, 1] }] }), () => react(<R.RadarChart indicators={[{ label: 'A' }, { label: 'B' }, { label: 'C' }]} series={[{ name: 'x', values: [1, 2, 3] }, { name: 'y', values: [3, 2, 1] }]} />)],
  ['QRCode', () => vue(V.MlQRCode, { value: 'https://example.com', logo: 'paw' }), () => react(<R.QRCode value="https://example.com" logo="paw" />)],
  ['CodeBlock', () => vue(V.MlCodeBlock, { code: "const a = 'x'\n// hi", filename: 'a.ts', lineNumbers: true, highlight: [2] }), () => react(<R.CodeBlock code={"const a = 'x'\n// hi"} filename="a.ts" lineNumbers highlight={[2]} />)],
  ['Countdown', () => vue(V.MlCountdown, { duration: 62_000, units: ['minutes', 'seconds'], paused: true }), () => react(<R.Countdown duration={62_000} units={['minutes', 'seconds']} paused />)],
]

describe('React ↔ Vue markup parity', () => {
  for (const [name, fromVue, fromReact] of cases) {
    it(name, async () => {
      expect(fromReact()).toBe(await fromVue())
    })
  }
})
