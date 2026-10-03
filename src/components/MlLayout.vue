<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    /** Sidebar width (CSS length) when expanded. */
    asideWidth?: string
    /** Sidebar width when collapsed. */
    asideCollapsedWidth?: string
    /** Put the sidebar on the right. */
    asideRight?: boolean
    /** Keep the header pinned while the main area scrolls. */
    stickyHeader?: boolean
    /** Below this viewport width (px) the sidebar becomes a slide-over drawer. */
    breakpoint?: number
    /** Fill the viewport height (an app shell) instead of growing with content. */
    fullHeight?: boolean
  }>(),
  { asideWidth: '248px', asideCollapsedWidth: '64px', stickyHeader: true, breakpoint: 768, fullHeight: true },
)

/** Desktop: rail mode. */
const collapsed = defineModel<boolean>('collapsed', { default: false })
/** Mobile: drawer open. */
const asideOpen = defineModel<boolean>('asideOpen', { default: false })

const mobile = ref(false)
let query: MediaQueryList | undefined
const sync = () => (mobile.value = !!query?.matches)

onMounted(() => {
  if (typeof window === 'undefined' || !window.matchMedia) return
  query = window.matchMedia(`(max-width: ${props.breakpoint - 0.02}px)`)
  sync()
  query.addEventListener('change', sync)
})
onBeforeUnmount(() => query?.removeEventListener('change', sync))

// Leaving mobile closes the drawer so it doesn't pop back later.
watch(mobile, (m) => !m && (asideOpen.value = false))

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && mobile.value && asideOpen.value) {
    event.stopPropagation()
    asideOpen.value = false
  }
}

/** Toggle the right thing for the current screen: rail on desktop, drawer on mobile. */
function toggleAside() {
  if (mobile.value) asideOpen.value = !asideOpen.value
  else collapsed.value = !collapsed.value
}

defineExpose({ toggleAside })
</script>

<template>
  <div
    :class="[
      'ml-layout',
      {
        'ml-layout--full': fullHeight,
        'ml-layout--right': asideRight,
        'ml-layout--collapsed': collapsed && !mobile,
        'ml-layout--mobile': mobile,
        'ml-layout--aside-open': mobile && asideOpen,
        'ml-layout--sticky': stickyHeader,
        'ml-layout--no-aside': !$slots.aside,
      },
    ]"
    :style="{ '--ml-layout-aside': asideWidth, '--ml-layout-rail': asideCollapsedWidth }"
    @keydown="onKeydown"
  >
    <header v-if="$slots.header" class="ml-layout__header">
      <slot name="header" :toggle-aside="toggleAside" :collapsed="collapsed" :mobile="mobile" />
    </header>
    <aside v-if="$slots.aside" class="ml-layout__aside" :inert="mobile && !asideOpen ? true : undefined">
      <slot name="aside" :collapsed="collapsed && !mobile" :mobile="mobile" />
    </aside>
    <div v-if="$slots.aside" class="ml-layout__scrim" aria-hidden="true" @click="asideOpen = false" />
    <main class="ml-layout__main">
      <slot />
    </main>
    <footer v-if="$slots.footer" class="ml-layout__footer">
      <slot name="footer" />
    </footer>
  </div>
</template>
