<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useLocale } from '../locale'
import { decorateDiff, diffFileName, diffLangOf, diffModel, layoutDiff, type DiffFile, type DiffViewLine, type MlCodeDiffView } from '../diff'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    /** The old text (diffed against `newCode`). */
    oldCode?: string
    /** The new text. */
    newCode?: string
    /** A git-style unified diff instead of old / new code; may hold several files. */
    patch?: string
    /** File name shown in the header (old / new code mode). */
    filename?: string
    /** Highlighter language; guessed from the file name when left out. */
    lang?: string
    /** Skip syntax colouring. */
    plain?: boolean
    /** Unchanged lines kept around each change; longer runs fold. Negative never folds. */
    context?: number
    /** Ignore whitespace-only changes (like `git diff -w`). */
    ignoreWhitespace?: boolean
    /** Wrap long lines instead of scrolling sideways. */
    wrap?: boolean
    lineNumbers?: boolean
    /** Mark the exact changed words inside modified lines. */
    wordDiff?: boolean
    /** Split / unified switch in the header. */
    viewToggle?: boolean
    /** Previous / next change buttons (keys n / p work either way). */
    navigation?: boolean
    /** Scroll the diff inside this height (px number or CSS length). */
    maxHeight?: number | string
    /** Accessible name; defaults to "程式碼差異". */
    label?: string
    /** Past this many edits the diff stops looking for the optimum (speed cap). */
    maxEdits?: number
  }>(),
  { context: 3, lineNumbers: true, wordDiff: true, viewToggle: true, navigation: true, maxEdits: 1500 },
)

const emit = defineEmits<{ navigate: [index: number, total: number] }>()
const view = defineModel<MlCodeDiffView>('view', { default: 'split' })

const root = ref<HTMLElement>()
const files = computed(() =>
  diffModel({
    oldCode: props.oldCode,
    newCode: props.newCode,
    patch: props.patch,
    filename: props.filename,
    ignoreWhitespace: props.ignoreWhitespace,
    maxEdits: props.maxEdits,
  }),
)
const langOf = (f: DiffFile) => props.lang ?? diffLangOf(f.newName ?? f.oldName ?? props.filename)
const decorated = computed(() =>
  files.value.map((f) => decorateDiff(f, { lang: langOf(f), plain: props.plain, wordDiff: props.wordDiff, ignoreWhitespace: props.ignoreWhitespace })),
)
// Global index of each file's first change block.
const offsets = computed(() => {
  let n = 0
  return decorated.value.map((lines) => {
    const at = n
    n += lines.reduce((m, l) => Math.max(m, l.block + 1), 0)
    return at
  })
})
const total = computed(() => decorated.value.reduce((n, lines) => n + lines.reduce((m, l) => Math.max(m, l.block + 1), 0), 0))
const added = computed(() => files.value.reduce((n, f) => n + f.added, 0))
const removed = computed(() => files.value.reduce((n, f) => n + f.removed, 0))
const single = computed(() => files.value.length <= 1)
const title = computed(() => diffFileName(files.value[0] ?? { status: 'modified', oldName: null, newName: null }, props.filename ?? ''))
const badge = computed(() => props.lang ?? diffLangOf(title.value.split(' → ').pop()))

const expanded = ref(new Set<string>())
const current = ref(-1)
watch(files, () => {
  expanded.value = new Set()
  current.value = -1
})
const rows = computed(() =>
  decorated.value.map((lines, fi) =>
    layoutDiff(lines, { view: view.value, context: props.context, expanded: (s) => expanded.value.has(`${fi}:${s}`) }),
  ),
)
const cols = computed(() => (view.value === 'split' ? 2 : 1) + (props.lineNumbers ? 2 : 0))

function expand(fi: number, start: number) {
  expanded.value = new Set(expanded.value).add(`${fi}:${start}`)
}

/** Open every fold. */
function expandAll() {
  const next = new Set<string>()
  rows.value.forEach((list, fi) => list.forEach((r) => r.kind === 'fold' && next.add(`${fi}:${r.start}`)))
  expanded.value = new Set([...expanded.value, ...next])
}

function go(step: 1 | -1) {
  const n = total.value
  if (!n) return
  const next = current.value < 0 ? (step > 0 ? 0 : n - 1) : (current.value + step + n) % n
  current.value = next
  emit('navigate', next, n)
  nextTick(() => {
    const el = root.value?.querySelector<HTMLElement>(`[data-ml-diff-change="${next}"]`)
    if (!el) return
    el.focus({ preventScroll: true })
    const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView?.({ block: 'center', behavior: still ? 'auto' : 'smooth' })
  })
}
const next = () => go(1)
const prev = () => go(-1)

function onKeydown(e: KeyboardEvent) {
  if (e.ctrlKey || e.metaKey || e.altKey) return
  const t = e.target as HTMLElement | null
  if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return
  if (e.key === 'n' || e.key === 'p') {
    e.preventDefault()
    go(e.key === 'n' ? 1 : -1)
  }
}

const cellMod = (vl: DiffViewLine | null) =>
  !vl ? 'ml-diff__cell--empty' : vl.line.type === 'add' ? 'ml-diff__cell--add' : vl.line.type === 'del' ? 'ml-diff__cell--del' : undefined
const isChange = (vl: DiffViewLine | null) => !!vl && (vl.line.type === 'add' || vl.line.type === 'del')
const blockOf = (fi: number, block: number) => (block < 0 ? -1 : offsets.value[fi] + block)

defineExpose({ next, prev, expandAll })
</script>

<template>
  <div
    ref="root"
    :class="['ml-diff', `ml-diff--${view}`, { 'ml-diff--wrap': wrap, 'ml-diff--numbers': lineNumbers }]"
    role="region"
    :aria-label="label ?? loc.diff.label"
    @keydown="onKeydown"
  >
    <div class="ml-diff__bar">
      <div class="ml-diff__title">
        <template v-if="single">
          <span v-if="badge" class="ml-diff__lang">{{ badge }}</span>
          <span v-if="files[0] && files[0].status !== 'modified'" :class="['ml-diff__status', `ml-diff__status--${files[0].status}`]">{{ loc.diff.status[files[0].status] }}</span>
          <span v-if="title" class="ml-diff__name">{{ title }}</span>
        </template>
        <span v-else class="ml-diff__name">{{ loc.diff.files(files.length) }}</span>
        <span class="ml-diff__stats">
          <span class="ml-visually-hidden">{{ loc.diff.stats(added, removed) }}</span>
          <span class="ml-diff__stat ml-diff__stat--add" aria-hidden="true">+{{ added }}</span>
          <span class="ml-diff__stat ml-diff__stat--del" aria-hidden="true">−{{ removed }}</span>
        </span>
      </div>
      <div class="ml-diff__actions">
        <slot name="actions" />
        <div v-if="navigation && total" class="ml-diff__nav" role="group" :aria-label="loc.diff.label">
          <button type="button" class="ml-diff__btn" :aria-label="loc.diff.prev" :title="`${loc.diff.prev} (p)`" @click="prev">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 15 6-6 6 6" /></svg>
          </button>
          <span class="ml-diff__pos" aria-live="polite">{{ loc.diff.position(current + 1, total) }}</span>
          <button type="button" class="ml-diff__btn" :aria-label="loc.diff.next" :title="`${loc.diff.next} (n)`" @click="next">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
          </button>
        </div>
        <div v-if="viewToggle" class="ml-diff__views" role="group" :aria-label="loc.diff.view">
          <button
            v-for="v in (['split', 'unified'] as const)"
            :key="v"
            type="button"
            :class="['ml-diff__view', { 'ml-diff__view--on': view === v }]"
            :aria-pressed="view === v"
            @click="view = v"
          >
            {{ loc.diff[v] }}
          </button>
        </div>
      </div>
    </div>
    <div
      class="ml-diff__body"
      :style="maxHeight !== undefined ? { maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight } : undefined"
    >
      <section v-for="(file, fi) in files" :key="fi" class="ml-diff__file">
        <div v-if="!single" class="ml-diff__file-head">
          <span v-if="file.status !== 'modified'" :class="['ml-diff__status', `ml-diff__status--${file.status}`]">{{ loc.diff.status[file.status] }}</span>
          <span class="ml-diff__name">{{ diffFileName(file) }}</span>
          <span class="ml-diff__stats">
            <span class="ml-visually-hidden">{{ loc.diff.stats(file.added, file.removed) }}</span>
            <span class="ml-diff__stat ml-diff__stat--add" aria-hidden="true">+{{ file.added }}</span>
            <span class="ml-diff__stat ml-diff__stat--del" aria-hidden="true">−{{ file.removed }}</span>
          </span>
        </div>
        <div class="ml-diff__scroll" tabindex="0">
          <table class="ml-diff__table">
            <caption class="ml-visually-hidden">{{ loc.diff.table(single ? title : diffFileName(file)) }}</caption>
            <thead class="ml-diff__thead">
              <tr v-if="view === 'split'">
                <th v-if="lineNumbers" class="ml-diff__th ml-diff__th--num" scope="col">{{ loc.diff.oldLine }}</th>
                <th class="ml-diff__th ml-diff__th--code" scope="col">{{ loc.diff.oldCode }}</th>
                <th v-if="lineNumbers" class="ml-diff__th ml-diff__th--num" scope="col">{{ loc.diff.newLine }}</th>
                <th class="ml-diff__th ml-diff__th--code" scope="col">{{ loc.diff.newCode }}</th>
              </tr>
              <tr v-else>
                <th v-if="lineNumbers" class="ml-diff__th ml-diff__th--num" scope="col">{{ loc.diff.oldLine }}</th>
                <th v-if="lineNumbers" class="ml-diff__th ml-diff__th--num" scope="col">{{ loc.diff.newLine }}</th>
                <th class="ml-diff__th ml-diff__th--code" scope="col">{{ loc.diff.code }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="file.binary || !(file.added + file.removed)" class="ml-diff__note">
                <td :colspan="cols">{{ file.binary ? loc.diff.binary : loc.diff.noChanges }}</td>
              </tr>
              <template v-for="row in rows[fi]" :key="row.key">
                <tr v-if="row.kind === 'fold'" class="ml-diff__fold">
                  <td :colspan="cols">
                    <button type="button" class="ml-diff__expand" @click="expand(fi, row.start)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m7 15 5 5 5-5M7 9l5-5 5 5" /></svg>
                      {{ loc.diff.expand(row.count) }}
                    </button>
                  </td>
                </tr>
                <tr v-else-if="row.kind === 'hunk'" class="ml-diff__hunk">
                  <td :colspan="cols">{{ row.text }}</td>
                </tr>
                <tr
                  v-else-if="row.kind === 'line'"
                  :class="['ml-diff__row', `ml-diff__row--${row.line.line.type}`, { 'ml-diff__row--current': row.line.block >= 0 && blockOf(fi, row.line.block) === current }]"
                  :data-ml-diff-change="row.start ? blockOf(fi, row.line.block) : undefined"
                  :tabindex="row.start ? -1 : undefined"
                >
                  <td v-if="lineNumbers" class="ml-diff__num ml-diff__num--old">{{ row.line.line.oldNo }}</td>
                  <td v-if="lineNumbers" class="ml-diff__num ml-diff__num--new">{{ row.line.line.newNo }}</td>
                  <td :class="['ml-diff__code', cellMod(row.line)]">
                    <template v-if="isChange(row.line)">
                      <span class="ml-diff__sign" aria-hidden="true">{{ row.line.line.type === 'add' ? '+' : '-' }}</span>
                      <span class="ml-visually-hidden ml-diff__sr">{{ row.line.line.type === 'add' ? loc.diff.added : loc.diff.removed }}</span>
                    </template>
                    <span class="ml-diff__text"
                      ><template v-for="(s, si) in row.line.segs" :key="si"
                        ><span v-if="s.cls || s.mark" :class="[s.cls, { 'ml-diff__word': s.mark }]">{{ s.text }}</span
                        ><template v-else>{{ s.text }}</template></template
                      ></span
                    >
                    <span v-if="row.line.line.noNewline" class="ml-diff__eof">{{ loc.diff.noNewline }}</span>
                  </td>
                </tr>
                <tr
                  v-else
                  :class="['ml-diff__row', { 'ml-diff__row--change': row.block >= 0, 'ml-diff__row--current': row.block >= 0 && blockOf(fi, row.block) === current }]"
                  :data-ml-diff-change="row.start ? blockOf(fi, row.block) : undefined"
                  :tabindex="row.start ? -1 : undefined"
                >
                  <template v-for="side in ([['old', row.left], ['new', row.right]] as const)" :key="side[0]">
                    <td v-if="lineNumbers" :class="['ml-diff__num', `ml-diff__num--${side[0]}`, cellMod(side[1])]">
                      {{ side[1] ? (side[0] === 'old' ? side[1].line.oldNo : side[1].line.newNo) : '' }}
                    </td>
                    <td :class="['ml-diff__code', `ml-diff__code--${side[0]}`, cellMod(side[1])]">
                      <template v-if="side[1]">
                        <template v-if="isChange(side[1])">
                          <span class="ml-diff__sign" aria-hidden="true">{{ side[1].line.type === 'add' ? '+' : '-' }}</span>
                          <span class="ml-visually-hidden ml-diff__sr">{{ side[1].line.type === 'add' ? loc.diff.added : loc.diff.removed }}</span>
                        </template>
                        <span class="ml-diff__text"
                          ><template v-for="(s, si) in side[1].segs" :key="si"
                            ><span v-if="s.cls || s.mark" :class="[s.cls, { 'ml-diff__word': s.mark }]">{{ s.text }}</span
                            ><template v-else>{{ s.text }}</template></template
                          ></span
                        >
                        <span v-if="side[1].line.noNewline" class="ml-diff__eof">{{ loc.diff.noNewline }}</span>
                      </template>
                    </td>
                  </template>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
</template>
