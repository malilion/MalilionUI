<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { prefersReducedMotion } from '../composables'
import type { MlAnchorItem } from '../types'

const props = withDefaults(
  defineProps<{
    items: MlAnchorItem[]
    /** Space kept above a section when jumping to it (e.g. a sticky header), in px. */
    offset?: number
    /** Scrolling element to watch; defaults to the page. Element or CSS selector. */
    container?: HTMLElement | string
    /** Write #id to the URL when a link is clicked. */
    updateHash?: boolean
    title?: string
    /** Accessible name for the navigation landmark. */
    label?: string
  }>(),
  { offset: 0, updateHash: true, label: '本頁目錄' },
)

const emit = defineEmits<{ change: [id: string] }>()
/** The id of the section currently in view. */
const active = defineModel<string>()

const list = ref<HTMLElement>()
const ink = ref({ top: 0, height: 0, ready: false })

const flat = computed(() => {
  const out: { item: MlAnchorItem; depth: number }[] = []
  const walk = (items: MlAnchorItem[], depth: number) =>
    items.forEach((item) => {
      out.push({ item, depth })
      if (item.children) walk(item.children, depth + 1)
    })
  walk(props.items, 0)
  return out
})

let scroller: HTMLElement | Window | null = null
// Compared by identity: `instanceof Window` fails across realms (iframes, test DOMs).
const isPage = (s: unknown): s is Window => s === window
/** Ignore scroll-spy while a click-initiated smooth scroll is running. */
let lockedUntil = 0

function resolveScroller(): HTMLElement | Window {
  if (!props.container) return window
  if (typeof props.container === 'string') return document.querySelector<HTMLElement>(props.container) ?? window
  return props.container
}

function viewportTop() {
  return isPage(scroller) || !scroller ? 0 : scroller.getBoundingClientRect().top
}

function spy() {
  if (Date.now() < lockedUntil) return
  const line = viewportTop() + props.offset + 8
  let current: string | undefined
  for (const { item } of flat.value) {
    const el = document.getElementById(item.id)
    if (el && el.getBoundingClientRect().top <= line) current = item.id
  }
  // Scrolled to the very bottom: the last section wins even if it's short.
  const el = isPage(scroller) ? document.documentElement : scroller
  const scrolls = !!el && el.scrollHeight > el.clientHeight
  if (el && scrolls && el.scrollTop + el.clientHeight >= el.scrollHeight - 2 && flat.value.length) {
    current = flat.value[flat.value.length - 1].item.id
  }
  current ??= flat.value[0]?.item.id
  if (current && current !== active.value) {
    active.value = current
    emit('change', current)
  }
}

function go(event: MouseEvent, id: string) {
  const target = document.getElementById(id)
  if (!target || event.button !== 0 || event.metaKey || event.ctrlKey) return
  event.preventDefault()
  const behavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'smooth'
  if (isPage(scroller) || !scroller) {
    window.scrollTo({ top: window.scrollY + target.getBoundingClientRect().top - props.offset, behavior })
  } else {
    scroller.scrollTo({ top: scroller.scrollTop + target.getBoundingClientRect().top - viewportTop() - props.offset, behavior })
  }
  if (props.updateHash) history.replaceState(history.state, '', `#${id}`)
  lockedUntil = Date.now() + 700
  active.value = id
  emit('change', id)
  target.setAttribute('tabindex', '-1')
  target.focus({ preventScroll: true })
}

async function moveInk() {
  await nextTick()
  const link = list.value?.querySelector<HTMLElement>('.ml-anchor__link--active')
  if (!link) return
  ink.value = { top: link.offsetTop, height: link.offsetHeight, ready: true }
}

watch(active, moveInk)

let frame = 0
const onScroll = () => {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(spy)
}

onMounted(() => {
  scroller = resolveScroller()
  scroller.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll)
  spy()
  moveInk()
})

onBeforeUnmount(() => {
  scroller?.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
  cancelAnimationFrame(frame)
})
</script>

<template>
  <nav class="ml-anchor" :aria-label="label">
    <p v-if="title" class="ml-anchor__title">{{ title }}</p>
    <div ref="list" class="ml-anchor__list">
      <span
        class="ml-anchor__ink"
        :style="{ transform: `translateY(${ink.top}px)`, height: `${ink.height}px`, opacity: ink.ready ? 1 : 0 }"
        aria-hidden="true"
      />
      <a
        v-for="{ item, depth } in flat"
        :key="item.id"
        :href="`#${item.id}`"
        :class="['ml-anchor__link', { 'ml-anchor__link--active': active === item.id }]"
        :style="depth ? { '--_depth': depth } : undefined"
        :aria-current="active === item.id ? 'location' : undefined"
        @click="go($event, item.id)"
      >{{ item.label }}</a>
    </div>
  </nav>
</template>
