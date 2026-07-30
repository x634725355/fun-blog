<script lang="ts" setup>
import type { QrEccLevel, QrSizeKey } from '~/utils/qrcode'
import {
  QR_ECC_OPTIONS,
  QR_SIZE_OPTIONS,
  captureVideoFrame,
  copyPngDataUrl,
  copyQrText,
  decodeQrFromImageData,
  decodeQrFromImageFile,
  downloadDataUrl,
  generateQrDataUrl,
  openQrCameraStream,
  stopMediaStream,
} from '~/utils/qrcode'

const toast = useToast()

const tab = ref<'generate' | 'decode'>('generate')

const text = ref('')
const size = ref<QrSizeKey>('md')
const ecc = ref<QrEccLevel>('M')
const generating = ref(false)
const qrDataUrl = ref('')

const fileInputRef = useTemplateRef<HTMLInputElement>('fileInputRef')
const videoRef = useTemplateRef<HTMLVideoElement>('videoRef')
const dragOver = ref(false)
const decoding = ref(false)
const sourceName = ref('')
const previewObjectUrl = ref('')
const decodeResult = ref('')
const cameraOn = ref(false)
const cameraStarting = ref(false)
const cameraHint = ref('')

let cameraStream: MediaStream | null = null
let scanRaf = 0
let lastScanAt = 0
let scanLocked = false

const sizeItems = QR_SIZE_OPTIONS.map(item => ({
  label: item.label,
  value: item.value,
}))

const eccItems = QR_ECC_OPTIONS.map(item => ({
  label: item.label,
  value: item.value,
}))

const hasQr = computed(() => qrDataUrl.value.length > 0)
const hasDecodeResult = computed(() => decodeResult.value.length > 0)

function revokePreviewUrl() {
  if (previewObjectUrl.value) {
    URL.revokeObjectURL(previewObjectUrl.value)
    previewObjectUrl.value = ''
  }
}

function stopCameraScanLoop() {
  if (scanRaf) {
    cancelAnimationFrame(scanRaf)
    scanRaf = 0
  }
}

function stopCamera() {
  stopCameraScanLoop()
  scanLocked = false
  stopMediaStream(cameraStream)
  cameraStream = null
  cameraOn.value = false
  cameraHint.value = ''
  const video = videoRef.value
  if (video) {
    video.srcObject = null
  }
}

function tickCameraScan(now: number) {
  if (!cameraOn.value) {
    return
  }
  scanRaf = requestAnimationFrame(tickCameraScan)

  if (scanLocked || now - lastScanAt < 250) {
    return
  }
  lastScanAt = now

  const video = videoRef.value
  if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    return
  }

  const frame = captureVideoFrame(video)
  if (!frame) {
    return
  }
  const text = decodeQrFromImageData(frame)
  if (!text) {
    return
  }

  scanLocked = true
  decodeResult.value = text
  sourceName.value = '摄像头扫码'
  cameraHint.value = '已识别，可继续对准下一码或关闭摄像头'
  toast.add({ color: 'primary', title: '扫码成功' })
  // 稍作冷却，避免同一帧连弹
  window.setTimeout(() => {
    scanLocked = false
  }, 1200)
}

async function startCamera() {
  if (cameraOn.value || cameraStarting.value) {
    return
  }
  cameraStarting.value = true
  try {
    revokePreviewUrl()
    const stream = await openQrCameraStream()
    cameraStream = stream
    cameraOn.value = true
    cameraHint.value = '将二维码置于框内，自动识别'
    await nextTick()
    const video = videoRef.value
    if (!video) {
      throw new Error('预览未就绪')
    }
    video.srcObject = stream
    await video.play()
    lastScanAt = 0
    scanLocked = false
    scanRaf = requestAnimationFrame(tickCameraScan)
  }
  catch (e: any) {
    stopCamera()
    toast.add({
      color: 'error',
      title: '无法打开摄像头',
      description: e?.message || String(e),
    })
  }
  finally {
    cameraStarting.value = false
  }
}

async function toggleCamera() {
  if (cameraOn.value) {
    stopCamera()
    return
  }
  await startCamera()
}

async function onGenerate() {
  if (!text.value.trim()) {
    toast.add({ color: 'warning', title: '请输入要编码的文本' })
    return
  }
  generating.value = true
  try {
    qrDataUrl.value = await generateQrDataUrl({
      text: text.value,
      size: size.value,
      errorCorrectionLevel: ecc.value,
    })
  }
  catch (e: any) {
    qrDataUrl.value = ''
    toast.add({
      color: 'error',
      title: '生成失败',
      description: e?.message || '内容过长或无法编码',
    })
  }
  finally {
    generating.value = false
  }
}

watch([size, ecc], () => {
  if (qrDataUrl.value && text.value.trim()) {
    onGenerate()
  }
})

function onDownload() {
  if (!qrDataUrl.value) {
    toast.add({ color: 'warning', title: '请先生成二维码' })
    return
  }
  downloadDataUrl(qrDataUrl.value, 'qrcode.png')
  toast.add({ color: 'primary', title: '已开始下载' })
}

async function onCopyImage() {
  if (!qrDataUrl.value) {
    toast.add({ color: 'warning', title: '请先生成二维码' })
    return
  }
  try {
    await copyPngDataUrl(qrDataUrl.value)
    toast.add({ color: 'primary', title: '已复制图片' })
  }
  catch (e: any) {
    toast.add({
      color: 'warning',
      title: '复制图片失败',
      description: e?.message || '请改用下载',
    })
  }
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

  stopCamera()
  revokePreviewUrl()
  decodeResult.value = ''
  sourceName.value = file.name
  previewObjectUrl.value = URL.createObjectURL(file)

  decoding.value = true
  try {
    decodeResult.value = await decodeQrFromImageFile(file)
    toast.add({ color: 'primary', title: '解码成功' })
  }
  catch (e: any) {
    decodeResult.value = ''
    toast.add({
      color: 'error',
      title: '解码失败',
      description: e?.message || '未识别到二维码',
    })
  }
  finally {
    decoding.value = false
  }
}

async function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  await takeImageFile(input.files?.item(0))
  input.value = ''
}

async function onDrop(e: DragEvent) {
  e.preventDefault()
  dragOver.value = false
  await takeImageFile(e.dataTransfer?.files?.item(0))
}

async function onCopyDecodeText() {
  if (!decodeResult.value) {
    toast.add({ color: 'warning', title: '暂无解码结果' })
    return
  }
  try {
    await copyQrText(decodeResult.value)
    toast.add({ color: 'primary', title: '已复制文本' })
  }
  catch (e: any) {
    toast.add({
      color: 'error',
      title: '复制失败',
      description: e?.message || String(e),
    })
  }
}

watch(tab, (next) => {
  if (next !== 'decode') {
    stopCamera()
  }
})

onUnmounted(() => {
  stopCamera()
  revokePreviewUrl()
})
</script>

<template>
  <div class="qr">
    <header class="qr__header">
      <h1 class="qr__title">
        二维码
      </h1>
      <p class="qr__hint">
        本地生成与解码 — 文本与图片不出设备；解码支持相册与摄像头。
      </p>
    </header>

    <div
      class="qr__tabs"
      role="tablist"
      aria-label="二维码功能"
    >
      <button
        type="button"
        role="tab"
        class="qr__tab"
        :class="{ 'qr__tab--active': tab === 'generate' }"
        :aria-selected="tab === 'generate'"
        @click="tab = 'generate'"
      >
        生成
      </button>
      <button
        type="button"
        role="tab"
        class="qr__tab"
        :class="{ 'qr__tab--active': tab === 'decode' }"
        :aria-selected="tab === 'decode'"
        @click="tab = 'decode'"
      >
        解码
      </button>
    </div>

    <section
      v-show="tab === 'generate'"
      class="qr__panel"
      role="tabpanel"
    >
      <label class="qr__field">
        <span class="qr__label">文本</span>
        <UTextarea
          v-model="text"
          :rows="4"
          placeholder="输入链接或任意文本…"
        />
      </label>

      <div class="qr__controls">
        <label class="qr__field">
          <span class="qr__label">尺寸</span>
          <USelect
            v-model="size"
            :items="sizeItems"
            placeholder="尺寸"
          />
        </label>
        <label class="qr__field">
          <span class="qr__label">纠错</span>
          <USelect
            v-model="ecc"
            :items="eccItems"
            placeholder="纠错"
          />
        </label>
      </div>

      <UButton
        block
        size="xl"
        :loading="generating"
        @click="onGenerate"
      >
        生成二维码
      </UButton>

      <div
        class="qr__preview"
        :class="{ 'qr__preview--empty': !hasQr }"
      >
        <img
          v-if="hasQr"
          :src="qrDataUrl"
          alt="生成的二维码"
          class="qr__image"
        >
        <p
          v-else
          class="qr__empty"
        >
          生成后在此预览
        </p>
      </div>

      <div class="qr__actions">
        <UButton
          block
          variant="soft"
          :disabled="!hasQr"
          @click="onDownload"
        >
          下载 PNG
        </UButton>
        <UButton
          block
          variant="outline"
          :disabled="!hasQr"
          @click="onCopyImage"
        >
          复制图片
        </UButton>
      </div>
    </section>

    <section
      v-show="tab === 'decode'"
      class="qr__panel qr__panel--decode"
      role="tabpanel"
    >
      <h2 class="qr__section-title">
        选择图片
      </h2>

      <input
        ref="fileInputRef"
        type="file"
        accept="image/*"
        class="qr__native"
        @change="onFileChange"
      >

      <button
        type="button"
        class="qr__drop"
        :class="{
          'qr__drop--active': dragOver,
          'qr__drop--filled': !!previewObjectUrl,
        }"
        @click="openPicker"
        @dragover="onDragOver"
        @dragleave="onDragLeave"
        @drop="onDrop"
      >
        <Icon
          name="i-heroicons-qr-code"
          class="qr__drop-icon"
        />
        <span class="qr__drop-title">
          {{ previewObjectUrl ? '重新选择图片' : '点击选择图片' }}
        </span>
        <span class="qr__drop-hint">
          也可拖放到这里 · 选图后自动解码
        </span>
      </button>

      <div class="qr__camera-block">
        <div class="qr__camera-head">
          <h2 class="qr__section-title">
            摄像头扫码
          </h2>
          <UButton
            size="sm"
            :variant="cameraOn ? 'soft' : 'solid'"
            :color="cameraOn ? 'neutral' : 'primary'"
            :loading="cameraStarting"
            @click="toggleCamera"
          >
            {{ cameraOn ? '关闭摄像头' : '打开摄像头' }}
          </UButton>
        </div>

        <div
          v-if="cameraOn"
          class="qr__camera-stage"
        >
          <video
            ref="videoRef"
            class="qr__video"
            playsinline
            muted
            autoplay
          />
          <div
            class="qr__camera-frame"
            aria-hidden="true"
          />
        </div>
        <p
          v-if="cameraHint"
          class="qr__meta"
        >
          {{ cameraHint }}
        </p>
      </div>

      <p
        v-if="sourceName || decoding"
        class="qr__meta"
      >
        <span v-if="sourceName">{{ sourceName }}</span>
        <span
          v-if="decoding"
          class="qr__loading"
        >解码中…</span>
      </p>

      <img
        v-if="previewObjectUrl && !cameraOn"
        :src="previewObjectUrl"
        alt="待解码预览"
        class="qr__thumb"
      >

      <div
        class="qr__result-wrap"
        :class="{ 'qr__result-wrap--empty': !hasDecodeResult }"
      >
        <UTextarea
          v-if="hasDecodeResult"
          :model-value="decodeResult"
          :rows="5"
          disabled
        />
        <p
          v-else
          class="qr__empty"
        >
          解码结果将显示在这里
        </p>
      </div>

      <UButton
        block
        variant="soft"
        :disabled="!hasDecodeResult"
        @click="onCopyDecodeText"
      >
        复制文本
      </UButton>
    </section>
  </div>
</template>

<style scoped>
/* Hallmark · tool: Workbench panel · theme: Hum × #E5CB90 · design-system: design.md */

.qr {
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

.qr__header,
.qr__panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-xs);
  min-width: 0;
  padding: var(--space-sm);
  border-radius: var(--radius-card);
  border: 1px solid var(--color-rule);
  background: var(--color-paper-2);
  box-shadow: var(--shadow-soft);
}

.qr__panel--decode {
  border-color: color-mix(in oklab, var(--color-accent) 40%, var(--color-rule));
  background:
    radial-gradient(120% 90% at 0% 0%, var(--glow-accent), transparent 55%),
    var(--color-paper);
}

.qr__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 700;
  font-style: normal;
  letter-spacing: -0.025em;
  overflow-wrap: anywhere;
}

.qr__hint,
.qr__meta {
  margin: 0;
  font-size: var(--text-sm);
  line-height: 1.4;
  color: var(--color-muted);
}

.qr__loading {
  margin-left: var(--space-2xs);
  color: var(--color-accent-2);
}

.qr__tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2xs);
  padding: var(--space-3xs);
  border-radius: var(--radius-pill);
  background: var(--color-paper-2);
  border: 1px solid var(--color-rule);
}

.qr__tab {
  min-height: 2.5rem;
  border: 0;
  border-radius: var(--radius-pill);
  background: transparent;
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-ink-2);
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition:
    background-color var(--dur-short) var(--ease-out),
    color var(--dur-short) var(--ease-out),
    box-shadow var(--dur-short) var(--ease-out);
}

.qr__tab--active {
  background: var(--color-accent);
  color: var(--color-accent-ink);
  box-shadow:
    0 3px 0 0 var(--btn-edge),
    0 4px 10px -3px var(--btn-cast);
}

.qr__section-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: 700;
  font-style: normal;
}

.qr__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-3xs);
  min-width: 0;
}

.qr__label {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-ink-2);
}

.qr__controls {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2xs);
}

.qr__preview,
.qr__result-wrap {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  min-height: 10rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-sm);
  border: 1px dashed var(--color-rule);
  border-radius: var(--radius-bubble);
  background: var(--color-paper);
  overflow: auto;
}

.qr__preview--empty,
.qr__result-wrap--empty {
  overflow: hidden;
}

.qr__image {
  display: block;
  width: min(100%, 20rem);
  height: auto;
  border-radius: var(--radius-input);
}

.qr__empty {
  margin: 0;
  width: 100%;
  max-width: 22ch;
  font-size: var(--text-sm);
  line-height: 1.45;
  color: var(--color-muted);
  text-align: center;
}

.qr__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2xs);
}

.qr__native {
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

.qr__panel--decode {
  position: relative;
}

.qr__drop {
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

.qr__drop:hover {
  border-color: var(--color-accent-deep);
  background: var(--color-accent-soft);
  box-shadow: var(--shadow-soft);
}

.qr__drop:active {
  transform: translateY(1px);
}

.qr__drop--active {
  border-color: var(--color-accent-2);
  background: var(--color-accent-2-soft);
}

.qr__drop--filled {
  border-style: solid;
}

.qr__drop-icon {
  width: 2rem;
  height: 2rem;
  color: var(--color-accent-deep);
}

.qr__drop-title {
  font-size: var(--text-md);
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
}

.qr__drop-hint {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-muted);
  text-align: center;
}

.qr__thumb {
  display: block;
  width: 100%;
  max-height: 12rem;
  object-fit: contain;
  border-radius: var(--radius-bubble);
  background: var(--color-paper);
  border: 1px solid var(--color-rule);
}

.qr__camera-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xs);
  min-width: 0;
}

.qr__camera-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2xs);
}

.qr__camera-stage {
  position: relative;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  border-radius: var(--radius-card);
  background: var(--color-stage);
  border: 1px solid var(--color-rule);
  aspect-ratio: 3 / 4;
  max-height: min(60dvh, 28rem);
}

.qr__video {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.qr__camera-frame {
  pointer-events: none;
  position: absolute;
  inset: 18% 16%;
  border: 2px solid color-mix(in oklab, var(--color-accent) 80%, white);
  border-radius: var(--radius-input);
  box-shadow: 0 0 0 999px color-mix(in oklab, var(--color-stage) 72%, transparent);
}

.qr__result-wrap :deep(textarea) {
  width: 100%;
}

@media (prefers-reduced-motion: reduce) {
  .qr__tab,
  .qr__drop {
    transition: none;
  }

  .qr__drop:active {
    transform: none;
  }
}
</style>
