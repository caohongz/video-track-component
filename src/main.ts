import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
// 导入组件库样式
import 'vue-clip-track/style.css'
import App from './App.vue'
// Demo 应用的额外样式
import './styles/demo.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(ElementPlus)
app.mount('#app')

