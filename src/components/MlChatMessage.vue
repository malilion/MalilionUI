<script setup lang="ts">
import MlAvatar from './MlAvatar.vue'
import MlPaw from './MlPaw.vue'
import { useLocale } from '../locale'

const loc = useLocale()

withDefaults(
  defineProps<{
    /** user: right-aligned gold bubble. assistant: the lion's steel bubble. system: a centred note. */
    role?: 'user' | 'assistant' | 'system'
    name?: string
    /** Avatar image; the assistant defaults to the lion. */
    avatar?: string
    /** Small timestamp, free text. */
    time?: string
    /** Show the "typing…" paw dots instead of content. */
    typing?: boolean
    /** Delivery state for the user's own messages. */
    status?: 'sending' | 'sent' | 'error'
    /** Plain-text content (newlines kept); use the default slot for rich content. */
    content?: string
  }>(),
  { role: 'assistant' },
)
</script>

<template>
  <article v-if="role === 'system'" class="ml-chat-msg ml-chat-msg--system">
    <span><slot>{{ content }}</slot></span>
  </article>
  <article v-else :class="['ml-chat-msg', `ml-chat-msg--${role}`, { 'ml-chat-msg--error': status === 'error' }]">
    <MlAvatar
      class="ml-chat-msg__avatar"
      size="sm"
      :src="avatar"
      :name="name"
      :lion="role === 'assistant' && !avatar"
      :ring="role === 'assistant' ? 'gold' : 'steel'"
    />
    <div class="ml-chat-msg__main">
      <p v-if="name || time" class="ml-chat-msg__meta">
        <b v-if="name">{{ name }}</b><span v-if="time">{{ time }}</span>
      </p>
      <div class="ml-chat-msg__bubble">
        <span v-if="typing" class="ml-chat-msg__typing" role="status" :aria-label="loc.chat.typing">
          <MlPaw v-for="i in 3" :key="i" tone="current" :style="{ '--i': i - 1 }" />
        </span>
        <slot v-else>{{ content }}</slot>
      </div>
      <p v-if="status && role === 'user'" class="ml-chat-msg__status">{{ loc.chat.status[status] }}</p>
      <div v-if="$slots.actions" class="ml-chat-msg__actions"><slot name="actions" /></div>
    </div>
  </article>
</template>
