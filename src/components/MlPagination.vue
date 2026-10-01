<script setup lang="ts">
import { computed } from 'vue'
import MlIcon from './MlIcon.vue'

const props = withDefaults(
  defineProps<{
    /** Number of pages. */
    total: number
    /** Page numbers shown on each side of the current one. */
    siblings?: number
    label?: string
  }>(),
  { siblings: 1, label: '分頁' },
)

const page = defineModel<number>('page', { default: 1 })

type Slot = number | 'gap-start' | 'gap-end'

// Always the same number of slots (2 × siblings + 5) so the bar doesn't jump:
// 1 2 3 4 5 … 20  ·  1 … 9 10 11 … 20  ·  1 … 16 17 18 19 20
const slots = computed<Slot[]>(() => {
  const total = Math.max(1, props.total)
  const s = props.siblings
  const current = Math.min(Math.max(1, page.value), total)
  const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i)

  if (total <= s * 2 + 5) return range(1, total)
  const leftGap = current - s > 3
  const rightGap = current + s < total - 2
  if (!leftGap) return [...range(1, s * 2 + 3), 'gap-end', total]
  if (!rightGap) return [1, 'gap-start', ...range(total - (s * 2 + 2), total)]
  return [1, 'gap-start', ...range(current - s, current + s), 'gap-end', total]
})

function go(n: number) {
  page.value = Math.min(Math.max(1, n), Math.max(1, props.total))
}
</script>

<template>
  <nav class="ml-pagination" :aria-label="label">
    <button
      type="button"
      class="ml-pagination__btn ml-pagination__btn--nav"
      aria-label="上一頁"
      :disabled="page <= 1"
      @click="go(page - 1)"
    >
      <MlIcon name="chevronLeft" />
    </button>
    <template v-for="slot in slots" :key="slot">
      <span v-if="typeof slot === 'string'" class="ml-pagination__gap" aria-hidden="true">…</span>
      <button
        v-else
        type="button"
        class="ml-pagination__btn"
        :aria-current="slot === page ? 'page' : undefined"
        :aria-label="`第 ${slot} 頁`"
        @click="go(slot)"
      >
        {{ slot }}
      </button>
    </template>
    <button
      type="button"
      class="ml-pagination__btn ml-pagination__btn--nav"
      aria-label="下一頁"
      :disabled="page >= total"
      @click="go(page + 1)"
    >
      <MlIcon name="chevronRight" />
    </button>
  </nav>
</template>
