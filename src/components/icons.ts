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
  up: 'M12 4l8 14H4z',
  down: 'M12 20L4 6h16z',
} as const

export type IconName = keyof typeof icons
