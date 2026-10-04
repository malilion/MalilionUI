import { afterEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { ConfigProvider } from '../../src/react/locale'
import { Sankey } from '../../src/react/sankey'
import { StickerPicker } from '../../src/react/sticker'
import { Puzzle } from '../../src/react/puzzle'
import { LunarCalendar } from '../../src/react/lunar-calendar'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined
function render(el: React.ReactElement) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(el))
  return host
}
afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
})

describe('follow-ups (React)', () => {
  it('Sankey reports ignored links once', () => {
    const onIgnored = vi.fn()
    const nodes = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }]
    const links = [{ source: 'a', target: 'b', value: 5 }, { source: 'b', target: 'a', value: 2 }]
    render(<Sankey nodes={nodes} links={links} onIgnored={onIgnored} />)
    expect(onIgnored).toHaveBeenCalledTimes(1)
    expect(onIgnored).toHaveBeenCalledWith([links[1]])
    act(() => root!.render(<Sankey nodes={nodes} links={[...links]} onIgnored={onIgnored} />))
    expect(onIgnored).toHaveBeenCalledTimes(1)
  })

  it('StickerPicker panel inherits the ConfigProvider theme', () => {
    render(
      <ConfigProvider theme="light">
        <StickerPicker trigger />
      </ConfigProvider>,
    )
    act(() => (document.querySelector('.ml-sticker-picker__trigger') as HTMLButtonElement).click())
    const panel = document.querySelector('.ml-sticker-picker__panel')!
    expect(panel.parentElement).toBe(document.body)
    expect(panel.getAttribute('data-ml-theme')).toBe('light')
  })

  it('a partial locale is completed', () => {
    render(
      <ConfigProvider locale={{ name: 'en-US', puzzle: { shuffle: 'Mix' } }}>
        <Puzzle seed={1} />
      </ConfigProvider>,
    )
    expect(document.querySelector('.ml-puzzle__shuffle')!.textContent).toBe('Mix')
    expect(document.querySelector('.ml-puzzle__stat')!.textContent).toBe('0 moves')
  })

  it('LunarCalendar applies the official calendar by default', () => {
    render(<LunarCalendar today={new Date(2026, 1, 10)} />)
    expect(document.body.textContent).toContain('補假')
    act(() => root!.render(<LunarCalendar today={new Date(2026, 1, 10)} official={false} />))
    expect(document.body.textContent).not.toContain('補假')
  })
})
