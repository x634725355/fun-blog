export interface ImageCropRect {
  x: number
  y: number
  width: number
  height: number
}

export interface ImageOutputSize {
  width: number
  height: number
}

export function clampCropRect(
  imageWidth: number,
  imageHeight: number,
  rect: ImageCropRect,
): ImageCropRect {
  const x = Math.max(0, Math.min(Math.floor(rect.x), imageWidth - 1))
  const y = Math.max(0, Math.min(Math.floor(rect.y), imageHeight - 1))
  const maxW = imageWidth - x
  const maxH = imageHeight - y
  const width = Math.max(1, Math.min(Math.floor(rect.width), maxW))
  const height = Math.max(1, Math.min(Math.floor(rect.height), maxH))
  return { x, y, width, height }
}

export function clampOutputSize(size: ImageOutputSize): ImageOutputSize {
  return {
    width: Math.max(1, Math.floor(size.width)),
    height: Math.max(1, Math.floor(size.height)),
  }
}

/** 裁切源图区域并缩放到目标尺寸，输出新 canvas */
export function renderEditedImage(
  image: HTMLImageElement,
  crop: ImageCropRect,
  output: ImageOutputSize,
): HTMLCanvasElement {
  const source = clampCropRect(image.naturalWidth, image.naturalHeight, crop)
  const target = clampOutputSize(output)

  const canvas = document.createElement('canvas')
  canvas.width = target.width
  canvas.height = target.height

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('无法创建画布上下文')
  }

  ctx.drawImage(
    image,
    source.x,
    source.y,
    source.width,
    source.height,
    0,
    0,
    target.width,
    target.height,
  )

  return canvas
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/png', quality = 0.92): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        }
        else {
          reject(new Error('导出图片失败'))
        }
      },
      type,
      quality,
    )
  })
}

export function downloadCanvas(
  canvas: HTMLCanvasElement,
  filename: string,
  type = 'image/png',
  quality = 0.92,
): Promise<void> {
  return canvasToBlob(canvas, type, quality).then((blob) => {
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    anchor.click()
    URL.revokeObjectURL(url)
  })
}

export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片加载失败'))
    }
    img.src = url
  })
}
