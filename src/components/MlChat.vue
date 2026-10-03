<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import { useLocale } from '../locale'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    /** Change this (e.g. messages.length) to scroll to the newest message. */
    watchKey?: unknown
    /** Scroll area height (px number or CSS length). */
    height?: number | string
    /** Accessible name for the message log. */
    label?: string
  }>(),
  { height: 420 },
)

const log = ref<HTMLElement>()
/** Only follow new messages while the reader is already at (or near) the bottom. */
const pinned = ref(true)

function onScroll() {
  const el = log.value
  if (!el) return
  pinned.value = el.scrollHeight - el.scrollTop - el.clientHeight < 48
}

async function scrollToBottom(force = false) {
  await nextTick()
  const el = log.value
  if (el && (force || pinned.value)) el.scrollTop = el.scrollHeight
}

watch(() => props.watchKey, () => scrollToBottom())
onMounted(() => scrollToBottom(true))

defineExpose({ scrollToBottom: () => scrollToBottom(true) })
</script>

<template>
  <section class="ml-chat" :style="{ '--_h': typeof height === 'number' ? `${height}px` : height }">
    <header v-if="$slots.header" class="ml-chat__head"><slot name="header" /></header>
    <div
      ref="log"
      class="ml-chat__log"
      role="log"
      aria-live="polite"
      :aria-label="label ?? loc.chat.log"
      tabindex="0"
      @scroll="onScroll"
    >
      <slot />
    </div>
    <button v-if="!pinned" type="button" class="ml-chat__jump" @click="scrollToBottom(true)">↓ {{ loc.chat.latest }}</button>
    <footer v-if="$slots.footer" class="ml-chat__foot"><slot name="footer" /></footer>
  </section>
</template>
