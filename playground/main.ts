import { createApp } from 'vue'
import MalilionUI from '@malilion/ui'
import '../src/styles/index.css'
import App from './App.vue'
import { docsTheme } from './theme'

createApp(App).use(MalilionUI, { theme: docsTheme }).mount('#app')
