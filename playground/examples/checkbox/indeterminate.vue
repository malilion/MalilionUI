<script setup lang="ts">
import { computed, ref } from 'vue'

const skills = ref([
  { name: 'Vue', on: true },
  { name: 'TypeScript', on: true },
  { name: 'Rust', on: false },
])

const all = computed(() => skills.value.every((s) => s.on))
const some = computed(() => !all.value && skills.value.some((s) => s.on))

function toggleAll(on: boolean) {
  skills.value.forEach((s) => (s.on = on))
}
</script>

<template>
  <div class="list">
    <MlCheckbox
      paw
      label="全部技能"
      :model-value="all"
      :indeterminate="some"
      @update:model-value="toggleAll"
    />
    <div class="children">
      <MlCheckbox v-for="skill in skills" :key="skill.name" v-model="skill.on" paw :label="skill.name" />
    </div>
  </div>
</template>

<style scoped>
.list {
  display: grid;
  gap: 12px;
}

.children {
  display: grid;
  gap: 10px;
  padding-left: 30px;
}
</style>
