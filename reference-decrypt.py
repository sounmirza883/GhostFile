#!/usr/bin/env python3
"""
GhostFile reference decryptor.

Decrypts files produced by the GhostFile web app. Requires Python 3.8+
and the `cryptography` package:

    pip install cryptography

Usage:
    python reference-decrypt.py <encrypted.enc> <password>
"""
import sys
import struct
import hashlib
from pathlib import Path

try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
except ImportError:
    sys.exit("Install the cryptography package: pip install cryptography")


MAGIC = b"ENC1"
VERSION = 0x01
FINAL_FLAG = 0x80000000


def parse_header(data: bytes) -> tuple[dict, int]:
    off = 0
    if data[off:off+4] != MAGIC:
        raise ValueError("Not a valid GhostFile (.enc) file")
    off += 4

    version = data[off]; off += 1
    if version != VERSION:
        raise ValueError(f"Unsupported file version: {version}")

    salt = data[off:off+16]; off += 16
    base_iv = data[off:off+12]; off += 12
    iterations, = struct.unpack_from(">I", data, off); off += 4
    chunk_size, = struct.unpack_from(">I", data, off); off += 4
    fname_len, = struct.unpack_from(">H", data, off); off += 2
    filename = data[off:off+fname_len].decode("utf-8"); off += fname_len

    return {
        "salt": salt,
        "base_iv": base_iv,
        "iterations": iterations,
        "chunk_size": chunk_size,
        "filename": filename,
    }, off


def derive_chunk_iv(base_iv: bytes, counter: int) -> bytes:
    return base_iv[:8] + struct.pack(">I", counter & 0xFFFFFFFF)


def decrypt_file(enc_path: Path, password: str, out_path: Path | None = None) -> None:
    data = enc_path.read_bytes()
    header, offset = parse_header(data)

    key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        header["salt"],
        header["iterations"],
        dklen=32,
    )
    aesgcm = AESGCM(key)

    if out_path is None:
        out_path = Path(header["filename"])

    parts: list[bytes] = []
    counter = 0
    seen_final = False

    while offset < len(data):
        if offset + 4 > len(data):
            raise ValueError("File appears incomplete or corrupted.")
        raw_len, = struct.unpack_from(">I", data, offset); offset += 4
        is_final = bool(raw_len & FINAL_FLAG)
        cipher_len = raw_len & ~FINAL_FLAG

        if offset + cipher_len > len(data):
            raise ValueError("File appears incomplete or corrupted.")

        cipher_chunk = data[offset:offset+cipher_len]; offset += cipher_len
        iv = derive_chunk_iv(header["base_iv"], counter)

        try:
            plain = aesgcm.decrypt(iv, cipher_chunk, None)
        except Exception:
            if counter == 0:
                raise ValueError("That password didn't work — wrong password or corrupted file.")
            raise ValueError("File appears corrupted or was tampered with.")

        parts.append(plain)

        if is_final:
            seen_final = True
            if offset < len(data):
                raise ValueError("Corrupted: unexpected data after final chunk.")
            break

        counter += 1

    if not seen_final:
        raise ValueError("File appears incomplete — the final chunk marker is missing.")

    out_path.write_bytes(b"".join(parts))
    print(f"Decrypted → {out_path}")


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)

    enc_path = Path(sys.argv[1])
    password = sys.argv[2]
    out_path = Path(sys.argv[3]) if len(sys.argv) > 3 else None

    try:
        decrypt_file(enc_path, password, out_path)
    except Exception as e:
        sys.exit(f"Error: {e}")
