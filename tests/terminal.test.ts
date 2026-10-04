import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createSSRApp, h, nextTick } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { MlTerminal, setLocale, zhTW, en, type MlTerminalLine } from '../src'
import {
  createTerminalPlayer,
  normalizeTerminalLines,
  parseTerminalMarkup,
  progressBar,
  sliceSegments,
  terminalCommands,
  terminalPlainText,
  terminalRows,
  terminalTranscript,
  terminalInitialState,
  type TerminalState,
} from '../src/components/terminal'

const script: MlTerminalLine[] = [
  { type: 'comment', text: '# install' },
  { type: 'input', text: 'npm i {b}@malilion/ui{/}' },
  { type: 'progress', text: 'fetch', duration: 600 },
  { type: 'spinner', text: '{green}done{/}', pending: 'resolving', duration: 400 },
  { type: 'blank' },
  { type: 'output', text: 'added {gold}1{/} package', tone: 'success' },
]

describe('terminal markup', () => {
  it('parses styles into runs, nesting and closing innermost first', () => {
    expect(parseTerminalMarkup('a {green}b {b}c{/} d{/} e')).toEqual([
      { text: 'a ', styles: [] },
      { text: 'b ', styles: ['green'] },
      { text: 'c', styles: ['green', 'b'] },
      { text: ' d', styles: ['green'] },
      { text: ' e', styles: [] },
    ])
  })

  it('keeps unknown and unbalanced tags as literal text', () => {
    expect(parseTerminalMarkup('{"a":1} {/} {nope}x')).toEqual([{ text: '{"a":1} {/} {nope}x', styles: [] }])
    // An unclosed style simply runs to the end.
    expect(parseTerminalMarkup('{red}oops')).toEqual([{ text: 'oops', styles: ['red'] }])
    expect(parseTerminalMarkup('')).toEqual([])
  })

  it('never produces markup from HTML-ish input: it is all text', () => {
    const evil = '<img src=x onerror=alert(1)>{b}<script>alert(2)</script>{/}{<b>}'
    const segs = parseTerminalMarkup(evil)
    expect(segs.map((s) => s.text).join('')).toBe('<img src=x onerror=alert(1)><script>alert(2)</script>{<b>}')
    expect(segs.every((s) => s.styles.every((st) => /^[a-z]+$/.test(st)))).toBe(true)
    expect(terminalPlainText('{b}{cyan}hi{/}{/}')).toBe('hi')
  })

  it('slices by code point, across runs', () => {
    const segs = parseTerminalMarkup('ab{green}獅子🦁{/}cd')
    expect(sliceSegments(segs, 0)).toEqual([])
    expect(sliceSegments(segs, 4)).toEqual([
      { text: 'ab', styles: [] },
      { text: '獅子', styles: ['green'] },
    ])
    expect(sliceSegments(segs, 5).map((s) => s.text).join('')).toBe('ab獅子🦁')
  })

  it('draws progress bars and builds transcript / commands', () => {
    expect(progressBar(0.5, 10)).toEqual({ fill: '█████', rest: '░░░░░', pct: ' 50%' })
    expect(progressBar(2, 4).pct).toBe('100%')
    const lines = normalizeTerminalLines([...script, 'plain'])
    expect(terminalTranscript(lines, '$')).toBe('# install\n$ npm i @malilion/ui\nfetch 100%\n✔ done\n\nadded 1 package\nplain')
    expect(terminalCommands(lines)).toBe('npm i @malilion/ui')
  })
})

describe('terminal player', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  function setup(extra: Partial<Parameters<typeof createTerminalPlayer>[0]> = {}) {
    const lines = normalizeTerminalLines(script)
    const states: TerminalState[] = []
    const onDone = vi.fn()
    const player = createTerminalPlayer({ lines: () => lines, onUpdate: (s) => states.push(s), onDone, random: () => 0.5, ...extra })
    const rows = () => terminalRows(lines, player.state, '❯')
    return { player, states, onDone, rows, lines }
  }

  it('starts finished, then plays line by line to the end', () => {
    const { player, onDone, rows } = setup()
    expect(player.state.finished).toBe(true)
    player.play()
    expect(player.running).toBe(true)
    expect(player.state).toEqual(terminalInitialState())
    vi.advanceTimersByTime(70)
    expect(rows().map((r) => r.type)).toEqual(['comment', 'input'])
    expect(rows()[1].segments).toEqual([])
    expect(rows()[1].caret).toBe(true)
    vi.advanceTimersByTime(450 + 55 * 2)
    expect(terminalPlainText(rows()[1].segments.map((s) => s.text).join(''))).toBe('npm')
    vi.advanceTimersByTime(6000)
    expect(onDone).toHaveBeenCalledTimes(1)
    expect(player.state.finished).toBe(true)
    expect(player.running).toBe(false)
    expect(rows().at(-1)).toMatchObject({ index: -1, caret: true })
  })

  it('animates progress to 100% and resolves spinners to their text', () => {
    const { player, rows } = setup()
    player.play()
    let sawPartial = false
    let sawSpinner = false
    for (let t = 0; t < 4000 && !player.state.finished; t += 20) {
      vi.advanceTimersByTime(20)
      const active = rows().find((r) => r.active)
      if (active?.meter && active.meter.pct.trim() !== '0%' && active.meter.pct !== '100%') sawPartial = true
      if (active?.spinner) {
        sawSpinner = true
        expect(active.segments.map((s) => s.text).join('')).toBe('resolving')
      }
    }
    expect(sawPartial && sawSpinner).toBe(true)
    const done = rows()
    expect(done.find((r) => r.type === 'progress')!.meter!.pct).toBe('100%')
    expect(done.find((r) => r.type === 'spinner')).toMatchObject({ mark: '✔', segments: [{ text: 'done', styles: ['green'] }] })
  })

  it('pauses, resumes, skips, and honours speed', () => {
    const { player, onDone } = setup({ speed: () => 4 })
    player.play()
    vi.advanceTimersByTime(130)
    player.pause()
    const frozen = player.state
    vi.advanceTimersByTime(5000)
    expect(player.state).toEqual(frozen)
    player.play()
    vi.advanceTimersByTime(1000)
    expect(player.state.finished).toBe(true)
    expect(onDone).toHaveBeenCalledTimes(1)

    player.restart()
    vi.advanceTimersByTime(50)
    player.skip()
    expect(player.state.finished).toBe(true)
    expect(player.running).toBe(false)
    expect(onDone).toHaveBeenCalledTimes(2)
    player.skip()
    expect(onDone).toHaveBeenCalledTimes(2)
  })

  it('loops after loopDelay', () => {
    const { player, onDone } = setup({ loop: () => true, loopDelay: () => 1000, speed: () => 10 })
    player.play()
    while (!onDone.mock.calls.length) vi.advanceTimersByTime(1)
    expect(player.running).toBe(true)
    vi.advanceTimersByTime(99)
    expect(player.state.finished).toBe(true)
    vi.advanceTimersByTime(2)
    expect(player.state.finished).toBe(false)
    vi.advanceTimersByTime(2000)
    expect(onDone.mock.calls.length).toBeGreaterThanOrEqual(2)
    player.destroy()
  })
})

describe('MlTerminal', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setLocale(zhTW)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('server-renders the finished transcript, styled as spans, never as HTML', async () => {
    const html = await renderToString(
      createSSRApp({ render: () => h(MlTerminal, { lines: [...script, { type: 'input', text: '<b onclick=x>hi</b>' }], copyable: true }) }),
    )
    expect(html).toContain('ml-terminal__seg--gold')
    expect(html).toContain('100%')
    expect(html).toContain('ml-terminal__line--idle')
    expect(html).toContain('&lt;b onclick=x&gt;hi&lt;/b&gt;')
    expect(html).not.toContain('<b onclick')
    expect(html).toContain('aria-label="終端機：malilion@den: ~"')
    expect(html).toContain('複製指令')
    // Replay only appears after something has actually played.
    expect(html).not.toContain('重播')
  })

  it('autoplays when in view, then offers a replay', async () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    const onDone = vi.fn()
    const w = mount(MlTerminal, { props: { lines: script, onDone }, attachTo: document.body })
    await nextTick()
    expect(w.find('.ml-terminal__line--idle').exists()).toBe(false)
    expect(w.classes()).toContain('ml-terminal--playing')
    // Screen readers still get everything.
    expect(w.find('pre.ml-visually-hidden').text()).toContain('npm i @malilion/ui')
    expect(w.find('.ml-terminal__body').attributes('aria-hidden')).toBe('true')
    vi.advanceTimersByTime(10000)
    await nextTick()
    expect(onDone).toHaveBeenCalledTimes(1)
    expect(w.find('.ml-terminal__line--idle').exists()).toBe(true)
    const replay = w.findAll('.ml-terminal__action').find((b) => b.text().includes('重播'))!
    expect(replay).toBeTruthy()
    await replay.trigger('click')
    expect(w.find('.ml-terminal__line--idle').exists()).toBe(false)
    w.unmount()
  })

  it('shows the final state right away with reduced motion', async () => {
    vi.stubGlobal('IntersectionObserver', undefined)
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce'), addEventListener() {}, removeEventListener() {} }))
    const w = mount(MlTerminal, { props: { lines: script } })
    await nextTick()
    expect(w.find('.ml-terminal__line--idle').exists()).toBe(true)
    ;(w.vm as unknown as { restart(): void }).restart()
    await nextTick()
    expect(w.find('.ml-terminal__line--idle').exists()).toBe(true)
    expect(w.findAll('.ml-terminal__action')).toHaveLength(0)
  })

  it('exposes play / pause / skip and copies the commands', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    setLocale(en)
    const w = mount(MlTerminal, { props: { lines: script, autoplay: false, copyable: true } })
    const vm = w.vm as unknown as { play(): void; pause(): void; skip(): void }
    expect(w.find('.ml-terminal__line--idle').exists()).toBe(true)
    vm.play()
    await nextTick()
    expect(w.findAll('.ml-terminal__line')).toHaveLength(0)
    vi.advanceTimersByTime(600)
    await nextTick()
    expect(w.find('.ml-terminal__line--input .ml-terminal__caret').exists()).toBe(true)
    vm.pause()
    await nextTick()
    expect(w.classes()).not.toContain('ml-terminal--playing')
    vm.skip()
    await nextTick()
    expect(w.emitted('done')).toHaveLength(1)
    await w.find('.ml-terminal__action:last-child').trigger('click')
    await Promise.resolve()
    expect(writeText).toHaveBeenCalledWith('npm i @malilion/ui')
    await nextTick()
    expect(w.emitted('copy')![0]).toEqual(['npm i @malilion/ui'])
    expect(w.text()).toContain('Copied')
    setLocale(zhTW)
  })
})
