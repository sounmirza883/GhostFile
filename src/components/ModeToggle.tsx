interface ModeToggleProps {
  mode: 'encrypt' | 'decrypt'
  onChange: (mode: 'encrypt' | 'decrypt') => void
  disabled?: boolean
}

export function ModeToggle({ mode, onChange, disabled = false }: ModeToggleProps) {
  return (
    <div
      role="group"
      aria-label="Operation mode"
      className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 w-fit"
    >
      {(['encrypt', 'decrypt'] as const).map((m) => (
        <button
          key={m}
          type="button"
          disabled={disabled}
          onClick={() => onChange(m)}
          aria-pressed={mode === m}
          className={[
            'px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-150',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-ghost-500',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            mode === m
              ? 'bg-white shadow-sm text-ghost-700 border border-gray-200'
              : 'text-gray-500 hover:text-gray-700',
          ].join(' ')}
        >
          {m === 'encrypt' ? '🔒 Encrypt' : '🔓 Decrypt'}
        </button>
      ))}
    </div>
  )
}
