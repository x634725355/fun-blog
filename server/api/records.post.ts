import { createError, defineEventHandler, readBody } from 'h3'
import { RECORDS_R2_PREFIX } from '~/constants/mobile-records'
import { getD1 } from '../utils/d1'

interface PostBody {
  kind?: string
  body?: string | null
  r2_key?: string | null
  mime?: string | null
  original_name?: string | null
}

function assertValidRecordsR2Key(key: string) {
  if (!key.startsWith(RECORDS_R2_PREFIX)) {
    throw createError({
      statusCode: 400,
      statusMessage: `r2_key 必须以 ${RECORDS_R2_PREFIX} 开头`,
    })
  }
  if (key.includes('..')) {
    throw createError({ statusCode: 400, statusMessage: '非法 r2_key' })
  }
}

export default defineEventHandler(async (event) => {
  const db = getD1(event)
  const b = await readBody<PostBody>(event)
  const kind = b.kind

  if (kind === 'text') {
    const text = typeof b.body === 'string' ? b.body.trim() : ''
    if (!text) {
      throw createError({ statusCode: 400, statusMessage: '文字内容不能为空' })
    }
    const created_at = Date.now()
    const res = await db
      .prepare(
        `INSERT INTO records (kind, body, r2_key, mime, original_name, created_at)
         VALUES ('text', ?, NULL, NULL, NULL, ?)`,
      )
      .bind(text, created_at)
      .run()
    if (!res.success) {
      throw createError({ statusCode: 500, statusMessage: '写入失败' })
    }
    const id = Number(res.meta.last_row_id)
    return {
      id,
      kind: 'text',
      body: text,
      r2_key: null,
      mime: null,
      original_name: null,
      created_at,
    }
  }

  if (kind === 'file') {
    const r2_key = typeof b.r2_key === 'string' ? b.r2_key.trim() : ''
    if (!r2_key) {
      throw createError({ statusCode: 400, statusMessage: '缺少 r2_key' })
    }
    assertValidRecordsR2Key(r2_key)
    const mime = b.mime != null ? String(b.mime).slice(0, 200) : null
    const original_name = b.original_name != null ? String(b.original_name).slice(0, 500) : null
    const created_at = Date.now()
    const res = await db
      .prepare(
        `INSERT INTO records (kind, body, r2_key, mime, original_name, created_at)
         VALUES ('file', NULL, ?, ?, ?, ?)`,
      )
      .bind(r2_key, mime, original_name, created_at)
      .run()
    if (!res.success) {
      throw createError({ statusCode: 500, statusMessage: '写入失败' })
    }
    const id = Number(res.meta.last_row_id)
    return {
      id,
      kind: 'file',
      body: null,
      r2_key,
      mime,
      original_name,
      created_at,
    }
  }

  throw createError({ statusCode: 400, statusMessage: 'kind 须为 text 或 file' })
})
