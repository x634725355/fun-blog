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

function safeBasename(name: string): string {
  const base = name.replace(/^.*[/\\]/, '').replace(/\0/g, '').slice(0, 200)
  return base || 'file'
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

async function submitFile() {
  if (!file.value) {
    return
  }
  fileLoad.value = true
  const safeName = safeBasename(file.value.name)
  const wrapped = new File([file.value], safeName, { type: file.value.type })
  const dir = `${RECORDS_R2_PREFIX}${crypto.randomUUID()}`
  const r2_key = `${dir}/${safeName}`
  try {
    await uploadR2(wrapped, dir)
    const row = await $fetch<MobileRecordItem>('/api/records', {
      method: 'POST',
      body: {
        kind: 'file',
        r2_key,
        mime: wrapped.type || null,
        original_name: safeName,
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
    <div class="p-2 flex flex-col gap-4 overflow-auto h-full">
      <div class="flex flex-col gap-2 border-b pb-4">
        <h1 class="text-lg font-semibold">
          记录
        </h1>
        <UTextarea v-model="textDraft" autoresize :rows="3" placeholder="写一段文字…" />
        <UButton :loading="textSubmitLoad" @click="submitText">
          保存文字
        </UButton>
      </div>

      <div class="flex flex-col gap-2 border-b pb-4">
        <input
          ref="fileInputRef"
          type="file"
          class="block w-full text-sm text-neutral-800 file:mr-2 file:rounded file:border-0 file:bg-neutral-200 file:px-2 file:py-1"
          @change="fileChange"
        >
        <UButton :loading="fileLoad" :disabled="!file" @click="submitFile">
          上传文件
        </UButton>
        <p class="text-xs text-neutral-500">
          文件将保存到 R2 前缀 <code class="text-xs">{{ RECORDS_R2_PREFIX }}</code>，外链域名 {{ RECORDS_STORE_PUBLIC_BASE }}
        </p>
      </div>

      <div class="flex flex-col gap-3 flex-1">
        <div class="flex justify-between items-center">
          <span class="font-medium">时间线</span>
          <UButton size="sm" variant="ghost" :loading="listLoad" @click="loadFirst">
            刷新
          </UButton>
        </div>

        <div v-if="listLoad && items.length === 0" class="text-sm text-neutral-500">
          加载中…
        </div>

        <div v-for="row in items" :key="row.id" class="border rounded p-2 flex flex-col gap-2 bg-white/5">
          <div class="text-xs text-neutral-500 flex justify-between gap-2">
            <span>{{ new Date(row.created_at).toLocaleString() }}</span>
            <span>{{ row.kind === 'text' ? '文字' : '文件' }}</span>
          </div>

          <template v-if="row.kind === 'text'">
            <p class="whitespace-pre-wrap text-sm">
              {{ row.body }}
            </p>
            <div>
              <UButton size="sm" color="error" variant="soft" @click="removeRow(row)">
                删除
              </UButton>
            </div>
          </template>

          <template v-else-if="row.kind === 'file' && row.r2_key">
            <div v-if="isImageKey(row.r2_key)" class="flex flex-col gap-2">
              <img class="max-h-48 w-auto rounded" :src="publicUrl(row.r2_key)" :alt="row.original_name || row.r2_key">
              <div class="flex gap-2 flex-wrap">
                <UButton size="sm" :to="publicUrl(row.r2_key)" target="_blank" icon="i-lucide-external-link">
                  打开原图
                </UButton>
                <UButton size="sm" color="error" variant="soft" @click="removeRow(row)">
                  删除
                </UButton>
              </div>
            </div>
            <div v-else class="flex flex-col gap-2">
              <div class="text-sm break-all">
                {{ row.original_name || row.r2_key }}
              </div>
              <div class="flex gap-2 flex-wrap">
                <UButton size="sm" :to="publicUrl(row.r2_key)" target="_blank" icon="i-lucide-file-down">
                  下载
                </UButton>
                <UButton size="sm" color="error" variant="soft" @click="removeRow(row)">
                  删除
                </UButton>
              </div>
            </div>
          </template>
        </div>

        <UButton
          v-if="nextCursor"
          class="self-center"
          variant="outline"
          :loading="listLoad"
          @click="loadMore"
        >
          加载更多
        </UButton>
      </div>
    </div>
  </LayoutMobile>
</template>

<style scoped></style>
