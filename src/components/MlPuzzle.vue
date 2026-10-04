<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, useId, watch } from 'vue'
import { useLocale } from '../locale'
import { prefersReducedMotion } from '../composables'
import { pawBurst } from '../pawStamp'
import {
  PUZZLE_TAB,
  puzzleClock,
  puzzleEdges,
  puzzleGrid,
  puzzleNeighbour,
  puzzlePiecePath,
  puzzlePlaced,
  puzzleRandom,
  puzzleShuffle,
  puzzleSolved,
  puzzleSwap,
  type MlPuzzleResult,
  type MlPuzzleTone,
  type PuzzleDirection,
} from './puzzle'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    /** Picture to cut up. Without one the pieces are numbered gradient tiles. */
    src?: string
    /** What the picture shows (part of the puzzle's accessible name). */
    alt?: string
    rows?: number
    cols?: number
    /** Board width ÷ height. Default cols ÷ rows (square pieces). The picture is cropped to fit. */
    ratio?: number
    /** Board width in px (it never overflows its container). */
    width?: number
    /** Same seed, same cut and shuffle. Without one each mount is different. */
    seed?: number
    /** Pieces in the right place stay put. */
    lock?: boolean
    /** A faint copy of the picture under the board. */
    ghost?: boolean
    /** Piece numbers. Default: on when there's no picture. */
    numbers?: boolean
    tone?: MlPuzzleTone
    /** Paw confetti when solved. */
    confetti?: boolean
    /** Moves / progress bar with a shuffle button. */
    toolbar?: boolean
    disabled?: boolean
    label?: string
  }>(),
  { rows: 3, cols: 3, width: 360, lock: true, ghost: true, numbers: undefined, tone: 'gold', confetti: true, toolbar: true, disabled: false },
)

const emit = defineEmits<{
  move: [from: number, to: number, moves: number]
  complete: [result: MlPuzzleResult]
  shuffle: []
}>()

const uid = `ml-puzzle-${useId()}`
const rows = computed(() => puzzleGrid(props.rows, 3))
const cols = computed(() => puzzleGrid(props.cols, 3))
const count = computed(() => rows.value * cols.value)
const cellW = 100
const cellH = computed(() => (cellW * cols.value) / (props.ratio && props.ratio > 0 ? props.ratio : cols.value / rows.value) / rows.value)
const W = computed(() => cellW * cols.value)
const H = computed(() => cellH.value * rows.value)
const pad = computed(() => Math.ceil(PUZZLE_TAB * Math.min(cellW, cellH.value)) + 4)
const showNumbers = computed(() => props.numbers ?? !props.src)

const edges = shallowRef(puzzleEdges(rows.value, cols.value, puzzleRandom(props.seed ?? 1)))
const order = ref<number[]>(puzzleShuffle(count.value, puzzleRandom((props.seed ?? 1) + 7)))
const moves = ref(0)
const startedAt = ref(0)
const selected = ref<number | null>(null)
const focusCell = ref(0)
const announce = ref('')
const done = ref(false)

function deal(random: () => number, newCut: boolean) {
  if (newCut) edges.value = puzzleEdges(rows.value, cols.value, random)
  order.value = puzzleShuffle(count.value, random)
  moves.value = 0
  startedAt.value = 0
  selected.value = null
  done.value = false
}

watch([rows, cols], () => deal(puzzleRandom(props.seed ?? Date.now()), true))
watch(
  () => props.seed,
  (s) => s !== undefined && deal(puzzleRandom(s), true),
)

onMounted(() => {
  if (props.seed === undefined) deal(Math.random, true)
})

const paths = computed(() => Array.from({ length: count.value }, (_, i) => puzzlePiecePath(i, cols.value, rows.value, edges.value, cellW, cellH.value)))
const placedCount = computed(() => puzzlePlaced(order.value))
const solved = computed(() => puzzleSolved(order.value))

const drag = ref<{ cell: number; dx: number; dy: number; active: boolean } | null>(null)

/** Cells in drawing order: placed pieces underneath, the held one on top. */
const pieces = computed(() => {
  const list = order.value.map((piece, cell) => {
    const hx = (piece % cols.value) * cellW
    const hy = Math.floor(piece / cols.value) * cellH.value
    const tx = (cell % cols.value) * cellW
    const ty = Math.floor(cell / cols.value) * cellH.value
    const dragging = drag.value?.cell === cell && drag.value.active
    return {
      piece,
      cell,
      d: paths.value[piece],
      placed: piece === cell,
      locked: props.lock && piece === cell,
      selected: selected.value === cell,
      dragging,
      x: tx - hx + (dragging ? drag.value!.dx : 0),
      y: ty - hy + (dragging ? drag.value!.dy : 0),
      cx: hx + cellW / 2,
      cy: hy + cellH.value / 2,
      row: Math.floor(cell / cols.value) + 1,
      col: (cell % cols.value) + 1,
    }
  })
  const rank = (p: (typeof list)[number]) => (p.dragging ? 3 : p.selected ? 2 : p.placed ? 0 : 1)
  return list.slice().sort((a, b) => rank(a) - rank(b) || a.piece - b.piece)
})

const name = computed(() => props.label ?? loc.value.puzzle.label(props.alt))
const status = computed(() => loc.value.puzzle.progress(placedCount.value, count.value))

function canMove(cell: number) {
  return !props.disabled && !done.value && !(props.lock && order.value[cell] === cell)
}

function swap(a: number, b: number) {
  if (a === b || !canMove(a) || !canMove(b)) return false
  if (!startedAt.value) startedAt.value = Date.now()
  const pa = order.value[a]
  const pb = order.value[b]
  order.value = puzzleSwap(order.value, a, b)
  moves.value++
  emit('move', a, b, moves.value)
  announce.value = loc.value.puzzle.swapped(pa + 1, pb + 1)
  if (puzzleSolved(order.value)) finish()
  return true
}

const svg = ref<SVGSVGElement>()

function finish() {
  done.value = true
  selected.value = null
  const time = startedAt.value ? Date.now() - startedAt.value : 0
  announce.value = loc.value.puzzle.solved(moves.value, puzzleClock(time))
  emit('complete', { moves: moves.value, time })
  if (props.confetti && !prefersReducedMotion() && svg.value) {
    const r = svg.value.getBoundingClientRect()
    pawBurst(r.left + r.width / 2, r.top + r.height / 2, { count: 24, spread: 360, power: Math.max(160, r.width * 0.6) })
  }
}

function pick(cell: number) {
  if (selected.value === null) {
    if (!canMove(cell)) return
    selected.value = cell
    announce.value = loc.value.puzzle.picked(order.value[cell] + 1)
  } else if (selected.value === cell) {
    selected.value = null
  } else if (swap(selected.value, cell)) {
    selected.value = null
  }
}

/* ── Pointer: drag a piece onto another, or tap two pieces ── */
let start: { x: number; y: number; scale: number; id: number } | null = null

function boardPoint(clientX: number, clientY: number) {
  const r = svg.value!.getBoundingClientRect()
  const scale = (W.value + pad.value * 2) / (r.width || 1)
  return { x: (clientX - r.left) * scale - pad.value, y: (clientY - r.top) * scale - pad.value }
}

function onPointerDown(cell: number, event: PointerEvent) {
  if (event.button !== 0 || !svg.value) return
  focusCell.value = cell
  if (!canMove(cell)) return
  const r = svg.value.getBoundingClientRect()
  start = { x: event.clientX, y: event.clientY, scale: (W.value + pad.value * 2) / (r.width || 1), id: event.pointerId }
  drag.value = { cell, dx: 0, dy: 0, active: false }
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerCancel)
}

function onPointerMove(event: PointerEvent) {
  if (!start || !drag.value || event.pointerId !== start.id) return
  const dx = event.clientX - start.x
  const dy = event.clientY - start.y
  if (!drag.value.active && Math.hypot(dx, dy) < 4) return
  event.preventDefault()
  drag.value = { ...drag.value, dx: dx * start.scale, dy: dy * start.scale, active: true }
}

function stopListening() {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerCancel)
  start = null
}

function onPointerUp(event: PointerEvent) {
  if (!start || !drag.value || event.pointerId !== start.id) return
  const { cell, active } = drag.value
  stopListening()
  drag.value = null
  if (!active) return pick(cell)
  const p = boardPoint(event.clientX, event.clientY)
  const c = Math.floor(p.x / cellW)
  const r = Math.floor(p.y / cellH.value)
  if (c >= 0 && c < cols.value && r >= 0 && r < rows.value) {
    const target = r * cols.value + c
    if (swap(cell, target)) {
      selected.value = null
      focusCell.value = target
    }
  }
}

function onPointerCancel() {
  stopListening()
  drag.value = null
}

onBeforeUnmount(stopListening)

/* ── Keyboard: arrows move focus, Enter / Space pick and swap ── */
const KEYS: Record<string, PuzzleDirection> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' }

function focusOn(cell: number) {
  focusCell.value = cell
  const el = svg.value?.querySelector<SVGGElement>(`[data-cell="${cell}"]`)
  if (el && document.activeElement !== el) el.focus()
}

function onKeydown(event: KeyboardEvent) {
  const cell = focusCell.value
  if (KEYS[event.key]) focusOn(puzzleNeighbour(cell, KEYS[event.key], rows.value, cols.value))
  else if (event.key === 'Home') focusOn(0)
  else if (event.key === 'End') focusOn(count.value - 1)
  else if (event.key === 'Enter' || event.key === ' ') pick(cell)
  else if (event.key === 'Escape' && selected.value !== null) selected.value = null
  else return
  event.preventDefault()
  // Lifting or placing a piece redraws it on another layer, which can drop focus.
  nextTick(() => focusOn(focusCell.value))
}

function shuffle() {
  deal(props.seed === undefined ? Math.random : puzzleRandom(props.seed + moves.value + 13), false)
  announce.value = ''
  emit('shuffle')
}

/** Put every piece in place (counts as finishing, without a move). */
function solve() {
  order.value = order.value.map((_, i) => i)
  selected.value = null
  done.value = true
}

defineExpose({ shuffle, solve })
</script>

<template>
  <div
    :class="[
      'ml-puzzle',
      `ml-puzzle--${tone}`,
      {
        'ml-puzzle--solved': solved,
        'ml-puzzle--dragging': drag?.active,
        'ml-puzzle--picking': selected !== null,
        'ml-puzzle--disabled': disabled,
        'ml-puzzle--art': !src,
      },
    ]"
    :style="{ '--_w': `${width}px`, '--_ratio': `${W + pad * 2} / ${H + pad * 2}` }"
  >
    <svg
      ref="svg"
      class="ml-puzzle__svg"
      :viewBox="`${-pad} ${-pad} ${W + pad * 2} ${H + pad * 2}`"
      role="group"
      :aria-label="name"
      :aria-disabled="disabled ? true : undefined"
      @keydown="onKeydown"
    >
      <defs>
        <clipPath v-for="(d, i) in paths" :id="`${uid}-${i}`" :key="i">
          <path :d="d" />
        </clipPath>
        <linearGradient :id="`${uid}-art`" x1="0" y1="0" x2="1" y2="1">
          <stop class="ml-puzzle__stop ml-puzzle__stop--a" offset="0" />
          <stop class="ml-puzzle__stop ml-puzzle__stop--b" offset="0.5" />
          <stop class="ml-puzzle__stop ml-puzzle__stop--c" offset="1" />
        </linearGradient>
      </defs>
      <rect class="ml-puzzle__tray" :x="0" :y="0" :width="W" :height="H" rx="6" />
      <image
        v-if="src && ghost"
        class="ml-puzzle__ghost"
        :href="src"
        :x="0"
        :y="0"
        :width="W"
        :height="H"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      />
      <path class="ml-puzzle__slots" :d="paths.join('')" aria-hidden="true" />
      <g
        v-for="p in pieces"
        :key="p.piece"
        :data-cell="p.cell"
        :class="[
          'ml-puzzle__piece',
          {
            'ml-puzzle__piece--placed': p.placed,
            'ml-puzzle__piece--locked': p.locked,
            'ml-puzzle__piece--selected': p.selected,
            'ml-puzzle__piece--dragging': p.dragging,
          },
        ]"
        :style="{ translate: `${p.x.toFixed(2)}px ${p.y.toFixed(2)}px`, transformOrigin: `${p.cx}px ${p.cy}px` }"
        :tabindex="p.cell === focusCell ? 0 : -1"
        role="button"
        :aria-label="loc.puzzle.piece(p.piece + 1, p.row, p.col, p.placed)"
        :aria-pressed="p.selected"
        :aria-disabled="p.locked || disabled || solved ? true : undefined"
        @pointerdown="onPointerDown(p.cell, $event)"
        @focus="focusCell = p.cell"
      >
        <g class="ml-puzzle__face" :clip-path="`url(#${uid}-${p.piece})`">
          <rect class="ml-puzzle__art" :x="0" :y="0" :width="W" :height="H" :fill="`url(#${uid}-art)`" />
          <image
            v-if="src"
            class="ml-puzzle__image"
            :href="src"
            :x="0"
            :y="0"
            :width="W"
            :height="H"
            preserveAspectRatio="xMidYMid slice"
          />
        </g>
        <path class="ml-puzzle__edge" :d="p.d" />
        <text v-if="showNumbers" class="ml-puzzle__num" :x="p.cx" :y="p.cy">{{ p.piece + 1 }}</text>
      </g>
    </svg>
    <div v-if="toolbar" class="ml-puzzle__bar">
      <span class="ml-puzzle__stat">{{ loc.puzzle.moves(moves) }}</span>
      <span class="ml-puzzle__stat ml-puzzle__stat--progress">{{ status }}</span>
      <button type="button" class="ml-puzzle__shuffle" :disabled="disabled" @click="shuffle">{{ loc.puzzle.shuffle }}</button>
    </div>
    <p class="ml-visually-hidden" aria-live="polite">{{ announce }}</p>
  </div>
</template>
