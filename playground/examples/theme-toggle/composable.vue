<script setup lang="ts">
import { useTheme } from '@malilion/ui'

const { isDark, setTheme, toggle } = useTheme()

// Grow the new theme from the button that was pressed (View Transitions API).
function flip(event: MouseEvent) {
  toggle({ origin: event })
}
</script>

<template>
  <MlButton variant="steel" @click="flip">{{ isDark ? '換成日光' : '換成夜間' }}</MlButton>
  <MlButton variant="ghost" @click="setTheme('system', { smooth: false })">跟隨系統（不要動畫）</MlButton>
</template>
