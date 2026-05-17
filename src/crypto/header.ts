export const MAGIC = new Uint8Array([0x45, 0x4e, 0x43, 0x31]) // "ENC1"
export const VERSION = 0x01
export const CHUNK_SIZE = 1 << 20 // 1 MiB

export interface FileHeader {
  salt: Uint8Array       // 16 bytes
  baseIV: Uint8Array     // 12 bytes
  iterations: number
  chunkSize: number
  filename: string
}

export function buildHeader(h: FileHeader): Uint8Array<ArrayBuffer> {
  const filenameBytes = new TextEncoder().encode(h.filename)
  const totalLen = 4 + 1 + 16 + 12 + 4 + 4 + 2 + filenameBytes.byteLength
  const ab = new ArrayBuffer(totalLen)
  const buf = new Uint8Array(ab)
  const view = new DataView(ab)
  let off = 0

  buf.set(MAGIC, off); off += 4
  buf[off++] = VERSION
  buf.set(h.salt, off); off += 16
  buf.set(h.baseIV, off); off += 12
  view.setUint32(off, h.iterations, false); off += 4
  view.setUint32(off, h.chunkSize, false); off += 4
  view.setUint16(off, filenameBytes.byteLength, false); off += 2
  buf.set(filenameBytes, off)

  return buf
}

export interface ParsedHeader {
  header: FileHeader
  headerByteLength: number
}

export function parseHeader(data: Uint8Array): ParsedHeader {
  const view = new DataView(data.buffer, data.byteOffset)
  let off = 0

  // Validate magic
  for (let i = 0; i < 4; i++) {
    if (data[off + i] !== MAGIC[i]) throw new Error('Not a valid GhostFile (.enc) file.')
  }
  off += 4

  const version = data[off++]
  if (version !== VERSION) throw new Error(`Unsupported file version: ${version}`)

  const salt = new Uint8Array(data.slice(off, off + 16)); off += 16
  const baseIV = new Uint8Array(data.slice(off, off + 12)); off += 12
  const iterations = view.getUint32(off, false); off += 4
  const chunkSize = view.getUint32(off, false); off += 4
  const filenameLen = view.getUint16(off, false); off += 2
  const filename = new TextDecoder().decode(data.slice(off, off + filenameLen)); off += filenameLen

  return {
    header: { salt, baseIV, iterations, chunkSize, filename },
    headerByteLength: off,
  }
}
