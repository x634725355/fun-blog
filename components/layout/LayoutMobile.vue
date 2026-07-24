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
        role="button"
        tabindex="0"
        @click="isOpen = true"
        @keydown.enter="isOpen = true"
      >
        <span class="mobile-menu-bar__label">菜单</span>
        <span class="mobile-menu-bar__hint">工具导航</span>
      </header>

      <USlideover
        v-model:open="isOpen"
        side="top"
        class="w-full max-w-[720px] mx-auto"
        :ui="{ wrapper: 'mx-auto w-full max-w-[720px]' }"
      >
        <template #content>
          <div class="slideover-panel">
            <div class="slideover-panel__head">
              <p class="slideover-panel__title">
                工具
              </p>
              <UButton
                color="neutral"
                variant="ghost"
                size="sm"
                icon="i-heroicons-x-mark-20-solid"
                class="slideover-close"
                square
                @click="closeMenu"
              />
            </div>
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
/* Hallmark · genre: playful · macrostructure: Index-First · theme: Hum × #E5CB90 · design-system: design.md */

.mobile-shell {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  height: 100dvh;
  overflow: hidden;
  display: flex;
  justify-content: center;
  background:
    radial-gradient(120% 80% at 10% -10%, var(--glow-accent), transparent 55%),
    radial-gradient(90% 60% at 100% 0%, var(--glow-cool), transparent 50%),
    var(--color-paper);
}

.mobile-main {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: var(--shell-max);
  height: 100%;
  min-height: 0;
  min-width: 0;
  background-color: var(--color-paper);
  box-shadow: var(--shadow-soft);
  border-radius: 0;
}

.mobile-menu-bar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2xs);
  min-height: 2.75rem;
  padding:
    max(var(--space-xs), env(safe-area-inset-top))
    max(var(--space-sm), env(safe-area-inset-right))
    var(--space-xs)
    max(var(--space-sm), env(safe-area-inset-left));
  border-bottom: 1px solid var(--color-rule);
  background-color: color-mix(in oklab, var(--color-paper-2) 80%, transparent);
  backdrop-filter: blur(10px);
  color: var(--color-ink);
  cursor: pointer;
  user-select: none;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.mobile-menu-bar__label {
  font-family: var(--font-display);
  font-size: var(--text-sm);
  font-weight: 600;
  font-style: normal;
}

.mobile-menu-bar__hint {
  font-size: var(--text-xs);
  color: var(--color-muted);
}

.mobile-content {
  flex: 1;
  min-height: 0;
  min-width: 0;
  width: 100%;
  overflow-x: clip;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
}

.slideover-panel {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  max-width: var(--shell-max);
  max-height: min(72dvh, 28rem);
  margin: 0 auto;
  overflow-x: clip;
  overflow-y: auto;
  padding:
    max(var(--space-md), calc(env(safe-area-inset-top) + var(--space-sm)))
    var(--space-2xs)
    max(var(--space-sm), env(safe-area-inset-bottom));
  background: var(--color-paper);
  -webkit-overflow-scrolling: touch;
}

.slideover-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-xs) var(--space-2xs);
}

.slideover-panel__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 700;
  font-style: normal;
  letter-spacing: -0.02em;
}

.slideover-close {
  z-index: 10;
}

@media (min-width: 720px) {
  .mobile-main {
    border-inline: 1px solid var(--color-rule);
    border-radius: 0;
  }
}
</style>
