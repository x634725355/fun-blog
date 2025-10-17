<script lang="ts" setup>
import * as d3 from 'd3'

const timeout = ref()

function init() {
  const svgD3 = d3.select('#color')
    .append('svg')
    .attr('class', 'h-96 w-full')
    .on('click', onClick)
  // .on('click touchstart', function (event) {
  //   event.preventDefault()
  //   createExplosion(this)
  // })

  function onClick(event: PointerEvent) {
    console.log('%c Line:67 🍑', 'color:#42b983', event.offsetX, event.offsetY)
    const x = event.offsetX
    const y = event.offsetY

    const particles = generateRandomPoints(x, y, 30, 30)
    const rectPoint: d3.Selection<SVGRectElement, unknown, HTMLElement, any>[] = []

    particles.forEach((p) => {
      const moveX = Math.random() * 40
      const moveY = Math.random() * 40

      const rect = svgD3.append('rect')
        .attr('x', p.x)
        .attr('y', p.y)
        .attr('width', 4)
        .attr('height', 4)
        .style('fill', 'blue')

      rect.transition()
        .duration(1000)
        .attr('x', p.x + moveX)
        .attr('y', p.y + moveY)
        .style('opacity', 0)
        .remove()

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
  if (timeout.value) {
    clearTimeout(timeout.value)
  }
})
</script>

<template>
  <div id="color" class="" />
</template>

<style scoped></style>
