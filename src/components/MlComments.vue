<script setup lang="ts">
import { computed, nextTick, reactive, ref, useId, watch } from 'vue'
import MlAvatar from './MlAvatar.vue'
import MlEmpty from './MlEmpty.vue'
import MlCommentThread from './MlCommentThread.vue'
import { useLocale } from '../locale'
import { useNow } from './use-now'
import { relativeTime, type MlTimeInput } from './relative-time'
import {
  COMMENT_SORTS,
  addComment,
  commentPath,
  commentTree,
  countComments,
  isSubmitKey,
  newCommentId,
  toggleCommentLike,
  type MlComment,
  type MlCommentAuthor,
  type MlCommentSort,
  type MlCommentsContext,
} from './comments'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    /** Replies nest this many levels; deeper ones line up at the last level as "回覆 @name". */
    maxDepth?: number
    /** Threads with more replies than this start collapsed ("展開 5 則回覆"). */
    collapseAfter?: number
    /** "Now" for relative times (pass a fixed value for tests / SSR). Defaults to the clock. */
    now?: MlTimeInput
    /** Who is writing. With it, new comments are added to v-model:comments; without, only `submit` fires. */
    currentUser?: MlCommentAuthor
    /** Show the new-comment box at the top. */
    composer?: boolean
    /** No composer, replies or likes. */
    readonly?: boolean
    maxLength?: number
    placeholder?: string
    title?: string
    /** Empty-state title. */
    emptyText?: string
    label?: string
  }>(),
  { maxDepth: 2, collapseAfter: 3, composer: true, readonly: false },
)

const emit = defineEmits<{
  submit: [content: string, parentId: MlComment['id'] | undefined]
  like: [id: MlComment['id'], liked: boolean]
}>()

const comments = defineModel<MlComment[]>('comments', { default: () => [] })
const sort = defineModel<MlCommentSort>('sort', { default: 'newest' })

const uid = `ml-comments-${useId()}`
const root = ref<HTMLElement>()
const draft = ref('')
const announce = ref('')
const now = useNow(() => props.now)

const tree = computed(() => commentTree(comments.value, sort.value, props.maxDepth))
const total = computed(() => countComments(comments.value))
const canWrite = computed(() => props.composer && !props.readonly)

function post(content: string, parentId?: MlComment['id']) {
  const text = content.trim()
  if (!text) return false
  emit('submit', text, parentId)
  if (props.currentUser) {
    const comment: MlComment = { id: newCommentId(), author: { ...props.currentUser }, content: text, time: props.now ?? Date.now(), likes: 0 }
    comments.value = addComment(comments.value, comment, parentId)
    if (parentId !== undefined) ctx.expanded = [...new Set([...ctx.expanded, ...commentPath(comments.value, parentId)])]
  }
  // A changed string makes screen readers repeat the same message.
  const said = loc.value.comments.submitted
  announce.value = announce.value === said ? `${said} ` : said
  return true
}

function focusReplyButton(id: MlComment['id']) {
  nextTick(() => {
    const btn = [...(root.value?.querySelectorAll<HTMLElement>('[data-reply]') ?? [])].find((b) => b.dataset.reply === String(id))
    btn?.focus()
  })
}

const ctx: MlCommentsContext = reactive({
  uid,
  readonly: computed(() => props.readonly),
  collapseAfter: computed(() => props.collapseAfter),
  maxLength: computed(() => props.maxLength),
  replyingTo: null,
  replyDraft: '',
  expanded: [],
  time: (t: MlTimeInput) => relativeTime(t, now.value, loc.value.name, loc.value.relativeTime.justNow),
  like(id: MlComment['id']) {
    if (props.readonly) return
    const { list, liked } = toggleCommentLike(comments.value, id)
    comments.value = list
    emit('like', id, liked)
  },
  startReply(id: MlComment['id']) {
    ctx.replyingTo = id
    ctx.replyDraft = ''
    nextTick(() => root.value?.querySelector<HTMLElement>('.ml-comments__editor--reply textarea')?.focus())
  },
  cancelReply() {
    const id = ctx.replyingTo
    ctx.replyingTo = null
    ctx.replyDraft = ''
    if (id !== null) focusReplyButton(id)
  },
  setDraft(text: string) {
    ctx.replyDraft = text
  },
  submitReply() {
    const id = ctx.replyingTo
    if (id === null || !post(ctx.replyDraft, id)) return
    ctx.replyingTo = null
    ctx.replyDraft = ''
    focusReplyButton(id)
  },
  toggle(id: MlComment['id']) {
    ctx.expanded = ctx.expanded.includes(id) ? ctx.expanded.filter((x) => x !== id) : [...ctx.expanded, id]
  },
} as unknown as MlCommentsContext)

watch(
  () => props.readonly,
  (ro) => {
    if (ro) ctx.replyingTo = null
  },
)

function submitTop() {
  if (post(draft.value)) draft.value = ''
}

function onTopKeydown(event: KeyboardEvent) {
  if (isSubmitKey(event)) {
    event.preventDefault()
    submitTop()
  }
}
</script>

<template>
  <section ref="root" class="ml-comments" :aria-labelledby="`${uid}-title`">
    <header class="ml-comments__head">
      <h3 :id="`${uid}-title`" class="ml-comments__title">
        {{ title ?? loc.comments.title }}
        <span class="ml-comments__total">{{ loc.comments.count(total) }}</span>
      </h3>
      <div v-if="total > 1" class="ml-comments__sort" role="group" :aria-label="loc.comments.sortLabel">
        <button
          v-for="s in COMMENT_SORTS"
          :key="s"
          type="button"
          :class="['ml-comments__sort-btn', { 'ml-comments__sort-btn--active': s === sort }]"
          :aria-pressed="s === sort ? 'true' : 'false'"
          @click="sort = s"
        >
          {{ loc.comments.sort[s] }}
        </button>
      </div>
    </header>
    <form v-if="canWrite" class="ml-comments__composer" @submit.prevent="submitTop">
      <MlAvatar class="ml-comments__avatar" size="sm" ring="gold" :src="currentUser?.avatar" :name="currentUser?.name ?? loc.comments.you" />
      <div class="ml-comments__editor">
        <textarea
          v-model="draft"
          class="ml-comments__textarea"
          rows="2"
          :maxlength="maxLength"
          :placeholder="placeholder ?? loc.comments.placeholder"
          :aria-label="placeholder ?? loc.comments.placeholder"
          @keydown="onTopKeydown"
        />
        <div class="ml-comments__editor-foot">
          <span class="ml-comments__hint">{{ loc.comments.hint }}</span>
          <button type="submit" class="ml-comments__submit" :disabled="!draft.trim()">{{ loc.comments.submit }}</button>
        </div>
      </div>
    </form>
    <ol v-if="tree.length" class="ml-comments__list">
      <MlCommentThread v-for="node in tree" :key="node.comment.id" :node="node" :ctx="ctx" />
    </ol>
    <MlEmpty v-else size="sm" art="paws" :title="emptyText ?? loc.comments.empty" :description="readonly ? undefined : loc.comments.emptyHint" />
    <p class="ml-visually-hidden" aria-live="polite">{{ announce }}</p>
  </section>
</template>
