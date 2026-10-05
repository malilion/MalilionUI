<script setup lang="ts">
import { ref } from 'vue'
import { twRules, type MlProTableColumn } from '@malilion/ui'

interface Member {
  id: number
  name: string
  team: string
  phone: string
  level: number
  joined: Date | null
  active: boolean
  note: string
}

const teams = [
  { value: 'core', label: '核心組' },
  { value: 'ui', label: '介面組' },
  { value: 'ops', label: '維運組' },
]

const columns: MlProTableColumn<Member>[] = [
  { key: 'id', title: '編號', width: '72px', mono: true, sortable: true },
  { key: 'name', title: '姓名', sortable: true, filter: true, form: { required: true, rules: { max: 12 }, placeholder: '例：陳小獅' } },
  { key: 'team', title: '組別', options: teams, filter: true, form: { required: true } },
  { key: 'phone', title: '手機', mono: true, form: { required: true, rules: twRules.mobile(), placeholder: '09xx-xxx-xxx' } },
  { key: 'level', title: '等級', align: 'right', sortable: true, filter: { type: 'number-range' }, form: { type: 'number', min: 1, max: 10, default: 1 } },
  { key: 'joined', title: '加入日', sortable: true, format: (v) => (v instanceof Date ? v.toLocaleDateString('zh-TW') : '—'), form: { type: 'date' } },
  { key: 'active', title: '狀態', format: (v) => (v ? '在職' : '停用'), form: { type: 'switch', label: '在職中', default: true } },
  { key: 'note', title: '備註', hideInTable: true, form: { type: 'textarea', placeholder: '只在表單裡出現' } },
]

const members = ref<Member[]>([
  { id: 1, name: '陳大獅', team: 'core', phone: '0912-345-678', level: 9, joined: new Date(2023, 2, 1), active: true, note: '' },
  { id: 2, name: '林小鬃', team: 'ui', phone: '0922-111-222', level: 6, joined: new Date(2024, 5, 12), active: true, note: '' },
  { id: 3, name: '王爪爪', team: 'ops', phone: '0933-222-333', level: 4, joined: new Date(2025, 0, 6), active: false, note: '' },
  { id: 4, name: '張肉球', team: 'ui', phone: '0955-666-777', level: 7, joined: new Date(2022, 8, 30), active: true, note: '' },
  { id: 5, name: '李金鬃', team: 'core', phone: '0966-888-999', level: 10, joined: new Date(2021, 3, 18), active: true, note: '' },
  { id: 6, name: '黃小吼', team: 'ops', phone: '0977-123-456', level: 3, joined: new Date(2026, 1, 9), active: true, note: '' },
  { id: 7, name: '吳尾巴', team: 'ui', phone: '0988-765-432', level: 5, joined: new Date(2025, 7, 21), active: false, note: '' },
])
let nextId = 8

function onCreate(values: Record<string, unknown>) {
  members.value = [...members.value, { ...(values as unknown as Member), id: nextId++ }]
}
function onUpdate(row: Member, values: Record<string, unknown>) {
  members.value = members.value.map((m) => (m.id === row.id ? { ...m, ...values } : m))
}
function onDelete(rows: Member[]) {
  const gone = new Set(rows.map((r) => r.id))
  members.value = members.value.filter((m) => !gone.has(m.id))
}
</script>

<template>
  <MlProTable
    title="獅群成員"
    :columns="columns"
    :data="members"
    :page-size="5"
    :page-sizes="[5, 10, 20]"
    @create="onCreate"
    @update="onUpdate"
    @delete="onDelete"
  />
</template>
