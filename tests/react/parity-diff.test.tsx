// Markup parity for CodeDiff (see parity.test.tsx).
import { describe, expect, it } from 'vitest'
import * as V from '../../src'
import * as R from '../../src/react/diff'
import { react, vue } from './parity-utils'

const OLD = `<script setup lang="ts">
import { ref } from 'vue'
const roars = ref(0)
<\/script>

<template>
  <MlButton @click="roars++">吼</MlButton>
</template>
` + Array.from({ length: 12 }, (_, i) => `<!-- ${i} -->`).join('\n')
const NEW = OLD.replace('ref(0)', 'ref(1)').replace('>吼<', '>吼 × {{ roars }}<').replace('<!-- 11 -->', '<!-- 11 -->\n<style>.x{}</style>')

const PATCH = `diff --git a/a.ts b/a.ts
--- a/a.ts
+++ b/a.ts
@@ -1,3 +1,3 @@ fn
 one
-two
+TWO
 three
\\ No newline at end of file
diff --git a/b.png b/b.png
Binary files a/b.png and b/b.png differ
diff --git a/c.txt b/d.txt
rename from c.txt
rename to d.txt
--- a/c.txt
+++ b/d.txt
@@ -1 +1,2 @@
 x
+<b>y</b>
`

const cases: [string, Record<string, unknown>, () => string][] = [
  ['split', { oldCode: OLD, newCode: NEW, filename: 'Roar.vue' }, () => react(<R.CodeDiff oldCode={OLD} newCode={NEW} filename="Roar.vue" />)],
  ['unified', { oldCode: OLD, newCode: NEW, filename: 'Roar.vue', view: 'unified' }, () => react(<R.CodeDiff oldCode={OLD} newCode={NEW} filename="Roar.vue" view="unified" />)],
  ['no numbers, wrap, plain', { oldCode: OLD, newCode: NEW, lineNumbers: false, wrap: true, plain: true, viewToggle: false, navigation: false }, () => react(<R.CodeDiff oldCode={OLD} newCode={NEW} lineNumbers={false} wrap plain viewToggle={false} navigation={false} />)],
  ['no context folding', { oldCode: OLD, newCode: NEW, context: -1, lang: 'html', label: 'L', maxHeight: 300 }, () => react(<R.CodeDiff oldCode={OLD} newCode={NEW} context={-1} lang="html" label="L" maxHeight={300} />)],
  ['patch split', { patch: PATCH }, () => react(<R.CodeDiff patch={PATCH} />)],
  ['patch unified', { patch: PATCH, view: 'unified', ignoreWhitespace: true }, () => react(<R.CodeDiff patch={PATCH} defaultView="unified" ignoreWhitespace />)],
  ['identical', { oldCode: 'a\nb', newCode: 'a\nb' }, () => react(<R.CodeDiff oldCode={'a\nb'} newCode={'a\nb'} />)],
  ['empty', {}, () => react(<R.CodeDiff />)],
  ['added file', { oldCode: '', newCode: 'x\n', filename: 'new.sh' }, () => react(<R.CodeDiff oldCode="" newCode={'x\n'} filename="new.sh" />)],
  ['eof', { oldCode: 'a\n', newCode: 'a', wordDiff: false }, () => react(<R.CodeDiff oldCode={'a\n'} newCode="a" wordDiff={false} />)],
]

describe('React ↔ Vue markup parity: code diff', () => {
  for (const [name, props, fromReact] of cases) {
    it(name, async () => {
      expect(fromReact()).toBe(await vue(V.MlCodeDiff, props))
    })
  }
})
