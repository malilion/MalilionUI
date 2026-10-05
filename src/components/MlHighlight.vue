<script setup lang="ts">
import { computed } from 'vue'
import { splitHighlight } from './highlight-text'
import type { MlHighlightTone } from '../types'

const props = withDefaults(
  defineProps<{
    text: string
    /** One keyword or several; empty ones are ignored. */
    keywords?: string | string[]
    caseSensitive?: boolean
    /** Match ＡＢＣ / １２３ against ABC / 123. */
    ignoreWidth?: boolean
    /** Element wrapped around each match. */
    tag?: string
    /** Extra class on each match. */
    highlightClass?: string
    tone?: MlHighlightTone
  }>(),
  { ignoreWidth: true, tag: 'mark', tone: 'gold' },
)

// Text nodes only — the keywords and the text are never parsed as HTML.
const chunks = computed(() =>
  splitHighlight(props.text ?? '', props.keywords, { caseSensitive: props.caseSensitive, ignoreWidth: props.ignoreWidth }),
)
</script>

<template>
  <span :class="['ml-highlight', `ml-highlight--${tone}`]"><template v-for="(chunk, i) in chunks" :key="i"><component :is="tag" v-if="chunk.match" :class="['ml-highlight__mark', highlightClass]">{{ chunk.text }}</component><template v-else>{{ chunk.text }}</template></template></span>
</template>
