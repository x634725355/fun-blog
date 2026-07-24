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
const hasPreview = ref(false)
const dragOver = ref(false)
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

function clearPreviewCanvas() {
  hasPreview.value = false
  const preview = previewRef.value
  if (!preview) {
    return
  }
  const ctx = preview.getContext('2d')
  preview.width = 0
  preview.height = 0
  ctx?.clearRect(0, 0, 0, 0)
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
  hasPreview.value = true
}

function openPicker() {
  fileInputRef.value?.click()
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
  dragOver.value = true
}

function onDragLeave() {
  dragOver.value = false
}

async function takeImageFile(file: File | null | undefined) {
  if (!file) {
    return
  }
  if (!file.type.startsWith('image/')) {
    toast.add({ color: 'warning', title: '请选择图片文件' })
    return
  }

  destroyCropper()
  clearPreviewCanvas()
  imageSrc.value = ''
  revokeObjectUrl()
  await nextTick()

  objectUrl = URL.createObjectURL(file)
  sourceName.value = file.name.replace(/\.[^.]+$/, '') || 'image'
  useScale.value = false
  imageLoading.value = true
  imageSrc.value = objectUrl
}

async function onDrop(e: DragEvent) {
  e.preventDefault()
  dragOver.value = false
  const file = e.dataTransfer?.files?.item(0)
  await takeImageFile(file)
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
  await takeImageFile(file)
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

    <section
      class="image-editor__section image-editor__section--pick"
      aria-labelledby="image-editor-pick-label"
    >
      <h2
        id="image-editor-pick-label"
        class="image-editor__section-title"
      >
        选择图片
      </h2>

      <input
        ref="fileInputRef"
        type="file"
        accept="image/*"
        class="image-editor__native"
        @change="onFileChange"
      >

      <button
        type="button"
        class="image-editor__drop"
        :class="{
          'image-editor__drop--active': dragOver,
          'image-editor__drop--filled': hasImage,
        }"
        @click="openPicker"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop"
      >
        <Icon
          name="i-heroicons-photo"
          class="image-editor__drop-icon"
        />
        <span class="image-editor__drop-title">
          {{ hasImage ? '重新选择图片' : '点击选择图片' }}
        </span>
        <span class="image-editor__drop-hint">
          也可拖放到这里 · 支持常见图片格式
        </span>
      </button>

      <p
        v-if="hasImage || imageLoading"
        class="image-editor__meta"
      >
        原图尺寸：<span>{{ sourceSizeText }}</span>
        <span
          v-if="imageLoading"
          class="image-editor__loading"
        >加载中…</span>
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

    <section
      class="image-editor__section"
      aria-labelledby="image-editor-result-label"
    >
      <h2
        id="image-editor-result-label"
        class="image-editor__section-title"
      >
        结果预览
      </h2>
      <div
        class="image-editor__preview-wrap"
        :class="{ 'image-editor__preview-wrap--empty': !hasPreview }"
      >
        <canvas
          v-show="hasPreview"
          ref="previewRef"
          class="image-editor__preview"
        />
        <p
          v-if="!hasPreview"
          class="image-editor__empty"
        >
          {{ hasImage ? '应用并预览后显示结果' : '上传图片并完成裁切后显示预览' }}
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Hallmark · genre: playful · tool: Workbench panel · theme: Hum × #E5CB90 · design-system: design.md
 * pre-emit critique: P4 H5 E5 S4 R5 V4
 */

.image-editor {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  padding: var(--space-sm);
  padding-bottom: max(var(--space-sm), env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}

.image-editor__header,
.image-editor__section,
.image-editor__actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xs);
  min-width: 0;
  padding: var(--space-sm);
  border-radius: var(--radius-card);
  border: 1px solid var(--color-rule);
  background: var(--color-paper-2);
  box-shadow: var(--shadow-soft);
}

.image-editor__section--pick {
  position: relative;
  gap: var(--space-xs);
  border-color: color-mix(in oklab, var(--color-accent) 45%, var(--color-rule));
  background:
    radial-gradient(120% 90% at 0% 0%, var(--glow-accent), transparent 55%),
    var(--color-paper);
  box-shadow: var(--shadow-bubble);
}

.image-editor__section-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: 700;
  font-style: normal;
  letter-spacing: -0.01em;
  color: var(--color-ink);
}

.image-editor__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 700;
  font-style: normal;
  line-height: 1.35;
  letter-spacing: -0.025em;
  overflow-wrap: anywhere;
}

.image-editor__hint,
.image-editor__meta,
.image-editor__tip {
  margin: 0;
  font-size: var(--text-sm);
  line-height: 1.4;
  color: var(--color-muted);
}

.image-editor__loading {
  margin-left: var(--space-2xs);
  color: var(--color-accent-2);
}

.image-editor__native {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.image-editor__drop {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-2xs);
  width: 100%;
  min-height: 9.5rem;
  padding: var(--space-md) var(--space-sm);
  border: 2px dashed color-mix(in oklab, var(--color-accent) 55%, var(--color-rule));
  border-radius: var(--radius-card);
  background: color-mix(in oklab, var(--color-accent-soft) 70%, var(--color-paper));
  color: var(--color-ink);
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition:
    background-color var(--dur-short) var(--ease-out),
    border-color var(--dur-short) var(--ease-out),
    transform var(--dur-short) var(--ease-out),
    box-shadow var(--dur-short) var(--ease-out);
}

.image-editor__drop:hover {
  border-color: var(--color-accent-deep);
  background: var(--color-accent-soft);
  box-shadow: var(--shadow-soft);
}

.image-editor__drop:active {
  transform: translateY(1px);
}

.image-editor__drop--active {
  border-color: var(--color-accent-2);
  background: var(--color-accent-2-soft);
}

.image-editor__drop--filled {
  border-style: solid;
  border-color: color-mix(in oklab, var(--color-accent) 40%, var(--color-rule));
}

.image-editor__drop-icon {
  width: 2rem;
  height: 2rem;
  color: var(--color-accent-deep);
}

.image-editor__drop-title {
  font-family: var(--font-body);
  font-size: var(--text-md);
  font-weight: 700;
  font-style: normal;
  line-height: 1.2;
  white-space: nowrap;
}

.image-editor__drop-hint {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-muted);
  text-align: center;
}

.image-editor__label {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-ink);
}

.image-editor__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2xs);
  flex-wrap: wrap;
}

.image-editor__cropper-host {
  position: relative;
  width: 100%;
  min-width: 0;
  height: min(50dvh, 22rem);
  min-height: 14rem;
  overflow: hidden;
  border-radius: var(--radius-bubble);
  background: var(--color-stage);
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
  gap: var(--space-2xs);
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
  gap: var(--space-3xs);
  min-width: 0;
  font-size: var(--text-xs);
  color: var(--color-ink-2);
}

.image-editor__preview-wrap {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  min-height: 10rem;
  border: 1px dashed var(--color-rule);
  border-radius: var(--radius-bubble);
  background: var(--color-paper);
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-sm);
}

.image-editor__preview-wrap--empty {
  overflow: hidden;
}

.image-editor__preview {
  display: block;
  max-width: 100%;
  height: auto;
}

.image-editor__empty {
  margin: 0;
  width: 100%;
  max-width: 22ch;
  font-size: var(--text-sm);
  line-height: 1.45;
  color: var(--color-muted);
  text-align: center;
}

@media (prefers-reduced-motion: reduce) {
  .image-editor__drop {
    transition: none;
  }

  .image-editor__drop:active {
    transform: none;
  }
}
</style>
