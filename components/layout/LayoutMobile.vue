<script lang="ts" setup>
import Footer from './Footer.vue'

const route = useRoute()
const isOpen = ref()

const showMenu = route.name !== 'mobile'
</script>

<template>
  <div class="mobile flex justify-center items-center overflow-x-hidden">
    <div class="main flex flex-col justify-between">
      <div class="flex-1 flex flex-col">
        <div
          v-if="showMenu" class="p-1 text-center border-b rounded-b bg-slate-200 text-black cursor-pointer"
          @click="isOpen = true"
        >
          菜单
        </div>
        <USlideover v-model:open="isOpen" :ui="{ wrapper: 'm-auto' }" class="sm:w-[680px] m-auto" side="top">
          <template #content>
            <div class="max-sm:w-[680px] h-1/3 m-auto">
              <div class="p-1 flex-1">
                <UButton
                  color="secondary" variant="ghost" size="sm" icon="i-heroicons-x-mark-20-solid"
                  class="flex sm:hidden absolute end-5 top-5 z-10" square padded @click="isOpen = false"
                />
                <Menu />
              </div>
            </div>
          </template>
        </USlideover>
        <div class="flex-1">
          <slot />
        </div>
      </div>
      <Footer />
    </div>
  </div>
</template>

<style scoped>
.mobile {
  height: 100vh;
  width: 100vw;
}

.main {
  width: 680px;
  height: 100%;
}

@media (max-width: 680px) {
  .main {
    width: 100%;
  }
}
</style>
