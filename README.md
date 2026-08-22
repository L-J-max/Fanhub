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
- **首页全屏轮播首屏**：自动循环、平滑淡入、左右箭头 + 指示点 + 进度条 + 键盘控制
- **首屏照片可本地上传替换**：后台 `/manage/hero` 按位置（共 3 个）单独上传本地图片替换首屏，支持 JPG/PNG/GIF/WebP/SVG（≤10MB）
- **已发布内容可删除**：列表卡片与详情页均提供删除按钮（二次确认），删除后同步移除磁盘媒体文件
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

## 部署（生产模式，已配置）

服务已以 **生产模式** 部署并常驻运行：

- 启动命令：`npm run start`（`next start -H 0.0.0.0`），监听 **http://localhost:3000**（同时绑定 `0.0.0.0`，同一局域网可通过本机 IP 访问）。
- 守护：`deploy-start.sh` 在进程退出/崩溃后自动重启（3 秒间隔），保证稳定运行。
- 开机自启：登录项 `Startup/FanHubSite.bat` → 调用 `deploy-start.bat`，用户登录后自动拉起服务（无需管理员权限）。
- 运行日志：`deploy.log`。

```bash
# 手动启动守护（后台常驻）
nohup bash deploy-start.sh > /dev/null 2>&1 &

# 手动停止
# 结束 deploy-start.sh 及其拉起的 next 进程即可
```

> 访问地址：**http://localhost:3000**（任何访客无需登录即可浏览与点赞）。
>
> 说明：本环境内置的 CloudStudio 部署仅支持纯静态站点，无法托管带 API/数据库的 Next.js 全栈应用，因此采用本地生产部署方式提供可直接访问的端口 URL。如需公网域名访问，需另行接入支持 Node 服务的托管平台（如 CloudBase / 云服务器）。

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
components/                SiteHeader / ContentFeed / ContentCard / TypeTabs / LikeButton / MediaPlayer / UploadForm / TypeIcon / HeroCarousel / HeroManager / DeleteButton / ConfirmDialog
lib/                       db.ts / validation.ts / upload.ts / hero.ts / types.ts / format.ts
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

## 后台入口

- **管理首屏轮播**：`/manage/hero` —— 按位置上传本地图片替换首页第一屏照片（顶部导航「管理首屏」可直达）。
- 删除内容：列表卡片右上角图标按钮，或详情页底部「删除内容」按钮，均带二次确认弹窗。

## 说明与取舍

- 无登录场景下，服务端只维护全局点赞总数；设备是否已赞由浏览器 `localStorage` 决定（清空缓存可再次点赞，属已知的可接受局限）。
- 上传为公开（任何人可发布），通过 MIME 白名单、大小上限、服务端定扩展名与路径穿越防护保证基本安全。
