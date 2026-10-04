// MlSliderCaptcha, MlScratchCard, MlGridLottery and MlGacha: the shared maths, then the Vue components.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick } from 'vue'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { MlConfigProvider, MlGacha, MlGridLottery, MlScratchCard, MlSliderCaptcha, en } from '../src'
import { GRID_RING, gachaCapsules, gridCell, gridSchedule, lotteryDecide, lotteryTone, type MlLotteryPrize } from '../src/components/lottery'
import { CAPTCHA_START, captchaHit, captchaMax, captchaPiecePath, captchaRandom, captchaTarget } from '../src/components/captcha'

let wrapper: VueWrapper | undefined
afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  vi.useRealTimers()
  document.body.innerHTML = ''
})

const prizes: MlLotteryPrize[] = [
  { label: '獅王', icon: 'crown', tone: 'gold' },
  { label: '珍奶', icon: 'bubbleTea' },
  { label: '咖啡', icon: 'coffee' },
  { label: '甜甜圈', icon: 'donut' },
  { label: '再接再厲', disabled: true },
  { label: '禮物', icon: 'gift' },
  { label: '貼圖', image: '/sticker.png' },
  { label: '紅利', icon: 'star', weight: 0 },
]

/* ── Maths ──────────────────────────────────────────────── */
describe('lottery maths', () => {
  it('lotteryDecide: explicit index, beforeDraw answers, cancel and weights', async () => {
    expect(lotteryDecide(prizes, 2, undefined)).toEqual({ sync: 2 })
    expect(lotteryDecide(prizes, undefined, () => 3)).toEqual({ sync: 3 })
    expect(lotteryDecide(prizes, undefined, () => false)).toEqual({ sync: -1 })
    // Disabled and zero-weight prizes never win by weight.
    for (let i = 0; i < 40; i++) {
      const d = lotteryDecide(prizes, undefined, undefined) as { sync: number }
      expect([0, 1, 2, 3, 5, 6]).toContain(d.sync)
    }
    const later = lotteryDecide(prizes, undefined, () => Promise.resolve(5)) as { later: Promise<number> }
    await expect(later.later).resolves.toBe(5)
    const cancelled = lotteryDecide(prizes, undefined, () => Promise.resolve(false)) as { later: Promise<number> }
    await expect(cancelled.later).resolves.toBe(-1)
    // An out-of-range answer falls back to the weights.
    const odd = lotteryDecide(prizes, undefined, () => 99) as { sync: number }
    expect(odd.sync).toBeGreaterThanOrEqual(0)
  })

  it('tones rotate when a prize has none', () => {
    expect(lotteryTone(prizes, 0)).toBe('gold')
    expect(lotteryTone(prizes, 1)).toBe('bean')
    expect(lotteryTone(prizes, 2)).toBe('tech')
  })

  it('grid ring and schedule: the light ends on the target after the laps', () => {
    expect(GRID_RING.slice().sort()).toEqual([0, 1, 2, 3, 5, 6, 7, 8])
    expect(gridCell(8)).toBe(0)
    for (const [from, to] of [
      [7, 0],
      [0, 0],
      [3, 6],
      [6, 2],
    ]) {
      const delays = gridSchedule(from, to, 3, 4000)
      expect((from + delays.length) % 8).toBe(to)
      expect(delays.length).toBeGreaterThanOrEqual(24)
      const total = delays.reduce((s, d) => s + d, 0)
      expect(total).toBeGreaterThan(3500)
      expect(total).toBeLessThan(4500)
      // It brakes: the last step is the slowest.
      expect(delays.at(-1)).toBe(Math.max(...delays))
    }
  })

  it('gacha capsules sit inside the dome', () => {
    const caps = gachaCapsules(['gold', 'bean'], 14)
    expect(caps).toHaveLength(14)
    for (const c of caps) expect(Math.hypot(c.x - 50, c.y - 50)).toBeLessThan(44)
    expect(caps[0].tone).toBe('gold')
    expect(caps[1].tone).toBe('bean')
    expect(gachaCapsules(['gold'], 14, 3)).toEqual(gachaCapsules(['gold'], 14, 3))
  })

  it('captcha: the gap leaves room for the knobs; hits within tolerance', () => {
    for (let seed = 1; seed < 30; seed++) {
      const t = captchaTarget(320, 160, captchaRandom(seed))
      expect(t.x).toBeGreaterThan(CAPTCHA_START + 44)
      expect(t.x).toBeLessThanOrEqual(captchaMax(320))
      expect(t.y).toBeGreaterThan(10)
      expect(t.y + 44).toBeLessThanOrEqual(160)
    }
    expect(captchaPiecePath(100, 50)).toMatch(/^M100 50L.+z$/)
    expect(captchaHit(103, { x: 100, y: 0 }, 6)).toBe(true)
    expect(captchaHit(107, { x: 100, y: 0 }, 6)).toBe(false)
  })
})

/* ── MlSliderCaptcha ────────────────────────────────────── */
describe('MlSliderCaptcha', () => {
  const keyOn = async (w: VueWrapper, key: string, shiftKey = false) => {
    await w.get('[role="slider"]').trigger('keydown', { key, shiftKey })
  }

  it('renders the picture, gap, piece and slider', () => {
    wrapper = mount(MlSliderCaptcha, { props: { seed: 4 } })
    expect(wrapper.classes()).toEqual(['ml-captcha', 'ml-captcha--gold', 'ml-captcha--idle'])
    expect(wrapper.findAll('use')).toHaveLength(2)
    expect(wrapper.findAll('.ml-captcha__paw')).toHaveLength(5)
    const slider = wrapper.get('[role="slider"]')
    expect(slider.attributes('aria-valuenow')).toBe(String(CAPTCHA_START))
    expect(slider.attributes('aria-valuemax')).toBe(String(captchaMax(320)))
    expect(wrapper.get('.ml-captcha__hint').text()).toBe('向右拖動滑塊，完成拼圖')
  })

  it('keyboard: slide onto the gap and press Enter to pass', async () => {
    wrapper = mount(MlSliderCaptcha, { props: { seed: 4, target: { x: 120, y: 40 } } })
    await keyOn(wrapper, 'End')
    await keyOn(wrapper, 'Home')
    for (let i = 0; i < 11; i++) await keyOn(wrapper, 'ArrowRight', true)
    for (let x = CAPTCHA_START + 110; x < 120; x++) await keyOn(wrapper, 'ArrowRight')
    expect(wrapper.get('[role="slider"]').attributes('aria-valuenow')).toBe('120')
    await keyOn(wrapper, 'Enter')
    await flushPromises()
    expect(wrapper.classes()).toContain('ml-captcha--success')
    const [attempt] = wrapper.emitted('success')![0] as [{ x: number; track: unknown[]; target: { x: number } }]
    expect(attempt.x).toBe(120)
    expect(attempt.target.x).toBe(120)
    expect(attempt.track.length).toBeGreaterThan(10)
    expect(wrapper.get('[role="slider"]').attributes('aria-disabled')).toBe('true')
  })

  it('a miss shakes, slides back, and too many misses deal a new picture', async () => {
    vi.useFakeTimers()
    wrapper = mount(MlSliderCaptcha, { props: { seed: 4, maxAttempts: 2 } })
    const gap = () => wrapper!.get('.ml-captcha__gap').attributes('d')
    const first = gap()
    await keyOn(wrapper, 'Enter')
    await flushPromises()
    expect(wrapper.classes()).toContain('ml-captcha--fail')
    expect(wrapper.get('.ml-captcha__note').text()).toBe('沒有對準，再試一次')
    vi.advanceTimersByTime(700)
    await nextTick()
    expect(wrapper.classes()).toContain('ml-captcha--idle')
    expect(gap()).toBe(first)
    await keyOn(wrapper, 'Enter')
    await flushPromises()
    vi.advanceTimersByTime(700)
    await nextTick()
    expect(wrapper.emitted('fail')).toHaveLength(2)
    expect(wrapper.emitted('refresh')).toHaveLength(1)
    expect(gap()).not.toBe(first)
  })

  it('verify decides, asynchronously too', async () => {
    let settle!: (ok: boolean) => void
    const verify = vi.fn(() => new Promise<boolean>((r) => (settle = r)))
    wrapper = mount(MlSliderCaptcha, { props: { seed: 2, verify } })
    await keyOn(wrapper, 'Enter')
    expect(wrapper.classes()).toContain('ml-captcha--checking')
    expect(wrapper.get('.ml-captcha__hint').text()).toBe('驗證中…')
    settle(true)
    await flushPromises()
    expect(wrapper.classes()).toContain('ml-captcha--success')
    expect(verify).toHaveBeenCalledWith(expect.objectContaining({ x: CAPTCHA_START }))
  })

  it('the refresh button deals a new gap; disabled ignores keys', async () => {
    wrapper = mount(MlSliderCaptcha, { props: { seed: 3 } })
    const before = wrapper.get('.ml-captcha__gap').attributes('d')
    await wrapper.get('.ml-captcha__refresh').trigger('click')
    expect(wrapper.get('.ml-captcha__gap').attributes('d')).not.toBe(before)
    await wrapper.setProps({ disabled: true })
    await keyOn(wrapper, 'End')
    expect(wrapper.get('[role="slider"]').attributes('aria-valuenow')).toBe(String(CAPTCHA_START))
    expect(wrapper.classes()).toContain('ml-captcha--disabled')
  })
})

/* ── MlScratchCard ──────────────────────────────────────── */
describe('MlScratchCard', () => {
  it('hides the prize until revealed; the button reveals it', async () => {
    wrapper = mount(MlScratchCard, { props: { confetti: false }, slots: { default: '<b class="prize">大獎</b>' } })
    const prize = wrapper.get('.ml-scratch__prize')
    expect(prize.attributes('aria-hidden')).toBe('true')
    expect(prize.attributes('inert')).toBeDefined()
    expect(wrapper.get('.ml-scratch__cover').text()).toBe('刮開這裡')
    await wrapper.get('.ml-scratch__reveal').trigger('click')
    expect(wrapper.classes()).toContain('ml-scratch--revealed')
    expect(wrapper.get('.ml-scratch__prize').attributes('aria-hidden')).toBeUndefined()
    expect(wrapper.find('.ml-scratch__reveal').exists()).toBe(false)
    expect(wrapper.emitted('reveal')).toHaveLength(1)
    expect(wrapper.emitted('update:revealed')).toEqual([[true]])
    expect(wrapper.get('[aria-live]').text()).toBe('已刮開')
  })

  it('v-model:revealed and reset()', async () => {
    wrapper = mount(MlScratchCard, { props: { revealed: true, tone: 'tech', coverText: '刮刮看' } })
    expect(wrapper.classes()).toEqual(expect.arrayContaining(['ml-scratch--tech', 'ml-scratch--revealed']))
    expect(wrapper.get('.ml-scratch__cover').text()).toBe('刮刮看')
    ;(wrapper.vm as unknown as { reset: () => void }).reset()
    await nextTick()
    expect(wrapper.emitted('update:revealed')).toEqual([[false]])
  })

  it('English and disabled', () => {
    wrapper = mount({ render: () => h(MlConfigProvider, { locale: en }, () => h(MlScratchCard, { disabled: true })) })
    expect(wrapper.get('.ml-scratch__cover').text()).toBe('Scratch here')
    expect(wrapper.get('.ml-scratch__reveal').attributes('disabled')).toBeDefined()
  })
})

/* ── MlGridLottery ──────────────────────────────────────── */
describe('MlGridLottery', () => {
  it('lays eight prizes round the button, clockwise', () => {
    wrapper = mount(MlGridLottery, { props: { prizes, chances: 3 } })
    const cells = wrapper.get('.ml-grid-lottery__board').element.children
    expect(cells).toHaveLength(9)
    expect(cells[4].tagName).toBe('BUTTON')
    expect(cells[4].textContent).toContain('× 3')
    // Ring 3 (甜甜圈) sits in cell 5, ring 7 (紅利) in cell 3.
    expect(cells[5].getAttribute('aria-label')).toBe('甜甜圈')
    expect(cells[3].getAttribute('aria-label')).toBe('紅利')
    expect(wrapper.findAll('.ml-cute')).toHaveLength(6)
    expect(wrapper.find('img').attributes('src')).toBe('/sticker.png')
    expect(wrapper.find('.ml-grid-lottery__cell--disabled').attributes('aria-label')).toBe('再接再厲')
  })

  it('draw(i) runs the light and lands there', async () => {
    vi.useFakeTimers()
    wrapper = mount(MlGridLottery, { props: { prizes, confetti: false } })
    const vm = wrapper.vm as unknown as { draw: (i?: number) => Promise<number> }
    const result = vm.draw(5)
    await nextTick()
    expect(wrapper.classes()).toContain('ml-grid-lottery--running')
    expect(wrapper.get('.ml-grid-lottery__go').attributes('disabled')).toBeDefined()
    expect(await vm.draw(1)).toBe(-1)
    vi.advanceTimersByTime(5000)
    await expect(result).resolves.toBe(5)
    await nextTick()
    expect(wrapper.emitted('start')).toHaveLength(1)
    expect(wrapper.emitted('result')).toEqual([[prizes[5], 5]])
    expect(wrapper.get('.ml-grid-lottery__cell--won').attributes('aria-label')).toBe('禮物')
    expect(wrapper.get('[aria-live]').text()).toBe('恭喜！抽中：禮物')
  })

  it('a server draw cruises, then brakes onto the answer', async () => {
    vi.useFakeTimers()
    let answer!: (i: number) => void
    wrapper = mount(MlGridLottery, { props: { prizes, confetti: false, beforeDraw: () => new Promise<number>((r) => (answer = r)) } })
    await wrapper.get('.ml-grid-lottery__go').trigger('click')
    vi.advanceTimersByTime(2000)
    await nextTick()
    expect(wrapper.find('.ml-grid-lottery__cell--active').exists()).toBe(true)
    expect(wrapper.emitted('result')).toBeUndefined()
    answer(2)
    await flushPromises()
    vi.advanceTimersByTime(4000)
    await nextTick()
    expect(wrapper.emitted('result')).toEqual([[prizes[2], 2]])
  })

  it('beforeDraw false, chances 0 and errors', async () => {
    const onError = vi.fn()
    wrapper = mount(MlGridLottery, { props: { prizes, beforeDraw: () => false } })
    await wrapper.get('.ml-grid-lottery__go').trigger('click')
    expect(wrapper.emitted('start')).toBeUndefined()
    await wrapper.setProps({ beforeDraw: () => Promise.reject(new Error('down')), onError })
    vi.useFakeTimers()
    await wrapper.get('.ml-grid-lottery__go').trigger('click')
    await flushPromises()
    expect(onError).toHaveBeenCalled()
    expect(wrapper.get('[aria-live]').text()).toBe('這次沒有抽中')
    await wrapper.setProps({ chances: 0 })
    expect(wrapper.get('.ml-grid-lottery__go').attributes('disabled')).toBeDefined()
  })
})

/* ── MlGacha ────────────────────────────────────────────── */
describe('MlGacha', () => {
  it('a machine full of capsules in the prizes’ tones', () => {
    wrapper = mount(MlGacha, { props: { prizes: prizes.slice(0, 3), chances: 2 } })
    expect(wrapper.classes()).toEqual(['ml-gacha', 'ml-gacha--idle'])
    expect(wrapper.findAll('.ml-gacha__pile .ml-gacha__capsule')).toHaveLength(14)
    expect(wrapper.find('.ml-gacha__capsule--gold').exists()).toBe(true)
    expect(wrapper.find('.ml-gacha__capsule--bean').exists()).toBe(true)
    expect(wrapper.get('.ml-gacha__turn').text()).toBe('轉一下 × 2')
    expect(wrapper.find('.ml-gacha__drop').exists()).toBe(false)
  })

  it('turn → drop → open shows the prize; again puts it away', async () => {
    vi.useFakeTimers()
    wrapper = mount(MlGacha, { props: { prizes, confetti: false }, attachTo: document.body })
    const vm = wrapper.vm as unknown as { draw: (i?: number) => Promise<number> }
    const result = vm.draw(1)
    await nextTick()
    expect(wrapper.classes()).toContain('ml-gacha--turning')
    vi.advanceTimersByTime(1100)
    await nextTick()
    expect(wrapper.classes()).toContain('ml-gacha--dropping')
    expect(wrapper.find('.ml-gacha__drop.ml-gacha__capsule--bean').exists()).toBe(true)
    vi.advanceTimersByTime(750)
    await nextTick()
    expect(wrapper.classes()).toContain('ml-gacha--opening')
    vi.advanceTimersByTime(650)
    await expect(result).resolves.toBe(1)
    await nextTick()
    expect(wrapper.classes()).toContain('ml-gacha--open')
    expect(wrapper.get('.ml-gacha__prize-label').text()).toBe('珍奶')
    expect(wrapper.emitted('result')).toEqual([[prizes[1], 1]])
    await nextTick()
    expect(document.activeElement).toBe(wrapper.get('.ml-gacha__again').element)
    await wrapper.get('.ml-gacha__again').trigger('click')
    expect(wrapper.classes()).toContain('ml-gacha--idle')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('a server draw keeps shaking until the answer', async () => {
    vi.useFakeTimers()
    let answer!: (i: number) => void
    wrapper = mount(MlGacha, { props: { prizes, confetti: false, beforeDraw: () => new Promise<number>((r) => (answer = r)) } })
    await wrapper.get('.ml-gacha__turn').trigger('click')
    vi.advanceTimersByTime(3000)
    await nextTick()
    expect(wrapper.classes()).toEqual(expect.arrayContaining(['ml-gacha--turning', 'ml-gacha--waiting']))
    answer(0)
    await flushPromises()
    vi.advanceTimersByTime(2000)
    await nextTick()
    expect(wrapper.get('.ml-gacha__prize-label').text()).toBe('獅王')
  })

  it('English labels', () => {
    wrapper = mount({ render: () => h(MlConfigProvider, { locale: en }, () => [h(MlGacha, { prizes }), h(MlGridLottery, { prizes })]) })
    expect(wrapper.get('.ml-gacha__turn').text()).toBe('Turn')
    expect(wrapper.get('.ml-grid-lottery__go').text()).toBe('Draw')
    expect(wrapper.get('.ml-gacha').attributes('aria-label')).toBe('Gacha machine')
  })
})
