<script lang="ts" setup>
const open = defineModel<boolean>('open', { default: false })

withDefaults(defineProps<{
  side?: 'top' | 'bottom' | 'left' | 'right'
  ui?: Record<string, string>
}>(), {
  side: 'top',
})

function onBackdropClick() {
  open.value = false
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    open.value = false
  }
}

watch(open, (v) => {
  if (!import.meta.client) {
    return
  }
  document.body.style.overflow = v ? 'hidden' : ''
  if (v) {
    window.addEventListener('keydown', onKeydown)
  }
  else {
    window.removeEventListener('keydown', onKeydown)
  }
})

onBeforeUnmount(() => {
  if (!import.meta.client) {
    return
  }
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="ui-overlay"
      :class="side === 'top' ? 'ui-overlay--top' : 'ui-overlay--center'"
      @click.self="onBackdropClick"
    >
      <div class="ui-slideover-panel" role="dialog" aria-modal="true">
        <slot name="content" />
      </div>
    </div>
  </Teleport>
</template>
