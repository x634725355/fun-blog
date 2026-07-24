<script lang="ts" setup>
const preUrl = 'https://store.csc3.fun/'
const listImg = ref<any[]>([])
const listFile = ref<any[]>([])
const catalogue = ref<any[]>([])
const currentImgPath = ref<any>({})
const load = ref(false)
const prefixPath = ref('')
const isShow = ref(false)
const previewOpen = ref(false)

const totalCount = computed(() => listImg.value.length + listFile.value.length)

function openPreview(item: any) {
  currentImgPath.value = item
  previewOpen.value = true
}

function closePreview() {
  previewOpen.value = false
}

async function setCatalogue() {
  const res = await getR2Catalogue()
  if (!res.data) {
    return
  }
  const demo: any[] = res.data.map((p: any) => ({ label: p.path, value: p.path }))
  demo.shift()
  catalogue.value = demo
}

async function listGet() {
  listImg.value = []
  listFile.value = []
  load.value = true
  const response: any = await listR2({ prefix: prefixPath.value }).catch(() => {
    load.value = false
  })
  load.value = false
  const list: any[] = response

  list.forEach((item) => {
    if (/\.(?:webp|jpg|jpeg|png|gif)$/i.test(item.key)) {
      listImg.value.push(item)
    }
    else {
      listFile.value.push(item)
    }
  })
}

async function deleteFile(key: string) {
  await deleteR2(key)
  listGet()
}

watch(prefixPath, () => {
  listGet()
})

onMounted(() => {
  isShow.value = location.search.includes(uploadKey)
  listGet()
  setCatalogue()
})
</script>

<template>
  <LayoutMobile>
    <div class="show-r2">
      <header class="show-r2__head">
        <div class="show-r2__titles">
          <h1 class="show-r2__title">
            R2 浏览
          </h1>
          <p class="show-r2__lede">
            按目录筛选对象；点图预览，文件行可下载或删除。
          </p>
        </div>
        <p class="show-r2__count" aria-live="polite">
          <span v-if="load">加载中</span>
          <span v-else>{{ totalCount }} 项</span>
        </p>
      </header>

      <section class="show-r2__filter" aria-label="目录筛选">
        <label class="show-r2__filter-label" for="r2-prefix">
          目录前缀
        </label>
        <USelect
          id="r2-prefix"
          v-model="prefixPath"
          :loading="load"
          class="show-r2__select"
          :items="catalogue"
          placeholder="选择目录…"
        />
      </section>

      <p v-if="!isShow" class="show-r2__gate">
        管理操作未解锁。带授权参数打开本页后可预览列表并删除/下载。
      </p>

      <template v-else>
        <section class="show-r2__panel" aria-labelledby="r2-images-label">
          <div class="show-r2__panel-head">
            <h2 id="r2-images-label" class="show-r2__panel-title">
              图片
            </h2>
            <span class="show-r2__panel-meta">{{ listImg.length }}</span>
          </div>

          <p v-if="!load && listImg.length === 0" class="show-r2__empty">
            当前前缀下没有图片。
          </p>

          <div v-else class="show-r2__gallery">
            <article
              v-for="item in listImg"
              :key="item.key"
              class="show-r2__tile"
            >
              <button
                type="button"
                class="show-r2__thumb-btn"
                :aria-label="`预览 ${item.key}`"
                @click="openPreview(item)"
              >
                <img
                  class="show-r2__thumb"
                  :src="preUrl + item.key"
                  :alt="item.key"
                  loading="lazy"
                >
              </button>
              <div class="show-r2__tile-actions">
                <UButton
                  size="sm"
                  color="error"
                  variant="soft"
                  icon="i-lucide-trash-2"
                  aria-label="删除"
                  @click="() => deleteFile(item.key)"
                />
                <UButton
                  size="sm"
                  variant="soft"
                  target="_blank"
                  :to="preUrl + item.key"
                  icon="i-lucide-download"
                  aria-label="下载"
                />
              </div>
            </article>
          </div>
        </section>

        <section class="show-r2__panel" aria-labelledby="r2-files-label">
          <div class="show-r2__panel-head">
            <h2 id="r2-files-label" class="show-r2__panel-title">
              文件
            </h2>
            <span class="show-r2__panel-meta">{{ listFile.length }}</span>
          </div>

          <p v-if="!load && listFile.length === 0" class="show-r2__empty">
            当前前缀下没有其他文件。
          </p>

          <ul v-else class="show-r2__ledger">
            <li
              v-for="item in listFile"
              :key="item.key"
              class="show-r2__row"
            >
              <div class="show-r2__row-name" :title="item.key">
                {{ item.key }}
              </div>
              <div class="show-r2__row-actions">
                <UButton
                  size="sm"
                  color="error"
                  variant="soft"
                  icon="i-lucide-trash-2"
                  aria-label="删除"
                  @click="() => deleteFile(item.key)"
                />
                <UButton
                  size="sm"
                  variant="soft"
                  target="_blank"
                  :to="preUrl + item.key"
                  icon="i-lucide-download"
                  aria-label="下载"
                />
              </div>
            </li>
          </ul>
        </section>
      </template>

      <UModal v-model:open="previewOpen">
        <template #content>
          <div class="show-r2__lightbox">
            <div class="show-r2__lightbox-bar">
              <p class="show-r2__lightbox-key" :title="currentImgPath.key">
                {{ currentImgPath.key || '预览' }}
              </p>
              <UButton
                size="sm"
                color="neutral"
                variant="ghost"
                icon="i-heroicons-x-mark-20-solid"
                square
                aria-label="关闭预览"
                @click="closePreview"
              />
            </div>
            <div class="show-r2__lightbox-stage">
              <img
                v-if="currentImgPath.key"
                class="show-r2__lightbox-img"
                :src="preUrl + currentImgPath.key"
                :alt="currentImgPath.key"
              >
            </div>
          </div>
        </template>
      </UModal>
    </div>
  </LayoutMobile>
</template>

<style scoped>
/* Hallmark · pre-emit critique: P4 H4 E4 S4 R4 V3 */
/* Hallmark · genre: modern-minimal · macrostructure: Workbench · design-system: design.md · designed-as-app */

.show-r2 {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  width: 100%;
  max-width: 100%;
  min-width: 0;
  padding: var(--space-sm);
  padding-bottom: max(var(--space-md), env(safe-area-inset-bottom));
}

.show-r2__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-sm);
  min-width: 0;
}

.show-r2__titles {
  min-width: 0;
  flex: 1;
}

.show-r2__title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-display);
  font-weight: 700;
  font-style: normal;
  letter-spacing: -0.02em;
  color: var(--color-ink);
  overflow-wrap: anywhere;
}

.show-r2__lede {
  margin: var(--space-3xs) 0 0;
  font-size: var(--text-sm);
  color: var(--color-muted);
  max-width: 36ch;
}

.show-r2__count {
  flex-shrink: 0;
  margin: 0;
  padding: var(--space-3xs) var(--space-2xs);
  border-radius: var(--radius-pill);
  background: var(--color-accent-soft);
  color: var(--color-ink);
  font-size: var(--text-xs);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.show-r2__filter {
  display: flex;
  flex-direction: column;
  gap: var(--space-3xs);
  padding: var(--space-sm);
  border-radius: var(--radius-card);
  border: 1px solid var(--color-rule);
  background: var(--color-paper-2);
  box-shadow: var(--shadow-soft);
  min-width: 0;
}

.show-r2__filter-label {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-ink-2);
}

.show-r2__select {
  width: 100%;
  min-width: 0;
}

.show-r2__gate {
  margin: 0;
  padding: var(--space-sm);
  border-radius: var(--radius-bubble);
  border: 1px dashed var(--color-rule);
  background: color-mix(in oklab, var(--color-paper-2) 70%, transparent);
  font-size: var(--text-sm);
  color: var(--color-muted);
}

.show-r2__panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xs);
  min-width: 0;
  padding: var(--space-sm);
  border-radius: var(--radius-card);
  border: 1px solid var(--color-rule);
  background: var(--color-paper);
}

.show-r2__panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2xs);
}

.show-r2__panel-title {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 700;
  font-style: normal;
  letter-spacing: -0.02em;
  color: var(--color-ink);
}

.show-r2__panel-meta {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-muted);
  font-variant-numeric: tabular-nums;
}

.show-r2__empty {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-muted);
}

.show-r2__gallery {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2xs);
}

.show-r2__tile {
  display: flex;
  flex-direction: column;
  gap: var(--space-3xs);
  min-width: 0;
}

.show-r2__thumb-btn {
  display: block;
  width: 100%;
  margin: 0;
  padding: 0;
  border: 1px solid var(--color-rule);
  border-radius: var(--radius-input);
  overflow: hidden;
  background: var(--color-paper-2);
  cursor: pointer;
  transition:
    transform var(--dur-short) var(--ease-out),
    box-shadow var(--dur-short) var(--ease-out),
    border-color var(--dur-short) var(--ease-out);
}

.show-r2__thumb-btn:hover {
  border-color: color-mix(in oklab, var(--color-accent) 45%, var(--color-rule));
  box-shadow: var(--shadow-soft);
  transform: translateY(-1px);
}

.show-r2__thumb-btn:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.show-r2__thumb-btn:active {
  transform: scale(0.98);
}

.show-r2__thumb {
  display: block;
  width: 100%;
  height: 7.5rem;
  object-fit: cover;
}

.show-r2__tile-actions,
.show-r2__row-actions {
  display: flex;
  flex-shrink: 0;
  gap: var(--space-3xs);
}

.show-r2__ledger {
  margin: 0;
  padding: 0;
  list-style: none;
  width: 100%;
  min-width: 0;
}

.show-r2__row {
  display: flex;
  align-items: center;
  gap: var(--space-2xs);
  width: 100%;
  min-width: 0;
  padding: var(--space-2xs) 0;
  border-bottom: 1px solid var(--color-rule);
}

.show-r2__row:last-child {
  border-bottom: none;
}

.show-r2__row-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  line-height: 1.35;
  color: var(--color-ink);
}

.show-r2__lightbox {
  display: flex;
  flex-direction: column;
  width: min(100vw - 2rem, 40rem);
  max-height: min(90dvh, 40rem);
  overflow: hidden;
}

.show-r2__lightbox-bar {
  display: flex;
  align-items: center;
  gap: var(--space-2xs);
  padding: var(--space-2xs) var(--space-xs);
  border-bottom: 1px solid var(--color-rule);
  background: var(--color-paper-2);
}

.show-r2__lightbox-key {
  flex: 1;
  min-width: 0;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-ink-2);
}

.show-r2__lightbox-stage {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 12rem;
  padding: var(--space-sm);
  background: var(--color-stage);
}

.show-r2__lightbox-img {
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: min(70dvh, 32rem);
  object-fit: contain;
}

@media (min-width: 680px) {
  .show-r2__gallery {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .show-r2__thumb {
    height: 8.5rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .show-r2__thumb-btn {
    transition: none;
  }

  .show-r2__thumb-btn:hover,
  .show-r2__thumb-btn:active {
    transform: none;
  }
}
</style>
