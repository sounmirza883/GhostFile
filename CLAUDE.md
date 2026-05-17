# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**GhostFile** is a single-page web app for client-side AES-256-GCM file encryption/decryption. All crypto happens in the browser — files never touch a server. The app handles files up to 2 GB using the Streams API to avoid buffering the entire file in memory.

## Tech Stack

- **Framework**: React 18 + Vite + TypeScript
- **Styling**: Tailwind CSS
- **Crypto**: Web Crypto API (`window.crypto.subtle`) — zero third-party crypto
- **Streaming**: Streams API (`ReadableStream`, `WritableStream`, `TransformStream`)
- **File save**: File System Access API (primary); `<a download>` + Blob URL (fallback)
- **Password strength**: `zxcvbn-ts` (~100 KB)
- **Build target**: ES2022

## Build & Dev Commands

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server
npm run build        # Production build to dist/
npm run preview      # Preview production build locally
npm run test         # Run Vitest unit tests
npm run test:run     # Run tests once (no watch)
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
```

Run a single test file:
```bash
npm run test -- src/crypto/crypto.test.ts
```

## Architecture

### Core Modules

**`src/crypto/`** — Pure crypto logic, no React dependencies, importable by Web Worker:
- `keys.ts` — PBKDF2 key derivation (`deriveKey(password, salt, iterations)`)
- `iv.ts` — Chunk IV derivation: `baseIV[0..7] || u32_be(counter)` (12 bytes total)
- `header.ts` — Serialize/parse the binary file header (see format below)
- `encrypt.ts` — `encryptFile(file, password, signal, onProgress)` — streaming pipeline
- `decrypt.ts` — `decryptFile(file, password, signal, onProgress)` — streaming pipeline
- `vectors.ts` — Fixed test vectors for regression detection

**`src/worker/crypto.worker.ts`** — Web Worker that runs the encrypt/decrypt pipeline. Communicates via `postMessage` with `Transferable` `ArrayBuffer` chunks. Receives `AbortSignal`-compatible cancel messages.

**`src/hooks/`**
- `useCryptoWorker.ts` — React hook that manages the Worker lifecycle, posts jobs, and surfaces `{ progress, eta, status, cancel }` to the UI.

**`src/components/`**
- `DropZone.tsx` — Drag-and-drop + click-to-browse; auto-detects encrypt vs decrypt mode by `.enc` extension.
- `PasswordInput.tsx` — Shows/hides password; in encrypt mode renders confirm field + `zxcvbn` strength meter.
- `ProgressBar.tsx` — `role="progressbar"` with `aria-valuenow`; displays ETA.
- `ModeToggle.tsx` — Lets user override auto-detected mode.
- `HowItWorks.tsx` — Static explanation page for the crypto choices.

**`src/lib/output.ts`** — Abstracts output between File System Access API and `<a download>` fallback. Detects API availability at runtime.

### Encrypted File Format

```
HEADER:
  0..3    Magic: "ENC1" (0x45 0x4E 0x43 0x31)
  4       Version: 0x01
  5..20   Salt (16 bytes, random)
  21..32  Base IV (12 bytes, random)
  33..36  PBKDF2 iterations (uint32 BE)
  37..40  Chunk size in bytes (uint32 BE, default 1 MiB = 1_048_576)
  41..42  Filename length N (uint16 BE)
  43..(43+N-1)  Original filename (UTF-8)

BODY (repeated chunks):
  4 bytes  Length L (uint32 BE); high bit 0x80000000 set on the FINAL chunk
  L bytes  AES-GCM ciphertext (plaintext + 16-byte auth tag)
```

**Truncation attack defense**: the final chunk's length field has bit `0x80000000` set. Decryption **must** fail if EOF is reached without seeing this marker, or if data follows it.

### Cryptographic Parameters

| Parameter | Value |
|-----------|-------|
| Cipher | AES-256-GCM |
| KDF | PBKDF2-HMAC-SHA-256 |
| Iterations | 600,000 (stored in header; never hardcoded in decrypt path) |
| Salt | 16 bytes, `crypto.getRandomValues` |
| Base IV | 12 bytes, `crypto.getRandomValues` |
| Chunk IV | `baseIV[0..7] || u32_be(chunkIndex)` — unique per chunk |
| GCM auth tag | 128 bits (Web Crypto default, appended to each chunk) |
| Chunk size | 1 MiB plaintext; ciphertext = plaintext + 16 bytes |

### Streaming Pipeline

**Encryption**:
```
File.stream() → ChunkBuffer(1 MiB) → AES-GCM-Encrypt → LengthPrefix → OutputSink
```

**Decryption**:
```
File.stream() → HeaderParser → LengthPrefixedChunkReader → AES-GCM-Decrypt → OutputSink
```

- Each chunk is a discrete `subtle.encrypt/decrypt` call — GCM does not support incremental within a single call.
- Use native Streams API backpressure; never buffer more than one chunk beyond what the pipeline needs.
- Wrong password is detected on the **first chunk's GCM tag failure** — abort before writing any output bytes.

### Worker Communication Protocol

```ts
// UI → Worker
{ type: 'encrypt' | 'decrypt', file: File, password: string }
{ type: 'cancel' }

// Worker → UI
{ type: 'progress', bytesProcessed: number, totalBytes: number }
{ type: 'done', outputBlob: Blob, filename: string }
{ type: 'error', message: string }  // user-friendly message, never raw crypto errors
```

Chunks are transferred as `Transferable` `ArrayBuffer` objects to avoid copying.

## Security Constraints

- **No network requests** after initial page load. The `connect-src 'none'` CSP header enforces this when self-hosting.
- **No `eval` / `Function()`** anywhere in the codebase.
- **All randomness** via `crypto.getRandomValues` — never `Math.random`.
- Passwords must not appear in `console.log`, DOM attributes, or be retained after key derivation.
- GCM auth tag comparison is handled inside Web Crypto — do not implement a manual compare.
- User-facing error messages use plain language: "That password didn't work" — never expose internal error names.

## Test Vectors

The repo ships a fixed test vector in `src/crypto/vectors.ts` for regression detection:

```
password:   "correct horse battery staple"
salt (hex): 202122232425262728292a2b2c2d2e2f
iterations: 600000
baseIV:     0102030405060708090a0b0c
plaintext:  "Hello, world!" (13 bytes UTF-8)
```

The expected ciphertext chunk 0 hex is pinned in the file after first computation and must not change across refactors.

## Implementation Phases

1. **Phase 1**: Core crypto module + unit tests (whole-file, in-memory, no UI)
2. **Phase 2**: Streaming pipeline + file format + truncation defense + 1.5 GB test
3. **Phase 3**: React UI — DropZone, PasswordInput, ProgressBar, cancel, error states
4. **Phase 4**: Web Worker offload — verify UI stays responsive during 2 GB operation
5. **Phase 5**: Password strength meter, "How it works" page, File System Access API, deploy

## Deployment

Static files only. Deploy to Vercel / Netlify / GitHub Pages.

Recommended security headers when self-hosting:
```
Content-Security-Policy: default-src 'self'; script-src 'self'; connect-src 'none';
```

Reference decryption script (`reference-decrypt.py`) should be included in the repo so users have a recovery path independent of the browser app.

## Remote Repository

`git@github.com:sounmirza883/GhostFile.git`
