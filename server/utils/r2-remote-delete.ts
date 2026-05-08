import { createError } from 'h3'
import { $fetch } from 'ofetch'

const R2_WORKER_ORIGIN = 'https://r2-worker.csc3.fun'
const R2_AUTH_KEY = '333'

/**
 * 调用既有 r2-worker 删除对象（与 composables/api/dataDisplayApi.ts 中 deleteR2 一致）
 */
export async function deleteR2ObjectOnRemote(key: string): Promise<void> {
  const url = `${R2_WORKER_ORIGIN}/api/r2/file?key=${encodeURIComponent(key)}`
  try {
    await $fetch(url, {
      method: 'DELETE',
      headers: {
        'X-Custom-Auth-Key': R2_AUTH_KEY,
      },
    })
  }
  catch (e: any) {
    const status = e?.response?.status ?? e?.statusCode
    if (status === 404) {
      return
    }
    throw createError({
      statusCode: 502,
      statusMessage: 'R2 对象删除失败',
    })
  }
}
