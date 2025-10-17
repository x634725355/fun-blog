<script lang="ts" setup>
interface AudioGlowProps {
  audioTrack?: ComputedRef<MediaStreamTrack | undefined> | Ref<MediaStreamTrack | undefined>
  type: 'self' | 'other'
}

const { audioTrack, type } = defineProps<AudioGlowProps>()
const audioLevel = useAudioLevel(audioTrack)
const internalRef = ref<HTMLAudioElement>()
const mediaStream = ref<MediaStream>()

function cleanaudio() {
  if (audioTrack?.value && mediaStream.value) { mediaStream.value!.removeTrack(audioTrack.value) }
  const audio = internalRef.value
  if (audio) { audio.srcObject = null }
}

function setaudio() {
  mediaStream.value = new MediaStream()
  if (audioTrack?.value) { mediaStream.value.addTrack(audioTrack.value) }
  const audio = internalRef.value
  if (audio) {
    audio.srcObject = mediaStream.value
    audio.play()
  }
}

watchEffect((onCleanup) => {
  onCleanup(cleanaudio)
  setaudio()
}, { flush: 'post' })

onUnmounted(() => {
  cleanaudio()
})
</script>

<template>
  <div class="bg-green-600 h-2 opacity-[--opacity] transition-opacity" :style="{ '--opacity': Math.min(1, audioLevel * 4) }" aria-hidden>
    <slot />
    <audio v-if="type === 'other'" ref="internalRef" />
  </div>
</template>

<style></style>
