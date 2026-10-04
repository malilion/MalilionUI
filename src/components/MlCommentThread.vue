<script setup lang="ts">
// @internal One comment of MlComments and, recursively, its replies.
import { computed } from 'vue'
import MlAvatar from './MlAvatar.vue'
import MlPaw from './MlPaw.vue'
import { useLocale } from '../locale'
import { toIso } from './relative-time'
import { isSubmitKey, visibleReplies, type MlCommentNode, type MlCommentsContext } from './comments'

defineOptions({ name: 'MlCommentThread' })

const props = defineProps<{ node: MlCommentNode; ctx: MlCommentsContext }>()
const loc = useLocale()

const c = computed(() => props.node.comment)
const headId = computed(() => `${props.ctx.uid}-c-${c.value.id}`)
const replying = computed(() => props.ctx.replyingTo === c.value.id)
const view = computed(() => visibleReplies(props.node, props.ctx.expanded.includes(c.value.id), props.ctx.collapseAfter))

function onKeydown(event: KeyboardEvent) {
  if (isSubmitKey(event)) {
    event.preventDefault()
    props.ctx.submitReply()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    props.ctx.cancelReply()
  }
}
</script>

<template>
  <li :class="['ml-comments__item', { 'ml-comments__item--flat': node.replyTo }]">
    <article class="ml-comments__comment" :aria-labelledby="headId">
      <MlAvatar class="ml-comments__avatar" size="sm" ring="steel" :src="c.author.avatar" :name="c.author.name" />
      <div class="ml-comments__main">
        <header class="ml-comments__meta">
          <h4 :id="headId" class="ml-comments__author">{{ c.author.name }}</h4>
          <time class="ml-comments__time" :datetime="toIso(c.time)">{{ ctx.time(c.time) }}</time>
        </header>
        <p v-if="node.replyTo" class="ml-comments__reply-to">{{ loc.comments.replyTo(node.replyTo) }}</p>
        <p class="ml-comments__content">{{ c.content }}</p>
        <div class="ml-comments__actions">
          <button
            type="button"
            :class="['ml-comments__like', { 'ml-comments__like--on': c.liked }]"
            :aria-pressed="c.liked ? 'true' : 'false'"
            :aria-label="loc.comments.like(c.likes ?? 0)"
            :disabled="ctx.readonly"
            @click="ctx.like(c.id)"
          >
            <MlPaw tone="current" class="ml-comments__paw" />
            <span class="ml-comments__like-count">{{ c.likes ?? 0 }}</span>
          </button>
          <button
            v-if="!ctx.readonly"
            type="button"
            class="ml-comments__reply-btn"
            :data-reply="String(c.id)"
            :aria-expanded="replying ? 'true' : 'false'"
            @click="replying ? ctx.cancelReply() : ctx.startReply(c.id)"
          >
            {{ loc.comments.reply }}
          </button>
        </div>
        <form v-if="replying" class="ml-comments__editor ml-comments__editor--reply" @submit.prevent="ctx.submitReply()">
          <textarea
            class="ml-comments__textarea"
            rows="2"
            :value="ctx.replyDraft"
            :maxlength="ctx.maxLength"
            :placeholder="loc.comments.replyPlaceholder(c.author.name)"
            :aria-label="loc.comments.replyPlaceholder(c.author.name)"
            @input="ctx.setDraft(($event.target as HTMLTextAreaElement).value)"
            @keydown="onKeydown"
          />
          <div class="ml-comments__editor-foot">
            <span class="ml-comments__hint">{{ loc.comments.hint }}</span>
            <button type="button" class="ml-comments__cancel" @click="ctx.cancelReply()">{{ loc.comments.cancel }}</button>
            <button type="submit" class="ml-comments__submit" :disabled="!ctx.replyDraft.trim()">{{ loc.comments.submit }}</button>
          </div>
        </form>
      </div>
    </article>
    <ol v-if="view.shown.length" class="ml-comments__replies">
      <MlCommentThread v-for="child in view.shown" :key="child.comment.id" :node="child" :ctx="ctx" />
    </ol>
    <button
      v-if="view.collapsible"
      type="button"
      class="ml-comments__toggle"
      :aria-expanded="view.hidden ? 'false' : 'true'"
      @click="ctx.toggle(c.id)"
    >
      {{ view.hidden ? loc.comments.expand(view.hidden) : loc.comments.collapse }}
    </button>
  </li>
</template>
