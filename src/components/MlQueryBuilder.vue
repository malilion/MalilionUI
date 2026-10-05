<script setup lang="ts">
import { computed, provide } from 'vue'
import MlQueryGroup from './MlQueryGroup.vue'
import { appendNode, createGroup, createRule, queryToText, replaceNode, type MlQueryField, type MlQueryGroup as Group } from './filter'
import { queryKey } from './query'
import { useLocale } from '../locale'
import type { MlSize } from '../types'

const loc = useLocale()

const props = withDefaults(
  defineProps<{
    fields?: MlQueryField[]
    /** Levels of nesting allowed, the top group included. */
    maxDepth?: number
    size?: MlSize
    disabled?: boolean
    /** Read the query back in words under the builder. */
    showText?: boolean
    /** Accessible name. Default "查詢條件". */
    label?: string
  }>(),
  { fields: () => [], maxDepth: 3, size: 'sm', disabled: false, showText: false },
)

const model = defineModel<Group>({ default: () => createGroup([], 'and', false) })

const fields = computed(() => props.fields)
provide(queryKey, {
  fields,
  maxDepth: computed(() => props.maxDepth),
  size: computed(() => props.size),
  disabled: computed(() => props.disabled),
  root: computed(() => model.value),
  replace: (id, next) => (model.value = replaceNode(model.value, id, next)),
  append: (groupId, kind) => (model.value = appendNode(model.value, groupId, kind === 'rule' ? createRule(fields.value) : createGroup(fields.value))),
})

const text = computed(() => queryToText(model.value, props.fields, loc.value.query))
</script>

<template>
  <div :class="['ml-query', `ml-query--${size}`, { 'ml-query--disabled': disabled }]" role="group" :aria-label="label ?? loc.query.label">
    <MlQueryGroup :group="model" :depth="0" />
    <p v-if="showText" class="ml-query__text" aria-live="polite">{{ text || loc.query.empty }}</p>
  </div>
</template>
