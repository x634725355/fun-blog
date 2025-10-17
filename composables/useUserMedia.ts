import { combineLatest, map, of, shareReplay, switchMap, tap } from 'rxjs'
import invariant from 'tiny-invariant'
import { prependDeviceToPrioritizeList } from '~/utils/rxjs/devicePrioritization'
import { getUserMediaTrack$ } from '~/utils/rxjs/getUserMediaTrack$'

export const errorMessageMap = {
  NotAllowedError: 'Permission was denied. Grant permission and reload to enable.',
  NotFoundError: 'No device was found.',
  NotReadableError: 'Device is already in use.',
  OverconstrainedError: 'No device was found that meets constraints.',
  DevicesExhaustedError: 'All devices failed to initialize.',
  UnknownError: 'An unknown error occurred.',
}

type UserMediaError = keyof typeof errorMessageMap

export function useUserMedia(mode: Mode) {
  const blurVideo = useLocalStorage('blur-video', false)
  const suppressNoise = useLocalStorage('suppress-noise', false)

  // const screenShareStream = ref<MediaStream>()
  // const videoStreamTrack = ref<MediaStreamTrack>()
  // const audioStreamTrack = ref<MediaStreamTrack>()
  // const mutedAudioStreamTrack = ref<MediaStreamTrack>()
  // mode === 'production'
  const audioEnabled = ref(mode === 'development')
  const videoEnabled = ref(true)
  const screenShareEnabled = ref(false)

  // const audioDeviceId = useAudioInputDeviceId()
  // const audioDeviceLabel = useAudioInputDeviceLabel()
  // const videoDeviceLabel = useVideoInputDeviceLabel()

  const audioUnavailableReason = ref<UserMediaError>()
  const videoUnavailableReason = ref<UserMediaError>()
  // const screenshareUnavailableReason = ref<UserMediaError>()

  const turnMicOff = () => { audioEnabled.value = false }
  const turnMicOn = () => { audioEnabled.value = true }
  const turnCameraOn = () => { videoEnabled.value = true }
  const turnCameraOff = () => { videoEnabled.value = false }

  const blurVideo$ = useStateObservable(blurVideo.value)
  const videoEnabled$ = useStateObservable(videoEnabled.value)
  const videoTrack$ = computed(
    () =>
      combineLatest([
        videoEnabled$.value.pipe(
          switchMap(enabled =>
            enabled
              ? getUserMediaTrack$('videoinput').pipe(
                  tap({
                    error: (e) => {
                      invariant(e instanceof Error)
                      videoUnavailableReason.value = e.name in errorMessageMap
                        ? (e.name as UserMediaError)
                        : 'UnknownError'
                    },
                  }),
                )
              : of(blackCanvasStreamTrack()),
          ),
        ),
        blurVideo$.value,
      ]).pipe(
        switchMap(([track, blur]) =>
          blur && track ? blurVideoTrack(track) : of(track),
        ),
        shareReplay({
          refCount: true,
          bufferSize: 1,
        }),
      ),
  )
  const videoTrack = useSubscribedState(videoTrack$.value)
  const videoDeviceId = videoTrack?.getSettings().deviceId
  const suppressNoiseEnabled$ = useStateObservable(suppressNoise.value)
  const audioTrack$ = computed(() => {
    return combineLatest([
      getUserMediaTrack$('audioinput').pipe(
        tap({
          error: (e) => {
            invariant(e instanceof Error)
            audioUnavailableReason.value = e.name in errorMessageMap
              ? (e.name as UserMediaError)
              : 'UnknownError'
          },
        }),
      ),
      suppressNoiseEnabled$.value,
    ]).pipe(
      switchMap(([track, suppressNoise]) =>
        of(suppressNoise && track ? noiseSuppression(track) : track),
      ),
      shareReplay({
        refCount: true,
        bufferSize: 1,
      }),
    )
  })

  const mutedAudioTrack$ = computed(() => {
    return combineLatest([
      getUserMediaTrack$('audioinput').pipe(
        tap({
          next: (track) => {
            track.enabled = false
          },
          error: (e) => {
            invariant(e instanceof Error)
            audioUnavailableReason.value = e.name in errorMessageMap
              ? (e.name as UserMediaError)
              : 'UnknownError'
          },
        }),
      ),
      suppressNoiseEnabled$.value,
    ]).pipe(
      switchMap(([track, suppressNoise]) =>
        of(suppressNoise && track ? noiseSuppression(track) : track),
      ),
      shareReplay({
        refCount: true,
        bufferSize: 1,
      }),
    )
  })

  const alwaysOnAudioStreamTrack = useSubscribedState(audioTrack$.value)
  const audioDeviceId = alwaysOnAudioStreamTrack?.getSettings().deviceId
  const audioEnabled$ = useStateObservable(audioEnabled.value)
  const publicAudioTrack$ = computed(
    () =>
      combineLatest([audioEnabled$.value, audioTrack$.value, mutedAudioTrack$.value]).pipe(
        map(([enabled, alwaysOnTrack, mutedTrack]) =>
          enabled ? alwaysOnTrack : mutedTrack,
        ),
        shareReplay({
          refCount: true,
          bufferSize: 1,
        }),
      ),
  )

  const audioStreamTrack = useSubscribedState(publicAudioTrack$.value)

  const setVideoDeviceId = (deviceId: string) =>
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      const device = devices.find(d => d.deviceId === deviceId)
      if (device) { prependDeviceToPrioritizeList(device) }
    })

  const setAudioDeviceId = (deviceId: string) =>
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      const device = devices.find(d => d.deviceId === deviceId)
      if (device) { prependDeviceToPrioritizeList(device) }
    })

  // watchEffect((onCleanup) => {
  //   let mounted = true
  //   getUserMediaExtended({
  //     audio: audioDeviceId.value
  //       ? { deviceId: audioDeviceId.value, label: audioDeviceLabel.value }
  //       : true,
  //   }).then(async (ms) => {
  //     if (!mounted) {
  //       ms.getTracks().forEach(t => t.stop())
  //       return
  //     }
  //     const audio = ms.getAudioTracks()[0]
  //     const { deviceId } = audio.getSettings()
  //     audioDeviceId.value = deviceId
  //     audioDeviceLabel.value = (await navigator.mediaDevices.enumerateDevices()).find(
  //       d => d.deviceId === deviceId,
  //     )?.label

  //     // this will fire if the device is disconnected
  //     // in which case we will switch to whatever the
  //     // default is.
  //     audio.addEventListener('ended', () => {
  //       audioDeviceId.value = undefined
  //     })

  //     const audioTrack = suppressNoise.value ? noiseSuppression(audio) : audio
  //     if (audioStreamTrack.value) { audioStreamTrack.value.stop() }
  //     audioStreamTrack.value = audioTrack
  //     audioUnavailableReason.value = undefined
  //   }).catch((e: Error) => {
  //     if (!mounted) { return }
  //     audioEnabled.value = false
  //     invariant(keyInObject(errorMessageMap, e.name))
  //     audioUnavailableReason.value = e.name
  //   })

  //   getUserMediaExtended({
  //     audio: audioDeviceId.value ? { deviceId: audioDeviceId.value } : true,
  //   }).then((ms) => {
  //     if (!mounted) {
  //       ms.getTracks().forEach(t => t.stop())
  //       return
  //     }
  //     const [mutedTrack] = ms.getAudioTracks()
  //     mutedTrack.enabled = false
  //     mutedAudioStreamTrack.value = mutedTrack
  //   })

  //   onCleanup(() => { mounted = false })
  // })

  // watchEffect((onCleanup) => {
  //   let mounted = true
  //   if (videoEnabled.value) {
  //     getUserMediaExtended({
  //       video: videoDeviceId.value
  //         ? { deviceId: videoDeviceId.value, label: videoDeviceLabel.value }
  //         : true,
  //     }).then(async (ms) => {
  //       if (!mounted) {
  //         ms.getTracks().forEach(t => t.stop())
  //         return
  //       }
  //       const sourceTrack = ms.getVideoTracks()[0]
  //       const { deviceId } = sourceTrack.getSettings()
  //       videoDeviceId.value = deviceId
  //       videoDeviceLabel.value = (await navigator.mediaDevices.enumerateDevices()).find(
  //         d => d.deviceId === deviceId,
  //       )?.label

  //       sourceTrack.addEventListener('ended', () => {
  //         videoDeviceId.value = undefined
  //       })

  //       const videoTrack = blurVideo.value
  //         ? await blurVideoTrack(sourceTrack)
  //         : sourceTrack

  //       if (videoStreamTrack.value) { videoStreamTrack.value.stop() }
  //       videoStreamTrack.value = videoTrack
  //       videoUnavailableReason.value = undefined
  //     }).catch((e: Error) => {
  //       if (!mounted) { return }
  //       videoEnabled.value = false
  //       invariant(keyInObject(errorMessageMap, e.name))
  //       videoUnavailableReason.value = e.name
  //     })
  //   }
  //   else {
  //     if (videoStreamTrack.value) {
  //       const newTrack = blackCanvasStreamTrack(videoStreamTrack.value)
  //       videoStreamTrack.value.stop()
  //       videoStreamTrack.value = newTrack
  //     }
  //     else {
  //       videoStreamTrack.value = undefined
  //     }
  //   }

  //   onCleanup(() => { mounted = false })
  // })

  // const startScreenShare = () => {
  //   navigator.mediaDevices
  //     .getDisplayMedia()
  //     .then((ms) => {
  //       ms.getVideoTracks().forEach((track) => {
  //         if ('contentHint' in track) {
  //           // optimize for legibility in shared screen
  //           track.contentHint = 'text'
  //         }
  //       })
  //       screenShareStream.value = ms
  //       screenshareUnavailableReason.value = undefined
  //       ms.getVideoTracks()[0].addEventListener('ended', () => {
  //         screenShareStream.value = undefined
  //         screenShareEnabled.value = false
  //       })
  //       screenShareEnabled.value = true
  //     })
  //     .catch((e: Error) => {
  //       screenShareEnabled.value = false
  //       invariant(keyInObject(errorMessageMap, e.name))
  //       screenshareUnavailableReason.value = e.name
  //     })
  // }

  // const endScreenShare = () => {
  //   if (screenShareStream.value) { screenShareStream.value.getTracks().forEach(t => t.stop()) }
  //   screenShareEnabled.value = false
  //   screenShareStream.value = undefined
  // }

  // const videoTrack = computed(() => {
  //   return videoEnabled.value || !videoStreamTrack.value
  //     ? videoStreamTrack.value
  //     : blackCanvasStreamTrack()
  // })

  // const audioTrack = computed(() => { return audioEnabled.value ? audioStreamTrack.value : mutedAudioStreamTrack.value })

  // const screenShareVideoTrack = screenShareStream.value?.getVideoTracks()[0]

  // function close() {
  //   videoStreamTrack.value?.stop()
  //   audioStreamTrack.value?.stop()
  //   mutedAudioStreamTrack.value?.stop()
  //   screenShareStream.value?.getTracks().forEach(t => t.stop())
  // }

  // onUnmounted(() => {
  //   console.log('%c Line:197 🥪', 'color:#2eafb0', '停止调用用户摄像头与麦克风')
  //   videoStreamTrack.value?.stop()
  //   audioStreamTrack.value?.stop()
  //   mutedAudioStreamTrack.value?.stop()
  //   screenShareStream.value?.getTracks().forEach(t => t.stop())
  // })

  return {
    // turnMicOn,
    // turnMicOff,
    // audioStreamTrack: audioTrack,
    // audioMonitorStreamTrack: audioStreamTrack,
    // audioEnabled,
    // audioUnavailableReason,
    // turnCameraOn,
    // turnCameraOff,
    // videoStreamTrack: videoTrack,
    // videoEnabled,
    // videoUnavailableReason,
    // startScreenShare,
    // endScreenShare,
    // screenShareVideoTrack,
    // screenShareEnabled,
    // screenshareUnavailableReason,
    // audioDeviceId,
    // videoDeviceId,
    // blurVideo,
    // suppressNoise,
    // close,
    turnMicOn,
    turnMicOff,
    audioStreamTrack,
    audioMonitorStreamTrack: alwaysOnAudioStreamTrack,
    audioEnabled,
    audioUnavailableReason,
    publicAudioTrack$,
    privateAudioTrack$: audioTrack$,
    audioDeviceId,
    setAudioDeviceId,

    setVideoDeviceId,
    videoDeviceId,
    turnCameraOn,
    turnCameraOff,
    videoEnabled,
    videoUnavailableReason,
    blurVideo,
    // setBlurVideo,
    suppressNoise,
    // setSuppressNoise,
    videoTrack$,
    videoStreamTrack: videoTrack,

    // startScreenShare,
    // endScreenShare,
    // screenShareVideoTrack,
    screenShareEnabled,
    // screenShareVideoTrack$,
  }
}
