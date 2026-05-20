# Bun + Hono Video Site

一个使用 Bun + Hono 构建的在线视频播放网站，支持视频列表展示、搜索、分类浏览和在线播放功能。

## 技术栈

- **Bun** - 快速的 JavaScript 运行时和包管理器
- **Hono** - 轻量级高性能 Web 框架
- **TypeScript** - 类型安全的 JavaScript
- **fast-xml-parser** - XML 解析库

## 功能特点

- ✅ 视频列表展示（最近更新）
- ✅ 分类浏览（电视剧、电影、综艺、动漫等）
- ✅ 关键词搜索
- ✅ 视频详情页（简介、播放列表）
- ✅ 多 API 源切换
- ✅ 分页功能
- ✅ 配置文件热更新（修改后刷新页面即可生效）
- ✅ 开发模式热更新

## 快速开始

### 安装依赖

```bash
bun install
```

### 开发模式

```bash
bun run dev
```

访问 http://localhost:3000 查看网站。

### 生产模式

```bash
bun run start
```

## 配置文件

配置文件位于 `config.json`，修改后刷新页面即可生效，无需重启服务器。

### 配置项说明

```json
{
  "site": {
    "name": "影视资源",
    "domain": "demo.test",
    "email": "admin@admin.com"
  },
  "apis": [
    {
      "name": "默认源",
      "url": "https://api.example.com"
    }
  ],
  "videoParser": "https://jx.parse.com/?url=",
  "templateName": "default",
  "sortDesc": "desc",
  "showTimeLimit": "24",
  "seo": {
    "title": {
      "list": "首页",
      "search": "搜索结果",
      "info": "视频详情"
    },
    "keywords": {...},
    "description": {...}
  }
}
```

## 项目结构

```
bunhono-video/
├── src/
│   └── index.ts          # 主应用入口
├── public/
│   └── default/
│       └── css/          # 样式文件
├── config.json           # 配置文件
├── package.json
├── tsconfig.json
└── bun.lockb
```

## API 接口

### 获取视频列表

```
GET /?pg=1
GET /?tid=1&pg=1        # 按分类获取
GET /?wd=关键词&pg=1    # 搜索
GET /?info=视频ID       # 视频详情
```

## License

MIT