export async function copyText(value: string) {
  const toast = useToast()

  try {
    await navigator.clipboard.writeText(value)
    toast.add({ title: '复制成功' })
  }
  catch (err) {
    console.error('Failed to copy text: ', err)
  }
}

export function generateRandomPoints(x0: number, y0: number, n: number, maxOffset: number) {
  const points = []
  for (let i = 0; i < n; i++) {
    // 均匀分布
    const dx = (Math.random() - 0.5) * 2 * maxOffset
    const dy = (Math.random() - 0.5) * 2 * maxOffset
    points.push({ x: x0 + dx, y: y0 + dy })
  }
  return points
}
