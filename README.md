# FanHub · 粉丝内容分享网站

一个面向粉丝的公开内容分享平台：支持上传 **视频 / 文本 / 音频** 三种内容，任何访客无需登录即可浏览、播放，并对内容点赞。

## 技术栈

- **Next.js 15（App Router）+ React 19 + TypeScript**
- **Tailwind CSS** 负责样式（设计系统见 `design-system-MASTER.md`）
- **Node 内置 `node:sqlite`** 存储元数据与点赞计数（无需原生编译，跨平台即装即用）
- 上传文件保存在本地 `data/uploads/`，数据库为 `data/app.db`

> 说明：原设计使用 `better-sqlite3`，但本机沙箱无法编译其原生模块；改用 Node 22 自带的实验性 `node:sqlite`（API 与 SQLite 一致），功能等价且零原生依赖。

## 功能

- 公开浏览：首页混合信息流 + 按类型（全部 / 视频 / 文本 / 音频）筛选
- 内容详情：视频/音频播放器、文本内容渲染
- 上传：按类型约束文件格式与大小（视频 ≤200MB、音频 ≤50MB、文本 ≤50KB）
- 点赞：乐观更新 + 服务端权威计数；按设备 `localStorage` 记录是否已赞，防止同一浏览器重复点赞
- **首页全屏轮播首屏**：自动循环、平滑淡入、左右箭头 + 指示点 + 进度条 + 键盘控制；标题层叠覆盖于主视觉照片之上，双层渐变遮罩保证可读，响应式字号
- **首屏照片可本地上传替换**：后台 `/manage/hero` 按位置（共 3 个）单独上传本地图片替换首屏，支持 JPG/PNG/GIF/WebP/SVG（≤10MB）
- **已发布内容可删除**：列表卡片与详情页均提供删除按钮（二次确认），删除后同步移除磁盘媒体文件
- **账户系统**：注册 / 登录（scrypt + HMAC 签名 httpOnly Cookie）；导航栏展示用户头像
- **用户头像**：默认首字母渐变占位，点击头像即可从**相册或相机**选择新照片上传替换（iOS 风格 action-sheet + cross-fade 渐变切换，尊重 `prefers-reduced-motion`）
- **全新页面转场**：基于路由变化的淡入 + 位移 + 微缩放过渡（iOS 风格缓动 `cubic-bezier(.22,1,.36,1)`，0.38s），替换原 jelly 幕布方案，应用于所有路由切换
- 响应式：桌面多列瀑布流、移动端单列；交互元素含悬停/焦点态与点赞动画

> 上传机制说明：文件通过浏览器读取为 base64 后以 JSON 提交（`{type,title,text?,file:{data,mime}}`），
> 而非 `multipart/form-data` 文件流——本环境（Next 15 + 该 Node 构建）在解析含文件分区的 multipart 请求体时
> 会直接断开连接；JSON + base64 走 `req.json()`，稳定可用。（大文件会因 base64 体积增大而更占内存，属已知取舍。）

## 本地运行

```bash
npm install        # 安装依赖（Node 22 内置 node:sqlite，无需原生模块）
npm run dev        # 开发模式，访问 http://localhost:3000
# 或
npm run build && npm run start
```

首次启动会自动创建 `data/` 目录、数据库与上传目录。

## 账户与权限

- **注册 / 登录**：访问 `/login` 可注册新账户或登录；密码经 scrypt 哈希 + HMAC 签名写入 httpOnly Cookie。
- **管理员账号（预置）**：
  - 用户名 `888`，密码 `88888888`
  - 拥有最高权限：可编辑 / 删除**任何人**的内容，并可进入 `/manage/hero` 管理首页首屏轮播照片。
  - 普通登录用户仅能编辑 / 删除**自己**发布的内容。
- **用户头像**：登录后点击导航栏右上角头像 → 从相册选择或拍照 → 上传替换（iOS 风格渐变过渡）。
  - 头像文件保存在 `data/avatars/`，数据库 `users.avatar` 记录文件名；接口 `POST /api/auth/avatar` 与 `GET /api/file/avatar/[name]`。

```bash
# 登录后访问这些页面
/login      # 注册 / 登录
/me         # 我的（资料 / 头像）
/manage/hero # 管理首屏轮播（仅管理员）
```

## 部署到 Vercel（公网可访问）

本项目已适配 **Vercel + Turso + Vercel Blob**，因为 Vercel 的 Serverless 函数是无状态、文件系统只读的，原生的本地 SQLite 与本地文件上传无法持久化。适配方案：

| 原方案 | Vercel 方案 |
|---|---|
| `node:sqlite` 本地库 | **Turso**（云版 SQLite，HTTP 访问，SQL 语法一致） |
| 本地文件系统存媒体 | **Vercel Blob**（上传即返回公开 URL，DB 存 URL） |

### 1. 准备外部服务（免费额度即可）

- **Turso 数据库**：https://turso.tech → 创建数据库 `fanhub` → `turso db tokens create fanhub` 拿到 `TURSO_DATABASE_URL` 与 `TURSO_AUTH_TOKEN`。
- **Vercel Blob**：在 Vercel 项目 Dashboard → Storage → Create Blob Store，复制 `BLOB_READ_WRITE_TOKEN`。

### 2. 配置环境变量（Vercel 项目 → Settings → Environment Variables）

```
TURSO_DATABASE_URL=libsql://<db>.turso.io
TURSO_AUTH_TOKEN=<token>
BLOB_READ_WRITE_TOKEN=<vercel-blob-token>
SESSION_SECRET=<任意长随机串>   # 可选但推荐，保证重启后登录态不失效
```

### 3. 部署

```bash
npm install
vercel            # 按提示登录并部署（或连接 Git 仓库自动部署）
# 或推送至已关联的 Git 仓库，Vercel 自动构建
```

- 构建命令：`next build`（默认）
- 运行时：Node.js（`runtime = 'nodejs'`，已设置）
- 首次启动会自动建表（users / content / hero / likes），并种子管理员账户 `888 / 88888888`

> 说明：`.env.example` 列出了全部所需变量。本地开发可用 `TURSO_DATABASE_URL=file:./data/local.db` 用本地 libSQL 文件，无需联网数据库。

### 本地生产预览

```bash
vercel build && vercel dev     # 或 npm run build && npm run start
```

## 目录结构

```
app/
  page.tsx                 首页（全屏轮播首屏 + 信息流）
  upload/page.tsx          上传页
  manage/hero/page.tsx     首屏轮播管理（上传替换照片）
  content/[id]/page.tsx    内容详情页（含删除）
  api/upload/route.ts      POST 上传（JSON + base64）
  api/content/route.ts     GET 内容列表（?type=&limit=&offset=）
  api/content/[id]/route.ts GET 详情 / DELETE 删除（含磁盘文件清理）
  api/like/route.ts        POST 点赞 / 取消
  api/file/[id]/route.ts   GET 安全返回媒体文件（支持 Range 拖动）
  api/hero/route.ts        GET 当前首屏轮播配置
  api/hero/upload/route.ts POST 按 slot 上传替换首屏照片（JSON + base64）
  api/hero/[id]/route.ts   GET 首屏照片（支持 Range）
  api/auth/login/route.ts          POST 登录
  api/auth/register/route.ts       POST 注册
  api/auth/logout/route.ts         POST 退出
  api/auth/me/route.ts             GET 当前用户（含 avatarUrl）
  api/auth/avatar/route.ts         POST 上传替换头像（JSON + base64）
  api/file/avatar/[name]/route.ts  GET 头像文件（支持 Range）
  components/                SiteHeader / ContentFeed / ContentCard / TypeTabs / LikeButton / MediaPlayer / UploadForm / TypeIcon / HeroCarousel / HeroManager / DeleteButton / ConfirmDialog / AuthProvider / Avatar / AvatarUploader / PageTransition
lib/                       db.ts / validation.ts / upload.ts / hero.ts / types.ts / format.ts / auth.ts
```

## 接口速查

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/upload` | 上传（`type,title,text\|file`）→ `{id,type,title}` |
| GET | `/api/content?type=&limit=&offset=` | 列表 → `{items, nextOffset}` |
| GET | `/api/content/[id]` | 详情（文本含正文 / 媒体含 `fileUrl`） |
| DELETE | `/api/content/[id]` | 删除内容（同步删除磁盘媒体文件） |
| POST | `/api/like` | 点赞 `{id, action:'like'\|'unlike'}` → `{likeCount}` |
| GET | `/api/file/[id]` | 媒体流（支持 `Range`） |
| GET | `/api/hero` | 当前首屏轮播配置 → `{slides:[{id,slot,title,subtitle,url}]}` |
| POST | `/api/hero/upload` | 按 `slot` 上传替换首屏照片（`slot,title,subtitle,file:{data,mime}`） |
| GET | `/api/hero/[id]` | 首屏照片流（支持 `Range`） |
| POST | `/api/auth/register` | 注册 `{username,password}` → `{user}` |
| POST | `/api/auth/login` | 登录 `{username,password}` → 设置 Cookie |
| POST | `/api/auth/logout` | 退出（清除 Cookie） |
| GET | `/api/auth/me` | 当前用户 `{user:{username,role,avatarUrl}}` |
| POST | `/api/auth/avatar` | 上传替换头像 `{data,mime}` → `{avatarUrl}` |
| GET | `/api/file/avatar/[name]` | 头像文件流（支持 `Range`） |

## 后台入口

- **账户**：`/login` 注册 / 登录；`/me` 查看资料与更换头像（点击导航栏头像亦可）。
- **管理首屏轮播**：`/manage/hero` —— 按位置上传本地图片替换首页第一屏照片（仅管理员，顶部导航「管理首屏」可直达）。
- 删除内容：列表卡片右上角图标按钮，或详情页底部「删除内容」按钮，均带二次确认弹窗。

## 说明与取舍

- 无登录场景下，服务端只维护全局点赞总数；设备是否已赞由浏览器 `localStorage` 决定（清空缓存可再次点赞，属已知的可接受局限）。
- 上传为公开（任何人可发布），通过 MIME 白名单、大小上限、服务端定扩展名与路径穿越防护保证基本安全。
