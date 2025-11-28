<script lang="ts" setup>
const preUrl = 'https://store.csc3.fun/'
const file = ref<File | null>()
const uploadRef = useTemplateRef('uploadRef')
const listImg = ref<any[]>([])
const listFile = ref<any[]>([])
const load = ref(false)
const isShow = ref(false)
const filePath = ref('')
const catalogue = ref<any>([])
const prefixPath = ref('')

const toast = useToast()

const fileImgSrc = computed(() => file.value ? URL.createObjectURL(file.value) : '')

function fileChange(e: any) {
  if (e.target.files) {
    file.value = e.target.files[0]
  }
}

async function deleteFile(key: string) {
  const response = await deleteR2(key)
  console.log('%c Line:41 🍑 response', 'color:#e41a6a', response)
  listGet()
}

async function listGet() {
  listImg.value = []
  listFile.value = []
  load.value = true
  const response: any = await listR2().catch(() => { load.value = false })
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
  load.value = true
  if (!file.value) { return load.value = false }
  await uploadR2(file.value, `${prefixPath.value}${filePath.value}`).catch(() => { load.value = false })
  load.value = false
  toast.add({ color: 'primary', title: '上传成功' })
  file.value = null
  filePath.value = ''
  uploadRef.value!.inputRef!.value! = ''

  listGet()
}

async function setCatalogue() {
  const res = await getR2Catalogue()
  if (!res.data) { return }
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
    <div class="p-2 h-full flex flex-col overflow-auto">
      <div class="mb-10">
        <USelect v-model="prefixPath" class="w-1/3 mr-2 z-10" :items="catalogue" />
        <UInput v-model="filePath" placeholder="文件目录" />
      </div>
      <div>
        <UInput ref="uploadRef" class="mb-1" type="file" size="xl" icon="i-heroicons-folder" @change="fileChange" />
        <img class="max-h-44 w-auto mb-1 rounded" :src="fileImgSrc" alt="">
        <UButton :loading="load" @click="clickHandle">
          上传
        </UButton>
      </div>

      <div v-if="isShow" class="flex-1 my-2">
        <UButton @click="syncNow">
          触发更新目录
        </UButton>
        <div class="flex flex-wrap gap-x-2 gap-y-2 justify-around">
          <div v-for="item in listImg">
            <div class="flex flex-col">
              <img class="w-auto max-h-28 rounded-sm" :src="preUrl + item.key" :alt="item.key">
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
      </div>
    </div>
  </LayoutMobile>
</template>

<style scoped></style>
