<script lang="ts" setup>
</script>

<template>
  <LayoutMobile>
    <div class="home">
      <header class="home__hero">
        <p class="home__eyebrow">
          csc3 · tools
        </p>
        <h1 class="home__title">
          工具箱
        </h1>
        <p class="home__lede">
          上传、浏览、裁切与记录 — 手机优先，桌面同壳。
        </p>
      </header>
      <Menu />
    </div>
  </LayoutMobile>
</template>

<style scoped>
/* Hallmark · genre: modern-minimal · macrostructure: Workbench · design-system: design.md · designed-as-app */

.home {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  width: 100%;
  max-width: 100%;
  min-width: 0;
  min-height: 100%;
  padding: var(--space-sm);
  padding-bottom: max(var(--space-md), env(safe-area-inset-bottom));
}

.home__hero {
  min-width: 0;
  padding: var(--space-md) var(--space-sm);
  border-radius: var(--radius-card);
  background:
    radial-gradient(120% 80% at 0% 0%, var(--glow-accent), transparent 55%),
    var(--color-paper-2);
  border: 1px solid var(--color-rule);
  box-shadow: var(--shadow-soft);
}

.home__eyebrow {
  margin: 0 0 var(--space-3xs);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-accent);
  text-transform: lowercase;
}

.home__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-display);
  font-weight: 700;
  font-style: normal;
  line-height: 1.15;
  letter-spacing: -0.02em;
  color: var(--color-ink);
  overflow-wrap: anywhere;
}

.home__lede {
  margin: var(--space-2xs) 0 0;
  font-size: var(--text-sm);
  line-height: 1.45;
  color: var(--color-ink-2);
  max-width: 32ch;
}
</style>
