# R2 Worker API 文档

面向第三方项目对接的接口说明。本服务基于 Cloudflare Workers，提供 R2 对象存储的列表、上传、删除，以及目录结构查询能力。

## 基本信息

| 项 | 说明 |
| --- | --- |
| Base URL | 以实际部署域名为准（如 `https://r2-worker.<account>.workers.dev`） |
| 协议 | HTTPS |
| 数据格式 | JSON（上传接口请求体为二进制） |
| 鉴权方式 | 请求头 `X-Custom-Auth-Key` |

## 鉴权

除页面根路径 `/` 外，所有 `/api/*` 接口均需携带自定义鉴权头：

```http
X-Custom-Auth-Key: <AUTH_KEY_SECRET>
```

`AUTH_KEY_SECRET` 与 Worker 环境变量一致。鉴权失败返回：

```json
{
  "error": "Invalid API Key"
}
```

HTTP 状态码：`403`

## CORS

允许的 Origin：

- `https://blog.csc3.fun`
- `http://localhost:7777`

允许的请求头：`Content-Type`、`X-Custom-Auth-Key`  
允许的方法：`GET`、`PUT`、`DELETE`、`OPTIONS`、`POST`

跨域请求需先通过 `OPTIONS` 预检。

## 统一约定

### 成功 / 失败

不同接口的成功响应结构略有差异，见各接口说明。全局未捕获异常时返回：

```json
{
  "code": 500,
  "message": "System abnormality"
}
```

HTTP 状态码：`500`

未匹配路由：

```json
{
  "message": "Not Found",
  "ok": false
}
```

HTTP 状态码：`404`

---

## 接口列表

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `GET` | `/api/r2/list` | 列出 R2 对象 |
| `PUT` | `/api/r2/upload` | 上传文件到 R2 |
| `DELETE` | `/api/r2/file` | 删除 R2 对象 |
| `GET` | `/api/r2/catalogue` | 获取扁平化目录结构（来自 KV 缓存） |
| `GET` | `/api/sync-now` | 手动触发目录结构同步 |

---

### 1. 列出对象

列出 Bucket 中的对象，支持前缀过滤与分页游标。

- **Method**: `GET`
- **Path**: `/api/r2/list`
- **Auth**: 需要

#### Query 参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `prefix` | string | 否 | — | 对象 key 前缀，用于目录过滤 |
| `cursor` | string | 否 | — | 分页游标（上次列表返回的 continuation） |
| `limit` | number | 否 | `500` | 单次返回数量上限 |

#### 响应 `200`

```json
[
  {
    "key": "images/photo.jpg",
    "size": 102400,
    "uploaded": "2025-01-01T00:00:00.000Z"
  }
]
```

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `key` | string | 对象完整路径 |
| `size` | number | 文件大小（字节） |
| `uploaded` | string (ISO datetime) | 上传时间 |

#### 调用示例

```bash
curl -X GET 'https://<host>/api/r2/list?prefix=images/&limit=100' \
  -H 'X-Custom-Auth-Key: <AUTH_KEY_SECRET>'
```

```ts
const res = await fetch(
  `${BASE_URL}/api/r2/list?prefix=images/&limit=100`,
  { headers: { 'X-Custom-Auth-Key': AUTH_KEY } }
)
const list = await res.json()
```

---

### 2. 上传文件

将请求体二进制内容写入 R2，key 由 Query 指定。

- **Method**: `PUT`
- **Path**: `/api/r2/upload`
- **Auth**: 需要
- **Body**: 原始二进制（`ArrayBuffer` / `Blob` / `File`），非 JSON

#### Query 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `key` | string | 是 | 对象存储路径，如 `images/a.png` |

#### 响应 `200`

```json
{
  "success": true,
  "key": "images/a.png"
}
```

#### 调用示例

```bash
curl -X PUT 'https://<host>/api/r2/upload?key=images/a.png' \
  -H 'X-Custom-Auth-Key: <AUTH_KEY_SECRET>' \
  -H 'Content-Type: application/octet-stream' \
  --data-binary @./a.png
```

```ts
async function uploadFile(file: File, key: string) {
  const res = await fetch(
    `${BASE_URL}/api/r2/upload?key=${encodeURIComponent(key)}`,
    {
      method: 'PUT',
      headers: {
        'X-Custom-Auth-Key': AUTH_KEY,
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file,
    }
  )
  return res.json() as Promise<{ success: boolean; key: string }>
}
```

> 注意：`key` 建议做 URL 编码；路径分隔使用 `/`。服务端当前不做文件类型 / 大小校验，调用方自行约束。

---

### 3. 删除文件

按 key 删除 R2 对象。

- **Method**: `DELETE`
- **Path**: `/api/r2/file`
- **Auth**: 需要

#### Query 参数

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `key` | string | 是 | 要删除的对象路径 |

#### 响应 `200`

```json
{
  "success": true
}
```

#### 调用示例

```bash
curl -X DELETE 'https://<host>/api/r2/file?key=images/a.png' \
  -H 'X-Custom-Auth-Key: <AUTH_KEY_SECRET>'
```

```ts
async function deleteFile(key: string) {
  const res = await fetch(
    `${BASE_URL}/api/r2/file?key=${encodeURIComponent(key)}`,
    {
      method: 'DELETE',
      headers: { 'X-Custom-Auth-Key': AUTH_KEY },
    }
  )
  return res.json() as Promise<{ success: boolean }>
}
```

---

### 4. 获取目录结构

读取 KV 中缓存的扁平化目录结构（由定时任务或手动同步写入，非实时扫盘）。

- **Method**: `GET`
- **Path**: `/api/r2/catalogue`
- **Auth**: 需要

#### 响应 `200`（有数据）

```json
{
  "code": 200,
  "data": [
    {
      "path": "images",
      "name": "images",
      "type": "directory",
      "children": ["images/thumb"]
    },
    {
      "path": "images/thumb",
      "name": "thumb",
      "type": "directory",
      "children": []
    }
  ]
}
```

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `path` | string | 目录完整路径（不含末尾 `/`） |
| `name` | string | 目录名 |
| `type` | `"directory"` \| `"file"` | 当前固定为目录结构项 |
| `children` | string[] | 子目录 path 列表 |

#### 响应 `200`（无缓存）

```json
false
```

当 KV 中尚无目录数据时，直接返回布尔值 `false`。

#### 调用示例

```bash
curl -X GET 'https://<host>/api/r2/catalogue' \
  -H 'X-Custom-Auth-Key: <AUTH_KEY_SECRET>'
```

```ts
async function getCatalogue() {
  const res = await fetch(`${BASE_URL}/api/r2/catalogue`, {
    headers: { 'X-Custom-Auth-Key': AUTH_KEY },
  })
  const body = await res.json()
  if (body === false) return []
  return body.data as Array<{
    path: string
    name: string
    type: 'directory' | 'file'
    children?: string[]
  }>
}
```

> 目录缓存默认每 3 小时由 Cron（`0 */3 * * *`）刷新一次。上传 / 删除后若需立刻看到新目录，请调用下方「手动同步」接口。

---

### 5. 手动同步目录结构

立即扫描 R2 并重建 KV 中的目录缓存，供测试或强制刷新使用。

- **Method**: `GET`
- **Path**: `/api/sync-now`
- **Auth**: 需要

#### 响应 `200`（成功）

```json
{
  "code": 200,
  "data": [
    {
      "path": "images",
      "name": "images",
      "type": "directory",
      "children": ["images/thumb"]
    }
  ]
}
```

#### 响应（失败）

```json
{
  "code": 500,
  "data": []
}
```

#### 调用示例

```bash
curl -X GET 'https://<host>/api/sync-now' \
  -H 'X-Custom-Auth-Key: <AUTH_KEY_SECRET>'
```

---

## TypeScript 类型参考

```ts
type AuthHeaders = {
  'X-Custom-Auth-Key': string
}

type R2ObjectItem = {
  key: string
  size: number
  uploaded: string // ISO datetime
}

type R2DirectoryItem = {
  path: string
  name: string
  type: 'directory' | 'file'
  children?: string[]
}

type ApiEnvelope<T> = {
  code: number
  data?: T
  message?: string
}

type UploadResult = {
  success: true
  key: string
}

type DeleteResult = {
  success: true
}
```

## 对接注意

1. **鉴权头名称**固定为 `X-Custom-Auth-Key`，不要改成 `Authorization` 等其它头。
2. **上传接口**请求体是文件二进制，不要包一层 JSON。
3. **`/api/r2/catalogue` 与 `/api/r2/list` 职责不同**：前者是缓存的目录树；后者是实时对象列表。
4. 若调用方 Origin 不在 CORS 白名单，浏览器跨域会被拦截；服务端 / Node 直连不受影响。
5. 需要新 Origin 时，需同步更新 Worker 的 CORS / CSRF 配置后重新部署。

## 错误码速查

| HTTP | 场景 | 响应体要点 |
| --- | --- | --- |
| `403` | API Key 错误或缺失 | `{ "error": "Invalid API Key" }` |
| `404` | 路由不存在 | `{ "message": "Not Found", "ok": false }` |
| `500` | 未处理异常 / 同步失败 | `{ "code": 500, ... }` |
