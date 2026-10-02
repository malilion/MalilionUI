<script setup lang="ts">
withDefaults(
  defineProps<{
    /** Screen width in px; the height follows a modern phone's aspect ratio. */
    width?: number
    time?: string
    /** Accessible name for the mock-up, e.g. "登入畫面預覽". */
    label?: string
  }>(),
  { width: 300, time: '9:41' },
)
</script>

<template>
  <figure class="ml-phone" :style="{ '--_w': `${width}px` }" :aria-label="label">
    <div class="ml-phone__screen">
      <div class="ml-phone__status" aria-hidden="true">
        <span class="ml-phone__time">{{ time }}</span>
        <span class="ml-phone__island" />
        <span class="ml-phone__icons">
          <svg viewBox="0 0 18 12"><path d="M1 11h2V8H1zM5 11h2V6H5zM9 11h2V4H9zM13 11h2V1h-2z" fill="currentColor" /></svg>
          <svg viewBox="0 0 16 12"><path d="M8 11l2-2.5a3 3 0 00-4 0zM3.5 6.2a6.5 6.5 0 019 0l-1.4 1.6a4.4 4.4 0 00-6.2 0zM.8 3.4a10.3 10.3 0 0114.4 0L13.8 5a8.3 8.3 0 00-11.6 0z" fill="currentColor" /></svg>
          <svg viewBox="0 0 26 12"><rect x="1" y="1" width="21" height="10" rx="3" fill="none" stroke="currentColor" opacity="0.5" /><rect x="3" y="3" width="15" height="6" rx="1.5" fill="currentColor" /><path d="M23.5 4.5v3" stroke="currentColor" opacity="0.5" /></svg>
        </span>
      </div>
      <div class="ml-phone__content">
        <slot />
      </div>
      <div v-if="$slots.bottom" class="ml-phone__bottom"><slot name="bottom" /></div>
      <span class="ml-phone__home" aria-hidden="true" />
    </div>
  </figure>
</template>
