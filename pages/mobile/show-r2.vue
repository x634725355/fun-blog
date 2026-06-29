<script lang="ts" setup>
const preUrl = 'https://store.csc3.fun/'
const listImg = ref<any[]>([])
const listFile = ref<any[]>([])
const catalogue = ref<any[]>([])
const currentImgPath = ref<any>({})
const load = ref(false)
const prefixPath = ref('')
const isShow = ref(false)

async function setCatalogue() {
  const res = await getR2Catalogue()
  if (!res.data) { return }
  const demo: any[] = res.data.map((p: any) => ({ label: p.path, value: p.path }))
  demo.shift()
  catalogue.value = demo
}

async function listGet() {
  listImg.value = []
  listFile.value = []
  load.value = true
  const response: any = await listR2({ prefix: prefixPath.value }).catch(() => { load.value = false })
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

async function deleteFile(key: string) {
  await deleteR2(key)

  listGet()
}

watch(prefixPath, () => {
  listGet()
})

onMounted(() => {
  isShow.value = location.search.includes(uploadKey)
  listGet()
  setCatalogue()
})
</script>

<template>
  <LayoutMobile>
    <div class="show-r2-page">
      <UModal>
        <div class="show-r2-toolbar">
          <USelect v-model="prefixPath" :loading="load" class="w-full z-10" :items="catalogue" />
        </div>

        <div v-if="isShow" class="show-r2-body">
          <div class="show-r2-images">
            <div v-for="item in listImg" :key="item.key" class="show-r2-image-card">
              <img
                class="show-r2-image"
                :src="preUrl + item.key"
                :alt="item.key"
                @click="() => currentImgPath = item"
              >
              <div class="show-r2-image-actions">
                <UButton size="sm" icon="i-lucide-beer" color="error" @click="() => deleteFile(item.key)" />
                <UButton target="_blank" :to="preUrl + item.key" icon="i-lucide-file-down" size="sm" />
              </div>
            </div>
          </div>

          <ul class="show-r2-files">
            <li v-for="item in listFile" :key="item.key" class="show-r2-file-row">
              <div class="show-r2-file-name" :title="item.key">
                {{ item.key }}
              </div>
              <div class="show-r2-file-actions">
                <UButton size="sm" icon="i-lucide-beer" color="error" @click="() => deleteFile(item.key)" />
                <UButton target="_blank" :to="preUrl + item.key" icon="i-lucide-file-down" size="sm" />
              </div>
            </li>
          </ul>
        </div>

        <template #content>
          <div class="w-full h-full p-4 flex justify-center items-center">
            <img class="w-auto h-auto max-w-full max-h-full" :src="preUrl + currentImgPath.key" :alt="currentImgPath.key">
          </div>
        </template>
      </UModal>
    </div>
  </LayoutMobile>
</template>

<style scoped>
.show-r2-page {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  padding: 0.5rem;
}

.show-r2-toolbar {
  margin: 0.5rem 0;
  width: 100%;
  min-width: 0;
}

.show-r2-body {
  width: 100%;
  min-width: 0;
  overflow: hidden;
}

.show-r2-images {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: space-around;
  margin-bottom: 0.75rem;
}

.show-r2-image-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  max-width: 100%;
}

.show-r2-image {
  width: auto;
  max-width: 100%;
  max-height: 7rem;
  border-radius: 0.125rem;
}

.show-r2-image-actions {
  display: flex;
  flex-shrink: 0;
  gap: 0.25rem;
}

.show-r2-files {
  margin: 0;
  padding: 0;
  list-style: none;
  width: 100%;
  min-width: 0;
}

.show-r2-file-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  min-width: 0;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgb(226 232 240);
}

.show-r2-file-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.875rem;
  line-height: 1.25rem;
  color: rgb(15 23 42);
}

.show-r2-file-actions {
  display: flex;
  flex-shrink: 0;
  gap: 0.25rem;
}

@media (prefers-color-scheme: dark) {
  .show-r2-file-row {
    border-bottom-color: rgb(71 85 105);
  }

  .show-r2-file-name {
    color: rgb(241 245 249);
  }
}
</style>
