<script lang="ts" setup>
defineProps<{
  modelValue?: boolean
  label?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<template>
  <label class="ui-check">
    <input
      type="checkbox"
      :checked="!!modelValue"
      :disabled="disabled"
      @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    >
    <span v-if="label">{{ label }}</span>
    <slot />
  </label>
</template>
