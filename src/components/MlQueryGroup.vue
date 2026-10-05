<script setup lang="ts">
// One AND / OR group of MlQueryBuilder, drawn recursively for nested groups.
import { inject } from 'vue'
import MlCombobox from './MlCombobox.vue'
import MlIcon from './MlIcon.vue'
import MlSelect from './MlSelect.vue'
import {
  changeRuleField,
  changeRuleOperator,
  isQueryGroup,
  operatorArity,
  operatorsFor,
  type MlQueryGroup,
  type MlQueryOperator,
  type MlQueryRule,
} from './filter'
import { queryKey } from './query'
import { useLocale } from '../locale'

defineOptions({ name: 'MlQueryGroup' })

const props = defineProps<{ group: MlQueryGroup; depth: number }>()
const ctx = inject(queryKey)!
const loc = useLocale()

const fieldOf = (rule: MlQueryRule) => ctx.fields.value.find((f) => f.key === rule.field)
const fieldOptions = () => ctx.fields.value.map((f) => ({ value: f.key, label: f.label }))
const operatorOptions = (rule: MlQueryRule) => operatorsFor(fieldOf(rule)).map((op) => ({ value: op, label: loc.value.query.ops[op] }))
const inputType = (rule: MlQueryRule) => (fieldOf(rule)?.type === 'number' ? 'number' : fieldOf(rule)?.type === 'date' ? 'date' : 'text')

function setCombinator(combinator: 'and' | 'or') {
  if (combinator !== props.group.combinator) ctx.replace(props.group.id, { ...props.group, combinator })
}
function setField(rule: MlQueryRule, key: string | number | undefined) {
  ctx.replace(rule.id, changeRuleField(rule, ctx.fields.value, String(key)))
}
function setOperator(rule: MlQueryRule, op: string | number | undefined) {
  ctx.replace(rule.id, changeRuleOperator(rule, op as MlQueryOperator))
}
function parse(rule: MlQueryRule, text: string) {
  if (inputType(rule) !== 'number' || text === '') return text
  const n = Number(text)
  return Number.isFinite(n) ? n : text
}
function setValue(rule: MlQueryRule, value: unknown) {
  ctx.replace(rule.id, { ...rule, value })
}
function setEnd(rule: MlQueryRule, end: 0 | 1, text: string) {
  const pair = Array.isArray(rule.value) ? [...rule.value] : [null, null]
  pair[end] = text === '' ? null : parse(rule, text)
  setValue(rule, pair)
}
const pairOf = (rule: MlQueryRule) => (Array.isArray(rule.value) ? rule.value : [null, null])
</script>

<template>
  <div :class="['ml-query__group', { 'ml-query__group--root': depth === 0 }]" role="group" :aria-label="depth === 0 ? undefined : loc.query.label">
    <div class="ml-query__head">
      <div class="ml-query__combinator" role="radiogroup" :aria-label="loc.query.combinator">
        <button
          v-for="c in (['and', 'or'] as const)"
          :key="c"
          type="button"
          role="radio"
          :aria-checked="group.combinator === c"
          :class="['ml-query__toggle', { 'ml-query__toggle--on': group.combinator === c }]"
          :disabled="ctx.disabled.value"
          @click="setCombinator(c)"
        >
          {{ loc.query[c] }}
        </button>
      </div>
      <span class="ml-query__spacer" />
      <button v-if="depth > 0" type="button" class="ml-query__icon" :aria-label="loc.query.removeGroup" :disabled="ctx.disabled.value" @click="ctx.replace(group.id, null)">
        <MlIcon name="close" />
      </button>
    </div>
    <ul v-if="group.rules.length" class="ml-query__list">
      <li v-for="node in group.rules" :key="node.id" :class="['ml-query__item', { 'ml-query__item--group': isQueryGroup(node) }]">
        <MlQueryGroup v-if="isQueryGroup(node)" :group="node" :depth="depth + 1" />
        <div v-else class="ml-query__rule">
          <MlSelect
            class="ml-query__field"
            :model-value="node.field"
            :options="fieldOptions()"
            :size="ctx.size.value"
            :disabled="ctx.disabled.value"
            :aria-label="loc.query.field"
            @update:model-value="setField(node, $event)"
          />
          <MlSelect
            class="ml-query__operator"
            :model-value="node.operator"
            :options="operatorOptions(node)"
            :size="ctx.size.value"
            :disabled="ctx.disabled.value"
            :aria-label="loc.query.operator"
            @update:model-value="setOperator(node, $event)"
          />
          <div v-if="operatorArity(node.operator) !== 0" class="ml-query__value">
            <template v-if="operatorArity(node.operator) === 'list'">
              <MlCombobox
                :model-value="(node.value as (string | number)[]) ?? []"
                :options="fieldOf(node)?.options ?? []"
                :size="ctx.size.value"
                :disabled="ctx.disabled.value"
                :placeholder="loc.query.value"
                multiple
                @update:model-value="setValue(node, $event)"
              />
            </template>
            <MlSelect
              v-else-if="fieldOf(node)?.type === 'select' && operatorArity(node.operator) === 1"
              :model-value="(node.value as string | number) ?? ''"
              :options="fieldOf(node)?.options ?? []"
              :placeholder="loc.query.value"
              :size="ctx.size.value"
              :disabled="ctx.disabled.value"
              :aria-label="loc.query.value"
              @update:model-value="setValue(node, $event)"
            />
            <div v-else-if="operatorArity(node.operator) === 2" class="ml-query__pair">
              <div :class="['ml-input', `ml-input--${ctx.size.value}`]">
                <input
                  class="ml-input__control"
                  :type="inputType(node)"
                  :value="pairOf(node)[0] ?? ''"
                  :aria-label="`${loc.query.value} ${loc.query.from}`"
                  :placeholder="loc.query.from"
                  :disabled="ctx.disabled.value"
                  @change="setEnd(node, 0, ($event.target as HTMLInputElement).value)"
                />
              </div>
              <span class="ml-query__dash" aria-hidden="true">–</span>
              <div :class="['ml-input', `ml-input--${ctx.size.value}`]">
                <input
                  class="ml-input__control"
                  :type="inputType(node)"
                  :value="pairOf(node)[1] ?? ''"
                  :aria-label="`${loc.query.value} ${loc.query.to}`"
                  :placeholder="loc.query.to"
                  :disabled="ctx.disabled.value"
                  @change="setEnd(node, 1, ($event.target as HTMLInputElement).value)"
                />
              </div>
            </div>
            <div v-else :class="['ml-input', `ml-input--${ctx.size.value}`]">
              <input
                class="ml-input__control"
                :type="inputType(node)"
                :value="(node.value as string | number | undefined) ?? ''"
                :aria-label="loc.query.value"
                :placeholder="loc.query.value"
                :disabled="ctx.disabled.value"
                @change="setValue(node, parse(node, ($event.target as HTMLInputElement).value))"
              />
            </div>
          </div>
          <button type="button" class="ml-query__icon" :aria-label="loc.query.removeRule" :disabled="ctx.disabled.value" @click="ctx.replace(node.id, null)">
            <MlIcon name="close" />
          </button>
        </div>
      </li>
    </ul>
    <p v-else class="ml-query__empty">{{ loc.query.empty }}</p>
    <div class="ml-query__foot">
      <button type="button" class="ml-query__add" :disabled="ctx.disabled.value || !ctx.fields.value.length" @click="ctx.append(group.id, 'rule')">
        <MlIcon name="plus" />{{ loc.query.addRule }}
      </button>
      <button v-if="depth + 1 < ctx.maxDepth.value" type="button" class="ml-query__add" :disabled="ctx.disabled.value || !ctx.fields.value.length" @click="ctx.append(group.id, 'group')">
        <MlIcon name="plus" />{{ loc.query.addGroup }}
      </button>
    </div>
  </div>
</template>
