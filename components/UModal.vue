<script lang="ts" setup>
const open = defineModel<boolean>('open', { default: false })

function close() {
  open.value = false
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    close()
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
  <div class="u-modal-root">
    <slot />
    <Teleport to="body">
      <div
        v-if="open"
        class="ui-overlay ui-overlay--center"
        @click.self="close"
      >
        <div class="ui-modal-panel" role="dialog" aria-modal="true">
          <slot name="content" />
        </div>
      </div>
    </Teleport>
  </div>
</template>
