// IV = baseIV[0..7] (8 bytes) || counter as uint32 big-endian (4 bytes) = 12 bytes
export function deriveChunkIV(baseIV: Uint8Array, counter: number): Uint8Array<ArrayBuffer> {
  const buf = new ArrayBuffer(12)
  const iv = new Uint8Array(buf)
  iv.set(baseIV.subarray(0, 8), 0)
  new DataView(buf).setUint32(8, counter >>> 0, false) // big-endian
  return iv
}
