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
    <UModal>
      <div class="my-2">
        <USelect v-model="prefixPath" :loading="load" class="w-full mr-2 z-10" :items="catalogue" />
      </div>

      <div v-if="isShow" class="flex flex-wrap gap-x-2 gap-y-2 justify-around">
        <div v-for="item in listImg">
          <div class="flex flex-col">
            <img
              class="w-auto max-h-28 rounded-sm" :src="preUrl + item.key" :alt="item.key"
              @click="() => currentImgPath = item"
            >
            <div class="flex justify-around">
              <UButton size="sm" icon="i-lucide-beer" color="error" @click="() => deleteFile(item.key)" />
              <UButton target="_blank" :to="preUrl + item.key" icon="i-lucide-file-down" size="sm" />
            </div>
          </div>
        </div>
      </div>
      <div>
        <div v-for="item in listFile" class="flex gap-x-2 gap-y-2">
          <div>{{ item.key }}</div>
          <UButton size="sm" icon="i-lucide-beer" color="error" @click="() => deleteFile(item.key)" />
          <UButton target="_blank" :to="preUrl + item.key" icon="i-lucide-file-down" size="sm" />
        </div>
      </div>

      <template #content>
        <div class="w-full h-full p-4 flex justify-center items-center">
          <img class="w-auto h-auto" :src="preUrl + currentImgPath.key" :alt="currentImgPath.key">
        </div>
      </template>
    </UModal>
  </LayoutMobile>
</template>

<style scoped></style>
