import { createApp } from 'vue'
import MalilionUI from '@malilion/ui'
import '../src/styles/index.css'
import Shots from './Shots.vue'

createApp(Shots).use(MalilionUI).mount('#app')
