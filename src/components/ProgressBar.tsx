interface ProgressBarProps {
  progress: number // 0–1
  eta: string | null
  onCancel: () => void
}

export function ProgressBar({ progress, eta, onCancel }: ProgressBarProps) {
  const pct = Math.round(progress * 100)

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between text-sm text-gray-600">
        <span>{pct}%</span>
        {eta && <span>ETA: {eta}</span>}
      </div>
      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Operation progress"
        className="w-full h-3 bg-gray-200 rounded-full overflow-hidden"
      >
        <div
          className="h-full bg-gradient-to-r from-ghost-500 to-ghost-400 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="w-full mt-1 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 transition-colors"
      >
        Cancel
      </button>
    </div>
  )
}
