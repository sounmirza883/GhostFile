import { useCallback, useEffect, useRef, useState } from 'react'

export type CryptoStatus = 'idle' | 'working' | 'done' | 'error' | 'cancelled'

export interface CryptoState {
  status: CryptoStatus
  progress: number // 0–1
  eta: string | null
  errorMessage: string | null
  outputBlob: Blob | null
  outputFilename: string | null
}

type WorkerOutMessage =
  | { type: 'progress'; bytesProcessed: number; totalBytes: number }
  | { type: 'done'; blob: Blob; filename: string }
  | { type: 'error'; message: string }
  | { type: 'cancelled' }

export function useCryptoWorker() {
  const workerRef = useRef<Worker | null>(null)
  const startTimeRef = useRef<number>(0)
  const lastProgressRef = useRef<number>(0)

  const [state, setState] = useState<CryptoState>({
    status: 'idle',
    progress: 0,
    eta: null,
    errorMessage: null,
    outputBlob: null,
    outputFilename: null,
  })

  useEffect(() => {
    return () => {
      workerRef.current?.terminate()
    }
  }, [])

  const run = useCallback(
    (type: 'encrypt' | 'decrypt', file: File, password: string) => {
      workerRef.current?.terminate()
      const worker = new Worker(new URL('../worker/crypto.worker.ts', import.meta.url), {
        type: 'module',
      })
      workerRef.current = worker
      startTimeRef.current = Date.now()
      lastProgressRef.current = 0

      setState({
        status: 'working',
        progress: 0,
        eta: null,
        errorMessage: null,
        outputBlob: null,
        outputFilename: null,
      })

      worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
        const msg = e.data

        if (msg.type === 'progress') {
          const progress = msg.totalBytes > 0 ? msg.bytesProcessed / msg.totalBytes : 0
          const elapsed = (Date.now() - startTimeRef.current) / 1000
          const rate = msg.bytesProcessed / elapsed // bytes/sec
          const remaining = rate > 0 ? (msg.totalBytes - msg.bytesProcessed) / rate : null
          const eta = remaining !== null ? formatEta(remaining) : null
          lastProgressRef.current = progress
          setState((s) => ({ ...s, progress, eta }))
        } else if (msg.type === 'done') {
          setState({
            status: 'done',
            progress: 1,
            eta: null,
            errorMessage: null,
            outputBlob: msg.blob,
            outputFilename: msg.filename,
          })
          worker.terminate()
        } else if (msg.type === 'error') {
          setState({
            status: 'error',
            progress: lastProgressRef.current,
            eta: null,
            errorMessage: msg.message,
            outputBlob: null,
            outputFilename: null,
          })
          worker.terminate()
        } else if (msg.type === 'cancelled') {
          setState({
            status: 'cancelled',
            progress: 0,
            eta: null,
            errorMessage: null,
            outputBlob: null,
            outputFilename: null,
          })
          worker.terminate()
        }
      }

      worker.postMessage({ type, file, password })
    },
    [],
  )

  const cancel = useCallback(() => {
    workerRef.current?.postMessage({ type: 'cancel' })
  }, [])

  const reset = useCallback(() => {
    workerRef.current?.terminate()
    workerRef.current = null
    setState({
      status: 'idle',
      progress: 0,
      eta: null,
      errorMessage: null,
      outputBlob: null,
      outputFilename: null,
    })
  }, [])

  return { state, run, cancel, reset }
}

function formatEta(seconds: number): string {
  if (seconds < 60) return `${Math.ceil(seconds)}s`
  const m = Math.floor(seconds / 60)
  const s = Math.ceil(seconds % 60)
  return `${m}m ${s}s`
}
