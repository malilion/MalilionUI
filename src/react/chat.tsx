import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'
import { Avatar, Icon, Paw } from './basic'
import { useLocale } from './locale'
import { cx, len, useControllable } from './utils'

// useLayoutEffect warns during SSR; nothing to measure there anyway.
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/* ── Chat ───────────────────────────────────────────────── */

export interface ChatProps {
  /** Change this (e.g. messages.length) to scroll to the newest message. */
  watchKey?: unknown
  /** Scroll area height (px number or CSS length). */
  height?: number | string
  /** Accessible name for the message log. */
  label?: string
  header?: ReactNode
  footer?: ReactNode
  className?: string
  children?: ReactNode
}

export interface ChatHandle {
  scrollToBottom: () => void
}

export const Chat = forwardRef<ChatHandle, ChatProps>(function Chat({ watchKey, height = 420, label, header, footer, className, children }, ref) {
  const loc = useLocale()
  const log = useRef<HTMLDivElement>(null)
  /** Only follow new messages while the reader is already at (or near) the bottom. */
  const [pinned, setPinned] = useState(true)
  const pinnedRef = useRef(true)
  const scrollToBottom = useCallback((force = false) => {
    const el = log.current
    if (el && (force || pinnedRef.current)) el.scrollTop = el.scrollHeight
  }, [])
  const mounted = useRef(false)
  useIsoLayoutEffect(() => {
    scrollToBottom(!mounted.current)
    mounted.current = true
  }, [watchKey])
  useImperativeHandle(ref, () => ({ scrollToBottom: () => scrollToBottom(true) }), [])
  const onScroll = () => {
    const el = log.current
    if (!el) return
    pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48
    setPinned(pinnedRef.current)
  }
  return (
    <section className={cx('ml-chat', className)} style={{ '--_h': len(height) } as CSSProperties}>
      {header != null && header !== false && <header className="ml-chat__head">{header}</header>}
      <div ref={log} className="ml-chat__log" role="log" aria-live="polite" aria-label={label ?? loc.chat.log} tabIndex={0} onScroll={onScroll}>
        {children}
      </div>
      {!pinned && (
        <button type="button" className="ml-chat__jump" onClick={() => scrollToBottom(true)}>
          ↓ {loc.chat.latest}
        </button>
      )}
      {footer != null && footer !== false && <footer className="ml-chat__foot">{footer}</footer>}
    </section>
  )
})

/* ── ChatInput ──────────────────────────────────────────── */

export interface ChatInputProps {
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  /** Enter (or the send button) with non-blank text; receives the trimmed text. */
  onSend?: (text: string) => void
  onStop?: () => void
  placeholder?: string
  /** Waiting for a reply: sending is blocked and the button shows a stop icon. */
  loading?: boolean
  disabled?: boolean
  /** Grow up to this many lines before scrolling. */
  maxRows?: number
  maxLength?: number
  prefix?: ReactNode
  className?: string
}

export interface ChatInputHandle {
  focus: () => void
}

export const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(function ChatInput(
  { value, defaultValue = '', onChange, onSend, onStop, placeholder, loading, disabled, maxRows = 6, maxLength, prefix, className },
  ref,
) {
  const loc = useLocale()
  const [model, setModel] = useControllable(value, defaultValue, onChange)
  const area = useRef<HTMLTextAreaElement>(null)
  const canSend = !!model.trim() && !loading && !disabled
  const text = placeholder ?? loc.chat.placeholder

  useIsoLayoutEffect(() => {
    const el = area.current
    if (!el) return
    el.style.height = 'auto'
    const line = parseFloat(getComputedStyle(el).lineHeight) || 22
    el.style.height = `${Math.min(el.scrollHeight, line * maxRows + 20)}px`
  }, [model, maxRows])

  useImperativeHandle(ref, () => ({ focus: () => area.current?.focus() }), [])

  const send = () => {
    if (!canSend) return
    onSend?.(model.trim())
    setModel('')
  }
  const onKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends, Shift+Enter is a newline; never send mid-IME composition (注音、拼音).
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) {
      event.preventDefault()
      send()
    }
  }

  return (
    <div className={cx('ml-chat-input', className, { 'ml-chat-input--disabled': disabled })}>
      {prefix}
      <textarea
        ref={area}
        value={model}
        onChange={(e) => setModel(e.target.value)}
        className="ml-chat-input__area"
        rows={1}
        placeholder={text}
        disabled={disabled}
        maxLength={maxLength}
        aria-label={text}
        onKeyDown={onKeyDown}
      />
      {loading ? (
        <button type="button" className="ml-chat-input__btn ml-chat-input__btn--stop" aria-label={loc.chat.stop} onClick={() => onStop?.()}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" />
          </svg>
        </button>
      ) : (
        <button type="button" className="ml-chat-input__btn" disabled={!canSend} aria-label={loc.chat.send} onClick={send}>
          <Icon name="arrowUp" />
        </button>
      )}
    </div>
  )
})

/* ── ChatMessage ────────────────────────────────────────── */

export interface ChatMessageProps {
  /** user: right-aligned gold bubble. assistant: the lion's steel bubble. system: a centred note. */
  role?: 'user' | 'assistant' | 'system'
  name?: string
  /** Avatar image; the assistant defaults to the lion. */
  avatar?: string
  time?: string
  /** Show the "typing…" paw dots instead of content. */
  typing?: boolean
  /** Delivery state for the user's own messages. */
  status?: 'sending' | 'sent' | 'error'
  /** Plain-text content (newlines kept); children win for rich content. */
  content?: string
  actions?: ReactNode
  className?: string
  children?: ReactNode
}

export function ChatMessage({ role = 'assistant', name, avatar, time, typing, status, content, actions, className, children }: ChatMessageProps) {
  const loc = useLocale()
  const body = children ?? content
  if (role === 'system')
    return (
      <article className={cx('ml-chat-msg', 'ml-chat-msg--system', className)}>
        <span>{body}</span>
      </article>
    )
  return (
    <article className={cx('ml-chat-msg', `ml-chat-msg--${role}`, className, { 'ml-chat-msg--error': status === 'error' })}>
      <Avatar className="ml-chat-msg__avatar" size="sm" src={avatar} name={name} lion={role === 'assistant' && !avatar} ring={role === 'assistant' ? 'gold' : 'steel'} />
      <div className="ml-chat-msg__main">
        {(name || time) && (
          <p className="ml-chat-msg__meta">
            {name && <b>{name}</b>}
            {time && <span>{time}</span>}
          </p>
        )}
        <div className="ml-chat-msg__bubble">
          {typing ? (
            <span className="ml-chat-msg__typing" role="status" aria-label={loc.chat.typing}>
              {[0, 1, 2].map((i) => (
                <Paw key={i} tone="current" style={{ '--i': i } as CSSProperties} />
              ))}
            </span>
          ) : (
            body
          )}
        </div>
        {status && role === 'user' && <p className="ml-chat-msg__status">{loc.chat.status[status]}</p>}
        {actions != null && actions !== false && <div className="ml-chat-msg__actions">{actions}</div>}
      </div>
    </article>
  )
}
