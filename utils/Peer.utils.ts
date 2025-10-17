type Task<Value = unknown> = () => Promise<Value>

const DefaultBatchSizeLimit = 64

export class FIFOScheduler {
  #schedulerChain: Promise<void>
  constructor() {
    this.#schedulerChain = Promise.resolve()
  }

  schedule<T>(task: Task<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.#schedulerChain = this.#schedulerChain.then(async () => {
        try {
          resolve(await task())
        }
        catch (error: any) {
          reject(error)
        }
      })
    })
  }
}

export class BulkRequestDispatcher<RequestEntryParams, BulkResponse> {
  #currentBatch: RequestEntryParams[]
  #currentBulkResponse: Promise<BulkResponse> | null
  #batchSizeLimit: number
  constructor(batchSizeLimit: number = DefaultBatchSizeLimit) {
    this.#currentBatch = []
    this.#currentBulkResponse = null
    this.#batchSizeLimit = batchSizeLimit
  }

  // doBulkRequest will return a bulk response promise.
  // At the event loop iteration end, the accumulated entries will be dispatched as a bulk request
  doBulkRequest(
    params: RequestEntryParams,
    bulkRequestFunc: (bulkCopy: RequestEntryParams[]) => Promise<BulkResponse>,
  ): Promise<BulkResponse> {
    if (this.#currentBatch.length >= this.#batchSizeLimit) {
      // if it reaches the batch size limit, we make another bulk request
      this.#currentBatch = []
      this.#currentBulkResponse = null
    }
    this.#currentBatch.push(params)
    if (this.#currentBulkResponse != null) {
      return this.#currentBulkResponse
    }
    // save the current batch list reference in the function scope because this.#currentBatch could be reset if
    // the batch limit is reached
    const batch = this.#currentBatch
    this.#currentBulkResponse = new Promise((resolve, reject) => {
      //   script
      //     |
      //     V
      // microtasks (Promise)
      //     |
      //     V
      // macrotasks (setTimeout)
      //
      // macrotasks are ran in the event loop iteration end, so
      // we use that moment to make the bulkRequestFunc call
      setTimeout(() => {
        // When the bulk request happens, the batch list and
        // the response is reset to start another batch. Coming
        // callers will wait for a new response promise
        this.#currentBulkResponse = null
        // we cut here to make the bulk request
        const batchCopy = batch.splice(0, batch.length)
        const p = bulkRequestFunc(batchCopy)
        p.then((r) => {
          resolve(r)
        }).catch((err) => {
          reject(err)
        })
      }, 0)
    })
    // This bulk response needs to be processed to extract the the result for the entry
    return this.#currentBulkResponse
  }
}

export function createFakeAudioTrack() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)()
  const oscillator = audioContext.createOscillator()
  const dest = audioContext.createMediaStreamDestination()

  oscillator.type = 'sine' // 可以是 'sine', 'square', 'sawtooth', 'triangle'
  oscillator.frequency.setValueAtTime(440, audioContext.currentTime) // 440Hz 频率
  oscillator.connect(dest)
  oscillator.start()

  return dest.stream.getAudioTracks()[0]
}

export async function createFakeVideoTrack() {
  // 创建一个 Canvas 元素
  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 480
  const context: CanvasRenderingContext2D = canvas.getContext('2d')!

  // 绘制一些虚假的视频内容
  function draw() {
    context.fillStyle = 'green'
    context.fillRect(0, 0, canvas.width, canvas.height)

    context.fillStyle = 'white'
    context.font = '48px sans-serif'
    context.fillText('Fake Video', 50, 100)

    requestAnimationFrame(draw)
  }

  draw()

  // 获取 Canvas 的 MediaStream
  const stream = canvas.captureStream(30) // 每秒30帧

  // 从 MediaStream 中获取视频轨道
  const videoTrack = stream.getVideoTracks()[0]

  return videoTrack
}
