import { deriveKey } from './keys'
import { deriveChunkIV } from './iv'
import { buildHeader, CHUNK_SIZE } from './header'

export interface EncryptProgress {
  bytesProcessed: number
  totalBytes: number
}

export async function encryptFile(
  file: File,
  password: string,
  signal: AbortSignal,
  onProgress: (p: EncryptProgress) => void,
): Promise<{ blob: Blob; filename: string }> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const baseIV = crypto.getRandomValues(new Uint8Array(12))
  const iterations = 600_000
  const chunkSize = CHUNK_SIZE

  const key = await deriveKey(password, salt, iterations)

  const header = buildHeader({ salt, baseIV, iterations, chunkSize, filename: file.name })

  const parts: ArrayBuffer[] = [header.buffer as ArrayBuffer]
  const reader = file.stream().getReader()

  let counter = 0
  let bytesProcessed = 0
  let buffer = new Uint8Array(0)
  let done = false

  while (!done) {
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError')

    const { value, done: streamDone } = await reader.read()
    done = streamDone

    if (value) {
      const merged = new Uint8Array(buffer.byteLength + value.byteLength)
      merged.set(buffer)
      merged.set(value, buffer.byteLength)
      buffer = merged
    }

    while (buffer.byteLength >= chunkSize || (done && buffer.byteLength > 0)) {
      if (signal.aborted) throw new DOMException('Cancelled', 'AbortError')

      const isFinal = done && buffer.byteLength <= chunkSize
      const take = isFinal ? buffer.byteLength : chunkSize
      const plain = buffer.subarray(0, take)
      buffer = buffer.subarray(take)

      const iv = deriveChunkIV(baseIV, counter)
      const plainBuf = new Uint8Array(plain) as Uint8Array<ArrayBuffer>
      const cipher = new Uint8Array(
        await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plainBuf),
      )

      let lenField = cipher.byteLength
      if (isFinal) lenField |= 0x80000000

      const lenBuf = new ArrayBuffer(4)
      new DataView(lenBuf).setUint32(0, lenField >>> 0, false)

      parts.push(lenBuf, cipher.buffer.slice(cipher.byteOffset, cipher.byteOffset + cipher.byteLength))

      counter++
      bytesProcessed += plain.byteLength
      onProgress({ bytesProcessed, totalBytes: file.size })

      if (isFinal) break
    }
  }

  const blob = new Blob(parts, { type: 'application/octet-stream' })
  return { blob, filename: `${file.name}.enc` }
}
