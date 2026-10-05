// Read the React components' real props from src/react with the TypeScript
// checker, so the docs site's React mode lists names that exist.
//   collectReactApi() → { Button: { variant: { type: "MlButtonVariant", optional: true, doc: "…" }, … }, … }
// Attributes inherited from React's DOM typings are listed with `inherited: true`.
import { fileURLToPath } from 'node:url'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import ts from 'typescript'

// path.resolve rather than new URL(): test DOMs (happy-dom) replace the global URL.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Every component the React build exports (PascalCase functions / consts, including @malilion/ui/react/editor). */
export function collectReactComponents() {
  const dir = join(root, 'src/react')
  const names = new Set()
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.tsx'))) {
    for (const m of readFileSync(join(dir, file), 'utf8').matchAll(/^export (?:function|const) ([A-Z]\w*)/gm)) names.add(m[1])
  }
  return [...names].sort()
}

/** Exported imperative handle types (BarcodeHandle, ScrollbarHandle…), for typing refs. */
export function collectReactHandles() {
  const dir = join(root, 'src/react')
  const names = new Set()
  for (const file of readdirSync(dir).filter((f) => /\.tsx?$/.test(f))) {
    for (const m of readFileSync(join(dir, file), 'utf8').matchAll(/^export (?:interface|type) ([A-Z]\w*Handle)\b/gm)) names.add(m[1])
  }
  return [...names].sort()
}

export function collectReactApi() {
  // The main entry plus the separately published editor entry.
  const entries = ['src/react/index.ts', 'src/react/editor.tsx'].map((f) => join(root, f))
  const config = ts.getParsedCommandLineOfConfigFile(join(root, 'tsconfig.react.json'), {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} })
  const program = ts.createProgram(entries, { ...config.options, noEmit: true })
  const checker = program.getTypeChecker()
  const exported = entries.flatMap((entry) => {
    const source = program.getSourceFile(entry)
    const module = source && checker.getSymbolAtLocation(source)
    return module ? checker.getExportsOfModule(module) : []
  })
  const out = {}
  for (const sym of exported) {
    const name = sym.getName()
    const props = /^(.+)Props$/.exec(name)
    if (!props) continue
    const target = sym.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(sym) : sym
    if (!(target.flags & (ts.SymbolFlags.Interface | ts.SymbolFlags.TypeAlias))) continue
    const type = checker.getDeclaredTypeOfSymbol(target)
    const fields = {}
    for (const p of checker.getPropertiesOfType(type)) {
      const decl = p.valueDeclaration ?? p.declarations?.[0]
      if (!decl) continue
      // Attributes inherited from React's DOM typings are kept for matching only.
      if (decl.getSourceFile().fileName.includes('node_modules')) {
        fields[p.getName()] = { type: '', optional: true, doc: '', inherited: true }
        continue
      }
      // The type as written in the source reads best (ReactNode, MlDatePickerType…).
      const written = decl.type?.getText().replace(/\s+/g, ' ')
      const t = checker.getTypeOfSymbolAtLocation(p, decl)
      fields[p.getName()] = {
        type: written ?? checker.typeToString(checker.getNonNullableType(t), decl, ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseSingleQuotesForStringLiteralType),
        optional: !!(p.flags & ts.SymbolFlags.Optional),
        doc: ts.displayPartsToString(p.getDocumentationComment(checker)).replace(/\s+/g, ' ').trim(),
      }
    }
    out[props[1]] = fields
  }
  return out
}
