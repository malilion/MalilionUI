// Auto-import resolver for unplugin-vue-components: only the components (and
// their styles) a page actually uses end up in the bundle.
//
//   // vite.config.ts
//   import Components from 'unplugin-vue-components/vite'
//   import { MalilionResolver } from '@malilion/ui/resolver'
//   plugins: [vue(), Components({ resolvers: [MalilionResolver()] })]
import map from './styles/on-demand/map.json'

export interface MalilionResolverOptions {
  /**
   * 'on-demand' (default): core.css plus each used component's own styles.
   * 'full': the whole style.css once. false: import no CSS (you load it yourself).
   */
  importStyle?: 'on-demand' | 'full' | false
}

/** Minimal shape of an unplugin-vue-components resolver, so there's no dependency on it. */
interface ComponentResolver {
  type: 'component' | 'directive'
  resolve: (name: string) => { name: string; from: string; sideEffects?: string | string[] } | undefined
}

const PKG = '@malilion/ui'
const components = new Set(Object.keys(map).filter((name) => name.startsWith('Ml')))
const directives: Record<string, { exportName: string; style: string }> = {
  PawStamp: { exportName: 'vPawStamp', style: 'v-paw-stamp' },
  Loading: { exportName: 'vLoading', style: 'v-loading' },
}

function styles(option: MalilionResolverOptions['importStyle'], file: string) {
  if (option === false) return undefined
  if (option === 'full') return `${PKG}/style.css`
  // A side-effect module importing core.css + exactly this component's stylesheets.
  return `${PKG}/on-demand/${file}`
}

export function MalilionResolver(options: MalilionResolverOptions = {}): ComponentResolver[] {
  const importStyle = options.importStyle ?? 'on-demand'
  return [
    {
      type: 'component',
      resolve: (name) => (components.has(name) ? { name, from: PKG, sideEffects: styles(importStyle, name) } : undefined),
    },
    {
      type: 'directive',
      resolve: (name) => {
        const d = directives[name]
        return d ? { name: d.exportName, from: PKG, sideEffects: styles(importStyle, d.style) } : undefined
      },
    },
  ]
}

export default MalilionResolver
