import { useCallback, useRef, useState } from 'react'

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024 // 2 GB

interface DropZoneProps {
  onFile: (file: File) => void
  disabled?: boolean
}

export function DropZone({ onFile, disabled = false }: DropZoneProps) {
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    (file: File) => {
      setError(null)
      if (file.size > MAX_FILE_SIZE) {
        setError('File is too large. Maximum size is 2 GB.')
        return
      }
      onFile(file)
    },
    [onFile],
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragActive(false)
      if (disabled) return
      const files = Array.from(e.dataTransfer.files)
      if (files.length > 1) {
        setError('Please drop one file at a time.')
        return
      }
      if (files.length === 1) handleFile(files[0])
    },
    [disabled, handleFile],
  )

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) setDragActive(true)
  }
  const onDragLeave = () => setDragActive(false)

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
  }

  return (
    <div className="w-full">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Drop a file here or press Enter to browse"
        aria-disabled={disabled}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={handleKeyDown}
        className={[
          'relative flex flex-col items-center justify-center',
          'w-full rounded-2xl border-2 border-dashed p-12 text-center',
          'transition-all duration-200 select-none',
          'focus:outline-none focus-visible:ring-4 focus-visible:ring-ghost-400 focus-visible:ring-offset-2',
          disabled
            ? 'cursor-not-allowed border-gray-200 bg-gray-50 opacity-60'
            : dragActive
              ? 'cursor-copy border-ghost-500 bg-ghost-50 scale-[1.01]'
              : 'cursor-pointer border-gray-300 bg-white hover:border-ghost-400 hover:bg-ghost-50',
        ].join(' ')}
      >
        <div className="mb-4 text-5xl select-none">
          {dragActive ? '📂' : '🔒'}
        </div>
        <p className="text-lg font-semibold text-gray-700">
          {dragActive ? 'Drop it!' : 'Drop a file or click to browse'}
        </p>
        <p className="mt-1 text-sm text-gray-400">Up to 2 GB • Any file type</p>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
          onChange={onInputChange}
          disabled={disabled}
        />
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600 font-medium">
          {error}
        </p>
      )}
    </div>
  )
}
