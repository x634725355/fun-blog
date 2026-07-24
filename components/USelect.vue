<script lang="ts" setup>
export interface USelectItem {
  label: string
  value: string | number
}

const props = withDefaults(defineProps<{
  modelValue?: string | number | null
  items?: USelectItem[]
  loading?: boolean
  disabled?: boolean
  placeholder?: string
}>(), {
  items: () => [],
  loading: false,
  disabled: false,
  placeholder: '请选择',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function onChange(e: Event) {
  emit('update:modelValue', (e.target as HTMLSelectElement).value)
}
</script>

<template>
  <select
    class="ui-field"
    :value="modelValue ?? ''"
    :disabled="disabled || loading"
    @change="onChange"
  >
    <option value="" disabled>
      {{ loading ? '加载中…' : placeholder }}
    </option>
    <option
      v-for="item in items"
      :key="String(item.value)"
      :value="item.value"
    >
      {{ item.label }}
    </option>
  </select>
</template>
