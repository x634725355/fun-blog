<script setup lang="ts">
interface MenuRoute {
  path: string
  name: string
}

const emit = defineEmits<{
  navigate: []
}>()

const route = useRoute()

const menuRoutes: MenuRoute[] = [
  { path: '/mobile', name: '首页' },
  // { path: '/mobile/RTC', name: 'RTC通话' },
  { path: '/mobile/upload', name: '上传文件' },
  { path: '/mobile/show-r2', name: '文件展示' },
  { path: '/mobile/record-timeline', name: '记录' },
]

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
    aria-label="站点导航"
  >
    <ul class="menu-grid">
      <li v-for="item in menuRoutes" :key="item.path" class="menu-item">
        <NuxtLink
          :to="item.path"
          class="menu-link"
          :class="{ 'menu-link--active': isActive(item.path) }"
          @click="onNavigate"
        >
          {{ item.name }}
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.menu-nav {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  padding:
    0.5rem
    max(0.5rem, env(safe-area-inset-left))
    max(0.5rem, env(safe-area-inset-bottom))
    max(0.5rem, env(safe-area-inset-right));
}

.menu-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
  width: 100%;
}

.menu-item {
  min-width: 0;
}

.menu-link {
  box-sizing: border-box;
  display: flex;
  min-height: 2.625rem;
  min-width: 0;
  width: 100%;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  border: 1px solid rgb(203 213 225);
  background-color: rgb(255 255 255);
  padding: 0.5rem 0.375rem;
  text-align: center;
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.125rem;
  color: rgb(15 23 42);
  text-decoration: none;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  overflow-wrap: anywhere;
  word-break: keep-all;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    transform 0.1s ease;
}

@media (min-width: 360px) {
  .menu-nav {
    padding:
      0.625rem
      max(0.75rem, env(safe-area-inset-left))
      max(0.625rem, env(safe-area-inset-bottom))
      max(0.75rem, env(safe-area-inset-right));
  }

  .menu-grid {
    gap: 0.625rem;
  }

  .menu-link {
    min-height: 2.75rem;
    padding: 0.625rem 0.5rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
  }
}

@media (min-width: 420px) {
  .menu-grid {
    gap: 0.75rem;
  }

  .menu-link {
    min-height: 3rem;
    padding: 0.75rem 0.625rem;
    font-size: 0.9375rem;
  }
}

@media (min-width: 680px) {
  .menu-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
  }
}

.menu-link:active {
  transform: scale(0.98);
}

.menu-link--active {
  border-color: rgb(59 130 246);
  background-color: rgb(239 246 255);
  color: rgb(29 78 216);
  font-weight: 600;
}

@media (prefers-color-scheme: dark) {
  .menu-link {
    border-color: rgb(71 85 105);
    background-color: rgb(30 41 59);
    color: rgb(241 245 249);
  }

  .menu-link--active {
    border-color: rgb(96 165 250);
    background-color: rgb(30 58 138 / 0.35);
    color: rgb(147 197 253);
  }
}
</style>
