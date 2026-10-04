// MlComments / Comments — framework-free: sorting, the reply tree (with replies
// past the max depth flattened as "回覆 @name"), likes and adding comments.
// Every update returns a new array, so v-model / controlled props stay simple.
import { toEpoch, type MlTimeInput } from './relative-time'

export interface MlCommentAuthor {
  name: string
  avatar?: string
}

export interface MlComment {
  id: string | number
  author: MlCommentAuthor
  /** Plain text; newlines are kept, HTML is shown as text. */
  content: string
  time: MlTimeInput
  likes?: number
  liked?: boolean
  replies?: MlComment[]
}

export type MlCommentSort = 'newest' | 'oldest' | 'popular'

export const COMMENT_SORTS: MlCommentSort[] = ['newest', 'oldest', 'popular']

/** One rendered comment: nesting depth, who it answers when flattened, and its visible children. */
export interface MlCommentNode {
  comment: MlComment
  depth: number
  /** Set for replies past the max depth that were lifted up a level. */
  replyTo?: string
  children: MlCommentNode[]
}

const time = (c: MlComment) => toEpoch(c.time) || 0

/** Sorted copy. Popular: most likes, then newest. */
export function sortComments(list: MlComment[], sort: MlCommentSort): MlComment[] {
  const out = list.slice()
  if (sort === 'oldest') return out.sort((a, b) => time(a) - time(b))
  if (sort === 'popular') return out.sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0) || time(b) - time(a))
  return out.sort((a, b) => time(b) - time(a))
}

/**
 * The tree to render. Top-level comments follow `sort`; replies read oldest
 * first. Nesting stops at `maxDepth` (0 = flat): deeper replies sit at that
 * depth right after the one they answer, with `replyTo` set to its author.
 */
export function commentTree(list: MlComment[], sort: MlCommentSort, maxDepth: number): MlCommentNode[] {
  const limit = Math.max(0, Math.floor(maxDepth))
  const build = (c: MlComment, depth: number, replyTo?: string): MlCommentNode[] => {
    const replies = sortComments(c.replies ?? [], 'oldest')
    if (depth < limit) return [{ comment: c, depth, replyTo, children: replies.flatMap((r) => build(r, depth + 1)) }]
    return [{ comment: c, depth, replyTo, children: [] }, ...replies.flatMap((r) => build(r, depth, c.author.name))]
  }
  return sortComments(list, sort).flatMap((c) => build(c, 0))
}

/** Comments plus all their replies. */
export function countComments(list: MlComment[]): number {
  return list.reduce((n, c) => n + 1 + countComments(c.replies ?? []), 0)
}

export function findComment(list: MlComment[], id: MlComment['id']): MlComment | undefined {
  for (const c of list) {
    if (c.id === id) return c
    const hit = findComment(c.replies ?? [], id)
    if (hit) return hit
  }
  return undefined
}

/** Copy of the list with `fn` applied to comment `id` (unchanged list when it is missing). */
export function updateComment(list: MlComment[], id: MlComment['id'], fn: (c: MlComment) => MlComment): MlComment[] {
  let hit = false
  const walk = (items: MlComment[]): MlComment[] =>
    items.map((c) => {
      if (c.id === id) {
        hit = true
        return fn(c)
      }
      if (!c.replies?.length) return c
      const replies = walk(c.replies)
      return replies.some((r, i) => r !== c.replies![i]) ? { ...c, replies } : c
    })
  const out = walk(list)
  return hit ? out : list
}

/** Flip a like: the new list and the new state. */
export function toggleCommentLike(list: MlComment[], id: MlComment['id']): { list: MlComment[]; liked: boolean } {
  let liked = false
  const next = updateComment(list, id, (c) => {
    liked = !c.liked
    return { ...c, liked, likes: Math.max(0, (c.likes ?? 0) + (liked ? 1 : -1)) }
  })
  return { list: next, liked }
}

/** Add a comment at the top level, or as the last reply of `parentId`. */
export function addComment(list: MlComment[], comment: MlComment, parentId?: MlComment['id']): MlComment[] {
  if (parentId === undefined) return [...list, comment]
  return updateComment(list, parentId, (c) => ({ ...c, replies: [...(c.replies ?? []), comment] }))
}

let seq = 0
/** A fresh id for a comment typed here. */
export const newCommentId = () => `ml-c-${Date.now().toString(36)}-${(++seq).toString(36)}`

/** Ids from the top-level comment down to `id` (empty when missing). */
export function commentPath(list: MlComment[], id: MlComment['id']): MlComment['id'][] {
  for (const c of list) {
    if (c.id === id) return [c.id]
    const rest = commentPath(c.replies ?? [], id)
    if (rest.length) return [c.id, ...rest]
  }
  return []
}

/** Children shown for a node: all when expanded, else the first `collapseAfter`. */
export function visibleReplies(node: MlCommentNode, expanded: boolean, collapseAfter: number) {
  const collapsible = node.children.length > collapseAfter
  const shown = expanded || !collapsible ? node.children : node.children.slice(0, Math.max(0, collapseAfter))
  return { shown, hidden: node.children.length - shown.length, collapsible }
}

/** Ctrl/⌘ + Enter submits a comment box (never mid-IME composition). */
export const isSubmitKey = (e: { key: string; ctrlKey: boolean; metaKey: boolean; isComposing?: boolean }) =>
  e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !e.isComposing

/** @internal What MlComments hands each (recursive) thread. */
export interface MlCommentsContext {
  uid: string
  readonly: boolean
  collapseAfter: number
  maxLength?: number
  replyingTo: MlComment['id'] | null
  replyDraft: string
  expanded: MlComment['id'][]
  time: (t: MlTimeInput) => string
  like: (id: MlComment['id']) => void
  startReply: (id: MlComment['id']) => void
  cancelReply: () => void
  setDraft: (text: string) => void
  submitReply: () => void
  toggle: (id: MlComment['id']) => void
}
