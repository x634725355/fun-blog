<script lang="ts" setup>
const props = defineProps<{
  label?: string
  name?: string
}>()

const errors = inject<Ref<Record<string, string>>>('uFormErrors', ref({}))
const error = computed(() => (props.name ? errors.value[props.name] : '') || '')
</script>

<template>
  <div class="ui-form-group">
    <label v-if="label" class="ui-form-group__label">
      {{ label }}
    </label>
    <slot />
    <p v-if="error" class="ui-form-group__error">
      {{ error }}
    </p>
  </div>
</template>
