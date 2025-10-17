import { skipHydrate } from 'pinia'

export const useUserInfo = defineStore('userInfo', () => {
  const username = ref<string | null>()

  if (import.meta.browser) {
    username.value = sessionStorage.getItem('username')
  }

  return { username: skipHydrate(username) }
})
