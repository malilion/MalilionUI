import { useId, useRef, useState } from 'react'
import { formatTime, parseTime, type TimeParts } from '../components/time'
import {
  endFloor,
  formatTimeRangeDuration,
  fromSeconds,
  isOvernight,
  setTimeRangeEnd,
  timeBounds,
  timeRangeSeconds,
  type MlTimeRange,
  type MlTimeRangePreset,
} from '../components/time-range'
import { Icon } from './basic'
import { useLocale } from './locale'
import { cleanId, PickerFrame, TimeColumns, TimeFooter, usePopup, type FocusHandle, type PickerBase } from './pickers'
import { cx, useControllable } from './utils'

const NO_TIME_RANGE: MlTimeRange = [null, null]

export interface TimeRangePickerProps extends Omit<PickerBase, 'placeholder'> {
  /** [start, end] as "HH:mm" (or "HH:mm:ss" with `seconds`); null for an unset end. */
  value?: MlTimeRange
  defaultValue?: MlTimeRange
  onChange?: (range: MlTimeRange) => void
  startPlaceholder?: string
  endPlaceholder?: string
  /** Include seconds columns; both ends become "HH:mm:ss". */
  seconds?: boolean
  minuteStep?: number
  secondStep?: number
  /** Earliest allowed time for either end, "HH:mm" or "HH:mm:ss". */
  min?: string
  /** Latest allowed time for either end, "HH:mm" or "HH:mm:ss". */
  max?: string
  /** Let the end be earlier than the start, meaning the next day (夜班 22:00 – 06:00). */
  allowOvernight?: boolean
  /** Quick picks beside the wheels. */
  presets?: MlTimeRangePreset[]
}

export function TimeRangePicker({
  value,
  defaultValue = NO_TIME_RANGE,
  onChange,
  startPlaceholder,
  endPlaceholder,
  seconds,
  minuteStep = 1,
  secondStep = 1,
  min,
  max,
  allowOvernight,
  presets,
  ...base
}: TimeRangePickerProps) {
  const loc = useLocale()
  const t = loc.timeRange
  const controlId = base.id ?? `ml-timerange-${cleanId(useId())}`
  const [model, setModel] = useControllable(value, defaultValue, onChange)
  const startColumns = useRef<FocusHandle>(null)
  /** Which end 現在 fills: the group that last had focus. */
  const [active, setActive] = useState<0 | 1>(0)
  const pop = usePopup(base.disabled, () => startColumns.current?.focus())

  const [lo, hi] = timeBounds(min, max)
  const floor = endFloor(model[0], { min, max, allowOvernight, seconds, minuteStep, secondStep })
  const overnight = isOvernight(model, allowOvernight)
  const sec = timeRangeSeconds(model, allowOvernight)
  const duration = sec === null ? '' : formatTimeRangeDuration(sec, loc)
  const status = duration || (model[0] ? t.pickEnd : t.pickStart)
  const nextDay = overnight && <span className="ml-timerange__next-day">{t.nextDay}</span>

  const set = (which: 0 | 1, time: TimeParts) => setModel(setTimeRangeEnd(model, which, formatTime(time, seconds), allowOvernight))

  function now() {
    const d = new Date()
    const step = (n: number, s: number) => Math.floor(n / s) * s
    const from = active === 1 ? floor : lo
    if (from > hi) return
    const at = d.getHours() * 3600 + step(d.getMinutes(), minuteStep) * 60 + (seconds ? step(d.getSeconds(), secondStep) : 0)
    set(active, fromSeconds(Math.min(hi, Math.max(from, at))))
  }

  return (
    <PickerFrame
      {...base}
      pop={{
        ...pop,
        show: () => {
          if (base.disabled) return
          setActive(0)
          pop.show()
        },
      }}
      controlId={controlId}
      rootClass="ml-timerange"
      affix={
        <span className="ml-input__affix">
          <Icon name="clock" />
        </span>
      }
      triggerClass="ml-daterange__trigger ml-timerange__trigger"
      trigger={
        <>
          <span className={cx({ 'ml-datepicker__placeholder': !model[0] })}>{model[0] || (startPlaceholder ?? t.start)}</span>
          <Icon name="arrowRight" className="ml-daterange__arrow" />
          <span className={cx({ 'ml-datepicker__placeholder': !model[1] })}>
            {model[1] || (endPlaceholder ?? t.end)}
            {nextDay}
          </span>
        </>
      }
      after={
        !!duration && (
          <span className="ml-daterange__days ml-timerange__duration" aria-hidden="true">
            {duration}
          </span>
        )
      }
      clearLabel={t.clear}
      showClear={!!(model[0] || model[1])}
      onClear={() => {
        setModel([null, null])
        pop.trigger.current?.focus()
      }}
      panelLabel={t.pick}
      panelClass="ml-timepicker__panel ml-timerange__panel"
      onPanelKeyDown={(event) => {
        if (event.key === 'Enter' && (event.target as HTMLElement).getAttribute('role') === 'listbox') {
          event.preventDefault()
          pop.hide()
        }
      }}
      panel={
        <>
          {!!presets?.length && (
            <ul className="ml-daterange__presets ml-timerange__presets" aria-label={loc.date.presets}>
              {presets.map((preset) => (
                <li key={preset.label}>
                  <button
                    type="button"
                    className="ml-daterange__preset"
                    onClick={() => {
                      setModel(typeof preset.value === 'function' ? preset.value() : [preset.value[0], preset.value[1]])
                      pop.hide()
                    }}
                  >
                    {preset.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="ml-timerange__body">
            <div className="ml-timerange__groups">
              <div className="ml-timerange__group" role="group" aria-label={t.start} onFocus={() => setActive(0)}>
                <p className="ml-timerange__label" aria-hidden="true">
                  {t.start}
                </p>
                <TimeColumns ref={startColumns} value={parseTime(model[0])} seconds={seconds} minuteStep={minuteStep} secondStep={secondStep} min={lo} max={hi} onChange={(v) => set(0, v)} />
              </div>
              <Icon name="arrowRight" className="ml-timerange__arrow" />
              <div className="ml-timerange__group" role="group" aria-label={overnight ? t.end + t.nextDay : t.end} onFocus={() => setActive(1)}>
                <p className="ml-timerange__label" aria-hidden="true">
                  {t.end}
                  {nextDay}
                </p>
                <TimeColumns value={parseTime(model[1])} seconds={seconds} minuteStep={minuteStep} secondStep={secondStep} min={floor} max={hi} onChange={(v) => set(1, v)} />
              </div>
            </div>
            <p className="ml-timerange__status" aria-live="polite">
              {status}
            </p>
            <TimeFooter onNow={now} onConfirm={() => pop.hide()} />
          </div>
        </>
      }
    />
  )
}
