import type { Observable } from 'rxjs'
import { BehaviorSubject } from 'rxjs'

export function useSubscribedState<T>(
  observable: Observable<T>,
  defaultValue?: T,
): T {
  const state = ref(defaultValue)
  useObservableEffect(observable, (value: any) => state.value = value)
  return state.value as T
}

export function useObservableEffect<T>(
  observable: Observable<T>,
  fn: (value: T) => void,
) {
  watchEffect((onCleanup) => {
    const subscription = observable.subscribe(v => fn(v))
    onCleanup(() => { subscription.unsubscribe() })
  })
}

/**
 * Turns a value into a stable observable that will emit new
 * values when the value changes, and completes upon unmounting.
 */
export function useStateObservable<T>(value: T) {
  const behaviorRef = ref(new BehaviorSubject(value))
  const observableRef = ref(behaviorRef.value.asObservable())
  const previousValue = ref<T>()
  if (previousValue.value !== value) {
    previousValue.value = value
    behaviorRef.value.next(value)
  }

  watchEffect((onCleanup) => {
    const { value } = behaviorRef
    if (!value) { return }
    onCleanup(() => {
      value.complete()
    })
  })

  return observableRef
}
