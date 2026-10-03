// Markup parity for the popup components (see parity.test.tsx).
import { describe, expect, it } from 'vitest'
import * as V from '../../src'
import * as R from '../../src/react/popups'
import { react, vue } from './parity-utils'

const items = [
  { value: 'edit', label: 'Edit', icon: 'file' as const, hint: '⌘E' },
  { value: 'copy', label: 'Copy', disabled: true },
  { value: 'del', label: 'Delete', danger: true, divider: true },
]

const cases: [string, () => Promise<string>, () => string][] = [
  ['Drawer closed', () => vue(V.MlDrawer, { title: 'T' }, 'Body'), () => react(<R.Drawer title="T">Body</R.Drawer>)],
  ['Drawer inline open', () => vue(V.MlDrawer, { open: true, inline: true, title: 'T', eyebrow: 'E', placement: 'left' }, 'Body'), () => react(<R.Drawer open inline title="T" eyebrow="E" placement="left">Body</R.Drawer>)],
  ['Drawer inline hideClose', () => vue(V.MlDrawer, { open: true, inline: true, hideClose: true }, 'Body'), () => react(<R.Drawer open inline hideClose>Body</R.Drawer>)],
  ['Popover closed', () => vue(V.MlPopover, { title: 'T' }, 'x'), () => react(<R.Popover title="T">x</R.Popover>)],
  ['Popover open', () => vue(V.MlPopover, { open: true, title: 'T', placement: 'right' }, 'x'), () => react(<R.Popover open title="T" placement="right">x</R.Popover>)],
  ['Dropdown', () => vue(V.MlDropdown, { items, label: 'Actions' }), () => react(<R.Dropdown items={items} label="Actions" />)],
  ['Dropdown selectable', () => vue(V.MlDropdown, { items, selectable: true, modelValue: 'del', variant: 'ghost', size: 'sm' }), () => react(<R.Dropdown items={items} selectable value="del" variant="ghost" size="sm" />)],
  ['Popconfirm closed', () => vue(V.MlPopconfirm, { title: 'Sure?' }, 'x'), () => react(<R.Popconfirm title="Sure?">x</R.Popconfirm>)],
  ['Popconfirm open', () => vue(V.MlPopconfirm, { open: true, title: 'Sure?', description: 'Gone forever', tone: 'danger', confirmText: 'Delete' }, 'x'), () => react(<R.Popconfirm open title="Sure?" description="Gone forever" tone="danger" confirmText="Delete">x</R.Popconfirm>)],
  ['DialogHost', () => vue(V.MlDialogHost), () => react(<R.DialogHost />)],
  ['CommandPalette', () => vue(V.MlCommandPalette, { items: [{ value: 'a', label: 'A' }] }), () => react(<R.CommandPalette items={[{ value: 'a', label: 'A' }]} />)],
]

describe('React ↔ Vue markup parity: popups', () => {
  for (const [name, fromVue, fromReact] of cases) {
    it(name, async () => {
      expect(fromReact()).toBe(await fromVue())
    })
  }
})
