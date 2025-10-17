<script lang="ts" setup>
const { className, videoTrack } = defineProps<{
  className?: string
  videoTrack?: ComputedRef<MediaStreamTrack | undefined> | Ref<MediaStreamTrack | undefined>
}>()
const internalRef = ref<HTMLVideoElement>()
const mediaStream = ref<MediaStream>()

function cleanVideo() {
  if (videoTrack?.value && mediaStream.value) { mediaStream.value!.removeTrack(videoTrack.value) }
  const video = internalRef.value
  if (video) { video.srcObject = null }
}

function setVideo() {
  console.log('%c Line:17 🥑', 'color:#7f2b82', videoTrack?.value)
  mediaStream.value = new MediaStream()
  if (videoTrack?.value) { mediaStream.value.addTrack(videoTrack.value) }
  const video = internalRef.value
  if (video) {
    video.srcObject = mediaStream.value
    video.setAttribute('autoplay', 'true')
    video.setAttribute('playsinline', 'true')
  }
}

watchEffect((onCleanup) => {
  onCleanup(cleanVideo)
  setVideo()
}, { flush: 'post' })

onUnmounted(() => {
  cleanVideo()
})
</script>

<template>
  <video ref="internalRef" :class="`bg-zinc-700 ${className}`" />
</template>

<style></style>
