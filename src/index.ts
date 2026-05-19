import { Hono } from 'hono'
import pageRouter from './routes/admin.route'

const app = new Hono()

// 挂载页面路由
app.route('/', pageRouter)

Bun.serve({
  hostname: "0.0.0.0",
  port: 80,

  // 性能
  maxRequestBodySize: 1024 * 1024 * 10, // 最大请求体 10MB
  idleTimeout: 60,                      // 连接空闲超时（秒）

  // Hono
  fetch: app.fetch,

  // 错误
  error(err) {
    console.error(err);
    return new Response("Internal Server Error", { status: 500 });
  },
});