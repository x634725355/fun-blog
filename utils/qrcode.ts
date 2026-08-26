import jsQR from 'jsqr'
import QRCode from 'qrcode'

export type QrSizeKey = 'sm' | 'md' | 'lg'
export type QrEccLevel = 'L' | 'M' | 'Q' | 'H'

export const QR_SIZE_OPTIONS: { label: string, value: QrSizeKey, px: number }[] = [
  { label: '小 · 256', value: 'sm', px: 256 },
  { label: '中 · 384', value: 'md', px: 384 },
  { label: '大 · 512', value: 'lg', px: 512 },
]

export const QR_ECC_OPTIONS: { label: string, value: QrEccLevel }[] = [
  { label: 'L · 约 7%', value: 'L' },
  { label: 'M · 约 15%', value: 'M' },
  { label: 'Q · 约 25%', value: 'Q' },
  { label: 'H · 约 30%', value: 'H' },
]

export const QR_MAX_IMAGE_BYTES = 10 * 1024 * 1024

export function qrSizeToPx(size: QrSizeKey): number {
  return QR_SIZE_OPTIONS.find(item => item.value === size)?.px ?? 384
}

export async function generateQrDataUrl(options: {
  text: string
  size: QrSizeKey
  errorCorrectionLevel: QrEccLevel
}): Promise<string> {
  const text = options.text.trim()
  if (!text) {
    throw new Error('请输入要编码的文本')
  }

  return QRCode.toDataURL(text, {
    width: qrSizeToPx(options.size),
    margin: 2,
    errorCorrectionLevel: options.errorCorrectionLevel,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  })
}

export async function dataUrlToPngBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl)
  return res.blob()
}

export function downloadDataUrl(dataUrl: string, filename = 'qrcode.png') {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

export async function copyPngDataUrl(dataUrl: string): Promise<void> {
  if (!navigator.clipboard || typeof ClipboardItem === 'undefined') {
    throw new Error('当前浏览器不支持复制图片，请改用下载')
  }
  const blob = await dataUrlToPngBlob(dataUrl)
  await navigator.clipboard.write([
    new ClipboardItem({ 'image/png': blob }),
  ])
}

function drawImageToCanvas(img: ImageBitmap | HTMLImageElement): ImageData {
  const width = 'naturalWidth' in img ? img.naturalWidth || img.width : img.width
  const height = 'naturalHeight' in img ? img.naturalHeight || img.height : img.height
  if (!width || !height) {
    throw new Error('无法读取图片尺寸')
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    throw new Error('无法创建画布')
  }
  ctx.drawImage(img, 0, 0)
  return ctx.getImageData(0, 0, width, height)
}

export function decodeQrFromImageData(imageData: ImageData): string | null {
  const result = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'attemptBoth',
  })
  return result?.data || null
}

export async function decodeQrFromImageBlob(blob: Blob): Promise<string> {
  if (blob.type && !blob.type.startsWith('image/')) {
    throw new Error('请选择图片文件')
  }
  if (blob.size > QR_MAX_IMAGE_BYTES) {
    throw new Error('图片过大（上限 10MB）')
  }

  const bitmap = await createImageBitmap(blob)
  try {
    const imageData = drawImageToCanvas(bitmap)
    const text = decodeQrFromImageData(imageData)
    if (!text) {
      throw new Error('未识别到二维码')
    }
    return text
  }
  finally {
    bitmap.close()
  }
}

export async function decodeQrFromImageFile(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('请选择图片文件')
  }
  return decodeQrFromImageBlob(file)
}

function assertHttpImageUrl(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) {
    throw new Error('请输入图片网址')
  }
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  }
  catch {
    throw new Error('图片网址格式无效')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('仅支持 http / https 图片网址')
  }
  return parsed.href
}

/**
 * 拉取远程图片并解码。先直连；若 CORS 失败则走同源代理 `/api/qrcode/image`。
 */
export async function decodeQrFromImageUrl(rawUrl: string): Promise<{
  text: string
  blob: Blob
  sourceUrl: string
}> {
  const sourceUrl = assertHttpImageUrl(rawUrl)

  async function loadBlob(fetchUrl: string): Promise<Blob> {
    const res = await fetch(fetchUrl)
    if (!res.ok) {
      throw new Error(`获取图片失败（${res.status}）`)
    }
    const blob = await res.blob()
    if (blob.size > QR_MAX_IMAGE_BYTES) {
      throw new Error('图片过大（上限 10MB）')
    }
    if (blob.type && !blob.type.startsWith('image/') && blob.type !== 'application/octet-stream') {
      throw new Error('网址不是图片')
    }
    return blob
  }

  let blob: Blob
  try {
    blob = await loadBlob(sourceUrl)
  }
  catch {
    const proxy = `/api/qrcode/image?url=${encodeURIComponent(sourceUrl)}`
    blob = await loadBlob(proxy)
  }

  const text = await decodeQrFromImageBlob(blob)
  return { text, blob, sourceUrl }
}

export function captureVideoFrame(video: HTMLVideoElement): ImageData | null {
  const width = video.videoWidth
  const height = video.videoHeight
  if (!width || !height) {
    return null
  }
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) {
    return null
  }
  ctx.drawImage(video, 0, 0, width, height)
  return ctx.getImageData(0, 0, width, height)
}

export async function openQrCameraStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('当前环境不支持摄像头')
  }
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    })
  }
  catch (e: any) {
    if (e?.name === 'NotAllowedError' || e?.name === 'PermissionDeniedError') {
      throw new Error('摄像头权限被拒绝')
    }
    if (e?.name === 'NotFoundError' || e?.name === 'DevicesNotFoundError') {
      throw new Error('未找到可用摄像头')
    }
    throw new Error(e?.message || '无法打开摄像头')
  }
}

export function stopMediaStream(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((track) => {
    track.stop()
  })
}

export async function copyQrText(text: string): Promise<void> {
  if (!navigator.clipboard?.writeText) {
    throw new Error('当前浏览器不支持复制文本')
  }
  await navigator.clipboard.writeText(text)
}
