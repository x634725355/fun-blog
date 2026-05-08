import { createError, defineEventHandler, getQuery } from 'h3'
import {
  RECORDS_DEFAULT_PAGE_LIMIT,
  RECORDS_MAX_PAGE_LIMIT,
} from '~/constants/mobile-records'
import { getD1 } from '../utils/d1'
import { decodeRecordCursor, encodeRecordCursor } from '../utils/records-cursor'

async function fetchPage(db: D1Database, limit: number) {
  const r = await db
    .prepare(
      `SELECT id, kind, body, r2_key, mime, original_name, created_at
       FROM records
       ORDER BY created_at DESC, id DESC
       LIMIT ?`,
    )
    .bind(limit)
    .all()
  return (r.results ?? []) as RecordRow[]
}

async function fetchPageAfterCursor(
  db: D1Database,
  cur: { c: number, i: number },
  limit: number,
) {
  const r = await db
    .prepare(
      `SELECT id, kind, body, r2_key, mime, original_name, created_at
       FROM records
       WHERE (created_at < ?) OR (created_at = ? AND id < ?)
       ORDER BY created_at DESC, id DESC
       LIMIT ?`,
    )
    .bind(cur.c, cur.c, cur.i, limit)
    .all()
  return (r.results ?? []) as RecordRow[]
}

interface RecordRow {
  id: number
  kind: string
  body: string | null
  r2_key: string | null
  mime: string | null
  original_name: string | null
  created_at: number
}

export default defineEventHandler(async (event) => {
  const db = getD1(event)
  const q = getQuery(event)
  let limit = RECORDS_DEFAULT_PAGE_LIMIT
  if (q.limit !== undefined && q.limit !== '') {
    const n = Number.parseInt(String(q.limit), 10)
    if (!Number.isFinite(n) || n < 1) {
      throw createError({ statusCode: 400, statusMessage: 'limit 无效' })
    }
    limit = Math.min(n, RECORDS_MAX_PAGE_LIMIT)
  }

  const cursorRaw = q.cursor ? String(q.cursor) : ''
  const rows = cursorRaw
    ? await fetchPageAfterCursor(db, decodeRecordCursor(cursorRaw), limit)
    : await fetchPage(db, limit)

  const last = rows[rows.length - 1]
  let nextCursor: string | null = null
  if (rows.length === limit && last) {
    nextCursor = encodeRecordCursor(Number(last.created_at), Number(last.id))
  }

  return { items: rows, nextCursor }
})
