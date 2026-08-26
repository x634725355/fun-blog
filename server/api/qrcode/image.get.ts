import { createError, defineEventHandler, getQuery, setHeader } from 'h3'

/** 与 utils/qrcode.ts 保持一致；此处勿 import 该文件以免把浏览器依赖打进 Worker */
const QR_MAX_IMAGE_BYTES = 10 * 1024 * 1024

const BLOCKED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '[::1]',
])

function isPrivateHostname(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase()
  if (BLOCKED_HOSTS.has(host)) {
    return true
  }
  if (host.endsWith('.local') || host.endsWith('.internal')) {
    return true
  }
  const m = /^(\d+)\.(\d+)\.\d+\.\d+$/.exec(host)
  if (m) {
    const a = Number(m[1])
    const b = Number(m[2])
    if (a === 10 || a === 127 || a === 0) {
      return true
    }
    if (a === 169 && b === 254) {
      return true
    }
    if (a === 172 && b >= 16 && b <= 31) {
      return true
    }
    if (a === 192 && b === 168) {
      return true
    }
  }
  return false
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const raw = typeof query.url === 'string' ? query.url.trim() : ''
  if (!raw) {
    throw createError({ statusCode: 400, statusMessage: '缺少 url' })
  }

  let target: URL
  try {
    target = new URL(raw)
  }
  catch {
    throw createError({ statusCode: 400, statusMessage: 'url 无效' })
  }

  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    throw createError({ statusCode: 400, statusMessage: '仅支持 http / https' })
  }
  if (isPrivateHostname(target.hostname)) {
    throw createError({ statusCode: 400, statusMessage: '不允许访问内网地址' })
  }

  let upstream: Response
  try {
    upstream = await fetch(target.href, {
      redirect: 'follow',
      headers: {
        Accept: 'image/*,*/*;q=0.8',
      },
    })
  }
  catch {
    throw createError({ statusCode: 502, statusMessage: '拉取图片失败' })
  }

  if (!upstream.ok) {
    throw createError({
      statusCode: 502,
      statusMessage: `上游返回 ${upstream.status}`,
    })
  }

  const contentType = upstream.headers.get('content-type') || ''
  if (contentType && !contentType.startsWith('image/') && !contentType.includes('octet-stream')) {
    throw createError({ statusCode: 400, statusMessage: '网址不是图片' })
  }

  const contentLength = Number(upstream.headers.get('content-length') || 0)
  if (contentLength > QR_MAX_IMAGE_BYTES) {
    throw createError({ statusCode: 400, statusMessage: '图片过大（上限 10MB）' })
  }

  const bytes = new Uint8Array(await upstream.arrayBuffer())
  if (bytes.byteLength > QR_MAX_IMAGE_BYTES) {
    throw createError({ statusCode: 400, statusMessage: '图片过大（上限 10MB）' })
  }

  setHeader(event, 'Content-Type', contentType.startsWith('image/') ? contentType : 'application/octet-stream')
  setHeader(event, 'Cache-Control', 'private, max-age=60')
  return bytes
})
