import { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState, type KeyboardEvent } from 'react'
import { prefersReducedMotion } from '../composables'
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
} from '../components/invoice-view'
import { Icon } from './basic'
import { CuteIcon } from './cute-icon'
import { PinInput, type PinInputHandle } from './inputs'
import { useLocale } from './locale'
import { cx, useControllable } from './utils'

export {
  INVOICE_PRIZES,
  checkInvoice,
  quickCheckInvoice,
  parseInvoiceNumber,
  invoiceDrawNumbers,
  invoiceSuffixMatch,
} from '../invoice'
export type {
  MlInvoiceDraw,
  MlInvoiceCloudPrize,
  MlInvoiceResult,
  InvoicePrize,
  InvoicePrizeTier,
  InvoiceCandidate,
  InvoiceCheckStatus,
  ParsedInvoiceNumber,
} from '../invoice'
export type { InvoiceMode } from '../components/invoice-view'

export interface InvoiceCheckerHandle {
  /** Check a number: 3 digits → 末三碼, otherwise the full 8 (字軌 allowed). Null without draws. */
  check(number: string): MlInvoiceResult | null
  clearHistory(): void
}

export interface InvoiceCheckerProps {
  /** Winning numbers, newest first — supplied by the app (they change every two months). */
  draws: MlInvoiceDraw[]
  period?: string
  defaultPeriod?: string
  onPeriodChange?: (period: string) => void
  mode?: InvoiceMode
  defaultMode?: InvoiceMode
  onModeChange?: (mode: InvoiceMode) => void
  onCheck?: (result: MlInvoiceResult) => void
  /** Show the current draw's numbers, with the matching digits highlighted. Default true. */
  showNumbers?: boolean
  /** Keep a list of the numbers checked. Default true. */
  history?: boolean
  /** Most entries kept in the list. Default 10. */
  historyLimit?: number
  /** Paw confetti on a win. Default true. */
  confetti?: boolean
  disabled?: boolean
  label?: string
  className?: string
}

const MODES = ['quick', 'full'] as const

export const InvoiceChecker = forwardRef<InvoiceCheckerHandle, InvoiceCheckerProps>(function InvoiceChecker(
  {
    draws,
    period: periodProp,
    defaultPeriod,
    onPeriodChange,
    mode: modeProp,
    defaultMode = 'quick',
    onModeChange,
    onCheck,
    showNumbers = true,
    history = true,
    historyLimit = 10,
    confetti = true,
    disabled = false,
    label,
    className,
  },
  ref,
) {
  const loc = useLocale()
  const [period, setPeriod] = useControllable<string | undefined>(periodProp, defaultPeriod, onPeriodChange as (p: string | undefined) => void)
  const [mode, setModeValue] = useControllable<InvoiceMode>(modeProp, defaultMode, onModeChange)
  const draw = pickDraw(draws, period)
  const [code, setCode] = useState('')
  const [result, setResult] = useState<MlInvoiceResult | null>(null)
  const [items, setItems] = useState<InvoiceHistoryItem[]>([])
  const [resetTick, setResetTick] = useState(0)
  const pin = useRef<PinInputHandle>(null)
  const resultEl = useRef<HTMLDivElement>(null)
  const nextId = useRef(1)
  const modesId = `ml-invoice-${useId().replace(/[^\w-]/g, '')}`
  const focusMode = useRef(false)

  // A different draw: the last result no longer applies.
  const drawPeriod = draw?.period
  const shownPeriod = useRef(drawPeriod)
  useEffect(() => {
    if (shownPeriod.current === drawPeriod) return
    shownPeriod.current = drawPeriod
    setResult(null)
  }, [drawPeriod])

  // After the PinInput has finished handling the keystroke: empty it for the next number.
  useEffect(() => {
    if (resetTick) pin.current?.reset()
  }, [resetTick])

  useEffect(() => {
    if (!focusMode.current) return
    focusMode.current = false
    document.getElementById(`${modesId}-${mode}`)?.focus()
  }, [mode])

  const live = useRef({ history, historyLimit, confetti, onCheck })
  live.current = { history, historyLimit, confetti, onCheck }

  function record(r: MlInvoiceResult) {
    const l = live.current
    setResult(r)
    if (l.history) setItems((list) => [{ id: nextId.current++, result: r }, ...list].slice(0, l.historyLimit))
    l.onCheck?.(r)
    if (r.status === 'win' && l.confetti && !prefersReducedMotion()) {
      const box = resultEl.current?.getBoundingClientRect()
      if (box) pawBurst(box.left + box.width / 2, box.top + box.height / 2, { count: 26, spread: 360, power: 200 })
    }
  }

  useImperativeHandle(ref, () => ({
    check(number: string) {
      if (!draw) return null
      const digits = String(number).replace(/\D/g, '')
      const r = runInvoiceCheck(digits.length === 3 ? 'quick' : 'full', number, draw)
      record(r)
      return r
    },
    clearHistory: () => setItems([]),
  }))

  function onComplete(digits: string) {
    if (!draw || disabled) return
    record(runInvoiceCheck(mode, digits, draw))
    setResetTick((n) => n + 1)
  }

  function setMode(next: InvoiceMode) {
    if (next === mode) return
    setModeValue(next)
    setCode('')
    setResult(null)
  }

  function onModeKey(event: KeyboardEvent) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
    event.preventDefault()
    focusMode.current = true
    setMode(mode === 'quick' ? 'full' : 'quick')
  }

  const msg = invoiceMessage(result, loc.invoice)
  const rows = draw ? invoiceRows(draw, result?.number ?? '') : []

  return (
    <div className={cx('ml-invoice', `ml-invoice--${mode}`, { 'ml-invoice--disabled': disabled }, className)} role="group" aria-label={label ?? loc.invoice.label}>
      <div className="ml-invoice__bar">
        {draws.length > 0 && (
          <div className="ml-input ml-input--sm ml-invoice__period">
            <select className="ml-input__control" aria-label={loc.invoice.period} disabled={disabled} value={draw?.period ?? ''} onChange={(e) => setPeriod(e.target.value)}>
              {draws.map((d) => (
                <option key={d.period} value={d.period}>
                  {d.period}
                </option>
              ))}
            </select>
            <Icon name="chevronDown" className="ml-input__chevron" />
          </div>
        )}
        <div className="ml-invoice__modes" role="radiogroup" aria-label={loc.invoice.modes}>
          {MODES.map((m) => (
            <button
              key={m}
              id={`${modesId}-${m}`}
              type="button"
              role="radio"
              aria-checked={mode === m}
              tabIndex={mode === m ? 0 : -1}
              disabled={disabled}
              className={cx('ml-invoice__mode', { 'ml-invoice__mode--active': mode === m })}
              onClick={() => setMode(m)}
              onKeyDown={onModeKey}
            >
              {m === 'quick' ? loc.invoice.quick : loc.invoice.full}
            </button>
          ))}
        </div>
      </div>

      {!draws.length ? (
        <p className="ml-invoice__empty">{loc.invoice.noDraws}</p>
      ) : (
        <>
          <PinInput
            key={mode}
            ref={pin}
            value={code}
            onChange={setCode}
            onComplete={onComplete}
            className="ml-invoice__input"
            length={invoiceLength(mode)}
            groupSize={mode === 'full' ? 4 : undefined}
            label={mode === 'quick' ? loc.invoice.quickLabel : loc.invoice.fullLabel}
            size="lg"
            disabled={disabled}
          />

          <div ref={resultEl} className={cx('ml-invoice__result', `ml-invoice__result--${result?.status ?? 'idle'}`)}>
            {result?.status === 'win' && <CuteIcon name="trophy" animate="bounce" className="ml-invoice__badge" />}
            <div className="ml-invoice__text" role="status">
              {result && <p className="ml-invoice__checked">{invoiceShownNumber(result)}</p>}
              <p className="ml-invoice__message">{msg.message}</p>
              {msg.detail && <p className="ml-invoice__detail">{msg.detail}</p>}
            </div>
            {result?.status === 'maybe' && (
              <div className="ml-invoice__check">
                <span className="ml-invoice__check-title">{loc.invoice.check}</span>
                {result.candidates.map((c, i) => (
                  <span key={i} className="ml-invoice__candidate">
                    <span className="ml-invoice__candidate-tier">{loc.invoice.prizes[c.tier]}</span>
                    {c.number}
                  </span>
                ))}
              </div>
            )}
          </div>

          {showNumbers && draw && (
            <div className="ml-invoice__numbers">
              <p className="ml-invoice__numbers-title">{loc.invoice.numbers}</p>
              <dl className="ml-invoice__table">
                {rows.map((row) => (
                  <div key={row.tier} className={cx('ml-invoice__row', `ml-invoice__row--${row.tier}`)}>
                    <dt className="ml-invoice__tier">
                      {loc.invoice.prizes[row.tier]}
                      <span className="ml-invoice__amount">{loc.invoice.amount(row.amount)}</span>
                    </dt>
                    <dd className="ml-invoice__list">
                      {row.numbers.map((n, i) => (
                        <span key={i} className="ml-invoice__number">
                          {n.head}
                          {n.hit && <mark className="ml-invoice__hit">{n.hit}</mark>}
                        </span>
                      ))}
                    </dd>
                    {row.tier === 'first' && <dd className="ml-invoice__rule">{loc.invoice.firstRule}</dd>}
                  </div>
                ))}
              </dl>
            </div>
          )}

          {history && items.length > 0 && (
            <div className="ml-invoice__history">
              <div className="ml-invoice__history-head">
                <span className="ml-invoice__history-title">{loc.invoice.history}</span>
                <button type="button" className="ml-invoice__clear" onClick={() => setItems([])}>
                  {loc.invoice.clearHistory}
                </button>
              </div>
              <ol className="ml-invoice__log">
                {items.map((item) => (
                  <li key={item.id} className={cx('ml-invoice__log-item', `ml-invoice__log-item--${item.result.status}`)}>
                    <span className="ml-invoice__log-number">{invoiceShownNumber(item.result)}</span>
                    <span className="ml-invoice__log-period">{item.result.period}</span>
                    <span className="ml-invoice__log-verdict">{invoiceVerdict(item.result, loc.invoice)}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}
    </div>
  )
})
