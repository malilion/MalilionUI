import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, createRef } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { CuteIcon } from '../../src/react/cute-icon'
import { Puzzle, type PuzzleHandle } from '../../src/react/puzzle'
import { Globe, type GlobeHandle } from '../../src/react/globe'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root | undefined
function render(el: React.ReactElement) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(el))
  return host
}
const $ = (s: string) => document.querySelector(s)!
const piece = (cell: number) => $(`[data-cell="${cell}"]`) as SVGGElement
const pieceNumber = (cell: number) => Number(/第 (\d+) 塊/.exec(piece(cell).getAttribute('aria-label')!)![1])
const tap = (cell: number) =>
  act(() => {
    piece(cell).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerId: 1 }))
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }))
  })
const key = (k: string) => act(() => (document.activeElement ?? $('svg')).dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })))

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  document.body.innerHTML = ''
})

describe('CuteIcon', () => {
  it('renders its layers with the size variable', () => {
    render(<CuteIcon name="panda" size={32} animate="blink" />)
    const svg = $('svg')
    expect(svg.getAttribute('class')).toBe('ml-cute ml-cute--color ml-cute--blink')
    expect((svg as SVGElement).style.getPropertyValue('--_size')).toBe('32px')
    expect(svg.querySelectorAll('path').length).toBeGreaterThan(5)
  })
})

describe('Puzzle', () => {
  it('tap two pieces to swap; finishing calls onComplete once', () => {
    const onMove = vi.fn()
    const onComplete = vi.fn()
    render(<Puzzle seed={4} rows={2} cols={2} confetti={false} onMove={onMove} onComplete={onComplete} />)
    for (let cell = 0; cell < 4; cell++) {
      if (pieceNumber(cell) === cell + 1) continue
      const from = [0, 1, 2, 3].find((c) => pieceNumber(c) === cell + 1)!
      tap(from)
      expect(piece(from).getAttribute('aria-pressed')).toBe('true')
      tap(cell)
      expect(pieceNumber(cell)).toBe(cell + 1)
    }
    expect(onMove).toHaveBeenCalled()
    expect(onMove.mock.lastCall![2]).toBe(onMove.mock.calls.length)
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete.mock.calls[0][0].moves).toBe(onMove.mock.calls.length)
    expect($('.ml-puzzle').classList.contains('ml-puzzle--solved')).toBe(true)
    expect($('[aria-live]').textContent).toMatch(/^完成！/)
  })

  it('keyboard: arrows, Enter, Escape, swap — focus survives the redraw', () => {
    const onMove = vi.fn()
    render(<Puzzle seed={2} onMove={onMove} />)
    act(() => piece(0).focus())
    key('ArrowRight')
    expect(document.activeElement).toBe(piece(1))
    key('ArrowDown')
    expect(document.activeElement).toBe(piece(4))
    key('Enter')
    expect(piece(4).getAttribute('aria-pressed')).toBe('true')
    expect(document.activeElement).toBe(piece(4))
    key('Escape')
    expect(piece(4).getAttribute('aria-pressed')).toBe('false')
    const a = pieceNumber(4)
    const b = pieceNumber(8)
    key('Enter')
    key('End')
    expect(document.activeElement).toBe(piece(8))
    key(' ')
    expect([pieceNumber(4), pieceNumber(8)]).toEqual([b, a])
    expect(onMove).toHaveBeenCalledWith(4, 8, 1)
  })

  it('locked pieces stay; shuffle and solve through the handle', () => {
    const ref = createRef<PuzzleHandle>()
    const onShuffle = vi.fn()
    render(<Puzzle ref={ref} seed={4} rows={2} cols={2} onShuffle={onShuffle} />)
    const from = [0, 1, 2, 3].find((c) => pieceNumber(c) === 1)!
    tap(from)
    tap(0)
    expect(piece(0).getAttribute('aria-disabled')).toBe('true')
    tap(0)
    expect(piece(0).getAttribute('aria-pressed')).toBe('false')
    act(() => ref.current!.solve())
    expect($('.ml-puzzle__stat--progress').textContent).toBe('4 / 4 塊就位')
    act(() => ($('.ml-puzzle__shuffle') as HTMLButtonElement).click())
    expect(onShuffle).toHaveBeenCalledTimes(1)
    expect($('.ml-puzzle__stat').textContent).toBe('0 步')
    expect($('.ml-puzzle').classList.contains('ml-puzzle--solved')).toBe(false)
  })
})

describe('Globe', () => {
  const markers = [
    { lat: 25.03, lng: 121.56, label: '臺北' },
    { lat: 40.71, lng: -74.01, label: 'New York' },
  ]

  it('hover shows a tip; click and Enter select', () => {
    const onSelect = vi.fn()
    render(<Globe markers={markers} autoRotate={false} flyToMarker={false} onSelect={onSelect} />)
    const m = $('.ml-globe__marker')
    act(() => m.dispatchEvent(new PointerEvent('pointerover', { bubbles: true })))
    expect($('.ml-globe__tip').textContent).toBe('臺北')
    act(() => m.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    act(() => m.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })))
    expect(onSelect).toHaveBeenCalledTimes(2)
    expect(onSelect).toHaveBeenLastCalledWith(markers[0], 0)
    expect(document.querySelectorAll('.ml-globe__marker')[1].classList.contains('ml-globe__marker--back')).toBe(true)
  })

  it('arrow keys, Home and flyTo (instant with reduced motion)', () => {
    const mm = vi.spyOn(window, 'matchMedia').mockImplementation((q: string) => ({ matches: q.includes('reduce'), media: q }) as MediaQueryList)
    const ref = createRef<GlobeHandle>()
    render(<Globe ref={ref} markers={markers} autoRotate={false} />)
    const at = () => $('.ml-globe__marker').getAttribute('transform')
    const start = at()
    act(() => $('svg').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })))
    expect(at()).not.toBe(start)
    act(() => $('svg').dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true })))
    expect(at()).toBe(start)
    act(() => ref.current!.flyTo(markers[0]))
    expect(at()).toBe('translate(100 100)')
    mm.mockRestore()
  })
})
