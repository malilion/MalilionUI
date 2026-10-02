<script setup lang="ts">
import { ref } from 'vue'

const email = ref('')
const domains = ['gmail.com', 'outlook.com', 'yahoo.com.tw', 'pride.io', 'malilion.dev']
// Suggest full addresses from whatever has been typed before the @.
const suggestions = ref<string[]>([])

function update(value: string) {
  const [name] = value.split('@')
  suggestions.value = name ? domains.map((d) => `${name}@${d}`) : []
}
</script>

<template>
  <div class="form">
    <MlAutocomplete
      v-model="email"
      index="01"
      label="Email"
      :suggestions="suggestions"
      placeholder="輸入帳號，網域會自動補上"
      hint="可以自由輸入，建議只是捷徑。"
      clearable
      @update:model-value="update"
    />
  </div>
</template>

<style scoped>
.form {
  max-width: 420px;
}
</style>
