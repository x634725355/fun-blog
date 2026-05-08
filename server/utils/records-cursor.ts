import { Buffer } from 'node:buffer'
import { createError } from 'h3'

export function encodeRecordCursor(created_at: number, id: number): string {
  return Buffer.from(JSON.stringify({ c: created_at, i: id }), 'utf8').toString('base64url')
}

export function decodeRecordCursor(raw: string): { c: number, i: number } {
  try {
    const o = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as { c?: unknown, i?: unknown }
    const c = Number(o.c)
    const i = Number(o.i)
    if (!Number.isFinite(c) || !Number.isFinite(i)) {
      throw new TypeError('invalid')
    }
    return { c, i }
  }
  catch {
    throw createError({ statusCode: 400, statusMessage: '无效的 cursor 参数' })
  }
}
