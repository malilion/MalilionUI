<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue'
import MlCuteIcon from './MlCuteIcon.vue'
import MlIcon from './MlIcon.vue'
import MlPinInput from './MlPinInput.vue'
import { prefersReducedMotion } from '../composables'
import { useLocale } from '../locale'
import { pawBurst } from '../pawStamp'
import type { MlInvoiceDraw, MlInvoiceResult } from '../invoice'
import {
  invoiceLength,
  invoiceMessage,
  invoiceRows,
  invoiceShownNumber,
  invoiceVerdict,
  pickDraw,
  runInvoiceCheck,
  type InvoiceHistoryItem,
  type InvoiceMode,
} from './invoice-view'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    /** Winning numbers, newest first — supplied by the app (they change every two months). */
    draws: MlInvoiceDraw[]
    /** Show the current draw's numbers, with the matching digits highlighted. */
    showNumbers?: boolean
    /** Keep a list of the numbers checked. */
    history?: boolean
    /** Most entries kept in the list. */
    historyLimit?: number
    /** Paw confetti on a win. */
    confetti?: boolean
    disabled?: boolean
    label?: string
  }>(),
  { showNumbers: true, history: true, historyLimit: 10, confetti: true, disabled: false },
)

const emit = defineEmits<{ check: [result: MlInvoiceResult] }>()
const period = defineModel<string>('period')
const mode = defineModel<InvoiceMode>('mode', { default: 'quick' })

const draw = computed(() => pickDraw(props.draws, period.value))
const code = ref('')
const result = ref<MlInvoiceResult | null>(null)
const items = ref<InvoiceHistoryItem[]>([])
const pin = ref<InstanceType<typeof MlPinInput>>()
const resultEl = ref<HTMLElement>()
const modesId = `ml-invoice-${useId()}`
let nextId = 1

const msg = computed(() => invoiceMessage(result.value, loc.value.invoice))
const rows = computed(() => (draw.value ? invoiceRows(draw.value, result.value?.number ?? '') : []))
const periodModel = computed({
  get: () => draw.value?.period ?? '',
  set: (p: string) => (period.value = p),
})

watch(draw, (next, prev) => {
  if (next?.period !== prev?.period) result.value = null
})

function record(r: MlInvoiceResult) {
  result.value = r
  if (props.history) items.value = [{ id: nextId++, result: r }, ...items.value].slice(0, props.historyLimit)
  emit('check', r)
  if (r.status === 'win' && props.confetti && !prefersReducedMotion()) {
    const box = resultEl.value?.getBoundingClientRect()
    if (box) pawBurst(box.left + box.width / 2, box.top + box.height / 2, { count: 26, spread: 360, power: 200 })
  }
}

/** Check a number: 3 digits → 末三碼, otherwise the full 8 (字軌 allowed). Returns null without draws. */
function check(number: string): MlInvoiceResult | null {
  if (!draw.value) return null
  const digits = String(number).replace(/\D/g, '')
  const m: InvoiceMode = digits.length === 3 ? 'quick' : 'full'
  const r = runInvoiceCheck(m, number, draw.value)
  record(r)
  return r
}

async function onComplete(digits: string) {
  if (!draw.value || props.disabled) return
  record(runInvoiceCheck(mode.value, digits, draw.value))
  // After the PinInput has finished handling this keystroke: empty it for the next number.
  await nextTick()
  pin.value?.reset()
}

function setMode(next: InvoiceMode) {
  if (next === mode.value) return
  mode.value = next
  code.value = ''
  result.value = null
}

function onModeKey(event: KeyboardEvent) {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
  event.preventDefault()
  setMode(mode.value === 'quick' ? 'full' : 'quick')
  nextTick(() => document.getElementById(`${modesId}-${mode.value}`)?.focus())
}

function clearHistory() {
  items.value = []
}

defineExpose({ check, clearHistory })
</script>

<template>
  <div
    :class="['ml-invoice', `ml-invoice--${mode}`, { 'ml-invoice--disabled': disabled }]"
    role="group"
    :aria-label="label ?? loc.invoice.label"
  >
    <div class="ml-invoice__bar">
      <div v-if="draws.length" :class="['ml-input', 'ml-input--sm', 'ml-invoice__period']">
        <select v-model="periodModel" class="ml-input__control" :aria-label="loc.invoice.period" :disabled="disabled">
          <option v-for="d in draws" :key="d.period" :value="d.period">{{ d.period }}</option>
        </select>
        <MlIcon name="chevronDown" class="ml-input__chevron" />
      </div>
      <div class="ml-invoice__modes" role="radiogroup" :aria-label="loc.invoice.modes">
        <button
          v-for="m in (['quick', 'full'] as const)"
          :id="`${modesId}-${m}`"
          :key="m"
          type="button"
          role="radio"
          :aria-checked="mode === m"
          :tabindex="mode === m ? 0 : -1"
          :disabled="disabled"
          :class="['ml-invoice__mode', { 'ml-invoice__mode--active': mode === m }]"
          @click="setMode(m)"
          @keydown="onModeKey"
        >
          {{ m === 'quick' ? loc.invoice.quick : loc.invoice.full }}
        </button>
      </div>
    </div>

    <p v-if="!draws.length" class="ml-invoice__empty">{{ loc.invoice.noDraws }}</p>
    <template v-else>
      <MlPinInput
        :key="mode"
        ref="pin"
        v-model="code"
        class="ml-invoice__input"
        :length="invoiceLength(mode)"
        :group-size="mode === 'full' ? 4 : undefined"
        :label="mode === 'quick' ? loc.invoice.quickLabel : loc.invoice.fullLabel"
        size="lg"
        :disabled="disabled"
        @complete="onComplete"
      />

      <div ref="resultEl" :class="['ml-invoice__result', `ml-invoice__result--${result?.status ?? 'idle'}`]">
        <MlCuteIcon v-if="result?.status === 'win'" name="trophy" animate="bounce" class="ml-invoice__badge" />
        <div class="ml-invoice__text" role="status">
          <p v-if="result" class="ml-invoice__checked">{{ invoiceShownNumber(result) }}</p>
          <p class="ml-invoice__message">{{ msg.message }}</p>
          <p v-if="msg.detail" class="ml-invoice__detail">{{ msg.detail }}</p>
        </div>
        <div v-if="result?.status === 'maybe'" class="ml-invoice__check">
          <span class="ml-invoice__check-title">{{ loc.invoice.check }}</span>
          <span v-for="(c, i) in result.candidates" :key="i" class="ml-invoice__candidate"><span class="ml-invoice__candidate-tier">{{ loc.invoice.prizes[c.tier] }}</span>{{ c.number }}</span>
        </div>
      </div>

      <div v-if="showNumbers && draw" class="ml-invoice__numbers">
        <p class="ml-invoice__numbers-title">{{ loc.invoice.numbers }}</p>
        <dl class="ml-invoice__table">
          <div v-for="row in rows" :key="row.tier" :class="['ml-invoice__row', `ml-invoice__row--${row.tier}`]">
            <dt class="ml-invoice__tier">{{ loc.invoice.prizes[row.tier] }}<span class="ml-invoice__amount">{{ loc.invoice.amount(row.amount) }}</span></dt>
            <dd class="ml-invoice__list">
              <span v-for="(n, i) in row.numbers" :key="i" class="ml-invoice__number">{{ n.head }}<mark v-if="n.hit" class="ml-invoice__hit">{{ n.hit }}</mark></span>
            </dd>
            <dd v-if="row.tier === 'first'" class="ml-invoice__rule">{{ loc.invoice.firstRule }}</dd>
          </div>
        </dl>
      </div>

      <div v-if="history && items.length" class="ml-invoice__history">
        <div class="ml-invoice__history-head">
          <span class="ml-invoice__history-title">{{ loc.invoice.history }}</span>
          <button type="button" class="ml-invoice__clear" @click="clearHistory">{{ loc.invoice.clearHistory }}</button>
        </div>
        <ol class="ml-invoice__log">
          <li
            v-for="item in items"
            :key="item.id"
            :class="['ml-invoice__log-item', `ml-invoice__log-item--${item.result.status}`]"
          >
            <span class="ml-invoice__log-number">{{ invoiceShownNumber(item.result) }}</span>
            <span class="ml-invoice__log-period">{{ item.result.period }}</span>
            <span class="ml-invoice__log-verdict">{{ invoiceVerdict(item.result, loc.invoice) }}</span>
          </li>
        </ol>
      </div>
    </template>
  </div>
</template>
