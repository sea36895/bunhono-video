import { Hono } from 'hono'
import pageRouter from './routes/admin.route'

const app = new Hono()

// 挂载页面路由
app.route('/', pageRouter)

const PORT = 3000

console.log(`服务启动: http://localhost:${PORT}`)

export default {
  port: PORT,
  fetch: app.fetch
}