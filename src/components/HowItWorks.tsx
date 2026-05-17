interface HowItWorksProps {
  onClose: () => void
}

export function HowItWorks({ onClose }: HowItWorksProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="How GhostFile works"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">How GhostFile Works</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 text-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ghost-500 rounded-lg p-1"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6 text-gray-700 text-sm leading-relaxed">
          <section>
            <h3 className="font-semibold text-gray-900 text-base mb-2">Your files never leave your device</h3>
            <p>
              All encryption and decryption happens entirely inside your browser using the Web Crypto API —
              a built-in, audited, hardware-accelerated cryptography library. No file data is ever sent to
              any server. You can verify this by opening DevTools → Network tab and running an operation.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 text-base mb-2">Encryption: AES-256-GCM</h3>
            <p>
              Files are encrypted with AES-256-GCM — the same cipher used by banks, governments, and
              major tech companies. GCM mode provides both <em>confidentiality</em> (no one can read the
              file without the password) and <em>integrity</em> (any tampering is detected).
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 text-base mb-2">Password → Key: PBKDF2</h3>
            <p>
              Your password is never used directly as an encryption key. Instead, it's processed by
              PBKDF2-HMAC-SHA256 with <strong>600,000 iterations</strong> and a random 128-bit salt.
              This makes brute-force attacks extremely expensive — each password guess requires 600,000
              SHA-256 computations. The salt ensures the same password produces a different key each
              time, defeating pre-computed attack tables.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 text-base mb-2">Chunked streaming for large files</h3>
            <p>
              Files are processed in 1 MiB chunks so even a 2 GB file never needs to be fully loaded into
              memory at once. Each chunk gets a unique 96-bit IV (derived from a random base IV plus a
              chunk counter) ensuring every block of ciphertext is unique. The GCM auth tag on each chunk
              means truncated or reordered chunks are always detected.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 text-base mb-2">Wrong password = immediate error, no corrupted file</h3>
            <p>
              Decryption verifies the first chunk's authentication tag before writing any output. If the
              tag check fails — wrong password, wrong file, or data corruption — the operation aborts
              immediately. You get a clear error message, not a silently corrupted file.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 text-base mb-2">File format</h3>
            <p>
              Encrypted files start with the magic bytes <code className="bg-gray-100 px-1 rounded">ENC1</code>,
              followed by the salt, base IV, iteration count, chunk size, and original filename — all the
              parameters needed to decrypt, without any secrets. The body is a sequence of length-prefixed
              ciphertext chunks. The final chunk is marked to prevent truncation attacks.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 text-base mb-2">Lost password = lost file</h3>
            <p>
              There is no password recovery. There is no backdoor. If you lose the password, the file is
              gone — that's what "strong encryption" means. Store your password in a password manager.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
