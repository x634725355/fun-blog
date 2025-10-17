// adapted from https://jameshfisher.com/2021/01/18/measuring-audio-volume-in-javascript/
export default function useAudioLevel(mediaStreamTrack?: ComputedRef<MediaStreamTrack | undefined> | Ref<MediaStreamTrack | undefined>) {
  const audioLevel = ref(0)

  watchEffect((onCleanup) => {
    if (!mediaStreamTrack?.value) { return }
    const cancel = monitorAudioLevel({
      onMeasure: v => audioLevel.value = Math.round(v * 100) / 100,
      mediaStreamTrack: mediaStreamTrack.value,
    })
    onCleanup(cancel)
  }, { flush: 'post' })

  return computed(() => Math.min(1, audioLevel.value * 3))
}
