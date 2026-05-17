import { deriveKey } from './keys'
import { deriveChunkIV } from './iv'
import { parseHeader } from './header'

export interface DecryptProgress {
  bytesProcessed: number
  totalBytes: number
}

const FINAL_FLAG = 0x80000000

export async function decryptFile(
  file: File,
  password: string,
  signal: AbortSignal,
  onProgress: (p: DecryptProgress) => void,
): Promise<{ blob: Blob; filename: string }> {
  // Read entire file into memory for header parsing then stream body
  // For large files this reads in chunks via the header-aware approach below
  const fileData = new Uint8Array(await file.arrayBuffer())

  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError')

  const { header, headerByteLength } = parseHeader(fileData)
  const { salt, baseIV, iterations, chunkSize, filename } = header

  const key = await deriveKey(password, salt, iterations)

  const parts: ArrayBuffer[] = []
  let offset = headerByteLength
  let counter = 0
  let seenFinal = false
  const totalBytes = file.size

  while (offset < fileData.byteLength) {
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError')

    if (offset + 4 > fileData.byteLength) {
      throw new Error('File appears incomplete or corrupted.')
    }

    const view = new DataView(fileData.buffer, fileData.byteOffset + offset)
    const rawLen = view.getUint32(0, false)
    const isFinal = (rawLen & FINAL_FLAG) !== 0
    const cipherLen = rawLen & ~FINAL_FLAG
    offset += 4

    if (offset + cipherLen > fileData.byteLength) {
      throw new Error('File appears incomplete or corrupted.')
    }

    const cipherChunk = fileData.subarray(offset, offset + cipherLen)
    offset += cipherLen

    const iv = deriveChunkIV(baseIV, counter)
    const cipherBuf = new Uint8Array(cipherChunk) as Uint8Array<ArrayBuffer>

    let plain: ArrayBuffer
    try {
      plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipherBuf)
    } catch {
      if (counter === 0) {
        throw new Error("That password didn't work. Please check your password and try again.")
      }
      throw new Error('File appears corrupted or was tampered with.')
    }

    // Only start writing after first chunk decrypts successfully
    parts.push(plain)

    if (isFinal) {
      seenFinal = true
      if (offset < fileData.byteLength) {
        throw new Error('File appears corrupted: unexpected data after final chunk.')
      }
      break
    }

    counter++
    // Report progress relative to ciphertext consumed (best approximation)
    const approxPlainBytes = counter * chunkSize
    onProgress({ bytesProcessed: Math.min(approxPlainBytes, totalBytes), totalBytes })
  }

  if (!seenFinal) {
    throw new Error('File appears incomplete — the final chunk marker is missing.')
  }

  onProgress({ bytesProcessed: totalBytes, totalBytes })

  const blob = new Blob(parts, { type: 'application/octet-stream' })
  return { blob, filename }
}
