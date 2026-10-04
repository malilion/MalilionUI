<script setup lang="ts">
// A fixed moment renders the same on the server, in screenshots and in tests: no ticking.
const launch = '2026-10-04T09:41:27+08:00'
</script>

<template>
  <MlClock :time="launch" time-zone="Asia/Taipei" label="臺北發表會" tone="steel" numerals="roman" digital offset />
  <MlClock :time="launch" time-zone="America/Los_Angeles" label="同一刻的洛杉磯" digital offset />
</template>
