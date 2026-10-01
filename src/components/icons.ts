// 24×24 stroke icons shared by the components. Kept as path data so each
// component can inline exactly what it needs without an icon dependency.
export const icons = {
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  chevronDown: 'M6 9l6 6 6-6',
  info: 'M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM12 11v5M12 7.6v.1',
  success: 'M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM8.5 12.2l2.4 2.4 4.6-4.8',
  warning: 'M12 3.5L21.5 20h-19L12 3.5zM12 10v4.5M12 17.2v.1',
  danger: 'M8.3 3h7.4L21 8.3v7.4L15.7 21H8.3L3 15.7V8.3L8.3 3zM9 9l6 6M15 9l-6 6',
  chevronLeft: 'M15 6l-6 6 6 6',
  chevronRight: 'M9 6l6 6-6 6',
  home: 'M4 11l8-7 8 7M6 9.5V20h4.5v-6h3v6H18V9.5',
  search: 'M10.5 4a6.5 6.5 0 110 13 6.5 6.5 0 010-13zM15.5 15.5L21 21',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  upload: 'M7 18H6a4 4 0 01-.6-7.95A6 6 0 0117.2 8.1 4.5 4.5 0 0117.5 18H17M12 11v10M8.5 14.5L12 11l3.5 3.5',
  file: 'M6 3h8l4 4v14H6zM14 3v4h4',
  up: 'M12 4l8 14H4z',
  down: 'M12 20L4 6h16z',
} as const

export type IconName = keyof typeof icons
