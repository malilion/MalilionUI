<script setup lang="ts">
import { reactive, ref } from 'vue'
import { toast, type MlFormRules } from '@malilion/ui'

const model = reactive({
  name: '',
  email: '',
  role: null as string | null,
  skills: [] as string[],
  bio: '',
  agree: false,
})

const roles = [
  { value: 'alpha', label: 'Alpha — 獅群領袖' },
  { value: 'hunter', label: 'Hunter — 前線開發' },
  { value: 'scout', label: 'Scout — 探索研究' },
]
const skills = [
  { value: 'vue', label: 'Vue' },
  { value: 'ts', label: 'TypeScript' },
  { value: 'css', label: 'CSS' },
  { value: 'a11y', label: 'Accessibility' },
]

const taken = ['simba', 'nala']
const rules: MlFormRules = {
  name: [
    { required: true },
    { min: 2, max: 16 },
    {
      // Async check, e.g. a server round-trip
      validator: async (value) => {
        await new Promise((r) => setTimeout(r, 300))
        return taken.includes(String(value).toLowerCase()) ? '這個名字已經有獅子用了' : true
      },
    },
  ],
  email: [{ required: true }, { type: 'email' }],
  role: { required: true, message: '請選一個角色' },
  skills: [{ required: true, message: '至少挑兩項技能' }, { min: 2, message: '至少挑兩項技能' }],
  bio: { max: 80 },
  agree: { required: true, message: '請先同意獅群公約' },
}

const form = ref<{ clearValidation: () => void }>()

function onSubmit() {
  toast({ tone: 'success', title: '已加入獅群', message: `歡迎，${model.name}！` })
}

function reset() {
  Object.assign(model, { name: '', email: '', role: null, skills: [], bio: '', agree: false })
  form.value?.clearValidation()
}
</script>

<template>
  <MlForm ref="form" :model="model" :rules="rules" class="demo" @submit="onSubmit">
    <MlFormItem prop="name">
      <MlInput v-model="model.name" index="01" label="名字" placeholder="試試 Simba" />
    </MlFormItem>
    <MlFormItem prop="email">
      <MlInput v-model="model.email" index="02" label="Email" type="email" placeholder="lion@pride.io" />
    </MlFormItem>
    <MlFormItem prop="role">
      <MlCombobox v-model="model.role" index="03" label="角色" :options="roles" />
    </MlFormItem>
    <MlFormItem prop="skills">
      <MlCombobox v-model="model.skills" index="04" label="技能" :options="skills" multiple />
    </MlFormItem>
    <MlFormItem prop="bio">
      <MlTextarea v-model="model.bio" index="05" label="自我介紹" hint="選填，最多 80 字" />
    </MlFormItem>
    <MlFormItem prop="agree">
      <MlCheckbox v-model="model.agree">我同意獅群公約</MlCheckbox>
    </MlFormItem>
    <div class="actions">
      <MlButton variant="ghost" type="button" @click="reset">重設</MlButton>
      <MlButton type="submit" stamp>加入獅群</MlButton>
    </div>
  </MlForm>
</template>

<style scoped>
.demo {
  max-width: 460px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
