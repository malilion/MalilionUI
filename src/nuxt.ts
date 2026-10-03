// Nuxt module: `modules: ['@malilion/ui/nuxt']`.
// Auto-imports every component and composable, registers the directives, sets
// the UI language, and loads either the full stylesheet or only the styles of
// the components each page actually uses.
import { addComponent, addImports, addPluginTemplate, addVitePlugin, defineNuxtModule } from '@nuxt/kit'
import type { Nuxt } from '@nuxt/schema'
import map from './styles/on-demand/map.json'

export interface ModuleOptions {
  /**
   * 'on-demand' (default): each component's own styles, added where it's used.
   * 'full': the whole style.css once. false: load the CSS yourself.
   */
  css?: 'on-demand' | 'full' | false
  /** Built-in UI language. Default: Traditional Chinese. */
  locale?: 'zhTW' | 'en'
  /** Register components globally under this prefix instead of "Ml" (e.g. "Lion" → <LionButton>). */
  prefix?: string
}

const PKG = '@malilion/ui'
const components = Object.keys(map).filter((name) => name.startsWith('Ml'))

/**
 * Prepends the on-demand style entry for every Ml component a module uses:
 * template references (`resolveComponent("MlCard")`, before Nuxt's
 * auto-import rewrites them) and explicit imports from the package.
 */
function onDemandStyles() {
  const known = new Set(components)
  return {
    name: 'malilion-ui:on-demand-styles',
    enforce: 'post' as const,
    transform(code: string, id: string) {
      if (id.includes('node_modules') || !/Ml[A-Z]|ml-[a-z]|@malilion\/ui/.test(code)) return
      const used = new Set<string>()
      // Compiled templates ask for components by name; Nuxt swaps these for imports later.
      for (const m of code.matchAll(/resolveComponent\(\s*["']([\w-]+)["']/g)) {
        const pascal = m[1].replace(/(^|-)(\w)/g, (_, __, c: string) => c.toUpperCase())
        if (known.has(pascal)) used.add(pascal)
      }
      // Nuxt writes either the bare specifier or the resolved file path of the package entry.
      for (const m of code.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']([^"']*@malilion\/ui(?:\/dist\/malilion-ui\.js)?)["']/g)) {
        for (const part of m[1].split(',')) {
          const name = part.trim().split(/\s+as\s+/)[0]
          if (known.has(name)) used.add(name)
          if (name === 'vPawStamp') used.add('v-paw-stamp')
          if (name === 'vLoading') used.add('v-loading')
        }
      }
      if (!used.size) return
      const imports = [...used].map((name) => `import '${PKG}/on-demand/${name}';`).join('\n')
      return { code: `${imports}\n${code}`, map: null }
    },
  }
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: PKG,
    configKey: 'malilion',
    compatibility: { nuxt: '>=3.0.0' },
  },
  defaults: {
    css: 'on-demand',
  },
  setup(options: ModuleOptions, nuxt: Nuxt) {
    // Components: <MlButton> etc. resolve to named exports of the package.
    const prefix = options.prefix ?? 'Ml'
    for (const name of components) {
      addComponent({ name: name.replace(/^Ml/, prefix), export: name, filePath: PKG })
    }

    // Composables. confirm()/toast() keep their names only via the use* forms,
    // so they never shadow window.confirm in user code.
    addImports([
      { name: 'useToast', from: PKG },
      { name: 'useConfirm', from: PKG },
      { name: 'useLocale', as: 'useMlLocale', from: PKG },
      { name: 'setLocale', as: 'setMlLocale', from: PKG },
    ])

    // Styles.
    if (options.css === 'full') nuxt.options.css.push(`${PKG}/style.css`)
    if (options.css === 'on-demand') {
      // Directives are registered app-wide, so their styles always load.
      nuxt.options.css.push(`${PKG}/on-demand/v-paw-stamp`, `${PKG}/on-demand/v-loading`)
      addVitePlugin(onDemandStyles())
    }

    // Directives + locale, on both server and client.
    addPluginTemplate({
      filename: 'malilion-ui.mjs',
      getContents: () => `import { defineNuxtPlugin } from '#app'
import { vPawStamp, vLoading${options.locale ? `, setLocale, ${options.locale}` : ''} } from '${PKG}'

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('paw-stamp', vPawStamp)
  nuxtApp.vueApp.directive('loading', vLoading)
${options.locale ? `  setLocale(${options.locale})\n` : ''}})
`,
    })

    // The package ships .vue-free ESM, but make sure Nuxt transpiles it with the app.
    nuxt.options.build.transpile.push(PKG)
  },
})
