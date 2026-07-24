<script lang="ts" setup>
const preUrl = 'https://store.csc3.fun/'
const file = ref<File | null>(null)
const fileInputRef = useTemplateRef<HTMLInputElement>('fileInputRef')
const listImg = ref<any[]>([])
const listFile = ref<any[]>([])
const load = ref(false)
const isShow = ref(false)
const filePath = ref('')
const catalogue = ref<any>([])
const prefixPath = ref('')
const dragOver = ref(false)

const toast = useToast()

const fileImgSrc = computed(() => file.value ? URL.createObjectURL(file.value) : '')
const isImageFile = computed(() => {
  if (!file.value) {
    return false
  }
  return file.value.type.startsWith('image/') || /\.(?:webp|jpg|jpeg|png|gif)$/i.test(file.value.name)
})

function assignFile(next: File | null) {
  file.value = next
}

function fileChange(e: Event) {
  const input = e.target as HTMLInputElement
  assignFile(input.files?.item(0) ?? null)
}

function openPicker() {
  fileInputRef.value?.click()
}

function clearFile() {
  assignFile(null)
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
  dragOver.value = true
}

function onDragLeave() {
  dragOver.value = false
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  dragOver.value = false
  const dropped = e.dataTransfer?.files?.item(0) ?? null
  if (dropped) {
    assignFile(dropped)
  }
}

async function deleteFile(key: string) {
  await deleteR2(key)
  listGet()
}

async function listGet() {
  listImg.value = []
  listFile.value = []
  load.value = true
  const response: any = await listR2().catch(() => {
    load.value = false
  })
  load.value = false
  const list: any[] = response

  list.forEach((item) => {
    if (/\.(?:webp|jpg|jpeg|png|gif)$/i.test(item.key)) {
      listImg.value.push(item)
    }
    else {
      listFile.value.push(item)
    }
  })
}

async function clickHandle(): Promise<any> {
  if (!file.value) {
    toast.add({ color: 'warning', title: '请先选择文件' })
    return
  }
  load.value = true
  const { uploadName } = urlSafeUploadFilename(file.value.name)
  const wrapped = new File([file.value], uploadName, { type: file.value.type })
  try {
    await uploadR2(wrapped, `${prefixPath.value}${filePath.value}`)
    toast.add({ color: 'primary', title: '上传成功' })
    clearFile()
    filePath.value = ''
    listGet()
  }
  catch {
    toast.add({ color: 'error', title: '上传失败' })
  }
  finally {
    load.value = false
  }
}

async function setCatalogue() {
  const res = await getR2Catalogue()
  if (!res.data) {
    return
  }
  const demo: any[] = res.data.map((p: any) => ({ label: p.path, value: p.path }))
  demo.shift()
  catalogue.value = demo
}

function syncNow() {
  $fetch(`${useBaseURL()}/api/sync-now`, {
    headers: {
      'X-Custom-Auth-Key': '333',
    },
  })
}

onMounted(() => {
  listGet()
  isShow.value = location.search.includes(uploadKey)
  setCatalogue()
})
</script>

<template>
  <LayoutMobile>
    <div class="upload">
      <header class="upload__head">
        <h1 class="upload__title">
          上传
        </h1>
        <p class="upload__lede">
          选目录、点区域选文件，确认后上传到 R2。
        </p>
      </header>

      <section class="upload__panel" aria-labelledby="upload-path-label">
        <h2 id="upload-path-label" class="upload__panel-title">
          目标路径
        </h2>
        <label class="upload__field">
          <span class="upload__label">目录前缀</span>
          <USelect
            v-model="prefixPath"
            class="upload__control"
            :items="catalogue"
            placeholder="选择目录…"
          />
        </label>
        <label class="upload__field">
          <span class="upload__label">子目录</span>
          <UInput
            v-model="filePath"
            class="upload__control"
            placeholder="/xxx（可选）"
          />
        </label>
      </section>

      <section class="upload__panel" aria-labelledby="upload-file-label">
        <h2 id="upload-file-label" class="upload__panel-title">
          选择文件
        </h2>

        <input
          ref="fileInputRef"
          type="file"
          class="upload__native"
          @change="fileChange"
        >

        <button
          type="button"
          class="upload__drop"
          :class="{ 'upload__drop--active': dragOver, 'upload__drop--filled': !!file }"
          @click="openPicker"
          @dragover="onDragOver"
          @dragleave="onDragLeave"
          @drop="onDrop"
        >
          <Icon name="i-heroicons-folder" class="upload__drop-icon" />
          <span class="upload__drop-title">
            {{ file ? '重新选择' : '点击选择文件' }}
          </span>
          <span class="upload__drop-hint">
            也可拖放到这里
          </span>
        </button>

        <div v-if="file" class="upload__chip">
          <span class="upload__chip-name" :title="file.name">
            {{ file.name }}
          </span>
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-heroicons-x-mark-20-solid"
            square
            aria-label="清除文件"
            @click="clearFile"
          />
        </div>

        <img
          v-if="fileImgSrc && isImageFile"
          class="upload__preview"
          :src="fileImgSrc"
          alt="待上传预览"
        >

        <UButton
          block
          size="xl"
          :loading="load"
          :disabled="!file"
          @click="clickHandle"
        >
          上传到 R2
        </UButton>
      </section>

      <section v-if="isShow" class="upload__panel" aria-labelledby="upload-admin-label">
        <div class="upload__panel-head">
          <h2 id="upload-admin-label" class="upload__panel-title">
            管理
          </h2>
          <UButton size="sm" variant="outline" @click="syncNow">
            同步目录
          </UButton>
        </div>

        <div class="upload__subhead">
          <span>图片</span>
          <span>{{ listImg.length }}</span>
        </div>
        <p v-if="listImg.length === 0" class="upload__empty">
          暂无图片
        </p>
        <div v-else class="upload__gallery">
          <article v-for="item in listImg" :key="item.key" class="upload__tile">
            <img class="upload__thumb" :src="preUrl + item.key" :alt="item.key" loading="lazy">
            <div class="upload__actions">
              <UButton size="sm" color="error" variant="soft" icon="i-lucide-trash-2" aria-label="删除" @click="() => deleteFile(item.key)" />
              <UButton size="sm" variant="soft" target="_blank" :to="preUrl + item.key" icon="i-lucide-download" aria-label="下载" />
            </div>
          </article>
        </div>

        <div class="upload__subhead">
          <span>文件</span>
          <span>{{ listFile.length }}</span>
        </div>
        <p v-if="listFile.length === 0" class="upload__empty">
          暂无其他文件
        </p>
        <ul v-else class="upload__ledger">
          <li v-for="item in listFile" :key="item.key" class="upload__row">
            <div class="upload__row-name" :title="item.key">
              {{ item.key }}
            </div>
            <div class="upload__actions">
              <UButton size="sm" color="error" variant="soft" icon="i-lucide-trash-2" aria-label="删除" @click="() => deleteFile(item.key)" />
              <UButton size="sm" variant="soft" target="_blank" :to="preUrl + item.key" icon="i-lucide-download" aria-label="下载" />
            </div>
          </li>
        </ul>
      </section>
    </div>
  </LayoutMobile>
</template>

<style scoped>
/* Hallmark · pre-emit critique: P4 H5 E5 S4 R4 V3 */
/* Hallmark · genre: modern-minimal · macrostructure: Workbench · design-system: design.md · designed-as-app */

.upload {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  width: 100%;
  max-width: 100%;
  min-width: 0;
  min-height: 100%;
  padding: var(--space-sm);
  padding-bottom: max(var(--space-md), env(safe-area-inset-bottom));
}

.upload__head {
  min-width: 0;
}

.upload__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-display);
  font-weight: 700;
  font-style: normal;
  letter-spacing: -0.02em;
  color: var(--color-ink);
  overflow-wrap: anywhere;
}

.upload__lede {
  margin: var(--space-3xs) 0 0;
  font-size: var(--text-sm);
  color: var(--color-muted);
  max-width: 36ch;
}

.upload__panel {
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

.upload__panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2xs);
}

.upload__panel-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 700;
  font-style: normal;
  letter-spacing: -0.02em;
  color: var(--color-ink);
}

.upload__field {
  display: flex;
  flex-direction: column;
  gap: var(--space-3xs);
  min-width: 0;
}

.upload__label {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-ink-2);
}

.upload__control {
  width: 100%;
  min-width: 0;
}

.upload__native {
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

.upload__drop {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3xs);
  width: 100%;
  min-height: 8.5rem;
  margin: 0;
  padding: var(--space-md) var(--space-sm);
  border: 1.5px dashed var(--color-rule);
  border-radius: var(--radius-card);
  background: var(--color-paper);
  color: var(--color-ink);
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition:
    background-color var(--dur-short) var(--ease-out),
    border-color var(--dur-short) var(--ease-out),
    transform 100ms var(--ease-out);
}

.upload__drop:hover,
.upload__drop--active {
  border-color: color-mix(in oklab, var(--color-accent) 55%, var(--color-rule));
  background: var(--color-accent-soft);
}

.upload__drop:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.upload__drop:active {
  transform: scale(0.99);
}

.upload__drop--filled {
  border-style: solid;
}

.upload__drop-icon {
  width: 1.5rem;
  height: 1.5rem;
  color: var(--color-accent);
}

.upload__drop-title {
  font-family: var(--font-display);
  font-size: var(--text-md);
  font-weight: 600;
  font-style: normal;
}

.upload__drop-hint {
  font-size: var(--text-xs);
  color: var(--color-muted);
}

.upload__chip {
  display: flex;
  align-items: center;
  gap: var(--space-2xs);
  min-width: 0;
  padding: var(--space-2xs) var(--space-xs);
  border-radius: var(--radius-bubble);
  background: var(--color-paper);
  border: 1px solid var(--color-rule);
}

.upload__chip-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-ink);
}

.upload__preview {
  display: block;
  width: 100%;
  max-height: 12rem;
  object-fit: contain;
  border-radius: var(--radius-input);
  background: var(--color-stage);
}

.upload__subhead {
  display: flex;
  justify-content: space-between;
  margin-top: var(--space-2xs);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-muted);
  font-variant-numeric: tabular-nums;
}

.upload__empty {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-muted);
}

.upload__gallery {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2xs);
}

.upload__tile {
  display: flex;
  flex-direction: column;
  gap: var(--space-3xs);
  min-width: 0;
}

.upload__thumb {
  width: 100%;
  height: 7rem;
  object-fit: cover;
  border-radius: var(--radius-input);
  border: 1px solid var(--color-rule);
  background: var(--color-paper);
}

.upload__actions {
  display: flex;
  flex-shrink: 0;
  gap: var(--space-3xs);
}

.upload__ledger {
  margin: 0;
  padding: 0;
  list-style: none;
}

.upload__row {
  display: flex;
  align-items: center;
  gap: var(--space-2xs);
  min-width: 0;
  padding: var(--space-2xs) 0;
  border-bottom: 1px solid var(--color-rule);
}

.upload__row:last-child {
  border-bottom: none;
}

.upload__row-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-ink);
}

@media (min-width: 680px) {
  .upload__gallery {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .upload__thumb {
    height: 8rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .upload__drop {
    transition: none;
  }

  .upload__drop:active {
    transform: none;
  }
}
</style>
