<script lang="ts" setup>
import type { InferType } from 'yup'
import { object, string } from 'yup'
import { useUserInfo } from '~/composables/modules/userInfo'

const userInfo = useUserInfo()

const schema = object({
  username: string().required('Required'),
})

type Schema = InferType<typeof schema>

const state = reactive({
  username: undefined as string | undefined,
})

async function onSubmit(event: { data: Schema }) {
  sessionStorage.setItem('username', event.data.username)
  userInfo.username = event.data.username
  navigateTo('/mobile/rtc')
}
</script>

<template>
  <LayoutMobile>
    <div class="user p-2 h-full">
      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormGroup label="Username" name="username">
          <UInput v-model="state.username" />
        </UFormGroup>

        <UButton type="submit">
          Submit
        </UButton>
      </UForm>
    </div>
  </LayoutMobile>
</template>

<style scoped>
.user {}
</style>
