# 设计：二维码生成与解码

Status: **validated**（brainstorming 2026-07-30）  
Scope: fun-blog mobile 工具页 · 浏览器本地 · 不落库

---

## Understanding summary

- **做什么**：`/mobile/qrcode` 单页双 Tab——生成（文本→二维码）与解码（图片→文本）。
- **为什么**：个人工具箱补齐本地出码 / 读码。
- **给谁**：个人自用（与现有 mobile 工具一致）。
- **生成**：文本输入；尺寸三档 + 纠错四档；预览；下载 PNG；复制图片到剪贴板。
- **解码**：上传/拖放图片，或**摄像头实时扫码**；展示全文 + 一键复制文本。
- **约束**：全部浏览器本地；接入 Index 菜单与 Hum / Workbench 工具壳。
- **非目标（本版）**：自定义配色、结构化模板（Wi‑Fi 等）、服务端 API、历史记录。

## Assumptions

| 项 | 默认 |
| --- | --- |
| 性能 | 单次操作秒级即可 |
| 规模 | 单用户、低频 |
| 隐私 | 原文/图片不出设备 |
| 失败反馈 | `useToast` |
| 文本类型 | 任意字符串（含 URL），无类型向导 |
| 多码图片 | 只取识别到的第一个结果 |
| 复制图片失败 | toast 提示，保留下载路径 |

## Decision log

| 决定 | 备选 | 原因 |
| --- | --- | --- |
| 同页双 Tab | 两个菜单入口 / 先做生成 | 一个工具完成闭环，菜单更干净 |
| 解码：上传 + 摄像头 | 仅上传 | 迭代补齐实时扫码；切 Tab/卸载时关流 |
| 生成：预览+下载+复制图 | 仅预览 | 个人自用需要带走结果 |
| 可调尺寸+纠错 | 固定黑白无选项 / 再加配色 | 够用且 YAGNI；配色留迭代 |
| 解码：展示+复制文本 | 再加「打开链接」 | 先做通用复制；打开链接可后加 |
| 全浏览器本地 | 服务端 API | 隐私与 Cloudflare 工具页一致性 |
| 方案 1：`qrcode` + `jsQR` | 现成 Widget / 重型 WASM | 贴合现有栈、包体与复杂度可控 |

## Final design

### 信息架构

- 路由：`pages/mobile/qrcode.vue`，`definePageMeta({ ssr: false })`
- 壳：`LayoutMobile`
- 菜单：`components/Menu.vue` 增加 `{ path: '/mobile/qrcode', name: '二维码', hint: 'qr', tint: ... }`
- 页内：短标题 → Tab（生成 | 解码）→ 面板内容
- Tab 状态切换时保留；刷新清空

### 模块

| 路径 | 职责 |
| --- | --- |
| `pages/mobile/qrcode.vue` | 路由入口 + Tab |
| `components/qrcode/QrcodeWorkspace.client.vue` | UI 与交互（可内拆 Generate/Decode） |
| `utils/qrcode.ts` | 生成 DataURL、解码 ImageData、尺寸/ECC 映射 |

### 依赖

- 生成：`qrcode`
- 解码：`jsQR`
- 图片像素：canvas / `createImageBitmap`

### 生成流

1. 校验非空文本  
2. `size` ∈ {256, 384, 512}（默认 384）、`errorCorrectionLevel` ∈ {L,M,Q,H}（默认 M）  
3. `qrcode.toDataURL` / canvas → 预览  
4. 下载：`<a download="qrcode.png">`  
5. 复制：`navigator.clipboard.write([ClipboardItem image/png])`，失败 toast  

### 解码流

1. dropzone 选图 / 拖放，校验 `image/*`（过大可提示，如 10MB）  
2. 绘入 canvas → `jsQR`  
3. 成功：结果 textarea/只读块 +「复制文本」  
4. 失败：toast「未识别到二维码」  
5. 建议：选图后自动解码  

### UI

- 遵循 `design.md`（Hum × 工具 Workbench 面板）
- 解码 dropzone 对齐 image-editor 突出选文件样式
- 预览空态文字居中

### 错误与边界

- 空文本、非图片、无法编码/无法识别、剪贴板拒绝 → toast  
- 颜色固定黑/白  

### 验收

- [ ] 菜单可进入  
- [ ] Tab 切换正常，状态保留  
- [ ] 改尺寸/纠错后预览更新；下载可用  
- [ ] 复制图片在支持的浏览器可用，失败有提示  
- [ ] 清晰二维码图可解码并复制文本  
- [ ] 无码/模糊图有明确失败提示  
- [ ] 无自有后端请求（除静态资源）

---

## Implementation note

已实现（2026-07-30）：
- `pages/mobile/qrcode.vue`
- `components/qrcode/QrcodeWorkspace.client.vue`
- `utils/qrcode.ts`
- 菜单入口「二维码」
- 依赖：`qrcode`、`jsqr`
