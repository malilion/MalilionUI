<script setup lang="ts">
import { ref } from 'vue'

const before = `<script setup lang="ts">
import { ref } from 'vue'

const roars = ref(0)
<\/script>

<template>
  <MlButton @click="roars++">吼</MlButton>
  <p>已經吼了 {{ roars }} 次</p>
</template>

<style scoped>
p {
  color: gray;
}
</style>
`

const after = `<script setup lang="ts">
import { computed, ref } from 'vue'

const roars = ref(0)
const loud = computed(() => roars.value >= 3)
<\/script>

<template>
  <MlButton stamp @click="roars++">吼 × {{ roars }}</MlButton>
  <p :class="{ loud }">已經吼了 {{ roars }} 次</p>
</template>

<style scoped>
p {
  color: var(--ml-text-muted);
}
.loud {
  color: var(--ml-accent-text);
}
</style>
`

const view = ref<'split' | 'unified'>('split')
const wrap = ref(false)
</script>

<template>
  <div class="demo">
    <div class="controls">
      <MlSegmented
        v-model="view"
        size="sm"
        label="檢視方式"
        :options="[
          { label: '並排 split', value: 'split' },
          { label: '單欄 unified', value: 'unified' },
        ]"
      />
      <MlSwitch v-model="wrap" label="長行換行" />
    </div>
    <MlCodeDiff v-model:view="view" :old-code="before" :new-code="after" filename="Roar.vue" :wrap="wrap" />
  </div>
</template>

<style scoped>
.demo {
  display: grid;
  gap: 12px;
  width: 100%;
}
.controls {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
}
</style>
