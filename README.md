# 舜天信兴样衣管理系统 MVP

面向“样衣识别检索系统”请示稿的原型版本，重点覆盖样衣资产数字化、自然语言检索、以图搜图、自动报价、面辅料替换重算，以及 Pad/网页端响应式使用。

## 已实现

- GitHub Pages 静态演示模式：无后端时自动使用本地样衣数据、检索、借出申请和报价规则。
- 在线样衣资料库：中英文名称、款号、品类、面料、工艺、BOM、设计文件、3D 链接、款式/面料/版型关联。
- 中英文关键词与自然语言检索。
- 拍图搜同款：通过多模态 embedding 做样衣相似度检索。
- 相似度阈值：检索页可调阈值过滤候选样衣。
- 自动报价：检索结果自动返回单价和总价。
- 面辅料替换重算：输入替换面辅料和单件材料成本后重新报价。
- 样衣录入和维护：支持 AI 字段补全、图片 AI 白底模特图美化。
- 借出归还：保留样衣借还登记和历史记录。
- 业务前台入口：业务员登录后查看设计部样衣并提交借出需求。
- AI 积分显示：右上角固定展示 `1200`，后续可改为充值余额接口。
- 权限范围字段：样衣档案可维护可见范围，为后续接入 SSO/RBAC 预留。
- 响应式布局：桌面端侧边导航，Pad/手机端底部导航。

## AI 接口

接口来自 `https://llm.guohe-sh.com/docs`：

- 文本补全：`/api/doubao/v3/chat/completions`
- 多模态检索：`/api/doubao/v3/embeddings/multimodal`
- 图片美化：`/api/openai/v2/images/edits`
- 模型查询：`/admin/api/llm_platform/models`

## 本地运行

```bash
npm install
copy .env.example .env
npm run build
npm run start
```

服务地址：`http://127.0.0.1:4174`

## 环境变量

`.env` 和 `.env.local` 已被 `.gitignore` 排除，不要上传 API key。

```env
LLM_API_KEY=
LLM_TEXT_MODEL=doubao-seed-2-0-lite-260215
LLM_VISION_MODEL=doubao-seed-1-6-vision-250815
LLM_EMBEDDING_MODEL=doubao-embedding-vision-251215
LLM_IMAGE_MODEL=gpt-image-2
```

## 后续建议

- 接入正式数据库、对象存储和图片 CDN。
- 将 Express API 部署到服务器或 Serverless 平台，并通过环境变量配置 API key。
- 将报价公式替换为信兴公司真实成本、损耗、税费、阶梯价规则。
- 接入 ERP/企业微信账号体系，实现服务端权限控制。
- 批量导入现有约 8000 件样衣，并异步生成图片向量索引。
