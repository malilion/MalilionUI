<script setup lang="ts">
import { ref } from 'vue'
import { zhTW, type CuteIconName } from '@malilion/ui'

interface Msg {
  id: number
  role: 'user' | 'assistant'
  text?: string
  sticker?: CuteIconName
  time: string
}

const messages = ref<Msg[]>([
  { id: 1, role: 'assistant', text: '下午好～今天要喝什麼？', time: '15:02' },
  { id: 2, role: 'user', text: '來杯半糖少冰的珍奶！', time: '15:03' },
  { id: 3, role: 'assistant', sticker: 'bubbleTea', time: '15:03' },
])
const draft = ref('')
let seed = 10
const now = () => new Date().toTimeString().slice(0, 5)

function reply(text: string) {
  setTimeout(() => messages.value.push({ id: ++seed, role: 'assistant', text, time: now() }), 700)
}

function send(text: string) {
  messages.value.push({ id: ++seed, role: 'user', text, time: now() })
  reply('收到！小獅子幫你記下來了。')
}

function sendSticker(name: CuteIconName) {
  messages.value.push({ id: ++seed, role: 'user', sticker: name, time: now() })
  if (name === 'lion' || name === 'cyberLion') reply('嗷嗚！是我耶 🦁')
}
</script>

<template>
  <MlChat :watch-key="messages.length" :height="320" class="chat">
    <MlChatMessage v-for="m in messages" :key="m.id" :role="m.role" :name="m.role === 'assistant' ? '碼力獅' : '你'" :time="m.time">
      <MlCuteIcon v-if="m.sticker" :name="m.sticker" :size="72" animate="bounce" :title="`貼圖：${zhTW.sticker.names[m.sticker]}`" />
      <template v-else>{{ m.text }}</template>
    </MlChatMessage>
    <template #footer>
      <MlChatInput v-model="draft" placeholder="輸入訊息，或點左邊的獅子送貼圖" @send="send">
        <template #prefix>
          <MlStickerPicker trigger storage-key="ml-docs-stickers" @select="sendSticker" />
        </template>
      </MlChatInput>
    </template>
  </MlChat>
</template>

<style scoped>
.chat { width: 100%; }
</style>
