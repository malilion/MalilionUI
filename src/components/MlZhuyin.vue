<script setup lang="ts">
import { computed } from 'vue'
import { zhuyinPieces } from '../zhuyin'

const props = withDefaults(
  defineProps<{
    /** The Chinese text. */
    text: string
    /**
     * Readings for the Han characters in order, separated by spaces (注音 or
     * pinyin; "_" skips one). Without it, words registered with registerZhuyin() are used.
     */
    zhuyin?: string | string[]
    /** right: 直式 like Taiwanese textbooks. top: a ruby line above. */
    position?: 'right' | 'top'
  }>(),
  { position: 'right' },
)

const units = computed(() => zhuyinPieces(props.text, props.zhuyin))
const MARK = ['', '', 'ˊ', 'ˇ', 'ˋ', '']
</script>

<template>
  <span :class="['ml-zhuyin', `ml-zhuyin--${position}`]" lang="zh-Hant-TW">
    <template v-for="(u, i) in units" :key="i">
      <span v-if="u.symbols.length" class="ml-zhuyin__glyph"
        ><ruby class="ml-zhuyin__unit"
          >{{ u.char }}<rp>(</rp
          ><rt class="ml-zhuyin__rt"
            ><span class="ml-zhuyin__col"
              ><span v-if="u.tone === 5" class="ml-zhuyin__light">˙</span
              ><span v-for="(sym, k) in u.symbols" :key="k" class="ml-zhuyin__sym">{{ sym }}</span></span
            ><span v-if="MARK[u.tone]" class="ml-zhuyin__tone">{{ MARK[u.tone] }}</span></rt
          ><rp>)</rp></ruby
        >{{ u.tail }}</span
      >
      <template v-else>{{ u.char }}</template>
    </template>
  </span>
</template>
