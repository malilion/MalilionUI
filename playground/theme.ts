// The docs site's theme store options — shared by main.ts and the <head> script
// vite.config.ts injects. 'ml-docs-theme' is the key the site always used, so a
// visitor's earlier choice carries over.
import type { MlThemeOptions } from '../src/theme'

export const docsTheme: MlThemeOptions = { storageKey: 'ml-docs-theme', defaultMode: 'dark' }
