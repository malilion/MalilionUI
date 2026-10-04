// Glyphs for MlThemeToggle / <ThemeToggle> (24×24, stroked with currentColor).
export const themeIcons = {
  sun: 'M12 7.5a4.5 4.5 0 1 0 0 9a4.5 4.5 0 1 0 0-9zM12 2v2.2M12 19.8V22M4.93 4.93l1.55 1.55M17.52 17.52l1.55 1.55M2 12h2.2M19.8 12H22M4.93 19.07l1.55-1.55M17.52 6.48l1.55-1.55',
  moon: 'M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z',
  system: 'M3 4.5h18v11.5H3zM8.5 20.5h7M12 16v4.5',
} as const

export type ThemeIconName = keyof typeof themeIcons
