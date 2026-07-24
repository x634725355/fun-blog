export type ToastColor = 'primary' | 'error' | 'warning' | 'neutral' | 'success'

export interface ToastItem {
  id: number
  title: string
  description?: string
  color?: ToastColor
}

interface ToastAddOptions {
  title: string
  description?: string
  color?: ToastColor
}

const toasts = ref<ToastItem[]>([])
let seq = 0

export function useToast() {
  function add(options: ToastAddOptions) {
    const id = ++seq
    toasts.value.push({
      id,
      title: options.title,
      description: options.description,
      color: options.color ?? 'primary',
    })
    if (import.meta.client) {
      window.setTimeout(() => {
        remove(id)
      }, 3200)
    }
  }

  function remove(id: number) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  return {
    toasts,
    add,
    remove,
  }
}
