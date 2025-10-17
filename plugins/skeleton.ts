// skeleton.ts
import { type Directive, h, reactive, render } from 'vue'

interface State {
  loading: boolean
  list: Element[]
}

export default defineNuxtPlugin((nuxtApp) => {
  const state = reactive<State>({
    // 加载状态
    loading: false,
    // 使用了 v-skeleton-item 指令的节点保存在这里
    list: [],
  })

  watchEffect(() => {
    // 创建 vnode
    const children = state.list.map((el: Element) =>
      h('div', {
        style: {
          position: 'absolute',
          top: `${el.getBoundingClientRect().top}px`,
          left: `${el.getBoundingClientRect().left}px`,
          width: `${el.getBoundingClientRect().width}px`,
          height: `${el.getBoundingClientRect().height}px`,
          background: '#e5e5e5',
          borderRadius: getComputedStyle(el).borderRadius,
        },
      }),
    )

    // 创建 div 容器
    const container = h('div', children)

    // 将 div容器 渲染到 body 中
    if (process.browser) {
      render(state.loading ? container : null, document.body)
    }
  })

  const Skeleton: Directive<Element> = {
    mounted(_el: any, binding: { value: any }) {
      state.loading = binding.value
    },
    updated(el: any, binding: { value: any }) {
      state.loading = binding.value
    },
    unmounted(_el: any) {
      state.loading = false
    },
  }

  const SkeletonItem: Directive<Element> = {
    mounted(el: any, binding: any) {
      // 保存 el
      state.list.push(el)
    },
    unmounted(el: any) {
      // 删除 el
      const i = state.list.indexOf(el)
      if (i == -1) { return }
      state.list.splice(i, 1)
    },
  }

  nuxtApp.vueApp.directive('skeleton', Skeleton)
  nuxtApp.vueApp.directive('skeleton-item', SkeletonItem)
})
