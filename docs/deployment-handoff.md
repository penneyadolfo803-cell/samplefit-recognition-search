# 舜天信兴样衣管理系统上线交接说明

> 用途：给服务器部署/搬运上线对话使用。本文不包含真实 API Key，敏感信息请只放服务器环境变量。

## 1. 项目信息

- 项目名称：舜天信兴样衣管理系统
- 本地项目目录：`C:\Users\YY\Documents\Codex\2026-07-03\ai-ai-api-key-https-llm\work\samplefit`
- GitHub 仓库：`https://github.com/penneyadolfo803-cell/samplefit-recognition-search`
- 当前线上演示：`https://penneyadolfo803-cell.github.io/samplefit-recognition-search/`
- 当前提交版本：`a0ea4db`
- 技术栈：React 19 + Vite + TypeScript + Express

## 2. 当前功能范围

- 业务前台：瀑布流看款、搜索、收藏、选择、多选推款、生成 PPT、提交借样申请。
- 样衣详情：正背面图、图片放大、吊牌价、借样费、库位架杆、近似款推荐。
- 后台管理：样衣录入、大货录入、借出、归还、报损、库位架杆、收费规则。
- AI 功能：AI 字段补全、AI 白底图/图片美化、拍照搜类似款、问问云知。
- 数据分析：按业务员、业务组、客户、品类、风格、时间统计借样和费用。
- 账单：支持按年/月/周、业务组拉取借样费用。
- 系统配置：系统名称、UI 名称、背景图、图标、AI 积分、角色权限。
- 中英双语：右上角语言切换。
- 演示动画：`/tutorial/index.html`，约 3 分钟，可手动跳步骤。

## 3. 目录结构

```text
samplefit/
  src/                  # 前端 React 代码
  src/lib/              # 样衣数据、推荐逻辑、账单分析、配置等
  server/               # Express API、AI 调用、JSON 数据存储
  public/               # 图片资源、背景图、教程页
  scripts/              # 校验脚本
  dist/                 # npm run build 后生成，服务器静态资源
  data/db.json          # 首次启动后自动生成，当前简易数据存储
  .env.example          # 环境变量模板
```

## 4. 环境变量

在服务器项目根目录创建 `.env`，不要提交到 Git。

```env
LLM_API_KEY=这里填真实key
LLM_TEXT_BASE_URL=https://llm.guohe-sh.com/api/doubao/v3
LLM_TEXT_MODEL=doubao-seed-2-0-lite-260215
LLM_VISION_MODEL=doubao-seed-1-6-vision-250815
LLM_EMBEDDING_MODEL=doubao-embedding-vision-251215
LLM_IMAGE_EDIT_BASE_URL=https://llm.guohe-sh.com/api/openai/v2
LLM_IMAGE_MODEL=gpt-image-2
PORT=4174
VITE_API_BASE_URL=
```

说明：

- `LLM_API_KEY`：放服务器环境变量，不要写进代码、README、GitHub。
- `PORT`：Node 服务监听端口，默认 `4174`。
- `VITE_API_BASE_URL`：
  - 前端和 API 同域部署时留空。
  - 前端静态页和 API 分开部署时，构建前设置为 API 地址，例如 `https://api.xxx.com`。

AI 接口文档：`https://llm.guohe-sh.com/docs`

## 5. 推荐部署方式：Node 服务同域部署

这种方式最简单：Express 同时提供 API 和前端静态文件。

```bash
git clone https://github.com/penneyadolfo803-cell/samplefit-recognition-search.git
cd samplefit-recognition-search
npm install
cp .env.example .env
# 编辑 .env，填 LLM_API_KEY 和 PORT
npm run build
npm run start
```

启动后访问：

```text
http://服务器IP:4174/
http://服务器IP:4174/api/health
http://服务器IP:4174/tutorial/index.html
```

如果用 PM2：

```bash
pm2 start npm --name samplefit -- start
pm2 save
```

## 6. Nginx 反向代理示例

假设 Node 服务跑在本机 `4174`，域名为 `sample.xxx.com`：

```nginx
server {
  listen 80;
  server_name sample.xxx.com;

  client_max_body_size 50m;

  location / {
    proxy_pass http://127.0.0.1:4174;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

如启用 HTTPS，请在 Nginx 或服务器平台配置证书。

## 7. 前后端分开部署方式

如果前端放 CDN/静态服务器，API 单独部署：

1. API 服务器运行 Node 服务。
2. 前端构建前设置：

```bash
VITE_API_BASE_URL=https://你的API域名 npm run build
```

3. 上传 `dist/` 到静态服务器。

注意：纯静态部署只能演示部分本地数据逻辑；要让 AI 补全、AI 美化、拍照搜款、真实借样数据持久化正常工作，必须部署 `server/` 后端。

## 8. 数据与图片

- 当前使用简易 JSON 存储：`data/db.json`。
- 首次启动没有 `data/db.json` 时，会自动生成测试样衣数据。
- 测试数据包含：
  - 50 件设计样衣
  - 50 件大货样品
  - 设计/大货正背面白底图在 `public/design-images/` 和 `public/bulk-images/`
- 上线真实使用建议：
  - 备份 `data/db.json`
  - 后续换成正式数据库和对象存储/CDN
  - 图片建议迁移到 OSS/S3/CDN，不长期放本地磁盘

## 9. 主要 API

```text
GET  /api/health
GET  /api/samples
POST /api/samples
PATCH /api/samples/:id
POST /api/samples/:id/borrow
POST /api/samples/:id/return
POST /api/samples/:id/damage
GET  /api/borrow-requests
POST /api/borrow-requests
POST /api/ai/complete-fields
POST /api/ai/enhance-image
POST /api/ai/search-similar
POST /api/quote/generate
```

`/api/health` 会返回 AI 是否已配置、模型名和固定 AI 积分显示。

## 10. 本地开发命令

```bash
npm install
npm run dev
```

开发模式：

- 前端 Vite：`http://127.0.0.1:5173`
- API：`http://127.0.0.1:4174`
- Vite 会把 `/api` 代理到 `4174`

生产构建：

```bash
npm run build
npm run start
```

## 11. 上线前校验

建议在服务器上跑：

```bash
npm run build
node --import tsx scripts/check-ai-image-inline.ts
node --import tsx scripts/check-recommendation-taxonomy.ts
node --import tsx scripts/verify-front-catalog.ts
node --import tsx scripts/check-admin-config.ts
node --import tsx scripts/check-billing-team-summary.ts
node --import tsx scripts/check-bilingual-tutorial.ts
```

页面手工检查：

- 首页是否打开：`/`
- 教程是否打开：`/tutorial/index.html`
- 健康检查是否正常：`/api/health`
- 后台样衣库是否有 100 件测试样衣
- 前台能否搜索、收藏、选择、生成 PPT
- 运动套装近似款不要推荐西装套裙
- AI 字段补全、AI 图片美化、拍照搜款是否能调用

## 12. AI 功能迁移排查

如果迁移后 AI 功能不可用，按下面顺序查：

1. 检查后端是否真的在跑，而不是只上传了 `dist/` 静态文件。

```bash
curl http://127.0.0.1:4174/api/health
```

返回里 `aiConfigured` 必须是 `true`。如果是 `false`，说明服务器没有读到 `LLM_API_KEY`。

2. 检查前端是否请求到了正确 API。

- 前后端同域部署：`VITE_API_BASE_URL` 留空，Nginx 代理整个站点到 Node 服务。
- 前后端分开部署：构建前必须设置 `VITE_API_BASE_URL=https://你的API域名`。
- 如果部署在 `/landup/` 子路径，本项目已自动推断 `/landup/api`。

3. 检查图片美化断图问题。

- AI 图片接口可能返回临时远程 URL。
- 后端已做兜底：会把远程图片下载成 `data:image/...;base64,...` 再返回前端。
- 如果远程图片需要鉴权，后端会再带 `api-key` 和 `Authorization` 下载一次。
- 如果仍下载失败，会返回明确错误，不会再显示“已生成但断图”。

4. 检查服务器是否能访问 AI 域名。

```bash
curl -I https://llm.guohe-sh.com/docs
```

如果服务器出网被限制，需要放通 `llm.guohe-sh.com`。

5. 检查上传体积限制。

- Express 当前限制：`30mb`
- Nginx 示例已设置：`client_max_body_size 50m`
- 如果图片较大导致 413，需要调大 Nginx 和后端限制。

6. 看服务日志。

```bash
pm2 logs samplefit
```

常见报错：

- `LLM_API_KEY 未配置`：环境变量没生效。
- `AI 请求失败: 401/403`：Key 错误或模型权限不足。
- `AI 图片已生成，但服务器无法下载结果图用于预览`：服务器无法访问 AI 返回的图片地址。
- `PayloadTooLargeError`：上传图片太大。

## 13. 已知注意事项

- 当前 `AI 积分` 前端显示已做到界面入口，服务端健康检查里还是固定值，后续充值/扣费需要接正式账户系统。
- 当前认证是演示级，前台/后台角色和权限主要是 UI 和流程展示，真实客户使用前建议接企业微信/SSO/RBAC。
- 当前数据库是 JSON 文件，适合演示和小规模试用；正式生产建议换 PostgreSQL/MySQL。
- 当前图片上传和生成图返回地址还需要结合正式对象存储做长期保存。
- `.env`、API Key、真实客户资料不要上传 GitHub。

## 14. 当前线上与本地地址

- GitHub Pages 演示：`https://penneyadolfo803-cell.github.io/samplefit-recognition-search/`
- 本地预览当前常用地址：`http://127.0.0.1:4178/`
- 后端默认生产地址：`http://127.0.0.1:4174/`
