export interface ReactField {
  type: string
  optional: boolean
  doc: string
  inherited?: boolean
}

/** Every component the React build exports. */
export function collectReactComponents(): string[]
/** Exported imperative handle types (BarcodeHandle…). */
export function collectReactHandles(): string[]
/** Component name (no "Ml") → its props, read from src/react with the TypeScript checker. */
export function collectReactApi(): Record<string, Record<string, ReactField>>
