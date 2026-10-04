// MlAurora / Aurora: palettes and the inline variables. All the motion lives in aurora.css.

export type MlAuroraPalette = 'pride' | 'circuit' | 'bean' | 'night'

export const AURORA_PALETTES: MlAuroraPalette[] = ['pride', 'circuit', 'bean', 'night']

/** Number of light blobs drawn (custom colours are cycled to fill them). */
export const AURORA_BLOBS = 4

/**
 * Inline CSS variables for an aurora: intensity (0–1), speed (multiplier) and,
 * for a custom palette, one `--_au-cN` per blob. Values are rounded so the
 * server and client render the same string.
 */
export function auroraVars(opts: { intensity?: number; speed?: number; colors?: readonly string[] }): Record<string, string> {
  const intensity = Math.min(1, Math.max(0, opts.intensity ?? 0.7))
  const speed = Math.max(0.05, opts.speed ?? 1)
  const vars: Record<string, string> = {
    '--_au-intensity': String(Math.round(intensity * 100) / 100),
    '--_au-speed': String(Math.round(speed * 100) / 100),
  }
  const colors = opts.colors?.filter(Boolean) ?? []
  if (colors.length) for (let i = 0; i < AURORA_BLOBS; i++) vars[`--_au-c${i + 1}`] = colors[i % colors.length]
  return vars
}

/** A palette name, or `custom` when the caller passed an array of colours. */
export function auroraPalette(palette: MlAuroraPalette | readonly string[] | undefined): MlAuroraPalette | 'custom' {
  if (Array.isArray(palette)) return palette.length ? 'custom' : 'pride'
  return AURORA_PALETTES.includes(palette as MlAuroraPalette) ? (palette as MlAuroraPalette) : 'pride'
}
