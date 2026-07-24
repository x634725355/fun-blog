<script lang="ts" setup>
const props = withDefaults(defineProps<{
  modelValue?: string
  rows?: number
  placeholder?: string
  autoresize?: boolean
  disabled?: boolean
}>(), {
  rows: 3,
  autoresize: false,
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const el = ref<HTMLTextAreaElement | null>(null)

function resize() {
  if (!props.autoresize || !el.value) {
    return
  }
  el.value.style.height = 'auto'
  el.value.style.height = `${el.value.scrollHeight}px`
}

watch(() => props.modelValue, () => nextTick(resize))
onMounted(resize)

function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLTextAreaElement).value)
  nextTick(resize)
}
</script>

<template>
  <textarea
    ref="el"
    class="ui-field"
    :rows="rows"
    :placeholder="placeholder"
    :disabled="disabled"
    :value="modelValue ?? ''"
    @input="onInput"
  />
</template>
