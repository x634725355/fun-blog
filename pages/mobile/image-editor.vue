<script lang="ts" setup>
import type { ImageCropRect, ImageOutputSize } from '~/utils/imageEditor'
import {
  clampCropRect,
  clampOutputSize,
  downloadCanvas,
  loadImageFromFile,
  renderEditedImage,
} from '~/utils/imageEditor'

definePageMeta({ ssr: false })

const toast = useToast()

const fileInputRef = useTemplateRef<HTMLInputElement>('fileInputRef')
const previewRef = useTemplateRef<HTMLCanvasElement>('previewRef')

const sourceImage = ref<HTMLImageElement | null>(null)
const sourceName = ref('')
const applying = ref(false)

const cropX = ref('0')
const cropY = ref('0')
const cropW = ref('0')
const cropH = ref('0')

const outW = ref('0')
const outH = ref('0')

const useCrop = ref(true)
const useScale = ref(true)

const sourceSizeText = computed(() => {
  if (!sourceImage.value) {
    return '—'
  }
  const { naturalWidth: w, naturalHeight: h } = sourceImage.value
  return `${w} × ${h}`
})

function parsePositiveInt(raw: string, fallback: number): number {
  const n = Number.parseInt(String(raw).trim(), 10)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

function resetCropToFull(img: HTMLImageElement) {
  cropX.value = '0'
  cropY.value = '0'
  cropW.value = String(img.naturalWidth)
  cropH.value = String(img.naturalHeight)
  outW.value = String(img.naturalWidth)
  outH.value = String(img.naturalHeight)
}

function readCrop(): ImageCropRect {
  const img = sourceImage.value
  if (!img) {
    return { x: 0, y: 0, width: 1, height: 1 }
  }
  if (!useCrop.value) {
    return {
      x: 0,
      y: 0,
      width: img.naturalWidth,
      height: img.naturalHeight,
    }
  }
  return clampCropRect(img.naturalWidth, img.naturalHeight, {
    x: parsePositiveInt(cropX.value, 0),
    y: parsePositiveInt(cropY.value, 0),
    width: parsePositiveInt(cropW.value, img.naturalWidth),
    height: parsePositiveInt(cropH.value, img.naturalHeight),
  })
}

function readOutput(crop: ImageCropRect): ImageOutputSize {
  if (!useScale.value) {
    return { width: crop.width, height: crop.height }
  }
  return clampOutputSize({
    width: parsePositiveInt(outW.value, crop.width),
    height: parsePositiveInt(outH.value, crop.height),
  })
}

function syncPreviewCanvas(canvas: HTMLCanvasElement) {
  const preview = previewRef.value
  if (!preview) {
    return
  }
  preview.width = canvas.width
  preview.height = canvas.height
  const ctx = preview.getContext('2d')
  if (!ctx) {
    return
  }
  ctx.clearRect(0, 0, preview.width, preview.height)
  ctx.drawImage(canvas, 0, 0)
}

function applyPreview() {
  const img = sourceImage.value
  if (!img) {
    toast.add({ color: 'warning', title: '请先选择图片' })
    return
  }

  applying.value = true
  try {
    const crop = readCrop()
    const output = readOutput(crop)
    cropX.value = String(crop.x)
    cropY.value = String(crop.y)
    cropW.value = String(crop.width)
    cropH.value = String(crop.height)
    outW.value = String(output.width)
    outH.value = String(output.height)

    const result = renderEditedImage(img, crop, output)
    syncPreviewCanvas(result)
  }
  catch (e: any) {
    toast.add({
      color: 'error',
      title: '预览失败',
      description: e?.message || String(e),
    })
  }
  finally {
    applying.value = false
  }
}

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.item(0)
  if (!file) {
    return
  }
  if (!file.type.startsWith('image/')) {
    toast.add({ color: 'warning', title: '请选择图片文件' })
    input.value = ''
    return
  }

  try {
    const img = await loadImageFromFile(file)
    sourceImage.value = img
    sourceName.value = file.name.replace(/\.[^.]+$/, '') || 'image'
    resetCropToFull(img)
    useCrop.value = true
    useScale.value = true
    applyPreview()
  }
  catch (e: any) {
    toast.add({
      color: 'error',
      title: '加载失败',
      description: e?.message || String(e),
    })
  }
}

function fillFullCrop() {
  const img = sourceImage.value
  if (!img) {
    return
  }
  resetCropToFull(img)
  applyPreview()
}

function matchCropOutputSize() {
  outW.value = cropW.value
  outH.value = cropH.value
  applyPreview()
}

async function downloadResult() {
  const img = sourceImage.value
  if (!img) {
    toast.add({ color: 'warning', title: '请先选择图片' })
    return
  }

  try {
    const crop = readCrop()
    const output = readOutput(crop)
    const canvas = renderEditedImage(img, crop, output)
    const filename = `${sourceName.value || 'image'}-edited.png`
    await downloadCanvas(canvas, filename, 'image/png')
    toast.add({ color: 'primary', title: '已开始下载' })
  }
  catch (e: any) {
    toast.add({
      color: 'error',
      title: '下载失败',
      description: e?.message || String(e),
    })
  }
}
</script>

<template>
  <LayoutMobile>
    <div class="image-editor">
      <header class="image-editor__header">
        <h1 class="image-editor__title">
          图片裁切 / 缩放
        </h1>
        <p class="image-editor__hint">
          本地上传图片，填写裁切与输出尺寸数值后预览并下载。
        </p>
      </header>

      <section class="image-editor__section">
        <input
          ref="fileInputRef"
          type="file"
          accept="image/*"
          class="image-editor__file"
          @change="onFileChange"
        >
        <p class="image-editor__meta">
          原图尺寸：<span>{{ sourceSizeText }}</span>
        </p>
      </section>

      <section v-if="sourceImage" class="image-editor__section">
        <div class="image-editor__row">
          <UCheckbox v-model="useCrop" label="启用裁切" />
          <UButton size="xs" variant="soft" @click="fillFullCrop">
            整图
          </UButton>
        </div>
        <div class="image-editor__grid" :class="{ 'image-editor__grid--disabled': !useCrop }">
          <label class="image-editor__field">
            <span>裁切 X</span>
            <UInput v-model="cropX" type="number" min="0" inputmode="numeric" :disabled="!useCrop" />
          </label>
          <label class="image-editor__field">
            <span>裁切 Y</span>
            <UInput v-model="cropY" type="number" min="0" inputmode="numeric" :disabled="!useCrop" />
          </label>
          <label class="image-editor__field">
            <span>裁切宽</span>
            <UInput v-model="cropW" type="number" min="1" inputmode="numeric" :disabled="!useCrop" />
          </label>
          <label class="image-editor__field">
            <span>裁切高</span>
            <UInput v-model="cropH" type="number" min="1" inputmode="numeric" :disabled="!useCrop" />
          </label>
        </div>
      </section>

      <section v-if="sourceImage" class="image-editor__section">
        <div class="image-editor__row">
          <UCheckbox v-model="useScale" label="启用缩放" />
          <UButton size="xs" variant="soft" @click="matchCropOutputSize">
            同步裁切尺寸
          </UButton>
        </div>
        <div class="image-editor__grid image-editor__grid--two" :class="{ 'image-editor__grid--disabled': !useScale }">
          <label class="image-editor__field">
            <span>输出宽</span>
            <UInput v-model="outW" type="number" min="1" inputmode="numeric" :disabled="!useScale" />
          </label>
          <label class="image-editor__field">
            <span>输出高</span>
            <UInput v-model="outH" type="number" min="1" inputmode="numeric" :disabled="!useScale" />
          </label>
        </div>
      </section>

      <section v-if="sourceImage" class="image-editor__actions">
        <UButton block :loading="applying" @click="applyPreview">
          应用并预览
        </UButton>
        <UButton block color="primary" variant="solid" @click="downloadResult">
          下载图片
        </UButton>
      </section>

      <section class="image-editor__section">
        <p class="image-editor__meta">
          预览
        </p>
        <div class="image-editor__preview-wrap">
          <canvas ref="previewRef" class="image-editor__preview" />
          <p v-if="!sourceImage" class="image-editor__empty">
            上传图片后显示预览
          </p>
        </div>
      </section>
    </div>
  </LayoutMobile>
</template>

<style scoped>
.image-editor {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  padding: 0.75rem;
  padding-bottom: max(0.75rem, env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.image-editor__header {
  min-width: 0;
}

.image-editor__title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.5rem;
}

.image-editor__hint {
  margin: 0.375rem 0 0;
  font-size: 0.8125rem;
  line-height: 1.25rem;
  color: rgb(100 116 139);
}

.image-editor__section {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  min-width: 0;
}

.image-editor__file {
  display: block;
  width: 100%;
  max-width: 100%;
  font-size: 0.875rem;
}

.image-editor__meta {
  margin: 0;
  font-size: 0.8125rem;
  color: rgb(100 116 139);
}

.image-editor__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.image-editor__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}

.image-editor__grid--two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.image-editor__grid--disabled {
  opacity: 0.55;
}

.image-editor__field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
  font-size: 0.75rem;
  color: rgb(71 85 105);
}

.image-editor__actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.image-editor__preview-wrap {
  position: relative;
  width: 100%;
  min-width: 0;
  min-height: 8rem;
  border: 1px dashed rgb(203 213 225);
  border-radius: 0.5rem;
  background: rgb(248 250 252);
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
}

.image-editor__preview {
  display: block;
  max-width: 100%;
  height: auto;
}

.image-editor__empty {
  margin: 0;
  font-size: 0.8125rem;
  color: rgb(148 163 184);
}

@media (prefers-color-scheme: dark) {
  .image-editor__hint,
  .image-editor__meta {
    color: rgb(148 163 184);
  }

  .image-editor__field {
    color: rgb(203 213 225);
  }

  .image-editor__preview-wrap {
    border-color: rgb(71 85 105);
    background: rgb(30 41 59);
  }

  .image-editor__empty {
    color: rgb(100 116 139);
  }
}
</style>
