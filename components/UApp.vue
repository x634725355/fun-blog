<script lang="ts" setup>
const { toasts, remove } = useToast()
</script>

<template>
  <div class="u-app">
    <slot />
    <div class="ui-toast-host" aria-live="polite">
      <div
        v-for="item in toasts"
        :key="item.id"
        class="ui-toast"
        :class="`ui-toast--${item.color || 'primary'}`"
        role="status"
        @click="remove(item.id)"
      >
        <p class="ui-toast__title">
          {{ item.title }}
        </p>
        <p v-if="item.description" class="ui-toast__desc">
          {{ item.description }}
        </p>
      </div>
    </div>
  </div>
</template>
