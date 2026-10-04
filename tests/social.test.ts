// MlStickerPicker, MlComments, MlSwipeStack and MlInbox: the shared logic, then the Vue components.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { MlComments, MlConfigProvider, MlInbox, MlStickerPicker, MlSwipeStack, en } from '../src'
import { CUTE_ICON_GROUPS, CUTE_ICON_NAMES } from '../src/components/cute-icons'
import { daysAgo, relativeTime, relativeUnit, toIso } from '../src/components/relative-time'
import {
  STICKER_KEYWORDS,
  gridMove,
  loadRecent,
  popupPosition,
  pushRecent,
  saveRecent,
  searchStickers,
  stickerMatches,
  tabMove,
} from '../src/components/stickers'
import {
  addComment,
  commentPath,
  commentTree,
  countComments,
  sortComments,
  toggleCommentLike,
  visibleReplies,
  type MlComment,
} from '../src/components/comments'
import { dragRotation, flyOut, stampStrength, swipeDecision } from '../src/components/swipe-stack'
import { inboxBadge, inboxCounts, inboxDismiss, inboxFilter, inboxGroups, inboxMarkAllRead, inboxMarkRead, type MlInboxItem } from '../src/components/inbox'
import { zhTW } from '../src/locale-data'

let wrapper: VueWrapper | undefined
afterEach(async () => {
  // A drag eats the click right after it (swallowNextClick); let that window pass.
  await new Promise((r) => setTimeout(r, 0))
  wrapper?.unmount()
  wrapper = undefined
  vi.useRealTimers()
  vi.restoreAllMocks()
  document.body.innerHTML = ''
  localStorage.clear()
})

const MIN = 60_000
const NOW = new Date('2026-10-04T12:00:00')

/* ── Relative time ──────────────────────────────────────── */
describe('relative time', () => {
  it('picks a unit and wording per locale', () => {
    expect(relativeTime(NOW.getTime() - 3 * MIN, NOW, 'zh-TW', '剛剛')).toBe('3 分鐘前')
    expect(relativeTime(NOW.getTime() - 3 * MIN, NOW, 'en', 'just now')).toBe('3 minutes ago')
    expect(relativeTime(NOW.getTime() - 10_000, NOW, 'zh-TW', '剛剛')).toBe('剛剛')
    expect(relativeTime(NOW.getTime() - 5 * 60 * MIN, NOW, 'en', '')).toBe('5 hours ago')
    expect(relativeTime(NOW.getTime() - 24 * 60 * MIN, NOW, 'en', '')).toBe('yesterday')
    expect(relativeTime(NOW.getTime() + 2 * 60 * MIN, NOW, 'en', '')).toBe('in 2 hours')
    expect(relativeTime('nonsense', NOW, 'en', '')).toBe('')
  })

  it('unit boundaries round up to the next unit', () => {
    expect(relativeUnit(-59.6 * MIN)).toEqual({ value: -1, unit: 'hour' })
    expect(relativeUnit(-50_000)).toEqual({ value: -1, unit: 'minute' })
    expect(relativeUnit(-35 * 24 * 60 * MIN)).toEqual({ value: -1, unit: 'month' })
    expect(relativeUnit(-400 * 24 * 60 * MIN)).toEqual({ value: -1, unit: 'year' })
  })

  it('calendar days and ISO', () => {
    expect(daysAgo(new Date('2026-10-04T00:05:00'), NOW)).toBe(0)
    expect(daysAgo(new Date('2026-10-03T23:55:00'), NOW)).toBe(1)
    expect(daysAgo(new Date('2026-09-30T08:00:00'), NOW)).toBe(4)
    expect(toIso(0)).toBe('1970-01-01T00:00:00.000Z')
    expect(toIso('bad')).toBeUndefined()
  })
})

/* ── Stickers ───────────────────────────────────────────── */
describe('sticker logic', () => {
  it('every icon has keywords and a zh-TW / en name', () => {
    for (const n of CUTE_ICON_NAMES) {
      expect(STICKER_KEYWORDS[n], n).toBeTruthy()
      expect(zhTW.sticker.names[n], n).toBeTruthy()
      expect(en.sticker.names[n], n).toBeTruthy()
    }
    expect(CUTE_ICON_GROUPS.flatMap((g) => g.names).sort()).toEqual(CUTE_ICON_NAMES.slice().sort())
  })

  it('search matches names, words of camelCase names and zh-TW keywords', () => {
    expect(searchStickers('獅子')).toEqual(['lion', 'cyberLion'])
    expect(searchStickers('珍珠奶茶')).toEqual(['bubbleTea'])
    expect(searchStickers('珍奶')).toEqual(['bubbleTea'])
    expect(searchStickers('bubble tea')).toEqual(['bubbleTea'])
    expect(searchStickers('ROCKET')).toEqual(['rocket'])
    expect(searchStickers('')).toHaveLength(CUTE_ICON_NAMES.length)
    expect(searchStickers('沒有這種貼圖')).toEqual([])
    // Localised labels count too.
    expect(stickerMatches('frog', 'kermit', 'Kermit')).toBe(true)
  })

  it('recent list: front, unique, capped; storage is optional and fault tolerant', () => {
    expect(pushRecent(['cat', 'dog'], 'dog')).toEqual(['dog', 'cat'])
    expect(pushRecent(['cat', 'dog', 'lion'], 'sun', 3)).toEqual(['sun', 'cat', 'dog'])
    saveRecent('k', ['cat', 'lion'])
    expect(loadRecent('k')).toEqual(['cat', 'lion'])
    localStorage.setItem('bad', '{not json')
    expect(loadRecent('bad')).toEqual([])
    localStorage.setItem('mixed', JSON.stringify(['cat', 'nope', 3]))
    expect(loadRecent('mixed')).toEqual(['cat'])
    expect(loadRecent(undefined)).toEqual([])
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(() => saveRecent('k', ['dog'])).not.toThrow()
  })

  it('grid and tab keys', () => {
    // 8 cells, 3 wide
    expect(gridMove(0, 'ArrowRight', 8, 3)).toBe(1)
    expect(gridMove(7, 'ArrowRight', 8, 3)).toBe(7)
    expect(gridMove(1, 'ArrowDown', 8, 3)).toBe(4)
    expect(gridMove(6, 'ArrowDown', 8, 3)).toBe(6)
    expect(gridMove(4, 'ArrowUp', 8, 3)).toBe(1)
    expect(gridMove(4, 'End', 8, 3)).toBe(7)
    expect(gridMove(4, 'Home', 8, 3)).toBe(0)
    expect(gridMove(4, 'a', 8, 3)).toBeNull()
    expect(tabMove(0, 'ArrowLeft', 4)).toBe(3)
    expect(tabMove(3, 'ArrowRight', 4)).toBe(0)
  })

  it('popup position: preferred side, flip, and clamped inside the viewport', () => {
    const vp = { width: 400, height: 600 }
    const size = { width: 300, height: 200 }
    expect(popupPosition({ top: 500, bottom: 530, left: 20, right: 50 }, size, vp, 'top', 'start')).toEqual({ left: 20, top: 292, placement: 'top' })
    // No room above: flips under.
    expect(popupPosition({ top: 40, bottom: 70, left: 20, right: 50 }, size, vp, 'top', 'start')).toEqual({ left: 20, top: 78, placement: 'bottom' })
    // Aligned to the end and kept 8px from the left edge.
    expect(popupPosition({ top: 500, bottom: 530, left: 20, right: 50 }, size, vp, 'top', 'end').left).toBe(8)
    expect(popupPosition({ top: 500, bottom: 530, left: 380, right: 400 }, size, vp, 'top', 'start').left).toBe(92)
  })
})

/* ── Comments ───────────────────────────────────────────── */
const at = (min: number) => NOW.getTime() - min * MIN
const thread: MlComment[] = [
  {
    id: 1,
    author: { name: '阿哲' },
    content: '第一則',
    time: at(60),
    likes: 2,
    replies: [
      { id: 11, author: { name: '小美' }, content: '回覆一', time: at(50), replies: [{ id: 111, author: { name: '阿哲' }, content: '回覆再回覆', time: at(40), replies: [{ id: 1111, author: { name: '小美' }, content: '第四層', time: at(30) }] }] },
      { id: 12, author: { name: 'Leo' }, content: '回覆二', time: at(45) },
    ],
  },
  { id: 2, author: { name: 'Yuki' }, content: '<b>不是粗體</b>', time: at(5), likes: 9 },
  { id: 3, author: { name: '老王' }, content: '最舊', time: at(90), likes: 2 },
]

describe('comment logic', () => {
  it('sorts by time or popularity', () => {
    expect(sortComments(thread, 'newest').map((c) => c.id)).toEqual([2, 1, 3])
    expect(sortComments(thread, 'oldest').map((c) => c.id)).toEqual([3, 1, 2])
    // Popular: likes, then newest.
    expect(sortComments(thread, 'popular').map((c) => c.id)).toEqual([2, 1, 3])
  })

  it('nests to maxDepth and flattens the rest as "reply to"', () => {
    const tree = commentTree(thread, 'newest', 1)
    const first = tree.find((n) => n.comment.id === 1)!
    expect(first.children.map((n) => [n.comment.id, n.depth, n.replyTo])).toEqual([
      [11, 1, undefined],
      [111, 1, '小美'],
      [1111, 1, '阿哲'],
      [12, 1, undefined],
    ])
    const deep = commentTree(thread, 'newest', 3).find((n) => n.comment.id === 1)!
    expect(deep.children[0].children[0].children[0].comment.id).toBe(1111)
    // Flat.
    expect(commentTree(thread, 'oldest', 0).map((n) => n.comment.id)).toEqual([3, 1, 11, 111, 1111, 12, 2])
  })

  it('counts, likes, adds and finds paths without mutating', () => {
    expect(countComments(thread)).toBe(7)
    const { list, liked } = toggleCommentLike(thread, 111)
    expect(liked).toBe(true)
    expect(list).not.toBe(thread)
    expect(list[0].replies![0].replies![0].likes).toBe(1)
    expect(thread[0].replies![0].replies![0].likes).toBeUndefined()
    expect(list[1]).toBe(thread[1])
    expect(toggleCommentLike(list, 111).list[0].replies![0].replies![0]).toMatchObject({ liked: false, likes: 0 })
    expect(toggleCommentLike(thread, 'missing').list).toBe(thread)
    const added = addComment(thread, { id: 'n', author: { name: '你' }, content: 'hi', time: at(0) }, 12)
    expect(added[0].replies![1].replies!.map((c) => c.id)).toEqual(['n'])
    expect(addComment(thread, { id: 'top', author: { name: '你' }, content: 'hi', time: at(0) })).toHaveLength(4)
    expect(commentPath(thread, 1111)).toEqual([1, 11, 111, 1111])
    expect(commentPath(thread, 'x')).toEqual([])
  })

  it('collapses long reply lists', () => {
    const node = commentTree(thread, 'newest', 1).find((n) => n.comment.id === 1)!
    expect(visibleReplies(node, false, 2)).toMatchObject({ hidden: 2, collapsible: true })
    expect(visibleReplies(node, true, 2)).toMatchObject({ hidden: 0, collapsible: true })
    expect(visibleReplies(node, false, 4)).toMatchObject({ hidden: 0, collapsible: false })
  })
})

/* ── Swipe stack ────────────────────────────────────────── */
describe('swipe stack logic', () => {
  const box = { width: 300, height: 400 }
  it('distance or fling decides; a fling against the drag cancels', () => {
    expect(swipeDecision(100, 0, 0, 0, box)).toBe('right')
    expect(swipeDecision(-100, 0, 0, 0, box)).toBe('left')
    expect(swipeDecision(60, 0, 0, 0, box)).toBeNull()
    expect(swipeDecision(30, 0, 0.8, 0, box)).toBe('right')
    expect(swipeDecision(120, 0, -0.8, 0, box)).toBeNull()
    // Up only when enabled and mostly vertical.
    expect(swipeDecision(10, -150, 0, 0, box)).toBeNull()
    expect(swipeDecision(10, -150, 0, 0, { ...box, up: true })).toBe('up')
    expect(swipeDecision(10, -40, 0, -0.9, { ...box, up: true })).toBe('up')
    expect(swipeDecision(50, 0, 0, 0, { ...box, threshold: 0.1 })).toBe('right')
  })

  it('tilt, stamps and fly-out', () => {
    expect(dragRotation(0, 300)).toBe(0)
    expect(dragRotation(300, 300)).toBe(15)
    expect(dragRotation(-1000, 300)).toBe(-15)
    expect(stampStrength(45, 0, box)).toEqual({ right: 0.5, left: 0, up: 0 })
    expect(stampStrength(-200, 0, box).left).toBe(1)
    expect(stampStrength(0, -120, { ...box, up: true })).toEqual({ right: 0, left: 0, up: 1 })
    expect(flyOut('right', 300, 400).x).toBeGreaterThan(300)
    expect(flyOut('left', 300, 400).x).toBeLessThan(-300)
    expect(flyOut('up', 300, 400).y).toBeLessThan(-400)
  })
})

/* ── Inbox ──────────────────────────────────────────────── */
const notes: MlInboxItem[] = [
  { id: 'a', title: '提到你', type: 'mention', time: new Date('2026-10-04T11:58:00') },
  { id: 'b', title: '部署完成', type: 'success', time: new Date('2026-10-04T08:00:00'), read: true },
  { id: 'c', title: '昨天的', time: new Date('2026-10-03T21:00:00') },
  { id: 'd', title: '很久以前', type: 'mention', time: new Date('2026-09-20T10:00:00'), read: true },
]

describe('inbox logic', () => {
  it('filters, counts and groups by day', () => {
    expect(inboxFilter(notes, 'unread').map((i) => i.id)).toEqual(['a', 'c'])
    expect(inboxFilter(notes, 'mention').map((i) => i.id)).toEqual(['a', 'd'])
    expect(inboxCounts(notes)).toEqual({ all: 4, unread: 2, mention: 2 })
    expect(inboxGroups(notes, NOW).map((g) => [g.id, g.items.map((i) => i.id)])).toEqual([
      ['today', ['a', 'b']],
      ['yesterday', ['c']],
      ['earlier', ['d']],
    ])
    expect(inboxGroups([], NOW)).toEqual([])
  })

  it('read, read all, dismiss and the badge', () => {
    expect(inboxMarkRead(notes, 'a')[0].read).toBe(true)
    expect(inboxMarkRead(notes, 'b')).toBe(notes)
    expect(inboxMarkAllRead(notes).every((i) => i.read)).toBe(true)
    expect(inboxMarkAllRead(inboxMarkAllRead(notes))).toEqual(inboxMarkAllRead(notes))
    expect(inboxDismiss(notes, 'c').map((i) => i.id)).toEqual(['a', 'b', 'd'])
    expect(inboxBadge(5)).toBe('5')
    expect(inboxBadge(120)).toBe('99+')
    expect(inboxBadge(12, 9)).toBe('9+')
  })
})

/* ── Vue components ─────────────────────────────────────── */
const key = (el: Element, k: string, init: KeyboardEventInit = {}) => el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, ...init }))

describe('MlStickerPicker', () => {
  it('tabs, search, keyboard grid and select with recent + storage', async () => {
    localStorage.setItem('stk', JSON.stringify(['frog']))
    wrapper = mount(MlStickerPicker, { props: { storageKey: 'stk', columns: 4 }, attachTo: document.body })
    await nextTick()
    const items = () => wrapper!.findAll('.ml-sticker-picker__item')
    expect(items().map((b) => b.attributes('data-name'))).toEqual(CUTE_ICON_GROUPS[0].names)
    expect(items()[0].attributes('tabindex')).toBe('0')
    expect(items()[0].attributes('aria-label')).toBe('獅子')

    // Arrow keys move the roving tabindex.
    ;(items()[0].element as HTMLElement).focus()
    key(items()[0].element, 'ArrowDown')
    await nextTick()
    expect(document.activeElement).toBe(items()[4].element)
    expect(items()[4].attributes('tabindex')).toBe('0')
    key(items()[4].element, 'End')
    await nextTick()
    expect(document.activeElement).toBe(items()[items().length - 1].element)

    await items()[2].trigger('click')
    expect(wrapper.emitted('select')).toEqual([['dog']])
    expect(JSON.parse(localStorage.getItem('stk')!)).toEqual(['dog', 'frog'])

    // Recent tab
    await wrapper.get('[data-tab="recent"]').trigger('click')
    expect(items().map((b) => b.attributes('data-name'))).toEqual(['dog', 'frog'])

    // Tabs: arrow keys switch and focus.
    const tablist = wrapper.get('[role="tablist"]')
    key(tablist.element, 'ArrowRight')
    await nextTick()
    await nextTick()
    expect(wrapper.get('.ml-sticker-picker__tab--active').attributes('data-tab')).toBe('animals')
    expect(document.activeElement).toBe(wrapper.get('[data-tab="animals"]').element)

    // Search across groups; Enter picks the first hit.
    await wrapper.get('input').setValue('珍奶')
    expect(items().map((b) => b.attributes('data-name'))).toEqual(['bubbleTea'])
    expect(wrapper.get('[aria-live]').text()).toBe('找到 1 個貼圖')
    key(wrapper.get('input').element, 'Enter')
    expect(wrapper.emitted('select')![1]).toEqual(['bubbleTea'])
    await wrapper.get('input').setValue('zzz')
    expect(wrapper.get('.ml-sticker-picker__empty').text()).toBe('找不到符合的貼圖')
  })

  it('variant passes through; recent tab can be hidden', () => {
    wrapper = mount(MlStickerPicker, { props: { variant: 'metal', recent: false } })
    expect(wrapper.find('[data-tab="recent"]').exists()).toBe(false)
    expect(wrapper.findAll('.ml-sticker-picker__item svg').every((s) => s.classes().includes('ml-cute--metal'))).toBe(true)
  })

  it('trigger mode: opens a portalled dialog, Escape and selecting close it and return focus', async () => {
    wrapper = mount(MlStickerPicker, { props: { trigger: true }, attachTo: document.body })
    const btn = wrapper.get('.ml-sticker-picker__trigger')
    expect(document.querySelector('.ml-sticker-picker__panel')).toBeNull()
    await btn.trigger('click')
    await nextTick()
    const panel = document.querySelector('.ml-sticker-picker__panel--popup')!
    expect(panel.getAttribute('role')).toBe('dialog')
    expect(panel.parentElement).toBe(document.body)
    expect(btn.attributes('aria-expanded')).toBe('true')
    expect(document.activeElement).toBe(panel.querySelector('input'))
    key(panel.querySelector('input')!, 'Escape')
    await nextTick()
    await nextTick()
    expect(document.querySelector('.ml-sticker-picker__panel')).toBeNull()
    expect(document.activeElement).toBe(btn.element)
    expect(wrapper.emitted('update:open')).toEqual([[true], [false]])

    await btn.trigger('click')
    await nextTick()
    ;(document.querySelector('.ml-sticker-picker__item') as HTMLButtonElement).click()
    await nextTick()
    expect(wrapper.emitted('select')).toEqual([['lion']])
    expect(document.querySelector('.ml-sticker-picker__panel')).toBeNull()

    // Outside pointer closes.
    await btn.trigger('click')
    await nextTick()
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    await nextTick()
    expect(document.querySelector('.ml-sticker-picker__panel')).toBeNull()
  })
})

describe('MlComments', () => {
  it('renders a threaded, accessible list with relative times and text-only content', () => {
    wrapper = mount(MlComments, { props: { comments: thread, now: NOW, maxDepth: 1, collapseAfter: 10 } })
    expect(wrapper.get('.ml-comments__title').text()).toContain('7 則')
    const articles = wrapper.findAll('article')
    expect(articles).toHaveLength(7)
    expect(articles[0].get('h4').text()).toBe('Yuki')
    expect(articles[0].attributes('aria-labelledby')).toBe(articles[0].get('h4').attributes('id'))
    expect(articles[0].get('time').text()).toBe('5 分鐘前')
    // Plain text: the tags are shown, not parsed.
    expect(articles[0].get('.ml-comments__content').text()).toBe('<b>不是粗體</b>')
    expect(articles[0].find('b').exists()).toBe(false)
    expect(wrapper.findAll('.ml-comments__reply-to').map((p) => p.text())).toEqual(['回覆 @小美', '回覆 @阿哲'])
    expect(wrapper.findAll('ol.ml-comments__replies')).toHaveLength(1)
  })

  it('sorts, likes and collapses', async () => {
    wrapper = mount(MlComments, { props: { comments: thread, now: NOW, 'onUpdate:comments': (v: MlComment[]) => wrapper!.setProps({ comments: v }) } })
    const sortBtns = wrapper.findAll('.ml-comments__sort-btn')
    await sortBtns[1].trigger('click')
    expect(wrapper.emitted('update:sort')).toEqual([['oldest']])
    expect(wrapper.findAll('.ml-comments__list > li > article h4').map((h) => h.text())).toEqual(['老王', '阿哲', 'Yuki'])

    const like = wrapper.findAll('.ml-comments__like')[0]
    expect(like.attributes('aria-pressed')).toBe('false')
    await like.trigger('click')
    expect(wrapper.emitted('like')).toEqual([[3, true]])
    expect(wrapper.findAll('.ml-comments__like')[0].attributes('aria-pressed')).toBe('true')
    expect(wrapper.findAll('.ml-comments__like-count')[0].text()).toBe('3')

    // maxDepth 2: 1111 flattens under 111's level; collapseAfter 3 is not reached here.
    await wrapper.setProps({ collapseAfter: 1 })
    const toggle = wrapper.get('.ml-comments__toggle')
    expect(toggle.text()).toBe('展開 1 則回覆')
    expect(toggle.attributes('aria-expanded')).toBe('false')
    await toggle.trigger('click')
    expect(wrapper.get('.ml-comments__toggle').text()).toBe('收起回覆')
  })

  it('composer and reply box: Ctrl+Enter submits, Escape cancels, currentUser adds to v-model', async () => {
    wrapper = mount(MlComments, {
      props: { comments: thread, now: NOW, currentUser: { name: '你' }, 'onUpdate:comments': (v: MlComment[]) => wrapper!.setProps({ comments: v }) },
      attachTo: document.body,
    })
    const top = wrapper.get('.ml-comments__composer textarea')
    expect(wrapper.get('.ml-comments__composer .ml-comments__submit').attributes('disabled')).toBeDefined()
    await top.setValue('  新留言  ')
    key(top.element, 'Enter', { ctrlKey: true })
    await nextTick()
    expect(wrapper.emitted('submit')![0]).toEqual(['新留言', undefined])
    expect(wrapper.get('[aria-live]').text()).toBe('已送出留言')
    expect((top.element as HTMLTextAreaElement).value).toBe('')
    expect(wrapper.findAll('.ml-comments__list > li > article h4')[0].text()).toBe('你')
    expect(wrapper.findAll('.ml-comments__list > li > article time')[0].text()).toBe('剛剛')

    // Reply to Yuki (second top-level now)
    const replyBtn = wrapper.findAll('.ml-comments__reply-btn')[1]
    await replyBtn.trigger('click')
    await nextTick()
    const box = wrapper.get('.ml-comments__editor--reply textarea')
    expect(document.activeElement).toBe(box.element)
    expect(box.attributes('aria-label')).toBe('回覆 Yuki…')
    key(box.element, 'Escape')
    await nextTick()
    await nextTick()
    expect(wrapper.find('.ml-comments__editor--reply').exists()).toBe(false)
    expect(document.activeElement).toBe(replyBtn.element)

    await replyBtn.trigger('click')
    await wrapper.get('.ml-comments__editor--reply textarea').setValue('同意！')
    await wrapper.get('.ml-comments__editor--reply').trigger('submit')
    expect(wrapper.emitted('submit')![1]).toEqual(['同意！', 2])
    expect(wrapper.text()).toContain('同意！')
  })

  it('without currentUser only emits; readonly hides writing; empty state', async () => {
    wrapper = mount(MlComments, { props: { comments: [] } })
    expect(wrapper.find('.ml-empty').exists()).toBe(true)
    expect(wrapper.get('.ml-empty__title').text()).toBe('還沒有留言')
    await wrapper.get('textarea').setValue('hi')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('submit')).toEqual([['hi', undefined]])
    expect(wrapper.emitted('update:comments')).toBeUndefined()
    await wrapper.setProps({ readonly: true, comments: thread })
    expect(wrapper.find('textarea').exists()).toBe(false)
    expect(wrapper.find('.ml-comments__reply-btn').exists()).toBe(false)
    expect(wrapper.get('.ml-comments__like').attributes('disabled')).toBeDefined()
  })

  it('English locale', () => {
    wrapper = mount({ render: () => h(MlConfigProvider, { locale: en }, () => h(MlComments, { comments: thread, now: NOW, collapseAfter: 1 })) })
    expect(wrapper.get('time').text()).toBe('5 minutes ago')
    expect(wrapper.get('.ml-comments__toggle').text()).toBe('Show 1 more reply')
  })
})

describe('MlSwipeStack', () => {
  const items = ['A', 'B', 'C', 'D']
  const mountStack = (props: Record<string, unknown> = {}) =>
    mount(MlSwipeStack, {
      props: { items, itemLabel: (s: unknown) => String(s), ...props },
      slots: { default: ({ item }: { item: unknown }) => h('b', { class: 'face' }, String(item)) },
      attachTo: document.body,
    })

  it('draws depth cards, top first; buttons swipe, undo; emits and announces', async () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList)
    wrapper = mountStack()
    expect(wrapper.findAll('.ml-swipe-stack__card').map((c) => c.text().slice(0, 1))).toEqual(['A', 'B', 'C'])
    expect(wrapper.findAll('.ml-swipe-stack__card')[1].attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('.ml-swipe-stack__card--top').attributes('aria-label')).toBe('第 1 張，共 4 張')
    expect(wrapper.findAll('.ml-swipe-stack__stamp').map((s) => s.text())).toEqual(['喜歡', '略過'])
    expect(wrapper.get('.ml-swipe-stack__btn--undo').attributes('disabled')).toBeDefined()

    await wrapper.get('.ml-swipe-stack__btn--like').trigger('click')
    expect(wrapper.emitted('swipe')).toEqual([['A', 'right', 0]])
    expect(wrapper.emitted('update:index')).toEqual([[1]])
    expect(wrapper.get('[aria-live]').text()).toBe('喜歡：A')
    // Reduced motion: no fly-out card.
    expect(wrapper.find('.ml-swipe-stack__card--leaving').exists()).toBe(false)

    await wrapper.get('.ml-swipe-stack__btn--nope').trigger('click')
    expect(wrapper.emitted('swipe')![1]).toEqual(['B', 'left', 1])
    await wrapper.get('.ml-swipe-stack__btn--undo').trigger('click')
    expect(wrapper.emitted('undo')).toEqual([['B', 1]])
    expect(wrapper.get('.ml-swipe-stack__card--top').text()).toContain('B')
    expect(wrapper.get('[aria-live]').text()).toBe('已復原上一張')
  })

  it('keyboard: arrows, Up only when enabled, Backspace / Ctrl+Z undo; empty at the end', async () => {
    wrapper = mountStack({ up: true })
    const root = wrapper.get('.ml-swipe-stack').element
    key(root, 'ArrowLeft')
    await nextTick()
    key(root, 'ArrowUp')
    await nextTick()
    expect(wrapper.emitted('swipe')!.map((e) => e[1])).toEqual(['left', 'up'])
    // Animated fly-out
    expect(wrapper.find('.ml-swipe-stack__card--leaving-up').exists()).toBe(true)
    key(root, 'z', { ctrlKey: true })
    await nextTick()
    expect(wrapper.emitted('undo')).toHaveLength(1)
    expect(wrapper.find('.ml-swipe-stack__card--back-up').exists()).toBe(true)
    key(root, 'Backspace')
    await nextTick()
    expect(wrapper.emitted('undo')).toHaveLength(2)
    for (const k of ['ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowRight']) {
      key(root, k)
      await nextTick()
    }
    expect(wrapper.emitted('empty')).toHaveLength(1)
    expect(wrapper.find('.ml-swipe-stack__card--top').exists()).toBe(false)
    expect(wrapper.get('.ml-swipe-stack__empty').text()).toContain('沒有更多卡片了')
    expect(wrapper.get('.ml-swipe-stack__btn--like').attributes('disabled')).toBeDefined()
  })

  it('pointer drag past the threshold throws the card; a short drag springs back', async () => {
    // A slow clock: 100ms between samples, so no move reads as a fling.
    let clock = 0
    vi.spyOn(performance, 'now').mockImplementation(() => (clock += 100))
    wrapper = mountStack()
    const deck = wrapper.get('.ml-swipe-stack__deck').element as HTMLElement
    vi.spyOn(deck, 'getBoundingClientRect').mockReturnValue({ width: 300, height: 400, top: 0, left: 0, right: 300, bottom: 400, x: 0, y: 0, toJSON() {} })
    const pe = (type: string, x: number, y = 0) => new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, button: 0, pointerType: 'mouse', bubbles: true })
    deck.dispatchEvent(pe('pointerdown', 10))
    window.dispatchEvent(pe('pointermove', 40))
    await nextTick()
    const top = wrapper.get('.ml-swipe-stack__card--top')
    expect(top.classes()).toContain('ml-swipe-stack__card--dragging')
    expect(top.attributes('style')).toContain('--_ss-x: 30px')
    window.dispatchEvent(pe('pointerup', 40))
    await nextTick()
    expect(wrapper.emitted('swipe')).toBeUndefined()
    expect(wrapper.get('.ml-swipe-stack__card--top').classes()).not.toContain('ml-swipe-stack__card--dragging')

    deck.dispatchEvent(pe('pointerdown', 10))
    window.dispatchEvent(pe('pointermove', -100))
    window.dispatchEvent(pe('pointermove', -140))
    window.dispatchEvent(pe('pointerup', -140))
    await nextTick()
    expect(wrapper.emitted('swipe')).toEqual([['A', 'left', 0]])
  })

  it('exposed swipe() / undo() and localisable stamps', async () => {
    wrapper = mountStack({ likeText: '要', nopeText: '不要', up: true, superText: '超要' })
    expect(wrapper.findAll('.ml-swipe-stack__stamp').map((s) => s.text())).toEqual(['要', '不要', '超要'])
    const vm = wrapper.vm as unknown as { swipe: (d: string) => boolean; undo: () => boolean }
    expect(vm.undo()).toBe(false)
    expect(vm.swipe('right')).toBe(true)
    expect(vm.undo()).toBe(true)
    await wrapper.setProps({ up: false })
    expect(vm.swipe('up')).toBe(false)
  })
})

describe('MlInbox', () => {
  const mountInbox = (props: Record<string, unknown> = {}) =>
    mount(MlInbox, {
      props: { items: notes, now: NOW, 'onUpdate:items': (v: MlInboxItem[]) => wrapper!.setProps({ items: v }), ...props },
      attachTo: document.body,
    })

  it('bell with unread badge opens a dialog; focus goes to the first unread; Escape returns to the bell', async () => {
    wrapper = mountInbox()
    const bell = wrapper.get('.ml-inbox__bell')
    expect(bell.attributes('aria-label')).toBe('通知，2 則未讀')
    expect(wrapper.get('.ml-inbox__badge').text()).toBe('2')
    expect(wrapper.find('.ml-inbox__panel').exists()).toBe(false)
    await bell.trigger('click')
    await nextTick()
    const panel = wrapper.get('.ml-inbox__panel')
    expect(panel.attributes('role')).toBe('dialog')
    expect(document.activeElement?.closest('.ml-inbox__item')?.querySelector('.ml-inbox__item-title')?.textContent).toBe('提到你')
    key(document.activeElement!, 'Escape')
    await nextTick()
    await nextTick()
    expect(wrapper.find('.ml-inbox__panel').exists()).toBe(false)
    expect(document.activeElement).toBe(bell.element)
  })

  it('groups, tabs with counts, read, read all, dismiss, keyboard', async () => {
    wrapper = mountInbox({ inline: true })
    expect(wrapper.find('.ml-inbox__bell').exists()).toBe(false)
    expect(wrapper.get('.ml-inbox__panel').attributes('role')).toBe('region')
    expect(wrapper.findAll('.ml-inbox__group-title').map((g) => g.text())).toEqual(['今天', '昨天', '更早'])
    expect(wrapper.findAll('.ml-inbox__tab').map((t) => t.text())).toEqual(['全部4', '未讀2', '提及2'])
    expect(wrapper.findAll('.ml-inbox__time')[0].text()).toBe('2 分鐘前')

    await wrapper.findAll('.ml-inbox__main')[0].trigger('click')
    expect(wrapper.emitted('read')).toEqual([['a']])
    expect(wrapper.emitted('select')![0][0]).toMatchObject({ id: 'a' })
    expect(wrapper.findAll('.ml-inbox__item--unread')).toHaveLength(1)

    await wrapper.findAll('.ml-inbox__tab')[1].trigger('click')
    expect(wrapper.emitted('update:tab')).toEqual([['unread']])

    await wrapper.get('.ml-inbox__read-all').trigger('click')
    expect(wrapper.emitted('read-all')).toHaveLength(1)
    expect(wrapper.get('[aria-live]').text()).toBe('已全部標為已讀')
    expect(wrapper.get('.ml-inbox__read-all').attributes('disabled')).toBeDefined()

    await wrapper.findAll('.ml-inbox__tab')[0].trigger('click')
    const mains = () => wrapper!.findAll('.ml-inbox__main')
    ;(mains()[0].element as HTMLElement).focus()
    key(mains()[0].element, 'ArrowDown')
    expect(document.activeElement).toBe(mains()[1].element)
    key(mains()[1].element, 'End')
    expect(document.activeElement).toBe(mains()[3].element)
    key(mains()[3].element, 'Delete')
    await nextTick()
    await nextTick()
    expect(wrapper.emitted('dismiss')).toEqual([['d']])
    expect(mains()).toHaveLength(3)
    expect(document.activeElement).toBe(mains()[2].element)
    await wrapper.findAll('.ml-inbox__dismiss')[0].trigger('click')
    expect(wrapper.emitted('dismiss')![1]).toEqual(['a'])
  })

  it('empty states per tab use the napping lion; links stay safe', async () => {
    wrapper = mountInbox({ inline: true, items: [{ id: 1, title: 'x', time: NOW, href: 'javascript:alert(1)' }, { id: 2, title: 'y', time: NOW, href: '/ok', read: true }] })
    expect(wrapper.findAll('.ml-inbox__main')[0].element.tagName).toBe('BUTTON')
    expect(wrapper.findAll('.ml-inbox__main')[1].attributes('href')).toBe('/ok')
    await wrapper.findAll('.ml-inbox__tab')[2].trigger('click')
    expect(wrapper.get('.ml-empty__title').text()).toBe('還沒有人提到你')
    expect(wrapper.find('.ml-empty__lion').exists()).toBe(true)
  })

  it('English locale', () => {
    wrapper = mount({ render: () => h(MlConfigProvider, { locale: en }, () => h(MlInbox, { items: notes, now: NOW, inline: true })) })
    expect(wrapper.findAll('.ml-inbox__group-title').map((g) => g.text())).toEqual(['Today', 'Yesterday', 'Earlier'])
    expect(wrapper.findAll('.ml-inbox__time')[0].text()).toBe('2 minutes ago')
  })
})
