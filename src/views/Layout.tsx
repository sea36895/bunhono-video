import { PropsWithChildren } from 'hono/jsx'

interface LayoutProps extends PropsWithChildren {
  title: string
}

export default function Layout({ title, children }: LayoutProps) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charset="UTF-8" />
        <title>{title}</title>
        <style>
          {`
            body { font-family: sans-serif; max-width: 1000px; margin: 0 auto; padding: 2rem; }
            .card { border: 1px solid #eee; padding: 1rem; border-radius: 8px; margin: 1rem 0; }
          `}
        </style>
      </head>
      <body>
        <header><h2>Bun + Hono JSX 视图模板</h2></header>
        <main>{children}</main>
        <footer style="margin-top:2rem;color:#666"> Powered by Bun+Hono </footer>
      </body>
    </html>
  )
}