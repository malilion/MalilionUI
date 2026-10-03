<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

interface Msg {
  id: number
  role: 'user' | 'assistant'
  content: string
}

const answer = `當然可以！在 Vue 裡串流 AI 回覆只要三步：

1. 把模型吐出來的文字**一段一段接到** \`source\` 後面
2. 產生中加上 \`streaming\`，結尾會出現閃爍的游標
3. 結束時把 \`streaming\` 拿掉

\`\`\`vue
<MlMarkdown :source="reply" :streaming="loading" />
\`\`\`

| 狀態 | 畫面 |
| --- | --- |
| 未閉合的 \`**\` | 先當成粗體，不會閃出星號 |
| 還沒結束的程式碼區塊 | 已經是程式碼區塊 |

更多說明請看 [MalilionUI 文件](https://malilion.github.io/MalilionUI/) 🐾`

const messages = ref<Msg[]>([{ id: 1, role: 'user', content: 'MlMarkdown 可以拿來顯示 AI 串流回覆嗎？' }])
const draft = ref('')
const streaming = ref(false)
let seed = 1
let timer: ReturnType<typeof setInterval> | undefined

function reply() {
  const msg: Msg = { id: ++seed, role: 'assistant', content: '' }
  messages.value.push(msg)
  const live = messages.value[messages.value.length - 1]
  streaming.value = true
  let at = 0
  clearInterval(timer)
  timer = setInterval(() => {
    // 模擬模型：每次吐出 2–6 個字元。
    at = Math.min(answer.length, at + 2 + Math.floor(Math.random() * 5))
    live.content = answer.slice(0, at)
    if (at >= answer.length) stop()
  }, 40)
}

function send(text: string) {
  messages.value.push({ id: ++seed, role: 'user', content: text })
  reply()
}

function stop() {
  clearInterval(timer)
  streaming.value = false
}

onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <MlChat :watch-key="messages.length + (messages[messages.length - 1]?.content.length ?? 0)" :height="420" class="chat">
    <MlChatMessage v-for="(m, i) in messages" :key="m.id" :role="m.role" :name="m.role === 'assistant' ? '碼力獅' : '你'">
      <MlMarkdown
        v-if="m.role === 'assistant'"
        :source="m.content"
        :streaming="streaming && i === messages.length - 1"
        caret="paw"
      />
      <template v-else>{{ m.content }}</template>
    </MlChatMessage>
    <template #footer>
      <div class="bar">
        <MlButton size="sm" variant="outline" :disabled="streaming" @click="reply">讓小獅子回答</MlButton>
      </div>
      <MlChatInput v-model="draft" :loading="streaming" @send="send" @stop="stop" />
    </template>
  </MlChat>
</template>

<style scoped>
.chat {
  width: 100%;
}
.bar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
}
</style>
