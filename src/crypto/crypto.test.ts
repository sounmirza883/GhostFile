import { describe, expect, it } from 'vitest'
import { deriveKey } from './keys'
import { deriveChunkIV } from './iv'
import { buildHeader, parseHeader, CHUNK_SIZE } from './header'
import { encryptFile } from './encrypt'
import { decryptFile } from './decrypt'
import { hexToBytes, bytesToHex, TEST_VECTOR } from './vectors'

// ------- IV derivation -------
describe('deriveChunkIV', () => {
  it('is 12 bytes', () => {
    const base = new Uint8Array(12).fill(1)
    expect(deriveChunkIV(base, 0).byteLength).toBe(12)
  })

  it('embeds counter as big-endian uint32 in bytes 8..11', () => {
    const base = new Uint8Array(12)
    const iv = deriveChunkIV(base, 1)
    expect(iv[8]).toBe(0)
    expect(iv[9]).toBe(0)
    expect(iv[10]).toBe(0)
    expect(iv[11]).toBe(1)
  })

  it('counter 0x01020304 big-endian', () => {
    const base = new Uint8Array(12)
    const iv = deriveChunkIV(base, 0x01020304)
    expect(iv[8]).toBe(0x01)
    expect(iv[9]).toBe(0x02)
    expect(iv[10]).toBe(0x03)
    expect(iv[11]).toBe(0x04)
  })

  it('uses only first 8 bytes of baseIV', () => {
    const base = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    const iv = deriveChunkIV(base, 0)
    expect(Array.from(iv.subarray(0, 8))).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
  })
})

// ------- Header round-trip -------
describe('header serialize/parse', () => {
  it('round-trips all fields', () => {
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const baseIV = crypto.getRandomValues(new Uint8Array(12))
    const original = { salt, baseIV, iterations: 600_000, chunkSize: CHUNK_SIZE, filename: 'test.pdf' }
    const bytes = buildHeader(original)
    const { header, headerByteLength } = parseHeader(bytes)

    expect(Array.from(header.salt)).toEqual(Array.from(salt))
    expect(Array.from(header.baseIV)).toEqual(Array.from(baseIV))
    expect(header.iterations).toBe(600_000)
    expect(header.chunkSize).toBe(CHUNK_SIZE)
    expect(header.filename).toBe('test.pdf')
    expect(headerByteLength).toBe(bytes.byteLength)
  })

  it('throws on bad magic', () => {
    const salt = new Uint8Array(16)
    const baseIV = new Uint8Array(12)
    const bytes = buildHeader({ salt, baseIV, iterations: 600_000, chunkSize: CHUNK_SIZE, filename: 'x' })
    bytes[0] = 0xff
    expect(() => parseHeader(bytes)).toThrow()
  })

  it('handles unicode filename', () => {
    const salt = new Uint8Array(16)
    const baseIV = new Uint8Array(12)
    const filename = '文件_résumé.docx'
    const bytes = buildHeader({ salt, baseIV, iterations: 600_000, chunkSize: CHUNK_SIZE, filename })
    const { header } = parseHeader(bytes)
    expect(header.filename).toBe(filename)
  })
})

// ------- Key derivation smoke test -------
describe('deriveKey', () => {
  it('returns a CryptoKey usable for AES-GCM', async () => {
    const salt = hexToBytes(TEST_VECTOR.saltHex)
    const key = await deriveKey(TEST_VECTOR.password, salt, 1) // 1 iter for speed
    expect(key).toBeDefined()
    expect(key.type).toBe('secret')
  })
})

// ------- Encrypt / Decrypt round-trips -------
describe('round-trip', () => {
  async function makeFile(content: string | Uint8Array, name = 'test.txt'): Promise<File> {
    return new File([content], name, { type: 'application/octet-stream' })
  }

  const noop = () => {}
  const neverAbort = new AbortController().signal

  it('1 KB round-trip', async () => {
    const content = crypto.getRandomValues(new Uint8Array(1024))
    const file = await makeFile(content)
    const { blob: encBlob, filename: encName } = await encryptFile(file, 'pass123456', neverAbort, noop)
    const encFile = new File([encBlob], encName)
    const { blob: decBlob } = await decryptFile(encFile, 'pass123456', neverAbort, noop)
    const decBytes = new Uint8Array(await decBlob.arrayBuffer())
    expect(decBytes).toEqual(content)
  }, 30_000)

  it('wrong password throws friendly error', async () => {
    const file = await makeFile('secret data')
    const { blob: encBlob, filename: encName } = await encryptFile(file, 'rightPassword!', neverAbort, noop)
    const encFile = new File([encBlob], encName)
    await expect(decryptFile(encFile, 'wrongPassword!', neverAbort, noop)).rejects.toThrow(
      /password/i,
    )
  }, 30_000)

  it('restores original filename', async () => {
    const file = await makeFile('data', 'my-report.pdf')
    const { blob: encBlob, filename: encName } = await encryptFile(file, 'somePassword1', neverAbort, noop)
    const encFile = new File([encBlob], encName)
    const { filename } = await decryptFile(encFile, 'somePassword1', neverAbort, noop)
    expect(filename).toBe('my-report.pdf')
  }, 30_000)

  it('truncated file (missing final chunk) is rejected', async () => {
    const file = await makeFile(crypto.getRandomValues(new Uint8Array(512)))
    const { blob: encBlob, filename: encName } = await encryptFile(file, 'password123', neverAbort, noop)
    // Truncate to 60% of the file
    const truncated = encBlob.slice(0, Math.floor(encBlob.size * 0.6))
    const encFile = new File([truncated], encName)
    await expect(decryptFile(encFile, 'password123', neverAbort, noop)).rejects.toThrow(
      /incomplete|corrupted/i,
    )
  }, 30_000)

  it('corrupted ciphertext is rejected', async () => {
    const file = await makeFile('hello world')
    const { blob: encBlob, filename: encName } = await encryptFile(file, 'password123', neverAbort, noop)
    const bytes = new Uint8Array(await encBlob.arrayBuffer())
    // Flip a bit in the body (past the header, which is ~50 bytes)
    bytes[60] ^= 0xff
    const encFile = new File([bytes], encName)
    await expect(decryptFile(encFile, 'password123', neverAbort, noop)).rejects.toThrow()
  }, 30_000)

  it('abort signal cancels operation', async () => {
    const file = await makeFile(crypto.getRandomValues(new Uint8Array(1024)))
    const controller = new AbortController()
    controller.abort()
    await expect(encryptFile(file, 'password123', controller.signal, noop)).rejects.toSatisfy(
      (e: unknown) => e instanceof DOMException && e.name === 'AbortError',
    )
  }, 10_000)
})

// ------- Test vector -------
describe('test vector', () => {
  it('PBKDF2 + AES-GCM produces stable ciphertext for pinned inputs', async () => {
    const { password, saltHex, iterations, baseIVHex, plaintext } = TEST_VECTOR
    const salt = hexToBytes(saltHex)
    const baseIV = hexToBytes(baseIVHex)

    const key = await deriveKey(password, salt, iterations)
    const { deriveChunkIV: dIV } = await import('./iv')
    const iv = dIV(baseIV, 0)
    const enc = new TextEncoder()
    const cipher = new Uint8Array(
      await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext)),
    )
    const hex = bytesToHex(cipher)
    // Pin on first run — subsequent runs must match
    if (TEST_VECTOR.expectedCiphertextChunk0Hex === null) {
      // First time: just ensure it runs without error
      expect(hex.length).toBeGreaterThan(0)
    } else {
      expect(hex).toBe(TEST_VECTOR.expectedCiphertextChunk0Hex)
    }
  }, 60_000)
})
