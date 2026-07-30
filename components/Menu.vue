<script setup lang="ts">
interface MenuRoute {
  path: string
  name: string
  hint: string
  tint: 'gold' | 'cyan' | 'coral'
}

const props = withDefaults(defineProps<{
  variant?: 'index' | 'sheet'
}>(), {
  variant: 'sheet',
})

const emit = defineEmits<{
  navigate: []
}>()

const route = useRoute()

const menuRoutes: MenuRoute[] = [
  { path: '/mobile', name: '首页', hint: 'index', tint: 'gold' },
  { path: '/mobile/upload', name: '上传文件', hint: 'r2 put', tint: 'cyan' },
  { path: '/mobile/show-r2', name: '文件展示', hint: 'gallery', tint: 'gold' },
  { path: '/mobile/image-editor', name: '图片裁切', hint: 'crop', tint: 'cyan' },
  { path: '/mobile/qrcode', name: '二维码', hint: 'qr', tint: 'coral' },
  { path: '/mobile/record-timeline', name: '记录', hint: 'timeline', tint: 'gold' },
]

const visibleRoutes = computed(() => {
  if (props.variant === 'index') {
    return menuRoutes.filter(item => item.path !== '/mobile')
  }
  return menuRoutes
})

function isActive(path: string) {
  if (path === '/mobile') {
    return route.path === '/mobile'
  }
  return route.path === path || route.path.startsWith(`${path}/`)
}

function onNavigate() {
  emit('navigate')
}
</script>

<template>
  <nav
    class="menu-nav"
    :class="`menu-nav--${variant}`"
    aria-label="站点导航"
  >
    <ul class="menu-list">
      <li
        v-for="item in visibleRoutes"
        :key="item.path"
        class="menu-item"
      >
        <NuxtLink
          :to="item.path"
          class="menu-link"
          :class="[
            `menu-link--tint-${item.tint}`,
            { 'menu-link--active': isActive(item.path) },
          ]"
          @click="onNavigate"
        >
          <span class="menu-link__text">
            <span class="menu-link__label">{{ item.name }}</span>
            <span class="menu-link__hint">{{ item.hint }}</span>
          </span>
          <span
            class="menu-link__mark"
            aria-hidden="true"
          />
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
/* Hallmark · design-system: design.md · nav: Index-First list · theme: Hum */

.menu-nav {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  padding:
    var(--space-2xs)
    max(var(--space-2xs), env(safe-area-inset-left))
    max(var(--space-2xs), env(safe-area-inset-bottom))
    max(var(--space-2xs), env(safe-area-inset-right));
}

.menu-list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
  width: 100%;
  border: 1px solid var(--color-rule);
  border-radius: var(--radius-card);
  overflow: clip;
  background: var(--color-paper);
  box-shadow: var(--shadow-soft);
}

.menu-item {
  min-width: 0;
}

.menu-item + .menu-item {
  border-top: 1px solid var(--color-rule);
}

.menu-link {
  box-sizing: border-box;
  display: flex;
  min-height: 3.25rem;
  min-width: 0;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  padding: var(--space-xs) var(--space-sm);
  text-decoration: none;
  color: var(--color-ink);
  background: transparent;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition:
    background-color var(--dur-short) var(--ease-out),
    transform var(--dur-short) var(--ease-out);
}

.menu-link__text {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.menu-link__label {
  font-family: var(--font-body);
  font-size: var(--text-md);
  font-weight: 600;
  font-style: normal;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.menu-link__hint {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-muted);
  text-transform: lowercase;
  white-space: nowrap;
}

.menu-link__mark {
  flex-shrink: 0;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: var(--radius-pill);
  background: var(--color-accent);
  opacity: 0.35;
}

.menu-link--tint-gold {
  --row-tint: var(--color-accent-soft);
  --row-mark: var(--color-accent);
}

.menu-link--tint-cyan {
  --row-tint: var(--color-accent-2-soft);
  --row-mark: var(--color-accent-2);
}

.menu-link--tint-coral {
  --row-tint: var(--color-accent-3-soft);
  --row-mark: var(--color-accent-3);
}

.menu-link--tint-gold .menu-link__mark,
.menu-link--tint-cyan .menu-link__mark,
.menu-link--tint-coral .menu-link__mark {
  background: var(--row-mark);
}

.menu-link:hover {
  background: color-mix(in oklab, var(--row-tint) 70%, transparent);
}

.menu-link:active {
  transform: translateY(1px);
}

.menu-link--active {
  background: var(--row-tint);
}

.menu-link--active .menu-link__mark {
  opacity: 1;
  box-shadow: 0 0 0 3px color-mix(in oklab, var(--row-mark) 28%, transparent);
}

.menu-link--active .menu-link__hint {
  color: var(--color-ink-2);
}

.menu-nav--index .menu-list {
  border-radius: var(--radius-card);
}

@media (prefers-reduced-motion: reduce) {
  .menu-link {
    transition: none;
  }

  .menu-link:active {
    transform: none;
  }
}
</style>
