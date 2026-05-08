import type { H3Event } from 'h3'
import { createError } from 'h3'

export function getD1(event: H3Event) {
  const db = event.context.cloudflare?.env?.DB
  if (!db) {
    throw createError({
      statusCode: 503,
      statusMessage: '数据库不可用（需在 Cloudflare / wrangler dev 环境下访问）',
    })
  }
  return db
}
