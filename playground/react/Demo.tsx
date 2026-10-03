import { useState } from 'react'
import {
  Badge,
  Button,
  Card,
  ConfigProvider,
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

const today = new Date()
const commits = Array.from({ length: 120 }, (_, i) => ({
  date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - i),
  count: Math.round(Math.abs(Math.sin(i * 1.3)) * 6),
}))

export function Demo() {
  const [lang, setLang] = useState<string | number>('zh')
  const [cpu, setCpu] = useState(64)
  const [open, setOpen] = useState(false)
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
            <Switch label="Live" defaultChecked />
            <Badge tone="success" dot>Online</Badge>
          </div>
        </Card>
        <Tabs items={[{ value: 'heat', label: 'Heatmap' }, { value: 'about', label: 'About' }]} panels={{ heat: <Heatmap data={commits} weeks={18} cell="paw" />, about: '45 React components, same markup as Vue.' }} />
        <Modal open={open} onClose={() => setOpen(false)} eyebrow="React" title="Hello from React" footer={<Button onClick={() => setOpen(false)}>OK</Button>}>
          這個對話框是 React 渲染的，樣式和 Vue 版完全相同。
        </Modal>
        <ToastHost />
      </div>
    </ConfigProvider>
  )
}
