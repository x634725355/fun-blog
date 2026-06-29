<script lang="ts" setup>
const route = useRoute()
const isOpen = ref(false)

const showMenu = computed(() => route.name !== 'mobile')

function closeMenu() {
  isOpen.value = false
}
</script>

<template>
  <div class="mobile-shell">
    <div class="mobile-main">
      <header
        v-if="showMenu"
        class="mobile-menu-bar"
        @click="isOpen = true"
      >
        菜单
      </header>

      <USlideover
        v-model:open="isOpen"
        side="top"
        class="w-full max-w-[680px] mx-auto"
        :ui="{ wrapper: 'mx-auto w-full max-w-[680px]' }"
      >
        <template #content>
          <div class="slideover-panel">
            <UButton
              color="secondary"
              variant="ghost"
              size="sm"
              icon="i-heroicons-x-mark-20-solid"
              class="slideover-close"
              square
              padded
              @click="closeMenu"
            />
            <Menu @navigate="closeMenu" />
          </div>
        </template>
      </USlideover>

      <main class="mobile-content">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.mobile-shell {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  height: 100dvh;
  overflow: hidden;
  display: flex;
  justify-content: center;
  background-color: inherit;
}

.mobile-main {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 680px;
  height: 100%;
  min-height: 0;
  min-width: 0;
}

.mobile-menu-bar {
  flex-shrink: 0;
  padding: 0.625rem 0.75rem;
  padding-top: max(0.625rem, env(safe-area-inset-top));
  text-align: center;
  border-bottom: 1px solid rgb(203 213 225);
  background-color: rgb(226 232 240);
  color: rgb(15 23 42);
  cursor: pointer;
  user-select: none;
}

.mobile-content {
  flex: 1;
  min-height: 0;
  min-width: 0;
  width: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
}

.slideover-panel {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  max-width: 680px;
  max-height: min(72dvh, 28rem);
  margin: 0 auto;
  overflow-x: hidden;
  overflow-y: auto;
  padding:
    max(2.5rem, calc(env(safe-area-inset-top) + 1.5rem))
    0.25rem
    max(0.75rem, env(safe-area-inset-bottom));
  -webkit-overflow-scrolling: touch;
}

.slideover-close {
  position: absolute;
  top: max(0.75rem, env(safe-area-inset-top));
  right: 0.75rem;
  z-index: 10;
}

@media (prefers-color-scheme: dark) {
  .mobile-menu-bar {
    border-bottom-color: rgb(71 85 105);
    background-color: rgb(51 65 85);
    color: rgb(241 245 249);
  }
}
</style>
