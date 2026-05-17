import { encryptFile } from '../crypto/encrypt'
import { decryptFile } from '../crypto/decrypt'

type WorkerInMessage =
  | { type: 'encrypt'; file: File; password: string }
  | { type: 'decrypt'; file: File; password: string }
  | { type: 'cancel' }

let abortController: AbortController | null = null

self.onmessage = async (e: MessageEvent<WorkerInMessage>) => {
  const msg = e.data

  if (msg.type === 'cancel') {
    abortController?.abort()
    return
  }

  abortController = new AbortController()
  const { signal } = abortController

  try {
    const onProgress = (p: { bytesProcessed: number; totalBytes: number }) => {
      self.postMessage({ type: 'progress', ...p })
    }

    const result =
      msg.type === 'encrypt'
        ? await encryptFile(msg.file, msg.password, signal, onProgress)
        : await decryptFile(msg.file, msg.password, signal, onProgress)

    self.postMessage({ type: 'done', blob: result.blob, filename: result.filename })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      self.postMessage({ type: 'cancelled' })
    } else {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.'
      self.postMessage({ type: 'error', message })
    }
  } finally {
    abortController = null
  }
}
