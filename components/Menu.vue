<script setup lang="ts">
interface Router {
  path: string
  name: string
}

const router = ref<Router[]>([
  { path: '/mobile', name: '首页' },
  // { path: '/mobile/RTC', name: 'RTC通话' },
  { path: '/mobile/upload', name: '上传文件' },
  { path: '/mobile/show-r2', name: '文件展示' },
  { path: '/mobile/record-timeline', name: '记录' },
])
</script>

<template>
  <div class="grid grid-cols-2 gap-4 p-2 sm:grid-cols-3">
    <NuxtLink v-for="route in router" class="p-2 border rounded text-center" :to="route.path">
      {{ route.name }}
    </NuxtLink>
  </div>
</template>

<style scoped></style>
