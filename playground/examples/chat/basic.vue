<script setup lang="ts">
import { ref } from 'vue'

interface Msg {
  id: number
  role: 'user' | 'assistant' | 'system'
  content: string
  time?: string
}

const messages = ref<Msg[]>([
  { id: 1, role: 'system', content: '今天 10:02' },
  { id: 2, role: 'assistant', content: '嗷嗚～我是碼力獅，有什麼可以幫你的？', time: '10:02' },
  { id: 3, role: 'user', content: 'MalilionUI 可以用在 React 嗎？', time: '10:03' },
  { id: 4, role: 'assistant', content: '可以！樣式全部是 .ml-* class 與 --ml-* 變數，\n在 React 裡照著 class 名稱寫就好。', time: '10:03' },
])
const draft = ref('')
const thinking = ref(false)
let seed = 10
let timer: ReturnType<typeof setTimeout> | undefined

const now = () => new Date().toTimeString().slice(0, 5)

function send(text: string) {
  messages.value.push({ id: ++seed, role: 'user', content: text, time: now() })
  thinking.value = true
  timer = setTimeout(() => {
    messages.value.push({ id: ++seed, role: 'assistant', content: `收到「${text}」！小獅子已經記下來了 🐾`, time: now() })
    thinking.value = false
  }, 1400)
}

function stop() {
  clearTimeout(timer)
  thinking.value = false
}
</script>

<template>
  <MlChat :watch-key="messages.length + Number(thinking)" :height="340" class="chat">
    <MlChatMessage
      v-for="m in messages"
      :key="m.id"
      :role="m.role"
      :name="m.role === 'assistant' ? '碼力獅' : m.role === 'user' ? '你' : undefined"
      :time="m.time"
      :content="m.content"
    />
    <MlChatMessage v-if="thinking" role="assistant" name="碼力獅" typing />
    <template #footer>
      <MlChatInput v-model="draft" :loading="thinking" @send="send" @stop="stop" />
    </template>
  </MlChat>
</template>

<style scoped>
.chat {
  width: 100%;
}
</style>
