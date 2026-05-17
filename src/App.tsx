import { useCallback, useState } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { DropZone } from './components/DropZone'
import { PasswordInput } from './components/PasswordInput'
import { ModeToggle } from './components/ModeToggle'
import { ProgressBar } from './components/ProgressBar'
import { HowItWorks } from './components/HowItWorks'
import { useCryptoWorker } from './hooks/useCryptoWorker'
import { saveFile } from './lib/output'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function detectMode(file: File): 'encrypt' | 'decrypt' {
  return file.name.endsWith('.enc') ? 'decrypt' : 'encrypt'
}

export default function App() {
  const [file, setFile] = useState<File | null>(null)
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt')
  const [password, setPassword] = useState<string | null>(null)
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const [downloadTriggered, setDownloadTriggered] = useState(false)

  const { state, run, cancel, reset } = useCryptoWorker()

  const handleFile = useCallback((f: File) => {
    reset()
    setFile(f)
    setMode(detectMode(f))
    setDownloadTriggered(false)
  }, [reset])

  const handleModeChange = (m: 'encrypt' | 'decrypt') => {
    setMode(m)
    reset()
    setDownloadTriggered(false)
  }

  const handleGo = () => {
    if (!file || !password) return
    setDownloadTriggered(false)
    run(mode, file, password)
  }

  const handleDownload = async () => {
    if (!state.outputBlob || !state.outputFilename) return
    await saveFile(state.outputBlob, state.outputFilename)
    setDownloadTriggered(true)
  }

  const handleReset = () => {
    reset()
    setFile(null)
    setPassword(null)
    setDownloadTriggered(false)
  }

  const isWorking = state.status === 'working'
  const isDone = state.status === 'done'
  const isError = state.status === 'error'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-ghost-50 flex flex-col">
      {/* Header */}
      <header className="py-6 px-6 flex justify-between items-center max-w-3xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <img src="/ghost.svg" alt="" className="w-8 h-8" />
          <span className="font-bold text-xl text-gray-900">GhostFile</span>
        </div>
        <button
          onClick={() => setShowHowItWorks(true)}
          className="text-sm text-ghost-600 hover:text-ghost-800 underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ghost-500 rounded"
        >
          How this works
        </button>
      </header>

      {/* Main card */}
      <main className="flex-1 flex items-start justify-center px-4 pt-4 pb-12">
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 w-full max-w-xl p-8 space-y-6">
          {/* Title */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Encrypt or decrypt any file</h1>
            <p className="mt-1 text-sm text-gray-500">Files never leave your device</p>
          </div>

          {/* Drop zone — hidden while working or done */}
          {!isWorking && !isDone && (
            <DropZone onFile={handleFile} disabled={isWorking} />
          )}

          {/* File info */}
          {file && !isWorking && !isDone && (
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
              <span className="text-2xl">📄</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                <p className="text-xs text-gray-400">{formatBytes(file.size)}</p>
              </div>
              <button
                onClick={handleReset}
                aria-label="Remove file"
                className="text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-ghost-500 rounded-lg p-1 text-lg"
              >
                ✕
              </button>
            </div>
          )}

          {/* Mode toggle */}
          {file && !isWorking && !isDone && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 font-medium">Mode</span>
              <ModeToggle mode={mode} onChange={handleModeChange} disabled={isWorking} />
            </div>
          )}

          {/* Password input */}
          {file && !isWorking && !isDone && (
            <PasswordInput
              mode={mode}
              onPasswordReady={setPassword}
              disabled={isWorking}
            />
          )}

          {/* Action button */}
          {file && !isWorking && !isDone && (
            <button
              onClick={handleGo}
              disabled={!password || isWorking}
              className={[
                'w-full py-3 rounded-xl font-semibold text-white text-sm transition-all duration-200',
                'focus:outline-none focus-visible:ring-4 focus-visible:ring-ghost-400 focus-visible:ring-offset-2',
                password && !isWorking
                  ? 'bg-ghost-600 hover:bg-ghost-700 active:scale-[0.99] shadow-md hover:shadow-lg'
                  : 'bg-gray-300 cursor-not-allowed',
              ].join(' ')}
            >
              {mode === 'encrypt' ? '🔒 Encrypt File' : '🔓 Decrypt File'}
            </button>
          )}

          {/* Progress */}
          {isWorking && (
            <div className="space-y-3">
              <p className="text-center text-sm font-medium text-gray-700">
                {mode === 'encrypt' ? 'Encrypting…' : 'Decrypting…'}
              </p>
              <ProgressBar
                progress={state.progress}
                eta={state.eta}
                onCancel={cancel}
              />
            </div>
          )}

          {/* Success */}
          {isDone && state.outputFilename && (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2 py-4">
                <div className="text-5xl">✅</div>
                <p className="text-lg font-semibold text-gray-900">
                  {mode === 'encrypt' ? 'Encrypted!' : 'Decrypted!'}
                </p>
                <p className="text-sm text-gray-500 truncate max-w-full px-4">
                  {state.outputFilename}
                </p>
              </div>
              <button
                onClick={handleDownload}
                className="w-full py-3 rounded-xl font-semibold text-white text-sm bg-green-600 hover:bg-green-700 transition-colors shadow-md focus:outline-none focus-visible:ring-4 focus-visible:ring-green-400"
              >
                {downloadTriggered ? '⬇ Download Again' : '⬇ Download File'}
              </button>
              <button
                onClick={handleReset}
                className="w-full py-2 rounded-xl text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ghost-400"
              >
                {mode === 'encrypt' ? 'Encrypt another file' : 'Decrypt another file'}
              </button>
            </div>
          )}

          {/* Error */}
          {isError && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-4 text-center">
                <p className="text-lg font-semibold text-red-700 mb-1">Something went wrong</p>
                <p className="text-sm text-red-600">{state.errorMessage}</p>
              </div>
              <button
                onClick={handleReset}
                className="w-full py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ghost-400"
              >
                Try again
              </button>
            </div>
          )}

          {/* Cancelled */}
          {state.status === 'cancelled' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-center">
              <p className="text-sm text-yellow-700">Operation cancelled.</p>
              <button onClick={handleReset} className="mt-2 text-sm text-ghost-600 underline hover:text-ghost-800">
                Start over
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-gray-400 space-y-1">
        <p>Zero network requests after first load • No telemetry • No accounts</p>
        <p>
          <button
            onClick={() => setShowHowItWorks(true)}
            className="underline hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-ghost-500 rounded"
          >
            How it works
          </button>
        </p>
      </footer>

      {showHowItWorks && <HowItWorks onClose={() => setShowHowItWorks(false)} />}
      <Analytics />
    </div>
  )
}
