<script lang="ts" setup>
import Cropper from 'cropperjs'
import { clampOutputSize, downloadCanvas } from '~/utils/imageEditor'

const toast = useToast()

const fileInputRef = useTemplateRef<HTMLInputElement>('fileInputRef')
const cropperContainerRef = useTemplateRef<HTMLDivElement>('cropperContainerRef')
const cropperImageRef = useTemplateRef<HTMLImageElement>('cropperImageRef')
const previewRef = useTemplateRef<HTMLCanvasElement>('previewRef')

let cropper: Cropper | null = null
let objectUrl = ''

const sourceName = ref('')
const imageSrc = ref('')
const imageLoading = ref(false)
const applying = ref(false)
const naturalWidth = ref(0)
const naturalHeight = ref(0)

const cropX = ref('0')
const cropY = ref('0')
const cropW = ref('0')
const cropH = ref('0')
const outW = ref('0')
const outH = ref('0')

const useScale = ref(false)

const hasImage = computed(() => imageSrc.value.length > 0)

const sourceSizeText = computed(() => {
  if (!hasImage.value || !naturalWidth.value) {
    return '—'
  }
  return `${naturalWidth.value} × ${naturalHeight.value}`
})

function parsePositiveInt(raw: string, fallback: number): number {
  const n = Number.parseInt(String(raw).trim(), 10)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

function getSelection() {
  return cropper?.getCropperSelection() ?? null
}

function syncCropFromSelection() {
  const selection = getSelection()
  if (!selection) {
    return
  }
  cropX.value = String(Math.round(selection.x))
  cropY.value = String(Math.round(selection.y))
  cropW.value = String(Math.round(selection.width))
  cropH.value = String(Math.round(selection.height))
  if (!useScale.value) {
    outW.value = cropW.value
    outH.value = cropH.value
  }
}

function applySelectionFromInputs() {
  const selection = getSelection()
  if (!selection) {
    return
  }
  selection.$change(
    parsePositiveInt(cropX.value, 0),
    parsePositiveInt(cropY.value, 0),
    parsePositiveInt(cropW.value, 1),
    parsePositiveInt(cropH.value, 1),
  )
  syncCropFromSelection()
}

function bindSelectionEvents() {
  const selection = getSelection()
  if (!selection) {
    return
  }
  selection.addEventListener('change', syncCropFromSelection)
}

function destroyCropper() {
  cropper?.destroy()
  cropper = null
}

function revokeObjectUrl() {
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl)
    objectUrl = ''
  }
}

async function initCropper() {
  destroyCropper()
  const image = cropperImageRef.value
  const container = cropperContainerRef.value
  if (!image || !container || !image.complete) {
    return
  }

  naturalWidth.value = image.naturalWidth
  naturalHeight.value = image.naturalHeight

  try {
    cropper = new Cropper(image, { container })
    bindSelectionEvents()

    await nextTick()
    const selection = getSelection()
    selection?.$reset()
    syncCropFromSelection()
    await applyPreview({ silent: true })
  }
  catch (e: any) {
    toast.add({
      color: 'error',
      title: '裁切器初始化失败',
      description: e?.message || String(e),
    })
  }
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

async function applyPreview(options?: { silent?: boolean }) {
  const selection = getSelection()
  if (!selection) {
    if (!options?.silent) {
      toast.add({ color: 'warning', title: '请先选择图片' })
    }
    return
  }

  applying.value = true
  try {
    syncCropFromSelection()
    const canvasOptions: { width?: number, height?: number } = {}
    if (useScale.value) {
      const size = clampOutputSize({
        width: parsePositiveInt(outW.value, parsePositiveInt(cropW.value, 1)),
        height: parsePositiveInt(outH.value, parsePositiveInt(cropH.value, 1)),
      })
      outW.value = String(size.width)
      outH.value = String(size.height)
      canvasOptions.width = size.width
      canvasOptions.height = size.height
    }
    const canvas = await selection.$toCanvas(canvasOptions)
    syncPreviewCanvas(canvas)
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

  destroyCropper()
  imageSrc.value = ''
  revokeObjectUrl()
  await nextTick()

  objectUrl = URL.createObjectURL(file)
  sourceName.value = file.name.replace(/\.[^.]+$/, '') || 'image'
  useScale.value = false
  imageLoading.value = true
  imageSrc.value = objectUrl
  input.value = ''
}

async function onCropperImageLoad() {
  imageLoading.value = false
  await nextTick()
  await initCropper()
}

function onCropperImageError() {
  imageLoading.value = false
  toast.add({ color: 'error', title: '图片加载失败' })
  imageSrc.value = ''
  revokeObjectUrl()
}

function resetCropSelection() {
  getSelection()?.$reset()
  syncCropFromSelection()
  applyPreview()
}

function matchCropOutputSize() {
  outW.value = cropW.value
  outH.value = cropH.value
}

async function downloadResult() {
  const selection = getSelection()
  if (!selection) {
    toast.add({ color: 'warning', title: '请先选择图片' })
    return
  }

  try {
    syncCropFromSelection()
    const canvasOptions: { width?: number, height?: number } = {}
    if (useScale.value) {
      const size = clampOutputSize({
        width: parsePositiveInt(outW.value, parsePositiveInt(cropW.value, 1)),
        height: parsePositiveInt(outH.value, parsePositiveInt(cropH.value, 1)),
      })
      canvasOptions.width = size.width
      canvasOptions.height = size.height
    }
    const canvas = await selection.$toCanvas(canvasOptions)
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

watch(useScale, (enabled) => {
  if (enabled) {
    matchCropOutputSize()
  }
})

onUnmounted(() => {
  destroyCropper()
  imageSrc.value = ''
  revokeObjectUrl()
})
</script>

<template>
  <div class="image-editor">
    <header class="image-editor__header">
      <h1 class="image-editor__title">
        图片裁切 / 缩放
      </h1>
      <p class="image-editor__hint">
        上传后在 Cropper 中选区裁切，可选填输出尺寸进行缩放，再预览并下载。
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
        <span v-if="imageLoading" class="image-editor__loading">加载中…</span>
      </p>
    </section>

    <section v-if="hasImage" class="image-editor__section">
      <div class="image-editor__row">
        <span class="image-editor__label">裁切选区</span>
        <UButton size="xs" variant="soft" @click="resetCropSelection">
          重置选区
        </UButton>
      </div>
      <div ref="cropperContainerRef" class="image-editor__cropper-host">
        <img
          ref="cropperImageRef"
          :src="imageSrc"
          class="image-editor__cropper-image"
          alt="待裁切图片"
          draggable="false"
          @load="onCropperImageLoad"
          @error="onCropperImageError"
        >
      </div>
      <p class="image-editor__tip">
        拖动选框移动，拖四角或边缘调整大小
      </p>
      <div class="image-editor__grid">
        <label class="image-editor__field">
          <span>裁切 X</span>
          <UInput v-model="cropX" type="number" min="0" inputmode="numeric" @blur="applySelectionFromInputs" />
        </label>
        <label class="image-editor__field">
          <span>裁切 Y</span>
          <UInput v-model="cropY" type="number" min="0" inputmode="numeric" @blur="applySelectionFromInputs" />
        </label>
        <label class="image-editor__field">
          <span>裁切宽</span>
          <UInput v-model="cropW" type="number" min="1" inputmode="numeric" @blur="applySelectionFromInputs" />
        </label>
        <label class="image-editor__field">
          <span>裁切高</span>
          <UInput v-model="cropH" type="number" min="1" inputmode="numeric" @blur="applySelectionFromInputs" />
        </label>
      </div>
    </section>

    <section v-if="hasImage" class="image-editor__section">
      <div class="image-editor__row">
        <UCheckbox v-model="useScale" label="启用缩放（可选）" />
        <UButton size="xs" variant="soft" :disabled="!useScale" @click="matchCropOutputSize">
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

    <section v-if="hasImage" class="image-editor__actions">
      <UButton block :loading="applying" @click="() => applyPreview()">
        应用并预览
      </UButton>
      <UButton block color="primary" variant="solid" @click="downloadResult">
        下载图片
      </UButton>
    </section>

    <section class="image-editor__section">
      <p class="image-editor__meta">
        结果预览
      </p>
      <div class="image-editor__preview-wrap">
        <canvas ref="previewRef" class="image-editor__preview" />
        <p v-if="!hasImage" class="image-editor__empty">
          上传图片并完成裁切后显示预览
        </p>
      </div>
    </section>
  </div>
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

.image-editor__loading {
  margin-left: 0.5rem;
}

.image-editor__label {
  font-size: 0.875rem;
  font-weight: 500;
}

.image-editor__tip {
  margin: 0;
  font-size: 0.75rem;
  color: rgb(100 116 139);
}

.image-editor__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.image-editor__cropper-host {
  position: relative;
  width: 100%;
  min-width: 0;
  height: min(50dvh, 22rem);
  min-height: 14rem;
  overflow: hidden;
  border-radius: 0.5rem;
  background: rgb(15 23 42);
}

.image-editor__cropper-host :deep(cropper-canvas) {
  width: 100%;
  height: 100%;
}

.image-editor__cropper-image {
  display: block;
  max-width: 100%;
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
  .image-editor__meta,
  .image-editor__tip {
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
