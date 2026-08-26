import { createError } from 'h3'

const R2_WORKER_ORIGIN = 'https://r2-worker.csc3.fun'
const R2_AUTH_KEY = '333'

/**
 * DELETE /api/r2/file — 对接 docs/API.md
 * `key` 做 URL 编码；鉴权头 `X-Custom-Auth-Key`
 */
export async function deleteR2ObjectOnRemote(key: string): Promise<{ success: true }> {
  const url = `${R2_WORKER_ORIGIN}/api/r2/file?key=${encodeURIComponent(key)}`
  let res: Response
  try {
    res = await fetch(url, {
      method: 'DELETE',
      headers: {
        'X-Custom-Auth-Key': R2_AUTH_KEY,
      },
    })
  }
  catch (e: any) {
    throw createError({
      statusCode: 502,
      statusMessage: 'R2 对象删除失败',
      message: e?.message || '无法连接 r2-worker',
    })
  }

  // 对象已不存在时视为成功（幂等）
  if (res.status === 404) {
    return { success: true }
  }

  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const body = await res.json() as { error?: string, message?: string, code?: number }
      detail = body.error || body.message || detail
    }
    catch {
      // ignore non-json body (e.g. CF challenge HTML)
    }
    throw createError({
      statusCode: 502,
      statusMessage: 'R2 对象删除失败',
      message: detail,
    })
  }

  const data = await res.json() as { success?: boolean }
  if (!data?.success) {
    throw createError({
      statusCode: 502,
      statusMessage: 'R2 对象删除失败',
      message: '上游未返回 success',
    })
  }

  return { success: true }
}
