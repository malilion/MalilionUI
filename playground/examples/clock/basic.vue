<template>
  <MlClock label="現在" digital />
  <MlClock tone="tech" motion="sweep" numerals="roman" digital />
  <MlClock tone="bean" :size="150" :seconds="false" numerals="none" />
</template>
