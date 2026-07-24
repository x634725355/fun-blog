<script lang="ts" setup>
const props = withDefaults(defineProps<{
  type?: 'button' | 'submit' | 'reset'
  size?: 'xs' | 'sm' | 'md' | 'xl'
  variant?: 'solid' | 'soft' | 'ghost' | 'outline'
  color?: 'primary' | 'error' | 'neutral' | 'success'
  loading?: boolean
  disabled?: boolean
  block?: boolean
  square?: boolean
  icon?: string
  to?: string
  target?: string
}>(), {
  type: 'button',
  size: 'md',
  variant: 'solid',
  color: 'primary',
  loading: false,
  disabled: false,
  block: false,
  square: false,
})

const tag = computed(() => props.to ? 'a' : 'button')
const isDisabled = computed(() => props.disabled || props.loading)

function onClick(e: MouseEvent) {
  if (isDisabled.value && props.to) {
    e.preventDefault()
  }
}
</script>

<template>
  <component
    :is="tag"
    class="ui-btn"
    :class="[
      `ui-btn--${size}`,
      `ui-btn--${variant}`,
      `ui-btn--${color}`,
      { 'ui-btn--block': block, 'ui-btn--square': square },
    ]"
    :type="to ? undefined : type"
    :href="to"
    :target="target"
    :rel="target === '_blank' ? 'noopener noreferrer' : undefined"
    :disabled="to ? undefined : isDisabled"
    :aria-disabled="to ? isDisabled : undefined"
    @click="onClick"
  >
    <span v-if="loading" class="ui-btn__spinner" aria-hidden="true" />
    <Icon v-else-if="icon" :name="icon" class="w-4 h-4 shrink-0" />
    <slot />
  </component>
</template>
