// Fixed test vectors for regression detection.
// Expected ciphertext is pinned after first correct computation.
export const TEST_VECTOR = {
  password: 'correct horse battery staple',
  saltHex: '202122232425262728292a2b2c2d2e2f',
  iterations: 600_000,
  baseIVHex: '0102030405060708090a0b0c',
  plaintext: 'Hello, world!', // 13 bytes UTF-8
  // Pinned after first run — do not change
  expectedCiphertextChunk0Hex: null as string | null,
}

export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
