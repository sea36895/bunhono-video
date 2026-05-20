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

## Linux 部署指南（Debian 12 / 低内存优化）

### 1. 安装基础依赖

```bash
sudo apt update && sudo apt install -y curl git
```

### 2. 安装 Bun

```bash
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
```

### 3. 克隆项目

```bash
git clone https://github.com/your-repo/bunhono-video.git
cd bunhono-video
```

### 4. 安装依赖

```bash
bun install --production
```

### 5. 构建生产版本（低内存推荐）

```bash
bun run build
```

### 6. 使用 80 端口运行

#### 方式一：使用 sudo（简单）

```bash
sudo NODE_ENV=production bun run prod
```

#### 方式二：使用 setcap 授予权限（推荐）

```bash
sudo setcap 'cap_net_bind_service=+ep' $(which bun)
NODE_ENV=production bun run prod
```

### 7. 后台运行（低内存优化）

创建 systemd 服务文件：

```bash
sudo nano /etc/systemd/system/bunhono-video.service
```

添加以下内容：

```ini
[Unit]
Description=Bun Hono Video Site
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/bunhono-video
ExecStart=/usr/local/bin/bun dist/index.js
Environment=NODE_ENV=production
Restart=always
RestartSec=5
LimitNOFILE=4096
CPUQuota=50%
MemoryLimit=100M

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable bunhono-video
sudo systemctl start bunhono-video
```

查看状态：

```bash
sudo systemctl status bunhono-video
```

### 8. 配置防火墙

```bash
sudo ufw allow 80/tcp
sudo ufw reload
```

### 9. 低内存优化建议

| 优化项 | 说明 |
|--------|------|
| **内存限制** | systemd 设置 MemoryLimit=100M |
| **CPU 限制** | systemd 设置 CPUQuota=50% |
| **生产构建** | 使用 bun build 编译为单文件 |
| **禁用开发模式** | development: false |
| **连接超时** | idleTimeout: 60 秒 |

### 10. 资源监控

```bash
# 查看内存使用
free -h

# 查看进程资源
top -p $(pgrep -f bun)

# 查看日志
journalctl -u bunhono-video -f
```

## License

MIT