<script lang="ts" setup>
import { useUserInfo } from '~/composables/modules/userInfo'
import { LocationEnum } from '~/types/callsConstant'

const userInfo = useUserInfo()
const roomName = ref<string>()

async function newRoom() {
  navigateTo(`/mobile/rtc/room/${crypto.randomUUID()}?type=${LocationEnum.local}`)
}

async function joinRoom() {
  if (!roomName.value) {
    return false
  }

  navigateTo(`/mobile/rtc/room/${roomName.value}?type=${LocationEnum.remote}`)
}

onMounted(() => {
  if (!userInfo.username) {
    navigateTo('/mobile/rtc/user', { replace: true })
  }
})
</script>

<template>
  <LayoutMobile>
    <div class="rtc p-2">
      <ClientOnly>
        <div>welcome {{ userInfo.username }}</div>
      </ClientOnly>

      <UButton @click="newRoom">
        New Room
      </UButton>

      <div>or Join Room</div>
      <UInput v-model="roomName" class="mb-2" />
      <UButton @click="joinRoom">
        Join
      </UButton>
    </div>
  </LayoutMobile>
</template>

<style scoped>
.rtc {}
</style>
