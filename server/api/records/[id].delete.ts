import { createError, defineEventHandler, getRouterParam } from 'h3'
import { RECORDS_R2_PREFIX } from '~/constants/mobile-records'
import { getD1 } from '../../utils/d1'
import { deleteR2ObjectOnRemote } from '../../utils/r2-remote-delete'

export default defineEventHandler(async (event) => {
  const db = getD1(event)
  const idParam = getRouterParam(event, 'id')
  const id = Number.parseInt(String(idParam), 10)
  if (!Number.isFinite(id) || id < 1) {
    throw createError({ statusCode: 400, statusMessage: '无效的 id' })
  }

  const row = (await db
    .prepare('SELECT id, kind, r2_key FROM records WHERE id = ?')
    .bind(id)
    .first()) as { kind: string, r2_key: string | null } | null

  if (!row) {
    throw createError({ statusCode: 404, statusMessage: '记录不存在' })
  }

  // 服务端调 r2-worker 可能被 Bot 防护拦截；客户端会先尝试 deleteR2。
  // 这里再尽力删一次，失败不阻断 D1 删除，避免记录永远删不掉。
  if (row.kind === 'file' && row.r2_key?.startsWith(RECORDS_R2_PREFIX)) {
    try {
      await deleteR2ObjectOnRemote(row.r2_key)
    }
    catch (e: any) {
      console.warn('[records.delete] R2 删除失败，继续删库记录', row.r2_key, e?.message || e)
    }
  }

  const del = await db.prepare('DELETE FROM records WHERE id = ?').bind(id).run()
  if (!del.success) {
    throw createError({ statusCode: 500, statusMessage: '删除失败' })
  }

  return { ok: true }
})
