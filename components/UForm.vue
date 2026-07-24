<script lang="ts" setup>
const props = defineProps<{
  schema?: { validate: (value: unknown, options?: object) => Promise<unknown> }
  state: Record<string, unknown>
}>()

const emit = defineEmits<{
  submit: [event: { data: any }]
}>()

const errors = ref<Record<string, string>>({})

provide('uFormErrors', errors)
provide('uFormState', toRef(props, 'state'))

async function onSubmit(e: Event) {
  e.preventDefault()
  errors.value = {}
  try {
    const data = props.schema
      ? await props.schema.validate(props.state, { abortEarly: false })
      : props.state
    emit('submit', { data })
  }
  catch (err: any) {
    if (err?.inner && Array.isArray(err.inner)) {
      const next: Record<string, string> = {}
      for (const item of err.inner) {
        if (item.path && !next[item.path]) {
          next[item.path] = item.message
        }
      }
      errors.value = next
      return
    }
    if (err?.path) {
      errors.value = { [err.path]: err.message }
    }
  }
}
</script>

<template>
  <form @submit="onSubmit">
    <slot />
  </form>
</template>
