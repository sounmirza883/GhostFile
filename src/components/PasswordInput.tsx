import { useEffect, useId, useRef, useState } from 'react'

interface PasswordInputProps {
  mode: 'encrypt' | 'decrypt'
  onPasswordReady: (password: string | null) => void
  disabled?: boolean
}

type Strength = { score: 0 | 1 | 2 | 3 | 4; label: string; color: string }

function estimateStrength(password: string): Strength {
  if (password.length === 0) return { score: 0, label: '', color: '' }
  if (password.length < 8) return { score: 1, label: 'Too short', color: 'bg-red-500' }

  let score = 0
  if (password.length >= 12) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++

  const map: Strength[] = [
    { score: 0, label: '', color: '' },
    { score: 1, label: 'Weak', color: 'bg-red-500' },
    { score: 2, label: 'Fair', color: 'bg-yellow-500' },
    { score: 3, label: 'Good', color: 'bg-blue-500' },
    { score: 4, label: 'Strong', color: 'bg-green-500' },
  ]
  return map[Math.min(score, 4)]
}

export function PasswordInput({ mode, onPasswordReady, disabled = false }: PasswordInputProps) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const pwId = useId()
  const confirmId = useId()
  const strengthId = useId()
  const prevPassword = useRef('')

  const strength = mode === 'encrypt' ? estimateStrength(password) : null
  const mismatch = mode === 'encrypt' && confirm.length > 0 && password !== confirm
  const ready =
    mode === 'decrypt'
      ? password.length >= 1
      : password.length >= 8 && password === confirm

  useEffect(() => {
    onPasswordReady(ready ? password : null)
  }, [ready, password, onPasswordReady])

  // Clear on mode switch
  useEffect(() => {
    setPassword('')
    setConfirm('')
  }, [mode])

  // Zero out on unmount
  useEffect(() => {
    return () => {
      prevPassword.current = ''
    }
  }, [])

  return (
    <div className="flex flex-col gap-3 w-full">
      <div>
        <label htmlFor={pwId} className="block text-sm font-medium text-gray-700 mb-1">
          Password
        </label>
        <div className="relative">
          <input
            id={pwId}
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={disabled}
            aria-describedby={mode === 'encrypt' ? strengthId : undefined}
            placeholder={mode === 'encrypt' ? 'Choose a strong password' : 'Enter your password'}
            autoComplete={mode === 'encrypt' ? 'new-password' : 'current-password'}
            className={[
              'w-full rounded-lg border px-4 py-2.5 pr-12 text-sm',
              'focus:outline-none focus:ring-2 focus:ring-ghost-500 focus:border-transparent',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'border-gray-300',
            ].join(' ')}
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-ghost-500 rounded"
          >
            {showPw ? '🙈' : '👁️'}
          </button>
        </div>

        {mode === 'encrypt' && strength && strength.label && (
          <div id={strengthId} className="mt-1.5" aria-live="polite">
            <div className="flex gap-1 mb-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={[
                    'h-1 flex-1 rounded-full transition-all duration-300',
                    i <= strength.score ? strength.color : 'bg-gray-200',
                  ].join(' ')}
                />
              ))}
            </div>
            <p className="text-xs text-gray-500">
              Password strength: <span className="font-medium">{strength.label}</span>
            </p>
          </div>
        )}
      </div>

      {mode === 'encrypt' && (
        <div>
          <label htmlFor={confirmId} className="block text-sm font-medium text-gray-700 mb-1">
            Confirm password
          </label>
          <input
            id={confirmId}
            type={showPw ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={disabled}
            placeholder="Re-enter your password"
            autoComplete="new-password"
            aria-invalid={mismatch}
            className={[
              'w-full rounded-lg border px-4 py-2.5 text-sm',
              'focus:outline-none focus:ring-2 focus:ring-ghost-500 focus:border-transparent',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              mismatch ? 'border-red-400 bg-red-50' : 'border-gray-300',
            ].join(' ')}
          />
          {mismatch && (
            <p className="mt-1 text-xs text-red-600" role="alert">
              Passwords don't match
            </p>
          )}
        </div>
      )}
    </div>
  )
}
