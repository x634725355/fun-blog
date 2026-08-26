<script lang="ts" setup>
import type { MobileRecordItem, MobileRecordsListResponse } from '~/types/mobile-records'
import { RECORDS_R2_PREFIX, RECORDS_STORE_PUBLIC_BASE } from '~/constants/mobile-records'

definePageMeta({ ssr: false })

const toast = useToast()

const textDraft = ref('')
const items = ref<MobileRecordItem[]>([])
const nextCursor = ref<string | null>(null)
const listLoad = ref(false)
const textSubmitLoad = ref(false)
const fileLoad = ref(false)

const fileInputRef = useTemplateRef<HTMLInputElement>('fileInputRef')
const file = ref<File | null>(null)

function isImageKey(key: string) {
  return /\.(?:webp|jpg|jpeg|png|gif)$/i.test(key)
}

async function loadFirst() {
  listLoad.value = true
  try {
    const res = await $fetch<MobileRecordsListResponse>('/api/records')
    items.value = res.items as MobileRecordItem[]
    nextCursor.value = res.nextCursor
  }
  catch (e: any) {
    toast.add({
      color: 'error',
      title: '加载失败',
      description: e?.data?.message || e?.message || String(e),
    })
  }
  finally {
    listLoad.value = false
  }
}

async function loadMore() {
  if (!nextCursor.value || listLoad.value) {
    return
  }
  listLoad.value = true
  try {
    const res = await $fetch<MobileRecordsListResponse>('/api/records', {
      query: { cursor: nextCursor.value },
    })
    items.value.push(...(res.items as MobileRecordItem[]))
    nextCursor.value = res.nextCursor
  }
  catch (e: any) {
    toast.add({
      color: 'error',
      title: '加载更多失败',
      description: e?.data?.message || e?.message || String(e),
    })
  }
  finally {
    listLoad.value = false
  }
}

async function submitText() {
  const body = textDraft.value.trim()
  if (!body) {
    return
  }
  textSubmitLoad.value = true
  try {
    const row = await $fetch<MobileRecordItem>('/api/records', {
      method: 'POST',
      body: { kind: 'text', body },
    })
    items.value.unshift(row)
    textDraft.value = ''
    toast.add({ color: 'primary', title: '已保存文字' })
  }
  catch (e: any) {
    toast.add({
      color: 'error',
      title: '保存失败',
      description: e?.data?.message || e?.message || String(e),
    })
  }
  finally {
    textSubmitLoad.value = false
  }
}

function fileChange(e: Event) {
  const input = e.target as HTMLInputElement
  file.value = input.files?.item(0) ?? null
}

function openFilePicker() {
  fileInputRef.value?.click()
}

function clearFile() {
  file.value = null
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

async function submitFile() {
  if (!file.value) {
    return
  }
  fileLoad.value = true
  const { uploadName, originalName } = urlSafeUploadFilename(file.value.name)
  const wrapped = new File([file.value], uploadName, { type: file.value.type })
  const dir = `${RECORDS_R2_PREFIX}${crypto.randomUUID()}`
  const r2_key = `${dir}/${uploadName}`
  try {
    await uploadR2(wrapped, dir)
    const row = await $fetch<MobileRecordItem>('/api/records', {
      method: 'POST',
      body: {
        kind: 'file',
        r2_key,
        mime: wrapped.type || null,
        original_name: originalName,
      },
    })
    items.value.unshift(row)
    file.value = null
    if (fileInputRef.value) {
      fileInputRef.value.value = ''
    }
    toast.add({ color: 'primary', title: '文件已上传并记录' })
  }
  catch (e: any) {
    toast.add({
      color: 'error',
      title: '上传或登记失败',
      description: e?.data?.message || e?.message || String(e),
    })
  }
  finally {
    fileLoad.value = false
  }
}

async function removeRow(row: MobileRecordItem) {
  try {
    if (row.kind === 'file' && row.r2_key?.startsWith(RECORDS_R2_PREFIX)) {
      try {
        await deleteR2(row.r2_key)
      }
      catch (e: any) {
        const status = e?.response?.status ?? e?.statusCode ?? e?.status
        if (status !== 404) {
          console.warn('[record-timeline] R2 删除失败，继续删记录', row.r2_key, e)
        }
      }
    }
    await $fetch(`/api/records/${row.id}`, { method: 'DELETE' })
    items.value = items.value.filter(r => r.id !== row.id)
    toast.add({ color: 'primary', title: '已删除' })
  }
  catch (e: any) {
    toast.add({
      color: 'error',
      title: '删除失败',
      description: e?.data?.message || e?.message || String(e),
    })
  }
}

function publicUrl(key: string) {
  return `${RECORDS_STORE_PUBLIC_BASE}${key}`
}

onMounted(() => {
  loadFirst()
})
</script>

<template>
  <LayoutMobile>
    <div class="record">
      <header class="record__head">
        <h1 class="record__title">
          记录
        </h1>
        <p class="record__lede">
          一段文字或一个文件，按时间线往上叠。
        </p>
      </header>

      <section class="record__panel">
        <h2 class="record__panel-title">
          写文字
        </h2>
        <UTextarea v-model="textDraft" autoresize :rows="3" placeholder="写一段文字…" />
        <UButton block :loading="textSubmitLoad" @click="submitText">
          保存文字
        </UButton>
      </section>

      <section class="record__panel">
        <h2 class="record__panel-title">
          传文件
        </h2>
        <input
          ref="fileInputRef"
          type="file"
          class="record__native"
          @change="fileChange"
        >
        <button type="button" class="record__drop" @click="openFilePicker">
          <Icon name="i-heroicons-folder" class="record__drop-icon" />
          <span>{{ file ? '重新选择' : '点击选择文件' }}</span>
        </button>
        <div v-if="file" class="record__chip">
          <span class="record__chip-name" :title="file.name">
            {{ file.name }}
          </span>
          <UButton
            size="xs"
            color="neutral"
            variant="ghost"
            icon="i-heroicons-x-mark-20-solid"
            square
            aria-label="清除"
            @click="clearFile"
          />
        </div>
        <UButton block :loading="fileLoad" :disabled="!file" @click="submitFile">
          上传并记录
        </UButton>
      </section>

      <section class="record__panel record__panel--list">
        <div class="record__list-head">
          <h2 class="record__panel-title">
            时间线
          </h2>
          <UButton size="sm" variant="ghost" :loading="listLoad" @click="loadFirst">
            刷新
          </UButton>
        </div>

        <div v-if="listLoad && items.length === 0" class="record__empty">
          加载中…
        </div>
        <p v-else-if="!listLoad && items.length === 0" class="record__empty">
          暂无记录，保存文字或上传文件后会出现在这里。
        </p>

        <article v-for="row in items" :key="row.id" class="record__card">
          <div class="record__meta">
            <span>{{ new Date(row.created_at).toLocaleString() }}</span>
            <span>{{ row.kind === 'text' ? '文字' : '文件' }}</span>
          </div>

          <template v-if="row.kind === 'text'">
            <p class="record__body">
              {{ row.body }}
            </p>
            <UButton size="sm" color="error" variant="soft" @click="removeRow(row)">
              删除
            </UButton>
          </template>

          <template v-else-if="row.kind === 'file' && row.r2_key">
            <div v-if="isImageKey(row.r2_key)" class="record__file">
              <img class="record__img" :src="publicUrl(row.r2_key)" :alt="row.original_name || row.r2_key">
              <div class="record__actions">
                <UButton size="sm" :to="publicUrl(row.r2_key)" target="_blank" icon="i-lucide-external-link">
                  打开
                </UButton>
                <UButton size="sm" color="error" variant="soft" @click="removeRow(row)">
                  删除
                </UButton>
              </div>
            </div>
            <div v-else class="record__file">
              <div class="record__name">
                {{ row.original_name || row.r2_key }}
              </div>
              <div class="record__actions">
                <UButton size="sm" :to="publicUrl(row.r2_key)" target="_blank" icon="i-lucide-download">
                  下载
                </UButton>
                <UButton size="sm" color="error" variant="soft" @click="removeRow(row)">
                  删除
                </UButton>
              </div>
            </div>
          </template>
        </article>

        <UButton
          v-if="nextCursor"
          block
          variant="outline"
          :loading="listLoad"
          @click="loadMore"
        >
          加载更多
        </UButton>
      </section>
    </div>
  </LayoutMobile>
</template>

<style scoped>
/* Hallmark · genre: modern-minimal · macrostructure: Workbench · design-system: design.md · designed-as-app */

.record {
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

.record__head {
  min-width: 0;
}

.record__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-display);
  font-weight: 700;
  font-style: normal;
  letter-spacing: -0.02em;
  color: var(--color-ink);
  overflow-wrap: anywhere;
}

.record__lede {
  margin: var(--space-3xs) 0 0;
  font-size: var(--text-sm);
  color: var(--color-muted);
  max-width: 36ch;
}

.record__panel {
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

.record__panel--list {
  flex: 1;
}

.record__panel-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 700;
  font-style: normal;
  letter-spacing: -0.02em;
}

.record__native {
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

.record__drop {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3xs);
  width: 100%;
  min-height: 6.5rem;
  margin: 0;
  padding: var(--space-sm);
  border: 1.5px dashed var(--color-rule);
  border-radius: var(--radius-card);
  background: var(--color-paper);
  color: var(--color-ink);
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  touch-action: manipulation;
}

.record__drop:hover {
  border-color: color-mix(in oklab, var(--color-accent) 55%, var(--color-rule));
  background: var(--color-accent-soft);
}

.record__drop:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.record__drop-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: var(--color-accent);
}

.record__chip {
  display: flex;
  align-items: center;
  gap: var(--space-2xs);
  min-width: 0;
  padding: var(--space-2xs) var(--space-xs);
  border-radius: var(--radius-bubble);
  border: 1px solid var(--color-rule);
  background: var(--color-paper);
}

.record__chip-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.record__list-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-2xs);
}

.record__empty {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-muted);
}

.record__card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xs);
  padding: var(--space-xs);
  border-radius: var(--radius-bubble);
  border: 1px solid var(--color-rule);
  background: var(--color-paper);
  min-width: 0;
}

.record__meta {
  display: flex;
  justify-content: space-between;
  gap: var(--space-2xs);
  font-size: var(--text-xs);
  color: var(--color-muted);
}

.record__body {
  margin: 0;
  white-space: pre-wrap;
  font-size: var(--text-sm);
}

.record__file {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xs);
  min-width: 0;
}

.record__img {
  width: 100%;
  max-height: 12rem;
  object-fit: contain;
  border-radius: var(--radius-input);
  background: var(--color-stage);
}

.record__name {
  font-size: var(--text-sm);
  overflow-wrap: anywhere;
  word-break: break-all;
}

.record__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2xs);
}
</style>
