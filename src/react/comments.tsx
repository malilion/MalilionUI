import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import {
  COMMENT_SORTS,
  addComment,
  commentPath,
  commentTree,
  countComments,
  isSubmitKey,
  newCommentId,
  toggleCommentLike,
  visibleReplies,
  type MlComment,
  type MlCommentAuthor,
  type MlCommentNode,
  type MlCommentSort,
  type MlCommentsContext,
} from '../components/comments'
import { relativeTime, toIso, type MlTimeInput } from '../components/relative-time'
import { Avatar, Empty, Paw } from './basic'
import { useLocale } from './locale'
import { useNow } from './use-outside'
import { cx, useControllable } from './utils'

export { commentTree, countComments, sortComments, toggleCommentLike, addComment } from '../components/comments'
export { relativeTime } from '../components/relative-time'
export type { MlComment, MlCommentAuthor, MlCommentSort, MlCommentNode } from '../components/comments'
export type { MlTimeInput } from '../components/relative-time'

const NO_COMMENTS: MlComment[] = []

export interface CommentsProps {
  comments?: MlComment[]
  defaultComments?: MlComment[]
  onCommentsChange?: (comments: MlComment[]) => void
  sort?: MlCommentSort
  defaultSort?: MlCommentSort
  onSortChange?: (sort: MlCommentSort) => void
  /** Replies nest this many levels; deeper ones line up as "回覆 @name". Default 2. */
  maxDepth?: number
  /** Threads with more replies than this start collapsed. Default 3. */
  collapseAfter?: number
  /** "Now" for relative times. Defaults to the clock. */
  now?: MlTimeInput
  /** Who is writing. With it, new comments are added to the list; without, only onSubmit fires. */
  currentUser?: MlCommentAuthor
  /** Show the new-comment box. Default true. */
  composer?: boolean
  readonly?: boolean
  maxLength?: number
  placeholder?: string
  title?: string
  emptyText?: string
  onSubmit?: (content: string, parentId: MlComment['id'] | undefined) => void
  onLike?: (id: MlComment['id'], liked: boolean) => void
  className?: string
}

function Thread({ node, ctx }: { node: MlCommentNode; ctx: MlCommentsContext }) {
  const loc = useLocale()
  const c = node.comment
  const headId = `${ctx.uid}-c-${c.id}`
  const replying = ctx.replyingTo === c.id
  const view = visibleReplies(node, ctx.expanded.includes(c.id), ctx.collapseAfter)
  const onKeydown = (event: KeyboardEvent) => {
    if (isSubmitKey({ key: event.key, ctrlKey: event.ctrlKey, metaKey: event.metaKey, isComposing: event.nativeEvent.isComposing })) {
      event.preventDefault()
      ctx.submitReply()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      ctx.cancelReply()
    }
  }
  return (
    <li className={cx('ml-comments__item', { 'ml-comments__item--flat': node.replyTo })}>
      <article className="ml-comments__comment" aria-labelledby={headId}>
        <Avatar className="ml-comments__avatar" size="sm" ring="steel" src={c.author.avatar} name={c.author.name} />
        <div className="ml-comments__main">
          <header className="ml-comments__meta">
            <h4 id={headId} className="ml-comments__author">
              {c.author.name}
            </h4>
            <time className="ml-comments__time" dateTime={toIso(c.time)}>
              {ctx.time(c.time)}
            </time>
          </header>
          {node.replyTo && <p className="ml-comments__reply-to">{loc.comments.replyTo(node.replyTo)}</p>}
          <p className="ml-comments__content">{c.content}</p>
          <div className="ml-comments__actions">
            <button
              type="button"
              className={cx('ml-comments__like', { 'ml-comments__like--on': c.liked })}
              aria-pressed={c.liked ? 'true' : 'false'}
              aria-label={loc.comments.like(c.likes ?? 0)}
              disabled={ctx.readonly}
              onClick={() => ctx.like(c.id)}
            >
              <Paw tone="current" className="ml-comments__paw" />
              <span className="ml-comments__like-count">{c.likes ?? 0}</span>
            </button>
            {!ctx.readonly && (
              <button
                type="button"
                className="ml-comments__reply-btn"
                data-reply={String(c.id)}
                aria-expanded={replying ? 'true' : 'false'}
                onClick={() => (replying ? ctx.cancelReply() : ctx.startReply(c.id))}
              >
                {loc.comments.reply}
              </button>
            )}
          </div>
          {replying && (
            <form
              className="ml-comments__editor ml-comments__editor--reply"
              onSubmit={(e) => {
                e.preventDefault()
                ctx.submitReply()
              }}
            >
              <textarea
                className="ml-comments__textarea"
                rows={2}
                value={ctx.replyDraft}
                maxLength={ctx.maxLength}
                placeholder={loc.comments.replyPlaceholder(c.author.name)}
                aria-label={loc.comments.replyPlaceholder(c.author.name)}
                onChange={(e) => ctx.setDraft(e.target.value)}
                onKeyDown={onKeydown}
              />
              <div className="ml-comments__editor-foot">
                <span className="ml-comments__hint">{loc.comments.hint}</span>
                <button type="button" className="ml-comments__cancel" onClick={() => ctx.cancelReply()}>
                  {loc.comments.cancel}
                </button>
                <button type="submit" className="ml-comments__submit" disabled={!ctx.replyDraft.trim()}>
                  {loc.comments.submit}
                </button>
              </div>
            </form>
          )}
        </div>
      </article>
      {view.shown.length > 0 && (
        <ol className="ml-comments__replies">
          {view.shown.map((child) => (
            <Thread key={child.comment.id} node={child} ctx={ctx} />
          ))}
        </ol>
      )}
      {view.collapsible && (
        <button type="button" className="ml-comments__toggle" aria-expanded={view.hidden ? 'false' : 'true'} onClick={() => ctx.toggle(c.id)}>
          {view.hidden ? loc.comments.expand(view.hidden) : loc.comments.collapse}
        </button>
      )}
    </li>
  )
}

export function Comments({
  comments: commentsProp,
  defaultComments = NO_COMMENTS,
  onCommentsChange,
  sort: sortProp,
  defaultSort = 'newest',
  onSortChange,
  maxDepth = 2,
  collapseAfter = 3,
  now: nowProp,
  currentUser,
  composer = true,
  readonly = false,
  maxLength,
  placeholder,
  title,
  emptyText,
  onSubmit,
  onLike,
  className,
}: CommentsProps) {
  const loc = useLocale()
  const uid = `ml-comments-${useId().replace(/:/g, '')}`
  const [comments, setComments] = useControllable(commentsProp, defaultComments, onCommentsChange)
  const [sort, setSort] = useControllable(sortProp, defaultSort, onSortChange)
  const now = useNow(nowProp)
  const root = useRef<HTMLElement>(null)
  const [draft, setDraft] = useState('')
  const [announce, setAnnounce] = useState('')
  const [replyingTo, setReplyingTo] = useState<MlComment['id'] | null>(null)
  const [replyDraft, setReplyDraft] = useState('')
  const [expanded, setExpanded] = useState<MlComment['id'][]>([])
  const pendingFocus = useRef<{ reply?: MlComment['id']; box?: boolean } | null>(null)

  useEffect(() => {
    const p = pendingFocus.current
    if (!p) return
    pendingFocus.current = null
    if (p.box) root.current?.querySelector<HTMLElement>('.ml-comments__editor--reply textarea')?.focus()
    else if (p.reply !== undefined) [...(root.current?.querySelectorAll<HTMLElement>('[data-reply]') ?? [])].find((b) => b.dataset.reply === String(p.reply))?.focus()
  })
  useEffect(() => {
    if (readonly) setReplyingTo(null)
  }, [readonly])

  const tree = commentTree(comments, sort, maxDepth)
  const total = countComments(comments)
  const canWrite = composer && !readonly

  function post(content: string, parentId?: MlComment['id']) {
    const text = content.trim()
    if (!text) return false
    onSubmit?.(text, parentId)
    if (currentUser) {
      const comment: MlComment = { id: newCommentId(), author: { ...currentUser }, content: text, time: nowProp ?? Date.now(), likes: 0 }
      const next = addComment(comments, comment, parentId)
      setComments(next)
      if (parentId !== undefined) setExpanded((e) => [...new Set([...e, ...commentPath(next, parentId)])])
    }
    // A changed string makes screen readers repeat the same message.
    setAnnounce((a) => (a === loc.comments.submitted ? `${a} ` : loc.comments.submitted))
    return true
  }

  const ctx: MlCommentsContext = {
    uid,
    readonly,
    collapseAfter,
    maxLength,
    replyingTo,
    replyDraft,
    expanded,
    time: (t) => relativeTime(t, now, loc.name, loc.relativeTime.justNow),
    like(id) {
      if (readonly) return
      const { list, liked } = toggleCommentLike(comments, id)
      setComments(list)
      onLike?.(id, liked)
    },
    startReply(id) {
      setReplyingTo(id)
      setReplyDraft('')
      pendingFocus.current = { box: true }
    },
    cancelReply() {
      if (replyingTo !== null) pendingFocus.current = { reply: replyingTo }
      setReplyingTo(null)
      setReplyDraft('')
    },
    setDraft: setReplyDraft,
    submitReply() {
      if (replyingTo === null || !post(replyDraft, replyingTo)) return
      pendingFocus.current = { reply: replyingTo }
      setReplyingTo(null)
      setReplyDraft('')
    },
    toggle(id) {
      setExpanded((e) => (e.includes(id) ? e.filter((x) => x !== id) : [...e, id]))
    },
  }

  function submitTop() {
    if (post(draft)) setDraft('')
  }

  return (
    <section ref={root} className={cx('ml-comments', className)} aria-labelledby={`${uid}-title`}>
      <header className="ml-comments__head">
        <h3 id={`${uid}-title`} className="ml-comments__title">
          {title ?? loc.comments.title} <span className="ml-comments__total">{loc.comments.count(total)}</span>
        </h3>
        {total > 1 && (
          <div className="ml-comments__sort" role="group" aria-label={loc.comments.sortLabel}>
            {COMMENT_SORTS.map((s) => (
              <button
                key={s}
                type="button"
                className={cx('ml-comments__sort-btn', { 'ml-comments__sort-btn--active': s === sort })}
                aria-pressed={s === sort ? 'true' : 'false'}
                onClick={() => setSort(s)}
              >
                {loc.comments.sort[s]}
              </button>
            ))}
          </div>
        )}
      </header>
      {canWrite && (
        <form
          className="ml-comments__composer"
          onSubmit={(e) => {
            e.preventDefault()
            submitTop()
          }}
        >
          <Avatar className="ml-comments__avatar" size="sm" ring="gold" src={currentUser?.avatar} name={currentUser?.name ?? loc.comments.you} />
          <div className="ml-comments__editor">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="ml-comments__textarea"
              rows={2}
              maxLength={maxLength}
              placeholder={placeholder ?? loc.comments.placeholder}
              aria-label={placeholder ?? loc.comments.placeholder}
              onKeyDown={(e) => {
                if (isSubmitKey({ key: e.key, ctrlKey: e.ctrlKey, metaKey: e.metaKey, isComposing: e.nativeEvent.isComposing })) {
                  e.preventDefault()
                  submitTop()
                }
              }}
            />
            <div className="ml-comments__editor-foot">
              <span className="ml-comments__hint">{loc.comments.hint}</span>
              <button type="submit" className="ml-comments__submit" disabled={!draft.trim()}>
                {loc.comments.submit}
              </button>
            </div>
          </div>
        </form>
      )}
      {tree.length ? (
        <ol className="ml-comments__list">
          {tree.map((node) => (
            <Thread key={node.comment.id} node={node} ctx={ctx} />
          ))}
        </ol>
      ) : (
        <Empty size="sm" art="paws" title={emptyText ?? loc.comments.empty} description={readonly ? undefined : loc.comments.emptyHint} />
      )}
      <p className="ml-visually-hidden" aria-live="polite">
        {announce}
      </p>
    </section>
  )
}
