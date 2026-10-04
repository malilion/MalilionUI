// MlStickerPicker / StickerPicker — framework-free: search keywords, the recent
// list (memory + optional localStorage) and roving-grid keyboard maths.
import { CUTE_ICON_GROUPS, CUTE_ICON_NAMES, type CuteIconName } from './cute-icons'

export type StickerGroupId = 'recent' | (typeof CUTE_ICON_GROUPS)[number]['id']

/**
 * Extra search words per sticker (zh-TW first, then English), on top of the
 * icon's name and its localised label. Matched as substrings, case-insensitive.
 */
export const STICKER_KEYWORDS: Record<CuteIconName, string> = {
  lion: '獅子 獅 獅王 碼力獅 吼 lion king roar',
  cat: '貓 喵 貓咪 kitty meow',
  dog: '狗 汪 狗狗 puppy woof',
  bear: '熊 熊熊 teddy',
  bunny: '兔子 兔 rabbit',
  chick: '小雞 雞 小鳥 bird',
  panda: '熊貓 貓熊 團團 圓圓',
  frog: '青蛙 呱 toad',
  bubbleTea: '珍奶 珍珠奶茶 奶茶 手搖 飲料 boba milk tea drink',
  coffee: '咖啡 拿鐵 美式 latte cafe',
  donut: '甜甜圈 點心 doughnut',
  cupcake: '蛋糕 杯子蛋糕 生日 cake birthday',
  iceCream: '冰淇淋 霜淇淋 冰 dessert',
  strawberry: '草莓 水果 fruit berry',
  sun: '太陽 晴天 sunny',
  moon: '月亮 晚安 夜 night',
  cloud: '雲 多雲 cloudy',
  rain: '雨 下雨 雨天 umbrella',
  star: '星星 收藏 favorite',
  rainbow: '彩虹',
  flower: '花 花朵',
  sprout: '嫩芽 發芽 植物 plant leaf',
  heart: '愛心 愛 喜歡 love like',
  paw: '肉球 腳印 掌 paw print',
  gift: '禮物 送禮 present',
  rocket: '火箭 發射 上線 launch ship',
  bell: '鈴鐺 通知 提醒 notification',
  mail: '信 信件 郵件 email letter',
  chat: '對話 聊天 訊息 message talk',
  camera: '相機 拍照 照片 photo',
  music: '音樂 歌 song',
  game: '遊戲 電動 手把 gaming controller',
  trophy: '獎盃 冠軍 第一 winner award',
  crown: '皇冠 王 國王 king queen',
  bulb: '燈泡 點子 想法 idea',
  home: '家 房子 回家 house',
  ghost: '幽靈 鬼 萬聖節 boo halloween',
  cyberLion: '機械獅 賽博 獅子 cyber robot lion',
  robot: '機器人 ai bot',
  chip: '晶片 半導體 處理器 cpu processor',
  laptop: '筆電 電腦 computer',
  terminal: '終端機 指令 命令列 console shell cli',
  bolt: '閃電 電 快 fast lightning',
  shield: '盾牌 安全 防護 security',
  gear: '齒輪 設定 settings',
  key: '鑰匙 密碼 password',
  lock: '鎖 上鎖 隱私 private',
  database: '資料庫 資料 data db',
  bug: '蟲 臭蟲 錯誤 debug',
  signal: '訊號 網路 wifi network',
  battery: '電池 電量 充電 charge power',
  sparkle: '閃亮 閃閃 亮晶晶 新 shine new',
}

/** "bubbleTea" → "bubble tea". */
const words = (name: string) => name.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase()

/** Does `name` match the search `query`? Every space-separated term has to hit. */
export function stickerMatches(name: CuteIconName, query: string, label = ''): boolean {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (!terms.length) return true
  const hay = `${name.toLowerCase()} ${words(name)} ${label.toLowerCase()} ${STICKER_KEYWORDS[name] ?? ''}`
  return terms.every((t) => hay.includes(t))
}

/** Stickers matching `query`, in gallery order. `labels` adds localised names. */
export function searchStickers(query: string, labels?: Partial<Record<CuteIconName, string>>): CuteIconName[] {
  return CUTE_ICON_NAMES.filter((n) => stickerMatches(n, query, labels?.[n]))
}

/** The names of a tab (a group id, or the recent list for `recent`). */
export function stickerGroup(id: StickerGroupId, recent: CuteIconName[]): CuteIconName[] {
  if (id === 'recent') return recent
  return CUTE_ICON_GROUPS.find((g) => g.id === id)?.names ?? []
}

export const STICKER_TABS: StickerGroupId[] = ['recent', ...CUTE_ICON_GROUPS.map((g) => g.id)]

/** Move `name` to the front of the recent list, keeping at most `max`. */
export function pushRecent(list: CuteIconName[], name: CuteIconName, max = 16): CuteIconName[] {
  return [name, ...list.filter((n) => n !== name)].slice(0, Math.max(0, max))
}

const isName = (v: unknown): v is CuteIconName => typeof v === 'string' && Object.prototype.hasOwnProperty.call(STICKER_KEYWORDS, v)

/** Read a saved recent list; anything unreadable gives []. */
export function loadRecent(key: string | undefined): CuteIconName[] {
  if (!key) return []
  try {
    const raw = globalThis.localStorage?.getItem(key)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter(isName) : []
  } catch {
    return []
  }
}

/** Save the recent list; storage being full or blocked is ignored. */
export function saveRecent(key: string | undefined, list: CuteIconName[]) {
  if (!key) return
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(list))
  } catch {
    /* private mode, quota, blocked storage */
  }
}

/**
 * Where focus goes in a grid of `count` cells, `cols` wide, for a key press;
 * null for keys the grid does not handle.
 */
export function gridMove(index: number, key: string, count: number, cols: number): number | null {
  if (count <= 0) return null
  const last = count - 1
  switch (key) {
    case 'ArrowRight':
      return Math.min(last, index + 1)
    case 'ArrowLeft':
      return Math.max(0, index - 1)
    case 'ArrowDown':
      return index + cols <= last ? index + cols : index
    case 'ArrowUp':
      return index - cols >= 0 ? index - cols : index
    case 'Home':
      return 0
    case 'End':
      return last
    default:
      return null
  }
}

/** Next tab for ←/→/Home/End in a tab list of `count`; null otherwise. */
export function tabMove(index: number, key: string, count: number): number | null {
  if (key === 'ArrowRight') return (index + 1) % count
  if (key === 'ArrowLeft') return (index - 1 + count) % count
  if (key === 'Home') return 0
  if (key === 'End') return count - 1
  return null
}

/** The sticker drawn on each group's tab (the recent tab uses a clock). */
export const STICKER_TAB_ICONS: Record<Exclude<StickerGroupId, 'recent'>, CuteIconName> = {
  animals: 'cat',
  food: 'bubbleTea',
  nature: 'flower',
  things: 'heart',
  tech: 'robot',
}

/** Where a popup waits before it is measured: off screen but still focusable. */
export const OFFSCREEN = { left: '-9999px', top: '0px' } as const

export interface PopupRect {
  top: number
  bottom: number
  left: number
  right: number
}

/**
 * Viewport position (px) of a fixed popup next to its trigger: the `placement`
 * side first, flipped when it does not fit, then kept 8px inside the viewport.
 * (Fixed + portalled, so a clip-path on the trigger's parents, like
 * MlChatInput's chamfer, cannot cut it off.)
 */
export function popupPosition(
  trigger: PopupRect,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
  placement: 'top' | 'bottom',
  align: 'start' | 'end',
  gap = 8,
): { left: number; top: number; placement: 'top' | 'bottom' } {
  const margin = 8
  const above = trigger.top - gap - size.height
  const below = trigger.bottom + gap
  let side = placement
  if (side === 'top' && above < margin && below + size.height <= viewport.height - margin) side = 'bottom'
  else if (side === 'bottom' && below + size.height > viewport.height - margin && above >= margin) side = 'top'
  const rawLeft = align === 'end' ? trigger.right - size.width : trigger.left
  const left = Math.max(margin, Math.min(rawLeft, viewport.width - size.width - margin))
  return { left, top: side === 'top' ? above : below, placement: side }
}

/**
 * The theme in effect where the trigger sits (e.g. inside <MlConfigProvider theme="light">),
 * so the panel — portalled to <body> — can carry it along.
 */
export function inheritedTheme(el: Element | null | undefined): string | undefined {
  return el?.closest('[data-ml-theme]')?.getAttribute('data-ml-theme') ?? undefined
}
