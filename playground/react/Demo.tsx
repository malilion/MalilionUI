import { useState } from 'react'
import type { MlGanttTask } from '@malilion/ui/react'
import {
  Badge,
  Button,
  Card,
  ColorPicker,
  Combobox,
  ConfigProvider,
  DatePicker,
  DialogHost,
  Gantt,
  Rate,
  Slider,
  Table,
  confirm,
  Gauge,
  Heatmap,
  Modal,
  Segmented,
  Stat,
  Switch,
  Tabs,
  ToastHost,
  en,
  toast,
  zhTW,
} from '@malilion/ui/react'

const pride = [
  { id: 1, name: 'Nala', role: 'Frontend', commits: 128 },
  { id: 2, name: 'Simba', role: 'Backend', commits: 96 },
  { id: 3, name: 'Kiara', role: 'Design', commits: 54 },
  { id: 4, name: 'Mufasa', role: 'DevOps', commits: 77 },
]
const stacks = ['Vue', 'React', 'Nuxt', 'Next.js', 'Vite'].map((s) => ({ value: s, label: s }))

// A small sprint plan relative to today, so the today line always lands inside it.
const day = (offset: number) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d
}
const sprint: MlGanttTask[] = [
  { id: 'design', label: 'Design', start: day(-6), end: day(1), progress: 1, group: 'Sprint', tone: 'bean' },
  { id: 'api', label: 'API', start: day(-2), end: day(6), progress: 0.5, group: 'Sprint', tone: 'tech', deps: ['design'] },
  { id: 'ui', label: 'React UI', start: day(2), end: day(10), progress: 0.1, group: 'Sprint', tone: 'gold', deps: ['design'] },
  { id: 'ship', label: 'Ship 🦁', start: day(12), end: day(12), milestone: true, tone: 'danger', deps: ['api', 'ui'] },
]

const today = new Date()
const commits = Array.from({ length: 120 }, (_, i) => ({
  date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - i),
  count: Math.round(Math.abs(Math.sin(i * 1.3)) * 6),
}))

export function Demo() {
  const [lang, setLang] = useState<string | number>('zh')
  const [cpu, setCpu] = useState(64)
  const [open, setOpen] = useState(false)
  const [plan, setPlan] = useState(sprint)
  return (
    <ConfigProvider locale={lang === 'en' ? en : zhTW}>
      <div style={{ display: 'grid', gap: 16 }}>
        <Segmented options={[{ value: 'zh', label: '繁體中文' }, { value: 'en', label: 'English' }]} value={lang} onChange={setLang} />
        <Card eyebrow="React" title="碼力獅 × React">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center' }}>
            <Stat label="CPU" value={`${cpu}%`} delta={cpu - 60} />
            <Gauge value={cpu} unit="%" size={150} bands={[{ from: 0, tone: 'success' }, { from: 80, tone: 'danger' }]} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
            <Button stamp onClick={() => setCpu((v) => Math.min(100, v + 8))}>+8%</Button>
            <Button variant="steel" onClick={() => setCpu((v) => Math.max(0, v - 8))}>−8%</Button>
            <Button variant="outline" onClick={() => toast.success({ title: 'Roar!', message: `CPU ${cpu}%` })}>toast()</Button>
            <Button variant="ghost" onClick={() => setOpen(true)}>Modal</Button>
            <Button variant="ghost" onClick={async () => toast(String(await confirm.danger({ title: 'confirm()', message: 'Delete the den?' })))}>confirm()</Button>
            <Switch label="Live" defaultChecked />
            <Badge tone="success" dot>Online</Badge>
          </div>
        </Card>
        <Tabs
          items={[{ value: 'gantt', label: 'Gantt' }, { value: 'heat', label: 'Heatmap' }, { value: 'form', label: 'Form' }, { value: 'table', label: 'Table' }]}
          panels={{
            gantt: (
              <Gantt
                tasks={plan}
                scale="day"
                sideWidth={120}
                editable
                onChange={(task, { start, end }) => {
                  setPlan((list) => list.map((t) => (t.id === task.id ? { ...t, start, end } : t)))
                  toast.success({ title: task.label, message: `${start.toLocaleDateString()} → ${end.toLocaleDateString()}` })
                }}
              />
            ),
            heat: <Heatmap data={commits} weeks={18} cell="paw" />,
            form: (
              <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                <Combobox label="Stack" options={stacks} multiple searchable clearable defaultValue={['React']} />
                <DatePicker label="Ship date" clearable />
                <ColorPicker label="Mane colour" defaultValue="#f0ad2f" />
                <Slider label="Roar volume" defaultValue={60} unit="dB" showValue />
                <Rate label="Cuteness" defaultValue={4.5} allowHalf showValue />
              </div>
            ),
            table: (
              <Table
                rowKey="id"
                selectable
                columns={[{ key: 'name', title: 'Name', sortable: true }, { key: 'role', title: 'Role' }, { key: 'commits', title: 'Commits', sortable: true, mono: true, align: 'right' }]}
                rows={pride}
              />
            ),
          }}
        />
        <Modal open={open} onClose={() => setOpen(false)} eyebrow="React" title="Hello from React" footer={<Button onClick={() => setOpen(false)}>OK</Button>}>
          這個對話框是 React 渲染的，樣式和 Vue 版完全相同。
        </Modal>
        <ToastHost />
        <DialogHost />
      </div>
    </ConfigProvider>
  )
}
