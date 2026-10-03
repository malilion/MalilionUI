<script setup lang="ts">
// The docs site's code block is just the library's MlCodeBlock with a toast on copy.
withDefaults(
  defineProps<{
    code: string
    filename?: string
    lang?: string
    /** Show a toggle to fold the code away. */
    collapsible?: boolean
  }>(),
  { lang: 'vue' },
)
</script>

<template>
  <MlCodeBlock :code="code" :filename="filename" :lang="lang" :collapsible="collapsible" toast-on-copy />
</template>
