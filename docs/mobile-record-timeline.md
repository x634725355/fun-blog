# 移动端记录时间线（文字 / 文件）需求与设计归档

> 状态：**已确认**（头脑风暴收口）
> 归档日期：**2026-05-06**

本文档固化「记录数据页面」的产品与技术约定，供实现与评审对照。

---

## 1. 背景与目标

构建一个**记录数据**的页面，支持：

- 写入 **纯文字** 或 **单个文件**（流水式：每条记录只能是其一）。
- 在同一页面按时间展示记录：**文件可下载**，**图片可展示**。
- **接口**落在本仓库 **`server/api`**（Nuxt Nitro）。
- 文件上传沿用现有 **`uploadR2(file, path)`** 形态（参考 `pages/mobile/upload.vue` 中的用法）。
- 文件与图片的对外访问前缀：**`https://store.csc3.fun/`** + R2 object key。

---

## 2. 范围与非目标

**范围内**

- D1 持久化「文字 + 文件类记录的元数据」；R2 存文件 blob。
- 列表以 D1 为准，游标分页；删除时同步清理 R2（文件类）。
- 固定 R2 子目录前缀，避免与其它上传混用。

**非目标（当前版本）**

- 用户登录与多租户（无 `user_id`）。
- 「一条笔记多个附件」的复合记录模型。

---

## 3. 关键决策（Decision Log）

| 决策点 | 结论 | 说明 |
|--------|------|------|
| 记录形态 | **流水 B** | 每次保存为 **一段文字** 或 **一个文件**，二者不绑成一条「多附件笔记」。 |
| 文字存储 | **Cloudflare D1** | 文字内容存 D1，不以「仅 R2 列表」作为文字来源。 |
| 文件与时间线 | **D1 元数据 + R2 对象** | 上传成功后写入 R2，并在 D1 插入一条记录；**列表查询以 D1 为主**。 |
| R2 目录 | **固定前缀，用户不可改** | 前端上传路径自动拼接该前缀，防止误入其它目录。前缀字面量默认 **`records/`**（实现时用常量集中定义，便于改名）。 |
| 访问控制 | **不登录（自用）** | 无账号体系；依赖链接不公开等「信任环境」。 |
| 删除策略 | **硬删除且收敛存储** | 删除 D1 行；若该条为文件记录，**同时删除对应 R2 对象**。 |
| 列表策略 | **分页** | 非全量一次拉取。 |
| 分页方式 | **游标分页（A）** | 例如基于 `created_at` + `id`，避免 offset 在频繁插入时的重复/遗漏问题；前端「加载更多」。 |
| 分页参数 | **`limit` 默认 `50`** | 客户端未传时使用 50；允许调用方覆盖（需在接口契约中约定上限以防滥用）。 |

---

## 4. 假设与约束

### 4.1 技术假设

- Nitro `server/api/**` 使用 Cloudflare **D1** 数据库绑定，具体为 `wrangler.jsonc` 中声明的：
  - `d1_databases[0].binding = "DB"`
  - `d1_databases[0].database_name = "csc3"`
  - `d1_databases[0].database_id = "e1dc6be4-ea41-4540-932f-d52d7c8806c2"`
- `uploadR2` 仍指向既有 Worker/R2 管线；本功能仅约束 **object key** 必须以约定前缀开头。
- 静态访问域名固定为 **`https://store.csc3.fun/`**（与现有页面一致）。

### 4.2 安全与合规（弱保证场景）

- 当前设计**无鉴权**：若页面 URL 暴露，存在被第三方读写风险（视部署与网络可达性而定）。
- 若将来需要：**共享密钥 header**、Cloudflare Access、或最小登录，可作为增量增强。

### 4.3 非功能预期

- 面向 **个人随手记** 量级；通过分页控制单次载荷。
- 单条文字长度、单文件大小上限：**未在本次会话锁定**，实现阶段建议设合理默认（并在接口返回 4xx 时给出明确错误）。

---

## 5. 数据模型（D1 草案）

以下为实施参考 schema，可在落地时微调字段名与类型。

**表：`records`（示例）**

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER PK AUTOINCREMENT | 主键 |
| `kind` | TEXT | `'text'` \| `'file'` |
| `body` | TEXT NULL | `kind=text` 时存正文；`kind=file` 可为 NULL 或摘要 |
| `r2_key` | TEXT NULL | `kind=file` 时存对象 key（须带约定前缀） |
| `mime` | TEXT NULL | 可选，便于展示图标与区分图片 |
| `original_name` | TEXT NULL | 可选，原始文件名 |
| `created_at` | TEXT / INTEGER | ISO 8601 或 Unix ms，需支持游标排序 |

**约束建议**

- `kind=file` 时 `r2_key` NOT NULL；`kind=text` 时 `body` NOT NULL。
- 列表索引：`(created_at DESC, id DESC)` 便于游标查询。

---

## 6. 接口形态（草案）

> 路径与动词可在实现时微调，此处描述职责边界。

| 职责 | 说明 |
|------|------|
| 创建文字记录 | POST：写入 `kind=text` + `body`。 |
| 创建文件记录 | 客户端先 `uploadR2(file, prefix + generatedPath)`，成功后 POST：写入 `kind=file` + `r2_key` + 可选 meta。 |
| 列表（游标） | GET：`limit`（默认 **50**）、`cursor`（编码最后一条的 `created_at`+`id` 或等价 token）、返回 `items` + `nextCursor`。 |
| 删除 | DELETE：按 `id`；若为 file，服务端删除 D1 行并调用 R2 删除 API。 |

---

## 7. 前端行为（草案）

- **页面**：建议置于 `pages/mobile/` 下（与现有移动端布局一致），具体路由名实现时确定。
- **上传**：与 `upload.vue` 一致调用 `uploadR2`，但 **`prefixPath` 固定为常量**（不可由用户改为其它目录）；文件名/key _suffix 可自动生成以避免碰撞。
- **展示**：图片类型用 `https://store.csc3.fun/` + `r2_key`；非图片文件提供下载链接（新标签打开或 `download` 行为按现有组件习惯）。

---

## 8. 分页约定（确认）

- **游标分页**，默认 **`limit = 50`**。
- 客户端请求可不传 `limit`，服务端采用默认值 **50**。
- 建议在服务端对 `limit` 设置 **最大值封顶**（例如 100），防止单次请求过大。

---

## 9. 实现说明（已落地）

- **R2 前缀常量**：`constants/mobile-records.ts` 中 `RECORDS_R2_PREFIX`（默认 `records/`），服务端创建文件类记录时校验 `r2_key` 前缀。
- **D1 迁移**：`d1/migrations/0001_records.sql`；`wrangler.jsonc` 已为绑定 `DB` 配置 `migrations_dir: "d1/migrations"`。应用到远程库示例：
  - `pnpm exec wrangler d1 migrations apply csc3 --remote`（以你本地 wrangler 登录与库名为准）。
- **Nitro 接口**：`GET/POST /api/records`、`DELETE /api/records/:id`（见 `server/api/`）。
- **页面**：`/mobile/record-timeline`（`pages/mobile/record-timeline.vue`），菜单入口见 `components/Menu.vue`。
- **上传失败补偿**：若 `uploadR2` 成功而登记 D1 失败，用户需手动删除 R2 孤儿对象或重试登记（与文档「非阻塞」一致，可后续加幂等补偿接口）。

---

## 10. 修订记录

| 日期 | 变更 |
|------|------|
| 2026-05-06 | 初稿：头脑风暴收口 + **`limit` 默认 50** 写入 |
| 2026-05-08 | 实现：D1 表、Nitro API、`record-timeline` 页面、Wrangler `migrations_dir`、文档第 9 节更新 |
