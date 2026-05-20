import { Hono } from 'hono'
import pageRouter from './routes/admin.route'

const app = new Hono()

// 挂载页面路由
app.route('/', pageRouter)

Bun.serve({
  hostname: "0.0.0.0",
  port: 80,

  // 最大请求体 10MB
  maxRequestBodySize: 1024 * 1024 * 10,
  // 低内存模式
  lowMemoryMode: true,
  // 连接空闲超时（秒）
  idleTimeout: 60,

  // Hono
  fetch: app.fetch,

  // 错误
  error(err) {
    console.error(err);
    return new Response("Internal Server Error", { status: 500 });
  },
});