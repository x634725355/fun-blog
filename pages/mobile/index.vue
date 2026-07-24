<script lang="ts" setup>
</script>

<template>
  <LayoutMobile>
    <div class="home">
      <header class="home__intro">
        <p class="home__label">
          csc3 · tools
          <span
            class="home__mark"
            aria-hidden="true"
          />
        </p>
        <p class="home__lede">
          上传 · 浏览 · 裁切 · 记录
        </p>
      </header>
      <Menu variant="index" />
    </div>
  </LayoutMobile>
</template>

<style scoped>
/* Hallmark · genre: playful · macrostructure: Index-First · theme: Hum × #E5CB90 · design-system: design.md */

.home {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  width: 100%;
  max-width: 100%;
  min-width: 0;
  min-height: 100%;
  padding: var(--space-sm);
  padding-bottom: max(var(--space-md), env(safe-area-inset-bottom));
}

.home__intro {
  min-width: 0;
  padding: var(--space-xs) var(--space-2xs) 0;
}

.home__label {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2xs);
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  font-weight: 500;
  letter-spacing: 0.02em;
  text-transform: lowercase;
  color: var(--color-ink-2);
}

.home__mark {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: var(--radius-pill);
  background: var(--color-accent);
  box-shadow: 0 0 0 0 color-mix(in oklab, var(--color-accent) 50%, transparent);
  animation: home-mark-pulse 2.4s var(--ease-in-out) infinite;
}

.home__lede {
  margin: var(--space-3xs) 0 0;
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: 500;
  line-height: 1.4;
  color: var(--color-muted);
  max-width: 36ch;
}

@keyframes home-mark-pulse {
  0%,
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 color-mix(in oklab, var(--color-accent) 40%, transparent);
  }

  50% {
    transform: scale(1.08);
    box-shadow: 0 0 0 6px transparent;
  }
}

@media (prefers-reduced-motion: reduce) {
  .home__mark {
    animation: none;
  }
}
</style>
