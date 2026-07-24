<script lang="ts" setup>
const props = withDefaults(defineProps<{
  modelValue?: string | number | null
  type?: string
  placeholder?: string
  disabled?: boolean
  size?: 'sm' | 'md' | 'xl'
  icon?: string
  min?: string | number
  max?: string | number
  inputmode?: string
}>(), {
  type: 'text',
  disabled: false,
  size: 'md',
})

const emit = defineEmits<{
  'update:modelValue': [value: string | number | null]
  'change': [event: Event]
  'blur': [event: FocusEvent]
}>()

const inputRef = ref<HTMLInputElement | null>(null)

defineExpose({ inputRef })

function onInput(e: Event) {
  const el = e.target as HTMLInputElement
  if (props.type === 'number') {
    emit('update:modelValue', el.value === '' ? null : el.value)
    return
  }
  emit('update:modelValue', el.value)
}
</script>

<template>
  <div class="ui-field-wrap" :class="{ 'ui-field-wrap--icon': !!icon }">
    <Icon v-if="icon" :name="icon" class="ui-field-wrap__icon" />
    <input
      ref="inputRef"
      class="ui-field"
      :class="{ 'ui-field--xl': size === 'xl' }"
      :type="type"
      :value="modelValue ?? ''"
      :placeholder="placeholder"
      :disabled="disabled"
      :min="min"
      :max="max"
      :inputmode="inputmode"
      @input="onInput"
      @change="emit('change', $event)"
      @blur="emit('blur', $event)"
    >
  </div>
</template>
