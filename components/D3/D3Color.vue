<script lang="ts" setup>
import * as d3 from 'd3'

const timeout = ref<ReturnType<typeof setTimeout>>()
const colorRoot = useTemplateRef<HTMLDivElement>('colorRoot')
let resizeObserver: ResizeObserver | undefined
let svgSelection: d3.Selection<SVGSVGElement, unknown, HTMLElement, any> | undefined

function syncSvgSize() {
  const container = colorRoot.value
  if (!container || !svgSelection) {
    return
  }
  const height = Math.max(container.clientHeight, 160)
  svgSelection.attr('height', height)
}

function init() {
  const container = colorRoot.value
  if (!container) {
    return
  }

  svgSelection = d3.select(container).append('svg').attr('width', '100%').attr('class', 'block w-full h-full').on('click', onClick)

  syncSvgSize()

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      syncSvgSize()
    })
    resizeObserver.observe(container)
  }

  function onClick(event: PointerEvent) {
    if (!svgSelection) {
      return
    }
    const x = event.offsetX
    const y = event.offsetY

    const particles = generateRandomPoints(x, y, 30, 30)
    const rectPoint: d3.Selection<SVGRectElement, unknown, HTMLElement, any>[] = []

    particles.forEach((p) => {
      const moveX = Math.random() * 40
      const moveY = Math.random() * 40

      const rect = svgSelection!.append('rect').attr('x', p.x).attr('y', p.y).attr('width', 4).attr('height', 4).style('fill', 'blue')

      rect.transition().duration(1000).attr('x', p.x + moveX).attr('y', p.y + moveY).style('opacity', 0).remove()

      rectPoint.push(rect)
    })

    timeout.value = setTimeout(() => {
      rectPoint.forEach((rect) => {
        rect.remove()
      })
    }, 1000)
  }
}

onMounted(() => {
  init()
})

onUnmounted(() => {
  resizeObserver?.disconnect()
  if (timeout.value) {
    clearTimeout(timeout.value)
  }
})
</script>

<template>
  <div ref="colorRoot" class="color-root h-full w-full min-h-[10rem]" />
</template>

<style scoped>
.color-root {
  box-sizing: border-box;
  min-width: 0;
  overflow: hidden;
}
</style>
