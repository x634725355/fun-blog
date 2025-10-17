function createGlobalPersistedState<T>(key: string, defaultValue: T) {
  const useGlobalState = defineStore(key, () => {
    const localStorageState = useLocalStorage<T>(key, defaultValue)

    return { value: localStorageState }
  })

  return () => {
    const globalState = useGlobalState()
    return globalState
  }
}

export const useVideoInputDeviceId = createGlobalPersistedState<
  string | undefined
>('videoinput-device-id', undefined)
export const useVideoInputDeviceLabel = createGlobalPersistedState<
  string | undefined
>('videoinput-device-label', undefined)
export const useAudioInputDeviceId = createGlobalPersistedState<
  string | undefined
>('audioinput-device-id', undefined)
export const useAudioInputDeviceLabel = createGlobalPersistedState<
  string | undefined
>('audioinput-device-label', undefined)
export const useAudioOutputDeviceId = createGlobalPersistedState<
  string | undefined
>('audiooutput-device-id', undefined)
