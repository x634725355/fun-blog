<script lang="ts" setup>
const audio = ref<HTMLMediaElement>()
let AudioContext
let ctx: AudioContext
if (process.browser) {
  AudioContext = window.AudioContext || window.webkitAudioContext
  ctx = new AudioContext()
}
const playing = ref(false)
function init() {
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 512

  // 通过<audio>节点创建音频源
  if (!audio.value) {
    return
  }

  const source = ctx.createMediaElementSource(audio.value)

  // 将音频源关联到分析器
  source.connect(analyser)

  source.connect(ctx.destination)

  // 将分析器关联到输出设备（耳机、扬声器）
  analyser.connect(ctx.destination)

  const bufferLength = analyser.frequencyBinCount
  const dataArray = new Uint8Array(bufferLength)

  // setInterval(() => {
  //   analyser.getByteFrequencyData(dataArray)
  //   console.log('%c Line:30 🍺 dataArray', 'color:#f5ce50', dataArray)
  // }, 1000)
}

function clickButton() {
  if (ctx.state === 'suspended') {
    ctx.resume()
  }

  if (playing.value) {
    audio.value?.pause()
    playing.value = false
  }
  else {
    audio.value?.play()
    playing.value = true
  }
}

onMounted(() => {
  init()
})
</script>

<template>
  <div class="myAudio">
    <audio ref="audio" type="audio/mpeg" src="/music/springSnow.mp3" />
    <button role="switch" aria-checked="false" @click="clickButton">
      <span>Play/Pause</span>
    </button>
  </div>
</template>

<style></style>
